const NEGATIVE_SIGNAL = /\b(no|not|without|does not|doesn't|unavailable|unreported)\b|لا|ليس|لم|بدون|غير/i

export function hasPositiveSignal(text: string, pattern: RegExp): boolean {
  return pattern.test(text) && !NEGATIVE_SIGNAL.test(text)
}
