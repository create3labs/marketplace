import React, { FC, ComponentProps } from 'react'
import { constants } from 'ethers'
import FormatCrypto from '../rkFormatCrypto/RkFormatCrypto'
import CryptoCurrencyIcon from '../rkCryptoCurrencyIcon/RkCryptoCurrencyIcon'

type FormatCryptoCurrencyProps = {
  logoWidth?: number
  address?: string
}

type Props = ComponentProps<typeof FormatCrypto> & FormatCryptoCurrencyProps

const RkFormatCryptoCurrency: FC<Props> = ({
  amount,
  address = constants.AddressZero,
  maximumFractionDigits,
  logoWidth = 14,
  textStyle,
  css,
  textColor,
  decimals,
}) => {
  return (
    <FormatCrypto
      css={css}
      textColor={textColor}
      textStyle={textStyle}
      amount={amount}
      maximumFractionDigits={maximumFractionDigits}
      decimals={decimals}
    >
      <CryptoCurrencyIcon css={{ height: logoWidth }} address={address} />
    </FormatCrypto>
  )
}

export default RkFormatCryptoCurrency
