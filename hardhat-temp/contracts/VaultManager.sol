// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IVaultManager.sol";

/// @title VaultManager
/// @notice Holds the bank's interest pool, separate from user principal.
///         Only SavingCore may draw interest. Admin funds/withdraws (withdraw is timelocked).
contract VaultManager is IVaultManager, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public savingCore;
    address public feeReceiver;

    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public pendingWithdrawAmount;
    uint256 public withdrawExecutableAt;

    event Funded(uint256 amount);
    event FeeReceiverUpdated(address receiver);
    event InterestPaid(address to, uint256 amount);
    event SavingCoreSet(address core);
    event VaultWithdrawScheduled(uint256 amount, uint256 executeAfter);
    event VaultWithdrawExecuted(uint256 amount);
    event VaultWithdrawCancelled();

    modifier onlySavingCore() {
        require(msg.sender == savingCore, "only saving core");
        _;
    }

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "usdc zero");
        usdc = IERC20(_usdc);
        feeReceiver = msg.sender;
    }

    /// @notice One-time wiring of the SavingCore address. Cannot be changed once set.
    function setSavingCore(address _core) external onlyOwner {
        require(savingCore == address(0), "core already set");
        require(_core != address(0), "core zero");
        savingCore = _core;
        emit SavingCoreSet(_core);
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "receiver zero");
        feeReceiver = _receiver;
        emit FeeReceiverUpdated(_receiver);
    }

    function fundVault(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(amount);
    }

    /// @inheritdoc IVaultManager
    function payInterest(address to, uint256 amount)
        external
        override
        onlySavingCore
        whenNotPaused
        returns (uint256 paid)
    {
        uint256 bal = usdc.balanceOf(address(this));
        paid = amount > bal ? bal : amount;
        if (paid > 0) {
            usdc.safeTransfer(to, paid);
            emit InterestPaid(to, paid);
        }
    }

    function vaultBalance() external view override returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /// @notice Schedule a vault withdrawal. Must wait TIMELOCK_DELAY before executing.
    function scheduleWithdrawVault(uint256 amount) external onlyOwner {
        require(amount > 0, "amount zero");
        pendingWithdrawAmount = amount;
        withdrawExecutableAt = block.timestamp + TIMELOCK_DELAY;
        emit VaultWithdrawScheduled(amount, withdrawExecutableAt);
    }

    /// @notice Execute a previously scheduled withdrawal after the timelock elapses.
    /// @dev Caps at current balance so it never reverts on rounding/underfund.
    function executeWithdrawVault() external onlyOwner {
        require(withdrawExecutableAt != 0, "nothing scheduled");
        require(block.timestamp >= withdrawExecutableAt, "timelock not elapsed");
        uint256 amount = pendingWithdrawAmount;
        uint256 bal = usdc.balanceOf(address(this));
        if (amount > bal) amount = bal;
        pendingWithdrawAmount = 0;
        withdrawExecutableAt = 0;
        if (amount > 0) usdc.safeTransfer(owner(), amount);
        emit VaultWithdrawExecuted(amount);
    }

    function cancelScheduledWithdrawal() external onlyOwner {
        require(withdrawExecutableAt != 0, "nothing scheduled");
        pendingWithdrawAmount = 0;
        withdrawExecutableAt = 0;
        emit VaultWithdrawCancelled();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
