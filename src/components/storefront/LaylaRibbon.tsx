import { Sparkles, X } from 'lucide-react'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'

export function LaylaRibbon() {
  const { openedByLayla, ribbonLabel, clearRibbon } = useNav()
  const { dict } = useLocale()
  if (!openedByLayla) return null

  return (
    <div className="page-wrap mt-4">
      <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[var(--blue)] to-[var(--blue2)] px-3.5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(45,106,169,0.25)]">
        <Sparkles className="size-4 shrink-0" />
        <span className="flex-1">{ribbonLabel || dict.opened}</span>
        <button type="button" onClick={clearRibbon} aria-label={dict.dismiss} className="opacity-80 hover:opacity-100">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
