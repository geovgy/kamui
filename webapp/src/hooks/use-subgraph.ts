import { useQuery } from "@tanstack/react-query";
import { queryWormholeAssets, queryWormholeAssetImplementations, queryWormholeEntries } from "../subgraph-queries";
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
    queryFn: () => queryWormholeEntries(args),
  });
}