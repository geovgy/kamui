import type { Address } from "viem";
import { SUBGRAPH_URL } from "./env";

export async function subgraphQuery<T>(queryString: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: queryString, variables }),
  });

  const json = (await response.json()) as { data?: T | null; errors?: unknown[] };
  if (!json.data || json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors ?? "No data returned")}`);
  }
  return json.data;
}

export async function queryPendingWormholeEntries() {
  const query = 
  `
    query WormholeEntriesPending($orderBy: String!, $orderDirection: String!, $first: Int!) {
      wormholeEntries(
        where: { submitted: false },
        orderBy: $orderBy,
        orderDirection: $orderDirection,
        first: $first,
      ) {
        entryId
        from
        to
        token
        tokenId
        amount
        blockTimestamp
      }
    }
  `;
  return subgraphQuery<{
    wormholeEntries: {
      entryId: bigint;
      from: Address;
      to: Address;
      token: Address;
      tokenId: bigint;
      amount: bigint;
      blockTimestamp: bigint;
    }[]
  }>(query, {
    orderBy: "blockTimestamp",
    orderDirection: "asc",
    first: 100,
  });
}