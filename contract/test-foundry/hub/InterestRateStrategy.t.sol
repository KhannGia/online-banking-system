// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {InterestRateStrategy} from "contracts/hub/InterestRateStrategy.sol";
import {IInterestRateStrategy} from "contracts/interfaces/IInterestRateStrategy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract InterestRateStrategyTest is Test {
    InterestRateStrategy internal irs;

    address internal owner = makeAddr("owner");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ASSET = 0;
    uint256 internal constant BPS = 10_000;

    // 80% kink, 1% base, +4% to the kink, +60% from the kink to full.
    uint16 internal constant OPTIMAL = 8_000;
    uint32 internal constant BASE = 100;
    uint32 internal constant GROWTH_BEFORE = 400;
    uint32 internal constant GROWTH_AFTER = 6_000;

    function setUp() public {
        irs = new InterestRateStrategy(owner);
        vm.prank(owner);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData({
                optimalUsageRatio: OPTIMAL,
                baseDrawnRate: BASE,
                rateGrowthBeforeOptimal: GROWTH_BEFORE,
                rateGrowthAfterOptimal: GROWTH_AFTER
            })
        );
    }

    // ---------------------------------------------------------------------
    // Curve shape
    // ---------------------------------------------------------------------

    function test_calculateDrawnRate_atKnownPoints() public view {
        assertEq(irs.calculateDrawnRate(ASSET, 0), BASE, "zero utilisation is the base rate");

        // halfway to the kink earns half the pre-kink growth
        assertEq(irs.calculateDrawnRate(ASSET, OPTIMAL / 2), BASE + GROWTH_BEFORE / 2);

        // exactly at the kink the pre-kink growth is fully earned, post-kink not started
        assertEq(irs.calculateDrawnRate(ASSET, OPTIMAL), BASE + GROWTH_BEFORE);

        // full utilisation earns everything
        assertEq(irs.calculateDrawnRate(ASSET, BPS), BASE + GROWTH_BEFORE + GROWTH_AFTER);
        assertEq(irs.calculateDrawnRate(ASSET, BPS), irs.getMaxDrawnRate(ASSET));
    }

    /// @notice The two branches must meet exactly at the kink — a jump there would be a
    ///         discontinuity borrowers could arbitrage across. Continuity is about the value
    ///         at the kink, not about the slope: the post-kink slope is deliberately steep,
    ///         and this test pins how steep so a future edit cannot flatten it unnoticed.
    function test_calculateDrawnRate_isContinuousAtTheKink() public view {
        // From below, all of the pre-kink growth is earned; from above, none of the second
        // slope is yet. Both give the same number.
        assertEq(irs.calculateDrawnRate(ASSET, OPTIMAL), BASE + GROWTH_BEFORE, "branches agree");

        // Post-kink, each bps of utilisation costs GROWTH_AFTER / (BPS - OPTIMAL) — here 3 bps
        // of rate per 1 bps of utilisation.
        uint256 postKinkSlope = uint256(GROWTH_AFTER) / (BPS - OPTIMAL);
        assertEq(
            irs.calculateDrawnRate(ASSET, OPTIMAL + 1) - irs.calculateDrawnRate(ASSET, OPTIMAL),
            postKinkSlope,
            "rate leaves the kink at the post-kink slope"
        );

        // The pre-kink slope must be strictly gentler, otherwise the kink does not exist and
        // the curve cannot push borrowers to repay when liquidity runs short (spec §6.1).
        uint256 preKinkStep = irs.calculateDrawnRate(ASSET, OPTIMAL) -
            irs.calculateDrawnRate(ASSET, OPTIMAL - 1);
        assertLt(preKinkStep, postKinkSlope, "post-kink slope must be strictly steeper");
    }

    /// @notice The whole point of the curve: cost of borrowing must never fall as the pool
    ///         empties. A non-monotonic curve would let a borrower make liquidity scarcer and
    ///         pay less for it.
    function test_calculateDrawnRate_fuzz_isMonotonic(uint256 u1, uint256 u2) public view {
        u1 = bound(u1, 0, BPS);
        u2 = bound(u2, u1, BPS);

        assertLe(
            irs.calculateDrawnRate(ASSET, u1),
            irs.calculateDrawnRate(ASSET, u2),
            "rate must not decrease as utilisation rises"
        );
    }

    function test_calculateDrawnRate_fuzz_staysWithinConfiguredBounds(uint256 u) public view {
        u = bound(u, 0, BPS);
        uint256 rate = irs.calculateDrawnRate(ASSET, u);

        assertGe(rate, BASE, "never below the base rate");
        assertLe(rate, irs.getMaxDrawnRate(ASSET), "never above the curve's ceiling");
    }

    /// @notice Utilisation cannot structurally exceed 100%, but a bad caller must not be able
    ///         to extrapolate the curve past its ceiling.
    function test_calculateDrawnRate_clampsAboveFullUtilisation() public view {
        assertEq(irs.calculateDrawnRate(ASSET, BPS + 1), irs.getMaxDrawnRate(ASSET));
        assertEq(irs.calculateDrawnRate(ASSET, type(uint256).max), irs.getMaxDrawnRate(ASSET));
    }

    // ---------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------

    /// @notice An unconfigured asset must price at zero rather than revert: one misconfigured
    ///         asset must not be able to brick accrual for every other asset on the Hub.
    function test_unconfiguredAsset_pricesAtZeroInsteadOfReverting() public view {
        uint256 unlisted = 999;
        assertEq(irs.calculateDrawnRate(unlisted, 5_000), 0);
        assertEq(irs.getMaxDrawnRate(unlisted), 0);
    }

    function test_setInterestRateData_revertsWith_InvalidOptimalUsageRatio() public {
        vm.startPrank(owner);

        vm.expectRevert(IInterestRateStrategy.InvalidOptimalUsageRatio.selector);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData(0, BASE, GROWTH_BEFORE, GROWTH_AFTER)
        );

        vm.expectRevert(IInterestRateStrategy.InvalidOptimalUsageRatio.selector);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData(
                uint16(BPS),
                BASE,
                GROWTH_BEFORE,
                GROWTH_AFTER
            )
        );

        vm.stopPrank();
    }

    function test_setInterestRateData_revertsWith_DrawnRateTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(IInterestRateStrategy.DrawnRateTooHigh.selector);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData(OPTIMAL, 500_000, 500_000, 500_000)
        );
    }

    function test_setInterestRateData_revertsWhenNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData(OPTIMAL, BASE, GROWTH_BEFORE, GROWTH_AFTER)
        );
    }

    function test_setInterestRateData_emitsAndRoundTrips() public {
        vm.expectEmit(true, false, false, true);
        emit IInterestRateStrategy.InterestRateDataSet(ASSET, 5_000, 1, 2, 3);

        vm.prank(owner);
        irs.setInterestRateData(
            ASSET,
            IInterestRateStrategy.InterestRateData(5_000, 1, 2, 3)
        );

        IInterestRateStrategy.InterestRateData memory d = irs.getInterestRateData(ASSET);
        assertEq(d.optimalUsageRatio, 5_000);
        assertEq(d.baseDrawnRate, 1);
        assertEq(d.rateGrowthBeforeOptimal, 2);
        assertEq(d.rateGrowthAfterOptimal, 3);
    }

    /// @notice Assets must be priced independently — configuring one must not disturb another.
    function test_assetsAreConfiguredIndependently() public {
        vm.prank(owner);
        irs.setInterestRateData(
            1,
            IInterestRateStrategy.InterestRateData(5_000, 900, 100, 200)
        );

        assertEq(irs.calculateDrawnRate(ASSET, 0), BASE, "asset 0 unchanged");
        assertEq(irs.calculateDrawnRate(1, 0), 900, "asset 1 uses its own curve");
    }
}
