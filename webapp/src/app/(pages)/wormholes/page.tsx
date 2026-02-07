import { WormholesTable } from "@/src/components/wormhole-table";

export default function WormholesPage() {
  return (
    <div className="w-full mx-auto py-8 px-12">
      <h1 className="text-2xl font-bold">Wormhole Transfers</h1>
      <p className="text-sm text-muted-foreground">Track your zk-wormhole transfers and their on-chain status.</p>
      <div className="mt-8">
        <WormholesTable />
      </div>
    </div>
  );
}
