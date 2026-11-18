export type ChatActionKind =
  | 'open_first'
  | 'add_cart'
  | 'add_routine'
  | 'checkout'
  | 'cart'
  | 'routine'
  | 'skin_scan'
  | 'deals'
  | 'home'
  | 'thanks'

export type ChatActionResult = {
  kind: ChatActionKind
  multiple?: boolean
}

export type ChatActionExecution = {
  handled: boolean
  affectedProducts?: number
}

export function getVoiceActionReply(
  action: ChatActionResult,
  locale: 'en' | 'ar',
  affectedProducts = 0,
): string {
  if (locale === 'ar') {
    switch (action.kind) {
      case 'add_cart':
        return affectedProducts
          ? `تمت إضافة ${affectedProducts > 1 ? 'المنتجات المقترحة' : 'المنتج المقترح'} إلى سلتك.`
          : 'لا يظهر لدي منتج مقترح لإضافته بعد. اطلبي ترشيحًا أولًا.'
      case 'add_routine':
        return affectedProducts
          ? 'تمت إضافة منتجات الروتين إلى سلتك وفتح السلة.'
          : 'لا يظهر لدي روتين مقترح لإضافته بعد. اطلبي روتينًا أولًا.'
      case 'checkout':
        return 'سأفتح إتمام الطلب الآن.'
      case 'cart':
        return 'سأفتح سلتك الآن.'
      case 'open_first':
        return affectedProducts ? 'سأفتح المنتج المقترح الآن.' : 'لا يظهر لدي منتج مقترح لفتحه بعد.'
      case 'routine':
        return 'سأفتح روتينك الآن.'
      case 'skin_scan':
        return 'سأفتح فحص البشرة الآن.'
      case 'deals':
        return 'سأفتح العروض الآن.'
      case 'home':
        return 'سأعيدك إلى الصفحة الرئيسية.'
      case 'thanks':
        return 'على الرحب والسعة. أنا هنا لمساعدتك في العناية ببشرتك.'
    }
  }

  switch (action.kind) {
    case 'add_cart':
      return affectedProducts
        ? `Added ${affectedProducts > 1 ? 'the recommended products' : 'the recommended product'} to your cart.`
        : "I don't see a recommended product to add yet. Ask me for a recommendation first."
    case 'add_routine':
      return affectedProducts
        ? 'Added the routine products to your cart and opened your cart.'
        : "I don't see a recommended routine to add yet. Ask me for a routine first."
    case 'checkout':
      return 'Opening checkout.'
    case 'cart':
      return 'Opening your cart.'
    case 'open_first':
      return affectedProducts ? 'Opening the recommended product now.' : "I don't have a recommended product to open yet."
    case 'routine':
      return 'Opening your routine.'
    case 'skin_scan':
      return 'Opening the skin scan.'
    case 'deals':
      return 'Opening the deals page.'
    case 'home':
      return 'Taking you to the home page.'
    case 'thanks':
      return "You're welcome. I'm here to help with your skincare."
  }
}

export async function runManualUserTurn<T>(
  performLocalAction: () => unknown | Promise<unknown>,
  sendToAssistant: () => Promise<T>,
): Promise<T | undefined> {
  try {
    if (await performLocalAction() === true) return undefined
  } catch {
    // A local navigation/cart failure must not suppress the assistant turn.
  }
  return sendToAssistant()
}

export function isRoutineBuildRequest(raw: string): boolean {
  return (
    /\b(?:build|make|create|design|plan|prepare|generate|recommend\w*|put together)\b.{0,50}\b(?:routine|regimen)\b/i.test(raw) ||
    /(?:سوّ|سوي|سوّي|اعملي|جهزي|أجهزي)[\s\S]{0,40}روتين/u.test(raw)
  )
}

function has(hay: string, needles: string[]) {
  return needles.some((needle) => hay.includes(needle))
}

export function matchChatAction(raw: string): ChatActionResult | null {
  const text = ` ${raw.toLowerCase().trim()} `
  const asksForRecommendations =
    /\b(?:recommend\w*|suggest\w*|which|what|how|best|find me|show me|looking for)\b/i.test(text) ||
    /(?:^|\s)(?:ما|ماذا|كيف|هل|أي|اقترح|اقترحي|رشح|رشحي|أفضل|افضل)(?=\s|[؟?!.,])/u.test(text)

  if (
    !asksForRecommendations &&
    has(text, ['add the whole routine', 'add whole routine', 'add the routine', 'أضف الروتين', 'ضيف الروتين كامل'])
  ) {
    return { kind: 'add_routine' }
  }

  if (
    !asksForRecommendations &&
    has(text, [
      'add it to my cart',
      'add them to my cart',
      'add these to my cart',
      'add all to my cart',
      'add to cart',
      'add it',
      'add them',
      'add these',
      'put it in my cart',
      'put them in my cart',
      'أضف للسلة',
      'ضيف للسلة',
      'أضيفيه للسلة',
      'ضيفيه للسلة',
      'أضيفهم',
      'اضيفهم',
      'ضيفهم',
      'أضفهم',
      'أضيفها للسلة',
      'ضيفها للسلة',
      'أضفه',
      'أضفه إلى السلة',
      'حطه في السلة',
    ]) &&
    !has(text, ['routine', 'روتين'])
  ) {
    const multiple = has(text, ['them', 'these', 'all', 'products', 'picks', 'items', 'أضيفهم', 'اضيفهم', 'ضيفهم', 'أضفهم'])
    return { kind: 'add_cart', multiple }
  }

  if (
    has(text, [
      'take me to checkout',
      'checkout',
      'check out',
      'secure checkout',
      'خذيني للدفع',
      'ودّيني للدفع',
      'الدفع',
      'ادفع',
    ])
  ) {
    return { kind: 'checkout' }
  }

  if (
    has(text, ['show cart', 'my cart', 'open cart', 'السلة', 'سلتي', 'سلة المشتريات']) &&
    !has(text, ['add', 'أضف', 'ضيف'])
  ) {
    return { kind: 'cart' }
  }

  if (
    !asksForRecommendations &&
    has(text, [
      'my routine',
      'open my routine',
      'show my routine',
      'افتح روتيني',
      'روتيني',
    ])
  ) {
    return { kind: 'routine' }
  }

  if (has(text, ['open the first', 'open first', 'first one', 'الأول', 'الاول', 'افتح الأول', 'افتح الاول', 'ورني الأول'])) {
    return { kind: 'open_first' }
  }

  if (
    !asksForRecommendations &&
    has(text, [
      'scan my skin',
      'check my skin',
      'open skin scan',
      'start skin scan',
      'take a selfie',
      'افحص بشرتي',
      'ابدأ فحص البشرة',
      'افتح فحص البشرة',
    ])
  ) {
    return { kind: 'skin_scan' }
  }

  if (has(text, ['deals', 'deal of the day', 'عروض', 'عرض اليوم'])) {
    return { kind: 'deals' }
  }

  if (has(text, ['go home', 'take me home', 'الرئيسية'])) {
    return { kind: 'home' }
  }

  if (
    /^(?:thanks|thank you)(?:\s+(?:so much|very much|for your help))?[.!?]*$/i.test(raw.trim()) ||
    has(text, ['شكرًا', 'شكراً', 'شكرا', 'مشكور', 'مشكورة', 'يعطيك العافية'])
  ) {
    return { kind: 'thanks' }
  }

  return null
}
