// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Kamui} from "../src/Kamui.sol";
import {Poseidon2Yul_BN254 as Poseidon2} from "poseidon2-evm/bn254/yul/Poseidon2Yul.sol";
import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {IVerifier} from "../src/interfaces/IVerifier.sol";
import {MockVerifier} from "../test/mock/MockVerifier.sol"; // TODO: use real verifiers
import {ERC4626Wormhole} from "../src/ERC4626Wormhole.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

contract DeployKamuiScript is Script {
    using Strings for *;

    address GOVERNOR = address(0x1); // TODO: set governor address

    Kamui kamui;

    IPoseidon2 poseidon2;
    IVerifier ragequitVerifier;

    ERC4626Wormhole wormholeVaultImplementation;    

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

        console.log("\nDeployment Results:");
        console.log("\nKamui -->", address(kamui));
        console.log("|-- Poseidon2 -->", address(poseidon2));
        console.log("|-- Ragequit verifier -->", address(ragequitVerifier));
        console.log("|-- Governor -->", GOVERNOR);

        // add utxo verifiers
        AddUTXOVerifierParams[] memory params = new AddUTXOVerifierParams[](2);
        params[0] = AddUTXOVerifierParams({
            inputs: 2,
            outputs: 2,
            verifier: new MockVerifier()
        });
        params[1] = AddUTXOVerifierParams({
            inputs: 2,
            outputs: 3,
            verifier: new MockVerifier()
        });

        console.log("\nAdding UTXO verifiers:");
        for (uint256 i; i < params.length; i++) {
            kamui.addVerifier(params[i].verifier, params[i].inputs, params[i].outputs);

            string memory utxoType = string(bytes.concat(bytes(params[i].inputs.toString()), "x", bytes(params[i].outputs.toString()), " -->"));
            console.log("|--", utxoType, address(params[i].verifier));
        }

        // create and set wormhole pool implementation
        wormholeVaultImplementation = new ERC4626Wormhole(kamui);

        console.log("\nSetting wormhole asset implementations:");
        kamui.setWormholeAssetImplementation(address(wormholeVaultImplementation), true);
        console.log("|-- ERC4626Wormhole -->", address(wormholeVaultImplementation));

        // Transfer ownership to governor
        kamui.transferOwnership(GOVERNOR);

        vm.stopBroadcast();
    }
}
