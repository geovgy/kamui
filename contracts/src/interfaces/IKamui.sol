// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IKamui {
    struct WormholeTransfer {
        uint256 index;
        bool approved;
    }

    function createPool(address implementation, address asset, bytes calldata initData) external;
    function requestWormholeTransfer(address from, address to, uint256 id, uint256 amount) external returns (uint256 index);
    function appendWormholeTransfer(WormholeTransfer memory transferData) external;
    function appendManyWormholeTransfers(WormholeTransfer[] memory transferDatas) external;
}