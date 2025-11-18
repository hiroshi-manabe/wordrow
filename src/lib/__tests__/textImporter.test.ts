import { describe, expect, it } from 'vitest'
import { normalizeRawText, parseImportedText } from '../textImporter'

describe('normalizeRawText', () => {
  it('strips BOM and normalizes CRLF line endings', () => {
    const raw = '\uFEFFTitle\r\nFirst line\r\n'
    expect(normalizeRawText(raw)).toBe('Title\nFirst line\n')
  })

  it('throws for empty payloads', () => {
    expect(() => normalizeRawText('   ')).toThrow(/text import is empty/i)
  })
})

describe('parseImportedText', () => {
  it('parses title, language tag, and token forms', () => {
    const input = [
      'My Story',
      ' lang=de-DE ',
      'Guten Morgen, Welt!',
      'Noch ein Satz??',
      '',
      'Hyphen stays in no-good-dirty-rotten-pig-stealing-great-great-grandfather',
      'Jeden Tag gab’s Prügel – aber ganz ungerecht.',
      'You’re right—splitting on whitespace keeps the standalone en dash',
      'seeds/row should split on slash',
    ].join('\n')

    const result = parseImportedText(input)

    expect(result.title).toBe('My Story')
    expect(result.langFull).toBe('de-de')
    expect(result.langBase).toBe('de')
    expect(result.sentences).toHaveLength(6)

    const [first, second, third, fourth, fifth, sixth] = result.sentences
    expect(first.surfaceTokens).toEqual(['Guten', 'Morgen,', 'Welt!'])
    expect(first.candidateTokens).toEqual(['guten', 'morgen', 'welt'])

    expect(second.surfaceTokens).toEqual(['Noch', 'ein', 'Satz??'])
    expect(second.candidateTokens).toEqual(['noch', 'ein', 'satz'])

    expect(third.surfaceTokens).toEqual(['Hyphen', 'stays', 'in', 'no-good-dirty-rotten-pig-stealing-great-great-grandfather'])
    expect(third.candidateTokens[3]).toBe('no-good-dirty-rotten-pig-stealing-great-great-grandfather')
    expect(third.candidateTokens.slice(0, 3)).toEqual(['hyphen', 'stays', 'in'])

    expect(fourth.surfaceTokens).toEqual(["Jeden", "Tag", "gab’s", "Prügel –", "aber", "ganz", "ungerecht."])
    expect(fourth.candidateTokens[3]).toBe('prügel')
    expect(fourth.candidateTokens[4]).toBe('aber')

    expect(fifth.surfaceTokens).toEqual(['You’re', 'right', 'splitting', 'on', 'whitespace', 'keeps', 'the', 'standalone', 'en', 'dash'])
    expect(fifth.candidateTokens[1]).toBe('right')
    expect(fifth.candidateTokens[2]).toBe('splitting')

    expect(sixth.surfaceTokens).toEqual(['seeds', 'row', 'should', 'split', 'on', 'slash'])
    expect(sixth.candidateTokens[0]).toBe('seeds')
  })

  it('keeps outer quotes on surface while stripping for candidates', () => {
    const input = ['Quotes Case', '»So«, sagte einer der Männer, »hier gefällt es dir also?«'].join('\n')
    const result = parseImportedText(input)

    expect(result.sentences[0].surfaceTokens).toEqual([
      '»So«,',
      'sagte',
      'einer',
      'der',
      'Männer,',
      '»hier',
      'gefällt',
      'es',
      'dir',
      'also?«',
    ])
    expect(result.sentences[0].candidateTokens).toEqual([
      'so',
      'sagte',
      'einer',
      'der',
      'männer',
      'hier',
      'gefällt',
      'es',
      'dir',
      'also',
    ])
  })

  it('uses the second line as a sentence when lang header is missing', () => {
    const input = ['Practice Deck', 'This is line one.', 'Line two follows.'].join('\n')
    const result = parseImportedText(input)

    expect(result.langFull).toBe('en')
    expect(result.sentences[0].surfaceTokens).toEqual(['This', 'is', 'line', 'one.'])
    expect(result.sentences[1].surfaceTokens).toEqual(['Line', 'two', 'follows.'])
  })

  it('produces deterministic seeds per sentence index', () => {
    const input = ['Deck', 'lang=en', 'Same sentence appears twice', 'Same sentence appears twice'].join('\n')
    const result = parseImportedText(input)

    expect(result.sentences[0].seed).not.toBe(result.sentences[1].seed)

    const secondBatch = parseImportedText(input)
    expect(secondBatch.sentences[0].seed).toBe(result.sentences[0].seed)
    expect(secondBatch.sentences[1].seed).toBe(result.sentences[1].seed)
  })
})
