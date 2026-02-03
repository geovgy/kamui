// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IVaultPool {
    function initialize(address asset_, bytes calldata data_) external;
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function redeem(uint256 amount) external;
}