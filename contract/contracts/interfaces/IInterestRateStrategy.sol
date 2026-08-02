// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IInterestRateStrategy
/// @notice Prices borrowing as a function of how much of an asset's liquidity is in use.
/// @dev Kept behind an interface, and referenced per asset rather than hard-coded into the
///      Hub, so a curve can be replaced without touching the immutable Hub. See the design
///      spec §2.5.
interface IInterestRateStrategy {
    /// @notice Parameters of the kinked curve, all in basis points.
    /// @param optimalUsageRatio Utilisation at which the curve kinks (e.g. 8000 = 80%).
    /// @param baseDrawnRate Annual rate charged at zero utilisation.
    /// @param rateGrowthBeforeOptimal Rate added linearly between 0 and the kink.
    /// @param rateGrowthAfterOptimal Rate added linearly between the kink and full utilisation.
    struct InterestRateData {
        uint16 optimalUsageRatio;
        uint32 baseDrawnRate;
        uint32 rateGrowthBeforeOptimal;
        uint32 rateGrowthAfterOptimal;
    }

    /// @notice Emitted whenever an asset's curve is configured.
    event InterestRateDataSet(
        uint256 indexed assetId,
        uint16 optimalUsageRatio,
        uint32 baseDrawnRate,
        uint32 rateGrowthBeforeOptimal,
        uint32 rateGrowthAfterOptimal
    );

    /// @notice Thrown when the kink is at 0% or 100%, either of which collapses the curve.
    error InvalidOptimalUsageRatio();

    /// @notice Thrown when the curve's maximum rate would exceed `MAX_DRAWN_RATE`.
    error DrawnRateTooHigh();

    /// @notice Configures the curve for an asset.
    function setInterestRateData(uint256 assetId, InterestRateData calldata data) external;

    /// @notice Returns the configured curve for an asset.
    function getInterestRateData(uint256 assetId) external view returns (InterestRateData memory);

    /// @notice Annual drawn rate in basis points at the given utilisation.
    /// @param assetId The asset being priced.
    /// @param usageRatio Utilisation in basis points, where 10000 is full utilisation.
    function calculateDrawnRate(uint256 assetId, uint256 usageRatio) external view returns (uint256);

    /// @notice Rate at 100% utilisation — the ceiling of the configured curve.
    function getMaxDrawnRate(uint256 assetId) external view returns (uint256);
}
