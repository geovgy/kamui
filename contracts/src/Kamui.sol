// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {LeanIMT, LeanIMTData} from "./libraries/LeanIMT.sol";
import {IWormhole} from "./interfaces/IWormhole.sol";
import {IKamui} from "./interfaces/IKamui.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {SNARK_SCALAR_FIELD} from "./utils/Constants.sol";
import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract Kamui is IKamui, EIP712, Ownable {
    using LeanIMT for LeanIMTData;

    uint8 public constant MERKLE_TREE_DEPTH = 20;

    bytes32 public constant WITHDRAWAL_TYPEHASH = keccak256("Withdrawal(address to,address asset,uint256 id,uint256 amount)");
    bytes32 public constant SHIELDED_TX_TYPEHASH = keccak256("ShieldedTx(uint64 chainId,bytes32 wormholeRoot,bytes32 wormholeNullifier,bytes32 shieldedRoot,bytes32[] nullifiers,bytes32[] commitments,Withdrawal[] withdrawals)Withdrawal(address to,address asset,uint256 id,uint256 amount)");

    IPoseidon2 public immutable poseidon2;

    uint256 public currentShieldedTreeId;
    uint256 public currentWormholeTreeId;
    
    mapping(uint256 treeId => LeanIMTData) internal _shieldedTrees;
    mapping(uint256 treeId => LeanIMTData) internal _wormholeTrees;

    mapping(bytes32 root => bool) public isWormholeRoot;
    mapping(bytes32 root => bool) public isShieldedRoot;

    mapping(bytes32 nullifier => bool) public nullifierUsed;
    mapping(bytes32 nullifier => bool) public wormholeNullifierUsed;

    IVerifier public immutable ragequitVerifier;
    mapping(uint256 inputs => mapping(uint256 outputs => IVerifier)) internal _utxoVerifiers;

    enum TransferType {
        NONE,
        TRANSFER,
        WITHDRAWAL
    }

    struct Withdrawal {
        address to;
        address asset;
        uint256 id;
        uint256 amount;
    }

    struct ShieldedTx {
        uint64 chainId;
        bytes32 wormholeRoot;
        bytes32 wormholeNullifier;
        bytes32 shieldedRoot;
        bytes32[] nullifiers;
        uint256[] commitments;
        Withdrawal[] withdrawals;
    }

    struct RagequitTx {
        uint256 entryId;
        bool    approved;
        bytes32 wormholeRoot;
        bytes32 wormholeNullifier;
    }

    struct PoolInfo {
        bytes32 poolId;
        address implementation;
        address asset;
        bytes initData;
    }

    // Registered wormhole pool addresses
    mapping(address pool => bool) internal _pools;

    // Owner can register new wormhole pool implementations like different types of ERC4626 vaults or for supporting other token standards
    mapping(address implementation => bool) internal _allowedImplementations;

    struct TransferMetadata {
        address from;
        address to;
        address asset;
        uint256 id;
        uint256 amount;
    }

    uint256 public totalWormholeCommitments;

    uint256 public totalWormholeEntries;
    mapping(uint256 entryId => TransferMetadata) internal _wormholeEntries;
    mapping(uint256 entryId => bool) internal _wormholeEntriesCommitted;

    mapping(address approver => bool) internal _isWormholeApprover;

    event WormholeEntry(uint256 indexed entryId, address indexed token, address indexed from, address to, uint256 id, uint256 amount);
    event WormholeCommitment(uint256 indexed entryId, uint256 indexed commitment, uint256 treeId, uint256 leafIndex, bytes32 assetId, address from, address to, uint256 amount, bool approved);
    event WormholeNullifier(bytes32 indexed nullifier);

    event ShieldCommitment(uint256 treeId, uint256 leafIndex, uint256 indexed commitment);
    event ShieldNullifier(bytes32 indexed nullifier);

    event Ragequit(uint256 indexed entryId, address indexed quitter, address indexed returnedTo, address asset, uint256 id, uint256 amount);

    event PoolCreated(address pool, address implementation, address asset, bytes initData);

    event VerifierAdded(address verifier, uint256 inputs, uint256 outputs);
    event PoolImplementationSet(address implementation, bool isApproved);
    event WormholeApproverSet(address approver, bool isApprover);

    constructor(IPoseidon2 poseidon2_, IVerifier ragequitVerifier_, address governor_) EIP712("Kamui", "1") Ownable(governor_) {
        poseidon2 = poseidon2_;
        address poseidon2Address = address(poseidon2);
        _shieldedTrees[currentShieldedTreeId].init(poseidon2Address);
        _wormholeTrees[currentWormholeTreeId].init(poseidon2Address);
        ragequitVerifier = ragequitVerifier_;
    }

    function wormholeTree(uint256 treeId) external view returns (bytes32 root, uint256 size, uint256 depth) {
        return (bytes32(_wormholeTrees[treeId].root()), _wormholeTrees[treeId].size, _wormholeTrees[treeId].depth);
    }

    function shieldedTree(uint256 treeId) external view returns (bytes32 root, uint256 size, uint256 depth) {
        return (bytes32(_shieldedTrees[treeId].root()), _shieldedTrees[treeId].size, _shieldedTrees[treeId].depth);
    }

    function isPool(address pool) external view returns (bool) {
        return _pools[pool];
    }

    function wormholeEntry(uint256 entryId) external view returns (TransferMetadata memory) {
        return _wormholeEntries[entryId];
    }

    // Owner functions
    function addVerifier(IVerifier verifier, uint256 inputs, uint256 outputs) external onlyOwner {
        require(address(verifier) != address(0), "Kamui: verifier is zero address");
        address existing = address(_utxoVerifiers[inputs][outputs]);
        require(existing == address(0), "Kamui: verifier already exists");
        require(inputs > 0 && outputs > 0, "Kamui: invalid inputs or outputs");
        _utxoVerifiers[inputs][outputs] = verifier;
        emit VerifierAdded(address(verifier), inputs, outputs);
    }

    function setPoolImplementation(address implementation, bool isApproved) external onlyOwner {
        _allowedImplementations[implementation] = isApproved;
        emit PoolImplementationSet(implementation, isApproved);
    }

    function setWormholeApprover(address approver, bool isApprover) external onlyOwner {
        _isWormholeApprover[approver] = isApprover;
        emit WormholeApproverSet(approver, isApprover);
    }

    function _getWormholeCommitment(address from, address to, bytes32 assetId, uint256 amount, bool approved) internal view returns (uint256) {
        return poseidon2.hash_5(approved ? 1 : 0, uint256(uint160(from)), uint256(uint160(to)), uint256(assetId), amount);
    }

    function appendWormholeLeaf(uint256 entryId, bool approved) external {
        require(_isWormholeApprover[msg.sender], "Kamui: caller is not a wormhole approver");
        _appendWormholeLeaf(entryId, approved, false);
    }

    // Appends leaf as rejected entry to wormhole tree
    // Original sender can auto-reject their own entry to expedite ragequitting
    function initiateRagequit(uint256 entryId) external {
        _appendWormholeLeaf(entryId, false, true);
    }

    function _appendWormholeLeaf(uint256 entryId, bool approved, bool isRagequit) internal {
        require(entryId < totalWormholeEntries, "Kamui: entry id does not exist");
        require(!_wormholeEntriesCommitted[entryId], "Kamui: entry is already committed in wormhole tree");
        TransferMetadata memory entry = _wormholeEntries[entryId];
        if (isRagequit) {
            require(entry.from == msg.sender, "Kamui: caller is not the original sender");
            require(!approved, "Kamui: entry cannot be appended as approved");
        }
        bytes32 assetId = _getAssetId(entry.asset, entry.id);
        uint256 commitment = _getWormholeCommitment(entry.from, entry.to, assetId, entry.amount, approved);
        if (_isWormholeTreeFull()) {
            _createWormholeTree();
        }
        uint256 root = _wormholeTrees[currentWormholeTreeId].insert(commitment);
        isWormholeRoot[bytes32(root)] = true;
        _wormholeEntriesCommitted[entryId] = true;
        unchecked {
            totalWormholeCommitments++;
        }
        emit WormholeCommitment(entryId, commitment, currentWormholeTreeId, _wormholeTrees[currentWormholeTreeId].size - 1, assetId, entry.from, entry.to, entry.amount, approved);
    }

    function appendManyWormholeLeaves(WormholePreCommitment[] memory nodes) external {
        require(_isWormholeApprover[msg.sender], "Kamui: caller is not a wormhole approver");
        require(nodes.length > 0 && nodes.length <= (2 ** MERKLE_TREE_DEPTH) / 5, "Kamui: invalid nodes length");
        for (uint256 i = 0; i < nodes.length; i++) {
            require(!_wormholeEntriesCommitted[nodes[i].entryId], "Kamui: entry is already committed in wormhole tree");
            require(nodes[i].entryId < totalWormholeEntries, "Kamui: entry id does not exist");
        }
        if (_isWormholeTreeOverflow(nodes.length)) {
            _createWormholeTree();
        }
        uint256[] memory commitments = new uint256[](nodes.length);
        uint256 startLeafIndex = _wormholeTrees[currentWormholeTreeId].size;
        for (uint256 i = 0; i < nodes.length; i++) {
            TransferMetadata memory entry = _wormholeEntries[nodes[i].entryId];
            bytes32 assetId = _getAssetId(entry.asset, entry.id);
            commitments[i] = _getWormholeCommitment(entry.from, entry.to, assetId, entry.amount, nodes[i].approved);
            _wormholeEntriesCommitted[nodes[i].entryId] = true;
            emit WormholeCommitment(
                nodes[i].entryId,
                commitments[i],
                currentWormholeTreeId,
                startLeafIndex + i,
                assetId,
                entry.from,
                entry.to,
                entry.amount,
                nodes[i].approved
            );
        }
        uint256 root = _wormholeTrees[currentWormholeTreeId].insertMany(commitments);
        isWormholeRoot[bytes32(root)] = true;
        unchecked {
            totalWormholeCommitments += nodes.length;
        }
    }

    function _createWormholeTree() internal {
        currentWormholeTreeId++;
        _wormholeTrees[currentWormholeTreeId].init(address(poseidon2));
    }

    function _createShieldedTree() internal {
        currentShieldedTreeId++;
        _shieldedTrees[currentShieldedTreeId].init(address(poseidon2));
    }

    function _isWormholeTreeFull() internal view returns (bool) {
        return _isMerkleTreeFull(_wormholeTrees[currentWormholeTreeId]);
    }

    function _isShieldedTreeFull() internal view returns (bool) {
        return _isMerkleTreeFull(_shieldedTrees[currentShieldedTreeId]);
    }

    function _isMerkleTreeFull(LeanIMTData storage tree) internal view returns (bool) {
        return tree.size == 2 ** MERKLE_TREE_DEPTH;
    }

    function _isWormholeTreeOverflow(uint256 batchSize) internal view returns (bool) {
        return _wormholeTrees[currentWormholeTreeId].size + batchSize > 2 ** MERKLE_TREE_DEPTH;
    }

    function _isShieldedTreeOverflow(uint256 batchSize) internal view returns (bool) {
        return _shieldedTrees[currentShieldedTreeId].size + batchSize > 2 ** MERKLE_TREE_DEPTH;
    }

    function shieldedTransfer(ShieldedTx memory shieldedTx, bytes calldata proof) external {
        // Use modulo to avoid possible bn254 overflow when hashing EIP712 message
        bytes32 messageHash = bytes32(uint256(_hashTypedData(shieldedTx)) % SNARK_SCALAR_FIELD);
        
        // Validate roots
        require(isWormholeRoot[shieldedTx.wormholeRoot], "Kamui: wormhole root is not valid");
        require(isShieldedRoot[shieldedTx.shieldedRoot], "Kamui: shielded root is not valid");

        // Validate nullifiers
        require(!wormholeNullifierUsed[shieldedTx.wormholeNullifier], "Kamui: wormhole nullifier is already used");
        for (uint256 i = 0; i < shieldedTx.nullifiers.length; i++) {
            require(!nullifierUsed[shieldedTx.nullifiers[i]], "Kamui: nullifier is already used");
        }

        // Get verifier
        IVerifier verifier = _utxoVerifiers[shieldedTx.nullifiers.length][shieldedTx.commitments.length];
        require(address(verifier) != address(0), "Kamui: verifier is not registered");

        // Get public inputs
        bytes32[] memory inputs = _formatPublicInputs(shieldedTx, messageHash);

        // Verify proof
        require(verifier.verify(proof, inputs), "Kamui: proof is not valid");

        // Mark nullifiers as used
        wormholeNullifierUsed[shieldedTx.wormholeNullifier] = true;
        emit WormholeNullifier(shieldedTx.wormholeNullifier);
        for (uint256 i; i < shieldedTx.nullifiers.length; i++) {
            nullifierUsed[shieldedTx.nullifiers[i]] = true;
            emit ShieldNullifier(shieldedTx.nullifiers[i]);
        }

        // Insert new commitments into shielded tree
        if (_isShieldedTreeOverflow(shieldedTx.commitments.length)) {
            _createShieldedTree();
        }
        _shieldedTrees[currentShieldedTreeId].insertMany(shieldedTx.commitments);

        // If withdrawals are present, mint new shares for each withdrawal
        for (uint256 i; i < shieldedTx.withdrawals.length; i++) {
            Withdrawal memory withdrawal = shieldedTx.withdrawals[i];
            IWormhole(withdrawal.asset).unshield(withdrawal.to, withdrawal.id, withdrawal.amount);
        }
    }

    function ragequit(RagequitTx calldata ragequitTx, bytes calldata proof) external {
        require(isWormholeRoot[ragequitTx.wormholeRoot], "Kamui: wormhole root is not valid");
        require(!wormholeNullifierUsed[ragequitTx.wormholeNullifier], "Kamui: wormhole nullifier is already used");

        TransferMetadata memory entry = _wormholeEntries[ragequitTx.entryId];

        // get wormhole commitment
        bytes32 assetId = _getAssetId(entry.asset, entry.id);
        uint256 commitment = _getWormholeCommitment(entry.from, entry.to, assetId, entry.amount, ragequitTx.approved);

        bytes32[] memory inputs = new bytes32[](4);
        inputs[0] = ragequitTx.wormholeRoot;
        inputs[1] = bytes32(commitment);
        inputs[2] = ragequitTx.wormholeNullifier;
        inputs[3] = bytes32(bytes20(entry.from));

        // verify proof
        require(ragequitVerifier.verify(proof, inputs), "Kamui: proof is not valid");

        // mark wormhole nullifier as used
        wormholeNullifierUsed[ragequitTx.wormholeNullifier] = true;
        emit WormholeNullifier(ragequitTx.wormholeNullifier);

        // return asset amount back to sender
        IWormhole(entry.asset).unshield(entry.from, entry.id, entry.amount);
        emit Ragequit(ragequitTx.entryId, msg.sender, entry.from, entry.asset, entry.id, entry.amount);
    }

    function _formatPublicInputs(ShieldedTx memory shieldedTx, bytes32 messageHash) internal view returns (bytes32[] memory inputs) {
        uint256 offset = 4 + shieldedTx.nullifiers.length;
        uint256 commitmentLength = shieldedTx.commitments.length + shieldedTx.withdrawals.length;
        inputs = new bytes32[](offset + commitmentLength);
        inputs[0] = messageHash;
        inputs[1] = shieldedTx.shieldedRoot;
        inputs[2] = shieldedTx.wormholeRoot;
        inputs[3] = shieldedTx.wormholeNullifier;
        for (uint256 i; i < shieldedTx.nullifiers.length; i++) {
            inputs[4 + i] = shieldedTx.nullifiers[i];
        }
        for (uint256 i; i < shieldedTx.commitments.length; i++) {
            inputs[offset + i] = bytes32(shieldedTx.commitments[i]);
        }
        for (uint256 i; i < shieldedTx.withdrawals.length; i++) {
            Withdrawal memory withdrawal = shieldedTx.withdrawals[i];
            uint256 commitment = _getCommitment(
                uint256(uint160(withdrawal.to)), 
                _getAssetId(withdrawal.asset, withdrawal.id), 
                withdrawal.amount, 
                TransferType.WITHDRAWAL
            );
            inputs[offset + shieldedTx.commitments.length + i] = bytes32(commitment);
        }
    }

    function _getCommitment(uint256 recipientHash, bytes32 assetId, uint256 amount, TransferType transferType) internal view returns (uint256) {
        return poseidon2.hash_4(recipientHash, uint256(assetId), amount, uint256(transferType));
    }

    function _getPoolId(address implementation, address asset, bytes calldata initData) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(implementation, asset, initData));
    }

    function _getAssetId(address asset, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(asset, id));
    }

    function createPool(address implementation, address asset, bytes calldata initData) external returns (address pool) {
        require(_allowedImplementations[implementation], "Kamui: implementation is not registered");
        require(asset != address(0), "Kamui: asset is zero address");

        bytes32 poolId = _getPoolId(implementation, asset, initData);
        address target = Clones.predictDeterministicAddress(implementation, poolId);

        require(target != address(0), "Kamui: target is zero address");
        require(!_pools[target], "Kamui: pool already exists");
        // Deploy clone of implementation
        pool = Clones.cloneDeterministic(implementation, poolId);
        require(pool == target, "Kamui: deployed pool is not target address");
        // Initialize the clone
        IWormhole(pool).initialize(asset, initData);
        // Set the pool as registered
        _pools[pool] = true;
        emit PoolCreated(pool, implementation, asset, initData);
    }

    function requestWormholeEntry(address from, address to, uint256 id, uint256 amount) external returns (uint256 index) {
        // Only pools deployed from this contract can request wormhole entries
        require(_pools[msg.sender], "Kamui: caller is not a wormhole pool");
        // Every pool is a token (ERC20/ERC721/ERC1155/etc.)
        address token = msg.sender;
        index = totalWormholeEntries;
        TransferMetadata memory metadata = TransferMetadata({
            from: from,
            to: to,
            asset: token,
            id: id,
            amount: amount
        });
        _wormholeEntries[index] = metadata;
        unchecked {
            totalWormholeEntries++;
        }
        emit WormholeEntry(index, token, from, to, id, amount);
    }

    // EIP712 helper functions
    function _hashTypedData(ShieldedTx memory shieldedTx) internal view returns (bytes32) {
        bytes32[] memory withdrawalsHash = new bytes32[](shieldedTx.withdrawals.length);
        for (uint256 i; i < shieldedTx.withdrawals.length; i++) {
            withdrawalsHash[i] = keccak256(
                abi.encode(
                    WITHDRAWAL_TYPEHASH, 
                    shieldedTx.withdrawals[i].to, 
                    shieldedTx.withdrawals[i].asset, 
                    shieldedTx.withdrawals[i].id, 
                    shieldedTx.withdrawals[i].amount
                )
            );
        }
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SHIELDED_TX_TYPEHASH,
                    shieldedTx.chainId,
                    shieldedTx.wormholeRoot,
                    shieldedTx.wormholeNullifier,
                    shieldedTx.shieldedRoot,
                    keccak256(abi.encodePacked(shieldedTx.nullifiers)),
                    keccak256(abi.encodePacked(shieldedTx.commitments)),
                    keccak256(abi.encodePacked(withdrawalsHash))
                )
            )
        );
    }
}