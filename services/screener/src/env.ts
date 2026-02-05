import { isAddress } from "viem";

export const SUBGRAPH_URL = process.env.SUBGRAPH_URL!;

export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;

export const PRIVATE_KEY = process.env.PRIVATE_KEY!;

if (!SUBGRAPH_URL) {
  throw new Error("SUBGRAPH_URL must be set");
}

if (!CONTRACT_ADDRESS || !isAddress(CONTRACT_ADDRESS)) {
  throw new Error("CONTRACT_ADDRESS must be set and a valid address");
}