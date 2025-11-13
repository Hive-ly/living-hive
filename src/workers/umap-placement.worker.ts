// Web Worker for UMAP-based hex placement
// Computes story positions dynamically from embeddings
/// <reference lib="webworker" />

import type {
  HexCoordinate,
  UMAPNormalization,
  PlacementConfig,
  StoryWithEmbedding,
} from '../types'
import type { UMAP as UMAPType } from 'umap-js'

type UMAPConstructor = typeof UMAPType

let UMAPCtor: UMAPConstructor | null = null

// Load UMAP library dynamically
async function loadUMAP(): Promise<UMAPConstructor> {
  if (UMAPCtor) return UMAPCtor

  try {
    const umapModule: unknown = await import('umap-js')

    let resolved: UMAPConstructor | undefined

    if (typeof umapModule === 'function') {
      resolved = umapModule as UMAPConstructor
    } else if (typeof umapModule === 'object' && umapModule !== null) {
      if ('UMAP' in umapModule && typeof (umapModule as { UMAP?: unknown }).UMAP === 'function') {
        resolved = (umapModule as { UMAP: unknown }).UMAP as UMAPConstructor
      } else {
        const defaultExport = (umapModule as { default?: unknown }).default
        if (typeof defaultExport === 'function') {
          resolved = defaultExport as UMAPConstructor
        } else if (
          defaultExport &&
          typeof defaultExport === 'object' &&
          'UMAP' in defaultExport &&
          typeof (defaultExport as { UMAP?: unknown }).UMAP === 'function'
        ) {
          resolved = (defaultExport as { UMAP: unknown }).UMAP as UMAPConstructor
        }
      }
    }

    if (!resolved) {
      throw new Error('UMAP class not found in umap-js package')
    }

    UMAPCtor = resolved
    return UMAPCtor
  } catch (e) {
    throw new Error(
      `Failed to load UMAP library: ${e instanceof Error ? e.message : String(e)}. ` +
        `Please install: npm install umap-js`,
    )
  }
}

interface ComputePlacementMessage {
  type: 'computePlacement'
  stories: StoryWithEmbedding[]
  norm: UMAPNormalization
  config: PlacementConfig
}

interface PlacementResultMessage {
  type: 'placementResult'
  placements: Array<[string, HexCoordinate]>
  umapCoords?: Array<{ id: string; x: number; y: number }>
}

interface ErrorMessage {
  type: 'error'
  error: string
}

const DEFAULT_CONFIG: PlacementConfig = {
  canvasWidth: 900,
  canvasHeight: 600,
  hexRadius: 14,
  margin: 20,
}

// Hex utility functions
function pixelToHex(pixel: { x: number; y: number }, hexRadius: number): HexCoordinate {
  const q = ((2 / 3) * pixel.x) / hexRadius
  const r = ((-1 / 3) * pixel.x + (Math.sqrt(3) / 3) * pixel.y) / hexRadius
  return cubeRound({ q, r, s: -q - r })
}

function cubeRound(cube: { q: number; r: number; s: number }): HexCoordinate {
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

function getHexNeighbors(hex: HexCoordinate): HexCoordinate[] {
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

function findAvailableHex(
  center: HexCoordinate,
  occupied: Set<string>,
  maxRadius: number = 200,
): HexCoordinate | null {
  const centerKey = `${center.q},${center.r}`
  if (!occupied.has(centerKey)) {
    return center
  }

  for (let radius = 1; radius <= maxRadius; radius++) {
    let current = { ...center }

    for (let i = 0; i < radius; i++) {
      current = getHexNeighbors(current)[4]
    }

    const directions = [0, 1, 2, 3, 4, 5]
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

function normalizeUMAP(x: number, y: number, norm: UMAPNormalization): { nx: number; ny: number } {
  const nx = (x - norm.min_x) / (norm.max_x - norm.min_x)
  const ny = (y - norm.min_y) / (norm.max_y - norm.min_y)

  return {
    nx: Math.max(0, Math.min(1, nx)),
    ny: Math.max(0, Math.min(1, ny)),
  }
}

function placeStory(
  umapX: number,
  umapY: number,
  norm: UMAPNormalization,
  occupiedCells: Set<string>,
  config: PlacementConfig = DEFAULT_CONFIG,
): HexCoordinate {
  const { nx, ny } = normalizeUMAP(umapX, umapY, norm)
  const { canvasWidth, canvasHeight, hexRadius, margin } = config

  const px = margin + nx * (canvasWidth - 2 * margin)
  const py = margin + (1 - ny) * (canvasHeight - 2 * margin)

  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  const idealHex = pixelToHex({ x: px - centerX, y: py - centerY }, hexRadius)

  const availableHex = findAvailableHex(idealHex, occupiedCells, 200)

  if (!availableHex) {
    return idealHex
  }

  return availableHex
}

// Compute UMAP from embeddings and place stories
async function computePlacement(message: ComputePlacementMessage): Promise<PlacementResultMessage> {
  const { stories, norm, config } = message

  if (stories.length === 0) {
    return {
      type: 'placementResult',
      placements: [],
    }
  }

  const UMAPClass = await loadUMAP()

  const embeddings = stories.map(s => s.embedding)

  // Calculate nNeighbors - must be less than the number of data points
  const maxNeighbors = Math.max(2, stories.length - 1) // At least 2, but less than data points
  const calculatedNeighbors = Math.min(15, Math.max(2, Math.floor(Math.sqrt(stories.length))))
  const nNeighbors = Math.min(calculatedNeighbors, maxNeighbors)

  if (stories.length < 2) {
    throw new Error('Need at least 2 stories to compute UMAP')
  }

  const umap = new UMAPClass({
    nComponents: 2,
    nNeighbors,
    minDist: 0.1,
    spread: 1.0,
  })

  const umapCoords = umap.fit(embeddings)

  const storyUMAP = new Map<string, { x: number; y: number }>()
  stories.forEach((story, index) => {
    storyUMAP.set(story.id, {
      x: umapCoords[index][0],
      y: umapCoords[index][1],
    })
  })

  const placements = new Map<string, HexCoordinate>()
  const occupiedCells = new Set<string>()

  const sortedStories = [...stories].sort((a, b) => {
    if (a.cluster_id && b.cluster_id) {
      return a.cluster_id.localeCompare(b.cluster_id)
    }
    if (a.cluster_id) return -1
    if (b.cluster_id) return 1
    return 0
  })

  for (const story of sortedStories) {
    const umapCoord = storyUMAP.get(story.id)
    if (!umapCoord) continue

    const hexCoord = placeStory(umapCoord.x, umapCoord.y, norm, occupiedCells, config)

    placements.set(story.id, hexCoord)
    occupiedCells.add(`${hexCoord.q},${hexCoord.r}`)
  }

  const umapCoordsArray = stories.map((story, index) => ({
    id: story.id,
    x: umapCoords[index][0],
    y: umapCoords[index][1],
  }))

  return {
    type: 'placementResult',
    placements: Array.from(placements.entries()),
    umapCoords: umapCoordsArray,
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<ComputePlacementMessage>) => {
  try {
    const result = await computePlacement(event.data)
    self.postMessage(result)
  } catch (error) {
    console.error('UMAP Worker: Error in message handler:', error)
    const errorMessage: ErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    self.postMessage(errorMessage)
  }
})
