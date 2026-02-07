import { useQuery } from "@tanstack/react-query";
import { queryWormholeAssets, queryWormholeAssetImplementations, queryWormholeEntriesByAddress, queryWormholeEntriesByEntryIds } from "../subgraph-queries";
import { Address } from "viem";

export function useWormholeAssets() {
  return useQuery({
    queryKey: ["wormholeAssets"],
    queryFn: queryWormholeAssets,
  });
}

export function useWormholeAssetImplementations() {
  return useQuery({
    queryKey: ["wormholeAssetImplementations"],
    queryFn: queryWormholeAssetImplementations,
  });
}

export function useWormholeEntries(args?: {
  from?: Address,
  to?: Address,
  orderDirection?: "asc" | "desc",
}) {
  return useQuery({
    queryKey: ["wormholeEntries", args],
    queryFn: () => queryWormholeEntriesByAddress(args),
  });
}

export function useWormholeEntriesByEntryIds(args: {
  entryIds: bigint[],
  orderDirection?: "asc" | "desc",
}) {
  return useQuery({
    queryKey: ["wormholeEntriesByEntryIds", { ...args, entryIds: args.entryIds.map(id => id.toString()) }],
    queryFn: () => queryWormholeEntriesByEntryIds(args),
    enabled: args.entryIds.length > 0,
  });
}