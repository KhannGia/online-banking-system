// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {LiquidityHub} from "contracts/hub/LiquidityHub.sol";
import {InterestRateStrategy} from "contracts/hub/InterestRateStrategy.sol";
import {IHub} from "contracts/interfaces/IHub.sol";
import {IInterestRateStrategy} from "contracts/interfaces/IInterestRateStrategy.sol";
import {MockSpoke} from "contracts/mocks/MockSpoke.sol";
import {MockUSDC} from "contracts/MockUSDC.sol";

/// @title LiquidityHub unit tests
/// @notice Covers the paths the invariant suite cannot reach: authorisation, caps, emergency
///         states, the illiquidity revert, fee accrual, and donation resistance.
contract LiquidityHubTest is Test {
    LiquidityHub internal hub;
    InterestRateStrategy internal irs;
    MockUSDC internal usdc;
    MockSpoke internal spokeA;
    MockSpoke internal spokeB;
    MockSpoke internal treasury;

    address internal owner = makeAddr("owner");
    address internal stranger = makeAddr("stranger");
    address internal user = makeAddr("user");

    uint256 internal constant ASSET = 0;

    function setUp() public {
        usdc = new MockUSDC();
        irs = new InterestRateStrategy(owner);
        hub = new LiquidityHub(owner);

        spokeA = new MockSpoke(IHub(address(hub)), usdc);
        spokeB = new MockSpoke(IHub(address(hub)), usdc);
        treasury = new MockSpoke(IHub(address(hub)), usdc);

        vm.startPrank(owner);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData({
                optimalUsageRatio: 8_000,
                baseDrawnRate: 100,
                rateGrowthBeforeOptimal: 400,
                rateGrowthAfterOptimal: 6_000
            })
        );
        hub.addAsset(address(usdc), address(irs), address(treasury), 1_000);
        _list(address(treasury), 0, 0);
        _list(address(spokeA), 0, 0);
        _list(address(spokeB), 0, 0);
        vm.stopPrank();
    }

    function _list(address spoke, uint256 addCap, uint256 drawCap) internal {
        hub.addSpoke(
            ASSET,
            spoke,
            IHub.SpokeConfig({addCap: addCap, drawCap: drawCap, active: true, halted: false})
        );
    }

    function _fund(MockSpoke s, uint256 amount) internal {
        usdc.mint(address(s), amount);
    }

    // =====================================================================
    // Authorisation
    // =====================================================================

    function test_add_revertsWhenCallerIsNotAListedSpoke() public {
        usdc.mint(stranger, 1_000e6);
        vm.startPrank(stranger);
        usdc.approve(address(hub), type(uint256).max);
        vm.expectRevert(IHub.SpokeNotListed.selector);
        hub.add(ASSET, 1_000e6);
        vm.stopPrank();
    }

    function test_add_revertsWhenSpokeInactive() public {
        vm.prank(owner);
        hub.updateSpokeConfig(
            ASSET,
            address(spokeA),
            IHub.SpokeConfig({addCap: 0, drawCap: 0, active: false, halted: false})
        );

        _fund(spokeA, 1_000e6);
        vm.expectRevert(IHub.SpokeNotActive.selector);
        spokeA.add(ASSET, 1_000e6);
    }

    function test_add_revertsWhenSpokeHalted() public {
        vm.prank(owner);
        hub.updateSpokeConfig(
            ASSET,
            address(spokeA),
            IHub.SpokeConfig({addCap: 0, drawCap: 0, active: true, halted: true})
        );

        _fund(spokeA, 1_000e6);
        vm.expectRevert(IHub.SpokeHalted.selector);
        spokeA.add(ASSET, 1_000e6);
    }

    function test_addAsset_revertsWhenNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        hub.addAsset(address(usdc), address(irs), address(treasury), 0);
    }

    function test_addAsset_revertsOnDuplicateUnderlying() public {
        vm.prank(owner);
        vm.expectRevert(IHub.UnderlyingAlreadyListed.selector);
        hub.addAsset(address(usdc), address(irs), address(treasury), 0);
    }

    // =====================================================================
    // Core flows
    // =====================================================================

    function test_add_thenRemove_returnsPrincipalWhenNothingAccrued() public {
        _fund(spokeA, 1_000e6);
        uint256 shares = spokeA.add(ASSET, 1_000e6);

        assertEq(shares, 1_000e6, "first deposit into an empty pool prices one-to-one");
        assertEq(hub.getAsset(ASSET).liquidity, 1_000e6);
        assertEq(hub.spokeAddedAssets(ASSET, address(spokeA)), 1_000e6);

        spokeA.remove(ASSET, 1_000e6, user);

        assertEq(usdc.balanceOf(user), 1_000e6);
        assertEq(hub.getAsset(ASSET).liquidity, 0);
        assertEq(hub.getAsset(ASSET).addedShares, 0);
    }

    function test_remove_revertsWith_InsufficientLiquidityWhenFullyUtilised() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);

        // spokeB borrows everything
        spokeB.draw(ASSET, 1_000e6, address(spokeB));
        assertEq(hub.getAsset(ASSET).liquidity, 0);
        assertEq(hub.utilization(ASSET), 10_000, "fully utilised");

        // The supplier's claim is intact but there is nothing free to pay it with.
        // This is the regression documented in design spec §6.1.
        vm.expectRevert(IHub.InsufficientLiquidity.selector);
        spokeA.remove(ASSET, 1_000e6, user);

        assertGt(hub.spokeAddedAssets(ASSET, address(spokeA)), 0, "claim survives");
    }

    function test_draw_thenRestore_accruesInterestToSuppliers() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);

        spokeB.draw(ASSET, 500e6, address(spokeB));

        uint256 claimBefore = hub.spokeAddedAssets(ASSET, address(spokeA));

        vm.warp(block.timestamp + 365 days);
        hub.accrue(ASSET);

        uint256 owed = hub.spokeOwed(ASSET, address(spokeB));
        assertGt(owed, 500e6, "debt grew with interest");

        uint256 claimAfter = hub.spokeAddedAssets(ASSET, address(spokeA));
        assertGt(claimAfter, claimBefore, "supplier's claim grew without an explicit payout");
    }

    /// @notice The protocol's cut must land on the treasury spoke as shares, not as a transfer.
    function test_accrue_mintsFeeSharesToTreasury() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);
        spokeB.draw(ASSET, 800e6, address(spokeB));

        assertEq(hub.getSpoke(ASSET, address(treasury)).addedShares, 0);

        vm.warp(block.timestamp + 365 days);
        hub.accrue(ASSET);

        assertGt(
            hub.getSpoke(ASSET, address(treasury)).addedShares,
            0,
            "treasury earns fee shares"
        );
    }

    /// @notice A fee receiver that is not a listed spoke must be skipped, not credited, or the
    ///         per-spoke share sums would stop matching the asset total.
    function test_accrue_skipsFeeWhenReceiverIsNotAListedSpoke() public {
        vm.prank(owner);
        hub.updateAssetConfig(ASSET, address(irs), makeAddr("unlisted"), 1_000);

        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);
        spokeB.draw(ASSET, 800e6, address(spokeB));

        vm.warp(block.timestamp + 365 days);
        hub.accrue(ASSET);

        uint256 sum = hub.getSpoke(ASSET, address(spokeA)).addedShares +
            hub.getSpoke(ASSET, address(spokeB)).addedShares +
            hub.getSpoke(ASSET, address(treasury)).addedShares;
        assertEq(sum, hub.getAsset(ASSET).addedShares, "share sums stay consistent");
    }

    // =====================================================================
    // Caps
    // =====================================================================

    function test_add_revertsWith_AddCapExceeded() public {
        vm.prank(owner);
        hub.updateSpokeConfig(
            ASSET,
            address(spokeA),
            IHub.SpokeConfig({addCap: 500e6, drawCap: 0, active: true, halted: false})
        );

        _fund(spokeA, 1_000e6);
        vm.expectRevert(IHub.AddCapExceeded.selector);
        spokeA.add(ASSET, 501e6);

        spokeA.add(ASSET, 500e6); // at the cap is fine
    }

    function test_draw_revertsWith_DrawCapExceeded() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);

        vm.prank(owner);
        hub.updateSpokeConfig(
            ASSET,
            address(spokeB),
            IHub.SpokeConfig({addCap: 0, drawCap: 300e6, active: true, halted: false})
        );

        vm.expectRevert(IHub.DrawCapExceeded.selector);
        spokeB.draw(ASSET, 301e6, address(spokeB));

        spokeB.draw(ASSET, 300e6, address(spokeB));
    }

    function test_restore_revertsWhenRepayingMoreThanOwed() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);
        spokeB.draw(ASSET, 100e6, address(spokeB));

        _fund(spokeB, 1_000e6);
        vm.expectRevert(IHub.RestoreExceedsDebt.selector);
        spokeB.restore(ASSET, 500e6);
    }

    // =====================================================================
    // Donation resistance
    // =====================================================================

    /// @notice `liquidity` is internal, so tokens sent straight to the Hub are invisible.
    ///         If the share price were read from `balanceOf`, this donation would move it.
    function test_donation_doesNotMoveSharePriceOrCreditAnyone() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);

        uint256 claimBefore = hub.spokeAddedAssets(ASSET, address(spokeA));
        uint256 totalBefore = hub.totalAssets(ASSET);

        usdc.mint(address(this), 1_000_000e6);
        usdc.transfer(address(hub), 1_000_000e6);

        assertEq(hub.totalAssets(ASSET), totalBefore, "donation is not counted as assets");
        assertEq(
            hub.spokeAddedAssets(ASSET, address(spokeA)),
            claimBefore,
            "donation does not change any claim"
        );

        // and the supplier can still take exactly what they put in, no more
        spokeA.remove(ASSET, 1_000e6, user);
        assertEq(usdc.balanceOf(user), 1_000e6);
    }

    // =====================================================================
    // Accrual edge cases
    // =====================================================================

    function test_accrue_isNoOpWithinTheSameBlock() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);
        spokeB.draw(ASSET, 500e6, address(spokeB));

        uint256 indexBefore = hub.getAsset(ASSET).drawnIndex;
        hub.accrue(ASSET);
        assertEq(hub.getAsset(ASSET).drawnIndex, indexBefore, "no time, no interest");
    }

    function test_accrue_isNoOpWithNoDebt() public {
        _fund(spokeA, 1_000e6);
        spokeA.add(ASSET, 1_000e6);

        uint256 indexBefore = hub.getAsset(ASSET).drawnIndex;
        vm.warp(block.timestamp + 365 days);
        hub.accrue(ASSET);

        assertEq(hub.getAsset(ASSET).drawnIndex, indexBefore, "nothing borrowed, nothing owed");
        assertEq(hub.spokeAddedAssets(ASSET, address(spokeA)), 1_000e6, "idle supply earns none");
    }

    function test_utilization_isZeroOnAnEmptyAsset() public view {
        assertEq(hub.utilization(ASSET), 0);
        assertEq(hub.totalAssets(ASSET), 0);
    }
}
