import React, { FC, ComponentProps } from 'react'
import { useNetwork } from 'wagmi'
import FormatCrypto from '../rkFormatCrypto/RkFormatCrypto'
import wrappedContracts from '../../../constants/wrappedContracts'
import { RkFormatCryptoCurrency } from '../index'

type FormatWEthProps = {
  logoWidth?: number
}

type Props = ComponentProps<typeof FormatCrypto> & FormatWEthProps

const FormatWrappedCurrency: FC<Props> = ({ logoWidth, ...props }) => {
  const { chain: activeChain, chains } = useNetwork()
  let chain = chains.find((chain) => activeChain?.id === chain.id)

  if (!chain && chains.length > 0) {
    chain = chains[0]
  } else {
    chain = activeChain
  }

  const contractAddress =
    chain?.id !== undefined && chain.id in wrappedContracts
      ? wrappedContracts[chain.id]
      : wrappedContracts[45000]

  return <RkFormatCryptoCurrency {...props} address={contractAddress} />
}

export default FormatWrappedCurrency
