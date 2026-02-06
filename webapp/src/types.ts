import type { Address } from "viem";

export enum TransferType {
  TRANSFER = 1,
  WITHDRAWAL = 2,
}

export interface InputNote {
  blinding: bigint;
  amount: bigint;
  leaf_index: bigint;
  leaf_siblings: bigint[];
}

export interface OutputNote {
  recipient: Address | bigint;
  blinding: bigint;
  amount: bigint;
  transfer_type: TransferType;
}

export interface WormholeNote {
  recipient: Address;
  wormhole_secret: bigint;
  asset_id: bigint;
  sender: Address;
  amount: bigint;
}

export interface WormholeDeposit extends WormholeNote {
  tree_root: bigint;
  leaf_index: bigint;
  leaf_siblings: bigint[];
  is_approved: boolean;
}