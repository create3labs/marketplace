import React, { Dispatch, ReactElement, SetStateAction, useEffect } from 'react'
import {
  Flex,
  Box,
  Text,
  Anchor,
  Button,
  RkFormatCurrency,
  Loader,
  RkFormatCryptoCurrency,
  TokenLineItem,
} from '../../reservoirComponents'
import { AcceptBidProgress } from './AcceptBidProgress'
import { CustomReservoirModal } from '../CustomReservoirModal'
import {
  faCircleExclamation,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Fees from './Fees'
import { useNetwork } from 'wagmi'
import {
  AcceptBidModal,
  useReservoirClient,
} from '@reservoir0x/reservoir-kit-ui'
import useFallbackState from '../../../hooks/useFallbackState'
import useTimeSince from '../../../hooks/useTimeSince'
import { Execute } from '@reservoir0x/reservoir-kit-client'
import useEvmChain from '../../../hooks/useEvmChain'
import useCoinConversion from '../../../hooks/useCoinConversion'

type BidData = {
  tokenId?: string
  collectionId?: string
  txHash?: string
  maker?: string
}

export enum AcceptBidStep {
  Checkout,
  ApproveMarketplace,
  Confirming,
  Finalizing,
  Complete,
  Unavailable,
}

export type StepData = {
  totalSteps: number
  currentStep: Execute['steps'][0]
  currentStepItem?: NonNullable<Execute['steps'][0]['items']>[0]
}

type Props = Pick<Parameters<typeof CustomReservoirModal>['0'], 'trigger'> & {
  openState?: [boolean, Dispatch<SetStateAction<boolean>>]
  tokenId?: string
  collectionId?: string
  bidId?: string
  normalizeRoyalties?: boolean
  onBidAccepted?: (data: BidData) => void
  onClose?: () => void
  onBidAcceptError?: (error: Error, data: BidData) => void
  onCurrentStepUpdate?: (data: StepData) => void
}

function titleForStep(step: AcceptBidStep) {
  switch (step) {
    case AcceptBidStep.Unavailable:
      return 'Selected item is no longer available'
    default:
      return 'Accept Offer'
  }
}

//@dev - this is a hack to get the bid modal to work with custom properties.
// https://docs.reservoir.tools/docs/buying#custom-buymodal
// AcceptBidModalWrapper - Wraps AcceptBid.Custom and CustomReservoirModal | is https://github.com/reservoirprotocol/reservoir-kit/blob/3773ef2af129451a86c98cc15131158539b1b6c0/packages/ui/src/modal/acceptBid/AcceptBidModal.tsx
// AcceptBid.Custom - (Also Called Renderer - Data Layer Component) | is https://github.com/reservoirprotocol/reservoir-kit/blob/3773ef2af129451a86c98cc15131158539b1b6c0/packages/ui/src/modal/acceptBid/AcceptBidModalRenderer.tsx
// CustomReservoirModal - Actual Modal that renders front-end components | is https://github.com/reservoirprotocol/reservoir-kit/blob/main/packages/ui/src/modal/Modal.tsx

export function AcceptBidModalWrapper({
  openState,
  trigger,
  tokenId,
  collectionId,
  bidId,
  normalizeRoyalties,
  onBidAccepted,
  onClose,
  onBidAcceptError,
  onCurrentStepUpdate,
}: Props): ReactElement {
  const [open, setOpen] = useFallbackState(
    openState ? openState[0] : false,
    openState
  )
  const client = useReservoirClient()
  const { chain: activeChain } = useNetwork()

  return (
    <AcceptBidModal.Custom
      open={open}
      tokenId={tokenId}
      collectionId={collectionId}
      bidId={bidId}
      normalizeRoyalties={normalizeRoyalties}
    >
      {({
        token,
        collection,
        source,
        expiration,
        totalPrice,
        bidAmount,
        bidAmountCurrency,
        ethBidAmount,
        fees,
        acceptBidStep,
        transactionError,
        txHash,
        // totalUsd,
        // usdPrice,
        address,
        stepData,
        acceptBid,
      }) => {
        const title = titleForStep(acceptBidStep)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const evmChain = useEvmChain()
        const currencyName = evmChain?.nativeCurrency?.name ?? 'TXL'
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const usdPrice = useCoinConversion('USD', currencyName)
        const totalUsd = totalPrice * (usdPrice || 0)
        const etherscanBaseUrl =
          evmChain?.blockExplorers?.default?.url ||
          'https://explorer.autobahn.network/'

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (acceptBidStep === AcceptBidStep.Complete && onBidAccepted) {
            const data: BidData = {
              tokenId: tokenId,
              collectionId: collectionId,
              maker: address,
            }
            if (txHash) {
              data.txHash = txHash
            }
            onBidAccepted(data)
          }
        }, [acceptBidStep])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (transactionError && onBidAcceptError) {
            const data: BidData = {
              tokenId: tokenId,
              collectionId: collectionId,
              maker: address,
            }
            onBidAcceptError(transactionError, data)
          }
        }, [transactionError])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (stepData && onCurrentStepUpdate) {
            onCurrentStepUpdate(stepData)
          }
        }, [stepData])

        const floorPrice = token?.market?.floorAsk?.price?.amount?.native

        const difference =
          floorPrice && ethBidAmount
            ? ((floorPrice - ethBidAmount) / floorPrice) * 100
            : undefined

        const warning =
          difference && difference > 50
            ? `${difference}% lower than floor price`
            : undefined

        const marketplace = {
          name: (source?.name as string) || 'Marketplace',
          image: (source?.icon as string) || '',
        }

        const tokenImage =
          token?.token?.image || token?.token?.collection?.image

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const expires = useTimeSince(expiration)

        return (
          <CustomReservoirModal
            trigger={trigger}
            title={title}
            open={open}
            onOpenChange={(open) => setOpen(open)}
            loading={!token}
          >
            {acceptBidStep === AcceptBidStep.Unavailable && token && (
              <Flex direction="column">
                <TokenLineItem
                  tokenDetails={token}
                  collection={collection}
                  usdConversion={usdPrice || 0}
                  isUnavailable={true}
                  price={bidAmount}
                  warning={warning}
                  currency={bidAmountCurrency}
                  expires={expires}
                  isOffer={true}
                  sourceImg={source?.icon ? (source.icon as string) : undefined}
                />
                <Button onClick={() => setOpen(false)} css={{ m: '$4' }}>
                  Close
                </Button>
              </Flex>
            )}

            {acceptBidStep === AcceptBidStep.Checkout && token && (
              <Flex direction="column">
                {transactionError && (
                  <Flex
                    css={{
                      color: '$errorAccent',
                      p: '$4',
                      gap: '$2',
                      background: '$wellBackground',
                    }}
                    align="center"
                  >
                    <FontAwesomeIcon
                      icon={faCircleExclamation}
                      width={16}
                      height={16}
                    />
                    <Text style="body2" color="errorLight">
                      {transactionError.message}
                    </Text>
                  </Flex>
                )}
                <TokenLineItem
                  tokenDetails={token}
                  collection={collection}
                  usdConversion={usdPrice || 0}
                  price={bidAmount}
                  warning={warning}
                  currency={bidAmountCurrency}
                  expires={expires}
                  isOffer={true}
                  sourceImg={source?.icon ? (source.icon as string) : undefined}
                />
                <Fees fees={fees} marketplace={marketplace.name} />

                <Flex
                  align="center"
                  justify="between"
                  css={{ px: '$4', mt: '$4' }}
                >
                  <Text style="h6">You Get</Text>
                  <RkFormatCryptoCurrency
                    textStyle="h6"
                    amount={totalPrice}
                    address={bidAmountCurrency?.contract}
                    logoWidth={16}
                  />
                </Flex>
                <Flex justify="end">
                  <RkFormatCurrency
                    amount={totalUsd}
                    color="subtle"
                    css={{ mr: '$4' }}
                  />
                </Flex>

                <Button
                  style={{
                    flex: 1,
                    marginBottom: 16,
                    marginTop: 16,
                    marginRight: 16,
                    marginLeft: 16,
                  }}
                  color="primary"
                  onClick={acceptBid}
                >
                  Accept
                </Button>
              </Flex>
            )}

            {(acceptBidStep === AcceptBidStep.Confirming ||
              acceptBidStep === AcceptBidStep.Finalizing ||
              acceptBidStep === AcceptBidStep.ApproveMarketplace) &&
              token && (
                <Flex direction="column">
                  <TokenLineItem
                    tokenDetails={token}
                    collection={collection}
                    usdConversion={usdPrice || 0}
                    price={bidAmount}
                    warning={warning}
                    currency={bidAmountCurrency}
                    expires={expires}
                    isOffer={true}
                    sourceImg={
                      source?.icon ? (source.icon as string) : undefined
                    }
                  />
                  <AcceptBidProgress
                    acceptBidStep={acceptBidStep}
                    etherscanBaseUrl={`${etherscanBaseUrl}/tx/${txHash}`}
                    marketplace={marketplace}
                    tokenImage={tokenImage}
                    stepData={stepData}
                  />
                  <Button disabled={true} css={{ m: '$4' }}>
                    <Loader />
                    {acceptBidStep === AcceptBidStep.Confirming
                      ? 'Waiting for approval...'
                      : 'Waiting for transaction to be validated'}
                  </Button>
                </Flex>
              )}

            {acceptBidStep === AcceptBidStep.Complete && token && (
              <Flex direction="column">
                <Flex
                  css={{
                    p: '$4',
                    py: '$5',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  {' '}
                  <Box
                    css={{
                      color: '$successAccent',
                      mb: 24,
                    }}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} fontSize={32} />
                  </Box>
                  <Text style="h5" css={{ mb: 8 }}>
                    Bid accepted!
                  </Text>
                  <Flex
                    css={{ mb: 24, maxWidth: '100%' }}
                    align="center"
                    justify="center"
                  >
                    <Text
                      style="subtitle2"
                      css={{ maxWidth: '100%' }}
                      ellipsify
                    >
                      You’ve sold{' '}
                      <Anchor
                        color="primary"
                        weight="medium"
                        css={{ fontSize: 12 }}
                        href={`${client?.apiBase}/redirect/sources/${client?.source}/tokens/${token.token?.contract}:${token?.token?.tokenId}/link/v2`}
                        target="_blank"
                      >
                        {token?.token?.name
                          ? token?.token?.name
                          : `#${token?.token?.tokenId}`}
                      </Anchor>{' '}
                      from the {token?.token?.collection?.name} collection.
                    </Text>
                  </Flex>
                  <Anchor
                    color="primary"
                    weight="medium"
                    css={{ fontSize: 12 }}
                    href={`${etherscanBaseUrl}/tx/${txHash}`}
                    target="_blank"
                  >
                    View on Explorer
                  </Anchor>
                </Flex>
                <Flex
                  css={{
                    p: '$4',
                    flexDirection: 'column',
                    gap: '$3',
                    '@bp1': {
                      flexDirection: 'row',
                    },
                  }}
                >
                  <Button
                    css={{ width: '100%' }}
                    onClick={() => {
                      setOpen(false)
                      if (onClose) onClose()
                    }}
                  >
                    Done
                  </Button>
                </Flex>
              </Flex>
            )}
          </CustomReservoirModal>
        )
      }}
    </AcceptBidModal.Custom>
  )
}
