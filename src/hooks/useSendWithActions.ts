import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getVoiceActionReply,
  matchChatAction,
  runManualUserTurn,
} from '../lib/chatActions'
import { getMessageProducts, uniqueNahdiProducts } from '../lib/chatProducts'
import { productIdFromUrl } from '../lib/productUrl'
import { useCart } from '../state/CartContext'
import { useLayla } from '../state/LaylaContext'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'

function useChatActionExecutor() {
  const { openPanel, closePanel, collapseToMiniPlayer, messages } = useLayla()
  const { dict } = useLocale()
  const navigate = useNavigate()
  const { addItem, items: cartItems } = useCart()
  const {
    lastRecommendations,
    lastRoutineAnswer,
    lastRoutineProducts,
    setLastRecommendations,
    setOpenedByLayla,
    setPicks,
  } = useNav()

  return useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || document.body.classList.contains('live-demo-active')) {
        return { handled: false }
      }

      const action = matchChatAction(text)
      if (!action) return { handled: false }
      openPanel()

      const recentProducts = uniqueNahdiProducts(
        [...messages]
          .reverse()
          .filter((message) => message.role === 'assistant')
          .map(getMessageProducts)
          .find((products) => products.length > 0) ?? lastRecommendations,
      )
      const routeTo = (
        path: string,
        label = dict.opened,
        options: { preservePanel?: boolean; state?: { openCheckout: boolean } } = {},
      ) => {
        setOpenedByLayla(true, label)
        if (options.preservePanel) {
          openPanel()
        } else {
          collapseToMiniPlayer()
          closePanel()
        }
        navigate(path, options.state ? { state: options.state } : undefined)
      }
      const addProducts = (products: typeof recentProducts) => {
        for (const product of products) {
          addItem({
            id: productIdFromUrl(product.url),
            url: product.url,
            name: product.name,
            imageUrl: product.imageUrl,
            price: product.price,
          })
        }
      }

      switch (action.kind) {
        case 'open_first': {
          const first = recentProducts[0]
          if (first) {
            setLastRecommendations(recentProducts)
            setPicks([first.url])
            routeTo(`/p/${productIdFromUrl(first.url)}`, dict.opened, {
              preservePanel: true,
            })
          }
          break
        }
        case 'add_cart': {
          const products = action.multiple ? recentProducts : recentProducts.slice(0, 1)
          if (products.length) {
            setLastRecommendations(recentProducts)
            addProducts(products)
            setOpenedByLayla(true, dict.added)
          }
          return { handled: true, affectedProducts: products.length }
        }
        case 'add_routine': {
          if (lastRoutineProducts.length) {
            addProducts(lastRoutineProducts)
            setOpenedByLayla(true, dict.added)
            routeTo('/cart', dict.added)
          }
          return { handled: true, affectedProducts: lastRoutineProducts.length }
        }
        case 'checkout':
          routeTo('/cart', dict.opened, {
            state: cartItems.length ? { openCheckout: true } : undefined,
          })
          break
        case 'cart':
          routeTo('/cart')
          break
        case 'routine':
          if (!lastRoutineAnswer && !lastRoutineProducts.length) return { handled: false }
          routeTo('/routine')
          break
        case 'skin_scan':
          routeTo('/skin-scan')
          break
        case 'deals':
          routeTo('/c/deals')
          break
        case 'home':
          routeTo('/')
          break
        case 'thanks':
          break
      }

      return {
        handled: true,
        affectedProducts: action.kind === 'open_first' ? Number(recentProducts.length > 0) : 0,
      }
    },
    [
      addItem,
      cartItems.length,
      closePanel,
      collapseToMiniPlayer,
      dict.added,
      dict.opened,
      lastRecommendations,
      lastRoutineAnswer,
      lastRoutineProducts,
      messages,
      navigate,
      openPanel,
      setLastRecommendations,
      setOpenedByLayla,
      setPicks,
    ],
  )
}

export function usePerformChatActions() {
  return useChatActionExecutor()
}

export function useSendWithActions() {
  const { sendMessage, openPanel, pushLocalExchange } = useLayla()
  const { locale } = useLocale()
  const performActions = useChatActionExecutor()

  return useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      openPanel()
      const action = matchChatAction(text)
      await runManualUserTurn(
        async () => {
          const execution = await performActions(text)
          if (!execution.handled || !action) return false
          await pushLocalExchange(
            text,
            getVoiceActionReply(action, locale, execution.affectedProducts),
          )
          return true
        },
        () => sendMessage(text),
      )
    },
    [locale, openPanel, performActions, pushLocalExchange, sendMessage],
  )
}
