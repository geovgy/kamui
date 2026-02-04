import {
  EIP712DomainChanged as EIP712DomainChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PoolCreated as PoolCreatedEvent,
  PoolImplementationSet as PoolImplementationSetEvent,
  Ragequit as RagequitEvent,
  ShieldedTransfer as ShieldedTransferEvent,
  VerifierAdded as VerifierAddedEvent,
  WormholeApproverSet as WormholeApproverSetEvent,
  WormholeCommitment as WormholeCommitmentEvent,
  WormholeEntry as WormholeEntryEvent,
  WormholeNullifier as WormholeNullifierEvent
} from "../generated/Kamui/Kamui"
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
} from "../generated/schema"
import { Bytes } from "@graphprotocol/graph-ts"

export function handleEIP712DomainChanged(
  event: EIP712DomainChangedEvent
): void {
  let entity = new EIP712DomainChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolCreated(event: PoolCreatedEvent): void {
  let entity = new PoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.pool = event.params.pool
  entity.implementation = event.params.implementation
  entity.asset = event.params.asset
  entity.initData = event.params.initData

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolImplementationSet(
  event: PoolImplementationSetEvent
): void {
  let entity = new PoolImplementationSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.implementation = event.params.implementation
  entity.isApproved = event.params.isApproved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRagequit(event: RagequitEvent): void {
  let entity = new Ragequit(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.entryId = event.params.entryId
  entity.quitter = event.params.quitter
  entity.returnedTo = event.params.returnedTo
  entity.asset = event.params.asset
  entity.internal_id = event.params.id
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleShieldedTransfer(event: ShieldedTransferEvent): void {
  let entity = new ShieldedTransfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.treeId = event.params.treeId
  entity.startIndex = event.params.startIndex
  entity.commitments = event.params.commitments
  entity.nullifiers = event.params.nullifiers
  entity.withdrawals = changetype<Bytes[]>(event.params.withdrawals)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVerifierAdded(event: VerifierAddedEvent): void {
  let entity = new VerifierAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.verifier = event.params.verifier
  entity.inputs = event.params.inputs
  entity.outputs = event.params.outputs

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWormholeApproverSet(
  event: WormholeApproverSetEvent
): void {
  let entity = new WormholeApproverSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.approver = event.params.approver
  entity.isApprover = event.params.isApprover

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWormholeCommitment(event: WormholeCommitmentEvent): void {
  let entity = new WormholeCommitment(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.entryId = event.params.entryId
  entity.commitment = event.params.commitment
  entity.treeId = event.params.treeId
  entity.leafIndex = event.params.leafIndex
  entity.assetId = event.params.assetId
  entity.from = event.params.from
  entity.to = event.params.to
  entity.amount = event.params.amount
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWormholeEntry(event: WormholeEntryEvent): void {
  let entity = new WormholeEntry(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.entryId = event.params.entryId
  entity.token = event.params.token
  entity.from = event.params.from
  entity.to = event.params.to
  entity.internal_id = event.params.id
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWormholeNullifier(event: WormholeNullifierEvent): void {
  let entity = new WormholeNullifier(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.nullifier = event.params.nullifier

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
