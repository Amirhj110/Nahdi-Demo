import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductCard } from '../components/products/ProductCard'
import type {
  SkinAnalysis,
  SkinConcern,
  SkinConcernId,
} from '../types/skinAnalysis'
import type { SkinScanErrorCode } from '../services/skinAnalysis'
import { analyzeSkinImage, compressSkinImage, SkinScanError } from '../services/skinAnalysis'
import { productIdFromUrl } from '../lib/productUrl'
import { useLayla } from '../state/LaylaContext'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'

type Phase = 'intro' | 'camera' | 'scanning' | 'results' | 'error'
type PendingScanNarration = { text: string }

function getErrorCode(error: unknown): SkinScanErrorCode {
  return error instanceof SkinScanError ? error.code : 'generic'
}

function describeConcerns(
  concerns: SkinConcern[],
  labels: Record<SkinConcernId, string>,
  noConcerns: string,
  locale: 'en' | 'ar',
): string {
  return concerns.length
    ? concerns.map((concern) => labels[concern.id]).join(locale === 'ar' ? '، ' : ', ')
    : noConcerns.replace(/[.!?؟]+$/, '')
}

function toLaylaPrompt(
  locale: 'en' | 'ar',
  concerns: SkinConcern[],
  labels: Record<SkinConcernId, string>,
): string {
  const details = concerns
    .map((concern) => `${concern.id} (${labels[concern.id]})`)
    .join(locale === 'ar' ? '، ' : ', ')
  return locale === 'ar'
    ? `ملاحظات الصورة المقبولة من الفحص: ${details}. اشرحيها بإيجاز وبلهجة سعودية طبيعية. اطلبي منتجات مناسبة لهذه الملاحظات فقط من قاعدة معرفة النهدي، مع روابط صفحات منتجات مؤكدة عند توفرها. لا تقترحي منتجات لا تدعم أوصافها هذه الملاحظات، ولا تستنتجي نوع البشرة أو أسبابًا أو ملاحظات غير مدرجة. لا تذكري درجات الثقة أو مزودي الخدمة، ولا تشخّصي حالة طبية.`
    : `Accepted scan findings: ${details}. Briefly explain only these findings and request suitable products from the Nahdi knowledge base, with verified product-page links when available. Recommend only products whose retrieved descriptions directly support one or more listed findings; omit unrelated items. Do not infer skin type, causes, or unlisted concerns, mention confidence scores or providers, or diagnose a medical condition.`
}

function toLaylaSummary(
  locale: 'en' | 'ar',
  concerns: SkinConcern[],
  labels: Record<SkinConcernId, string>,
  noConcerns: string,
  productNames: string[],
): string {
  const details = describeConcerns(concerns, labels, noConcerns, locale)
  const matchedProducts = productNames.slice(0, 2)
  const moreProducts = productNames.length > 2
  return locale === 'ar'
    ? `الملاحظات الظاهرة: ${details}. ${matchedProducts.length ? `أرشّح لكِ ${matchedProducts.join('، ')}${moreProducts ? ' وخيارات أخرى بالأسفل.' : '.'}` : 'يمكنكِ طلب ترشيحات أو روتين مناسب.'}`
    : `Visible concerns: ${details}. ${matchedProducts.length ? `I recommend ${matchedProducts.join(' and ')}${moreProducts ? ', with more options below.' : '.'}` : 'You can ask me for suitable products or a routine.'}`
}

export function SkinScanPage() {
  const { dict, locale } = useLocale()
  const {
    openPanel,
    sendMessage,
    pushLocalExchange,
    speakLocalNarration,
    voiceState,
    voiceSpeakerEnabled,
    isSending,
  } = useLayla()
  const { setOpenedByLayla, setLastRecommendations, lastRecommendations } = useNav()
  const [phase, setPhase] = useState<Phase>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [scanError, setScanError] = useState<SkinScanErrorCode | null>(null)
  const [cameraError, setCameraError] = useState<SkinScanErrorCode | null>(null)
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null)
  const [isSample, setIsSample] = useState(false)
  const imageRef = useRef<Blob | null>(null)
  const pendingNarrationRef = useRef<PendingScanNarration[]>([])
  const demoScanCancelledRef = useRef(false)
  const [narrationRevision, setNarrationRevision] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const queueScanNarration = useCallback((text: string) => {
    if (!text.trim()) return
    const voiceActive =
      voiceState === 'connecting' ||
      voiceState === 'connected' ||
      voiceState === 'listening' ||
      voiceState === 'speaking' ||
      voiceState === 'muted'
    if (!voiceActive) return
    pendingNarrationRef.current.push({ text })
    setNarrationRevision((revision) => revision + 1)
  }, [voiceState])

  useEffect(() => {
    if (voiceState === 'error' || voiceState === 'disconnected') {
      pendingNarrationRef.current = []
      return
    }
    if (
      isSending ||
      (voiceState !== 'listening' && voiceState !== 'muted')
    ) return
    if (!voiceSpeakerEnabled) {
      pendingNarrationRef.current = []
      return
    }
    const narration = pendingNarrationRef.current.shift()
    if (!narration) return
    void speakLocalNarration(narration.text)
  }, [isSending, narrationRevision, speakLocalNarration, voiceSpeakerEnabled, voiceState])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => {
    stopCamera()
  }, [stopCamera])

  useEffect(() => {
    if (!photo?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(photo)
  }, [photo])

  const runAnalysis = useCallback(async (image: Blob, sample: boolean, demo = false) => {
    stopCamera()
    imageRef.current = image
    setPhoto(URL.createObjectURL(image))
    setIsSample(sample)
    setAnalysis(null)
    setScanError(null)
    setLastRecommendations([])
    setPhase('scanning')
    setStepIndex(0)
    if (!demo) {
      queueScanNarration(
        locale === 'ar'
          ? 'وصلتني الصورة. سأبدأ الآن.'
          : 'Your photo is ready. I’ll get started.',
      )
      queueScanNarration(dict.stepsL[0])
    }

    const showResults = (result: SkinAnalysis, isDemo = false) => {
      setStepIndex(3)
      if (!isDemo) queueScanNarration(dict.stepsL[3])
      setAnalysis(result)
      setLastRecommendations([])
      setPhase('results')
      setStepIndex(dict.stepsL.length - 1)
      if (!isDemo) queueScanNarration(dict.stepsL[4])
      setOpenedByLayla(true, dict.opened)
      openPanel()
      window.dispatchEvent(new Event('nahdi:skin-scan-complete'))
      if (isDemo) return

      const summary = toLaylaSummary(
        locale,
        result.concerns,
        dict.scanConcernLabels,
        dict.scanNoConcerns,
        [],
      )
      void pushLocalExchange(
        locale === 'ar' ? 'نتيجة فحص البشرة' : 'Skin scan results',
        summary,
      )
      if (!result.concerns.length) return
      void sendMessage(
        toLaylaPrompt(
          locale,
          result.concerns,
          dict.scanConcernLabels,
        ),
      )
    }

    try {
      if (demo) {
        setStepIndex(3)
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        if (demoScanCancelledRef.current) {
          window.dispatchEvent(new Event('nahdi:skin-scan-complete'))
          return
        }
        showResults({ concerns: [] }, true)
        return
      }

      const prepared = await compressSkinImage(image)
      setStepIndex(1)
      queueScanNarration(dict.stepsL[1])
      const result = await analyzeSkinImage(prepared, locale)
      setStepIndex(2)
      queueScanNarration(dict.stepsL[2])
      showResults(result.analysis)
    } catch (error) {
      const code = getErrorCode(error)
      queueScanNarration(
        locale === 'ar'
          ? 'تعذر إكمال الفحص. يمكنكِ إعادة المحاولة أو رفع صورة أخرى.'
          : 'I couldn’t complete the scan. You can retry or upload another photo.',
      )
      setScanError(code)
      setPhase('error')
      window.dispatchEvent(new Event(demo ? 'nahdi:skin-scan-error' : 'nahdi:skin-scan-complete'))
    }
  }, [
    dict,
    locale,
    openPanel,
    pushLocalExchange,
    queueScanNarration,
    sendMessage,
    setLastRecommendations,
    setOpenedByLayla,
    stopCamera,
  ])

  const openCamera = async () => {
    queueScanNarration(
      locale === 'ar'
        ? 'سأفتح الكاميرا الآن. واجهيها في إضاءة جيدة ثم التقطي صورة سيلفي.'
        : 'I’m opening the camera. Face it in good light, then take a selfie.',
    )
    setCameraError(null)
    stopCamera()
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('cameraUnavailable')
      queueScanNarration(
        locale === 'ar'
          ? 'الكاميرا غير متاحة في هذا المتصفح. يمكنكِ رفع صورة بدلًا من ذلك.'
          : 'The camera is unavailable in this browser. You can upload a photo instead.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setPhase('camera')
      queueScanNarration(
        locale === 'ar'
          ? 'الكاميرا جاهزة. التقطي صورة عندما تكونين مستعدة.'
          : 'The camera is ready. Take a selfie when you’re ready.',
      )
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => setCameraError('cameraUnavailable'))
        }
      })
    } catch {
      setCameraError('cameraDenied')
      queueScanNarration(
        locale === 'ar'
          ? 'لم أتمكن من فتح الكاميرا. تحققي من الإذن أو ارفعي صورة بدلًا من ذلك.'
          : 'I couldn’t open the camera. Check its permission or upload a photo instead.',
      )
    }
  }

  const snap = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('cameraUnavailable')
      return
    }
    const longestSide = Math.max(video.videoWidth, video.videoHeight)
    const scale = Math.min(1, 1280 / longestSide)
    const width = Math.round(video.videoWidth * scale)
    const height = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('invalidImage')
      return
    }
    context.translate(width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, width, height)
    const image = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.84),
    )
    stopCamera()
    if (!image) {
      setCameraError('invalidImage')
      return
    }
    await runAnalysis(image, false)
  }

  const onUpload = (file: File | undefined) => {
    if (!file) return
    void runAnalysis(file, false)
  }

  const loadSample = async () => {
    queueScanNarration(
      locale === 'ar'
        ? 'سأحمّل صورة العينة وأفحص الملاحظات التجميلية الظاهرة.'
        : 'I’m loading the sample photo and checking its visible cosmetic concerns.',
    )
    try {
      const response = await fetch('/sample-skin.jpg', { cache: 'force-cache' })
      if (!response.ok) throw new Error('sample_unavailable')
      await runAnalysis(await response.blob(), true)
    } catch (error) {
      queueScanNarration(
        locale === 'ar'
          ? 'تعذر تحميل صورة العينة. يمكنكِ التقاط صورة أو رفع صورة بدلًا من ذلك.'
          : 'I couldn’t load the sample photo. You can take or upload a photo instead.',
      )
      setScanError(getErrorCode(error))
      setPhase('error')
      window.dispatchEvent(new Event('nahdi:skin-scan-complete'))
    }
  }

  const runAnalysisRef = useRef(runAnalysis)
  useEffect(() => {
    runAnalysisRef.current = runAnalysis
  }, [runAnalysis])

  useEffect(() => {
    const startDemoScan = () => {
      demoScanCancelledRef.current = false
      void (async () => {
        try {
          const response = await fetch('/sample-skin.jpg', { cache: 'force-cache' })
          if (!response.ok) throw new Error('sample_unavailable')
          if (demoScanCancelledRef.current) return
          await runAnalysisRef.current(await response.blob(), true, true)
        } catch (error) {
          if (demoScanCancelledRef.current) return
          console.error('Live demo sample scan failed.', error)
          setScanError(getErrorCode(error))
          setPhase('error')
          window.dispatchEvent(new Event('nahdi:skin-scan-error'))
        }
      })()
    }
    const stopDemoScan = () => {
      demoScanCancelledRef.current = true
      imageRef.current = null
      pendingNarrationRef.current = []
      setPhase('intro')
      setStepIndex(0)
      setPhoto(null)
      setScanError(null)
      setAnalysis(null)
      setIsSample(false)
    }
    window.addEventListener('nahdi:live-demo-scan', startDemoScan)
    window.addEventListener('nahdi:live-demo-stop', stopDemoScan)
    window.dispatchEvent(new Event('nahdi:skin-scan-ready'))
    return () => {
      window.removeEventListener('nahdi:live-demo-scan', startDemoScan)
      window.removeEventListener('nahdi:live-demo-stop', stopDemoScan)
    }
  }, [])

  const retry = () => {
    if (imageRef.current) void runAnalysis(imageRef.current, isSample)
    else {
      setPhase('intro')
      setScanError(null)
    }
  }

  const reset = () => {
    pendingNarrationRef.current = []
    stopCamera()
    imageRef.current = null
    setPhoto(null)
    setAnalysis(null)
    setScanError(null)
    setCameraError(null)
    setIsSample(false)
    setLastRecommendations([])
    setPhase('intro')
  }

  const recommendationsPending = phase === 'results' && isSending && lastRecommendations.length === 0

  return (
    <div className="page-wrap py-6">
      <h1 className="text-[28px] font-black text-[var(--navy2)]">{dict.scanT}</h1>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onUpload(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {phase === 'intro' && (
        <div className="mt-5 overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--navy2)] to-[var(--blue)] p-8 text-center text-white">
          <h2 className="text-[26px] font-black">{dict.scanH}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-white/85">{dict.scanP}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[var(--blue)]" onClick={() => void loadSample()}>
              {dict.sampleB}
            </button>
            <button type="button" className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-bold" onClick={() => void openCamera()}>
              {dict.takeS}
            </button>
            <button type="button" className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-bold" onClick={() => fileRef.current?.click()}>
              {dict.uploadI}
            </button>
          </div>
          {cameraError && <p role="status" className="mx-auto mt-3 max-w-md rounded-lg bg-white/10 px-3 py-2 text-[12px] text-white/90">{dict.scanErrors[cameraError]}</p>}
          <p className="mt-4 text-[12px] text-white/70">{dict.priv}</p>
        </div>
      )}

      {phase === 'intro' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-[18px] font-extrabold text-[var(--navy2)]">{dict.howScan}</h3>
            <ol className="mt-4 space-y-3">
              {dict.scanSteps.map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-[var(--blue)] text-[12px] font-extrabold text-white">{index + 1}</span>
                  <div><div className="font-bold">{title}</div><div className="text-[13px] text-[var(--muted)]">{body}</div></div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-[18px] font-extrabold text-[var(--navy2)]">{dict.checksH}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.values(dict.scanConcernLabels).map((label) => <span key={label} className="rounded-full bg-[var(--sky)] px-3 py-1.5 text-[13px] font-semibold text-[var(--blue)]">{label}</span>)}
            </div>
            <p className="mt-4 text-[13px] text-[var(--muted)]">{dict.scanTip}</p>
          </div>
        </div>
      )}

      {phase === 'camera' && (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
          <div className="mx-auto aspect-square max-w-md overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
          </div>
          {cameraError && <p role="status" className="mt-3 text-center text-[12px] text-[var(--muted)]">{dict.scanErrors[cameraError]}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="rounded-full bg-[var(--blue)] px-5 py-2.5 text-[13px] font-bold text-white" onClick={() => void snap()}>{dict.takeS}</button>
            <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px] font-bold" onClick={() => { stopCamera(); setPhase('intro') }}>{dict.cancel}</button>
          </div>
        </div>
      )}

      {phase === 'scanning' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black">
            {photo && <img src={photo} alt={isSample ? dict.samplePhoto : dict.scanT} className="aspect-square w-full object-cover" />}
            {isSample && <div className="bg-white px-3 py-2 text-center text-[12px] font-semibold text-[var(--navy2)]">{dict.samplePhoto}</div>}
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
            <h2 className="text-[22px] font-extrabold text-[var(--navy2)]">{dict.analysing}</h2>
            <p className="mt-2 text-[13px] text-[var(--muted)]">{dict.analysingP}</p>
            <ul className="mt-6 space-y-2 text-start">
              {dict.stepsL.map((step, index) => <li key={step} className={`rounded-lg px-3 py-2 text-[13px] ${index <= stepIndex ? 'bg-[var(--sky)] font-semibold text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{step}</li>)}
            </ul>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-6 rounded-2xl border border-[var(--red)]/30 bg-white p-6">
          {photo && <img src={photo} alt={isSample ? dict.samplePhoto : dict.scanT} className="mx-auto mb-4 max-h-72 rounded-xl object-contain" />}
          <p role="alert" className="text-[13px] text-[var(--muted)]">{dict.scanErrors[scanError || 'generic']}</p>
          {isSample && <p className="mt-2 text-[12px] text-[var(--muted)]">{dict.samplePhoto}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {photo && <button type="button" className="rounded-full bg-[var(--blue)] px-4 py-2 text-[13px] font-bold text-white" onClick={retry}>{dict.retry}</button>}
            <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px] font-bold" onClick={reset}>{dict.rescan}</button>
            <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px] font-bold" onClick={() => fileRef.current?.click()}>{dict.uploadI}</button>
          </div>
        </div>
      )}

      {phase === 'results' && analysis && (
        <div className="mt-6">
          {isSample && (
            <p className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[12px] text-[var(--muted)]">
              {dict.sampleDisclaimer}
            </p>
          )}
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black">
              {photo && <img src={photo} alt={isSample ? dict.samplePhoto : dict.scanT} className="aspect-square w-full object-cover" />}
              {isSample && <div className="bg-white px-3 py-2 text-center text-[12px] font-semibold text-[var(--navy2)]">{dict.samplePhoto}</div>}
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[22px] font-extrabold text-[var(--navy2)]">{dict.resH}</h2>
              </div>
              <h3 className="mt-5 text-[14px] font-extrabold text-[var(--navy2)]">{dict.scanObservations}</h3>
              {analysis.concerns.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {analysis.concerns.map((concern) => (
                    <li key={concern.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sky)] px-4 py-3">
                      <span className="text-[13px] font-bold text-[var(--ink)]">{dict.scanConcernLabels[concern.id]}</span>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--blue)]">
                        {dict.scanConfidence}: {dict.scanConfidenceLevels[concern.confidence]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-xl bg-[var(--sky)] px-4 py-3 text-[13px] text-[var(--ink)]">{dict.scanNoConcerns}</p>
              )}
              <p className="mt-4 text-[13px] text-[var(--muted)]">{dict.disc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[var(--blue)] px-4 py-2 text-[13px] font-bold text-white"
                  onClick={() => {
                    openPanel()
                    void sendMessage(
                      toLaylaPrompt(
                        locale,
                        analysis.concerns,
                        dict.scanConcernLabels,
                      ),
                    )
                  }}
                >
                  {dict.discuss}
                </button>
                <button type="button" className="rounded-full border border-[var(--line)] px-4 py-2 text-[13px] font-bold" onClick={reset}>{dict.rescan}</button>
              </div>
            </div>
          </div>
          <h3 className="mt-8 text-[18px] font-extrabold text-[var(--navy2)]">{dict.recsH}</h3>
          {recommendationsPending && <p className="mt-2 text-[13px] text-[var(--muted)]">{dict.analysingP}</p>}
          {lastRecommendations.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lastRecommendations.map((product) => <ProductCard key={product.url} product={{ id: productIdFromUrl(product.url), url: product.url, name: product.name, imageUrl: product.imageUrl, price: product.price, rating: product.rating, ratingCount: product.ratingCount, aiPick: true }} />)}
            </div>
          ) : !recommendationsPending && <p className="mt-2 text-[13px] text-[var(--muted)]">{dict.noScanMatches}</p>}
        </div>
      )}
    </div>
  )
}
