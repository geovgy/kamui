// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IKamui {
    struct WormholePreCommitment {
        uint256 entryId;
        bool    approved;
    }

    function createPool(address implementation, address asset, bytes calldata initData) external;
    function requestWormholeEntry(address from, address to, uint256 id, uint256 amount) external returns (uint256 index);
    function appendWormholeLeaf(uint256 entryId, bool approved) external;
    function initiateRagequit(uint256 entryId) external;
    function appendManyWormholeLeaves(WormholePreCommitment[] memory nodes) external;
}