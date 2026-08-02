// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IInterestRateStrategy} from "../interfaces/IInterestRateStrategy.sol";

/// @title InterestRateStrategy
/// @notice The kinked utilisation curve that prices borrowing for each Hub asset.
/// @dev The steep post-kink slope is not a revenue device. It is the mechanism that keeps a
///      pool withdrawable: as utilisation approaches 100% the cost of borrowing rises sharply,
///      which pushes borrowers to repay and pulls suppliers in, restoring free liquidity.
///      Design spec §2.5 and §6.1.
contract InterestRateStrategy is IInterestRateStrategy, Ownable {
    uint256 public constant BPS = 10_000;

    /// @notice Hard ceiling on the rate at full utilisation: 1000% annual.
    /// @dev Guards against a misconfiguration that would make debt explode faster than any
    ///      liquidation could react.
    uint256 public constant MAX_DRAWN_RATE = 1_000_000;

    mapping(uint256 assetId => InterestRateData) private _data;

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @inheritdoc IInterestRateStrategy
    function setInterestRateData(
        uint256 assetId,
        InterestRateData calldata data
    ) external onlyOwner {
        // A kink at 0 would divide by zero below the kink; a kink at 10000 would divide by
        // zero above it. Both also make the two slopes meaningless.
        require(
            data.optimalUsageRatio > 0 && data.optimalUsageRatio < BPS,
            InvalidOptimalUsageRatio()
        );

        uint256 maxRate = uint256(data.baseDrawnRate) +
            data.rateGrowthBeforeOptimal +
            data.rateGrowthAfterOptimal;
        require(maxRate <= MAX_DRAWN_RATE, DrawnRateTooHigh());

        _data[assetId] = data;

        emit InterestRateDataSet(
            assetId,
            data.optimalUsageRatio,
            data.baseDrawnRate,
            data.rateGrowthBeforeOptimal,
            data.rateGrowthAfterOptimal
        );
    }

    /// @inheritdoc IInterestRateStrategy
    function calculateDrawnRate(
        uint256 assetId,
        uint256 usageRatio
    ) external view returns (uint256) {
        InterestRateData memory d = _data[assetId];

        // An unconfigured asset prices at zero rather than reverting, so a misconfigured
        // asset cannot brick accrual for every other asset sharing the Hub.
        if (d.optimalUsageRatio == 0) return 0;

        // Utilisation is derived as owed/total inside the Hub and cannot structurally exceed
        // 100%, but clamp anyway so a bad caller cannot extrapolate the curve past its ceiling.
        if (usageRatio > BPS) usageRatio = BPS;

        if (usageRatio <= d.optimalUsageRatio) {
            // Below the kink: base plus a linear ramp across [0, optimal].
            return
                d.baseDrawnRate +
                Math.mulDiv(d.rateGrowthBeforeOptimal, usageRatio, d.optimalUsageRatio);
        }

        // Above the kink: the pre-kink growth is fully earned, plus a linear ramp across
        // [optimal, 100%].
        uint256 excess = usageRatio - d.optimalUsageRatio;
        uint256 excessRange = BPS - d.optimalUsageRatio;

        return
            d.baseDrawnRate +
            d.rateGrowthBeforeOptimal +
            Math.mulDiv(d.rateGrowthAfterOptimal, excess, excessRange);
    }

    /// @inheritdoc IInterestRateStrategy
    function getMaxDrawnRate(uint256 assetId) external view returns (uint256) {
        InterestRateData memory d = _data[assetId];
        if (d.optimalUsageRatio == 0) return 0;
        return
            uint256(d.baseDrawnRate) + d.rateGrowthBeforeOptimal + d.rateGrowthAfterOptimal;
    }

    /// @inheritdoc IInterestRateStrategy
    function getInterestRateData(
        uint256 assetId
    ) external view returns (InterestRateData memory) {
        return _data[assetId];
    }
}
