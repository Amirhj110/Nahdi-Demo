import { ChevronDown, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function SubNav() {
  const { dict } = useLocale()
  const { openPanel, beginVoiceCall } = useLayla()

  return (
    <nav className="border-b border-[var(--line)] bg-white">
      <div className="page-wrap flex flex-wrap items-center gap-1 py-2 text-[13px] font-semibold text-[var(--ink)]">
        <Link
          to="/c/all"
          className="me-2 flex items-center gap-1.5 border-e border-[var(--line)] pe-5 text-[var(--blue)]"
        >
          <Menu className="size-4" />
          {dict.sub[0]}
          <ChevronDown className="size-3.5 opacity-70" />
        </Link>
        {dict.sub.slice(1).map((label) => (
          <button key={label} type="button" className="px-3 py-1.5 hover:text-[var(--blue)]">
            {label}
          </button>
        ))}
        <button
          type="button"
          className="ms-auto rounded-full bg-[var(--blue)] px-3.5 py-1.5 font-bold text-white shadow-[0_8px_18px_rgba(45,106,169,0.28)] hover:bg-[var(--navy)]"
          onClick={() => {
            openPanel()
            void beginVoiceCall()
          }}
        >
          {dict.subAI}
        </button>
      </div>
    </nav>
  )
}
