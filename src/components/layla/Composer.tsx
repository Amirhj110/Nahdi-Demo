import { Camera, Mic, Send } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSendWithActions } from '../../hooks/useSendWithActions'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function Composer() {
  const { dict } = useLocale()
  const { isSending, beginVoiceCall, hangUpVoiceCall, voiceState } = useLayla()
  const sendWithActions = useSendWithActions()
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  const voiceActive =
    voiceState === 'connecting' ||
    voiceState === 'connected' ||
    voiceState === 'listening' ||
    voiceState === 'speaking' ||
    voiceState === 'muted'

  const submit = () => {
    const next = value.trim()
    if (!next || isSending) return
    void sendWithActions(next)
    setValue('')
  }

  return (
    <div className="bg-[#eef4f9] pb-[max(10px,env(safe-area-inset-bottom))] pt-1">
      <div className="composer flex items-center gap-2 px-3 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2">
        <div className="inrow flex min-w-0 flex-1 items-center gap-0.5 rounded-full border-[1.5px] border-[#dbe5ee] bg-white py-0.5 pe-0.5 ps-0.5 shadow-[0_2px_8px_rgba(20,56,92,0.05)] focus-within:border-[var(--blue)]">
          <button
            type="button"
            className="cam grid size-8 shrink-0 place-items-center rounded-full hover:bg-[#fdeef5] sm:size-9"
            style={{ color: '#e85d9a' }}
            aria-label={dict.wScan}
            onClick={() => navigate('/skin-scan')}
          >
            <Camera className="size-[18px]" strokeWidth={2.2} color="#e85d9a" />
          </button>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={dict.ph}
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)] sm:h-8 sm:text-[14px]"
          />
          <button
            type="button"
            className="send grid size-8 shrink-0 place-items-center rounded-full disabled:opacity-40 sm:size-9"
            style={{ color: '#2c6ba4' }}
            disabled={!value.trim() || isSending}
            onClick={submit}
            aria-label={dict.send}
          >
            <Send className="size-[16px]" fill="#2c6ba4" color="#2c6ba4" strokeWidth={0} />
          </button>
        </div>
        <button
          type="button"
          aria-label={dict.voiceW}
          onClick={() => {
            if (voiceActive) void hangUpVoiceCall()
            else void beginVoiceCall()
          }}
          className={`orb relative grid size-[46px] shrink-0 place-items-center rounded-full text-white transition hover:scale-105 sm:size-[52px] ${
            voiceActive
              ? 'shadow-[0_8px_20px_rgba(234,38,77,0.35)]'
              : 'shadow-[0_8px_20px_rgba(91,79,194,0.35)]'
          }`}
          style={{
            background: voiceActive
              ? '#ea264d'
              : 'linear-gradient(135deg,#2c6ba4,#7b4fc2)',
          }}
        >
          <span
            className={`pointer-events-none absolute inset-[-5px] rounded-full border-2 ${
              voiceActive
                ? 'animate-pulse border-[rgba(234,38,77,0.4)]'
                : 'animate-pulse border-[rgba(123,79,194,0.35)]'
            }`}
          />
          <Mic className="relative size-5" color="#ffffff" strokeWidth={2.4} fill="none" />
        </button>
      </div>
      <p className="ag-foot overflow-hidden text-ellipsis whitespace-nowrap px-3 pb-2 text-center text-[9.5px] leading-none text-[#7b8a99] sm:text-[10.5px]">
        {dict.chatFoot}
      </p>
    </div>
  )
}
