"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useConnection } from "wagmi";
import { Address, formatUnits } from "viem";
import { ShieldedPool } from "@/src/storage/shielded-pool";
import { NoteDBWormholeEntry } from "@/src/types";
import { useWormholeEntriesByEntryIds } from "@/src/hooks/use-subgraph";
import { Loader2 } from "lucide-react";
import { useShieldedPool, useWormholeNotes } from "../hooks/use-shieldedpool";

function formatAddress(address: Address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const statusStyles: Record<string, string> = {
  pending: "text-yellow-600 border-yellow-600",
  approved: "text-green-600 border-green-600",
  rejected: "text-red-600 border-red-600",
  completed: "text-blue-600 border-blue-600",
  ragequitted: "text-orange-600 border-orange-600",
};

function StatusBadge({ status }: { status: NoteDBWormholeEntry["status"] }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  const style = statusStyles[status ?? ""] ?? "";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

export function WormholesTable() {
  const { address } = useConnection();

  const { data: shieldedPool, isLoading: isShieldedPoolLoading } = useShieldedPool();
  const { data: entries, refetch: refetchEntries, isLoading: isEntriesLoading } = useWormholeNotes();

  console.log({ entries });

  const pendingEntryIds = useMemo(() => {
    return entries?.filter((e) => e.status === "pending" || !e.status)?.map((e) => BigInt(e.entryId)) ?? [];
  }, [entries]);

  const { data: subgraphData, isLoading: isSubgraphLoading } = useWormholeEntriesByEntryIds(
    pendingEntryIds.length > 0
      ? { entryIds: pendingEntryIds, orderDirection: "desc" }
      : { entryIds: [] },
  );

  // When subgraph returns submitted entries, update the notes DB
  useEffect(() => {
    if (!subgraphData?.wormholeEntries?.length || !shieldedPool) return;

    async function syncFromSubgraph() {
      let updated = false;
      for (const sgEntry of subgraphData!.wormholeEntries) {
        if (sgEntry.submitted && sgEntry.commitment) {
          try {
            await shieldedPool!.updateWormholeEntryCommitment(sgEntry.entryId.toString(), {
              treeNumber: Number(sgEntry.commitment.treeId),
              leafIndex: Number(sgEntry.commitment.leafIndex),
              status: sgEntry.commitment.approved ? "approved" : "rejected",
            });
            updated = true;
          } catch (error) {
            console.error(`Failed to update entry ${sgEntry.entryId}:`, error);
          }
        }
      }
      if (updated) {
        refetchEntries();
      }
    }

    syncFromSubgraph();
  }, [subgraphData, shieldedPool, entries, refetchEntries]);

  if (!address) {
    return <p className="text-sm text-muted-foreground">Connect your wallet to view wormhole transfers.</p>;
  }

  if (isShieldedPoolLoading || isEntriesLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading wormhole transfers...</span>
      </div>
    );
  }

  if (!entries?.length) {
    return <p className="text-sm text-muted-foreground">No wormhole transfers found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Entry ID</TableHead>
          <TableHead>Token</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="text-right">Tree / Leaf</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(entries ?? []).map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono">{entry.entryId}</TableCell>
            <TableCell className="font-mono">{formatAddress(entry.entry.token)}</TableCell>
            <TableCell className="font-mono">{formatAddress(entry.entry.from)}</TableCell>
            <TableCell className="font-mono">{formatAddress(entry.entry.to)}</TableCell>
            <TableCell className="text-right font-mono">{formatUnits(BigInt(entry.entry.amount), 18)}</TableCell>
            <TableCell className="flex justify-center text-right">
              <div className="flex items-center gap-2 justify-center w-24">
                <StatusBadge status={entry.status} />
                {entry.status === "pending" && isSubgraphLoading && <Loader2 className="size-4 animate-spin" />}
              </div>
            </TableCell>
            <TableCell className="text-right font-mono">
              {entry.status !== "pending"
                ? `${entry.treeNumber} / ${entry.leafIndex}`
                : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
