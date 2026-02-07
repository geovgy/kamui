// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Kamui} from "../src/Kamui.sol";
import {Poseidon2Yul_BN254 as Poseidon2} from "poseidon2-evm/bn254/yul/Poseidon2Yul.sol";
import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {IVerifier} from "../src/interfaces/IVerifier.sol";
import {MockVerifier} from "../test/mock/MockVerifier.sol"; // TODO: use real verifiers
import {HonkVerifier as UTXO2x2Verifier} from "../src/verifiers/UTXO2x2Verifier.sol";
import {HonkVerifier as RagequitVerifier} from "../src/verifiers/RagequitVerifier.sol";
import {WETHWormhole} from "../src/wormholes/WETHWormhole.sol";
import {ERC20Wormhole} from "../src/wormholes/ERC20Wormhole.sol";
import {ERC4626Wormhole} from "../src/wormholes/ERC4626Wormhole.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

contract DeployKamuiScript is Script {
    using Strings for *;

    // address GOVERNOR = address(0x1); // TODO: set governor address
    address GOVERNOR = vm.envAddress("GOVERNOR");

    address WORMHOLE_APPROVER = vm.envAddress("APPROVER");

    Kamui kamui;

    IPoseidon2 poseidon2;
    IVerifier ragequitVerifier;

    IVerifier utxo2x2Verifier;

    WETHWormhole wethImplementation;
    ERC20Wormhole erc20Implementation;
    ERC4626Wormhole erc4626Implementation;

    struct AddUTXOVerifierParams {
        uint256   inputs;
        uint256   outputs;
        IVerifier verifier;
    }
    
    function run() public {
        vm.startBroadcast();

        assert(GOVERNOR != address(0));

        poseidon2 = IPoseidon2(address(new Poseidon2()));
        ragequitVerifier = new RagequitVerifier();
        kamui = new Kamui(poseidon2, ragequitVerifier, msg.sender);

        console.log("\nDeployment Results:");
        console.log("\nKamui -->", address(kamui));
        console.log("|-- Poseidon2 -->", address(poseidon2));
        console.log("|-- Ragequit verifier -->", address(ragequitVerifier));
        console.log("|-- Governor -->", GOVERNOR);

        // add utxo verifiers
        AddUTXOVerifierParams[] memory params = new AddUTXOVerifierParams[](1);
        params[0] = AddUTXOVerifierParams({
            inputs: 2,
            outputs: 2,
            verifier: new UTXO2x2Verifier()
        });

        console.log("\nAdding UTXO verifiers:");
        for (uint256 i; i < params.length; i++) {
            kamui.addVerifier(params[i].verifier, params[i].inputs, params[i].outputs);

            string memory utxoType = string(bytes.concat(bytes(params[i].inputs.toString()), "x", bytes(params[i].outputs.toString()), " -->"));
            console.log("|--", utxoType, address(params[i].verifier));
        }

        // create and set wormhole pool implementation
        wethImplementation = new WETHWormhole(kamui);
        erc20Implementation = new ERC20Wormhole(kamui, "Kamui Wrapped ", "kw");
        erc4626Implementation = new ERC4626Wormhole(kamui);

        console.log("\nSetting wormhole asset implementations:");
        kamui.setWormholeAssetImplementation(address(wethImplementation), true);
        console.log("|-- WETHWormhole -->", address(wethImplementation));
        kamui.setWormholeAssetImplementation(address(erc20Implementation), true);
        console.log("|-- ERC20Wormhole -->", address(erc20Implementation));
        kamui.setWormholeAssetImplementation(address(erc4626Implementation), true);
        console.log("|-- ERC4626Wormhole -->", address(erc4626Implementation));

        // Launch WETH Wormhole Asset
        console.log("\nCreating Wormhole Assets:");
        address asset = kamui.createWormholeAsset(address(wethImplementation), bytes(""));
        console.log("|-- WETH Wormhole Asset -->", asset);

        if (WORMHOLE_APPROVER != address(0)) {
            console.log("\nSetting wormhole approver");
            kamui.setWormholeApprover(WORMHOLE_APPROVER, true);
            console.log("|-- Approver -->", WORMHOLE_APPROVER);
        }

        // Transfer ownership to governor
        if (GOVERNOR != msg.sender) {
            kamui.transferOwnership(GOVERNOR);
        }

        vm.stopBroadcast();
    }
}
