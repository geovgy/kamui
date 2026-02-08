"use client";

import React, { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWriteContract } from "wagmi";
import { Address, encodePacked, getAddress, isAddress, parseAbi } from "viem";
import { KAMUI_CONTRACT_ADDRESS, WORMHOLE_ASSET_ERC20_IMPLEMENTATION_ADDRESS, WORMHOLE_ASSET_ERC4626_IMPLEMENTATION_ADDRESS } from "@/src/env";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useConfig as useWagmiConfig } from "wagmi";
import { useWormholeAssets } from "../hooks/use-subgraph";

type ImplementationType = "ERC20" | "ERC4626";

export function CreateAssetDialog({ trigger }: { trigger: React.ReactNode }) {
  const { mutateAsync: writeContract, isPending } = useWriteContract();
  const wagmiConfig = useWagmiConfig()
  const { refetch: refetchWormholeAssets } = useWormholeAssets()
  
  const [implementationType, setImplementationType] = useState<ImplementationType>("ERC20");
  const [tokenAddress, setTokenAddress] = useState<`0x${string}` | "">("");
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | "">("");
  const [open, setOpen] = useState(false);

  const implementationAddresses: Record<ImplementationType, Address> = {
    ERC20: WORMHOLE_ASSET_ERC20_IMPLEMENTATION_ADDRESS as Address,
    ERC4626: WORMHOLE_ASSET_ERC4626_IMPLEMENTATION_ADDRESS as Address,
  };

  async function handleSubmit() {
    if (!tokenAddress.trim()) {
      toast.error("Please enter a token address");
      return;
    }

    if (!isAddress(tokenAddress)) {
      toast.error("Invalid token address");
      return;
    }

    if (implementationType === "ERC4626" && !vaultAddress.trim()) {
      toast.error("Please enter a vault address for ERC4626 implementation");
      return;
    }

    if (implementationType === "ERC4626" && vaultAddress.trim() && !isAddress(vaultAddress)) {
      toast.error("Invalid vault address");
      return;
    }

    let initData: `0x${string}`;
    
    if (implementationType === "ERC20") {
      initData = encodePacked(["address"], [getAddress(tokenAddress)]);
    } else {
      initData = encodePacked(
        ["address", "address"],
        [getAddress(tokenAddress), getAddress(vaultAddress)]
      );
    }

    const hash = await writeContract(
      {
        address: KAMUI_CONTRACT_ADDRESS as Address,
        abi: parseAbi(["function createWormholeAsset(address implementation, bytes calldata initData) external returns (address asset)"]),
        functionName: "createWormholeAsset",
        args: [implementationAddresses[implementationType], initData],
      },
      {
        onSuccess: (hash) => {
          toast.success(`Waiting for transaction to be confirmed...`);
          setOpen(false);
          setTokenAddress("");
          setVaultAddress("");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create asset");
        },
      }
    );

    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
    if (receipt.status === "success") {
      toast.success(`Asset created successfully`);
      refetchWormholeAssets();
    } else {
      toast.error(`Failed to create asset`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle>Create New Asset</DialogTitle>
          <DialogDescription>
            Deploy a new wormhole asset wrapper for an ERC20 or ERC4626 token.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Implementation type selection */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Implementation Type</span>
            <RadioGroup
              value={implementationType}
              onValueChange={(v) => {
                setImplementationType(v as ImplementationType);
                setVaultAddress("");
              }}
              className="grid grid-cols-2 gap-0 rounded-md border"
            >
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-l-md px-4 py-3 text-sm transition-colors ${
                  implementationType === "ERC20"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="ERC20" className="sr-only" />
                ERC20
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-r-md border-l px-4 py-3 text-sm transition-colors ${
                  implementationType === "ERC4626"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="ERC4626" className="sr-only" />
                ERC4626
              </label>
            </RadioGroup>
          </div>

          {/* Token address input */}
          <div className="space-y-2">
            <span className="text-sm font-medium">
              {implementationType === "ERC4626" ? "Underlying Token Address" : "Token Address"}
            </span>
            <Input
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value as `0x${string}`)}
            />
          </div>

          {/* Vault address input - only for ERC4626 */}
          {implementationType === "ERC4626" && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Vault Address</span>
              <Input
                placeholder="0x..."
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value as `0x${string}`)}
              />
            </div>
          )}

          {/* Submit button */}
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              size="lg"
              className="w-full"
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Create Asset
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
