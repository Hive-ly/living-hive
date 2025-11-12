// Hex Grid Utilities for Living Hive Visualization

import type { HexCoordinate, PixelCoordinate } from '../types'

// Convert axial coordinates to pixel coordinates
export function hexToPixel(
  hex: HexCoordinate,
  hexRadius: number
): PixelCoordinate {
  const x = hexRadius * ((3 / 2) * hex.q)
  const y = hexRadius * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r)
  return { x, y }
}

// Convert pixel coordinates to axial coordinates
export function pixelToHex(
  pixel: PixelCoordinate,
  hexRadius: number
): HexCoordinate {
  const q = ((2 / 3) * pixel.x) / hexRadius
  const r = ((-1 / 3) * pixel.x + (Math.sqrt(3) / 3) * pixel.y) / hexRadius
  return cubeRound({ q, r, s: -q - r })
}

// Cube rounding for fractional hex coordinates
export function cubeRound(cube: {
  q: number
  r: number
  s: number
}): HexCoordinate {
  let rq = Math.round(cube.q)
  let rr = Math.round(cube.r)
  let rs = Math.round(cube.s)

  const qDiff = Math.abs(rq - cube.q)
  const rDiff = Math.abs(rr - cube.r)
  const sDiff = Math.abs(rs - cube.s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  } else {
    rs = -rq - rr
  }

  return { q: rq, r: rr }
}

// Get hex neighbors
export function getHexNeighbors(hex: HexCoordinate): HexCoordinate[] {
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]

  return directions.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r,
  }))
}

// Calculate distance between two hexes
export function hexDistance(a: HexCoordinate, b: HexCoordinate): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  )
}

// Spiral search for available hex positions
export function findAvailableHex(
  center: HexCoordinate,
  occupied: Set<string>,
  maxRadius: number = 10
): HexCoordinate | null {
  // Check center first
  const centerKey = `${center.q},${center.r}`
  if (!occupied.has(centerKey)) {
    return center
  }

  // Spiral outward from center
  for (let radius = 1; radius <= maxRadius; radius++) {
    let current = { ...center }

    // Move to start of ring
    for (let i = 0; i < radius; i++) {
      current = getHexNeighbors(current)[4] // Move in direction 4 (down-left)
    }

    // Walk around the ring
    const directions = [0, 1, 2, 3, 4, 5] // Clockwise
    for (const direction of directions) {
      for (let i = 0; i < radius; i++) {
        const key = `${current.q},${current.r}`
        if (!occupied.has(key)) {
          return current
        }
        current = getHexNeighbors(current)[direction]
      }
    }
  }

  return null
}

// Generate hex positions for a cluster
export function generateClusterHexes(
  center: HexCoordinate,
  size: number,
  occupied: Set<string>
): HexCoordinate[] {
  const hexes: HexCoordinate[] = []
  const newOccupied = new Set(occupied)

  // Start with center
  let currentCenter = findAvailableHex(center, newOccupied)
  if (!currentCenter) return hexes

  hexes.push(currentCenter)
  newOccupied.add(`${currentCenter.q},${currentCenter.r}`)

  // Add hexes in expanding rings
  for (let i = 1; i < size; i++) {
    const availableNeighbors = getHexNeighbors(currentCenter).filter(
      hex => !newOccupied.has(`${hex.q},${hex.r}`)
    )

    if (availableNeighbors.length === 0) {
      // Find new center for next ring
      const newCenter = Array.from(newOccupied)
        .map(key => {
          const [q, r] = key.split(',').map(Number)
          return { q, r }
        })
        .find(hex => {
          const neighbors = getHexNeighbors(hex)
          return neighbors.some(n => !newOccupied.has(`${n.q},${n.r}`))
        })

      if (newCenter) {
        currentCenter = newCenter
        continue
      }
      break
    }

    // Add first available neighbor
    const nextHex = availableNeighbors[0]
    hexes.push(nextHex)
    newOccupied.add(`${nextHex.q},${nextHex.r}`)
  }

  return hexes
}

// Get responsive hex radius based on screen size
export function getHexRadius(): number {
  if (typeof window === 'undefined') return 12

  const width = window.innerWidth
  if (width < 640) return 20 // mobile: larger for touch
  if (width < 1024) return 15 // tablet
  return 12 // desktop
}

// Get responsive max hexes based on screen size
export function getMaxHexes(): number {
  if (typeof window === 'undefined') return 2000

  const width = window.innerWidth
  if (width < 640) return 300 // mobile: fewer for performance
  if (width < 1024) return 600 // tablet
  return 2000 // desktop: full viz
}

