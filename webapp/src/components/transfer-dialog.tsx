// UI to send a wormhole and shielded transfer
"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";


export function TransferDialog({ trigger }: { trigger: React.ReactNode }) {
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
      </DialogContent>
    </Dialog>
  );
}