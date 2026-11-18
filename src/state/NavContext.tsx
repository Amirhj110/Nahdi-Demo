import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { uniqueNahdiProducts } from '../lib/chatProducts'
import type { ProductLink } from '../types/chat'

const ROUTINE_STORAGE_KEY = 'nahdi-v3.routine.v1'

type NavContextValue = {
  openedByLayla: boolean
  ribbonLabel: string | null
  lastRecommendations: ProductLink[]
  lastRoutineAnswer: string | null
  lastRoutineProducts: ProductLink[]
  picks: string[]
  setOpenedByLayla: (open: boolean, label?: string | null) => void
  clearRibbon: () => void
  setLastRecommendations: (products: ProductLink[]) => void
  setLastRoutineAnswer: (answer: string | null) => void
  setLastRoutineProducts: (products: ProductLink[]) => void
  setPicks: (urls: string[]) => void
}

const NavContext = createContext<NavContextValue | null>(null)

type StoredRoutine = {
  answer: string | null
  products: ProductLink[]
}

function readStoredRoutine(): StoredRoutine {
  if (typeof window === 'undefined') return { answer: null, products: [] }
  try {
    const raw = window.localStorage.getItem(ROUTINE_STORAGE_KEY)
    if (!raw) return { answer: null, products: [] }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Stored routine is not an object.')
    }
    const stored = parsed as Record<string, unknown>
    const products = Array.isArray(stored.products)
      ? stored.products.flatMap((item): ProductLink[] => {
          if (!item || typeof item !== 'object') return []
          const row = item as Record<string, unknown>
          if (typeof row.name !== 'string' || typeof row.url !== 'string') return []
          return [{
            name: row.name,
            url: row.url,
            ...(typeof row.imageUrl === 'string' ? { imageUrl: row.imageUrl } : {}),
            ...(typeof row.price === 'string' ? { price: row.price } : {}),
            ...(typeof row.rating === 'string' ? { rating: row.rating } : {}),
            ...(typeof row.ratingCount === 'string' ? { ratingCount: row.ratingCount } : {}),
          }]
        })
      : []
    return {
      answer: typeof stored.answer === 'string' ? stored.answer : null,
      products: uniqueNahdiProducts(products),
    }
  } catch (error) {
    console.error('Unable to restore the saved routine.', error)
    return { answer: null, products: [] }
  }
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [openedByLayla, setOpened] = useState(false)
  const [ribbonLabel, setRibbonLabel] = useState<string | null>(null)
  const [lastRecommendations, setLastRecommendations] = useState<ProductLink[]>([])
  const [storedRoutine, setStoredRoutine] = useState(readStoredRoutine)
  const [picks, setPicks] = useState<string[]>([])
  const lastRoutineAnswer = storedRoutine.answer
  const lastRoutineProducts = storedRoutine.products

  const setLastRoutineAnswer = useCallback((answer: string | null) => {
    setStoredRoutine((routine) => ({ ...routine, answer }))
  }, [])
  const setLastRoutineProducts = useCallback((products: ProductLink[]) => {
    setStoredRoutine((routine) => ({
      ...routine,
      products: uniqueNahdiProducts(products),
    }))
  }, [])

  const setOpenedByLayla = useCallback((open: boolean, label?: string | null) => {
    setOpened(open)
    setRibbonLabel(open ? (label ?? null) : null)
  }, [])

  const clearRibbon = useCallback(() => {
    setOpened(false)
    setRibbonLabel(null)
  }, [])

  useEffect(() => {
    try {
      if (!storedRoutine.answer && !storedRoutine.products.length) {
        window.localStorage.removeItem(ROUTINE_STORAGE_KEY)
      } else {
        window.localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(storedRoutine))
      }
    } catch (error) {
      console.error('Unable to save the routine in this browser.', error)
    }
  }, [storedRoutine])

  const value = useMemo(
    () => ({
      openedByLayla,
      ribbonLabel,
      lastRecommendations,
      lastRoutineAnswer,
      lastRoutineProducts,
      picks,
      setOpenedByLayla,
      clearRibbon,
      setLastRecommendations,
      setLastRoutineAnswer,
      setLastRoutineProducts,
      setPicks,
    }),
    [
      openedByLayla,
      ribbonLabel,
      lastRecommendations,
      lastRoutineAnswer,
      lastRoutineProducts,
      picks,
      setOpenedByLayla,
      clearRibbon,
      setLastRoutineAnswer,
      setLastRoutineProducts,
    ],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
