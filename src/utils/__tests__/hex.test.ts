import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import {
  cubeRound,
  findAvailableHex,
  generateClusterHexes,
  getHexNeighbors,
  getHexRadius,
  getMaxHexes,
  hexDistance,
  hexToPixel,
  pixelToHex,
} from '../hex'

describe('hex utilities', () => {
  it('converts between hex and pixel coordinates', () => {
    const origin = { q: 0, r: 0 }
    const radius = 10
    const pixel = hexToPixel(origin, radius)
    expect(pixel).toEqual({ x: 0, y: 0 })

    const hex = pixelToHex(pixel, radius)
    expect(hex).toEqual(origin)
  })

  it('rounds cube coordinates to nearest hex', () => {
    const rounded = cubeRound({ q: 1.2, r: -0.4, s: -0.8 })
    expect(rounded.q).toBe(1)
    expect(rounded.r).toBeCloseTo(0)
  })

  it('computes hex distance correctly', () => {
    const a = { q: 0, r: 0 }
    const b = { q: 2, r: -1 }
    expect(hexDistance(a, b)).toBe(2)
  })

  it('returns neighboring coordinates', () => {
    const neighbors = getHexNeighbors({ q: 0, r: 0 })
    expect(neighbors).toHaveLength(6)
    expect(neighbors).toContainEqual({ q: 1, r: 0 })
  })

  describe('responsive helpers', () => {
    const originalWindow = globalThis.window
    let originalInnerWidth: number | undefined

    beforeEach(() => {
      originalInnerWidth = originalWindow?.innerWidth
    })

    afterEach(() => {
      if (originalWindow) {
        globalThis.window = originalWindow
        if (typeof originalInnerWidth === 'number') {
          Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: originalInnerWidth,
          })
        }
      } else {
        // @ts-expect-error allow cleanup
        delete globalThis.window
      }
    })

    it('uses fallback radius without window', () => {
      // @ts-expect-error intentionally removing window for test
      delete globalThis.window
      expect(getHexRadius()).toBe(12)
    })

    it('calculates radius based on viewport width', () => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 })
      expect(getHexRadius()).toBe(20)

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 })
      expect(getHexRadius()).toBe(15)

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
      expect(getHexRadius()).toBe(12)
    })

    it('uses fallback max hexes without window', () => {
      // @ts-expect-error intentionally removing window for test
      delete globalThis.window
      expect(getMaxHexes()).toBe(2000)
    })
  })

  it('finds available hex coordinates', () => {
    const occupied = new Set(['0,0', '1,0', '1,-1'])
    const available = findAvailableHex({ q: 0, r: 0 }, occupied, 3)
    expect(available).not.toBeNull()
    if (available) {
      expect(occupied.has(`${available.q},${available.r}`)).toBe(false)
    }
  })

  it('generates clusters without overlapping occupied cells', () => {
    const occupied = new Set<string>()
    const cluster = generateClusterHexes({ q: 0, r: 0 }, 5, occupied)

    expect(cluster).toHaveLength(5)
    const keys = new Set(cluster.map(hex => `${hex.q},${hex.r}`))
    expect(keys.size).toBe(cluster.length)
  })
})
