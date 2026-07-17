// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISavingCoreLike {
    function openDeposit(uint256 planId, uint256 amount) external returns (uint256);
}

/// @notice On receiving a certificate NFT (during _safeMint), tries to re-enter openDeposit.
///         The nonReentrant guard must make the reentrant call revert.
contract MaliciousReceiver is IERC721Receiver {
    ISavingCoreLike public immutable core;
    IERC20 public immutable token;
    bool public attack;
    uint256 public planId;
    uint256 public amount;

    constructor(address _core, address _token) {
        core = ISavingCoreLike(_core);
        token = IERC20(_token);
    }

    /// @notice Approve the core to pull this contract's tokens.
    function approveCore(uint256 value) external {
        token.approve(address(core), value);
    }

    function setAttack(bool a, uint256 _planId, uint256 _amount) external {
        attack = a;
        planId = _planId;
        amount = _amount;
    }

    function open(uint256 _planId, uint256 _amount) external returns (uint256 id) {
        id = core.openDeposit(_planId, _amount);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        override
        returns (bytes4)
    {
        if (attack) {
            attack = false; // only try once to avoid infinite recursion in the revert path
            core.openDeposit(planId, amount); // reentrant call — must revert under nonReentrant
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
