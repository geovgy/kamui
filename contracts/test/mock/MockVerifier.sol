// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IVerifier} from "../../src/interfaces/IVerifier.sol";

contract MockVerifier is IVerifier {
    bool internal _returnValue = true;

    function setReturnValue(bool returnValue) external {
        _returnValue = returnValue;
    }

    function verify(bytes calldata /* _proof */, bytes32[] calldata /* _publicInputs */) external view returns (bool) {
        return _returnValue;
    }
}