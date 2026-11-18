import { Maximize2, PhoneOff } from 'lucide-react'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function MiniPlayer() {
  const { dict } = useLocale()
  const { miniPlayer, voiceState, voiceTranscript, openPanel, setMiniPlayer, hangUpVoiceCall } =
    useLayla()

  if (!miniPlayer) return null

  const latest = [...voiceTranscript].reverse().find((entry) => entry.content.trim())
  const label =
    voiceState === 'speaking'
      ? dict.cstate.speaking
      : voiceState === 'listening'
        ? dict.cstate.listening
        : voiceState === 'connecting'
          ? dict.cstate.connecting
          : dict.lShort

  return (
    <div className="fixed bottom-4 end-4 z-[60] w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(20,56,92,0.35)]">
      <div className="flex items-center gap-2.5 bg-gradient-to-br from-[var(--navy2)] to-[var(--blue)] px-3 py-2.5 text-white">
        <img src="/layla.jpg" alt="" className="size-10 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold">{label}</div>
          <div className="truncate text-[11px] text-white/75">
            {latest?.content || dict.fabS}
          </div>
        </div>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full bg-white/15"
          onClick={() => {
            setMiniPlayer(false)
            openPanel()
          }}
          aria-label="Expand"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full bg-[var(--red)]"
          onClick={() => void hangUpVoiceCall()}
          aria-label={dict.endL}
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  )
}
