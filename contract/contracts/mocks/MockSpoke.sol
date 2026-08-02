// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IHub} from "../interfaces/IHub.sol";

/// @title MockSpoke
/// @notice The thinnest possible Spoke: forwards the four primitives to the Hub and holds the
///         tokens the Hub pulls from it. Exists so the Hub can be exercised and invariant-
///         tested before any real product Spoke is written.
/// @dev Testing only. A real Spoke owns user accounting, risk, and authorisation; this one
///      deliberately owns none of that.
contract MockSpoke {
    IHub public immutable hub;
    IERC20 public immutable token;

    constructor(IHub _hub, IERC20 _token) {
        hub = _hub;
        token = _token;
        // The Hub pulls on `add` and `restore`.
        _token.approve(address(_hub), type(uint256).max);
    }

    function add(uint256 assetId, uint256 amount) external returns (uint256) {
        return hub.add(assetId, amount);
    }

    function remove(uint256 assetId, uint256 amount, address to) external returns (uint256) {
        return hub.remove(assetId, amount, to);
    }

    function draw(uint256 assetId, uint256 amount, address to) external returns (uint256) {
        return hub.draw(assetId, amount, to);
    }

    function restore(uint256 assetId, uint256 amount) external returns (uint256) {
        return hub.restore(assetId, amount);
    }
}
