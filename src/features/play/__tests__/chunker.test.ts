import { describe, expect, it } from 'vitest'
import { buildChunksForSentence, type SentenceTokens } from '../chunker'

describe('buildChunksForSentence', () => {
  const baseSentence: SentenceTokens = {
    surfaceTokens: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
    candidateTokens: ['one', 'two', 'three', 'four', 'five', 'six'],
    seed: 0xabc123,
  }

  it('chunks tokens into alternating hands with deterministic order', () => {
    const rows = buildChunksForSentence(baseSentence, { policyVersion: 1, inputMode: 'both' })

    expect(rows).toHaveLength(2)
    expect(rows[0].hand).toBe('left')
    expect(rows[1].hand).toBe('right')

    expect(rows[0].tokens).toHaveLength(4)
    expect(rows[1].tokens).toHaveLength(2)

    expect(rows[0].order).not.toEqual(rows[0].expectedOrder)

    const rerun = buildChunksForSentence(baseSentence, { policyVersion: 1, inputMode: 'both' })
    expect(rerun[0].order).toEqual(rows[0].order)
    expect(rerun[1].order).toEqual(rows[1].order)
  })

  it('returns identity order for single-token chunks', () => {
    const tinySentence: SentenceTokens = {
      surfaceTokens: ['Solo'],
      candidateTokens: ['solo'],
      seed: 42,
    }

    const rows = buildChunksForSentence(tinySentence, { policyVersion: 1, inputMode: 'both' })
    expect(rows[0].order).toEqual([0])
    expect(rows[0].expectedOrder).toEqual([0])
  })

  it('throws when token arrays have mismatched length', () => {
    const broken: SentenceTokens = {
      surfaceTokens: ['One', 'Two'],
      candidateTokens: ['one'],
      seed: 1,
    }

    expect(() => buildChunksForSentence(broken, { policyVersion: 1, inputMode: 'both' })).toThrow(
      /must match in length/i,
    )
  })
})
