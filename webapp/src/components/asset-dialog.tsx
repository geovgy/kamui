"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { WrapInnerDialogContent } from "./tx-states/wrap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UnwrapInnerDialogContent } from "./tx-states/unwrap";
import { Address, getAddress, isAddressEqual } from "viem";
import { WORMHOLE_ASSET_ERC20_IMPLEMENTATION_ADDRESS, WORMHOLE_ASSET_WETH_IMPLEMENTATION_ADDRESS } from "../env";
import { useBalance, useConnection } from "wagmi";

interface AssetDialogProps {
  asset: {
    name: string;
    symbol: string;
    accountBalance: {
      public: bigint;
      private: bigint;
    };
    address: Address;
    implementation: Address;
  };
  trigger: React.ReactNode;
}

export function AssetDialog({ asset, trigger }: AssetDialogProps) {
  let underlyingAsset: { name: string; symbol: string; accountBalance: bigint; address: Address } = { name: "ETH", symbol: "ETH", accountBalance: 0n, address: "0x0000000000000000000000000000000000000000" as Address };
  
  const { address } = useConnection();
  const ethBalance = useBalance({ address })

  if (isAddressEqual(asset.implementation, getAddress(WORMHOLE_ASSET_WETH_IMPLEMENTATION_ADDRESS))) {
    underlyingAsset.accountBalance = ethBalance.data?.value ?? 0n;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <Tabs>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="wrap">Wrap</TabsTrigger>
            <TabsTrigger value="unwrap">Unwrap</TabsTrigger>
          </TabsList>
          <TabsContent value="wrap">
            <DialogHeader className="mb-4">
              <DialogTitle>Deposit / Wrap</DialogTitle>
            </DialogHeader>
            <WrapInnerDialogContent implementation={asset.implementation} wormholeAsset={asset} underlyingAsset={underlyingAsset} />
          </TabsContent>
          <TabsContent value="unwrap">
            <DialogHeader className="mb-4">
              <DialogTitle>Withdraw / Unwrap</DialogTitle>
            </DialogHeader>
            <UnwrapInnerDialogContent wormholeAsset={asset} underlyingAsset={underlyingAsset} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
