import { useCallback, useEffect, useState } from 'react'
import { Abi } from 'abitype'
import {
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from 'wagmi'

type CollectionInteractionResponse = {
  prepareConfig: any
  prepareError: any
  writeData: any
  write: any
}

export default function useCollectionInteractions(
  address: string,
  tokenId: string,
  functionName: string,
  abi: Abi,
  args: any,
  overrides?: any
) {
  const [func, setFunc] = useState<CollectionInteractionResponse | undefined>()

  const { config, error } = usePrepareContractWrite({
    address,
    abi,
    functionName,
    args,
    overrides,
  })

  const { data: callResponse, write } = useContractWrite(config)

  const onCall = useCallback(() => {
    if (write) {
      write()
    }
  }, [write])

  return {
    prepareConfig: config,
    prepareError: error,
    writeData: callResponse,
    write,
    execCollectionInteraction: onCall,
  }
}
