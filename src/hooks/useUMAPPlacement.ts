import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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

/**
 * Default worker URL fallback.
 *
 * Note: It's recommended to explicitly pass workerUrl using your bundler's worker import syntax.
 * This fallback attempts to resolve the worker using import.meta.url, but results may vary
 * depending on how the consumer's bundler processes the library.
 */
function getDefaultWorkerUrl(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      // Attempt to resolve worker relative to this module
      // The consumer's bundler should transform import.meta.url appropriately
      const url = new URL('./workers/umap-worker.js', import.meta.url)
      return url.href
    }
  } catch {
    // Fallback if import.meta is not available or URL construction fails
  }

  // Final fallback - assumes worker is at /workers/umap-worker.js
  return '/workers/umap-worker.js'
}

export const DEFAULT_WORKER_URL = getDefaultWorkerUrl()

export interface UseUMAPPlacementOptions {
  /**
   * URL to the UMAP worker script.
   *
   * **Recommended:** Use your bundler's worker import syntax to get the URL:
   * - Vite: `import workerUrl from '@hively/living-hive/workers/umap-placement.worker?worker&url'`
   * - Webpack 5+: `new URL('@hively/living-hive/workers/umap-placement.worker?worker', import.meta.url)`
   *
   * If not provided, the library will attempt to auto-resolve the worker URL,
   * but this may not work reliably across all bundlers.
   */
  workerUrl?: string | URL
  throwIfMissingWorker?: boolean
}

const resolveWorkerUrl = (candidate?: string | URL): string | undefined => {
  if (candidate) {
    // Handle both string and URL objects
    return typeof candidate === 'string' ? candidate : candidate.toString()
  }

  try {
    const importMetaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })
      .env
    if (importMetaEnv?.VITE_LIVING_HIVE_WORKER_URL) {
      return importMetaEnv.VITE_LIVING_HIVE_WORKER_URL
    }
  } catch {
    // Some environments do not expose import.meta; ignore safely.
  }

  if (typeof process !== 'undefined') {
    const env = process.env as Record<string, string | undefined> | undefined
    const value =
      env?.LIVING_HIVE_WORKER_URL ??
      env?.NEXT_PUBLIC_LIVING_HIVE_WORKER_URL ??
      env?.VITE_LIVING_HIVE_WORKER_URL
    if (value) {
      return value
    }
  }

  return DEFAULT_WORKER_URL
}

export interface UseUMAPPlacementReturn {
  computePlacement: (
    stories: StoryWithEmbedding[],
    norm: UMAPNormalization,
    config?: Partial<PlacementConfig>,
  ) => Promise<PlacementResult>
  loading: boolean
  error: string | null
}

export function useUMAPPlacement(options?: UseUMAPPlacementOptions): UseUMAPPlacementReturn {
  const { workerUrl, throwIfMissingWorker = true } = options ?? {}
  const workerRef = useRef<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolvedWorkerUrl = useMemo(() => resolveWorkerUrl(workerUrl), [workerUrl])

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    // Guard against SSR / non-worker environments
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      const message = 'Web workers are not supported in this environment.'
      setError(message)
      setLoading(false)
      if (throwIfMissingWorker) {
        console.error('useUMAPPlacement:', message)
      } else {
        console.warn('useUMAPPlacement:', message)
      }
      return
    }

    if (!resolvedWorkerUrl) {
      const message =
        'No worker URL provided. Pass workerUrl or set VITE_LIVING_HIVE_WORKER_URL in your build.'
      setError(message)
      setLoading(false)
      if (throwIfMissingWorker) {
        console.error('useUMAPPlacement:', message)
      } else {
        console.warn('useUMAPPlacement:', message)
      }
      return
    }

    let worker: Worker | null = null

    try {
      // resolvedWorkerUrl is already a string from resolveWorkerUrl
      // Convert to string explicitly in case it's somehow a URL object
      const workerUrlString =
        typeof resolvedWorkerUrl === 'string' ? resolvedWorkerUrl : String(resolvedWorkerUrl)
      worker = new Worker(workerUrlString, { type: 'module' })
    } catch (err) {
      const errorMessage = `Failed to initialize web worker: ${
        err instanceof Error ? err.message : String(err)
      }`
      console.error('useUMAPPlacement: Failed to create worker:', err)
      setError(errorMessage)
      setLoading(false)
      return
    }

    if (!worker) {
      return
    }

    const activeWorker = worker

    const handleError = (err: ErrorEvent) => {
      console.error('useUMAPPlacement: Worker error event:', err)
      setError('Web worker message error')
      setLoading(false)
    }

    const handleMessageError = (err: MessageEvent) => {
      console.error('useUMAPPlacement: Worker message error:', err)
      setError('Web worker message error')
      setLoading(false)
    }

    activeWorker.addEventListener('error', handleError)
    activeWorker.addEventListener('messageerror', handleMessageError)

    workerRef.current = activeWorker
    setError(null)

    return () => {
      activeWorker.removeEventListener('error', handleError)
      activeWorker.removeEventListener('messageerror', handleMessageError)
      activeWorker.terminate()
      if (workerRef.current === activeWorker) {
        workerRef.current = null
      }
    }
  }, [resolvedWorkerUrl, throwIfMissingWorker])

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
        const workerError = new Error('Web worker not initialized')
        setLoading(false)
        setError(workerError.message)
        if (throwIfMissingWorker) {
          throw workerError
        }
        return Promise.reject(workerError)
      }

      setLoading(true)
      setError(null)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('useUMAPPlacement: Computation timeout after 30s')
          reject(new Error('Placement computation timeout'))
          setLoading(false)
        }, 30_000)

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

        workerRef.current?.addEventListener('message', handleMessage)

        const fullConfig = { ...DEFAULT_CONFIG, ...config }
        workerRef.current?.postMessage({
          type: 'computePlacement',
          stories,
          norm,
          config: fullConfig,
        })
      })
    },
    [throwIfMissingWorker],
  )

  return {
    computePlacement,
    loading,
    error,
  }
}
