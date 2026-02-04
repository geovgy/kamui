// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IKamui} from "./interfaces/IKamui.sol";
import {IWormhole} from "./interfaces/IWormhole.sol";

abstract contract Wormhole is IWormhole {
    bool public initialized;

    IKamui public immutable kamui;
    
    modifier onlyKamui() {
        require(msg.sender == address(kamui), "Wormhole: caller is not kamui");
        _;
    }
    
    constructor(IKamui kamui_) {
        kamui = kamui_;
    }

    // Override this function to initialize the wormhole
    function _initialize(bytes calldata data_) internal virtual returns (bool) {}

    // Override this function to unshield the asset
    function _unshield(address to, uint256 id, uint256 amount) internal virtual {}

    // Override this function to return the actual supply of the asset
    function actualSupply() public virtual view returns (uint256) {}

    function initialize(bytes calldata data_) external onlyKamui {
        require(!initialized, "Wormhole: already initialized");
        bool success = _initialize(data_);
        require(success, "Wormhole: initialization failed");
        initialized = true;
        emit Initialize(data_);
    }

    function unshield(address to, uint256 id, uint256 amount) external onlyKamui {
        _unshield(to, id, amount);
        emit Unshield(to, id, amount);
    }

    function _isWormholeEligible(address to, uint256 amount) internal pure returns (bool) {
        return to != address(0) && amount > 0;
    }

    function _requestWormholeEntry(address from, address to, uint256 id, uint256 amount) internal returns (bool submitted, uint256 pendingIndex) {
        if (!_isWormholeEligible(to, amount)) {
            return (false, 0);
        }
        pendingIndex = kamui.requestWormholeEntry(from, to, id, amount);
        return (true, pendingIndex);
    }
}