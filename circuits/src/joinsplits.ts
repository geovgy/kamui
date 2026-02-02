import { TransferType, type InputNote, type OutputNote, type WormholeDeposit, type WormholeNote } from "./types";
import { poseidon2Hash } from "@zkpassport/poseidon2";
import { toHex, type Address } from "viem";

export function getRecipientHash(recipient: Address, blinding: bigint): bigint {
  return poseidon2Hash([BigInt(recipient), blinding]);
}

export function getCommitment(assetId: bigint, outputNote: OutputNote): bigint {
  if (outputNote.blinding === 0n || outputNote.transfer_type === TransferType.WITHDRAWAL) {
    return BigInt(outputNote.recipient);
  }
  const recipient = typeof outputNote.recipient === "bigint" ? toHex(outputNote.recipient) : outputNote.recipient;
  return poseidon2Hash([getRecipientHash(recipient, outputNote.blinding), assetId, outputNote.amount, BigInt(outputNote.transfer_type)]);
}

export function getNullifier(ownerAddress: Address, assetId: bigint, inputNote: InputNote): bigint {
  const secretCommitment = poseidon2Hash([BigInt(ownerAddress), assetId, inputNote.amount]);
  return poseidon2Hash([inputNote.leaf_index, inputNote.blinding, secretCommitment]);
}

export function getWormholeBurnAddress(recipient: Address, wormholeSecret: bigint): bigint {
  return poseidon2Hash([BigInt(recipient), wormholeSecret, BigInt("ZKWORMHOLE")]);
}

export function getWormholeBurnCommitment(args: WormholeNote & {
  approved: boolean;
}): bigint {
  const burnAddress = getWormholeBurnAddress(args.recipient, args.wormhole_secret);
  return poseidon2Hash([args.approved ? 1n : 0n, burnAddress, args.asset_id, BigInt(args.sender), args.amount]);
}

export function getWormholeNullifier(args: WormholeNote): bigint {
  const secretCommitment = poseidon2Hash([BigInt(args.recipient), args.asset_id, BigInt(args.sender), args.amount]);
  return poseidon2Hash([1n, args.wormhole_secret, secretCommitment]);
}

export function getWormholePseudoNullifier(address: Address, assetId: bigint, secret: bigint): bigint {
  const pseudoCommitment = poseidon2Hash([BigInt(address), assetId, 0n, 0n]);
  return poseidon2Hash([1n, secret, pseudoCommitment]);
}