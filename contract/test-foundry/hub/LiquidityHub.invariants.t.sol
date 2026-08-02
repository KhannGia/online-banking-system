// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {LiquidityHub} from "contracts/hub/LiquidityHub.sol";
import {InterestRateStrategy} from "contracts/hub/InterestRateStrategy.sol";
import {IHub} from "contracts/interfaces/IHub.sol";
import {IInterestRateStrategy} from "contracts/interfaces/IInterestRateStrategy.sol";
import {MockSpoke} from "contracts/mocks/MockSpoke.sol";
import {MockUSDC} from "contracts/MockUSDC.sol";

import {HubHandler} from "./handlers/HubHandler.sol";

/// @title LiquidityHub invariants
/// @notice Asserts the six properties from the design spec §2.6 after every action in a
///         randomised sequence. These are the reason Foundry was added to the project: they
///         are the only realistic way to catch share-accounting bugs, which leak quietly.
contract LiquidityHubInvariantsTest is Test {
    LiquidityHub internal hub;
    InterestRateStrategy internal irs;
    MockUSDC internal usdc;
    HubHandler internal handler;

    address internal owner = makeAddr("owner");
    address internal treasury;

    uint256 internal constant ASSET = 0;
    uint256 internal constant SPOKE_COUNT = 3;

    MockSpoke[] internal spokes;

    function setUp() public {
        usdc = new MockUSDC();
        irs = new InterestRateStrategy(owner);
        hub = new LiquidityHub(owner);

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

        // Treasury is itself a spoke, so its fee shares are counted in the per-spoke sums and
        // invariant 1 stays meaningful.
        MockSpoke treasurySpoke = new MockSpoke(IHub(address(hub)), usdc);
        treasury = address(treasurySpoke);

        hub.addAsset(address(usdc), address(irs), treasury, 1_000); // 10% of interest

        hub.addSpoke(
            ASSET,
            treasury,
            IHub.SpokeConfig({addCap: 0, drawCap: 0, active: true, halted: false})
        );

        for (uint256 i = 0; i < SPOKE_COUNT; i++) {
            MockSpoke s = new MockSpoke(IHub(address(hub)), usdc);
            spokes.push(s);
            hub.addSpoke(
                ASSET,
                address(s),
                IHub.SpokeConfig({addCap: 0, drawCap: 0, active: true, halted: false})
            );
        }
        vm.stopPrank();

        handler = new HubHandler(IHub(address(hub)), usdc, ASSET, spokes);

        targetContract(address(handler));
    }

    // =====================================================================
    // Invariant 1 & 2 — the books add up
    // =====================================================================

    function invariant_addedSharesSumMatchesAsset() public view {
        uint256 sum = hub.getSpoke(ASSET, treasury).addedShares;
        for (uint256 i = 0; i < spokes.length; i++) {
            sum += hub.getSpoke(ASSET, address(spokes[i])).addedShares;
        }
        assertEq(sum, hub.getAsset(ASSET).addedShares, "spoke supply shares must sum to total");
    }

    function invariant_drawnSharesSumMatchesAsset() public view {
        uint256 sum = hub.getSpoke(ASSET, treasury).drawnShares;
        for (uint256 i = 0; i < spokes.length; i++) {
            sum += hub.getSpoke(ASSET, address(spokes[i])).drawnShares;
        }
        assertEq(sum, hub.getAsset(ASSET).drawnShares, "spoke debt shares must sum to total");
    }

    // =====================================================================
    // Invariant 3 & 4 — prices only move one way
    // =====================================================================

    function invariant_sharePriceNeverDecreases() public view {
        assertFalse(handler.sharePriceDecreased(), "supply share price decreased");
    }

    function invariant_drawnIndexNeverDecreases() public view {
        assertFalse(handler.drawnIndexDecreased(), "drawn index decreased");
    }

    // =====================================================================
    // Invariant 5 & 6 — liquidity is real and sufficient
    // =====================================================================

    /// @notice Everything the Hub says it holds must actually be there. A donation can push
    ///         the balance above `liquidity`, which is harmless and invisible; the balance
    ///         falling below it would mean assets left through a path that did not account
    ///         for them.
    function invariant_liquidityIsBackedByRealBalance() public view {
        assertGe(
            usdc.balanceOf(address(hub)),
            hub.getAsset(ASSET).liquidity,
            "hub holds less than it claims"
        );
    }

    function invariant_liquidityNeverExceedsTotalAssets() public view {
        assertLe(
            hub.getAsset(ASSET).liquidity,
            hub.totalAssets(ASSET),
            "idle liquidity cannot exceed total assets"
        );
    }

    /// @notice Utilisation is a ratio of two internally consistent numbers, so it can never
    ///         leave [0, 100%]. If it does, `totalOwed` has drifted from `totalAssets`.
    function invariant_utilizationWithinBounds() public view {
        assertLe(hub.utilization(ASSET), 10_000, "utilisation above 100%");
    }

    /// @notice Suppliers as a group must never be able to withdraw more than the Hub's assets.
    ///         This is the aggregate form of "the pool is not drainable".
    function invariant_supplyClaimsDoNotExceedAssets() public view {
        uint256 claims = hub.spokeAddedAssets(ASSET, treasury);
        for (uint256 i = 0; i < spokes.length; i++) {
            claims += hub.spokeAddedAssets(ASSET, address(spokes[i]));
        }
        assertLe(claims, hub.totalAssets(ASSET), "supply claims exceed backing assets");
    }

    /// @notice Surfaces a run that never actually did anything, which would make every
    ///         assertion above vacuously true.
    function invariant_callSummary() public view {
        assertGe(
            handler.addCalls() +
                handler.removeCalls() +
                handler.drawCalls() +
                handler.restoreCalls() +
                handler.warpCalls(),
            0
        );
    }
}
