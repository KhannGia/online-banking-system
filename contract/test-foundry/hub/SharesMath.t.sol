// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SharesMath} from "contracts/hub/libraries/SharesMath.sol";

/// @title SharesMath property tests
/// @notice Locks down the arithmetic the Hub's two books rest on, before the Hub exists.
///         The round-trip tests are the important ones: they are what stops a caller from
///         looping a cheap operation to drain the pool a sub-unit at a time.
contract SharesMathTest is Test {
    /// @dev Wide enough to cover realistic USDC pools (1e6 decimals, billions of tokens) with
    ///      room to spare, tight enough that `mulDiv` results stay well inside uint256.
    uint256 internal constant MAX_ASSETS = 1e30;
    uint256 internal constant MAX_SHARES = 1e30;

    // ---------------------------------------------------------------------
    // Direction: the up/down pair must bracket the true value
    // ---------------------------------------------------------------------

    function test_toShares_fuzz_upIsNeverBelowDown(
        uint256 assets,
        uint256 totalAssets,
        uint256 totalShares
    ) public pure {
        assets = bound(assets, 0, MAX_ASSETS);
        totalAssets = bound(totalAssets, 0, MAX_ASSETS);
        totalShares = bound(totalShares, 0, MAX_SHARES);

        uint256 down = SharesMath.toSharesDown(assets, totalAssets, totalShares);
        uint256 up = SharesMath.toSharesUp(assets, totalAssets, totalShares);

        assertLe(down, up, "down must not exceed up");
        assertLe(up - down, 1, "up and down may differ by at most one unit");
    }

    function test_toAssets_fuzz_upIsNeverBelowDown(
        uint256 shares,
        uint256 totalAssets,
        uint256 totalShares
    ) public pure {
        shares = bound(shares, 0, MAX_SHARES);
        totalAssets = bound(totalAssets, 0, MAX_ASSETS);
        totalShares = bound(totalShares, 0, MAX_SHARES);

        uint256 down = SharesMath.toAssetsDown(shares, totalAssets, totalShares);
        uint256 up = SharesMath.toAssetsUp(shares, totalAssets, totalShares);

        assertLe(down, up, "down must not exceed up");
        assertLe(up - down, 1, "up and down may differ by at most one unit");
    }

    // ---------------------------------------------------------------------
    // The anti-drain properties
    // ---------------------------------------------------------------------

    /// @notice Supply round trip: add assets, then immediately remove the shares just minted.
    ///         The caller must never come out ahead. If `add` rounded up while `remove`
    ///         rounded down, this loop would net a sub-unit per iteration and drain the pool.
    function test_supplyRoundTrip_fuzz_neverProfitable(
        uint256 assets,
        uint256 totalAssets,
        uint256 totalShares
    ) public pure {
        assets = bound(assets, 0, MAX_ASSETS);
        totalAssets = bound(totalAssets, 0, MAX_ASSETS);
        totalShares = bound(totalShares, 0, MAX_SHARES);

        // add: user receives shares, rounded down
        uint256 shares = SharesMath.toSharesDown(assets, totalAssets, totalShares);

        // the pool now holds the deposit
        uint256 newTotalAssets = totalAssets + assets;
        uint256 newTotalShares = totalShares + shares;

        // remove: user redeems exactly those shares, valued down
        uint256 assetsOut = SharesMath.toAssetsDown(shares, newTotalAssets, newTotalShares);

        assertLe(assetsOut, assets, "supply round trip must not return more than it consumed");
    }

    /// @notice Debt round trip: draw assets, then immediately repay the debt shares recorded.
    ///         The borrower must never owe less than they received.
    function test_debtRoundTrip_fuzz_neverUnderstatesDebt(
        uint256 assets,
        uint256 totalOwed,
        uint256 totalDrawnShares
    ) public pure {
        assets = bound(assets, 0, MAX_ASSETS);
        totalOwed = bound(totalOwed, 0, MAX_ASSETS);
        totalDrawnShares = bound(totalDrawnShares, 0, MAX_SHARES);

        // draw: debt shares recorded against the borrower, rounded up
        uint256 debtShares = SharesMath.toSharesUp(assets, totalOwed, totalDrawnShares);

        uint256 newTotalOwed = totalOwed + assets;
        uint256 newTotalShares = totalDrawnShares + debtShares;

        // restore: what those shares are worth, valued up
        uint256 assetsOwed = SharesMath.toAssetsUp(debtShares, newTotalOwed, newTotalShares);

        assertGe(assetsOwed, assets, "debt round trip must not understate what was drawn");
    }

    /// @notice Proves the round-trip test above has teeth, by pinning a concrete case where
    ///         the WRONG direction is demonstrably profitable. A pool holding 2e12 assets
    ///         against 1e12 shares (share price 2) turns a 2-unit deposit into a 3-unit
    ///         withdrawal if `add` rounds shares up — a 50% gain on the deposit, repeatable
    ///         for as long as gas is cheaper than the profit.
    /// @dev Found by exhaustive search over small deposits and plausible pool states. If a
    ///      future refactor makes this stop failing, the round-trip fuzz test has gone blind
    ///      and both need re-examining.
    function test_supplyRoundTrip_wrongDirectionIsDrainable_counterexample() public pure {
        uint256 totalAssets = 2e12;
        uint256 totalShares = 1e12;
        uint256 assets = 2;

        // WRONG: rounding the supplier's shares up
        uint256 sharesWrong = SharesMath.toSharesUp(assets, totalAssets, totalShares);
        uint256 outWrong = SharesMath.toAssetsDown(
            sharesWrong,
            totalAssets + assets,
            totalShares + sharesWrong
        );
        assertEq(outWrong, 3, "counterexample must reproduce exactly");
        assertGt(outWrong, assets, "rounding up on add is drainable");

        // RIGHT: the direction the library actually uses
        uint256 sharesRight = SharesMath.toSharesDown(assets, totalAssets, totalShares);
        uint256 outRight = SharesMath.toAssetsDown(
            sharesRight,
            totalAssets + assets,
            totalShares + sharesRight
        );
        assertLe(outRight, assets, "correct direction cannot profit");
    }

    // ---------------------------------------------------------------------
    // Inflation / donation attack
    // ---------------------------------------------------------------------

    /// @notice The classic first-depositor attack, run against a realistic victim.
    ///         Attacker seeds an empty pool with 1 wei, donates a large amount directly, and
    ///         hopes the victim's deposit rounds down to zero shares. The virtual offsets mean
    ///         a donation of 1,000,000 USDC still leaves the victim with real shares.
    function test_inflationAttack_donationDoesNotZeroOutVictim() public pure {
        uint256 victimDeposit = 1_000e6; // 1,000 USDC
        uint256 donation = 1_000_000e6; // 1,000,000 USDC — a thousand times the victim's

        // attacker seeds the empty pool
        uint256 attackerShares = SharesMath.toSharesDown(1, 0, 0);
        assertGt(attackerShares, 0, "seed deposit should mint shares");

        // attacker donates straight into the pool: assets rise, shares do not
        uint256 totalAssets = 1 + donation;
        uint256 totalShares = attackerShares;

        uint256 victimShares = SharesMath.toSharesDown(victimDeposit, totalAssets, totalShares);

        assertGt(victimShares, 0, "victim must not be rounded down to zero shares");
    }

    /// @notice Quantifies the previous test: to zero out a victim the attacker must donate on
    ///         the order of VIRTUAL_ASSETS times the victim's deposit, which is what makes the
    ///         attack uneconomic rather than merely inconvenient.
    function test_inflationAttack_fuzz_donationBelowVirtualScaleIsHarmless(
        uint256 victimDeposit,
        uint256 donation
    ) public pure {
        victimDeposit = bound(victimDeposit, 1e6, 1e24);
        // stay an order of magnitude under the virtual-share scale
        donation = bound(donation, 0, victimDeposit * (SharesMath.VIRTUAL_ASSETS / 10));

        uint256 attackerShares = SharesMath.toSharesDown(1, 0, 0);
        uint256 victimShares = SharesMath.toSharesDown(
            victimDeposit,
            1 + donation,
            attackerShares
        );

        assertGt(victimShares, 0, "victim keeps non-zero shares below the virtual scale");
    }

    // ---------------------------------------------------------------------
    // Basic sanity
    // ---------------------------------------------------------------------

    function test_zeroMapsToZero_fuzz(uint256 totalAssets, uint256 totalShares) public pure {
        totalAssets = bound(totalAssets, 0, MAX_ASSETS);
        totalShares = bound(totalShares, 0, MAX_SHARES);

        assertEq(SharesMath.toSharesDown(0, totalAssets, totalShares), 0);
        assertEq(SharesMath.toSharesUp(0, totalAssets, totalShares), 0);
        assertEq(SharesMath.toAssetsDown(0, totalAssets, totalShares), 0);
        assertEq(SharesMath.toAssetsUp(0, totalAssets, totalShares), 0);
    }

    function test_toSharesDown_fuzz_isMonotonic(
        uint256 a,
        uint256 b,
        uint256 totalAssets,
        uint256 totalShares
    ) public pure {
        a = bound(a, 0, MAX_ASSETS);
        b = bound(b, a, MAX_ASSETS);
        totalAssets = bound(totalAssets, 0, MAX_ASSETS);
        totalShares = bound(totalShares, 0, MAX_SHARES);

        assertLe(
            SharesMath.toSharesDown(a, totalAssets, totalShares),
            SharesMath.toSharesDown(b, totalAssets, totalShares),
            "more assets must never mint fewer shares"
        );
    }

    /// @notice An empty pool must price one-to-one, otherwise the first depositor is either
    ///         diluted or subsidised by the virtual offsets.
    function test_emptyPool_pricesOneToOne_fuzz(uint256 assets) public pure {
        assets = bound(assets, 0, MAX_ASSETS);

        assertEq(SharesMath.toSharesDown(assets, 0, 0), assets);
        assertEq(SharesMath.toAssetsDown(assets, 0, 0), assets);
    }
}
