import { poseidon2Hash } from "@zkpassport/poseidon2";
import { LeanIMT } from "@zk-kit/lean-imt";

export function hashLeaves(a: bigint, b: bigint): bigint {
  return poseidon2Hash([a, b]);
}

export function getMerkleTree(leaves: bigint[]) {  
  const imt = new LeanIMT<bigint>(hashLeaves, leaves);
  return imt;
}