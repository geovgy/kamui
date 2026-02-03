// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {LeanIMT, LeanIMTData} from "./libraries/LeanIMT.sol";
import {IVaultPool} from "./interfaces/IVaultPool.sol";
import {VaultPool} from "./VaultPool.sol";
import {IKamui} from "./interfaces/IKamui.sol";

import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";

contract Kamui is IKamui {
    using LeanIMT for LeanIMTData;

    uint8 public constant MERKLE_TREE_DEPTH = 20;

    IPoseidon2 public immutable poseidon2;

    uint256 public currentShieldedTreeId;
    uint256 public currentWormholeTreeId;
    
    mapping(uint256 treeId => LeanIMTData) public shieldedTrees;
    mapping(uint256 treeId => LeanIMTData) public wormholeTrees;


    struct PoolInfo {
        bytes32 poolId;
        address implementation;
        address asset;
        bytes initData;
    }
    mapping(address pool => PoolInfo) internal _poolInfos;
    mapping(address pool => bool) internal _isPool;
    // Owner can register new pool implementations like different types of ERC4626 vaults or for supporting other token standards
    mapping(address implementation => bool) internal _isPoolImplementation;

    struct TransferMetadata {
        address from;
        address to;
        bytes32 assetId;
        uint256 amount;
    }

    uint256 public currentWormholeTransferIndex;

    uint256 internal _totalTransfers;
    mapping(uint256 index => TransferMetadata) internal _transfers;

    mapping(address approver => bool) internal _isWormholeApprover;

    constructor(IPoseidon2 poseidon2_) {
        poseidon2 = poseidon2_;
        address poseidon2Address = address(poseidon2);
        shieldedTrees[currentShieldedTreeId].init(poseidon2Address);
        wormholeTrees[currentWormholeTreeId].init(poseidon2Address);
    }

    function _getWormholeCommitment(address from, address to, bytes32 assetId, uint256 amount, bool approved) internal view returns (uint256) {
        return poseidon2.hash_5(approved ? 1 : 0, uint256(uint160(from)), uint256(uint160(to)), uint256(assetId), amount);
    }

    function appendWormholeTransfer(WormholeTransfer memory transferData) external {
        require(_isWormholeApprover[msg.sender], "Kamui: caller is not a wormhole approver");
        require(transferData.index == currentWormholeTransferIndex, "Kamui: not current wormhole transfer index");
        TransferMetadata memory transferMetadata = _transfers[transferData.index];
        uint256 commitment = _getWormholeCommitment(transferMetadata.from, transferMetadata.to, transferMetadata.assetId, transferMetadata.amount, transferData.approved);
        if (_isWormholeTreeFull()) {
            _createWormholeTree();
        }
        wormholeTrees[currentWormholeTreeId].insert(commitment);
        unchecked {
            currentWormholeTransferIndex++;
        }
    }

    function appendManyWormholeTransfers(WormholeTransfer[] memory transferDatas) external {
        require(_isWormholeApprover[msg.sender], "Kamui: caller is not a wormhole approver");
        require(transferDatas.length > 0 && transferDatas.length <= (2 ** MERKLE_TREE_DEPTH) / 5, "Kamui: invalid transfer datas length");
        uint256[] memory commitments = new uint256[](transferDatas.length);
        for (uint256 i = 0; i < transferDatas.length; i++) {
            uint256 index = currentWormholeTransferIndex + i;
            require(transferDatas[i].index == index, "Kamui: not current wormhole transfer index");
            TransferMetadata memory data = _transfers[index];
            commitments[i] = _getWormholeCommitment(data.from, data.to, data.assetId, data.amount, transferDatas[i].approved);
        }
        if (_isWormholeTreeOverflow(transferDatas.length)) {
            _createWormholeTree();
        }
        wormholeTrees[currentWormholeTreeId].insertMany(commitments);
        unchecked {
            currentWormholeTransferIndex += transferDatas.length;
        }
    }

    function _createWormholeTree() internal {
        currentWormholeTreeId++;
        wormholeTrees[currentWormholeTreeId].init(address(poseidon2));
    }

    function _isWormholeTreeFull() internal view returns (bool) {
        return wormholeTrees[currentWormholeTreeId].size == 2 ** MERKLE_TREE_DEPTH;
    }

    function _isWormholeTreeOverflow(uint256 batchSize) internal view returns (bool) {
        return wormholeTrees[currentWormholeTreeId].size + batchSize > 2 ** MERKLE_TREE_DEPTH;
    }

    // TODO: function shieldedTransfer

    function _getPoolId(address implementation, address asset, bytes calldata initData) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(implementation, asset, initData));
    }

    function _getAssetId(address asset, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(asset, id));
    }

    function createPool(address implementation, address asset, bytes calldata initData) external {
        require(_isPoolImplementation[implementation], "Kamui: implementation is not registered");
        require(asset != address(0), "Kamui: asset is zero address");

        bytes32 poolId = _getPoolId(implementation, asset, initData);
        address target = Clones.predictDeterministicAddress(implementation, poolId);

        require(target != address(0), "Kamui: target is zero address");
        require(!_isPool[target], "Kamui: pool already exists");
        // Deploy clone of implementation
        address pool = Clones.cloneDeterministic(implementation, poolId);
        require(pool == target, "Kamui: deployed pool is not target address");
        // Initialize the clone
        VaultPool(pool).initialize(asset, initData);
        // Set the pool info to mapping
        _poolInfos[pool] = PoolInfo({
            poolId: poolId,
            implementation: implementation,
            asset: asset,
            initData: initData
        });
        _isPool[pool] = true;
        // TODO: emit event
    }

    function requestWormholeTransfer(address from, address to, uint256 id, uint256 amount) external returns (uint256 index) {
        _requireCallerIsPool();
        // TODO: implement
        address token = msg.sender; // Every pool is a token (ERC20/ERC721/ERC1155/etc.)
        index = _totalTransfers;
        TransferMetadata memory transferData = TransferMetadata({
            from: from,
            to: to,
            assetId: _getAssetId(token, id),
            amount: amount
        });
        _transfers[index] = transferData;
        unchecked {
            _totalTransfers++;
        }
    }

    // require functions

    function _requireCallerIsPool() internal view {
        require(_isPool[msg.sender], "Kamui: caller is not a pool");
    }
}