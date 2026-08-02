// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SharesMath
/// @notice Converts between asset amounts and share amounts for both of the Hub's books:
///         the supply book (added shares) and the debt book (drawn shares).
/// @dev Two properties matter here, and both are load-bearing:
///
///      1. **Virtual assets and shares.** Every ratio is computed against
///         `total + VIRTUAL`, never against `total` alone. Without this, a pool that is
///         empty or nearly empty can be attacked: the attacker mints 1 wei of shares, then
///         transfers a large amount of the underlying straight to the pool so that one share
///         becomes worth an enormous number of assets. The next depositor's amount then
///         rounds down to zero shares and their deposit is captured. Adding 1e6 to both sides
///         of every ratio means the attacker would have to donate on the order of 1e6x the
///         victim's deposit before the rounding bites, which makes the attack uneconomic.
///
///      2. **Directional rounding.** Callers must pick the direction that favours the
///         protocol, never the user. See the table in the design spec §2.3. The rule is:
///         what a user receives rounds down, what a user owes rounds up. Getting a single
///         call site backwards makes the pool drainable by repetition, because the leak per
///         operation is tiny but the operation can be looped.
///
///      This library is intentionally free of access control and state; it is pure arithmetic
///      and the caller is responsible for passing consistent totals.
library SharesMath {
    /// @dev Chosen to match Aave v4. Large enough to price out the inflation attack, small
    ///      enough that it never meaningfully distorts a funded pool.
    uint256 internal constant VIRTUAL_ASSETS = 1e6;
    uint256 internal constant VIRTUAL_SHARES = 1e6;

    /// @notice Assets to shares, rounding down.
    /// @dev Use when minting shares to a user: they must never receive a share they did not
    ///      pay for.
    function toSharesDown(
        uint256 assets,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        return
            Math.mulDiv(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS, Math.Rounding.Floor);
    }

    /// @notice Assets to shares, rounding up.
    /// @dev Use when burning a user's shares to pay out assets, or when recording new debt:
    ///      the share cost of what they take must never round in their favour.
    function toSharesUp(
        uint256 assets,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        return
            Math.mulDiv(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS, Math.Rounding.Ceil);
    }

    /// @notice Shares to assets, rounding down.
    /// @dev Use when paying assets out against shares, or when valuing a debt reduction.
    function toAssetsDown(
        uint256 shares,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        return
            Math.mulDiv(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES, Math.Rounding.Floor);
    }

    /// @notice Shares to assets, rounding up.
    /// @dev Use when valuing what a user owes, so a debt is never understated.
    function toAssetsUp(
        uint256 shares,
        uint256 totalAssets,
        uint256 totalShares
    ) internal pure returns (uint256) {
        return
            Math.mulDiv(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES, Math.Rounding.Ceil);
    }

    // =====================================================================
    // Debt book — indexed, no virtual offsets
    // =====================================================================
    //
    // The debt book is priced by a monotonically growing index, not by a pool ratio, so the
    // functions above must NOT be used for it. Two reasons:
    //
    //   * Correctness. `totalOwed` is defined as `drawnShares * index / RAY`. Pricing a debt
    //     share as `(totalOwed + VIRTUAL) / (drawnShares + VIRTUAL)` instead pulls the ratio
    //     toward 1 whenever the index has grown, which understates the price. A repayment then
    //     clears more debt shares than the payment is worth, `totalOwed` falls too far, and
    //     the supply share price drops — a real violation caught by the invariant suite.
    //
    //   * Necessity. Virtual offsets exist to stop share-price manipulation of a pool that an
    //     attacker can donate into. Nobody can donate into the debt book; its price is the
    //     index, which only accrual moves.

    uint256 internal constant RAY = 1e27;

    /// @notice Assets to debt shares, rounding up. Use when recording new debt.
    function toDebtSharesUp(uint256 assets, uint256 index) internal pure returns (uint256) {
        return Math.mulDiv(assets, RAY, index, Math.Rounding.Ceil);
    }

    /// @notice Assets to debt shares, rounding down. Use when clearing debt on repayment, so a
    ///         payment never retires more debt than it covers.
    function toDebtSharesDown(uint256 assets, uint256 index) internal pure returns (uint256) {
        return Math.mulDiv(assets, RAY, index, Math.Rounding.Floor);
    }

    /// @notice Debt shares to assets, rounding down. Use for protocol-level totals.
    function toDebtAssetsDown(uint256 shares, uint256 index) internal pure returns (uint256) {
        return Math.mulDiv(shares, index, RAY, Math.Rounding.Floor);
    }

    /// @notice Debt shares to assets, rounding up. Use when telling a borrower what they owe.
    function toDebtAssetsUp(uint256 shares, uint256 index) internal pure returns (uint256) {
        return Math.mulDiv(shares, index, RAY, Math.Rounding.Ceil);
    }
}
