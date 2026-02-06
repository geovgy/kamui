"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { WrapperDialogContent } from "./tx-states/wrapper";
import { Asset, WormholeAsset } from "@/src/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Address, erc20Abi, zeroAddress } from "viem";
import { useBalance, useConnection, useReadContracts } from "wagmi";
import { chain } from "../config";

interface WrapperDialogProps {
  implementationType: "WETH" | "ERC20" | "ERC4626";
  wormholeAsset: WormholeAsset;
  underlying?: Address
  refreshBalance: () => void;
  trigger: React.ReactNode;
}

export function WrapperDialog({ implementationType, wormholeAsset, underlying, refreshBalance, trigger }: WrapperDialogProps) {
  const { address } = useConnection();
  const { data: underlyingAsset } = !underlying ?
    useBalance({
      address,
      query: {
        select: (data) => {
          return {
            address: zeroAddress as Address,
            name: chain.nativeCurrency.name as string,
            symbol: data.symbol,
            decimals: data.decimals,
            balance: data.value,
          } as Asset;
        },
      },
    }) :
    useReadContracts({
      contracts: [
        { address: underlying, abi: erc20Abi, functionName: "name" },
        { address: underlying, abi: erc20Abi, functionName: "symbol" },
        { address: underlying, abi: erc20Abi, functionName: "decimals" },
        { address: underlying, abi: erc20Abi, functionName: "balanceOf", args: [address!] },
      ],
      query: {
        select: (data) => {
          return {
            address: underlying,
            name: data[0].result as string,
            symbol: data[1].result as string,
            decimals: data[2].result as number,
            balance: data[3].result as bigint,
          } as Asset;
        },
      },
    })

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <Tabs>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit">
            <WrapperDialogContent 
              implementationType={implementationType}
              transactionType="deposit" 
              wormholeAsset={wormholeAsset} 
              underlyingAsset={underlyingAsset!}
              refreshBalance={refreshBalance}
            />
          </TabsContent>
          <TabsContent value="withdraw">
          <WrapperDialogContent 
              implementationType={implementationType}
              transactionType="withdraw" 
              wormholeAsset={wormholeAsset} 
              underlyingAsset={underlyingAsset!}
              refreshBalance={refreshBalance}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
