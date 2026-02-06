// UI to send a wormhole and shielded transfer
"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "./ui/input-group";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useProve } from "@/src/hooks/use-zk-provers";
import { WormholeNote, WormholeAsset, BalanceInfo } from "@/src/types";
import { getWormholeBurnCommitment } from "@/src/joinsplits";
import { getMerkleTree } from "@/src/merkle";
import { MERKLE_TREE_DEPTH } from "@/src/constants";
import { Loader2 } from "lucide-react";

type BalanceSource = "private" | "public";

export function TransferDialog({ trigger, wormholeAsset, balances }: { trigger: React.ReactNode, wormholeAsset: WormholeAsset, balances: BalanceInfo }) {
  const { publicBalance, privateBalance } = balances;
  const { mutateAsync: prove } = useProve("ragequit");

  const [isProving, setIsProving] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [fundsSource, setFundsSource] = useState<BalanceSource>("private");
  const [fundsDestination, setFundsDestination] = useState<BalanceSource>("private");
  
  const transferDescription = useMemo(() => {
    if (!recipientInput.trim() && !amountInput.trim()) {
      return "Please enter a recipient address and amount to send";
    }
    if (!recipientInput.trim()) {
      return "Please enter a recipient address";
    }
    if (!amountInput.trim()) {
      return "Please enter an amount to send";
    }
    if (fundsSource === "public" && fundsDestination === "private") {
      return `Shield ${amountInput} ${wormholeAsset.symbol} to them via zk-wormhole`;
    } else if (fundsSource === "private" && fundsDestination === "public") {
      return `Unshield ${amountInput} ${wormholeAsset.symbol} to them`;
    } else if (fundsSource === "public" && fundsDestination === "public") {
      return `Send ${amountInput} ${wormholeAsset.symbol} to them as public transfer`;
    } else {
      return `Send ${amountInput} ${wormholeAsset.symbol} to them via shielded transfer`;
    }
  }, [recipientInput, amountInput, fundsSource, fundsDestination, wormholeAsset.symbol]);

  // DELETE: This is just a test
  const handleGenerateZKP = async () => {
    setIsProving(true);
    try {
      const wormholeSecret = 42069n;
      const wormholeNote: WormholeNote = {
        recipient: "0x0000000000000000000000000000000000000000",
        wormhole_secret: wormholeSecret,
        asset_id: 1n,
        sender: "0x0000000000000000000000000000000000000000",
        amount: BigInt(100e18),
      };

      const burnCommitment = getWormholeBurnCommitment({
        ...wormholeNote,
        approved: false,
      });

      const wormholeTree = getMerkleTree([burnCommitment]);

      const wormholeProof = wormholeTree.generateProof(0);

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
        wormhole_leaf_siblings: wormholeProof.siblings
          .map((sibling) => sibling.toString())
          .concat(
            Array(MERKLE_TREE_DEPTH - wormholeProof.siblings.length).fill("0")
          ),
        is_approved: false,
      };

      console.log("Generating ZKP...");

      console.time("prove");
      const result = await prove(circuitInputs);
      console.timeEnd("prove");
      console.log(result);
    } catch (error) {
      console.error(error);
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

        <div className="flex flex-col gap-5">
          {/* To address input */}
          <Input
            placeholder="To address (ENS)"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
          />

          {/* Amount input */}
          <InputGroup className="h-12 rounded-full">
            <InputGroupInput
              type="text"
              placeholder="0"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value.replace(/[^0-9.]/g, ""));
              }}
              className="text-right text-xl focus:text-foreground"
            />
            <InputGroupAddon
              align="inline-end"
              className="pr-4 w-20 text-left justify-start"
            >
              <span className="font-medium text-foreground text-left">ETH</span>
            </InputGroupAddon>
          </InputGroup>

          {/* Funds source radio group */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Funds source</span>
            <RadioGroup
              value={fundsSource}
              onValueChange={(v) => setFundsSource(v as BalanceSource)}
              className="grid grid-cols-2 gap-0 rounded-md border"
            >
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-l-md px-4 py-3 text-sm transition-colors ${
                  fundsSource === "private"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="private" className="sr-only" />
                Private
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-r-md border-l px-4 py-3 text-sm transition-colors ${
                  fundsSource === "public"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                Public
              </label>
            </RadioGroup>
          </div>

          {/* Funds destination radio group */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Funds destination</span>
            <RadioGroup
              value={fundsDestination}
              onValueChange={(v) => setFundsDestination(v as BalanceSource)}
              className="grid grid-cols-2 gap-0 rounded-md border"
            >
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-l-md px-4 py-3 text-sm transition-colors ${
                  fundsDestination === "private"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="private" className="sr-only" />
                Private
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-r-md border-l px-4 py-3 text-sm transition-colors ${
                  fundsDestination === "public"
                    ? "bg-accent font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <RadioGroupItem value="public" className="sr-only" />
                Public
              </label>
            </RadioGroup>
          </div>

          {/* Send button */}
          <DialogFooter>
            <div className="flex flex-col gap-2 w-full items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {transferDescription}
              </span>
              <Button
                onClick={handleGenerateZKP}
                disabled={isProving}
                size="lg"
                className="w-full"
              >
                {isProving && <Loader2 className="size-4 animate-spin" />}
                Send
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}