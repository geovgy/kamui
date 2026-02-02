// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import {IKamui} from "./interfaces/IKamui.sol";

contract VaultPool {
    using SafeERC20 for IERC20;

    IKamui public immutable kamui;
    
    address public asset;
    IERC4626 public vault;

    uint256 public poolId;

    uint256 private _totalShares;
    uint256 private _totalAssets;
    uint256 private _totalSupply;
    
    constructor(address kamui_) {
        kamui = IKamui(kamui_);
    }

    modifier onlyKamui() {
        require(msg.sender == address(kamui), "VaultPool: caller is not kamui");
        _;
    }

    function _getPoolId(address asset_, address vault_) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(asset_, vault_)));
    }

    function setVault(address asset_, address vault_) external onlyKamui {
        require(asset_ != address(0), "VaultPool: asset is zero address");
        IERC4626 _vault = IERC4626(vault_);
        if (vault_ != address(0)) {
            require(_vault.asset() == asset_, "VaultPool: vault asset mismatch");
            // TODO: check if vault supports interface IERC4626
        }
        asset = asset_;
        vault = _vault;
        poolId = _getPoolId(asset_, vault_);
    }

    function deposit(uint256 amount, address receiver) external onlyKamui {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        uint256 shares = vault.deposit(amount, address(this));
        // Call Kamui to mint equivalent of shares to the caller
        _totalShares += shares;
        _totalAssets += amount;
        _totalSupply += shares;
        kamui.mint(receiver, poolId, shares);
    }

    // TODO: Add owner parameter?
    // For feature parity with ERC4626
    function withdraw(uint256 amount, address receiver) external onlyKamui {
        // TODO: other checks?
        uint256 shares = vault.withdraw(amount, address(this), address(this));
        _totalShares -= shares;
        _totalAssets -= amount;
        _totalSupply -= shares;
        kamui.burn(msg.sender, poolId, shares);
        IERC20(asset).safeTransfer(receiver, amount);
    }

    // TODO: Add owner parameter?
    // For feature parity with ERC4626
    function redeem(uint256 shares, address receiver) external onlyKamui {
        // TODO: other checks?
        uint256 assets = vault.redeem(shares, address(this), address(this));
        _totalShares -= shares;
        _totalAssets -= assets;
        _totalSupply -= shares;
        kamui.burn(msg.sender, poolId, shares);
        IERC20(asset).safeTransfer(receiver, assets);
    }
}