import { db } from './db'

export async function deleteTextById(textId: string) {
  await db.transaction('rw', db.texts, db.sentences, db.progress, db.sessions, async () => {
    await db.texts.delete(textId)
    await db.sentences.where('textId').equals(textId).delete()
    await db.progress.where('textId').equals(textId).delete()
    await db.sessions.where('textId').equals(textId).delete()
  })
}
