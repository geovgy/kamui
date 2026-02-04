import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts"
import { EIP712DomainChanged } from "../generated/schema"
import { EIP712DomainChanged as EIP712DomainChangedEvent } from "../generated/Kamui/Kamui"
import { handleEIP712DomainChanged } from "../src/kamui"
import { createEIP712DomainChangedEvent } from "./kamui-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let newEIP712DomainChangedEvent = createEIP712DomainChangedEvent()
    handleEIP712DomainChanged(newEIP712DomainChangedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("EIP712DomainChanged created and stored", () => {
    assert.entityCount("EIP712DomainChanged", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
