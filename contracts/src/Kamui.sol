// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {ERC6909Metadata} from "openzeppelin-contracts/contracts/token/ERC6909/extensions/ERC6909Metadata.sol";
import {LeanIMT, LeanIMTData} from "./libraries/LeanIMT.sol";
import {IVaultPool} from "./interfaces/IVaultPool.sol";
import {VaultPool} from "./VaultPool.sol";

contract Kamui is ERC6909Metadata {
    using LeanIMT for LeanIMTData;

    IPoseidon2 public immutable poseidon2;

    uint256 public currentShieldedTreeId;
    uint256 public currentWormholeTreeId;
    
    mapping(uint256 treeId => LeanIMTData) public shieldedTrees;
    mapping(uint256 treeId => LeanIMTData) public wormholeTrees;

    mapping(address asset => mapping(address vault => IVaultPool vaultPool)) public vaultPools;
    mapping(address vaultPool => bool) internal _isVaultPool;

    // from ERC6909TokenSupply
    mapping(uint256 id => uint256) private _totalSupplies;

    constructor(IPoseidon2 poseidon2_) {
        poseidon2 = poseidon2_;
        address poseidon2Address = address(poseidon2);
        shieldedTrees[currentShieldedTreeId].init(poseidon2Address);
        wormholeTrees[currentWormholeTreeId].init(poseidon2Address);
    }

    // TODO: function shieldedTransfer

    function mint(address to, uint256 id, uint256 amount) external {
        _requireCallerIsVaultPool();
        // TODO: other checks?
        _mint(to, id, amount);
    }

    function burn(address from, uint256 id, uint256 amount) external {
        _requireCallerIsVaultPool();
        // TODO: other checks?
        _burn(from, id, amount);
    }

    function createVaultPool(address asset, address vault) external {
        require(asset != address(0), "Kamui: asset is zero address");
        require(address(vaultPools[asset][vault]) == address(0), "Kamui: vault pool already exists");
        VaultPool vaultPool = new VaultPool(address(this));
        vaultPool.setVault(asset, vault);
        vaultPools[asset][vault] = IVaultPool(address(vaultPool));
    }

    // from ERC6909TokenSupply
    function totalSupply(uint256 id) public view returns (uint256) {
        return _totalSupplies[id];
    }

    // from ERC6909TokenSupply
    /// @dev Override the `_update` function to update the total supply of each token id as necessary.
    function _update(address from, address to, uint256 id, uint256 amount) internal virtual override {
        super._update(from, to, id, amount);

        // TODO: create pending leaf for wormhole tree

        if (from == address(0)) {
            _totalSupplies[id] += amount;
        }
        if (to == address(0)) {
            unchecked {
                // amount <= _balances[from][id] <= _totalSupplies[id]
                _totalSupplies[id] -= amount;
            }
        }
    }

    // require functions

    function _requireCallerIsVaultPool() internal view {
        require(_isVaultPool[msg.sender], "Kamui: caller is not a vault pool");
    }
}