// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

import {IHub} from "contracts/interfaces/IHub.sol";
import {MockSpoke} from "contracts/mocks/MockSpoke.sol";
import {MockUSDC} from "contracts/MockUSDC.sol";
import {SharesMath} from "contracts/hub/libraries/SharesMath.sol";

/// @title HubHandler
/// @notice Drives randomised but always-valid sequences of Hub actions across several spokes.
/// @dev Handler-based invariant testing: the fuzzer calls these entry points in random order
///      with random arguments, and the invariant contract asserts the Hub's accounting
///      properties after every call. Arguments are bounded to legal ranges so the sequence
///      keeps making progress instead of bouncing off `require`s.
///
///      Monotonicity of the share price and of the drawn index is checked here rather than in
///      the invariant contract, because it is a property *between consecutive states* and so
///      has to be sampled around each individual action.
contract HubHandler is CommonBase, StdCheats, StdUtils {
    IHub public immutable hub;
    MockUSDC public immutable usdc;
    uint256 public immutable assetId;

    MockSpoke[] public spokes;

    // --- ghosts ---------------------------------------------------------

    uint256 public lastSharePriceRay;
    uint256 public lastDrawnIndex;
    bool public sharePriceDecreased;
    bool public drawnIndexDecreased;

    uint256 public totalAdded;
    uint256 public totalRemoved;

    // call counters, so a run that silently did nothing is visible
    uint256 public addCalls;
    uint256 public removeCalls;
    uint256 public drawCalls;
    uint256 public restoreCalls;
    uint256 public warpCalls;

    constructor(IHub _hub, MockUSDC _usdc, uint256 _assetId, MockSpoke[] memory _spokes) {
        hub = _hub;
        usdc = _usdc;
        assetId = _assetId;
        for (uint256 i = 0; i < _spokes.length; i++) {
            spokes.push(_spokes[i]);
        }
        lastSharePriceRay = _sharePriceRay();
        lastDrawnIndex = hub.getAsset(_assetId).drawnIndex;
    }

    // =====================================================================
    // Actions
    // =====================================================================

    function add(uint256 spokeSeed, uint256 amount) external {
        MockSpoke spoke = _spoke(spokeSeed);
        amount = bound(amount, 1, 1_000_000e6);

        usdc.mint(address(spoke), amount);
        spoke.add(assetId, amount);

        totalAdded += amount;
        addCalls++;
        _snapshot();
    }

    function remove(uint256 spokeSeed, uint256 amount) external {
        MockSpoke spoke = _spoke(spokeSeed);

        // Bound to what this spoke can actually take out right now: its own claim, and the
        // liquidity that is not lent out.
        uint256 claim = hub.spokeAddedAssets(assetId, address(spoke));
        uint256 free = hub.getAsset(assetId).liquidity;
        uint256 ceiling = claim < free ? claim : free;
        if (ceiling == 0) return;

        amount = bound(amount, 1, ceiling);
        spoke.remove(assetId, amount, address(this));

        totalRemoved += amount;
        removeCalls++;
        _snapshot();
    }

    function draw(uint256 spokeSeed, uint256 amount) external {
        MockSpoke spoke = _spoke(spokeSeed);

        uint256 free = hub.getAsset(assetId).liquidity;
        if (free == 0) return;

        amount = bound(amount, 1, free);
        spoke.draw(assetId, amount, address(spoke));

        drawCalls++;
        _snapshot();
    }

    function restore(uint256 spokeSeed, uint256 amount) external {
        MockSpoke spoke = _spoke(spokeSeed);

        uint256 owed = hub.spokeOwed(assetId, address(spoke));
        if (owed == 0) return;

        amount = bound(amount, 1, owed);

        // Interest means a spoke can owe more than it drew, so top it up rather than skipping.
        usdc.mint(address(spoke), amount);
        spoke.restore(assetId, amount);

        restoreCalls++;
        _snapshot();
    }

    /// @notice Lets time pass so interest actually accrues during a run.
    function warp(uint256 secondsAhead) external {
        secondsAhead = bound(secondsAhead, 1, 30 days);
        vm.warp(block.timestamp + secondsAhead);
        hub.accrue(assetId);

        warpCalls++;
        _snapshot();
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    function spokeCount() external view returns (uint256) {
        return spokes.length;
    }

    function _spoke(uint256 seed) internal view returns (MockSpoke) {
        return spokes[bound(seed, 0, spokes.length - 1)];
    }

    /// @dev Price of one share, RAY-scaled, computed the same way the Hub prices conversions
    ///      (virtual offsets included) so the two cannot disagree about what "price" means.
    function _sharePriceRay() internal view returns (uint256) {
        IHub.Asset memory a = hub.getAsset(assetId);
        uint256 total = a.liquidity + (a.drawnShares * a.drawnIndex) / 1e27;
        return
            ((total + SharesMath.VIRTUAL_ASSETS) * 1e27) /
            (a.addedShares + SharesMath.VIRTUAL_SHARES);
    }

    function _snapshot() internal {
        uint256 price = _sharePriceRay();
        if (price < lastSharePriceRay) sharePriceDecreased = true;
        lastSharePriceRay = price;

        uint256 index = hub.getAsset(assetId).drawnIndex;
        if (index < lastDrawnIndex) drawnIndexDecreased = true;
        lastDrawnIndex = index;
    }
}
