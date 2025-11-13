import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  HexCoordinate,
  UMAPNormalization,
  PlacementConfig,
  PlacementResult,
  StoryWithEmbedding,
} from '../types'

const DEFAULT_CONFIG: PlacementConfig = {
  canvasWidth: 900,
  canvasHeight: 600,
  hexRadius: 14,
  margin: 20,
}

interface UseUMAPPlacementReturn {
  computePlacement: (
    stories: StoryWithEmbedding[],
    norm: UMAPNormalization,
    config?: Partial<PlacementConfig>,
  ) => Promise<PlacementResult>
  loading: boolean
  error: string | null
}

export function useUMAPPlacement(): UseUMAPPlacementReturn {
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Use Vite's worker import syntax for proper bundling
      const workerUrl = new URL('../workers/umap-placement.worker.ts', import.meta.url)
      workerRef.current = new Worker(workerUrl, { type: 'module' })

      workerRef.current.onerror = err => {
        console.error('useUMAPPlacement: Worker error event:', err)
        setError('Web worker failed to initialize')
        setLoading(false)
      }

      workerRef.current.onmessageerror = err => {
        console.error('useUMAPPlacement: Worker message error:', err)
        setError('Web worker message error')
        setLoading(false)
      }
    } catch (err) {
      console.error('useUMAPPlacement: Failed to create worker:', err)
      setError(
        `Failed to initialize web worker: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  const computePlacement = useCallback(
    async (
      stories: StoryWithEmbedding[],
      norm: UMAPNormalization,
      config: Partial<PlacementConfig> = {},
    ): Promise<PlacementResult> => {
      if (stories.length === 0) {
        return { placements: new Map() }
      }

      if (stories.length < 2) {
        // For single story, place it in the center
        const placements = new Map<string, HexCoordinate>()
        placements.set(stories[0].id, { q: 0, r: 0 })
        return { placements }
      }

      if (!workerRef.current) {
        throw new Error('Web worker not initialized')
      }

      setLoading(true)
      setError(null)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('useUMAPPlacement: Computation timeout after 30s')
          reject(new Error('Placement computation timeout'))
          setLoading(false)
        }, 30000)

        const handleMessage = (event: MessageEvent) => {
          clearTimeout(timeout)
          workerRef.current?.removeEventListener('message', handleMessage)

          if (event.data.type === 'placementResult') {
            setLoading(false)
            resolve({
              placements: new Map(event.data.placements as Array<[string, HexCoordinate]>),
              umapCoords: event.data.umapCoords,
            })
          } else if (event.data.type === 'error') {
            const errorMsg = event.data.error || 'Unknown error'
            console.error('useUMAPPlacement: Worker error:', errorMsg)
            setError(errorMsg)
            setLoading(false)
            reject(new Error(errorMsg))
          }
        }

        workerRef.current.addEventListener('message', handleMessage)

        const fullConfig = { ...DEFAULT_CONFIG, ...config }
        workerRef.current.postMessage({
          type: 'computePlacement',
          stories,
          norm,
          config: fullConfig,
        })
      })
    },
    [],
  )

  return {
    computePlacement,
    loading,
    error,
  }
}
