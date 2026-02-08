import { WormholesTable } from "@/src/components/wormhole-table";
import { Clock, ShieldCheck, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

export default function WormholesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-6">
      {/* Table Section */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-lg font-semibold">My Wormhole Transfers</h2>
          <p className="text-sm text-muted-foreground">View and track the status of your wormhole transfers</p>
        </div>
        <WormholesTable />
      </div>
    </div>
  );
}
