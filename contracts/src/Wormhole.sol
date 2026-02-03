// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IKamui} from "./interfaces/IKamui.sol";

abstract contract Wormhole {
    function _isWormholeEligible(address to, uint256 amount) internal pure returns (bool) {
        return to != address(0) && amount > 0;
    }

    function _requestWormholeTransfer(IKamui kamui, address from, address to, uint256 id, uint256 amount) internal returns (bool submitted, uint256 pendingIndex) {
        if (!_isWormholeEligible(to, amount)) {
            return (false, 0);
        }
        pendingIndex = kamui.requestWormholeTransfer(from, to, id, amount);
        return (true, pendingIndex);
    }
}