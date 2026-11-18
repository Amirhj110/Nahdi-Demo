import { RotateCcw, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getMessageProducts } from '../../lib/chatProducts'
import {
  getVoiceActionReply,
  isRoutineBuildRequest,
  matchChatAction,
} from '../../lib/chatActions'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { QuickActions } from './QuickActions'
import { SuggestedQuestions } from './SuggestedQuestions'
import { VoiceStage } from './VoiceStage'
import { usePerformChatActions } from '../../hooks/useSendWithActions'

export function LaylaPanel() {
  const { dict, locale, setLocale } = useLocale()
  const {
    panelOpen,
    closePanel,
    resetSession,
    messages,
    mode,
    voiceProductMessage,
    demoPresentation,
    registerVoiceActionHandler,
  } = useLayla()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    setLastRecommendations,
    setLastRoutineAnswer,
    setLastRoutineProducts,
    setPicks,
    setOpenedByLayla,
  } = useNav()
  const autoOpenedRecommendationRef = useRef<string | null>(null)
  const performChatActions = usePerformChatActions()
  useEffect(
    () =>
      registerVoiceActionHandler(async (transcript) => {
        const action = matchChatAction(transcript)
        if (!action) return false
        const execution = await performChatActions(transcript)
        if (!execution.handled) return false
        return getVoiceActionReply(action, locale, execution.affectedProducts)
      }),
    [locale, registerVoiceActionHandler, performChatActions],
  )

  useEffect(() => {
    const latestMessage = messages[messages.length - 1]
    if (latestMessage && latestMessage.role !== 'assistant' && !voiceProductMessage) return
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
    if (!lastUserMessage && !voiceProductMessage) return
    const isRoutineRequest = lastUserMessage
      ? isRoutineBuildRequest(lastUserMessage.content)
      : false
    const lastAction = lastUserMessage ? matchChatAction(lastUserMessage.content) : null
    const isActionTurn = lastAction !== null
    if (!isRoutineRequest && !isActionTurn) {
      setLastRoutineAnswer(null)
      setLastRoutineProducts([])
    }
    const products = getMessageProducts(
      voiceProductMessage ?? latestMessage ?? {
        id: 'empty',
        role: 'assistant',
        content: '',
        createdAt: '',
      },
    )
    const hasRoutineReply = isRoutineRequest && latestMessage?.role === 'assistant'
    if (hasRoutineReply) {
      setLastRoutineAnswer(latestMessage.content)
      setLastRoutineProducts(products)
      setLastRecommendations(products)
      setPicks(products.map((p) => p.url))
    } else if (products.length) {
      setLastRecommendations(products)
      setPicks(products.map((p) => p.url))
    }

    if (products.length || hasRoutineReply) {
      const sourceId = voiceProductMessage?.id ?? latestMessage?.id
      if (
        sourceId &&
        sourceId !== autoOpenedRecommendationRef.current &&
        !demoPresentation.active &&
        !isActionTurn
      ) {
        autoOpenedRecommendationRef.current = sourceId
        setOpenedByLayla(true, dict.opened)
        navigate(isRoutineRequest ? '/routine' : '/recommendations')
      }
    }
  }, [
    messages,
    voiceProductMessage,
    demoPresentation.active,
    setLastRecommendations,
    setLastRoutineAnswer,
    setLastRoutineProducts,
    setPicks,
    setOpenedByLayla,
    dict.opened,
    navigate,
  ])

  if (!panelOpen) return null

  const compactTools = mode === 'voice' || location.pathname.startsWith('/skin-scan')

  return (
    <aside className="agent fixed inset-y-0 end-0 z-50 flex w-full max-w-[min(100vw,430px)] flex-col border-s border-[var(--line)] bg-[var(--bg)] shadow-[-12px_0_40px_rgba(20,56,92,0.18)]">
      <div className="ag-head flex items-center gap-2.5 bg-[radial-gradient(circle_at_15%_0%,#3d86c9_0,transparent_55%),linear-gradient(135deg,#14385c,#2c6ba4)] px-3.5 py-3 text-white sm:gap-3 sm:px-4 sm:py-3.5">
        <span className="relative shrink-0">
          <img
            src="/layla.jpg"
            alt=""
            className="size-10 rounded-full object-cover object-[50%_30%] ring-2 ring-white/75 sm:size-[52px]"
          />
          <span className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-white bg-[var(--green)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold sm:text-[16.5px]">{dict.lName}</div>
          <div className="truncate text-[11px] text-[#cfe2f4] sm:text-[11.5px]">{dict.agSub}</div>
        </div>
        <div className="flex rounded-full bg-white/10 p-0.5">
          <button
            type="button"
            className={`rounded-full px-2 py-1 text-[12px] font-bold ${locale === 'ar' ? 'bg-white text-[var(--blue)]' : 'text-[#dbe9f6]'}`}
            onClick={() => setLocale('ar')}
          >
            ع
          </button>
          <button
            type="button"
            className={`rounded-full px-2 py-1 text-[12px] font-bold ${locale === 'en' ? 'bg-white text-[var(--blue)]' : 'text-[#dbe9f6]'}`}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-[10px] hover:bg-white/15 sm:size-9"
          onClick={resetSession}
          aria-label="Reset"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-[10px] hover:bg-white/15 sm:size-9"
          onClick={closePanel}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <VoiceStage />
      <MessageList />
      {!compactTools && <QuickActions />}
      {!compactTools && <SuggestedQuestions />}
      <Composer />
    </aside>
  )
}
