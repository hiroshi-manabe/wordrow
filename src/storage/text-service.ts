import { nanoid } from 'nanoid'
import { parseImportedText, normalizeRawText } from '../lib/textImporter'
import { sha256Hex } from '../lib/hash'
import { db, STORAGE_POLICY_VERSION } from './db'
import type { SentenceRecord, TextRecord } from './db'

export interface ImportResult {
  text: TextRecord
  sentencesPersisted: number
}

export async function importTextFromString(rawInput: string): Promise<ImportResult> {
  const normalized = normalizeRawText(rawInput)
  const parsed = parseImportedText(normalized)
  const contentHash = await sha256Hex(normalized)
  const now = new Date().toISOString()
  const textId = nanoid(12)

  const textRecord: TextRecord = {
    id: textId,
    title: parsed.title,
    langFull: parsed.langFull,
    langBase: parsed.langBase,
    contentHash,
    createdAt: now,
    updatedAt: now,
    sentencesCount: parsed.sentences.length,
    policyVersion: STORAGE_POLICY_VERSION,
  }

  const sentences: SentenceRecord[] = parsed.sentences.map((sentence, index) => ({
    id: `${textId}-${index}`,
    textId,
    index,
    surfaceTokens: sentence.surfaceTokens,
    candidateTokens: sentence.candidateTokens,
    langFull: parsed.langFull,
    seed: sentence.seed,
  }))

  await db.transaction('rw', db.texts, db.sentences, async () => {
    const duplicate = await db.texts.where('contentHash').equals(contentHash).first()

    if (duplicate) {
      throw new Error('This text matches one that already exists in your library.')
    }

    await db.texts.add(textRecord)

    if (sentences.length) {
      await db.sentences.bulkAdd(sentences)
    }
  })

  return {
    text: textRecord,
    sentencesPersisted: sentences.length,
  }
}
