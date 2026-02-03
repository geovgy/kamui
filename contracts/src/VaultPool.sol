// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import {IKamui} from "./interfaces/IKamui.sol";
import {Wormhole} from "./Wormhole.sol";

contract VaultPool is IERC4626, ERC20, Wormhole {
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC4626;

    bool public initialized;

    IKamui public immutable kamui;
    
    IERC20 internal _asset;
    IERC4626 public vault;

    uint256 public poolId;

    uint256 private _totalShares; // also used as actual supply
    uint256 private _totalAssets;

    modifier onlyKamui() {
        require(msg.sender == address(kamui), "VaultPool: caller is not kamui");
        _;
    }
    
    constructor(address kamui_) ERC20("", "") {
        kamui = IKamui(kamui_);
    }

    function initialize(address asset_, bytes calldata data_) external onlyKamui {
        require(!initialized, "VaultPool: already initialized");
        address vaultAddress = address(bytes20(data_));
        require(vaultAddress != address(0), "VaultPool: vault address is zero address");
        IERC4626 _vault = IERC4626(vaultAddress);
        require(_vault.asset() == asset_, "VaultPool: vault asset mismatch");
        vault = _vault;
        _asset = IERC20(asset_);
        initialized = true;
    }

    function unshield(address to, uint256 /* id */, uint256 amount) external onlyKamui {
        // TODO: emit event
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        _requestWormholeTransfer(kamui, from, to, 0, value); // id is always 0 for ERC20 tokens
    }

    function asset() external view returns (address) {
        return address(_asset);
    }

    function totalAssets() external view returns (uint256) {
        return _totalAssets;
    }

    function convertToShares(uint256 assets) external view returns (uint256) {
        return vault.convertToShares(assets);
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        return vault.convertToAssets(shares);
    }

    // Wrap existing shares to the vault pool
    function wrap(uint256 shares, address receiver) external {
        vault.safeTransferFrom(msg.sender, address(this), shares);
        uint256 assets = vault.previewRedeem(shares);
        _totalShares += shares;
        _totalAssets += assets;
        _mint(receiver, shares);
    }

    function maxDeposit(address receiver) external view returns (uint256) {
        return vault.maxDeposit(receiver);
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return vault.previewDeposit(assets);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        _asset.safeTransferFrom(msg.sender, address(this), assets);
        shares = vault.deposit(assets, address(this));
        _totalShares += shares;
        _totalAssets += assets;
        // Mint equivalent of shares to the receiver
        _mint(receiver, shares);
    }

    function maxMint(address receiver) external view returns (uint256) {
        return vault.maxMint(receiver);
    }

    function previewMint(uint256 shares) external view returns (uint256) {
        return vault.previewMint(shares);
    }

    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        _asset.safeTransferFrom(msg.sender, address(this), assets);
        assets = vault.mint(shares, address(this));
        _totalShares += shares;
        _totalAssets += assets;
        _mint(receiver, shares);
    }

    function maxWithdraw(address owner) external view returns (uint256) {
        return vault.maxWithdraw(owner);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        return vault.previewWithdraw(assets);
    }

    // TODO: Add owner parameter?
    // For feature parity with ERC4626
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        // TODO: other checks?
        shares = vault.withdraw(assets, address(this), address(this));
        _totalShares -= shares;
        _totalAssets -= assets;
        _burn(owner, shares);
        _asset.safeTransfer(receiver, assets);
    }

    function maxRedeem(address owner) external view returns (uint256) {
        return vault.maxRedeem(owner);
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return vault.previewRedeem(shares);
    }

    // TODO: Add owner parameter?
    // For feature parity with ERC4626
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        // TODO: other checks?
        assets = vault.redeem(shares, address(this), address(this));
        _totalShares -= shares;
        _totalAssets -= assets;
        _burn(owner, shares);
        _asset.safeTransfer(receiver, assets);
    }
}