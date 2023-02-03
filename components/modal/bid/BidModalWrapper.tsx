import React, {
  ReactElement,
  useState,
  useRef,
  Dispatch,
  SetStateAction,
  ReactNode,
  useEffect,
} from 'react'
import { BidModal, Trait, useAttributes } from '@reservoir0x/reservoir-kit-ui'
import { styled } from '../../../stitches.config'
import {
  Text,
  Flex,
  Input,
  Box,
  Button,
  RkFormatCryptoCurrency,
  Loader,
  Popover,
  PseudoInput,
  ErrorWell,
  ProgressBar,
  TransactionProgress,
  Select,
  RkFormatCurrency,
  CustomDateInput,
  RkFormatWrappedCurrency,
} from '../../reservoirComponents'
import TokenStats from './TokenStats'
import AttributeSelector from './AttributeSelector'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClose,
  faChevronDown,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons'
import FormatNativeCrypto from '../../FormatNativeCrypto'
import { CustomReservoirModal } from '../CustomReservoirModal'
import getLocalMarketplaceData from '../../../lib/getLocalMarketplaceData'
import CryptoCurrencyIcon from '../../reservoirComponents/rkCryptoCurrencyIcon/RkCryptoCurrencyIcon'
import { faCalendar } from '@fortawesome/free-solid-svg-icons/faCalendar'
import dayjs from 'dayjs'
import Flatpickr from 'react-flatpickr'
import defaultExpirationOptions from '../../../lib/defaultExpirationOptions'
import { ReservoirClientActions } from '@reservoir0x/reservoir-kit-client'
import useCoinConversion from '../../../hooks/useCoinConversion'
import TransactionBidDetails from './TransactionBidDetails'
import useWrappedBalance from '../../../hooks/useWrappedBalance'
import { useAccount } from 'wagmi'
import { parseEther } from 'ethers/lib/utils'
import { constants } from 'ethers'
import { formatBN } from '../../../lib/numbers'
import wrappedContracts from '../../../constants/wrappedContracts'
import useFallbackState from '../../../hooks/useFallbackState'
import useEvmChain from '../../../hooks/useEvmChain'

export enum ModalSize {
  MD,
  LG,
}

export type Traits =
  | NonNullable<ReturnType<typeof useAttributes>['data']>
  | undefined

export type BidData = Parameters<
  ReservoirClientActions['placeBid']
>['0']['bids'][0]

type BidCallbackData = {
  tokenId?: string
  collectionId?: string
  bidData: BidData | null
}

type ChildrenProps = {
  open: boolean
  tokenId?: string
  collectionId?: string
  attribute?: Trait
  normalizeRoyalties?: boolean
  trigger: ReactNode
}

export enum BidStep {
  SetPrice,
  Offering,
  Complete,
}

function titleForStep(step: BidStep) {
  switch (step) {
    case BidStep.SetPrice:
      return 'Make an Offer'
    case BidStep.Offering:
      return 'Complete Offer'
    case BidStep.Complete:
      return 'Offer Submitted'
  }
}

const ContentContainer = styled(Flex, {
  width: '100%',
  flexDirection: 'column',
  '@bp1': {
    flexDirection: 'row',
  },
})

const MainContainer = styled(Flex, {
  flex: 1,
  borderColor: '$borderColor',
  borderTopWidth: 1,
  borderLeftWidth: 0,
  '@bp1': {
    borderTopWidth: 0,
    borderLeftWidth: 1,
  },

  defaultVariants: {
    direction: 'column',
  },
})

const expirationOptions = [
  ...defaultExpirationOptions,
  {
    text: 'Custom',
    value: 'custom',
    relativeTime: null,
    relativeTimeUnit: null,
  },
]

type MyProps = {
  openState?: [boolean, Dispatch<SetStateAction<boolean>>]
  tokenId?: string
  collectionId?: string
  attribute?: Trait
  normalizeRoyalties?: boolean
  onViewOffers?: () => void
  onClose?: () => void
  children?: (props: ChildrenProps) => ReactNode | Element
  trigger: ReactNode
  onBidComplete?: (data: any) => void
  onBidError?: (error: Error, data: any) => void
}

//@dev - this is a hack to get the bid modal to work with custom properties.
// https://docs.reservoir.tools/docs/buying#custom-buymodal
// BidModalWrapper - Wraps BidModal.Custom and CustomReservoirModal | is https://github.com/reservoirprotocol/reservoir-kit/blob/3773ef2af129451a86c98cc15131158539b1b6c0/packages/ui/src/modal/bid/BidModal.tsx
// BidModal.Custom - (Also Called Renderer - Data Layer Component) | is https://github.com/reservoirprotocol/reservoir-kit/blob/main/packages/ui/src/modal/bid/BidModalRenderer.tsx
// CustomReservoirModal - Actual Modal that renders front-end components | is https://github.com/reservoirprotocol/reservoir-kit/blob/main/packages/ui/src/modal/Modal.tsx

export default function BidModalWrapper({
  openState,
  tokenId,
  collectionId,
  attribute,
  onClose,
  trigger,
  onViewOffers,
  onBidComplete,
  onBidError,
  normalizeRoyalties,
}: MyProps): ReactElement {
  const [open, setOpen] = useFallbackState(
    openState ? openState[0] : false,
    openState
  )
  const { address } = useAccount()
  const datetimeElement = useRef<Flatpickr | null>(null)
  const [stepTitle, setStepTitle] = useState('')
  const {
    balance: { data: wrappedBalance },
    contractAddress,
  } = useWrappedBalance({
    address: address,
    watch: open,
  })
  const evmChain = useEvmChain()
  const currencyName = evmChain?.nativeCurrency?.name ?? 'TXL'

  const [attributesSelectable, setAttributesSelectable] = useState(false)
  const [attributeSelectorOpen, setAttributeSelectorOpen] = useState(false)

  const [localMarketplace, setLocalMarketplace] = useState<ReturnType<
    typeof getLocalMarketplaceData
  > | null>(null)

  // const [expirationOption, setExpirationOption] = useState<ExpirationOption>(
  //   expirationOptions[3]
  // )

  useEffect(() => {
    setLocalMarketplace(getLocalMarketplaceData())
  }, [])

  const wrappedContractAddress = wrappedContracts[45000]

  const usdPrice = useCoinConversion('USD', currencyName)

  const minimumDate = dayjs().add(1, 'h').format('MM/DD/YYYY h:mm A')

  return (
    // The renderer - data layer component
    <BidModal.Custom
      open={open}
      tokenId={tokenId}
      collectionId={collectionId}
      attribute={attribute}
      normalizeRoyalties={normalizeRoyalties}
    >
      {({
        token,
        collection,
        attributes,
        isBanned,
        balance,
        bidAmount,
        bidData,
        bidStep,
        hasEnoughNativeCurrency,
        transactionError,
        expirationOption,
        expirationOptions,
        stepData,
        setBidStep,
        setBidAmount,
        setExpirationOption,
        setTrait,
        trait,
        placeBid,
      }) => {
        // @dev - TODO: old convert link. We need to update this to use the new convert link from autobahn
        // const uniswapConvertLink =
        //   chain?.id === mainnet.id || chain?.id === goerli.id
        //     ? `https://app.uniswap.org/#/swap?theme=dark&exactAmount=${amountToWrap}&chain=${
        //       chain?.network || 'mainnet'
        //     }&inputCurrency=eth&outputCurrency=${contractAddress}`
        //     : `https://app.uniswap.org/#/swap?theme=dark&exactAmount=${amountToWrap}`
        const autobahnConvertLink = 'https://start.autobahn.network'

        const txlBidAmountUsd = +bidAmount * (usdPrice || 0)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [expirationDate, setExpirationDate] = useState('')
        const [hasEnoughWrappedCurrency, setHasEnoughWrappedCurrency] =
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useState(false)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [amountToWrap, setAmountToWrap] = useState('')

        const tokenCount = collection?.tokenCount
          ? +collection.tokenCount
          : undefined

        const itemImage =
          token && token.token?.image
            ? token.token?.image
            : (collection?.image as string)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (bidAmount !== '') {
            const bid = parseEther(bidAmount)

            if (!wrappedBalance?.value || wrappedBalance?.value.lt(bid)) {
              setHasEnoughWrappedCurrency(false)
              const wrappedAmount = wrappedBalance?.value || constants.Zero
              const amountToWrap = bid.sub(wrappedAmount)
              // @ts-ignore
              setAmountToWrap(formatBN(bid.sub(wrappedAmount), 5))
            } else {
              setHasEnoughWrappedCurrency(true)
              setAmountToWrap('')
            }
          } else {
            setHasEnoughWrappedCurrency(true)
            setAmountToWrap('')
          }
        }, [bidAmount, balance, wrappedBalance])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (stepData) {
            switch (stepData.currentStep.kind) {
              case 'signature': {
                setStepTitle('Confirm Offer')
                break
              }
              default: {
                setStepTitle(stepData.currentStep.action)
                break
              }
            }
            // Change title of the Wrapping Approve Title
            // From Wrapping ETH to Wrapping TXL
            switch (stepData.currentStep.action) {
              case 'Wrapping ETH': {
                setStepTitle(`Wrapping ${currencyName}`)
                break
              }
            }
          }
        }, [stepData])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (expirationOption && expirationOption.relativeTime) {
            const newExpirationTime = expirationOption.relativeTimeUnit
              ? dayjs().add(
                  expirationOption.relativeTime,
                  expirationOption.relativeTimeUnit
                )
              : dayjs.unix(expirationOption.relativeTime)
            setExpirationDate(newExpirationTime.format('MM/DD/YYYY h:mm A'))
          } else {
            setExpirationDate('')
          }
        }, [expirationOption])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (bidStep === BidStep.Complete && onBidComplete) {
            const data: BidCallbackData = {
              tokenId: tokenId,
              collectionId: collectionId,
              bidData,
            }
            onBidComplete(data)
          }
        }, [bidStep])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (transactionError && onBidError) {
            const data: BidCallbackData = {
              tokenId: tokenId,
              collectionId: collectionId,
              bidData,
            }
            onBidError(transactionError, data)
          }
        }, [transactionError])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (open && attributes && !tokenId && attribute) {
            setTrait(attribute)
          } else {
            setTrait(undefined)
          }

          if (open && attributes && !tokenId) {
            let attributeCount = 0
            for (let i = 0; i < attributes.length; i++) {
              attributeCount += attributes[i].attributeCount || 0
              if (attributeCount >= 2000) {
                break
              }
            }
            if (attributeCount >= 2000) {
              setAttributesSelectable(false)
            } else {
              setAttributesSelectable(true)
            }
          } else {
            setAttributesSelectable(false)
          }
        }, [open, attributes])

        return (
          // Component that renders the modal
          <CustomReservoirModal
            size={bidStep !== BidStep.Complete ? ModalSize.LG : ModalSize.MD}
            trigger={trigger}
            title={titleForStep(bidStep)}
            open={open}
            onOpenChange={(open) => {
              setOpen(open)
            }}
            loading={!collection}
            onFocusCapture={(e) => {
              e.stopPropagation()
            }}
          >
            {bidStep === BidStep.SetPrice && collection && (
              <ContentContainer>
                <TokenStats
                  token={token ? token : undefined}
                  collection={collection}
                  trait={trait}
                />
                <MainContainer css={{ p: '$4' }}>
                  {isBanned && (
                    <ErrorWell
                      message="Token is not tradable on this marketplace."
                      css={{ mb: '$2', p: '$2', borderRadius: 4 }}
                    />
                  )}
                  <Flex justify="between">
                    <Text style="tiny">Offer Amount</Text>
                    <Text
                      as={Flex}
                      css={{ gap: '$1' }}
                      align="center"
                      style="tiny"
                    >
                      Balance:{' '}
                      {/*<FormatNativeCrypto amount={balance?.value} />*/}
                      <RkFormatWrappedCurrency
                        logoWidth={10}
                        textStyle="tiny"
                        amount={wrappedBalance?.value}
                      />{' '}
                    </Text>
                  </Flex>
                  <Flex css={{ mt: '$2', gap: 20 }}>
                    <Text
                      as={Flex}
                      css={{ gap: '$2', ml: '$3', flexShrink: 0 }}
                      align="center"
                      style="body1"
                      color="subtle"
                    >
                      <CryptoCurrencyIcon
                        css={{ height: 20 }}
                        address="0x6405B66E6F27c32ADeFA43C24FD1e3d09769b560"
                      />
                      W{currencyName}
                    </Text>
                    <Input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => {
                        setBidAmount(e.target.value)
                      }}
                      placeholder="Enter price here"
                      containerCss={{
                        width: '100%',
                      }}
                      css={{
                        color: '$neutralText',
                        textAlign: 'left',
                      }}
                    />
                  </Flex>
                  <RkFormatCurrency
                    css={{
                      marginLeft: 'auto',
                      mt: '$2',
                      display: 'inline-block',
                      minHeight: 15,
                    }}
                    style="tiny"
                    amount={txlBidAmountUsd}
                  />
                  {attributes &&
                    attributes.length > 0 &&
                    (attributesSelectable || trait) &&
                    !tokenId && (
                      <>
                        <Text as={Box} css={{ mb: '$2' }} style="tiny">
                          Attributes
                        </Text>
                        <Popover.Root
                          open={attributeSelectorOpen}
                          onOpenChange={
                            attributesSelectable
                              ? setAttributeSelectorOpen
                              : undefined
                          }
                        >
                          <Popover.Trigger asChild>
                            <PseudoInput>
                              <Flex
                                justify="between"
                                css={{
                                  gap: '$2',
                                  alignItems: 'center',
                                  color: '$neutralText',
                                }}
                              >
                                {trait ? (
                                  <>
                                    <Box
                                      css={{
                                        maxWidth: 385,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <Text color="accent" style="subtitle1">
                                        {trait?.key}:{' '}
                                      </Text>
                                      <Text style="subtitle1">
                                        {trait?.value}
                                      </Text>
                                    </Box>
                                    <Flex
                                      css={{
                                        alignItems: 'center',
                                        gap: '$2',
                                      }}
                                    >
                                      <Box css={{ flex: 'none' }}>
                                        <RkFormatCryptoCurrency
                                          amount={
                                            collection?.floorAsk?.price?.amount
                                              ?.native
                                          }
                                          maximumFractionDigits={2}
                                          logoWidth={11}
                                        />
                                      </Box>
                                      <FontAwesomeIcon
                                        style={{
                                          cursor: 'pointer',
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setTrait(undefined)
                                        }}
                                        icon={faClose}
                                        width={16}
                                        height={16}
                                      />
                                    </Flex>
                                  </>
                                ) : (
                                  <>
                                    <Text
                                      css={{
                                        color: '$neutralText',
                                      }}
                                    >
                                      All Attributes
                                    </Text>
                                    <FontAwesomeIcon
                                      icon={faChevronDown}
                                      width={16}
                                      height={16}
                                    />
                                  </>
                                )}
                              </Flex>
                            </PseudoInput>
                          </Popover.Trigger>
                          <Popover.Content sideOffset={-50}>
                            <AttributeSelector
                              attributes={attributes}
                              tokenCount={tokenCount}
                              setTrait={setTrait}
                              setOpen={setAttributeSelectorOpen}
                            />
                          </Popover.Content>
                        </Popover.Root>
                      </>
                    )}

                  <Text as={Box} css={{ mt: '$4', mb: '$2' }} style="tiny">
                    Expiration Date
                  </Text>
                  <Flex css={{ gap: '$2', mb: '$4' }}>
                    <Select
                      css={{
                        flex: 1,
                        '@bp1': {
                          width: 160,
                          flexDirection: 'row',
                        },
                      }}
                      value={expirationOption?.text || ''}
                      onValueChange={(value: string) => {
                        const option = expirationOptions.find(
                          (option) => option.value == value
                        )
                        if (option) {
                          setExpirationOption(option)
                        }
                      }}
                    >
                      {expirationOptions.map((option) => {
                        // Remove custom expiration option as choosing this option
                        // has unexpected behavior - it closes the whole modal
                        if (option.value !== 'custom') {
                          return (
                            <Select.Item key={option.text} value={option.value}>
                              <Select.ItemText>{option.text}</Select.ItemText>
                            </Select.Item>
                          )
                        }
                      })}
                    </Select>
                    <CustomDateInput
                      ref={datetimeElement}
                      icon={
                        <FontAwesomeIcon
                          icon={faCalendar}
                          width={14}
                          height={16}
                        />
                      }
                      value={expirationDate}
                      options={{
                        minDate: minimumDate,
                        enableTime: true,
                        minuteIncrement: 1,
                      }}
                      defaultValue={expirationDate}
                      onChange={(e: any) => {
                        if (Array.isArray(e)) {
                          const customOption = expirationOptions.find(
                            (option) => option.value === 'custom'
                          )
                          if (customOption) {
                            setExpirationOption({
                              ...customOption,
                              relativeTime: e[0] / 1000,
                            })
                          }
                        }
                      }}
                      containerCss={{
                        width: 46,
                        '@bp1': {
                          flex: 1,
                          width: '100%',
                        },
                      }}
                      css={{
                        padding: 0,
                        '@bp1': {
                          padding: '12px 16px 12px 48px',
                        },
                      }}
                    />
                  </Flex>
                  {bidAmount === '' && (
                    <Button disabled={true} css={{ width: '100%', mt: 'auto' }}>
                      Enter a Price
                    </Button>
                  )}
                  {bidAmount !== '' && hasEnoughWrappedCurrency && (
                    <Button
                      onClick={placeBid}
                      css={{ width: '100%', mt: 'auto' }}
                    >
                      {token && token.token
                        ? 'Make an Offer'
                        : trait
                        ? 'Make an Attribute Offer'
                        : 'Make a Collection Offer'}
                    </Button>
                  )}
                  {bidAmount !== '' && !hasEnoughWrappedCurrency && (
                    <Box css={{ width: '100%', mt: 'auto' }}>
                      {!hasEnoughNativeCurrency && (
                        <Flex css={{ gap: '$2', mt: 10 }} justify="center">
                          <Text style="body2" color="error">
                            {balance?.symbol || 'ETH'} Balance
                          </Text>
                          <RkFormatCryptoCurrency amount={balance?.value} />
                        </Flex>
                      )}
                      <Flex
                        css={{
                          gap: '$2',
                          mt: 10,
                          overflow: 'hidden',
                          flexDirection: 'column-reverse',
                          '@bp1': {
                            flexDirection: 'row',
                          },
                        }}
                      >
                        <Button
                          css={{ flex: '1 0 auto' }}
                          color="secondary"
                          onClick={() => {
                            window.open(autobahnConvertLink, '_blank')
                          }}
                        >
                          Convert Manually
                        </Button>
                        <Button
                          css={{ flex: 1, maxHeight: 44 }}
                          disabled={!hasEnoughNativeCurrency}
                          onClick={placeBid}
                        >
                          <Text style="h6" color="button" ellipsify>
                            Convert {amountToWrap} {balance?.symbol || currencyName}{' '}
                            for me
                          </Text>
                        </Button>
                      </Flex>
                    </Box>
                  )}
                </MainContainer>
              </ContentContainer>
            )}

            {bidStep === BidStep.Offering && collection && (
              <ContentContainer>
                <TransactionBidDetails
                  token={token ? token : undefined}
                  collection={collection}
                  bidData={bidData}
                />
                <MainContainer css={{ p: '$4' }}>
                  <ProgressBar
                    value={stepData?.stepProgress || 0}
                    max={stepData?.totalSteps || 0}
                  />
                  {transactionError && <ErrorWell css={{ mt: 24 }} />}
                  {stepData && (
                    <>
                      <Text
                        css={{ textAlign: 'center', mt: 48, mb: 28 }}
                        style="subtitle1"
                      >
                        {stepTitle}
                      </Text>
                      {stepData.currentStep.kind === 'signature' && (
                        <TransactionProgress
                          justify="center"
                          fromImg={itemImage || ''}
                          toImg={localMarketplace?.icon || ''}
                        />
                      )}
                      {stepData.currentStep.kind !== 'signature' && (
                        // <WethApproval style={{ margin: '0 auto' }} />
                        <Flex align="center" justify="center">
                          <Flex
                            css={{ background: '$neutalLine', borderRadius: 8 }}
                          >
                            <CryptoCurrencyIcon
                              css={{ height: 56, width: 56 }}
                              address={wrappedContractAddress}
                            />
                          </Flex>
                        </Flex>
                      )}
                      {/*Change description to converting TXL instead of converting ETH to WETH*/}
                      {stepData.currentStep.action === 'Wrapping ETH' && (
                        <Text
                          css={{
                            textAlign: 'center',
                            mt: 24,
                            maxWidth: 395,
                            mx: 'auto',
                            mb: '$4',
                          }}
                          style="body3"
                          color="subtle"
                        >
                          We&apos;ll ask your approval for converting {currencyName} to
                          W{currencyName}. Gas fee required.
                        </Text>
                      )}
                      {stepData.currentStep.action !== 'Wrapping ETH' && (
                        <Text
                          css={{
                            textAlign: 'center',
                            mt: 24,
                            maxWidth: 395,
                            mx: 'auto',
                            mb: '$4',
                          }}
                          style="body3"
                          color="subtle"
                        >
                          {stepData?.currentStep.description}
                        </Text>
                      )}
                    </>
                  )}
                  {!stepData && (
                    <Flex
                      css={{ height: '100%' }}
                      justify="center"
                      align="center"
                    >
                      <Loader />
                    </Flex>
                  )}
                  {!transactionError && (
                    <Button css={{ width: '100%', mt: 'auto' }} disabled={true}>
                      <Loader />
                      Waiting for Approval
                    </Button>
                  )}
                  {transactionError && (
                    <Flex css={{ mt: 'auto', gap: 10 }}>
                      <Button
                        color="secondary"
                        css={{ flex: 1 }}
                        onClick={() => setBidStep(BidStep.SetPrice)}
                      >
                        Edit Bid
                      </Button>
                      <Button css={{ flex: 1 }} onClick={placeBid}>
                        Retry
                      </Button>
                    </Flex>
                  )}
                </MainContainer>
              </ContentContainer>
            )}

            {bidStep === BidStep.Complete && (
              <Flex direction="column" align="center" css={{ p: '$4' }}>
                <Box css={{ color: '$successAccent', mt: 48 }}>
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    style={{ width: '32px', height: '32px' }}
                  />
                </Box>
                <Text style="h5" css={{ textAlign: 'center', mt: 36, mb: 80 }}>
                  Offer Submitted!
                </Text>
                {onViewOffers ? (
                  <Button
                    css={{ width: '100%' }}
                    onClick={() => {
                      onViewOffers()
                      if (onClose) {
                        onClose()
                      }
                    }}
                  >
                    View Offers
                  </Button>
                ) : (
                  <Button
                    css={{ width: '100%' }}
                    onClick={() => {
                      setOpen(false)
                      if (onClose) {
                        onClose()
                      }
                    }}
                  >
                    Close
                  </Button>
                )}
              </Flex>
            )}
          </CustomReservoirModal>
        )
      }}
    </BidModal.Custom>
  )
}
