import { Mic } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Footer } from '../components/storefront/Footer'
import { Header } from '../components/storefront/Header'
import { LaylaRibbon } from '../components/storefront/LaylaRibbon'
import { SubNav } from '../components/storefront/SubNav'
import { LaylaPanel } from '../components/layla/LaylaPanel'
import { MiniPlayer } from '../components/layla/MiniPlayer'
import { WatchLiveDemoButton } from '../components/shared/WatchLiveDemoButton'
import { useLayla } from '../state/LaylaContext'
import { useLocale } from '../state/LocaleContext'

export function AppShell() {
  const { dict } = useLocale()
  const { openPanel, beginVoiceCall, panelOpen } = useLayla()

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <SubNav />
      <LaylaRibbon />
      <main>
        <Outlet />
      </main>
      <Footer />

      {!panelOpen && (
        <div className="lfab fixed bottom-[22px] end-[22px] z-[60] flex items-center gap-3 rounded-full border border-[#e3eaf1] bg-white py-[7px] pe-2 ps-[7px] shadow-[0_16px_40px_rgba(20,56,92,0.25)]">
          <button type="button" onClick={openPanel} className="flex items-center gap-3 text-start">
            <span className="relative grid size-[52px] place-items-center">
              <span className="absolute inset-[-4px] animate-pulse rounded-full border-2 border-[var(--green)] opacity-70" />
              <img
                src="/layla.jpg"
                alt=""
                className="relative size-[52px] rounded-full bg-white object-cover object-[50%_30%] ring-2 ring-white"
              />
            </span>
            <span className="hidden pe-1 sm:block">
              <b className="block text-[14.5px] text-[var(--navy2)]">{dict.fab}</b>
              <small className="block text-[11.5px] text-[#7b8a99]">{dict.fabS}</small>
            </span>
          </button>
          <button
            type="button"
            aria-label={dict.voiceW}
            className="grid size-[46px] place-items-center rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--purple)] text-white shadow-[0_8px_18px_rgba(45,106,169,0.28)]"
            style={{ color: '#ffffff' }}
            onClick={() => {
              openPanel()
              void beginVoiceCall()
            }}
          >
            <Mic className="size-5" color="#ffffff" strokeWidth={2.2} />
          </button>
        </div>
      )}

      <WatchLiveDemoButton />
      <LaylaPanel />
      <MiniPlayer />
    </div>
  )
}
