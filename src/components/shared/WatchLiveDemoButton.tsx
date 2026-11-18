import { useLiveDemo } from '../../hooks/useLiveDemo'
import { useLocale } from '../../state/LocaleContext'

export function WatchLiveDemoButton() {
  const { dict } = useLocale()
  const { running, run, stepIndex, script, audioUnavailable, busy, featureUnavailable } = useLiveDemo()

  return (
    <div className="fixed bottom-5 start-5 z-40 flex flex-col items-start gap-2">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold shadow-[0_10px_26px_rgba(20,56,92,0.3)] ${
          running
            ? 'bg-[var(--red)] text-white'
            : 'bg-[var(--navy2)] text-white'
        }`}
        onClick={() => void run()}
      >
        <span
          className={`size-2.5 rounded-full ${running ? 'bg-white' : 'bg-[var(--red)] shadow-[0_0_0_4px_rgba(234,38,77,0.3)]'}`}
        />
        {running ? dict.stopDemo : dict.demoB}
      </button>
      {(running && stepIndex >= 0) || busy || audioUnavailable || featureUnavailable ? (
        <div className="max-w-[260px] rounded-xl border border-[var(--line)] bg-white/95 px-3 py-2 text-[11px] font-semibold text-[var(--muted)] shadow-[var(--sh)]">
          {running && stepIndex >= 0 && (
            <>
              <div className="text-[var(--blue)]">
                {dict.demoStep} {stepIndex + 1}/{script.length}
              </div>
              <div className="mt-1 line-clamp-2 text-[var(--ink)]">{script[stepIndex]}</div>
            </>
          )}
          <div className="mt-1">
            {busy
              ? dict.demoBusy
              : featureUnavailable
                ? dict.demoFeatureUnavailable
                : audioUnavailable
                  ? dict.demoAudioUnavailable
                  : dict.demoLiveHint}
          </div>
        </div>
      ) : null}
    </div>
  )
}
