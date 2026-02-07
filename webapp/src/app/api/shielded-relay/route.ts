import { chain } from "@/src/config";
import { KAMUI_CONTRACT_ADDRESS } from "@/src/env";
import { ShieldedTx } from "@/src/types";
import { ProofData } from "@aztec/bb.js";
import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, getAddress, http, parseAbi, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(request: NextRequest) {
  try {
    const { shieldedTx, proofData } = await request.json() as { shieldedTx: ShieldedTx, proofData: ProofData };

    const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY! as `0x${string}`)
    const client = createWalletClient({
      account: relayer,
      chain, // TODO: Make dynamic to match chain requested in typedData `chainId`
      transport: http(process.env.RELAYER_RPC_URL!),
    })

    const hash = await client.writeContract({
      address: getAddress(KAMUI_CONTRACT_ADDRESS),
      abi: parseAbi([
        "struct Withdrawal { address to; address asset; uint256 id; uint256 amount; }",
        "struct ShieldedTx { uint64 chainId; bytes32 wormholeRoot; bytes32 wormholeNullifier; bytes32 shieldedRoot; bytes32[] nullifiers; uint256[] commitments; Withdrawal[] withdrawals; }",
        "function shieldedTransfer(ShieldedTx memory shieldedTx, bytes calldata proof) external",
      ]),
      functionName: "shieldedTransfer",
      args: [shieldedTx, toHex(proofData.proof)],
    })

    return NextResponse.json({ hash }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}