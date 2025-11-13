import type { Theme, ColorPalette } from '../types'

// Default warm color palette
export const DEFAULT_COLOR_PALETTE: ColorPalette = [
  '#DAA5AD', // Pink
  '#FF6E7F', // Coral
  '#B9776F', // Warm Clay
  '#E8B88A', // Soft Apricot
  '#CDB15E', // Gold
  '#7F9C63', // Sage Green
  '#6B9A8A', // Muted Teal
  '#4F81B0', // Blue
  '#8C6BA9', // Dusty Lavender
  '#AEBEC5', // Light Gray
]

// Assign colors to themes from palette (round-robin)
export function assignColorsToThemes(
  themes: Theme[],
  palette: ColorPalette = DEFAULT_COLOR_PALETTE,
): Map<string, string> {
  const colorMap = new Map<string, string>()

  themes.forEach((theme, index) => {
    const color = palette[index % palette.length]
    colorMap.set(theme.id, color)
  })

  return colorMap
}

// Get color for a theme from palette
export function getThemeColor(
  themeId: string,
  themes: Theme[],
  palette: ColorPalette = DEFAULT_COLOR_PALETTE,
): string {
  const themeIndex = themes.findIndex(t => t.id === themeId)
  if (themeIndex === -1) return palette[0]
  return palette[themeIndex % palette.length]
}

// Convert hex to HSL for gradient effects
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// Create HSL color string
export function hslToString(h: number, s: number, l: number, alpha?: number): string {
  if (alpha !== undefined) {
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
  }
  return `hsl(${h}, ${s}%, ${l}%)`
}
