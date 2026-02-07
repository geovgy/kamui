import { randomBytes } from "@aztec/bb.js";
import { TransferType, type InputNote, type OutputNote, type WormholeNote } from "./types";
import { poseidon2Hash } from "@zkpassport/poseidon2";
import { bytesToBigInt, bytesToHex, stringToHex, toBytes, toHex, type Address } from "viem";
import { SNARK_SCALAR_FIELD } from "./constants";

export function getRandomBlinding(): bigint {
  return bytesToBigInt(randomBytes(32)) % SNARK_SCALAR_FIELD;
}

export function getAssetId(token: Address, tokenId?: bigint): bigint {
  return poseidon2Hash([BigInt(token), BigInt(tokenId ?? 0)]);
}

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

export function getWormholeBurnAddress(recipient: Address, wormholeSecret: bigint): Address {
  const hash = poseidon2Hash([BigInt(recipient), wormholeSecret, BigInt(stringToHex("ZKWORMHOLE"))]);
  return bytesToHex(toBytes(hash,{ size: 32 }).slice(12, 32));
}

export function getWormholeBurnCommitment(args: WormholeNote & {
  approved: boolean;
}): bigint {
  const burnAddress = getWormholeBurnAddress(args.recipient, args.wormhole_secret);
  // Must match contract ordering: poseidon2(approved, sender, burn_address, assetId, amount)
  return poseidon2Hash([BigInt(args.approved), BigInt(args.sender), BigInt(burnAddress), args.asset_id, args.amount]);
}

export function getWormholeNullifier(args: WormholeNote): bigint {
  const secretCommitment = poseidon2Hash([BigInt(args.recipient), args.asset_id, BigInt(args.sender), args.amount]);
  return poseidon2Hash([1n, args.wormhole_secret, secretCommitment]);
}

export function getWormholePseudoNullifier(address: Address, assetId: bigint, secret: bigint): bigint {
  const pseudoCommitment = poseidon2Hash([BigInt(address), assetId, 0n, 0n]);
  return poseidon2Hash([1n, secret, pseudoCommitment]);
}