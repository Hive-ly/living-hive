import { describe, expect, it } from 'vitest'

import {
  DEFAULT_COLOR_PALETTE,
  assignColorsToThemes,
  getThemeColor,
  hexToHsl,
  hslToString,
} from '../colors'

const sampleThemes = [
  { id: 't1', label: 'Theme 1' },
  { id: 't2', label: 'Theme 2' },
  { id: 't3', label: 'Theme 3' },
]

describe('color utilities', () => {
  it('assigns colors to themes round-robin', () => {
    const colorMap = assignColorsToThemes(sampleThemes)
    expect([...colorMap.entries()]).toEqual([
      ['t1', DEFAULT_COLOR_PALETTE[0]],
      ['t2', DEFAULT_COLOR_PALETTE[1]],
      ['t3', DEFAULT_COLOR_PALETTE[2]],
    ])
  })

  it('gets theme color with fallback', () => {
    expect(getThemeColor('t2', sampleThemes)).toBe(DEFAULT_COLOR_PALETTE[1])
    expect(getThemeColor('unknown', sampleThemes)).toBe(DEFAULT_COLOR_PALETTE[0])
  })

  it('converts hex colors to hsl values', () => {
    const hsl = hexToHsl('#ffffff')
    expect(hsl).toEqual({ h: 0, s: 0, l: 100 })
  })

  it('returns hsl strings', () => {
    expect(hslToString(200, 50, 40)).toBe('hsl(200, 50%, 40%)')
    expect(hslToString(200, 50, 40, 0.5)).toBe('hsla(200, 50%, 40%, 0.5)')
  })
})
