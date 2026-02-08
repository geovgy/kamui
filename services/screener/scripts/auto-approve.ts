import { createWalletClient, getAddress, http, publicActions } from "viem";
import { queryPendingWormholeEntries } from "../src/subgraph";
import { CHAIN } from "../src/configs";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_RPC_URL, CONTRACT_ADDRESS, PRIVATE_KEY } from "../src/env";
import KamuiABI from "../../../contracts/out/Kamui.sol/Kamui.json";
import LeanIMTAbi from "../../../contracts/out/LeanIMT.sol/LeanIMT.json";

async function main() {
  console.log("\nQuerying pending wormhole entries...");

  const { wormholeEntries } = await queryPendingWormholeEntries();

  if (!wormholeEntries.length) {
    console.log("\nNo pending wormhole entries found");
    console.log("Exiting...");
    return;
  }

  console.log(`\nFound ${wormholeEntries.length} pending wormhole entries`);

  console.log("\nApproving all pending wormhole entries...");

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  console.log(`\nUsing account: ${account.address}`);

  const client = createWalletClient({
    account,
    chain: CHAIN,
    transport: http(CHAIN_RPC_URL),
  }).extend(publicActions);

  console.log("\nApproving entries...");

  const approvals = wormholeEntries.slice(4).map((entry) => ({
    entryId: entry.entryId,
    approved: true,
  }));

  console.log(`\nSubmitting onchain...`);

  const hash = await client.writeContract({
    address: getAddress(CONTRACT_ADDRESS),
    abi: [...KamuiABI.abi, ...LeanIMTAbi.abi],
    functionName: "appendManyWormholeLeaves",
    args: [approvals],
  });

  console.log(`\nTransaction hash: ${hash}`);

  console.log("\n⏳ Waiting for confirmation...");
  await client.waitForTransactionReceipt({ hash });

  console.log("✅ Transaction confirmed");

  console.log("\nEntries have been approved and committed to the wormhole tree");
}

main().catch(console.error).finally(() => process.exit(0));