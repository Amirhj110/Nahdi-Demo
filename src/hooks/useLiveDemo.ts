import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductById, productsForConcern, productsForStep, type CatalogProduct } from '../data/catalog'
import { productIdFromUrl } from '../lib/productUrl'
import { useCart } from '../state/CartContext'
import { useLayla } from '../state/LaylaContext'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'
import type { ProductLink, TtsVoiceId } from '../types/chat'
import type { RoutinePlan, RoutinePlanStep } from '../types/routine'

const DEMO_SCRIPT = {
  en: [
    'Hi Layla, my skin gets really dry and tight with the AC',
    'Open the first one please',
    'Wait, just add it to my cart',
    'Can you check my skin from a selfie?',
    'Build me a morning and night routine',
    'Take me to checkout',
    'Thank you Layla',
  ],
  ar: [
    'هلا ليلى، بشرتي جافة وتشد مع المكيف',
    'افتحي المنتج الأول لو سمحتي',
    'لحظة، بس أضيفيه للسلة',
    'تقدرين تفحصين بشرتي من صورة سيلفي؟',
    'سوّي لي روتين صباحي ومسائي',
    'ودّيني للدفع',
    'شكرًا ليلى',
  ],
} as const

const DEMO_REPLIES = {
  en: [
    'For dry, tight skin, a gentle cleanse, a nourishing moisturizer, and daily SPF are a good place to start. I’ve opened the dry-skin picks for you.',
    'I’ve opened my top recommendation for dry skin.',
    'Done—I added the product to your cart. Would you like a morning and evening routine to go with it?',
    'Of course. I’ve opened the skin scan. You can scan your selfie or review the clearly labelled sample result first.',
    'I’ve put together a morning and evening routine for dry, tight skin. The steps and matching products are ready to review.',
    'Your cart is ready. I’m opening checkout so you can review delivery or pickup.',
    'You’re welcome! Your moisturizer is in the cart, and your morning and evening routine is ready to review.',
  ],
  ar: [
    'للبشرة الجافة والمشدودة، ابدئي بتنظيف لطيف ومرطب غني وواقي شمس يومي. فتحت لك خيارات البشرة الجافة.',
    'فتحت لك خياري الأول للبشرة الجافة.',
    'تمت إضافة المنتج إلى سلتك. هل أجهز لك روتينًا صباحيًا ومسائيًا يناسب بشرتك؟',
    'أكيد. فتحت لك فحص البشرة. يمكنك فحص صورتك أو مراجعة نتيجة الصورة النموذجية الموضحة أولًا.',
    'جهزت لك روتينًا صباحيًا ومسائيًا للبشرة الجافة والمشدودة. الخطوات والمنتجات المناسبة جاهزة للمراجعة.',
    'سلتك جاهزة. أفتح لك صفحة إتمام الطلب لمراجعة التوصيل أو الاستلام.',
    'على الرحب والسعة! المنتج في سلتك وروتين الصباح والمساء جاهز للمراجعة.',
  ],
} as const

function toProductLink(product: CatalogProduct): ProductLink {
  return {
    name: product.name,
    url: product.url,
    ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    ...(product.price ? { price: product.price } : {}),
    ...(product.rating ? { rating: product.rating } : {}),
    ...(product.ratingCount ? { ratingCount: product.ratingCount } : {}),
  }
}

type DemoSpeechPlayback = {
  done: Promise<void>
  cancel: () => void
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function waitForDemo(ms: number, isCancelled: () => boolean) {
  const endTime = Date.now() + ms
  while (!isCancelled() && Date.now() < endTime) {
    await sleep(Math.min(100, endTime - Date.now()))
  }
}

function createDemoSpeech(
  text: string,
  locale: 'en' | 'ar',
  voice: TtsVoiceId,
  onProgress: (caption: string, speaking: boolean) => void,
  onUnavailable: () => void,
): DemoSpeechPlayback {
  let resolveDone: () => void = () => {}
  let settled = false
  let audio: HTMLAudioElement | null = null
  let audioUrl: string | null = null
  let completionTimeout: number | undefined
  const controller = new AbortController()
  const words = text.match(/\S+/g) ?? []
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })
  const finish = (unavailable = false) => {
    if (settled) return
    settled = true
    if (completionTimeout !== undefined) window.clearTimeout(completionTimeout)
    if (audio) {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      audioUrl = null
    }
    if (unavailable) onUnavailable()
    onProgress(text, false)
    resolveDone()
  }
  const updateProgress = () => {
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
    const wordCount = Math.ceil(words.length * (audio.currentTime / audio.duration))
    onProgress(words.slice(0, wordCount).join(' '), true)
  }

  void (async () => {
    try {
      const response = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: { Accept: 'audio/wav', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: locale, voice }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(27_000)]),
      })
      if (!response.ok) throw new Error(`Neural voice request failed (${response.status}).`)
      const blob = await response.blob()
      if (!blob.size || controller.signal.aborted) {
        if (!controller.signal.aborted) throw new Error('Neural voice returned empty audio.')
        finish()
        return
      }

      audioUrl = URL.createObjectURL(blob)
      audio = new Audio(audioUrl)
      audio.preload = 'auto'
      audio.addEventListener('play', () => onProgress('', true), { once: true })
      audio.addEventListener('timeupdate', updateProgress)
      audio.addEventListener('ended', () => finish(), { once: true })
      audio.addEventListener('error', () => finish(true), { once: true })
      completionTimeout = window.setTimeout(
        () => finish(true),
        Math.max(12_000, words.length * 900),
      )
      await audio.play()
    } catch (error) {
      if (controller.signal.aborted) {
        finish()
        return
      }
      console.error('Demo neural voice playback failed.', error)
      finish(true)
    }
  })()

  return {
    done,
    cancel: () => {
      if (settled) return
      controller.abort()
      finish()
    },
  }
}

async function typeDemoCaption(
  text: string,
  onProgress: (caption: string) => void,
  isCancelled: () => boolean,
) {
  let caption = ''
  for (const word of text.match(/\S+\s*/g) ?? [text]) {
    if (isCancelled()) return
    caption += word
    onProgress(caption.trimEnd())
    await sleep(110)
  }
  if (!isCancelled()) onProgress(text)
}

function waitForSkinScanReady(timeoutMs = 5_000): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ready: boolean) => {
      window.clearTimeout(timeout)
      window.removeEventListener('nahdi:skin-scan-ready', onReady)
      window.removeEventListener('nahdi:live-demo-stop', onStop)
      resolve(ready)
    }
    const onReady = () => finish(true)
    const onStop = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)
    window.addEventListener('nahdi:skin-scan-ready', onReady, { once: true })
    window.addEventListener('nahdi:live-demo-stop', onStop, { once: true })
  })
}

function waitForSkinScanCompletion(timeoutMs = 20_000): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (completed: boolean) => {
      window.clearTimeout(timeout)
      window.removeEventListener('nahdi:skin-scan-complete', onComplete)
      window.removeEventListener('nahdi:skin-scan-error', onError)
      window.removeEventListener('nahdi:live-demo-stop', onStop)
      resolve(completed)
    }
    const onComplete = () => finish(true)
    const onError = () => finish(false)
    const onStop = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)
    window.addEventListener('nahdi:skin-scan-complete', onComplete, { once: true })
    window.addEventListener('nahdi:skin-scan-error', onError, { once: true })
    window.addEventListener('nahdi:live-demo-stop', onStop, { once: true })
  })
}

function waitForCartReady(timeoutMs = 5_000): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ready: boolean) => {
      window.clearTimeout(timeout)
      window.removeEventListener('nahdi:cart-ready', onReady)
      window.removeEventListener('nahdi:live-demo-stop', onStop)
      resolve(ready)
    }
    const onReady = () => finish(true)
    const onStop = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)
    window.addEventListener('nahdi:cart-ready', onReady, { once: true })
    window.addEventListener('nahdi:live-demo-stop', onStop, { once: true })
  })
}

export function useLiveDemo() {
  const { locale, dict } = useLocale()
  const navigate = useNavigate()
  const {
    openedByLayla,
    ribbonLabel,
    lastRecommendations,
    picks,
    setOpenedByLayla,
    setLastRecommendations,
    setPicks,
  } = useNav()
  const {
    beginDemoPresentation,
    interruptVoiceSpeech,
    isSending,
    mode,
    openPanel,
    pushLocalExchange,
    setDemoPresentationCaption,
    setVoiceMuted,
    speakLocalNarration,
    ttsVoiceId,
    voiceState,
  } = useLayla()
  const { addItem, beginPresentation, endPresentation } = useCart()
  const [running, setRunning] = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [featureUnavailable, setFeatureUnavailable] = useState(false)
  const cancelRef = useRef(false)
  const runningRef = useRef(false)
  const speechRef = useRef<DemoSpeechPlayback | null>(null)
  const restoreConversationRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    if (!runningRef.current) return
    cancelRef.current = true
    speechRef.current?.cancel()
    speechRef.current = null
    interruptVoiceSpeech()
    window.dispatchEvent(new Event('nahdi:live-demo-stop'))
  }, [interruptVoiceSpeech])

  const run = useCallback(async () => {
    if (runningRef.current) {
      stop()
      return
    }

    if (isSending || voiceState === 'connecting' || voiceState === 'speaking') {
      setBusy(true)
      return
    }

    setBusy(false)
    setAudioUnavailable(false)
    setFeatureUnavailable(false)
    cancelRef.current = false
    runningRef.current = true
    setRunning(true)
    setStepIndex(0)
    document.body.classList.add('live-demo-active')
    beginPresentation()
    const restoreConversation = beginDemoPresentation()
    restoreConversationRef.current = restoreConversation

    const savedNavigation = {
      openedByLayla,
      ribbonLabel,
      lastRecommendations,
      picks,
    }
    const activeVoiceCall =
      mode === 'voice' &&
      (voiceState === 'connected' || voiceState === 'listening' || voiceState === 'muted')
    const wasMuted = voiceState === 'muted'
    const restoreNavigation = () => {
      setOpenedByLayla(savedNavigation.openedByLayla, savedNavigation.ribbonLabel)
      setLastRecommendations(savedNavigation.lastRecommendations)
      setPicks(savedNavigation.picks)
    }

    try {
      if (activeVoiceCall && !wasMuted) await setVoiceMuted(true)
      openPanel()
      navigate('/')

      const products = productsForConcern('dry').slice(0, 3).map(toProductLink)
      const routineCatalog = [
        getProductById('101594178'),
        productsForStep('sunscreen').find((product) => product.id === '101275222'),
        getProductById('101363599'),
        getProductById('100571599'),
      ].filter((product): product is CatalogProduct => Boolean(product))
      const routineProducts = routineCatalog.map(toProductLink)
      const routineById = new Map(
        routineProducts.map((product) => [productIdFromUrl(product.url), product]),
      )
      const routineStep = (
        title: string,
        description: string,
        productId?: string,
      ): RoutinePlanStep => {
        const product = productId ? routineById.get(productId) : undefined
        return { title, description, ...(product ? { product } : {}) }
      }
      const routinePlan: RoutinePlan = locale === 'ar'
        ? {
            morning: [
              routineStep('تنظيف لطيف', 'استخدمي منظفًا لطيفًا وماءً فاترًا.'),
              routineStep('ترطيب', 'ضعي مرطبًا مهدئًا على البشرة الجافة.', '101594178'),
              routineStep('حماية من الشمس', 'أنهي الروتين بواقي شمس واسع الطيف.', '101275222'),
            ],
            evening: [
              routineStep('تنظيف لطيف', 'أزيلي واقي الشمس بلطف وتجنبي الماء الساخن.'),
              routineStep('ترطيب ليلي', 'استخدمي مرطبًا غنيًا لدعم حاجز البشرة.', '101363599'),
              routineStep('المناطق شديدة الجفاف', 'ضعي طبقة إضافية على المناطق المشدودة عند الحاجة.', '100571599'),
            ],
          }
        : {
            morning: [
              routineStep('Cleanse gently', 'Use a gentle cleanser and lukewarm water.'),
              routineStep('Moisturize', 'Apply a soothing moisturizer to dry skin.', '101594178'),
              routineStep('Protect', 'Finish with broad-spectrum sunscreen.', '101275222'),
            ],
            evening: [
              routineStep('Cleanse gently', 'Remove sunscreen gently and avoid hot water.'),
              routineStep('Moisturize overnight', 'Use a richer moisturizer to support the skin barrier.', '101363599'),
              routineStep('Dry areas', 'Apply an extra layer to tight areas as needed.', '100571599'),
            ],
          }
      const script = DEMO_SCRIPT[locale]
      const replies = DEMO_REPLIES[locale]
      setLastRecommendations(products)
      setPicks(products.map((product) => product.url))

      const showUserLine = async (index: number, wasInterrupted = false) => {
        setStepIndex(index)
        if (!activeVoiceCall) {
          setDemoPresentationCaption('user', '', false, wasInterrupted)
        }
        if (activeVoiceCall) return
        await typeDemoCaption(
          script[index],
          (caption) => setDemoPresentationCaption('user', caption, false, wasInterrupted),
          () => cancelRef.current,
        )
        if (!cancelRef.current) await sleep(350)
      }

      const startDemoVoice = (text: string) => {
        const playback = createDemoSpeech(
          text,
          locale,
          locale === 'ar' ? 'noura' : ttsVoiceId,
          (caption, speaking) => setDemoPresentationCaption('assistant', caption, speaking),
          () => setAudioUnavailable(true),
        )
        speechRef.current = playback
        void playback.done.then(() => {
          if (speechRef.current === playback) speechRef.current = null
        })
        return playback
      }

      const playExchange = async (
        index: number,
        options: { products?: typeof products; awaitSpeech?: boolean } = {},
      ) => {
        const reply =
          index === 1 && products[0]
            ? locale === 'ar'
              ? `أرشح لك ${products[0].name}، وهو مناسب للبشرة الجافة والمشدودة. أفتح لك صفحة المنتج الآن.`
              : `My first pick is ${products[0].name}, a good match for dry, tight skin. I’m opening its product page now.`
            : index === 2 && products[0]
              ? locale === 'ar'
                ? `تمت إضافة ${products[0].name} إلى سلتك. هل أجهز لك روتينًا صباحيًا ومسائيًا يناسب بشرتك؟`
                : `${products[0].name} is in your cart. Would you like a morning and evening routine to go with it?`
            : replies[index]
        await pushLocalExchange(script[index], reply, options)
        if (activeVoiceCall || cancelRef.current) return null
        const playback = startDemoVoice(reply)
        if (options.awaitSpeech !== false) await playback.done
        return playback
      }

      const greeting =
        locale === 'ar'
          ? 'هلا، معك ليلى من النهدي. أنا أسمعك — قولي لي كيف تشعر بشرتك اليوم.'
          : 'Hi, I’m Layla from Nahdi. I’m listening — tell me how your skin feels today.'
      if (activeVoiceCall) {
        await speakLocalNarration(greeting)
      } else {
        setDemoPresentationCaption('assistant', '', true)
        const greetingSpeech = startDemoVoice(greeting)
        await greetingSpeech.done
      }
      if (cancelRef.current) return
      await sleep(650)

      await showUserLine(0)
      if (cancelRef.current) return
      setOpenedByLayla(true, dict.opened)
      navigate('/c/dry')
      await playExchange(0, { products })
      if (cancelRef.current) return

      await showUserLine(1)
      if (cancelRef.current) return
      const first = products[0]
      if (first) {
        setOpenedByLayla(true, dict.opened)
        setPicks([first.url])
        navigate(`/p/${productIdFromUrl(first.url)}`)
      }
      await playExchange(1, { awaitSpeech: false })
      await waitForDemo(3_200, () => cancelRef.current)
      if (cancelRef.current) return
      if (activeVoiceCall) interruptVoiceSpeech()
      else {
        speechRef.current?.cancel()
        speechRef.current = null
      }
      setDemoPresentationCaption('user', '', false, true)
      await showUserLine(2, true)
      if (cancelRef.current) return
      if (first) {
        addItem({
          id: productIdFromUrl(first.url),
          url: first.url,
          name: first.name,
          imageUrl: first.imageUrl,
          price: first.price,
        })
        setOpenedByLayla(true, dict.added)
      }
      await playExchange(2)
      if (cancelRef.current) return

      await showUserLine(3)
      if (cancelRef.current) return
      setOpenedByLayla(true, dict.opened)
      const scanReady = waitForSkinScanReady()
      navigate('/skin-scan')
      if (!(await scanReady)) {
        if (!cancelRef.current) setFeatureUnavailable(true)
        return
      }
      const scanComplete = waitForSkinScanCompletion()
      window.dispatchEvent(new Event('nahdi:live-demo-scan'))
      const scanResponse = playExchange(3)
      const [scanCompleted] = await Promise.all([scanComplete, scanResponse])
      if (cancelRef.current) return
      if (!scanCompleted) {
        setFeatureUnavailable(true)
        return
      }

      await showUserLine(4)
      if (cancelRef.current) return
      setOpenedByLayla(true, dict.opened)
      setLastRecommendations(routineProducts)
      setPicks(routineProducts.map((product) => product.url))
      navigate('/routine', { state: { liveDemoRoutine: routinePlan } })
      await playExchange(4, { products: routineProducts })
      if (cancelRef.current) return

      await showUserLine(5)
      if (cancelRef.current) return
      setOpenedByLayla(true, dict.opened)
      const cartReady = waitForCartReady()
      navigate('/cart')
      if (!(await cartReady)) {
        if (!cancelRef.current) setFeatureUnavailable(true)
        return
      }
      window.dispatchEvent(new Event('nahdi:live-demo-checkout'))
      await playExchange(5)
      if (cancelRef.current) return

      await showUserLine(6)
      if (!cancelRef.current) await playExchange(6)
    } finally {
      speechRef.current?.cancel()
      speechRef.current = null
      if (activeVoiceCall && !wasMuted) await setVoiceMuted(false)
      restoreConversationRef.current?.()
      restoreConversationRef.current = null
      restoreNavigation()
      runningRef.current = false
      setRunning(false)
      setStepIndex(-1)
      document.body.classList.remove('live-demo-active')
      endPresentation()
      window.dispatchEvent(new Event('nahdi:live-demo-stop'))
    }
  }, [
    addItem,
    beginDemoPresentation,
    beginPresentation,
    dict.added,
    dict.opened,
    endPresentation,
    interruptVoiceSpeech,
    isSending,
    lastRecommendations,
    locale,
    mode,
    navigate,
    openPanel,
    picks,
    pushLocalExchange,
    ribbonLabel,
    setDemoPresentationCaption,
    setLastRecommendations,
    setOpenedByLayla,
    setPicks,
    setVoiceMuted,
    speakLocalNarration,
    ttsVoiceId,
    stop,
    voiceState,
    openedByLayla,
  ])

  return {
    running,
    stepIndex,
    run,
    stop,
    script: DEMO_SCRIPT[locale],
    audioUnavailable,
    busy,
    featureUnavailable,
  }
}
