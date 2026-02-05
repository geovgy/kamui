import { AssetsTable } from "@/src/components/asset-table";

export default function Home() {
  return (
    <div className="w-full mx-auto py-8 px-12">
      <h1 className="text-2xl font-bold">Available Assets</h1>
      <p className="text-sm text-muted-foreground">These are the assets that support zk-wormholes and shielded transfers.</p>
      <div className="mt-8">
        <AssetsTable />
      </div>
    </div>
  );
}