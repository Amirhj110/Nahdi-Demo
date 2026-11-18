import { useMemo } from 'react'
import { useSendWithActions } from '../../hooks/useSendWithActions'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function SuggestedQuestions() {
  const { dict } = useLocale()
  const { isSending, messages } = useLayla()
  const sendWithActions = useSendWithActions()

  const questions = useMemo(() => {
    const lastAsst = [...messages].reverse().find((m) => m.role === 'assistant')
    if (lastAsst?.products?.length) return dict.sugg.afterRec
    if (messages.some((m) => m.role === 'assistant')) return dict.sugg.afterPd
    return dict.sugg.start
  }, [dict.sugg, messages])

  return (
    <div className="flex gap-1.5 overflow-x-auto bg-[#eef4f9] px-3 pb-1 pt-1.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {questions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={isSending}
          className="shrink-0 rounded-full border border-[#e3eaf1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2b4562] shadow-[0_1px_2px_rgba(20,56,92,0.04)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:opacity-50"
          onClick={() => void sendWithActions(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
