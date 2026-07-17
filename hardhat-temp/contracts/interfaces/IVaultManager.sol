// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVaultManager {
    /// @notice Pay up to `amount` of interest to `to`. Returns the amount actually paid.
    /// @dev Never reverts on insufficient funds; pays min(amount, balance). Enables "principal always safe".
    function payInterest(address to, uint256 amount) external returns (uint256 paid);

    function feeReceiver() external view returns (address);

    function vaultBalance() external view returns (uint256);
}
