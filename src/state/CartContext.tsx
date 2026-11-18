import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const CART_STORAGE_KEY = 'nahdi-v3.cart.v1'

export type CartItem = {
  url: string
  id: string
  name: string
  imageUrl?: string
  price?: string
  oldPrice?: string
  qty: number
}

type CartContextValue = {
  items: CartItem[]
  count: number
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  removeItem: (url: string) => void
  setQty: (url: string, qty: number) => void
  clear: () => void
  beginPresentation: () => void
  endPresentation: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) throw new Error('Stored cart is not an array.')
    return value.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.url === 'string' &&
        /^https:\/\/([\w-]+\.)?nahdionline\.com\//i.test(row.url) &&
        typeof row.id === 'string' &&
        typeof row.name === 'string' &&
        Number.isInteger(row.qty) &&
        (row.qty as number) > 0 &&
        (row.price === undefined || typeof row.price === 'string') &&
        (row.oldPrice === undefined || typeof row.oldPrice === 'string')
      )
    })
  } catch (error) {
    console.error('Unable to restore the saved cart.', error)
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [storedItems, setStoredItems] = useState<CartItem[]>(loadCart)
  const [presentationItems, setPresentationItems] = useState<CartItem[] | null>(null)
  const presentationActiveRef = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedItems))
    } catch (error) {
      console.error('Unable to save the cart in this browser.', error)
    }
  }, [storedItems])

  const beginPresentation = useCallback(() => {
    presentationActiveRef.current = true
    setPresentationItems([])
  }, [])
  const endPresentation = useCallback(() => {
    presentationActiveRef.current = false
    setPresentationItems(null)
  }, [])

  const addItem = useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    const update = (previous: CartItem[] | null) => {
      const prev = previous ?? []
      const existing = prev.find((row) => row.url === item.url)
      if (existing) {
        return prev.map((row) =>
          row.url === item.url
            ? {
                ...row,
                qty: row.qty + (item.qty ?? 1),
                imageUrl: item.imageUrl ?? row.imageUrl,
                price: item.price ?? row.price,
                oldPrice: item.oldPrice ?? row.oldPrice,
                name: item.name || row.name,
              }
            : row,
        )
      }
      return [...prev, { ...item, qty: item.qty ?? 1 }]
    }

    if (presentationActiveRef.current) {
      setPresentationItems(update)
    } else {
      setStoredItems(update)
    }
  }, [])

  const removeItem = useCallback((url: string) => {
    const update = (previous: CartItem[] | null) =>
      (previous ?? []).filter((row) => row.url !== url)
    if (presentationActiveRef.current) setPresentationItems(update)
    else setStoredItems(update)
  }, [])

  const setQty = useCallback((url: string, qty: number) => {
    const update = (previous: CartItem[] | null) =>
      (previous ?? [])
        .map((row) => (row.url === url ? { ...row, qty } : row))
        .filter((row) => row.qty > 0)
    if (presentationActiveRef.current) setPresentationItems(update)
    else setStoredItems(update)
  }, [])

  const clear = useCallback(() => {
    if (presentationActiveRef.current) setPresentationItems([])
    else setStoredItems([])
  }, [])

  const items = presentationItems ?? storedItems

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      addItem,
      removeItem,
      setQty,
      clear,
      beginPresentation,
      endPresentation,
    }),
    [items, addItem, removeItem, setQty, clear, beginPresentation, endPresentation],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
