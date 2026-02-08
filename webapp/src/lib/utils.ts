import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatUnits } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBalance(
  balance: bigint,
  decimals = 18,
  options: { maximumFractionDigits?: number; showLessThan?: boolean } = {}
): string {
  const { maximumFractionDigits = 4, showLessThan = true } = options
  const formatted = formatUnits(balance, decimals)
  const num = parseFloat(formatted)
  
  if (num === 0) return "0"
  if (showLessThan && num < 1 / Math.pow(10, maximumFractionDigits)) {
    return `<${Math.pow(10, -maximumFractionDigits).toFixed(maximumFractionDigits).slice(1)}`
  }
  
  return num.toLocaleString(undefined, { maximumFractionDigits })
}
