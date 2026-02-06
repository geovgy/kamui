"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { AssetDialog } from "@/src/components/asset-dialog";
import { TransferDialog } from "./transfer-dialog";
import { ArrowUpRightIcon } from "lucide-react";
import { useWormholeAssets } from "../hooks/use-subgraph";
import { useConnection, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits, getAddress } from "viem";
import { useMemo } from "react";

export function AssetsTable() {
  const { address } = useConnection();

  const { data: { wormholeAssets } = { wormholeAssets: [] } } = useWormholeAssets();

  const { data: metadatas } = useReadContracts({
    contracts: wormholeAssets.map((asset) => ({
      address: getAddress(asset.asset),
      abi: erc20Abi,
      functionName: "symbol",
    })),
  });

  const { data: balances } = useReadContracts({
    contracts: wormholeAssets.map((asset) => ({
      address: getAddress(asset.asset),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    })),
  })

  const tokens = useMemo(() => {
    return wormholeAssets.map((asset, index) => ({
      ...asset,
      name: metadatas?.[index]?.result as string ?? "TBD",
      symbol: metadatas?.[index]?.result as string ?? "TBD",
      accountBalance: {
        public: balances?.[index]?.result as bigint ?? 0n,
        private: 0n,
      },
    }));
  }, [wormholeAssets, metadatas, balances]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Accepts</TableHead>
          <TableHead className="text-center">My public balance</TableHead>
          <TableHead className="text-center">My private balance</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.name}</TableCell>
            <TableCell>{"TBD"}</TableCell>
            <TableCell>{"TBD"}</TableCell>
            <TableCell className="text-center">{formatUnits(asset.accountBalance.public, 18)} {asset.symbol}</TableCell>
            <TableCell className="text-center">{formatUnits(asset.accountBalance.private, 18)} {asset.symbol}</TableCell>
            <TableCell className="text-right">
              <AssetDialog
                asset={{ name: asset.name, symbol: asset.symbol, accountBalance: asset.accountBalance, address: asset.asset, implementation: asset.implementation.address }}
                trigger={
                  <Button variant="outline" className="rounded-full mr-2">
                    Manage
                  </Button>
                }
              />
              <TransferDialog
                trigger={
                  <Button variant="outline" className="rounded-full">
                    Send
                    <ArrowUpRightIcon className="size-4" />
                  </Button>
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}