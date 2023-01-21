import React, { FC } from 'react'
import { constants } from 'ethers'
import { styled } from '../../../stitches.config'
import { StyledComponent } from '@stitches/react/types/styled-component'

type Props = {
  address: string
} & Parameters<StyledComponent>['0']

const StyledImg = styled('img', {})

const API_BASE =
  process.env.NEXT_PUBLIC_RESERVOIR_API_BASE || 'https://api.reservoir.tools'

const CryptoCurrencyIcon: FC<Props> = ({
  address = constants.AddressZero,
  css,
}) => {
  const logoUrl = `${API_BASE}/redirect/currency/${address}/icon/v1`

  return <StyledImg src={`${logoUrl}`} css={css} />
}

export default CryptoCurrencyIcon
