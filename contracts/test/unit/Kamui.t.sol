// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockERC4626} from "../mock/MockERC4626.sol";
import {IKamui} from "../../src/interfaces/IKamui.sol";
import {Kamui} from "../../src/Kamui.sol";
import {IPoseidon2} from "poseidon2-evm/IPoseidon2.sol";
import {Poseidon2Yul_BN254 as Poseidon2} from "poseidon2-evm/bn254/yul/Poseidon2Yul.sol";
import {MockVerifier} from "../mock/MockVerifier.sol";
import {IVerifier} from "../../src/interfaces/IVerifier.sol";
import {ERC4626Wormhole} from "../../src/ERC4626Wormhole.sol";
import {IWormhole} from "../../src/interfaces/IWormhole.sol";

contract KamuiTest is Test {
    MockERC20 underlying;
    MockERC4626 vault;
    
    address owner = makeAddr("owner");
    address screener = makeAddr("wormhole approver");
    Kamui kamui;
    ERC4626Wormhole implementation;
    ERC4626Wormhole wormholeVault;

    IPoseidon2 poseidon2;
    MockVerifier verifier;

    function _dealWormholeTokens(address to, uint256 shares) internal {
        uint256 amount = vault.convertToAssets(shares);
        underlying.mint(to, amount);
        vm.startPrank(to);
        underlying.approve(address(wormholeVault), amount);
        wormholeVault.deposit(amount, to);
        vm.stopPrank();
    }

    function _getWormholeCommitment(address from, address to, bytes32 assetId, uint256 amount, bool approved) internal view returns (uint256) {
        return poseidon2.hash_5(approved ? 1 : 0, uint256(uint160(from)), uint256(uint160(to)), uint256(assetId), amount);
    }

    function _getAssetId(address asset, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(asset, id));
    }

    function setUp() public {
        // deploy contracts
        poseidon2 = IPoseidon2(address(new Poseidon2()));
        verifier = new MockVerifier();
        kamui = new Kamui(poseidon2, verifier, owner);
        implementation = new ERC4626Wormhole(kamui);

        underlying = new MockERC20();
        vault = new MockERC4626(underlying);

        // add utxo verifier
        vm.prank(owner);
        kamui.addVerifier(verifier, 2, 2);

        // add pool implementation
        vm.prank(owner);
        kamui.setPoolImplementation(address(implementation), true);

        // add approver
        vm.prank(owner);
        kamui.setWormholeApprover(screener, true);

        // create pool
        address pool = kamui.createPool(address(implementation), address(underlying), abi.encodePacked(address(vault)));
        wormholeVault = ERC4626Wormhole(pool);

        assertTrue(kamui.isPool(pool), "Pool should be registered");
        assertTrue(wormholeVault.initialized(), "Wormhole vault should be initialized");
        assertEq(wormholeVault.asset(), address(underlying), "Wormhole vault should have the correct asset");
        assertEq(address(wormholeVault.vault()), address(vault), "Wormhole vault should have the correct vault");
    }

    function test_requestWormholeEntry_fromTransfers() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");

        _dealWormholeTokens(from, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 1, "Should increment total wormhole entries by 1 after deposit");

        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 1 after transfer");

        vm.prank(to);
        wormholeVault.redeem(100e18, to, to);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should not change total wormhole entries after burn");

        Kamui.TransferMetadata memory entry = kamui.wormholeEntry(1);
        assertEq(entry.from, from, "Entry from address should equal sender");
        assertEq(entry.to, to, "Entry to address should equal transfer to");
        assertEq(entry.asset, address(wormholeVault), "Entry asset should equal wormhole vault address");
        assertEq(entry.id, 0, "Entry should have id 0 for ERC20 tokens");
        assertEq(entry.amount, 100e18, "Entry should equal transfer amount");
    }

    function test_appendWormholeLeaf() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");
        
        _dealWormholeTokens(from, 100e18);

        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 2 after transfer");

        bytes32 assetId = _getAssetId(address(wormholeVault), 0);
        uint256 expectedCommitment = _getWormholeCommitment(from, to, assetId, 100e18, true);

        vm.expectEmit(address(kamui));
        emit Kamui.WormholeCommitment(1, expectedCommitment, 0, 0, assetId, from, to, 100e18, true);
        vm.prank(screener);
        kamui.appendWormholeLeaf(1, true);

        assertEq(kamui.totalWormholeCommitments(), 1, "Incorrect total wormhole commitments");

        vm.expectRevert("Kamui: entry is already committed in wormhole tree");
        vm.prank(screener);
        kamui.appendWormholeLeaf(1, false);
    }

    function test_appendManyWormholeLeaves() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");
        
        _dealWormholeTokens(from, 100e18);

        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 2 after transfer");

        bytes32 assetId = _getAssetId(address(wormholeVault), 0);

        IKamui.WormholePreCommitment[] memory nodes = new IKamui.WormholePreCommitment[](2);
        nodes[0] = IKamui.WormholePreCommitment({entryId: 0, approved: false});
        nodes[1] = IKamui.WormholePreCommitment({entryId: 1, approved: true});

        uint256[2] memory expectedCommitments = [
            _getWormholeCommitment(address(0), from, assetId, 100e18, nodes[0].approved),
            _getWormholeCommitment(from, to, assetId, 100e18, nodes[1].approved)
        ];

        vm.expectEmit(address(kamui));
        emit Kamui.WormholeCommitment(nodes[0].entryId, expectedCommitments[0], 0, 0, assetId, address(0), from, 100e18, nodes[0].approved);
        emit Kamui.WormholeCommitment(nodes[1].entryId, expectedCommitments[1], 0, 1, assetId, from, to, 100e18, nodes[1].approved);
        vm.prank(screener);
        kamui.appendManyWormholeLeaves(nodes);

        assertEq(kamui.totalWormholeCommitments(), 2, "Incorrect total wormhole commitments");
    }

    function test_appendManyWormholeLeaves_revert_invalidLength() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");
        
        _dealWormholeTokens(from, 100e18);

        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 2 after transfer");

        IKamui.WormholePreCommitment[] memory nodes = new IKamui.WormholePreCommitment[](3);
        nodes[0] = IKamui.WormholePreCommitment({entryId: 0, approved: false});
        nodes[1] = IKamui.WormholePreCommitment({entryId: 1, approved: true});
        nodes[2] = IKamui.WormholePreCommitment({entryId: 2, approved: false});

        vm.expectRevert("Kamui: invalid nodes length");
        vm.prank(screener);
        kamui.appendManyWormholeLeaves(new Kamui.WormholePreCommitment[](0));
    }

    function test_initiateRagequit() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");
        
        _dealWormholeTokens(from, 100e18);
        
        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 2 after transfer");

        // Only original sender should initiate ragequit
        vm.expectRevert("Kamui: caller is not the original sender");
        kamui.initiateRagequit(1);

        bytes32 assetId = _getAssetId(address(wormholeVault), 0);
        uint256 expectedCommitment = _getWormholeCommitment(from, to, assetId, 100e18, false);

        // Should succeed
        vm.expectEmit(address(kamui));
        emit Kamui.WormholeCommitment(1, expectedCommitment, 0, 0, assetId, from, to, 100e18, false);
        vm.prank(from);
        kamui.initiateRagequit(1);
        
        // Should revert since entry is already committed
        vm.expectRevert("Kamui: entry is already committed in wormhole tree");
        vm.prank(from);
        kamui.initiateRagequit(1);

        expectedCommitment = _getWormholeCommitment(address(0), from, assetId, 100e18, false);

        // Can still append leafs of older entries skipped
        vm.expectEmit(address(kamui));
        emit Kamui.WormholeCommitment(0, expectedCommitment, 0, 1, assetId, address(0), from, 100e18, false);
        vm.prank(screener);
        kamui.appendWormholeLeaf(0, false);

        assertEq(kamui.totalWormholeCommitments(), 2, "Incorrect total wormhole commitments");
    }

    function test_ragequit() public {
        uint256 entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 0, "Should start with 0 total wormhole entries");

        address from = makeAddr("from");
        address to = makeAddr("to");
        
        _dealWormholeTokens(from, 100e18);

        vm.prank(from);
        wormholeVault.transfer(to, 100e18);

        entryCount = kamui.totalWormholeEntries();
        assertEq(entryCount, 2, "Should increment total wormhole entries by 2 after transfer");

        // append wormhole leaf
        vm.prank(screener);
        kamui.appendWormholeLeaf(1, false);

        // ragequit
        (bytes32 root,,) = kamui.wormholeTree(0);
        Kamui.RagequitTx memory ragequitTx = Kamui.RagequitTx({
            entryId: 1, 
            approved: false, 
            wormholeRoot: root, 
            wormholeNullifier: keccak256(abi.encodePacked("mock nullifier"))
        });
        bytes memory proof = abi.encodePacked("mock zk proof");

        assertEq(kamui.wormholeNullifierUsed(ragequitTx.wormholeNullifier), false, "Nullifier should not be marked as used yet");

        // Should fail if root is not valid
        ragequitTx.wormholeRoot = bytes32(0);
        vm.expectRevert("Kamui: wormhole root is not valid");
        kamui.ragequit(ragequitTx, proof);

        // Set wormhole root back
        ragequitTx.wormholeRoot = root;

        // Should fail if proof is not valid
        verifier.setReturnValue(false);
        vm.expectRevert("Kamui: proof is not valid");
        kamui.ragequit(ragequitTx, proof);

        // Set verifier back to true
        verifier.setReturnValue(true);

        vm.expectEmit(address(kamui));
        emit Kamui.Ragequit(1, address(this), from, address(wormholeVault), 0, 100e18);
        emit Kamui.WormholeNullifier(ragequitTx.wormholeNullifier);
        // Anyone can ragequit the entry as long as the proof is valid
        vm.expectCall(address(wormholeVault), abi.encodeWithSelector(IWormhole.unshield.selector, from, 0, 100e18));
        kamui.ragequit(ragequitTx, proof);

        // Should fail if nullifier is already used
        vm.expectRevert("Kamui: wormhole nullifier is already used");
        kamui.ragequit(ragequitTx, proof);

        assertEq(kamui.wormholeNullifierUsed(ragequitTx.wormholeNullifier), true, "Nullifier should be marked as used");
        assertEq(wormholeVault.balanceOf(from), 100e18, "from address should have the full transfer amount back (via minting new shares) after ragequit");
        assertEq(wormholeVault.balanceOf(to), 100e18, "to address should still have the original transfer amount (as burn address)");
        assertEq(wormholeVault.totalSupply(), 200e18, "Total supply should increase by the transfer amount after ragequit");
        assertEq(wormholeVault.actualSupply(), 100e18, "Actual supply should no change after ragequit");
    }

    function test_createPool() public {
        // create new implementation since we already created one in setUp
        ERC4626Wormhole newImplementation = new ERC4626Wormhole(kamui);
        vm.prank(owner);
        kamui.setPoolImplementation(address(newImplementation), true);

        // create pool
        address pool = kamui.createPool(address(newImplementation), address(underlying), abi.encodePacked(address(vault)));
        ERC4626Wormhole newWormholeVault = ERC4626Wormhole(pool);

        assertTrue(kamui.isPool(pool), "Pool should be registered after creation");
        assertTrue(newWormholeVault.initialized(), "Wormhole vault should be initialized after creation");
        assertEq(newWormholeVault.asset(), address(underlying), "Wormhole vault asset should equal underlying asset");
        assertEq(address(newWormholeVault.vault()), address(vault), "Wormhole vault vault should equal vault");
    }

    function test_createPool_revert_alreadyExists() public {
        vm.expectRevert("Kamui: pool already exists");
        kamui.createPool(address(implementation), address(underlying), abi.encodePacked(address(vault)));
    }
}