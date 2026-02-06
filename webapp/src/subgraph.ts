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
        id
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
      id: string;
      from: string;
      to: string;
      token: string;
      tokenId: string;
      amount: string;
      blockTimestamp: string;
    }[]
  }>(query, {
    orderBy: "blockTimestamp",
    orderDirection: "asc",
    first: 100,
  });
}