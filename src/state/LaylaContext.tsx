import { createContext, useContext, type ReactNode } from 'react'
import { useLaylaSession } from '../hooks/useLaylaSession'
import { useLocale } from './LocaleContext'

type LaylaSession = ReturnType<typeof useLaylaSession>

const LaylaContext = createContext<LaylaSession | null>(null)

export function LaylaProvider({ children }: { children: ReactNode }) {
  const { voiceLanguage } = useLocale()
  const session = useLaylaSession({
    contextLabel: 'Nahdi V3 storefront',
    language: voiceLanguage,
  })
  return <LaylaContext.Provider value={session}>{children}</LaylaContext.Provider>
}

export function useLayla() {
  const ctx = useContext(LaylaContext)
  if (!ctx) throw new Error('useLayla must be used within LaylaProvider')
  return ctx
}
