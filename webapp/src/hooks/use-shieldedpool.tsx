import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";
import { ShieldedPool } from "../storage/shielded-pool";
import { useConnection } from "wagmi";
import { NoteDBWormholeEntry } from "../types";

export function useShieldedPool() {
  const { address } = useConnection();
  return useQuery({
    queryKey: ["shieldedPool", address],
    queryFn: () => {
      return address ? new ShieldedPool(address) : undefined;
    },
    enabled: !!address,
  });
}

export function useWormholeNotes(params?: {
  status?: NoteDBWormholeEntry["status"];
}) {
  const { data: shieldedPool } = useShieldedPool();
  return useQuery({
    queryKey: ["wormholeNotes", shieldedPool?.account],
    queryFn: async () => {
      if (!shieldedPool) return [];
      const notes = await shieldedPool.getWormholeNotes();
      if (params?.status) {
        return notes.filter((n) => n.status === params.status);
      }
      return notes;
    },
    enabled: !!shieldedPool,
  });
}