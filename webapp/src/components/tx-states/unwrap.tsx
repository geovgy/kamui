"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/src/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { Switch } from "@/src/components/ui/switch";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { Address, formatUnits, parseAbi, parseUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { chain } from "@/src/config";
import { waitForTransactionReceipt } from "viem/actions";

function formatBalance(balance: bigint, decimals = 18): string {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// UI to wrap/unwrap the underlying asset of wormhole assets
export function UnwrapInnerDialogContent({ implementation, wormholeAsset, underlyingAsset }: {
  implementation: Address;
  wormholeAsset: { name: string; symbol: string; decimals: number; accountBalance: { public: bigint; private: bigint }; address: Address }, // TODO: change to token address, implementation address/type, 
  underlyingAsset: { name: string; symbol: string; decimals: number; accountBalance: bigint; address: Address } // TODO: change to token address
}) {
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const client = usePublicClient()

  const [amount, setAmount] = useState("");
  const [amountRequestType, setAmountRequestType] = useState<"exact-input" | "exact-output">("exact-input");
  const [wormholeTransfer, setWormholeTransfer] = useState(false);

  const parsedAmount = useMemo(() => {
    return parseUnits(amount, wormholeAsset.decimals);
  }, [amount, wormholeAsset.decimals]);

  const inputAmount = useMemo(() => {
    if (amountRequestType === "exact-input") {
      return amount;
    } else {
      return ((parseFloat(amount) || 0) * (1));
    }
  }, [amount, amountRequestType]);

  // Mock calculation - in real app this would come from a price feed
  const outputAmount = useMemo(() => {
    if (amountRequestType === "exact-output") {
      return amount;
    } else {
      return ((parseFloat(amount) || 0) * (1));
    }
  }, [amount, amountRequestType]);

  const handleWithdrawEth = useCallback(async () => {
    const hash = await writeContractAsync({
      address: wormholeAsset.address,
      abi: parseAbi([
        "function withdraw(uint256 amount) public",
      ]),
      functionName: "withdraw",
      args: [parsedAmount],
    });

    toast.info(`Transaction sent: ${chain.blockExplorers.default.url}/tx/${hash}`);

    const receipt = await waitForTransactionReceipt(client!, { hash });
    if (receipt.status === "success") {
      toast.success(`Transaction confirmed!`);
    } else {
      toast.error("Transaction failed.");
    }
  }, [writeContractAsync, parsedAmount]);

  return (
      <>
        <div className="flex flex-col gap-4">
          {/* Input amount field */}
          <div className="space-y-1">
            <InputGroup className="h-12 rounded-full">
              <InputGroupInput
                type="text"
                placeholder="0"
                value={inputAmount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                  setAmountRequestType("exact-input");
                }}
                className={`text-right text-lg ${amountRequestType === "exact-input" ? "text-foreground" : "text-muted-foreground"} focus:text-foreground`}
              />
              <InputGroupAddon align="inline-end" className="pr-4">
                <div className="w-20 flex items-center gap-2">
                  <div className="size-6 rounded-full border border-current" />
                  <span className="font-medium text-foreground">
                    {wormholeAsset.symbol}
                  </span>
                </div>
              </InputGroupAddon>
            </InputGroup>
            <div className="flex justify-end items-center gap-2 px-4 text-xs text-muted-foreground">
              <Button variant="link" size="xs" onClick={() => {
                setAmount(formatUnits(wormholeAsset.accountBalance.public, wormholeAsset.decimals));
                setAmountRequestType("exact-input");
              }}>
                Max
              </Button>
              <span>Balance: {formatBalance(wormholeAsset.accountBalance.public, wormholeAsset.decimals)} {wormholeAsset.symbol}</span>
            </div>
          </div>

          {/* Output amount display */}
          <div className="space-y-1">
            <InputGroup className="h-12 rounded-full bg-muted/50">
              <InputGroupInput
                type="text"
                value={outputAmount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                  setAmountRequestType("exact-output");
                }}
                className={`text-right text-lg ${amountRequestType === "exact-output" ? "text-foreground" : "text-muted-foreground"} focus:text-foreground`}
              />
              <InputGroupAddon align="inline-end" className="pr-4">
                <div className="w-20 flex items-center gap-2">
                  <div className="size-6 rounded-full border border-current" />
                  <span className="font-medium text-foreground">{underlyingAsset.symbol}</span>
                </div>
              </InputGroupAddon>
            </InputGroup>
            <div className="flex justify-end px-4 text-xs text-muted-foreground">
              Balance: {formatBalance(underlyingAsset.accountBalance, underlyingAsset.decimals)} {underlyingAsset.symbol}
            </div>
          </div>

          {/* Send button */}
          <Button variant="outline" className="w-full h-12 rounded-full text-base" onClick={handleWithdrawEth}>
            Withdraw
          </Button>
        </div>
      </>
  );
}
