"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Address } from "viem";
import { cn } from "@/src/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";

interface AddressProps extends React.HTMLAttributes<HTMLSpanElement> {
  address: Address;
  truncate?: boolean;
  showCopy?: boolean;
  copyTooltip?: string;
  prefixLength?: number;
  suffixLength?: number;
}

export function EthAddress({
  address,
  truncate = true,
  showCopy = true,
  copyTooltip = "Copy address",
  prefixLength = 6,
  suffixLength = 4,
  className,
  ...props
}: AddressProps) {
  const [copied, setCopied] = React.useState(false);

  const displayAddress = React.useMemo(() => {
    if (!truncate) return address;
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
  }, [address, truncate, prefixLength, suffixLength]);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [address]);

  const content = (
    <span
      className={cn(
        "font-mono inline-flex items-center gap-1.5",
        className
      )}
      {...props}
    >
      <span>{displayAddress}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          aria-label={copied ? "Copied" : copyTooltip}
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      )}
    </span>
  );

  if (!showCopy) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="group inline-flex items-center cursor-pointer">
            {content}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <p className="font-mono text-xs">{address}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AddressList({
  addresses,
  className,
  ...props
}: {
  addresses: Address[];
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {addresses.map((address, index) => (
        <EthAddress key={`${address}-${index}`} address={address} />
      ))}
    </div>
  );
}

export function formatAddress(
  address: Address,
  options: { prefixLength?: number; suffixLength?: number } = {}
): string {
  const { prefixLength = 6, suffixLength = 4 } = options;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}
