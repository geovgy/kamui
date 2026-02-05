import { useContext } from "react"
import { ZKProverContext } from "../context/prover"

export const useZKProverContext = () => {
  const context = useContext(ZKProverContext)
  if (!context) {
    throw new Error("hook must be used within a ZKProverProvider")
  }
  return context
}

export const useRagequitProver = () => {
  const { ragequitProver } = useZKProverContext()
  return ragequitProver
}

export const useUTXOProver = () => {
  const { utxoProver } = useZKProverContext()
  return utxoProver
}