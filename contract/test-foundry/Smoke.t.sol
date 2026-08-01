// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "contracts/MockUSDC.sol";

/// @title Stage 0 smoke test
/// @notice Proves the Foundry toolchain is wired to the same `contracts/` tree Hardhat builds:
///         forge-std resolves, the OpenZeppelin remapping into node_modules resolves,
///         cheatcodes work, and the fuzzer runs. It asserts nothing about protocol design —
///         the real suites arrive with the Hub in Stage 1.
/// @dev Avoid writing the OpenZeppelin remapping prefix literally in NatSpec: solc reads a
///      leading at-sign as a documentation tag and fails the build.
contract SmokeTest is Test {
    MockUSDC internal usdc;

    address internal alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
    }

    /// @dev Reaches through MockUSDC into OpenZeppelin's ERC20, so a broken remapping fails
    ///      here rather than deep inside Stage 1.
    function test_mintCreditsBalanceAndKeepsSixDecimals() public {
        assertEq(usdc.decimals(), 6, "USDC must stay 6-decimal");

        usdc.mint(alice, 1_000e6);

        assertEq(usdc.balanceOf(alice), 1_000e6);
        assertEq(usdc.totalSupply(), 1_000e6);
    }

    /// @dev Confirms the fuzzer is actually running with the configured seed and run count.
    function test_mint_fuzz_anyAmountIsConserved(uint128 amount) public {
        usdc.mint(alice, amount);

        assertEq(usdc.balanceOf(alice), amount);
        assertEq(usdc.totalSupply(), amount);
    }
}
