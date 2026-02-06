import { useContext } from "react"
import { ZKProverContext } from "../context/zk-prover"
import { useMutation } from "@tanstack/react-query"
import { InputMap } from "@noir-lang/noir_js"
import { CircuitType, ZKProver } from "@/src/zk-prover"

export const useZKProverContext = () => {
  const context = useContext(ZKProverContext)
  if (!context) {
    throw new Error("hook must be used within a ZKProverProvider")
  }
  return context
}

export function useProve(circuitType: CircuitType) {
  const prover = new ZKProver(circuitType)

  return useMutation({
    mutationFn: async (inputs: InputMap) => {
      return await prover.prove(inputs)
    }
  })
}