import { useEffect, useRef } from 'react'
import { useLayla } from '../../state/LaylaContext'
import { MessageBubble } from './MessageBubble'
import { Welcome } from './Welcome'

export function MessageList() {
  const { messages, mode, isSending, voiceProductMessage, voiceProductError } = useLayla()
  const endRef = useRef<HTMLDivElement>(null)
  const visibleMessages = messages.filter(
    (message) => mode === 'voice' || !message.id.startsWith('voice-'),
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, voiceProductMessage, isSending])

  if (visibleMessages.length === 0 && !voiceProductMessage) {
    if (mode === 'voice') {
      return <div className="flex-1 overflow-y-auto" aria-live="polite" />
    }
    return (
      <div className="flex-1 overflow-y-auto">
        <Welcome />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 pb-4">
      {visibleMessages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {voiceProductMessage && <MessageBubble message={voiceProductMessage} />}
      {voiceProductError && (
        <p role="status" className="px-2 text-[12px] text-[var(--muted)]">
          {voiceProductError}
        </p>
      )}
      {isSending && (
        <div className="flex gap-1 px-1">
          <i className="size-1.5 animate-pulse rounded-full bg-[var(--blue)] opacity-40" />
          <i className="size-1.5 animate-pulse rounded-full bg-[var(--blue)] opacity-60 [animation-delay:150ms]" />
          <i className="size-1.5 animate-pulse rounded-full bg-[var(--blue)] opacity-80 [animation-delay:300ms]" />
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
