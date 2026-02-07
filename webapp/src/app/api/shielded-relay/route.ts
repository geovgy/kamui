import { KAMUI_CONTRACT_ADDRESS } from "@/src/env";
import { sepolia } from "wagmi/chains";
import { ShieldedTx, ShieldedTxStringified } from "@/src/types";
import { NextRequest, NextResponse } from "next/server";
import { Abi, createWalletClient, getAddress, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const verifierAbi = [
  {
    type: "function",
    name: "verify",
    stateMutability: "view",
    inputs: [
      { name: "_proof", type: "bytes" },
      { name: "_publicInputs", type: "bytes32[]" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "error",
    name: "ProofLengthWrong",
    inputs: [],
  },
  {
    type: "error",
    name: "ProofLengthWrongWithLogN",
    inputs: [
      { name: "logN", type: "uint256" },
      { name: "actualLength", type: "uint256" },
      { name: "expectedLength", type: "uint256" }
    ],
  },
  {
    type: "error",
    name: "PublicInputsLengthWrong",
    inputs: [],
  },
  {
    type: "error",
    name: "SumcheckFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "ShpleminiFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "GeminiChallengeInSubgroup",
    inputs: [],
  },
  {
    type: "error",
    name: "ConsistencyCheckFailed",
    inputs: [],
  }
] as const satisfies Abi

export async function POST(request: NextRequest) {
  try {
    const { shieldedTx: shieldedTxStringified, proof } = await request.json() as { shieldedTx: ShieldedTxStringified, proof: `0x${string}` };

    console.log("Received shielded transfer request");

    const shieldedTx: ShieldedTx = {
      ...shieldedTxStringified,
      chainId: BigInt(shieldedTxStringified.chainId),
      commitments: shieldedTxStringified.commitments.map(commitment => BigInt(commitment)),
      withdrawals: shieldedTxStringified.withdrawals.map(withdrawal => ({
        to: withdrawal.to,
        asset: withdrawal.asset,
        id: BigInt(withdrawal.id),
        amount: BigInt(withdrawal.amount),
      })),
    };

    const relayer = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY! as `0x${string}`)

    console.log("Creating wallet client");
    const client = createWalletClient({
      account: relayer,
      chain: sepolia, // TODO: Make dynamic to match chain requested in typedData `chainId`
      transport: http(process.env.RELAYER_RPC_URL!),
    })

    console.log("Writing contract");
    const hash = await client.writeContract({
      address: getAddress(KAMUI_CONTRACT_ADDRESS),
      abi: [...verifierAbi, ...parseAbi([
        "struct Withdrawal { address to; address asset; uint256 id; uint256 amount; }",
        "struct ShieldedTx { uint64 chainId; bytes32 wormholeRoot; bytes32 wormholeNullifier; bytes32 shieldedRoot; bytes32[] nullifiers; uint256[] commitments; Withdrawal[] withdrawals; }",
        "function shieldedTransfer(ShieldedTx memory shieldedTx, bytes calldata proof) external",
      ])],
      functionName: "shieldedTransfer",
      args: [shieldedTx, proof],
    })

    console.log("Transaction hash:", hash);

    return NextResponse.json({ hash }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}