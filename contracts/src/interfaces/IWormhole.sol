// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IKamui} from "./IKamui.sol";

interface IWormhole {
    event Initialize(address asset, bytes data);
    event Unshield(address to, uint256 id, uint256 amount);

    function initialized() external view returns (bool);
    function kamui() external view returns (IKamui);
    function initialize(address asset_, bytes calldata data_) external;
    function unshield(address to, uint256 id, uint256 amount) external;
}