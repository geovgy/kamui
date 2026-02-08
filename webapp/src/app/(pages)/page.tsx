import { AssetsTable } from "@/src/components/asset-table";
import { CreateAssetDialog } from "@/src/components/create-asset-dialog";
import { Button } from "@/src/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="w-full mx-auto py-8 px-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Available Assets</h1>
          <p className="text-sm text-muted-foreground">These are the assets that support zk-wormholes and shielded transfers.</p>
        </div>
        <CreateAssetDialog
          trigger={
            <Button className="rounded-full">
              <PlusIcon className="size-4 mr-2" />
              Create Asset
            </Button>
          }
        />
      </div>
      <div className="mt-8">
        <AssetsTable />
      </div>
    </div>
  );
}