import { describe, it, expect } from "bun:test";
import { getMerkleTree } from "../src/merkle";
import { getCommitment, getNullifier, getWormholeBurnCommitment, getWormholeNullifier, getWormholePseudoNullifier } from "../src/joinsplits";
import { Prover } from "../src/prover";
import { privateKeyToAccount } from "viem/accounts";
import { TransferType, type InputNote, type OutputNote, type WormholeNote } from "../src/types";
import { BN254_PRIME } from "../src/constants";
import { hashMessage, hexToBytes, recoverPublicKey, toHex } from "viem";

const MERKLE_TREE_DEPTH = 20

function extractPublicInputs(result: string[], inputLength: number, outputLength: number) {
  return {
    hashedMessage: result[0]!,
    shieldedRoot: result[1]!,
    wormholeRoot: result[2]!,
    wormholeNullifier: result[3]!,
    inputNullifiers: result.slice(4, 4 + inputLength),
    outputCommitments: result.slice(4 + inputLength, 4 + inputLength + outputLength),
  }
}

describe("utxo", () => {
  const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
  const assetId = 1n
  const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

  it("should get 2x2 proof without wormhole", async () => {
    const notes = [
      { owner: account.address, blinding: 123456789n, assetId, amount: BigInt(100e18) },
      { owner: account.address, blinding: 987654321n, assetId, amount: BigInt(100e18) },
    ]
    const commitments = notes.map(note => getCommitment(
      note.assetId, 
      { recipient: note.owner, blinding: note.blinding, amount: note.amount, transfer_type: TransferType.TRANSFER }
    ))
    const utxoTree = getMerkleTree(commitments)

    const inputNotes: InputNote[] = notes.map((note, i) => {
      const proof = utxoTree.generateProof(i)
      return {
        blinding: note.blinding,
        amount: note.amount,
        leaf_index: BigInt(proof.index),
        leaf_siblings: proof.siblings,
      }
    })

    const outputNotes: OutputNote[] = [
      { recipient, blinding: 111111111n, amount: BigInt(150e18), transfer_type: TransferType.TRANSFER },
      { recipient: account.address, blinding: 222222222n, amount: BigInt(50e18), transfer_type: TransferType.TRANSFER },
    ]

    const messageHash = toHex(BigInt(hashMessage("This is a fake EIP712 message hash for testing purposes")) % BN254_PRIME, { size: 32 })
    const signature = await account.sign({ hash: messageHash })
    const publicKey = await recoverPublicKey({hash: messageHash, signature})

    const wormholePseudoSecret = 69n

    const circuitInputs = {
      pub_key_x: [...hexToBytes(publicKey).slice(1, 33)],
      pub_key_y: [...hexToBytes(publicKey).slice(33, 65)],
      signature: [...hexToBytes(signature).slice(0, 64)], // Remove recovery byte (v)
      hashed_message: messageHash,
      shielded_root: utxoTree.root.toString(),
      wormhole_root: "0x0000000000000000000000000000000000000000000000000000000000000000",
      asset_id: assetId.toString(),
      owner_address: account.address,
      input_notes: inputNotes.map(note => ({
        blinding: note.blinding.toString(),
        amount: note.amount.toString(),
        leaf_index: note.leaf_index.toString(),
        leaf_siblings: note.leaf_siblings.map(sibling => sibling.toString()).concat(Array(MERKLE_TREE_DEPTH - note.leaf_siblings.length).fill("0")),
      })),
      output_notes: outputNotes.map(note => ({
        recipient: note.recipient.toString(),
        blinding: note.blinding.toString(),
        amount: note.amount.toString(),
        transfer_type: note.transfer_type,
      })),
      wormhole_note: { 
        _is_some: false, 
        _value: { 
          recipient: "0", 
          wormhole_secret: "0", 
          asset_id: "0", 
          sender: "0", 
          amount: "0" 
        } 
      },
      wormhole_leaf_index: { _is_some: false, _value: "0" },
      wormhole_leaf_siblings: { _is_some: false, _value: Array(MERKLE_TREE_DEPTH).fill("0") },
      wormhole_approved: { _is_some: false, _value: false },
      wormhole_pseudo_secret: { _is_some: true, _value: wormholePseudoSecret.toString() },
    }

    const prover = new Prover("utxo_2x2")
    
    console.time("prove")
    const result = await prover.prove(circuitInputs)
    console.timeEnd("prove")

    console.time("verify")
    const isValid = await prover.verify(result)
    console.timeEnd("verify")
    expect(isValid).toBe(true)
    
    // Confirm proof outputs
    const expectedWormholeNullifier = getWormholePseudoNullifier(account.address, assetId, wormholePseudoSecret)
    const expectedNullifiers = inputNotes.map(note => getNullifier(account.address, assetId, note))
    const expectedCommitments = outputNotes.map(note => getCommitment(assetId, note))

    const actual = extractPublicInputs(result.publicInputs, inputNotes.length, outputNotes.length)
    expect(actual.hashedMessage, "hashed message public input mismatch").toBe(messageHash)
    expect(actual.shieldedRoot, "shielded root public input mismatch").toBe(toHex(utxoTree.root, { size: 32 }))
    expect(actual.wormholeRoot, "wormhole root public input mismatch").toBe(toHex(0n, { size: 32 }))
    expect(actual.wormholeNullifier, "wormhole nullifier public input mismatch").toBe(toHex(expectedWormholeNullifier, { size: 32 }))
    expect(actual.inputNullifiers, "input nullifiers public input mismatch").toEqual(expectedNullifiers.map(nullifier => toHex(nullifier, { size: 32 })))
    expect(actual.outputCommitments, "output commitments public input mismatch").toEqual(expectedCommitments.map(commitment => toHex(commitment, { size: 32 })))
  });
  
  it("should get 2x2 proof with wormhole included", async () => {
    const notes = [
      { owner: account.address, blinding: 123456789n, assetId, amount: BigInt(100e18) },
      // { owner: account.address, blinding: 987654321n, assetId, amount: BigInt(100e18) },
    ]
    const commitments = notes.map(note => getCommitment(
      note.assetId, 
      { recipient: note.owner, blinding: note.blinding, amount: note.amount, transfer_type: TransferType.TRANSFER }
    ))
    const utxoTree = getMerkleTree(commitments)

    const wormholeSecret = 42069n
    const burnCommitment = getWormholeBurnCommitment({
      recipient: account.address,
      wormhole_secret: wormholeSecret,
      asset_id: assetId,
      sender: account.address,
      amount: BigInt(100e18),
      approved: true,
    })

    const wormholeTree = getMerkleTree([burnCommitment])

    const inputNotes: InputNote[] = notes.map((note, i) => {
      const proof = utxoTree.generateProof(i)
      return {
        blinding: note.blinding,
        amount: note.amount,
        leaf_index: BigInt(proof.index),
        leaf_siblings: proof.siblings,
      }
    }).concat([
      {
        blinding: 0n,
        amount: 0n,
        leaf_index: 0n,
        leaf_siblings: Array(MERKLE_TREE_DEPTH).fill(0n),
      },
    ])

    const wormholeProof = wormholeTree.generateProof(0)
    const wormholeNote: WormholeNote = {
      recipient: account.address,
      wormhole_secret: wormholeSecret,
      asset_id: assetId,
      sender: account.address,
      amount: BigInt(100e18),
    }

    const outputNotes: OutputNote[] = [
      { recipient, blinding: 111111111n, amount: BigInt(150e18), transfer_type: TransferType.TRANSFER },
      { recipient: account.address, blinding: 222222222n, amount: BigInt(50e18), transfer_type: TransferType.TRANSFER },
    ]

    const messageHash = toHex(BigInt(hashMessage("This is a fake EIP712 message hash for testing purposes")) % BN254_PRIME, { size: 32 })
    const signature = await account.sign({ hash: messageHash })
    const publicKey = await recoverPublicKey({hash: messageHash, signature})

    const circuitInputs = {
      pub_key_x: [...hexToBytes(publicKey).slice(1, 33)],
      pub_key_y: [...hexToBytes(publicKey).slice(33, 65)],
      signature: [...hexToBytes(signature).slice(0, 64)], // Remove recovery byte (v)
      hashed_message: messageHash,
      shielded_root: utxoTree.root.toString(),
      wormhole_root: wormholeTree.root.toString(),
      asset_id: assetId.toString(),
      owner_address: account.address,
      input_notes: inputNotes.map(note => ({
        blinding: note.blinding.toString(),
        amount: note.amount.toString(),
        leaf_index: note.leaf_index.toString(),
        leaf_siblings: note.leaf_siblings.map(sibling => sibling.toString()).concat(Array(MERKLE_TREE_DEPTH - note.leaf_siblings.length).fill("0")),
      })),
      output_notes: outputNotes.map(note => ({
        recipient: note.recipient.toString(),
        blinding: note.blinding.toString(),
        amount: note.amount.toString(),
        transfer_type: note.transfer_type,
      })),
      wormhole_note: { 
        _is_some: true, 
        _value: { 
          recipient: account.address.toString(), 
          wormhole_secret: wormholeSecret.toString(), 
          asset_id: assetId.toString(), 
          sender: account.address.toString(), 
          amount: BigInt(100e18).toString(), 
        } 
      },
      wormhole_leaf_index: { _is_some: true, _value: wormholeProof.index.toString() },
      wormhole_leaf_siblings: { _is_some: true, _value: wormholeProof.siblings.map(sibling => sibling.toString()).concat(Array(MERKLE_TREE_DEPTH - wormholeProof.siblings.length).fill("0")) },
      wormhole_approved: { _is_some: true, _value: true },
      wormhole_pseudo_secret: { _is_some: false, _value: "0" },
    }

    const prover = new Prover("utxo_2x2")
    
    console.time("prove")
    const result = await prover.prove(circuitInputs)
    console.timeEnd("prove")

    console.time("verify")
    const isValid = await prover.verify(result)
    console.timeEnd("verify")
    expect(isValid).toBe(true)
    
    // Confirm proof outputs
    const expectedWormholeNullifier = getWormholeNullifier(wormholeNote)
    const expectedNullifiers = inputNotes.map(note => getNullifier(account.address, assetId, note))
    const expectedCommitments = outputNotes.map(note => getCommitment(assetId, note))

    const actual = extractPublicInputs(result.publicInputs, inputNotes.length, outputNotes.length)
    expect(actual.hashedMessage, "hashed message public input mismatch").toBe(messageHash)
    expect(actual.shieldedRoot, "shielded root public input mismatch").toBe(toHex(utxoTree.root, { size: 32 }))
    expect(actual.wormholeRoot, "wormhole root public input mismatch").toBe(toHex(wormholeTree.root, { size: 32 }))
    expect(actual.wormholeNullifier, "wormhole nullifier public input mismatch").toBe(toHex(expectedWormholeNullifier, { size: 32 }))
    expect(actual.inputNullifiers, "input nullifiers public input mismatch").toEqual(expectedNullifiers.map(nullifier => toHex(nullifier, { size: 32 })))
    expect(actual.outputCommitments, "output commitments public input mismatch").toEqual(expectedCommitments.map(commitment => toHex(commitment, { size: 32 })))
  });
});