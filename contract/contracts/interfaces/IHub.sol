// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IHub
/// @notice The Hub owns liquidity and share accounting for every asset. Spokes are the only
///         callers; they hold no funds and route user intent into the four primitives below.
/// @dev Design spec: docs/specs/2026-08-01-hub-spoke-lending-design.md §2.
interface IHub {
    /// @param underlying The ERC-20 backing this asset.
    /// @param liquidity Assets held by the Hub and not currently drawn. Tracked internally,
    ///        never read from `balanceOf` — see the note on donations in `LiquidityHub`.
    /// @param addedShares Total supply shares outstanding.
    /// @param drawnShares Total debt shares outstanding.
    /// @param drawnIndex Debt index, RAY-scaled, monotonically non-decreasing.
    /// @param lastUpdate Timestamp interest was last accrued.
    /// @param liquidityFee Share of accrued interest retained by the protocol, in bps.
    /// @param irStrategy Curve pricing this asset's borrowing.
    /// @param feeReceiver Spoke credited with fee shares. Must itself be a listed spoke.
    struct Asset {
        address underlying;
        uint256 liquidity;
        uint256 addedShares;
        uint256 drawnShares;
        uint256 drawnIndex;
        uint256 lastUpdate;
        uint16 liquidityFee;
        address irStrategy;
        address feeReceiver;
    }

    /// @param addCap Maximum assets this spoke may have supplied. Zero means no cap.
    /// @param drawCap Maximum assets this spoke may owe. Zero means no cap.
    /// @param active False disables the spoke entirely.
    /// @param halted True blocks liquidity-moving actions but leaves the spoke listed.
    struct SpokeConfig {
        uint256 addCap;
        uint256 drawCap;
        bool active;
        bool halted;
    }

    struct SpokeData {
        uint256 addedShares;
        uint256 drawnShares;
        uint256 addCap;
        uint256 drawCap;
        bool listed;
        bool active;
        bool halted;
    }

    event AssetAdded(uint256 indexed assetId, address indexed underlying);
    event AssetConfigUpdated(
        uint256 indexed assetId,
        uint16 liquidityFee,
        address irStrategy,
        address feeReceiver
    );
    event SpokeAdded(uint256 indexed assetId, address indexed spoke);
    event SpokeConfigUpdated(uint256 indexed assetId, address indexed spoke, SpokeConfig config);

    event Add(uint256 indexed assetId, address indexed spoke, uint256 amount, uint256 shares);
    event Remove(uint256 indexed assetId, address indexed spoke, uint256 amount, uint256 shares);
    event Draw(uint256 indexed assetId, address indexed spoke, uint256 amount, uint256 shares);
    event Restore(uint256 indexed assetId, address indexed spoke, uint256 amount, uint256 shares);
    event InterestAccrued(uint256 indexed assetId, uint256 interest, uint256 newDrawnIndex);
    event FeeSharesMinted(uint256 indexed assetId, address indexed feeReceiver, uint256 shares);

    error AssetNotListed();
    error UnderlyingAlreadyListed();
    error InvalidAddress();
    error InvalidLiquidityFee();
    error SpokeAlreadyListed();
    error SpokeNotListed();
    error SpokeNotActive();
    error SpokeHalted();
    error InvalidAmount();
    error InsufficientLiquidity();
    error AddCapExceeded();
    error DrawCapExceeded();
    error InsufficientSpokeShares();
    error RestoreExceedsDebt();

    /// @notice Supplies `amount` of the asset on behalf of the calling spoke.
    /// @dev Pulls the tokens from the spoke, which must have approved the Hub.
    /// @return shares Supply shares credited, rounded down.
    function add(uint256 assetId, uint256 amount) external returns (uint256 shares);

    /// @notice Withdraws `amount` of the asset to `to`, burning the caller's supply shares.
    /// @return shares Supply shares burned, rounded up.
    function remove(uint256 assetId, uint256 amount, address to) external returns (uint256 shares);

    /// @notice Borrows `amount` of the asset to `to`, recording debt against the caller.
    /// @return shares Debt shares recorded, rounded up.
    function draw(uint256 assetId, uint256 amount, address to) external returns (uint256 shares);

    /// @notice Repays `amount` of the caller's debt. Pulls the tokens from the spoke.
    /// @return shares Debt shares cleared, rounded down.
    function restore(uint256 assetId, uint256 amount) external returns (uint256 shares);

    /// @notice Accrues interest for an asset. Called internally by every primitive; exposed so
    ///         views can be brought up to date without a state-changing action.
    function accrue(uint256 assetId) external;

    function getAsset(uint256 assetId) external view returns (Asset memory);
    function getSpoke(uint256 assetId, address spoke) external view returns (SpokeData memory);
    function assetCount() external view returns (uint256);

    /// @notice Total assets backing the supply book: idle liquidity plus everything owed.
    function totalAssets(uint256 assetId) external view returns (uint256);

    /// @notice Total currently owed across every spoke, interest included.
    function totalOwed(uint256 assetId) external view returns (uint256);

    /// @notice Utilisation in bps: owed over total assets.
    function utilization(uint256 assetId) external view returns (uint256);

    /// @notice Current annual drawn rate in bps.
    function drawnRate(uint256 assetId) external view returns (uint256);

    /// @notice Assets a spoke's supply shares are currently worth, rounded down.
    function spokeAddedAssets(uint256 assetId, address spoke) external view returns (uint256);

    /// @notice Assets a spoke currently owes, rounded up.
    function spokeOwed(uint256 assetId, address spoke) external view returns (uint256);

    function previewAdd(uint256 assetId, uint256 amount) external view returns (uint256);
    function previewRemove(uint256 assetId, uint256 amount) external view returns (uint256);
    function previewRemoveByShares(uint256 assetId, uint256 shares) external view returns (uint256);
}
