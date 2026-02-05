"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { WrapInnerDialogContent } from "./tx-states/wrap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UnwrapInnerDialogContent } from "./tx-states/unwrap";

interface AssetDialogProps {
  asset: {
    name: string;
    accepts: string;
  };
  trigger: React.ReactNode;
}

export function AssetDialog({ asset, trigger }: AssetDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <Tabs>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="wrap">Wrap</TabsTrigger>
            <TabsTrigger value="unwrap">Unwrap</TabsTrigger>
          </TabsList>
          <TabsContent value="wrap">
            <DialogHeader className="mb-4">
              <DialogTitle>Deposit / Wrap</DialogTitle>
            </DialogHeader>
            <WrapInnerDialogContent wormholeAsset={asset} underlyingAsset={{ name: "ETH", accepts: "ETH" }} />
          </TabsContent>
          <TabsContent value="unwrap">
            <DialogHeader className="mb-4">
              <DialogTitle>Withdraw / Unwrap</DialogTitle>
            </DialogHeader>
            <UnwrapInnerDialogContent wormholeAsset={asset} underlyingAsset={{ name: "ETH", accepts: "ETH" }} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
