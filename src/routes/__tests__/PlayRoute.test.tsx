import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlayRoute from '../Play'
import { db, STORAGE_POLICY_VERSION } from '../../storage/db'

const TEXT_ID = 'test-text'

async function resetDb() {
  await db.transaction('rw', db.texts, db.sentences, db.progress, db.sessions, async () => {
    await db.texts.clear()
    await db.sentences.clear()
    await db.progress.clear()
    await db.sessions.clear()
  })
}

async function seedSingleTokenSentence() {
  const now = new Date().toISOString()
  await db.transaction('rw', db.texts, db.sentences, async () => {
    await db.texts.add({
      id: TEXT_ID,
      title: 'Unit Test Deck',
      langFull: 'en',
      langBase: 'en',
      contentHash: 'hash',
      createdAt: now,
      updatedAt: now,
      sentencesCount: 1,
      policyVersion: STORAGE_POLICY_VERSION,
    })

    await db.sentences.add({
      id: `${TEXT_ID}-0`,
      textId: TEXT_ID,
      index: 0,
      surfaceTokens: ['Solo'],
      candidateTokens: ['solo'],
      langFull: 'en',
      seed: 12345,
    })
  })
}

describe('PlayRoute', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('completes a single-token row via keyboard input without infinite updates', async () => {
    await seedSingleTokenSentence()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/play/${TEXT_ID}`]}>
        <Routes>
          <Route path="/play/:textId" element={<PlayRoute />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Context line')

    await user.keyboard('a')

    await screen.findByText('Completed')
    await screen.findByText('1/1 rows')
    expect(screen.getByText('Accuracy').nextElementSibling?.textContent).toBe('100%')
  })

  it('resets session state when leaving and re-entering Play', async () => {
    await seedSingleTokenSentence()
    const user = userEvent.setup()

    const renderPlay = () =>
      render(
        <MemoryRouter initialEntries={[`/play/${TEXT_ID}`]}>
          <Routes>
            <Route path="/play/:textId" element={<PlayRoute />} />
          </Routes>
        </MemoryRouter>,
      )

    renderPlay()
    await screen.findByText('Context line')
    await user.keyboard('a')
    await screen.findByText('Completed')
    cleanup()

    renderPlay()
    await screen.findByText('Context line')
    await waitFor(() => expect(screen.queryByText('Completed')).toBeNull())
    expect(screen.getByText('0/1 rows')).toBeInTheDocument()
  })
})
