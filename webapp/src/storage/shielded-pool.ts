import { Abi, Address, bytesToBigInt, erc20Abi, erc721Abi, Hex, isAddressEqual, parseEventLogs, toHex, TransactionReceipt } from "viem"
import { NoteDB } from "@/src/storage/notes-db"
import { InputNote, NoteDBWormholeEntry, OutputNote, ShieldedTx, TransferType, Withdrawal, WormholeDeposit } from "@/src/types"
import { createShieldedTransferOutputNotes, getShieldedTransferInputEntries } from "./utils"
import { queryTrees } from "@/src/subgraph-queries"
import { getMerkleTree } from "@/src/merkle"
import { getAssetId, getCommitment, getNullifier, getWormholeBurnAddress, getWormholeNullifier, getWormholePseudoNullifier } from "@/src/joinsplits"
import { randomBytes } from "@aztec/bb.js"
import { writeContract } from "wagmi/actions"
import { Config } from "wagmi"

const wormholeEntryEventAbi = [{
  type: "event",
  name: "WormholeEntry",
  inputs: [
    { name: "entryId", type: "uint256", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: false },
    { name: "id", type: "uint256", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
  ],
}] as const

export class ShieldedPool {
  private _db: NoteDB;
  account: Address;

  constructor(account: Address) {
    this._db = new NoteDB(account);
    this.account = account;
  }

  async wormholeTransfer(config: Config, {
    to,
    tokenType,
    token,
    tokenId,
    amount,
  }: {
    to: Address,
    tokenType?: "erc20",
    token: Address,
    tokenId?: bigint,
    amount: bigint,
  }) {
    // const client = config.getClient()
    // if (!client) {
    //   throw new Error("Client not found");
    // }
    // console.log({
    //   clientAccount: client.account?.address,
    //   thisAccount: this.account,
    // })
    // if (!client.account?.address || !isAddressEqual(client.account.address, this.account)) {
    //   throw new Error("Account missing or mismatch");
    // }

    const wormholeSecret = bytesToBigInt(randomBytes(32));
    const burnAddress = getWormholeBurnAddress(to, wormholeSecret);

    // TODO: Check token type and use the appropriate ABI
    const tokenAbi = erc20Abi;

    const hash = await writeContract(config, {
      address: token,
      abi: tokenAbi,
      functionName: "transfer",
      args: [burnAddress, amount],
    })

    return {
      hash,
      wormholeSecret,
      burnAddress,
    }
  }

  async parseAndSaveWormholeEntry(args: {
    chainId: number,
    receiver: Address,
    wormholeSecret: bigint,
    receipt: TransactionReceipt,
  }) {
    const { entryId, token, from, to, id, amount } = this.parseWormholeEntryLogFromReceipt(args.receipt)
    const wormholeEntry: NoteDBWormholeEntry = {
      id: entryId.toString(),
      entryId: entryId.toString(),
      treeNumber: 0,
      leafIndex: 0,
      chainId: args.chainId,
      entry: {
        to,
        from,
        wormhole_secret: args.wormholeSecret.toString(),
        token,
        token_id: id.toString(),
        amount: amount.toString(),
      },
      status: "pending",
    }
    await this._db.checkAndAddNote("wormhole_note", wormholeEntry)
    return wormholeEntry
  }

  parseWormholeEntryLogFromReceipt(receipt: TransactionReceipt) {
    const parsedLogs = parseEventLogs({
      abi: wormholeEntryEventAbi,
      eventName: "WormholeEntry",
      logs: receipt.logs,
    })
    if (parsedLogs.length === 0) {
      throw new Error("WormholeEntry log not found in receipt");
    }
    return parsedLogs[0].args
  }

  // TODO: Implement ragequit
  async ragequit(chainId: number, entryId: bigint) {
    throw new Error("Not implemented");
  }

  async transfer(args: {
    chainId: number,
    receiver: Address,
    token: Address,
    tokenId?: bigint,
    amount: bigint,
    unshield?: boolean, // if true, will include a withdraw note of amount
  }) {
    const transferType = args.unshield ? TransferType.WITHDRAWAL : TransferType.TRANSFER;
    const { wormhole, shielded } = await getShieldedTransferInputEntries(this._db, { sender: this.account, ...args })
    const trees = await queryTrees({
      wormholeTreeId: wormhole?.treeNumber ?? 0,
      shieldedTreeId: shielded[0]?.treeNumber ?? 0,
    })
    const wormholeTree = getMerkleTree(trees.wormholeTree?.leaves ?? [])
    const shieldedTree = getMerkleTree(trees.shieldedTree?.leaves ?? [])
    let wormholeDeposit: WormholeDeposit | undefined = undefined;
    if (wormhole) {
      const wormholeProof = wormholeTree.generateProof(wormhole.leafIndex);
      wormholeDeposit = {
        recipient: wormhole.entry.to,
        wormhole_secret: BigInt(wormhole.entry.wormhole_secret),
        asset_id: getAssetId(args.token, args.tokenId),
        sender: wormhole.entry.from,
        amount: BigInt(wormhole.entry.amount),
        leaf_index: BigInt(wormholeProof.index),
        leaf_siblings: wormholeProof.siblings,
        is_approved: wormhole.status === "approved",
      };
    }
    const inputNotes: InputNote[] = shielded.map(input => {
      const proof = shieldedTree.generateProof(input.leafIndex)
      return {
        blinding: BigInt(input.note.blinding),
        amount: BigInt(input.note.amount),
        leaf_index: BigInt(proof.index),
        leaf_siblings: proof.siblings,
      }
    })
    const outputNotes = createShieldedTransferOutputNotes({
      sender: this.account, 
      receiver: args.receiver, 
      amount: args.amount, 
      transferType, 
      notes: { shielded, wormhole }
    })

    const shieldedTxTypedData = toShieldedTxStruct({
      chainId: BigInt(args.chainId),
      sender: this.account,
      token: args.token,
      tokenId: args.tokenId,
      shieldedRoot: toHex(shieldedTree.root),
      wormholeRoot: toHex(wormholeTree.root),
      wormholeDeposit,
      inputs: inputNotes,
      outputs: outputNotes,
    })

    return {
      message: shieldedTxTypedData,
      wormholeDeposit,
      inputNotes,
      outputNotes,
      entries: { wormhole, shielded },
      wormholeTree, 
      shieldedTree,
    }
  }
}


export function toShieldedTxStruct(args: {
  chainId: bigint,
  sender: Address, // required if wormholeDeposit is undefined
  token: Address, // only for unshields
  tokenId?: bigint, // only for unshields (optional: defaults to 0)
  shieldedRoot: Hex,
  wormholeRoot: Hex,
  wormholeDeposit?: WormholeDeposit,
  wormholePseudoSecret?: bigint, // required if wormholeDeposit is undefined
  inputs: InputNote[],
  outputs: OutputNote[],
}): ShieldedTx {
  const assetId = getAssetId(args.token, args.tokenId);
  const isUnshield = args.outputs.some(output => output.transfer_type === TransferType.WITHDRAWAL);
  
  let wormholeNullifier: Hex;
  let withdrawals: Withdrawal[] = [];

  if (args.wormholeDeposit) {
    wormholeNullifier = toHex(getWormholeNullifier(args.wormholeDeposit));
  } else {
    if (!args.wormholePseudoSecret) {
      throw new Error("wormholePseudoSecret is required");
    }
    if (!args.sender) {
      throw new Error("sender is required");
    }
    if (!args.token) {
      throw new Error("token is required");
    }
    const assetId = getAssetId(args.token, args.tokenId);
    wormholeNullifier = toHex(getWormholePseudoNullifier(args.sender, assetId, args.wormholePseudoSecret));
  }

  if (isUnshield) {
    if (!args.token) {
      throw new Error("token is required for unshields");
    }
    withdrawals = args.outputs
      .filter(output => output.transfer_type === TransferType.WITHDRAWAL)
      .map(output => {
        const to = typeof output.recipient === "bigint" ? toHex(output.recipient) : output.recipient;
        return {
          to,
          asset: args.token as Address,
          id: args.tokenId ?? 0n,
          amount: output.amount,
        }
      });
  }

  return {
    chainId: args.chainId,
    wormholeRoot: args.wormholeRoot,
    wormholeNullifier,
    shieldedRoot: args.shieldedRoot,
    nullifiers: args.inputs.map(input => toHex(getNullifier(args.sender, assetId, input))),
    commitments: args.outputs.map(output => getCommitment(assetId, output)),
    withdrawals,
  }
}