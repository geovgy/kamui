// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {Kamui} from "../src/Kamui.sol";
import {Poseidon2Yul_BN254 as Poseidon2} from "poseidon2-evm/bn254/yul/Poseidon2Yul.sol";
import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {IVerifier} from "../src/interfaces/IVerifier.sol";
import {MockVerifier} from "../test/mock/MockVerifier.sol"; // TODO: use real verifiers
import {ERC4626Wormhole} from "../src/ERC4626Wormhole.sol";

contract DeployKamuiScript is Script {
    IPoseidon2 poseidon2;
    IVerifier ragequitVerifier;

    Kamui kamui;
    ERC4626Wormhole wormholeVaultImplementation;
    
    address GOVERNOR = address(0x1); // TODO: set governor address

    struct AddUTXOVerifierParams {
        uint256   inputs;
        uint256   outputs;
        IVerifier verifier;
    }
    
    function run() public {
        vm.startBroadcast();

        poseidon2 = IPoseidon2(address(new Poseidon2()));
        ragequitVerifier = new MockVerifier();
        kamui = new Kamui(poseidon2, ragequitVerifier, msg.sender);

        // add utxo verifiers
        AddUTXOVerifierParams[] memory params = new AddUTXOVerifierParams[](2);
        params[0] = AddUTXOVerifierParams({
            inputs: 2,
            outputs: 2,
            verifier: ragequitVerifier
        });
        params[1] = AddUTXOVerifierParams({
            inputs: 2,
            outputs: 3,
            verifier: new MockVerifier()
        });
        for (uint256 i; i < params.length; i++) {
            kamui.addVerifier(params[i].verifier, params[i].inputs, params[i].outputs);
        }

        // create and set wormhole pool implementation
        wormholeVaultImplementation = new ERC4626Wormhole(kamui);
        kamui.setWormholeAssetImplementation(address(wormholeVaultImplementation), true);

        // Transfer ownership to governor
        kamui.transferOwnership(GOVERNOR);

        vm.stopBroadcast();
    }
}
