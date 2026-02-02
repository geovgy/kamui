// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC6909Metadata} from "openzeppelin-contracts/contracts/interfaces/IERC6909.sol";

interface IKamui is IERC6909Metadata {
    function mint(address to, uint256 id, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
    function createVaultPool(address asset, address vault) external;
}