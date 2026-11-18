import type { ChatMessage } from '../types/chat'

const MAX_QUESTION_LENGTH = 3900
const MAX_HISTORY_MESSAGES = 6
const MAX_HISTORY_MESSAGE_LENGTH = 500
const HISTORY_HEADER = 'Recent conversation context:\n'
const SCAN_SUMMARY_PATTERN = /(?:Visible concerns:|الملاحظات الظاهرة:)/

export function buildChatQuestion(
  instructions: string,
  message: string,
  history: ChatMessage[],
): string {
  const scanSummary = [...history]
    .reverse()
    .find((entry) => entry.role === 'assistant' && SCAN_SUMMARY_PATTERN.test(entry.content))
  const recentEntries = history.slice(-MAX_HISTORY_MESSAGES)
  const selectedHistory =
    scanSummary && !recentEntries.includes(scanSummary)
      ? [scanSummary, ...recentEntries.slice(-(MAX_HISTORY_MESSAGES - 1))]
      : recentEntries
  const recentHistory = selectedHistory
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => {
      const speaker = entry.role === 'user' ? 'Customer' : 'Layla'
      const products = entry.products?.length
        ? ` Attached product cards: ${entry.products
            .slice(0, 4)
            .map((product) => product.name.slice(0, 80))
            .join('; ')}.`
        : ''
      return `${speaker}: ${entry.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH)}${products}`
    })
    .join('\n')

  const scanInstruction = scanSummary
    ? 'For scan-related requests, use only the visible findings and product cards attached to the latest scan result. Do not invent or substitute products, URLs, prices, or benefits. If no cards are attached, ask the Nahdi knowledge-base agent for verified catalogue products; do not make up links.\n'
    : ''
  const fullInstructions = `${instructions}${scanInstruction}`
  const currentMessage = `Current user message: ${message}`
  const availableHistoryLength =
    MAX_QUESTION_LENGTH -
    fullInstructions.length -
    HISTORY_HEADER.length -
    currentMessage.length -
    2
  if (!recentHistory || availableHistoryLength <= 0) {
    return `${fullInstructions}${currentMessage}`
  }

  const context = recentHistory.slice(-availableHistoryLength)
  return `${fullInstructions}${HISTORY_HEADER}${context}\n\n${currentMessage}`
}
