import { Execute } from '@reservoir0x/reservoir-kit-client'
import React, {
  ComponentProps,
  FC,
  useContext,
  useEffect,
  useState,
} from 'react'
import { SWRResponse } from 'swr'
import * as Dialog from '@radix-ui/react-dialog'
import ModalCard from './modal/ModalCard'
import { useSigner } from 'wagmi'
import Toast from './Toast'
import { SWRInfiniteResponse } from 'swr/infinite/dist/infinite'
import { getDetails } from 'lib/fetch/fetch'
import { CgSpinner } from 'react-icons/cg'
import { GlobalContext } from 'context/GlobalState'
import { useReservoirClient, useTokens } from '@reservoir0x/reservoir-kit-ui'

type UseTokensReturnType = ReturnType<typeof useTokens>

type Props = {
  data:
    | {
        details: UseTokensReturnType
      }
    | {
        contract?: string | undefined
        tokenId?: string | undefined
        id?: string | undefined
      }
  maker?: string
  isInTheWrongNetwork: boolean | undefined
  mutate?: SWRResponse['mutate'] | SWRInfiniteResponse['mutate']
  setToast: (data: ComponentProps<typeof Toast>['data']) => any
  show: boolean
  signer: ReturnType<typeof useSigner>['data']
}

const CancelListing: FC<Props> = ({
  data,
  isInTheWrongNetwork,
  mutate,
  setToast,
  show,
  signer,
}) => {
  const [waitingTx, setWaitingTx] = useState<boolean>(false)
  const [steps, setSteps] = useState<Execute['steps']>()
  const [open, setOpen] = useState(false)

  // Data from props
  const [details, setDetails] = useState<
    UseTokensReturnType | UseTokensReturnType['data']
  >()
  const { dispatch } = useContext(GlobalContext)
  const reservoirClient = useReservoirClient()

  useEffect(() => {
    if (data && open) {
      // Load data if missing
      if ('tokenId' in data) {
        const { contract, tokenId } = data

        getDetails(contract, tokenId, (data) => {
          setDetails(data.tokens)
        })
      }
      // Load data if provided
      if ('details' in data) {
        const { details } = data
        setDetails(details)
      }
    }
  }, [data, open])

  const handleError = (err: any) => {
    setWaitingTx(false)
    setOpen(false)
    setSteps(undefined)
    // Handle user rejection
    if (err?.code === 4001) {
      setToast({
        kind: 'error',
        message: 'You have canceled the transaction.',
        title: 'User canceled transaction',
      })
      return
    }
    setToast({
      kind: 'error',
      message: 'The transaction was not completed.',
      title: 'Could not cancel listing',
    })
  }

  const handleSuccess = () => {
    setWaitingTx(false)
    details && 'mutate' in details && details.mutate()
    mutate && mutate()
  }

  let id: string | undefined = undefined

  if ('details' in data) {
    id = data.details.data[0]?.market?.floorAsk?.id
  }

  if ('id' in data) {
    id = data?.id
  }

  const execute = async (id: string) => {
    if (!signer) {
      throw 'Signer is missing'
    }

    if (!reservoirClient) {
      throw 'reservoirClient is not initialized'
    }

    setWaitingTx(true)

    await reservoirClient.actions
      .cancelOrder({
        id,
        signer,
        onProgress: setSteps,
      })
      .then(handleSuccess)
      .catch(handleError)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {show && (
        <Dialog.Trigger
          disabled={waitingTx || isInTheWrongNetwork}
          onClick={() => {
            if (!id || !signer) {
              dispatch({ type: 'CONNECT_WALLET', payload: true })
              return
            }
            execute(id)
          }}
        >
          {waitingTx ? (
            <p className="btn-primary-outline dark:border-neutral-600  dark:text-white dark:ring-primary-900 dark:focus:ring-4">
              <CgSpinner className="h-4 w-4 animate-spin" />
            </p>
          ) : (
            <p className="btn-primary-outline dark:border-neutral-600  dark:text-white dark:ring-primary-900 dark:focus:ring-4">
              Cancel Listing
            </p>
          )}
        </Dialog.Trigger>
      )}
      {steps && (
        <Dialog.Portal>
          <Dialog.Overlay>
            <ModalCard
              title="Cancel your listing"
              loading={waitingTx}
              steps={steps}
            />
          </Dialog.Overlay>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}

export default CancelListing
