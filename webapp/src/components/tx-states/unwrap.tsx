"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { Switch } from "@/src/components/ui/switch";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";

// UI to wrap/unwrap the underlying asset of wormhole assets
export function UnwrapInnerDialogContent({ wormholeAsset, underlyingAsset }: {
  wormholeAsset: { name: string; accepts: string }, // TODO: change to token address, implementation address/type, 
  underlyingAsset: { name: string; accepts: string } // TODO: change to token address
}) {
  const [amount, setAmount] = useState("100");
  const [amountRequestType, setAmountRequestType] = useState<"exact-input" | "exact-output">("exact-input");
  const [wormholeTransfer, setWormholeTransfer] = useState(false);

  const inputAmount = useMemo(() => {
    if (amountRequestType === "exact-input") {
      return amount;
    } else {
      return ((parseFloat(amount) || 0) * (1 - 0.1));
    }
  }, [amount, amountRequestType]);

  // Mock calculation - in real app this would come from a price feed
  const outputAmount = useMemo(() => {
    if (amountRequestType === "exact-output") {
      return amount;
    } else {
      return ((parseFloat(amount) || 0) * (1 + 0.1));
    }
  }, [amount, amountRequestType]);

  return (
      <>
        <div className="flex flex-col gap-4">
          {/* Input amount field */}
          <InputGroup className="h-12 rounded-full">
            <InputGroupInput
              type="text"
              placeholder="0"
              value={inputAmount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                setAmountRequestType("exact-input");
              }}
              className={`text-right text-lg ${amountRequestType === "exact-input" ? "text-foreground" : "text-muted-foreground"} focus:text-foreground`}
            />
            <InputGroupAddon align="inline-end" className="pr-4">
              <div className="w-20 flex items-center gap-2">
                <div className="size-6 rounded-full border border-current" />
                <span className="font-medium text-foreground">
                  {wormholeAsset.accepts}
                </span>
              </div>
            </InputGroupAddon>
          </InputGroup>

          {/* Output amount display */}
          <InputGroup className="h-12 rounded-full bg-muted/50">
            <InputGroupInput
              type="text"
              value={outputAmount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                setAmountRequestType("exact-output");
              }}
              className={`text-right text-lg ${amountRequestType === "exact-output" ? "text-foreground" : "text-muted-foreground"} focus:text-foreground`}
            />
            <InputGroupAddon align="inline-end" className="pr-4">
              <div className="w-20 flex items-center gap-2">
                <div className="size-6 rounded-full border border-current" />
                <span className="font-medium text-foreground">{wormholeAsset.name}</span>
              </div>
            </InputGroupAddon>
          </InputGroup>

          {/* Send button */}
          <Button variant="outline" className="w-full h-12 rounded-full text-base">
            Send
          </Button>
        </div>
      </>
  );
}
