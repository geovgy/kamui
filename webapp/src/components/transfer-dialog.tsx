// UI to send a wormhole and shielded transfer
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "./ui/button";
import { useProve } from "@/src/hooks/use-zk-provers";
import { WormholeNote } from "@/src/types";
import { getWormholeBurnCommitment } from "@/src/joinsplits";
import { getMerkleTree } from "@/src/merkle";
import { MERKLE_TREE_DEPTH } from "@/src/constants";
import { Loader2 } from "lucide-react";


export function TransferDialog({ trigger }: { trigger: React.ReactNode }) {
  const { mutateAsync: prove } = useProve("ragequit");

  const [isProving, setIsProving] = useState(false);

  // TODO: Add a form to input the transfer details

  // DELETE: This is just a test
  const handleGenerateZKP = async () => {
    setIsProving(true);
    try {
      const wormholeSecret = 42069n
      const wormholeNote: WormholeNote = {
        recipient: "0x0000000000000000000000000000000000000000",
        wormhole_secret: wormholeSecret,
        asset_id: 1n,
        sender: "0x0000000000000000000000000000000000000000",
        amount: BigInt(100e18),
      }

      const burnCommitment = getWormholeBurnCommitment({
        ...wormholeNote,
        approved: false,
      })

      const wormholeTree = getMerkleTree([burnCommitment])

      const wormholeProof = wormholeTree.generateProof(0)

      const circuitInputs = {
        wormhole_root: wormholeTree.root.toString(),
        wormhole_note: { 
          recipient: wormholeNote.recipient.toString(), 
          wormhole_secret: wormholeNote.wormhole_secret.toString(), 
          asset_id: wormholeNote.asset_id.toString(), 
          sender: wormholeNote.sender.toString(), 
          amount: wormholeNote.amount.toString(), 
        },
        wormhole_leaf_index: wormholeProof.index.toString(),
        wormhole_leaf_siblings: wormholeProof.siblings.map(sibling => sibling.toString()).concat(Array(MERKLE_TREE_DEPTH - wormholeProof.siblings.length).fill("0")),
        is_approved: false,
      }

      console.log("Generating ZKP...")

      console.time("prove")
      const result = await prove(circuitInputs)
      console.timeEnd("prove")
      console.log(result)
    } catch (error) {
      console.error(error)
    }
    setIsProving(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            Send a zk-wormhole, shielded or normal transfer.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleGenerateZKP} disabled={isProving}>
          {isProving && <Loader2 className="size-4 animate-spin" />}
          Generate ZKP
        </Button>
      </DialogContent>
    </Dialog>
  );
}