import { ZKProver } from "@/src/zk-prover"
import { type QueryStatus, useQuery } from "@tanstack/react-query"
import { createContext } from "react"


export const ZKProverContext = createContext<{
  ragequitProver: ZKProver | undefined
  utxoProver: ZKProver | undefined
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
      const ragequitProver = new ZKProver('ragequit')
      const utxoProver = new ZKProver('utxo_2x2')
      
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