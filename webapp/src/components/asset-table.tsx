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
import { WrapperDialog } from "@/src/components/wrapper-dialog";
import { TransferDialog } from "./transfer-dialog";
import { ArrowUpRightIcon } from "lucide-react";
import { useWormholeAssets } from "../hooks/use-subgraph";
import { useConnection, useReadContracts } from "wagmi";
import { Abi, Address, erc20Abi, erc4626Abi, formatUnits, getAddress, isAddressEqual, parseAbi } from "viem";
import { useMemo } from "react";
import { WORMHOLE_ASSET_ERC20_IMPLEMENTATION_ADDRESS, WORMHOLE_ASSET_ERC4626_IMPLEMENTATION_ADDRESS, WORMHOLE_ASSET_WETH_IMPLEMENTATION_ADDRESS } from "../env";
import { useShieldedBalances } from "../hooks/use-shieldedpool";

export function AssetsTable() {
  const { address } = useConnection();

  const { data: { wormholeAssets } = { wormholeAssets: [] } } = useWormholeAssets();

  const { data: shieldedBalances, refetch: refetchShieldedBalances } = useShieldedBalances({ tokens: wormholeAssets.map((asset) => asset.asset), excludeWormholes: false });

  const { data: metadatas, refetch } = useReadContracts({
    query: {
      enabled: !!wormholeAssets.length,
    },
    allowFailure: false,
    contracts: wormholeAssets.map((asset) => {
      const implementationType = getImplementationType(asset.implementation.address);
      const calls = [
        {
          address: getAddress(asset.asset),
          abi: erc20Abi as Abi,
          functionName: "name",
        },
        {
          address: getAddress(asset.asset),
          abi: erc20Abi as Abi,
          functionName: "symbol",
        },
        {
          address: getAddress(asset.asset),
          abi: erc20Abi as Abi,
          functionName: "decimals",
        },
        {
          address: getAddress(asset.asset),
          abi: erc20Abi as Abi,
          functionName: "balanceOf",
          args: [address],
        }
      ]
      if (implementationType === "ERC20") {
        calls.push({
          address: getAddress(asset.asset),
          abi: parseAbi(["function underlying() external view returns (address)"]),
          functionName: "underlying",
        })
      } else if (implementationType === "ERC4626") {
        calls.push({
          address: getAddress(asset.asset),
          abi: erc4626Abi,
          functionName: "asset",
          args: [address],
        })
      }
      return calls
    }).flat(),
  });

  const tokens = useMemo(() => {
    let offset = 0;
    return wormholeAssets.map((asset, i) => {
      const startIndex = offset;
      const implementationType = getImplementationType(asset.implementation.address)!;
      if (implementationType !== "WETH") {
        offset += 5;
      } else {
        offset += 4;
      }

      return {
        ...asset,
        metadata: {
          address: asset.asset,
          name: metadatas?.[startIndex] as string ?? "Unable to resolve name",
          symbol: metadatas?.[startIndex + 1] as string ?? "-",
          decimals: Number(metadatas?.[startIndex + 2] as bigint ?? 18),
          balance: metadatas?.[startIndex + 3] as bigint ?? 0n,
          implementation: asset.implementation.address
        },
        wormholeBalances: {
          publicBalance: metadatas?.[startIndex + 3] as bigint ?? 0n,
          privateBalance: shieldedBalances?.[i] as bigint ?? 0n,
        },
        underlying: implementationType !== "WETH" ? metadatas?.[startIndex + 4] as Address : undefined,
        implementationType,
      }
    }).filter((asset) => asset.implementationType !== undefined);
  }, [wormholeAssets, metadatas]);

  function getImplementationType(implementation: Address) {
    if (isAddressEqual(implementation, getAddress(WORMHOLE_ASSET_WETH_IMPLEMENTATION_ADDRESS))) {
      return "WETH" as const;
    } else if (isAddressEqual(implementation, getAddress(WORMHOLE_ASSET_ERC20_IMPLEMENTATION_ADDRESS))) {
      return "ERC20" as const;
    } else if (isAddressEqual(implementation, getAddress(WORMHOLE_ASSET_ERC4626_IMPLEMENTATION_ADDRESS))) {
      return "ERC4626" as const;
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Name</TableHead>
          <TableHead className="text-center">Implementation</TableHead>
          <TableHead className="text-right">My public balance</TableHead>
          <TableHead className="text-right">My private balance</TableHead>
          <TableHead className="text-right"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.metadata.name}</TableCell>
            <TableCell className="text-center">{asset.implementationType}</TableCell>
            <TableCell className="text-right">{formatUnits(asset.wormholeBalances.publicBalance, asset.metadata.decimals)} {asset.metadata.symbol}</TableCell>
            <TableCell className="text-right">{formatUnits(asset.wormholeBalances.privateBalance, 18)} {asset.metadata.symbol}</TableCell>
            <TableCell className="text-right">
              <WrapperDialog
                implementationType={asset.implementationType}
                wormholeAsset={asset.metadata}
                underlying={asset.underlying}
                refreshBalance={() => {
                  refetch();
                  refetchShieldedBalances();
                }}
                trigger={
                  <Button variant="outline" className="rounded-full mr-2">
                    Manage
                  </Button>
                }
              />
              <TransferDialog
                wormholeAsset={asset.metadata}
                balances={asset.wormholeBalances}
                refetchBalances={() => {
                  refetch();
                  refetchShieldedBalances();
                }}
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