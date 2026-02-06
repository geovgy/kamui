import { Address, Hex } from "viem";
import { subgraphQuery } from "./subgraph";

export async function queryWormholeAssets() {
  const query = 
  `
    query WormholeAssets {
      wormholeAssets {
        id
        asset
        implementation {
          id
          address
          isApproved
          createdAt
          updatedAt
        }
        initData
        totalUnshielded
        createdAt
        startBlock
      }
    }
  `;
  return subgraphQuery<{
    wormholeAssets: {
      id: string;
      asset: Address;
      implementation: {
        id: string;
        address: Address;
        isApproved: boolean;
        createdAt: bigint;
        updatedAt: bigint;
      };
      initData: Hex;
      totalUnshielded: bigint;
      createdAt: bigint;
      startBlock: bigint;
    }[]
  }>(query, {});
}

export async function queryWormholeAssetImplementations() {
  const query = 
  `
    query WormholeAssetImplementations {
      wormholeAssetImplementations {
        id
        address
        isApproved
        wormholeAssets {
          id
          asset
          implementation
          initData
          totalUnshielded
          createdAt
          startBlock
        }
        createdAt
        updatedAt
      }
    }
  `;
  return subgraphQuery<{
    wormholeAssetImplementations: {
      id: string;
      address: Address;
      isApproved: boolean;
      wormholeAssets: {
        id: string;
        asset: Address;
        implementation: Address;
        initData: Hex;
        totalUnshielded: bigint;
        createdAt: bigint;
        startBlock: bigint;
      }[]
      createdAt: bigint;
      updatedAt: bigint;
    }[]
  }>(query, {});
}

export async function queryWormholeEntries(args?: {
  from?: Address,
  to?: Address,
  orderDirection?: "asc" | "desc",
}) {
  const { from, to, orderDirection } = args ?? {};
  const variables = {
    from: from,
    to: to,
    orderBy: "blockTimestamp",
    orderDirection: orderDirection,
  };
  const query = 
  `
    query WormholeEntries($orderBy: String!, $orderDirection: String!, $from: Bytes, $to: Bytes) {
      wormholeEntries(
        where: { from: $from, to: $to }
        orderBy: $orderBy
        orderDirection: $orderDirection
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
      from: Address;
      to: Address;
      token: Address;
      tokenId: bigint;
      amount: bigint;
      blockTimestamp: bigint;
    }[]
  }>(query, variables);
}