// UI to send a wormhole and shielded transfer
"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useProve } from "@/src/hooks/use-zk-provers";
import { WormholeNote, WormholeAsset, BalanceInfo } from "@/src/types";
import { getWormholeBurnCommitment } from "@/src/joinsplits";
import { getMerkleTree } from "@/src/merkle";
import { MERKLE_TREE_DEPTH } from "@/src/constants";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfig as useWagmiConfig } from "wagmi";
import { Address, createPublicClient, erc20Abi, formatUnits, getAddress, http, isAddress, parseUnits } from "viem";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { mainnet } from "viem/chains";
import { useShieldedPool } from "../hooks/use-shieldedpool";
import { useQuery } from "@tanstack/react-query";
import { getEnsAddress, getEnsName } from "viem/actions";

type BalanceSource = "private" | "public";

function formatBalance(balance: bigint, decimals = 18): string {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TransferDialog({ trigger, wormholeAsset, balances, refetchBalances }: { trigger: React.ReactNode, wormholeAsset: WormholeAsset, balances: BalanceInfo, refetchBalances: () => void }) {
  const { publicBalance, privateBalance } = balances;
  const { mutateAsync: prove } = useProve("ragequit");

  const wagmiConfig = useWagmiConfig();
  const { data: shieldedPool } = useShieldedPool();
  
  const [isProving, setIsProving] = useState(false);
  const [recipientInput, setRecipientInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState("");
  const [fundsSource, setFundsSource] = useState<BalanceSource>("private");
  const [fundsDestination, setFundsDestination] = useState<BalanceSource>("private");

  const [status, setStatus] = useState<undefined | "signing" | "executing" | "confirming" | "success" | "error">(undefined);

  const isLoading = useMemo(() => {
    return status === "signing" || status === "executing" || status === "confirming";
  }, [status]);

  const { data: recipient } = useQuery({
    queryKey: ["ens-resolution", recipientInput.trim()],
    queryFn: async () => {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(mainnet.rpcUrls.default.http[0]),
      });
      const rec = recipientInput.trim();
      const result = {
        address: isAddress(rec) ? getAddress(rec) : undefined,
        name: rec.endsWith(".eth") ? rec : undefined,
        resolved: false,
      }
      if (result.address) {
        try {
          const ensName = await getEnsName(client, {
            address: result.address,
          });
          result.name = ensName ?? undefined;
          result.resolved = true;
        } catch (error) {}
      }
      if (result.name && !result.address) {
        try {
          const ensAddress = await getEnsAddress(client, {
            name: result.name,
          });
          result.address = ensAddress ?? undefined;
          result.resolved = true;
        } catch (error) {}
      }

      return result;
    },
    enabled: !!recipientInput.trim(),
  });

  const parsedAmount = useMemo(() => {
    return parseUnits(amountInput.trim(), wormholeAsset.decimals);
  }, [amountInput, wormholeAsset.decimals]);

  const txType = useMemo<"wormhole" | "shielded" | "unshield" | "public">(() => {
    if (fundsSource === "public" && fundsDestination === "private") {
      return "wormhole";
    } else if (fundsSource === "private" && fundsDestination === "public") {
      return "unshield";
    } else if (fundsSource === "public" && fundsDestination === "public") {
      return "public";
    } else {
      return "shielded";
    }
  }, [fundsSource, fundsDestination]);
  
  const transferDescription = useMemo(() => {
    if (!recipient?.address && !amountInput.trim()) {
      return "Please enter a recipient address and amount to send";
    }
    if (!recipient?.address) {
      return "Please enter a recipient address";
    }
    if (!amountInput.trim()) {
      return "Please enter an amount to send";
    }
    const recipientName = recipient.name ?? formatAddress(recipient.address);
    if (txType === "wormhole") {
      return `Shield ${amountInput} ${wormholeAsset.symbol} to ${recipientName} via zk-wormhole`;
    } else if (txType === "unshield") {
      return `Unshield ${amountInput} ${wormholeAsset.symbol} to ${recipientName}`;
    } else if (txType === "public") {
      return `Send ${amountInput} ${wormholeAsset.symbol} to ${recipientName} as public transfer`;
    } else {
      return `Send ${amountInput} ${wormholeAsset.symbol} to ${recipientName} via shielded transfer`;
    }
  }, [recipient, amountInput, txType, wormholeAsset.symbol]);

  async function handleTransaction() {
    switch(txType) {
      case "wormhole":
        await handleWormholeTransaction();
        break;
      case "unshield":
        await handleUnshieldTransaction();
        break;
      case "public":
        await handlePublicTransaction();
        break;
      case "shielded":
        await handleShieldedTransaction();
        break;
    }
  }

  async function handleWormholeTransaction() {
    try {
      if (!recipient?.address) {
        throw new Error("Invalid recipient address");
      }
      const client = wagmiConfig.getClient();
      if (!client) {
        throw new Error("Client not found");
      }
      if (!shieldedPool) {
        throw new Error("Shielded pool not found");
      }
      setStatus("signing");
      const { hash, wormholeSecret, burnAddress } = await shieldedPool.wormholeTransfer(wagmiConfig, {
        to: recipient.address,
        tokenType: "erc20",
        token: wormholeAsset.address,
        tokenId: 0n,
        amount: parsedAmount,
      });
      console.log({
        hash,
        burnAddress
      })
      setStatus("confirming");
      toast.info(`Waiting for transaction to be confirmed...`);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status === "success") {
        setStatus("success");
        const entry = await shieldedPool.parseAndSaveWormholeEntry({
          chainId: client.chain.id,
          receiver: recipient.address,
          wormholeSecret: wormholeSecret,
          receipt: receipt,
        });
        toast.success(`Transaction confirmed! Entry ID: ${entry.id}`);
        console.log("Entry saved:", entry);
        refetchBalances();
      } else {
        setStatus("error");
        toast.error("Transaction failed");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      toast.error("Transaction failed");
    }
    setStatus(undefined);
  }
  // TODO: Implement unshield transaction
  async function handleUnshieldTransaction() {
    throw new Error("Not implemented");
  }
  // TODO: Implement public transaction
  async function handlePublicTransaction() {
    try {
      if (!recipient?.address) {
        throw new Error("Invalid recipient address");
      }
      const hash = await writeContract(wagmiConfig, {
        address: wormholeAsset.address,
        abi: erc20Abi, // TODO: Use dynamic ABI based on asset type
        functionName: "transfer",
        args: [recipient.address, parsedAmount],
      });
      setStatus("confirming");
      toast.info(`Waiting for transaction to be confirmed...`);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      if (receipt.status === "success") {
        setStatus("success");
        toast.success(`Transaction confirmed!`);
        refetchBalances();
      } else {
        setStatus("error");
        toast.error("Transaction failed");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      toast.error("Transaction failed");
    }
    setStatus(undefined);
  }
  // TODO: Implement shielded transaction
  async function handleShieldedTransaction() {
    throw new Error("Not implemented");
  }

  // DELETE: This is just a test
  const handleGenerateZKP = async () => {
    setIsProving(true);
    try {
      const wormholeSecret = 42069n;
      const wormholeNote: WormholeNote = {
        recipient: "0x0000000000000000000000000000000000000000",
        wormhole_secret: wormholeSecret,
        asset_id: 1n,
        sender: "0x0000000000000000000000000000000000000000",
        amount: BigInt(100e18),
      };

      const burnCommitment = getWormholeBurnCommitment({
        ...wormholeNote,
        approved: false,
      });

      const wormholeTree = getMerkleTree([burnCommitment]);

      const wormholeProof = wormholeTree.generateProof(0);

      const circuitInputs = {
        wormhole_root: wormholeTree.root.toString(),
        wormhole_note: {
          recipient: wormholeNote.recipient.toString(),
          wormhole_secret: wormholeNote.wormhole_secret.toString(),
          asset_id: wormholeNote.asset_id.toString(),
          sender: wormholeNote.sender.toString(),
          amount: wormholeNote.amount.toString(),
        },
        wormhole_leaf_index: wormholeProof.index.toString(),
        wormhole_leaf_siblings: wormholeProof.siblings
          .map((sibling) => sibling.toString())
          .concat(
            Array(MERKLE_TREE_DEPTH - wormholeProof.siblings.length).fill("0")
          ),
        is_approved: false,
      };

      console.log("Generating ZKP...");

      console.time("prove");
      const result = await prove(circuitInputs);
      console.timeEnd("prove");
      console.log(result);
    } catch (error) {
      console.error(error);
    }
    setIsProving(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            Send a zk-wormhole, shielded or normal transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* To address input */}
          <Input
            placeholder="To address (ENS)"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
          />

          {/* Amount input */}
          <div className="space-y-1">
            <InputGroup className="h-12 rounded-full">
              <InputGroupInput
                type="text"
                placeholder="0"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value.replace(/[^0-9.]/g, ""));
                }}
                className="text-right text-xl focus:text-foreground"
              />
              <InputGroupAddon
                align="inline-end"
                className="pr-4 w-20 text-left justify-start"
              >
                <span className="font-medium text-foreground text-left">{wormholeAsset.symbol}</span>
              </InputGroupAddon>
            </InputGroup>
            <div className="flex justify-end items-center gap-2 px-4 text-xs text-muted-foreground">
              <span>Balance: {formatBalance(fundsSource === "public" ? publicBalance : privateBalance, wormholeAsset.decimals)} {wormholeAsset.symbol}</span>
              <Button variant="link" size="xs" onClick={() => {
                const balance = fundsSource === "public" ? publicBalance : privateBalance;
                setAmountInput(formatUnits(balance, wormholeAsset.decimals));
              }}>
                Max
              </Button>
            </div>
          </div>

          {/* Funds source radio group */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Funds source</span>
            <RadioGroup
              value={fundsSource}
              onValueChange={(v) => {
                setFundsSource(v as BalanceSource);
                if (
                  (v === "private" && parsedAmount > privateBalance)
                  || (v === "public" && parsedAmount > publicBalance)
                ) {
                  setAmountInput("");
                }
              }}
              className="grid grid-cols-2 gap-0 rounded-md border"
            >
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-l-md px-4 py-3 text-sm transition-colors ${
                  fundsSource === "private"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="private" className="sr-only" />
                Private
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-r-md border-l px-4 py-3 text-sm transition-colors ${
                  fundsSource === "public"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                Public
              </label>
            </RadioGroup>
          </div>

          {/* Funds destination radio group */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Funds destination</span>
            <RadioGroup
              value={fundsDestination}
              onValueChange={(v) => setFundsDestination(v as BalanceSource)}
              className="grid grid-cols-2 gap-0 rounded-md border"
            >
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-l-md px-4 py-3 text-sm transition-colors ${
                  fundsDestination === "private"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="private" className="sr-only" />
                Private
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-r-md border-l px-4 py-3 text-sm transition-colors ${
                  fundsDestination === "public"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                Public
              </label>
            </RadioGroup>
          </div>

          {/* Send button */}
          <DialogFooter>
            <div className="flex flex-col gap-2 w-full items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {transferDescription}
              </span>
              <Button
                onClick={handleTransaction}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                Send
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}