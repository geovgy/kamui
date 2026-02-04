// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IKamui} from "./IKamui.sol";

interface IWormhole {
    event Initialize(bytes data);
    event Unshield(address to, uint256 id, uint256 amount);

    function initialized() external view returns (bool);
    function kamui() external view returns (IKamui);
    function actualSupply() external view returns (uint256);
    function initialize(bytes calldata data_) external;
    function unshield(address to, uint256 id, uint256 amount) external;
}