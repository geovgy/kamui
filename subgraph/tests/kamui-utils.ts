import { newMockEvent } from "matchstick-as"
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import {
  EIP712DomainChanged,
  OwnershipTransferred,
  PoolCreated,
  PoolImplementationSet,
  Ragequit,
  ShieldedTransfer,
  VerifierAdded,
  WormholeApproverSet,
  WormholeCommitment,
  WormholeEntry,
  WormholeNullifier
} from "../generated/Kamui/Kamui"

export function createEIP712DomainChangedEvent(): EIP712DomainChanged {
  let eip712DomainChangedEvent = changetype<EIP712DomainChanged>(newMockEvent())

  eip712DomainChangedEvent.parameters = new Array()

  return eip712DomainChangedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPoolCreatedEvent(
  pool: Address,
  implementation: Address,
  asset: Address,
  initData: Bytes
): PoolCreated {
  let poolCreatedEvent = changetype<PoolCreated>(newMockEvent())

  poolCreatedEvent.parameters = new Array()

  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("pool", ethereum.Value.fromAddress(pool))
  )
  poolCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "implementation",
      ethereum.Value.fromAddress(implementation)
    )
  )
  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  poolCreatedEvent.parameters.push(
    new ethereum.EventParam("initData", ethereum.Value.fromBytes(initData))
  )

  return poolCreatedEvent
}

export function createPoolImplementationSetEvent(
  implementation: Address,
  isApproved: boolean
): PoolImplementationSet {
  let poolImplementationSetEvent =
    changetype<PoolImplementationSet>(newMockEvent())

  poolImplementationSetEvent.parameters = new Array()

  poolImplementationSetEvent.parameters.push(
    new ethereum.EventParam(
      "implementation",
      ethereum.Value.fromAddress(implementation)
    )
  )
  poolImplementationSetEvent.parameters.push(
    new ethereum.EventParam(
      "isApproved",
      ethereum.Value.fromBoolean(isApproved)
    )
  )

  return poolImplementationSetEvent
}

export function createRagequitEvent(
  entryId: BigInt,
  quitter: Address,
  returnedTo: Address,
  asset: Address,
  id: BigInt,
  amount: BigInt
): Ragequit {
  let ragequitEvent = changetype<Ragequit>(newMockEvent())

  ragequitEvent.parameters = new Array()

  ragequitEvent.parameters.push(
    new ethereum.EventParam(
      "entryId",
      ethereum.Value.fromUnsignedBigInt(entryId)
    )
  )
  ragequitEvent.parameters.push(
    new ethereum.EventParam("quitter", ethereum.Value.fromAddress(quitter))
  )
  ragequitEvent.parameters.push(
    new ethereum.EventParam(
      "returnedTo",
      ethereum.Value.fromAddress(returnedTo)
    )
  )
  ragequitEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  ragequitEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  ragequitEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return ragequitEvent
}

export function createShieldedTransferEvent(
  treeId: BigInt,
  startIndex: BigInt,
  commitments: Array<BigInt>,
  nullifiers: Array<Bytes>,
  withdrawals: Array<ethereum.Tuple>
): ShieldedTransfer {
  let shieldedTransferEvent = changetype<ShieldedTransfer>(newMockEvent())

  shieldedTransferEvent.parameters = new Array()

  shieldedTransferEvent.parameters.push(
    new ethereum.EventParam("treeId", ethereum.Value.fromUnsignedBigInt(treeId))
  )
  shieldedTransferEvent.parameters.push(
    new ethereum.EventParam(
      "startIndex",
      ethereum.Value.fromUnsignedBigInt(startIndex)
    )
  )
  shieldedTransferEvent.parameters.push(
    new ethereum.EventParam(
      "commitments",
      ethereum.Value.fromUnsignedBigIntArray(commitments)
    )
  )
  shieldedTransferEvent.parameters.push(
    new ethereum.EventParam(
      "nullifiers",
      ethereum.Value.fromFixedBytesArray(nullifiers)
    )
  )
  shieldedTransferEvent.parameters.push(
    new ethereum.EventParam(
      "withdrawals",
      ethereum.Value.fromTupleArray(withdrawals)
    )
  )

  return shieldedTransferEvent
}

export function createVerifierAddedEvent(
  verifier: Address,
  inputs: BigInt,
  outputs: BigInt
): VerifierAdded {
  let verifierAddedEvent = changetype<VerifierAdded>(newMockEvent())

  verifierAddedEvent.parameters = new Array()

  verifierAddedEvent.parameters.push(
    new ethereum.EventParam("verifier", ethereum.Value.fromAddress(verifier))
  )
  verifierAddedEvent.parameters.push(
    new ethereum.EventParam("inputs", ethereum.Value.fromUnsignedBigInt(inputs))
  )
  verifierAddedEvent.parameters.push(
    new ethereum.EventParam(
      "outputs",
      ethereum.Value.fromUnsignedBigInt(outputs)
    )
  )

  return verifierAddedEvent
}

export function createWormholeApproverSetEvent(
  approver: Address,
  isApprover: boolean
): WormholeApproverSet {
  let wormholeApproverSetEvent = changetype<WormholeApproverSet>(newMockEvent())

  wormholeApproverSetEvent.parameters = new Array()

  wormholeApproverSetEvent.parameters.push(
    new ethereum.EventParam("approver", ethereum.Value.fromAddress(approver))
  )
  wormholeApproverSetEvent.parameters.push(
    new ethereum.EventParam(
      "isApprover",
      ethereum.Value.fromBoolean(isApprover)
    )
  )

  return wormholeApproverSetEvent
}

export function createWormholeCommitmentEvent(
  entryId: BigInt,
  commitment: BigInt,
  treeId: BigInt,
  leafIndex: BigInt,
  assetId: Bytes,
  from: Address,
  to: Address,
  amount: BigInt,
  approved: boolean
): WormholeCommitment {
  let wormholeCommitmentEvent = changetype<WormholeCommitment>(newMockEvent())

  wormholeCommitmentEvent.parameters = new Array()

  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam(
      "entryId",
      ethereum.Value.fromUnsignedBigInt(entryId)
    )
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam(
      "commitment",
      ethereum.Value.fromUnsignedBigInt(commitment)
    )
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("treeId", ethereum.Value.fromUnsignedBigInt(treeId))
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam(
      "leafIndex",
      ethereum.Value.fromUnsignedBigInt(leafIndex)
    )
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("assetId", ethereum.Value.fromFixedBytes(assetId))
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  wormholeCommitmentEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return wormholeCommitmentEvent
}

export function createWormholeEntryEvent(
  entryId: BigInt,
  token: Address,
  from: Address,
  to: Address,
  id: BigInt,
  amount: BigInt
): WormholeEntry {
  let wormholeEntryEvent = changetype<WormholeEntry>(newMockEvent())

  wormholeEntryEvent.parameters = new Array()

  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam(
      "entryId",
      ethereum.Value.fromUnsignedBigInt(entryId)
    )
  )
  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  wormholeEntryEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return wormholeEntryEvent
}

export function createWormholeNullifierEvent(
  nullifier: Bytes
): WormholeNullifier {
  let wormholeNullifierEvent = changetype<WormholeNullifier>(newMockEvent())

  wormholeNullifierEvent.parameters = new Array()

  wormholeNullifierEvent.parameters.push(
    new ethereum.EventParam(
      "nullifier",
      ethereum.Value.fromFixedBytes(nullifier)
    )
  )

  return wormholeNullifierEvent
}
