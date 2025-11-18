const DEFAULT_LANG = 'en'
const WORD_CHAR_RE = /[\p{L}\p{N}]/u
const DISALLOWED_SPLIT_RE = /((?:(?![-'’])[^\p{L}\p{N}_]+))/u
const APOSTROPHE_CHARS = /['’]/u

export interface ImportedSentence {
  surfaceTokens: string[]
  candidateTokens: string[]
  seed: number
}

export interface ImportedText {
  title: string
  langFull: string
  langBase: string
  sentences: ImportedSentence[]
}

interface LanguageResult {
  langFull: string
  langBase: string
  consumeNextLine: boolean
}

export function normalizeRawText(input: string): string {
  if (!input || !input.trim()) {
    throw new Error('Text import is empty. Add a title and at least one sentence.')
  }

  return input.replace(/\uFEFF/g, '').replace(/\r\n?/g, '\n')
}

export function parseImportedText(rawInput: string): ImportedText {
  const normalized = normalizeRawText(rawInput)
  const lines = normalized.split('\n')

  if (!lines[0]) {
    throw new Error('Add a title on the first line before importing.')
  }

  const title = lines[0].trim() || 'Untitled Text'
  const langMeta = detectLanguage(lines[1])
  const startIndex = langMeta.consumeNextLine ? 2 : 1
  const sentenceLines = lines.slice(startIndex)
  const sentences: ImportedSentence[] = []

  sentenceLines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }

    const surfaceTokens = tokenize(trimmed)
    if (!surfaceTokens.length) {
      return
    }

    const candidateTokens = surfaceTokens.map((token) =>
      normalizeCandidateToken(token, langMeta.langFull, langMeta.langBase),
    )

    sentences.push({
      seed: createSentenceSeed(trimmed, startIndex + idx),
      surfaceTokens,
      candidateTokens,
    })
  })

  if (!sentences.length) {
    throw new Error('No sentences were found. Add at least one sentence per line.')
  }

  return {
    title,
    langFull: langMeta.langFull,
    langBase: langMeta.langBase,
    sentences,
  }
}

function detectLanguage(line?: string): LanguageResult {
  if (!line) {
    return {
      langFull: DEFAULT_LANG,
      langBase: DEFAULT_LANG,
      consumeNextLine: false,
    }
  }

  const trimmed = line.trim()
  if (!trimmed.toLowerCase().startsWith('lang=')) {
    return {
      langFull: DEFAULT_LANG,
      langBase: DEFAULT_LANG,
      consumeNextLine: false,
    }
  }

  const rawTag = trimmed.slice(trimmed.indexOf('=') + 1).trim()
  const langFull = canonicalizeLang(rawTag)
  const langBase = langFull.split('-')[0] || DEFAULT_LANG

  return {
    langFull,
    langBase,
    consumeNextLine: true,
  }
}

function canonicalizeLang(tag: string): string {
  if (!tag) {
    return DEFAULT_LANG
  }

  try {
    const [preferred] = Intl.getCanonicalLocales(tag)
    return preferred?.toLowerCase() ?? DEFAULT_LANG
  } catch (error) {
    console.warn('Falling back to en language tag. Unable to parse:', tag, error)
    return DEFAULT_LANG
  }
}

function tokenize(sentence: string): string[] {
  const tokens: string[] = []
  const groups = sentence.split(/(\s+)/u).filter((g) => g.length)
  let buffer = ''
  let prevHadWhitespace = false

  for (const group of groups) {
    // Skip whitespace; we don't embed spaces into token surfaces.
    if (/^\s+$/u.test(group)) {
      prevHadWhitespace = true
      continue
    }

    const parts = group.split(DISALLOWED_SPLIT_RE)
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]!
      if (!part) continue
      const isSeparator = !WORD_CHAR_RE.test(part.replace(APOSTROPHE_CHARS, ''))
      const isQuoteSeparator = /^(["“”«»‚‘’]+)$/u.test(part)

      if (isSeparator) {
        const hasUpcomingWord = parts.slice(i + 1).some((p) => p && WORD_CHAR_RE.test(p))
        if (hasUpcomingWord) {
          if (isQuoteSeparator) {
            buffer += part
          }
        } else if (tokens.length) {
          const sepToAttach = isQuoteSeparator ? part : prevHadWhitespace ? ` ${part}` : part
          tokens[tokens.length - 1] = tokens[tokens.length - 1]! + sepToAttach
        } else {
          const sepToBuffer = isQuoteSeparator ? part : prevHadWhitespace ? ` ${part}` : part
          buffer += sepToBuffer
        }
        prevHadWhitespace = false
        continue
      }

      // Word chunk: prepend any buffered separator to the surface chunk.
      tokens.push(buffer + part)
      buffer = ''
      prevHadWhitespace = false
    }
  }

  // Attach any trailing separator buffer to the last token for display only.
  if (buffer && tokens.length) {
    tokens[tokens.length - 1] = tokens[tokens.length - 1]! + buffer
  }

  return tokens
}

function normalizeCandidateToken(token: string, langFull: string, langBase: string) {
  const locales: string[] = []
  if (langFull) locales.push(langFull)
  if (langBase && langBase !== langFull) locales.push(langBase)

  const normalized = token.normalize('NFC').trim()
  if (!normalized) return ''

  const isSingleQuote = (ch: string) => ch === "'" || ch === '’' || ch === '‘'
  const isPunctOrSymbol = (ch: string) => /[\p{P}\p{S}]/u.test(ch)

  let start = 0
  let end = normalized.length
  let sawOpeningSingleQuote = false

  // Strip leading punctuation/quotes.
  while (start < end) {
    const ch = normalized[start]!
    if (isSingleQuote(ch)) {
      sawOpeningSingleQuote = true
      start += 1
      continue
    }
    if (isPunctOrSymbol(ch) || /\s/.test(ch)) {
      start += 1
      continue
    }
    break
  }

  // Strip trailing punctuation except when kept by heuristics.
  while (end > start) {
    const ch = normalized[end - 1]!
    if (isSingleQuote(ch)) {
      if (sawOpeningSingleQuote) {
        sawOpeningSingleQuote = false
        end -= 1
        continue
      }
      break
    }

    if (ch === '.') {
      const candidateSlice = normalized.slice(start, end).toLowerCase()
      if (isAcronymOrAbbreviation(candidateSlice)) {
        break
      }
      end -= 1
      continue
    }

    if (isPunctOrSymbol(ch) || /\s/.test(ch)) {
      end -= 1
      continue
    }
    break
  }

  const trimmed = normalized.slice(start, end).trim()
  if (!trimmed) return ''

  if (!locales.length) {
    return trimmed.toLocaleLowerCase()
  }

  try {
    return trimmed.toLocaleLowerCase(locales)
  } catch {
    return trimmed.toLocaleLowerCase()
  }
}

const ACRONYM_REGEX = /^([A-Z]\.){1,}[A-Z]?$/u
const ABBREVIATION_SET = new Set(['e.g.', 'i.e.', 'etc.', 'vs.', 'cf.', 'dr.', 'mr.', 'mrs.'])

function isAcronymOrAbbreviation(text: string): boolean {
  return ACRONYM_REGEX.test(text) || ABBREVIATION_SET.has(text)
}

function createSentenceSeed(sentence: string, index: number) {
  const payload = `${sentence}|${index}`
  let hash = 0x811c9dc5

  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}
