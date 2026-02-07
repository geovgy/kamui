import { Address, Hex, numberToHex } from "viem";
import { subgraphQuery } from "./subgraph";

export async function queryTrees(args: {
  wormholeTreeId: number,
  shieldedTreeId: number,
}): Promise<{
  wormholeTree: {
    id: number;
    leaves: bigint[];
    size: number;
    createdAt: number;
    updatedAt: number;
  } | null
  shieldedTree: {
    id: number;
    leaves: bigint[];
    size: number;
    createdAt: number;
    updatedAt: number;
  } | null
}> {
  const wormholeTreeId = numberToHex(args.wormholeTreeId)
  const shieldedTreeId = numberToHex(args.shieldedTreeId)
  const query = 
  `
    query Trees($wormholeTreeIds: Bytes!, $shieldedTreeIds: Bytes!) {
      wormholeTree(id: $wormholeTreeId) {
        id
        leaves
        size
        createdAt
        updatedAt
      }
      shieldedTree(id: $shieldedTreeId) {
        id
        leaves
        size
        createdAt
        updatedAt
      }
    }
  `;
  return subgraphQuery<{
    wormholeTree: {
      id: number;
      leaves: bigint[];
      size: number;
      createdAt: number;
      updatedAt: number;
    } | null
    shieldedTree: {
      id: number;
      leaves: bigint[];
      size: number;
      createdAt: number;
      updatedAt: number;
    } | null
  }>(query, { wormholeTreeId, shieldedTreeId });
}

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

export async function queryWormholeEntriesByAddress(args?: {
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
    query WormholeEntriesByAddress($orderBy: String!, $orderDirection: String!, $from: Bytes, $to: Bytes) {
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

export async function queryWormholeEntriesByEntryIds(args?: {
  entryIds: bigint[],
  orderDirection?: "asc" | "desc",
}) {
  const { entryIds, orderDirection } = args ?? {};
  const variables = {
    entryIds: entryIds,
    orderBy: "blockTimestamp",
    orderDirection: orderDirection,
  };
  const query = 
  `
    query WormholeEntriesByEntryIds($orderBy: String!, $orderDirection: String!, $entryIds: [BigInt!]) {
      wormholeEntries(
        where: { entryId_in: $entryIds }
        orderBy: $orderBy
        orderDirection: $orderDirection
      ) {
        entryId
        submitted
        commitment {
          commitment
          treeId
          leafIndex
          assetId
          from
          to
          amount
          approved
          submittedBy
          blockTimestamp
          transactionHash
        }
        blockTimestamp
        transactionHash
      }
    }
  `;
  return subgraphQuery<{
    wormholeEntries: {
      id: string;
      entryId: bigint;
      submitted: boolean;
      commitment: {
        commitment: bigint;
        treeId: bigint;
        leafIndex: bigint;
        assetId: Address;
        from: Address;
        to: Address;
        amount: bigint;
        approved: boolean;
        submittedBy: Address;
      } | null;
      blockTimestamp: bigint;
      transactionHash: Hex;
    }[]
  }>(query, variables);
}