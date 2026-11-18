import { ChevronDown, ChevronUp, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function VoiceStage() {
  const { dict, locale } = useLocale()
  const location = useLocation()
  const {
    voiceState,
    voiceError,
    voiceTranscript,
    demoPresentation,
    interrupted,
    voiceSpeakerEnabled,
    ttsVoiceId,
    hangUpVoiceCall,
    setVoiceMuted,
    setVoiceSpeakerEnabled,
    setTtsVoiceId,
    beginVoiceCall,
  } = useLayla()
  const [expanded, setExpanded] = useState(false)
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)

  const active =
    voiceState === 'connecting' ||
    voiceState === 'connected' ||
    voiceState === 'listening' ||
    voiceState === 'speaking' ||
    voiceState === 'muted'
  const scanMode = location.pathname.startsWith('/skin-scan')
  const isExpanded = expanded && !active && !scanMode

  const statusLabel =
    voiceState === 'connecting'
      ? dict.cstate.connecting
      : voiceState === 'speaking'
        ? dict.cstate.speaking
        : voiceState === 'listening' || voiceState === 'connected'
          ? dict.cstate.listening
          : voiceState === 'muted'
            ? dict.cstate.muted
            : voiceState === 'error'
              ? dict.cstate.error
              : voiceState === 'disconnected'
                ? dict.cstate.disconnected
                : dict.cstate.ready

  const latest = [...voiceTranscript].reverse().find((entry) => entry.content.trim())
  const listening = voiceState === 'listening' || voiceState === 'connected'
  const speaking = voiceState === 'speaking'
  const selectedVoice = locale === 'ar' ? 'noura' : ttsVoiceId
  const voiceLabels = {
    noura: locale === 'ar' ? dict.voiceNoura : dict.voiceNouraEnglish,
    ava: dict.voiceAva,
    eryn: dict.voiceEryn,
  }
  if (demoPresentation.active && !active) {
    return (
      <div className="border-b border-[#254766] bg-gradient-to-b from-[#183f68] via-[#123458] to-[#0b2543] px-3 py-2 text-white">
        <div className="flex items-center gap-3 text-start">
          <div className="relative size-[58px] shrink-0">
            <img
              src="/layla.jpg"
              alt=""
              className="size-full rounded-full object-cover object-[50%_30%] ring-2 ring-[#d9e8f7]"
            />
            <span className="absolute -bottom-1 -end-1 grid size-6 place-items-center rounded-full border border-[#426483] bg-[#0b223a]">
              <MicOff className="size-3.5 text-[#83c4ff]" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#9bd7bc]">{dict.demoMicMuted}</p>
            {demoPresentation.caption && (
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="mt-1 rounded-xl border border-[#426483] bg-[#0b223a]/80 px-2.5 py-2 text-[12px] leading-relaxed"
              >
                <span className="font-bold text-[#83c4ff]">
                  {demoPresentation.speaker === 'user' ? dict.you : dict.lShort}:{' '}
                </span>
                {demoPresentation.caption}
                {demoPresentation.speaking && (
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-block h-3 w-px animate-pulse bg-current align-middle"
                  />
                )}
              </p>
            )}
            {demoPresentation.interrupted && (
              <p className="mt-1 text-[10px] font-semibold text-[var(--orange)]">{dict.intrW}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!active && voiceState !== 'error' && voiceState !== 'disconnected' && !scanMode) return null

  const selectVoice = (value: string) => {
    if (value === 'noura' || value === 'ava' || value === 'eryn') setTtsVoiceId(value)
  }
  const voiceSelector = (
    <label className="block">
      <span className="sr-only">{dict.voiceSelect}</span>
      <select
        aria-label={dict.voiceSelect}
        title={voiceLabels[selectedVoice]}
        value={selectedVoice}
        onChange={(event) => selectVoice(event.currentTarget.value)}
        className="w-full min-w-0 max-w-full rounded-full border border-[#426483] bg-[#0b223a] px-2 py-1.5 text-[10px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#83c4ff]"
      >
        <option value="noura">{voiceLabels.noura}</option>
        <option value="ava" disabled={locale === 'ar'}>{dict.voiceAva}</option>
        <option value="eryn" disabled={locale === 'ar'}>{dict.voiceEryn}</option>
      </select>
    </label>
  )
  const compactVoiceSelector = (
    <div className="relative">
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full border border-[#426483] bg-[#0b223a] text-white shadow-sm hover:bg-[#173c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83c4ff]"
        aria-label={dict.voiceSelect}
        aria-haspopup="listbox"
        aria-expanded={voiceMenuOpen}
        title={voiceLabels[selectedVoice]}
        onClick={() => setVoiceMenuOpen((open) => !open)}
      >
        <span className="relative grid size-4 place-items-center">
          <Volume2 className="size-4" />
          <ChevronDown className="absolute -bottom-1 -end-1 size-2.5 rounded-full bg-[#0b223a]" />
        </span>
      </button>
      {voiceMenuOpen && (
        <div
          role="listbox"
          aria-label={dict.voiceSelect}
          className="absolute start-0 top-full z-40 mt-1.5 flex max-h-32 w-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-[#426483] bg-[#0b223a] p-1 shadow-xl"
        >
          {(['noura', 'ava', 'eryn'] as const).map((voice) => (
            <button
              key={voice}
              type="button"
              role="option"
              aria-selected={selectedVoice === voice}
              disabled={locale === 'ar' && voice !== 'noura'}
              title={voiceLabels[voice]}
              className="overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2 py-1.5 text-start text-[10px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                selectVoice(voice)
                setVoiceMenuOpen(false)
              }}
            >
              {voiceLabels[voice]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
  const callControls = (compact: boolean) =>
    active ? (
      <>
        <button
          type="button"
          className={`grid place-items-center rounded-full bg-white text-[var(--navy2)] shadow disabled:cursor-not-allowed disabled:opacity-70 ${compact ? 'size-8' : 'size-11'}`}
          onClick={() => {
            if (!demoPresentation.active) void setVoiceMuted(voiceState !== 'muted')
          }}
          disabled={demoPresentation.active}
          aria-label={demoPresentation.active ? dict.demoMicMuted : voiceState === 'muted' ? dict.unmute : dict.mute}
          title={demoPresentation.active ? dict.demoMicMuted : undefined}
        >
          {voiceState === 'muted' ? (
            <MicOff className={compact ? 'size-3.5' : 'size-4'} />
          ) : (
            <Mic className={compact ? 'size-3.5' : 'size-4'} color="#14385c" />
          )}
        </button>
        <button
          type="button"
          className={`grid place-items-center rounded-full bg-[#ea264d] text-white shadow-[0_8px_18px_rgba(234,38,77,0.35)] ${compact ? 'size-8' : 'h-12 px-5'}`}
          onClick={() => {
            setExpanded(false)
            void hangUpVoiceCall()
          }}
          aria-label={dict.endL}
        >
          <PhoneOff className={compact ? 'size-3.5' : 'size-4 shrink-0'} strokeWidth={2.4} />
          {!compact && <span className="text-[13px] font-bold">{dict.endVoice}</span>}
        </button>
        <button
          type="button"
          className={`grid place-items-center rounded-full bg-white text-[var(--navy2)] shadow ${compact ? 'size-8' : 'size-11'}`}
          onClick={() => setVoiceSpeakerEnabled(!voiceSpeakerEnabled)}
          aria-label={voiceSpeakerEnabled ? dict.mute : dict.unmute}
        >
          {voiceSpeakerEnabled ? (
            <Volume2 className={compact ? 'size-3.5' : 'size-4'} />
          ) : (
            <VolumeX className={compact ? 'size-3.5' : 'size-4'} />
          )}
        </button>
      </>
    ) : (
      <button
        type="button"
        className={`rounded-full bg-[#2c6ba4] font-bold text-white shadow-[0_6px_14px_rgba(44,107,164,0.28)] ${compact ? 'h-8 px-2.5 text-[10px]' : 'px-4 py-2 text-[12px]'}`}
        onClick={() => {
          setExpanded(false)
          void beginVoiceCall()
        }}
      >
        {dict.wTalk}
      </button>
    )

  return (
    <div className={`relative border-b border-[#254766] bg-gradient-to-b from-[#183f68] via-[#123458] to-[#0b2543] text-center ${isExpanded ? 'px-4 py-5' : 'px-3 py-2'}`}>
      {!active && !scanMode && (
        <button
          type="button"
          className="absolute end-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83c4ff]"
          aria-label={isExpanded ? dict.collapseVoiceStage : dict.expandVoiceStage}
          aria-expanded={isExpanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      )}

      {isExpanded ? (
        <>
          <div className="relative mx-auto size-[112px] sm:size-[128px]">
            <span
              className={`absolute inset-[-10px] rounded-full border-2 ${
                listening
                  ? 'animate-pulse border-[rgba(54,211,153,0.7)]'
                  : speaking
                    ? 'animate-pulse border-[rgba(103,183,255,0.75)]'
                    : 'border-transparent'
              }`}
            />
            <img
              src="/layla.jpg"
              alt=""
              className="relative size-full rounded-full object-cover object-[50%_30%] shadow-[0_10px_28px_rgba(0,0,0,0.35)] ring-4 ring-[#d9e8f7]"
            />
            <span
              className={`absolute bottom-1 end-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                listening ? 'bg-[#20b981]' : speaking ? 'bg-[#3989cf]' : 'bg-[#7b8a99]'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mx-auto mt-2 max-w-[280px]">{voiceSelector}</div>
          <div className="mt-3 flex h-7 items-center justify-center gap-[3px]" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <i
                key={i}
                className={`w-[3px] rounded-full ${
                  listening ? 'bg-[#36d399]' : speaking ? 'bg-[#67b7ff]' : 'bg-[#8ba6c1]'
                }`}
                style={{
                  height: `${6 + ((i * 5) % 16)}px`,
                  animation:
                    listening || speaking ? `wv 0.9s ease-in-out ${i * 0.05}s infinite` : undefined,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#d6e8fa]">{voiceLabels[selectedVoice]}</p>
          {latest && (
            <p className="mx-auto mt-3 max-w-[320px] rounded-2xl border border-[#426483] bg-[#0b223a]/80 px-3 py-2 text-[12.5px] leading-relaxed text-white shadow-sm">
              <span className="font-bold text-[#83c4ff]">
                {latest.speaker === 'user' ? dict.you : dict.lShort}:{' '}
              </span>
              {latest.content}
              {speaking && latest.speaker === 'assistant' && !latest.final && (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-3 w-px animate-pulse bg-current align-middle"
                />
              )}
            </p>
          )}
          {demoPresentation.active && (
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#9bd7bc]">
              <MicOff className="size-3" />
              {dict.demoMicMuted}
            </p>
          )}
          {(interrupted || demoPresentation.interrupted) && (
            <p className="mt-2 text-[11px] font-semibold text-[var(--orange)]">{dict.intrW}</p>
          )}
          {voiceError && <p className="mt-2 text-[12px] text-[#ff9da8]">{voiceError}</p>}
          <div className="mt-4 flex items-center justify-center gap-4">
            {callControls(false)}
          </div>
          <p className="mt-3 text-[11px] text-[#bdd0e2]">{dict.bargeHint}</p>
        </>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(132px,190px)] items-start gap-3 px-1 pt-1 text-start">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#d6e8fa]">{statusLabel}</p>
            {demoPresentation.active && (
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#9bd7bc]">
                <MicOff className="size-3" />
                {dict.demoMicMuted}
              </p>
            )}
            {latest && (
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="mt-2 line-clamp-4 rounded-xl border border-[#426483] bg-[#0b223a]/80 px-2.5 py-2 text-[12px] leading-relaxed text-white"
              >
                <span className="font-bold text-[#83c4ff]">
                  {latest.speaker === 'user' ? dict.you : dict.lShort}:{' '}
                </span>
                {latest.content}
                {speaking && latest.speaker === 'assistant' && !latest.final && (
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-block h-3 w-px animate-pulse bg-current align-middle"
                  />
                )}
              </p>
            )}
            {(interrupted || demoPresentation.interrupted) && (
              <p className="mt-1 text-[10px] font-semibold text-[var(--orange)]">{dict.intrW}</p>
            )}
            {voiceError && <p className="mt-1 text-[11px] text-[#ff9da8]">{voiceError}</p>}
          </div>
          <div className="flex min-w-0 flex-col items-center gap-1.5">
            <div className="relative size-[68px] shrink-0">
              <span
                className={`absolute inset-[-5px] rounded-full border ${
                  listening
                    ? 'animate-pulse border-[rgba(54,211,153,0.75)]'
                    : speaking
                      ? 'animate-pulse border-[rgba(103,183,255,0.8)]'
                      : 'border-transparent'
                }`}
              />
              <img
                src="/layla.jpg"
                alt=""
                className="relative size-full rounded-full object-cover object-[50%_30%] ring-2 ring-[#d9e8f7]"
              />
              <span
                className="absolute bottom-1 start-[-7px] flex h-5 items-center gap-px rounded-md border border-[#426483] bg-[#0b223a]/95 px-1"
                aria-hidden="true"
              >
                {Array.from({ length: 9 }).map((_, index) => (
                  <i
                    key={index}
                    className={`w-[2px] rounded-full ${
                      listening ? 'bg-[#36d399]' : speaking ? 'bg-[#67b7ff]' : 'bg-[#8ba6c1]'
                    }`}
                    style={{
                      height: `${5 + ((index * 3) % 8)}px`,
                      animation:
                        listening || speaking
                          ? `wv 0.9s ease-in-out ${index * 0.05}s infinite`
                          : undefined,
                    }}
                  />
                ))}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {compactVoiceSelector}
              {callControls(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
