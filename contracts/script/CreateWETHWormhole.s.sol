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

contract CreateWETHWormholeScript is Script {
    Kamui kamui = Kamui(vm.envAddress("KAMUI"));
    WETHWormhole wethImplementation = WETHWormhole(payable(vm.envAddress("WETHWORMHOLE")));

    function run() public {
        vm.startBroadcast();

        console.log("Using Kamui -->", address(kamui));
        console.log("Using WETHWormhole -->", address(wethImplementation));

        console.log("\nLaunching WETH Wormhole Asset:");
        address asset = kamui.createWormholeAsset(address(wethImplementation), bytes(""));
        console.log("|-- WETH Wormhole Asset -->", asset);

        vm.stopBroadcast();
    }
}
