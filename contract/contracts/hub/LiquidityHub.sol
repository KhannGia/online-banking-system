// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IHub} from "../interfaces/IHub.sol";
import {IInterestRateStrategy} from "../interfaces/IInterestRateStrategy.sol";
import {SharesMath} from "./libraries/SharesMath.sol";

/// @title LiquidityHub
/// @notice Owns liquidity and share accounting for every listed asset. Deliberately the
///         simplest contract in the system: it knows nothing about products, collateral,
///         oracles or liquidation — those live in Spokes.
/// @dev Invariants this contract must preserve (design spec §2.6), and which the Foundry
///      invariant suite asserts after every randomised action:
///
///        1. sum of spoke addedShares == asset.addedShares
///        2. sum of spoke drawnShares == asset.drawnShares
///        3. supply share price never decreases
///        4. drawnIndex never decreases
///        5. liquidity only moves through add / remove / draw / restore
///        6. remove can never pay out more than liquidity
///
///      Note on donations: `liquidity` is tracked internally and is never read from
///      `balanceOf`. Anyone can transfer tokens straight to this contract; if the share price
///      were derived from the balance, such a donation would move the price and could be used
///      to grief depositors. Donated tokens are simply invisible and unrecoverable.
contract LiquidityHub is IHub, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant RAY = 1e27;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Upper bound on the protocol's cut of interest.
    uint256 public constant MAX_LIQUIDITY_FEE = 5_000;

    Asset[] private _assets;
    mapping(address underlying => bool) private _listed;
    mapping(uint256 assetId => mapping(address spoke => SpokeData)) private _spokes;

    constructor(address initialOwner) Ownable(initialOwner) {}

    // =====================================================================
    // Modifiers
    // =====================================================================

    modifier onlyOperatingSpoke(uint256 assetId) {
        require(assetId < _assets.length, AssetNotListed());
        SpokeData storage s = _spokes[assetId][msg.sender];
        require(s.listed, SpokeNotListed());
        require(s.active, SpokeNotActive());
        require(!s.halted, SpokeHalted());
        _;
    }

    // =====================================================================
    // Governance
    // =====================================================================

    /// @notice Lists a new asset. One entry per underlying — a duplicate would split
    ///         liquidity that is supposed to be shared.
    function addAsset(
        address underlying,
        address irStrategy,
        address feeReceiver,
        uint16 liquidityFee
    ) external onlyOwner returns (uint256 assetId) {
        require(underlying != address(0) && irStrategy != address(0), InvalidAddress());
        require(!_listed[underlying], UnderlyingAlreadyListed());
        require(liquidityFee <= MAX_LIQUIDITY_FEE, InvalidLiquidityFee());

        assetId = _assets.length;
        _assets.push(
            Asset({
                underlying: underlying,
                liquidity: 0,
                addedShares: 0,
                drawnShares: 0,
                drawnIndex: RAY,
                lastUpdate: block.timestamp,
                liquidityFee: liquidityFee,
                irStrategy: irStrategy,
                feeReceiver: feeReceiver
            })
        );
        _listed[underlying] = true;

        emit AssetAdded(assetId, underlying);
        emit AssetConfigUpdated(assetId, liquidityFee, irStrategy, feeReceiver);
    }

    function updateAssetConfig(
        uint256 assetId,
        address irStrategy,
        address feeReceiver,
        uint16 liquidityFee
    ) external onlyOwner {
        require(assetId < _assets.length, AssetNotListed());
        require(irStrategy != address(0), InvalidAddress());
        require(liquidityFee <= MAX_LIQUIDITY_FEE, InvalidLiquidityFee());

        // Settle interest under the old parameters before the new ones take effect, so a rate
        // or fee change is never applied retroactively to elapsed time.
        _accrue(assetId);

        Asset storage a = _assets[assetId];
        a.irStrategy = irStrategy;
        a.feeReceiver = feeReceiver;
        a.liquidityFee = liquidityFee;

        emit AssetConfigUpdated(assetId, liquidityFee, irStrategy, feeReceiver);
    }

    /// @notice Registers a spoke against an asset. Caps are the blast radius of a buggy
    ///         spoke, so they should be set deliberately rather than left open.
    function addSpoke(
        uint256 assetId,
        address spoke,
        SpokeConfig calldata config
    ) external onlyOwner {
        require(assetId < _assets.length, AssetNotListed());
        require(spoke != address(0), InvalidAddress());
        SpokeData storage s = _spokes[assetId][spoke];
        require(!s.listed, SpokeAlreadyListed());

        s.listed = true;
        s.addCap = config.addCap;
        s.drawCap = config.drawCap;
        s.active = config.active;
        s.halted = config.halted;

        emit SpokeAdded(assetId, spoke);
        emit SpokeConfigUpdated(assetId, spoke, config);
    }

    function updateSpokeConfig(
        uint256 assetId,
        address spoke,
        SpokeConfig calldata config
    ) external onlyOwner {
        SpokeData storage s = _spokes[assetId][spoke];
        require(s.listed, SpokeNotListed());

        s.addCap = config.addCap;
        s.drawCap = config.drawCap;
        s.active = config.active;
        s.halted = config.halted;

        emit SpokeConfigUpdated(assetId, spoke, config);
    }

    // =====================================================================
    // Primitives
    // =====================================================================

    /// @inheritdoc IHub
    function add(
        uint256 assetId,
        uint256 amount
    ) external nonReentrant onlyOperatingSpoke(assetId) returns (uint256 shares) {
        require(amount > 0, InvalidAmount());
        _accrue(assetId);

        Asset storage a = _assets[assetId];

        // Priced before the incoming assets are counted, otherwise the supplier would be
        // pricing against their own deposit.
        shares = SharesMath.toSharesDown(amount, _totalAssets(a), a.addedShares);

        a.liquidity += amount;
        a.addedShares += shares;

        SpokeData storage s = _spokes[assetId][msg.sender];
        s.addedShares += shares;

        if (s.addCap > 0) {
            require(
                SharesMath.toAssetsDown(s.addedShares, _totalAssets(a), a.addedShares) <=
                    s.addCap,
                AddCapExceeded()
            );
        }

        IERC20(a.underlying).safeTransferFrom(msg.sender, address(this), amount);

        emit Add(assetId, msg.sender, amount, shares);
    }

    /// @inheritdoc IHub
    function remove(
        uint256 assetId,
        uint256 amount,
        address to
    ) external nonReentrant onlyOperatingSpoke(assetId) returns (uint256 shares) {
        require(amount > 0, InvalidAmount());
        require(to != address(0), InvalidAddress());
        _accrue(assetId);

        Asset storage a = _assets[assetId];

        // Invariant 6. This is the illiquidity case from spec §6.1: the supplier's claim is
        // intact, but at full utilisation there is nothing free to pay it with.
        require(amount <= a.liquidity, InsufficientLiquidity());

        shares = SharesMath.toSharesUp(amount, _totalAssets(a), a.addedShares);

        SpokeData storage s = _spokes[assetId][msg.sender];
        require(shares <= s.addedShares, InsufficientSpokeShares());

        a.liquidity -= amount;
        a.addedShares -= shares;
        s.addedShares -= shares;

        IERC20(a.underlying).safeTransfer(to, amount);

        emit Remove(assetId, msg.sender, amount, shares);
    }

    /// @inheritdoc IHub
    function draw(
        uint256 assetId,
        uint256 amount,
        address to
    ) external nonReentrant onlyOperatingSpoke(assetId) returns (uint256 shares) {
        require(amount > 0, InvalidAmount());
        require(to != address(0), InvalidAddress());
        _accrue(assetId);

        Asset storage a = _assets[assetId];
        require(amount <= a.liquidity, InsufficientLiquidity());

        shares = SharesMath.toDebtSharesUp(amount, a.drawnIndex);

        a.liquidity -= amount;
        a.drawnShares += shares;

        SpokeData storage s = _spokes[assetId][msg.sender];
        s.drawnShares += shares;

        if (s.drawCap > 0) {
            require(
                SharesMath.toDebtAssetsUp(s.drawnShares, a.drawnIndex) <= s.drawCap,
                DrawCapExceeded()
            );
        }

        IERC20(a.underlying).safeTransfer(to, amount);

        emit Draw(assetId, msg.sender, amount, shares);
    }

    /// @inheritdoc IHub
    function restore(
        uint256 assetId,
        uint256 amount
    ) external nonReentrant onlyOperatingSpoke(assetId) returns (uint256 shares) {
        require(amount > 0, InvalidAmount());
        _accrue(assetId);

        Asset storage a = _assets[assetId];
        SpokeData storage s = _spokes[assetId][msg.sender];

        shares = SharesMath.toDebtSharesDown(amount, a.drawnIndex);
        require(shares <= s.drawnShares, RestoreExceedsDebt());

        a.liquidity += amount;
        a.drawnShares -= shares;
        s.drawnShares -= shares;

        IERC20(a.underlying).safeTransferFrom(msg.sender, address(this), amount);

        emit Restore(assetId, msg.sender, amount, shares);
    }

    /// @inheritdoc IHub
    function accrue(uint256 assetId) external {
        require(assetId < _assets.length, AssetNotListed());
        _accrue(assetId);
    }

    // =====================================================================
    // Interest
    // =====================================================================

    /// @dev Grows the debt index by the elapsed period at the current rate, then mints the
    ///      protocol's cut of the newly accrued interest as supply shares.
    ///
    ///      Suppliers are never paid explicitly: the debt grows, so `totalAssets` grows, so
    ///      every supply share is worth more. That is the whole yield mechanism.
    function _accrue(uint256 assetId) internal {
        Asset storage a = _assets[assetId];

        uint256 elapsed = block.timestamp - a.lastUpdate;
        if (elapsed == 0) return;
        a.lastUpdate = block.timestamp;

        // No debt means no interest, and nothing to price.
        if (a.drawnShares == 0) return;

        uint256 owedBefore = _totalOwed(a);
        uint256 rateBps = IInterestRateStrategy(a.irStrategy).calculateDrawnRate(
            assetId,
            _utilization(a)
        );
        if (rateBps == 0) return;

        // Linear growth across the elapsed period; compounding happens because this runs on
        // every interaction. Invariant 4: the multiplier is >= RAY, so the index cannot fall.
        uint256 growthRay = RAY + Math.mulDiv(rateBps * RAY, elapsed, BPS * SECONDS_PER_YEAR);
        a.drawnIndex = Math.mulDiv(a.drawnIndex, growthRay, RAY);

        uint256 interest = _totalOwed(a) - owedBefore;
        emit InterestAccrued(assetId, interest, a.drawnIndex);

        if (interest == 0 || a.liquidityFee == 0) return;

        // The fee receiver must be a listed spoke, otherwise its shares would not be counted
        // in the per-spoke sum and invariant 1 would break.
        address feeReceiver = a.feeReceiver;
        if (feeReceiver == address(0) || !_spokes[assetId][feeReceiver].listed) return;

        uint256 fee = Math.mulDiv(interest, a.liquidityFee, BPS);
        if (fee == 0) return;

        // Priced against totals that already include the interest, so minting these shares
        // dilutes suppliers by exactly the fee and leaves the share price unchanged rather
        // than lowering it (invariant 3).
        uint256 feeShares = SharesMath.toSharesDown(fee, _totalAssets(a), a.addedShares);
        if (feeShares == 0) return;

        a.addedShares += feeShares;
        _spokes[assetId][feeReceiver].addedShares += feeShares;

        emit FeeSharesMinted(assetId, feeReceiver, feeShares);
    }

    // =====================================================================
    // Internal views
    // =====================================================================

    function _totalOwed(Asset storage a) internal view returns (uint256) {
        return SharesMath.toDebtAssetsDown(a.drawnShares, a.drawnIndex);
    }

    function _totalAssets(Asset storage a) internal view returns (uint256) {
        return a.liquidity + _totalOwed(a);
    }

    function _utilization(Asset storage a) internal view returns (uint256) {
        uint256 total = _totalAssets(a);
        if (total == 0) return 0;
        return Math.mulDiv(_totalOwed(a), BPS, total);
    }

    // =====================================================================
    // External views
    // =====================================================================

    /// @inheritdoc IHub
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        require(assetId < _assets.length, AssetNotListed());
        return _assets[assetId];
    }

    /// @inheritdoc IHub
    function getSpoke(uint256 assetId, address spoke) external view returns (SpokeData memory) {
        return _spokes[assetId][spoke];
    }

    /// @inheritdoc IHub
    function assetCount() external view returns (uint256) {
        return _assets.length;
    }

    /// @inheritdoc IHub
    function totalAssets(uint256 assetId) external view returns (uint256) {
        return _totalAssets(_assets[assetId]);
    }

    /// @inheritdoc IHub
    function totalOwed(uint256 assetId) external view returns (uint256) {
        return _totalOwed(_assets[assetId]);
    }

    /// @inheritdoc IHub
    function utilization(uint256 assetId) external view returns (uint256) {
        return _utilization(_assets[assetId]);
    }

    /// @inheritdoc IHub
    function drawnRate(uint256 assetId) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return IInterestRateStrategy(a.irStrategy).calculateDrawnRate(assetId, _utilization(a));
    }

    /// @inheritdoc IHub
    function spokeAddedAssets(uint256 assetId, address spoke) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return
            SharesMath.toAssetsDown(
                _spokes[assetId][spoke].addedShares,
                _totalAssets(a),
                a.addedShares
            );
    }

    /// @inheritdoc IHub
    function spokeOwed(uint256 assetId, address spoke) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return
            SharesMath.toDebtAssetsUp(_spokes[assetId][spoke].drawnShares, a.drawnIndex);
    }

    /// @inheritdoc IHub
    function previewAdd(uint256 assetId, uint256 amount) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return SharesMath.toSharesDown(amount, _totalAssets(a), a.addedShares);
    }

    /// @inheritdoc IHub
    function previewRemove(uint256 assetId, uint256 amount) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return SharesMath.toSharesUp(amount, _totalAssets(a), a.addedShares);
    }

    /// @inheritdoc IHub
    function previewRemoveByShares(
        uint256 assetId,
        uint256 shares
    ) external view returns (uint256) {
        Asset storage a = _assets[assetId];
        return SharesMath.toAssetsDown(shares, _totalAssets(a), a.addedShares);
    }
}
