import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ar } from '../locales/ar'
import { en, type LocaleDict } from '../locales/en'
import type { VoiceLanguageOptions } from '../types/chat'

export type LocaleCode = 'en' | 'ar'

type LocaleContextValue = {
  locale: LocaleCode
  dir: 'ltr' | 'rtl'
  dict: LocaleDict
  t: (key: keyof LocaleDict) => LocaleDict[keyof LocaleDict]
  setLocale: (locale: LocaleCode) => void
  toggleLocale: () => void
  voiceLanguage: VoiceLanguageOptions
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const dicts: Record<LocaleCode, LocaleDict> = { en, ar }

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en')

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === 'en' ? 'ar' : 'en'))
  }, [])

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale === 'ar' ? 'ar' : 'en'
    document.documentElement.dir = dir
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dicts[locale]
    return {
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      dict,
      t: (key) => dict[key],
      setLocale,
      toggleLocale,
      // Noura — Soft & Welcoming · khaleeji:female_01 (AR). EN uses female_01 + English mode.
      voiceLanguage:
        locale === 'ar'
          ? { language_mode: 'ar', arabic_dialect: 'khaleeji' }
          : { language_mode: 'en', arabic_dialect: 'none' },
    }
  }, [locale, setLocale, toggleLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
