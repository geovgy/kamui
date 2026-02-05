import { Prover } from "@/src/prover"
import { type QueryStatus, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useState } from "react"


export const ZKProverContext = createContext<{
  ragequitProver: Prover | undefined
  utxoProver: Prover | undefined
  status: QueryStatus
  isInitialized: boolean
  isLoading: boolean
  initialize: () => Promise<void>
}>({
  ragequitProver: undefined,
  utxoProver: undefined,
  status: 'pending',
  isInitialized: false,
  isLoading: false,
  initialize: async () => {}
})

export const ZKProverProvider = ({ children }: { children: React.ReactNode }) => {
  
  const { data, status, refetch, isLoading } = useQuery({
    queryKey: ['zk-provers'],
    queryFn: async () => {
      const ragequitProver = new Prover('ragequit')
      const utxoProver = new Prover('utxo_2x2')
      
      await Promise.all([ragequitProver.init(), utxoProver.init()])
      return { ragequitProver, utxoProver }
    }
  })
  const isInitialized = status === 'success'
  return (
    <ZKProverContext.Provider value={{
      ragequitProver: data?.ragequitProver,
      utxoProver: data?.utxoProver,
      status,
      isInitialized,
      isLoading,
      initialize: async () => await refetch().then(() => {})
    }}>
      {children}
    </ZKProverContext.Provider>
  )
}