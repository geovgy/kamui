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

// Mock data for available assets
const assets = [
  { id: 1, name: "kwETH", type: "Vault", accepts: "ETH", inWallet: 0, inPrivateWallet: 0 },
  { id: 2, name: "kwETH", type: "Vault", accepts: "ETH", inWallet: 0, inPrivateWallet: 0 },
  { id: 3, name: "kwETH", type: "Vault", accepts: "ETH", inWallet: 0, inPrivateWallet: 0 },
  { id: 4, name: "kwETH", type: "Vault", accepts: "ETH", inWallet: 0, inPrivateWallet: 0 },
];

export function AssetsTable() {
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
        {assets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.name}</TableCell>
            <TableCell>{asset.type}</TableCell>
            <TableCell>{asset.accepts}</TableCell>
            <TableCell className="text-center">{asset.inWallet}</TableCell>
            <TableCell className="text-center">{asset.inPrivateWallet}</TableCell>
            <TableCell className="text-right">
              <AssetDialog
                asset={asset}
                trigger={
                  <Button variant="outline" className="rounded-full px-8">
                    View
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