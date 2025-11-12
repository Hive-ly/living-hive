import { useState, useCallback } from 'react'
import type { BaseStory } from '../types'
import { generateEmbeddings } from '../utils/embeddings'

interface UseEmbeddingsReturn<T extends BaseStory> {
  generateEmbeddingsForStories: (
    stories: T[],
    apiKey: string,
    apiEndpoint?: string
  ) => Promise<Map<string, number[]>>
  loading: boolean
  error: string | null
}

export function useEmbeddings<T extends BaseStory>(
  onError?: (error: Error) => void
): UseEmbeddingsReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateEmbeddingsForStories = useCallback(
    async (
      stories: T[],
      apiKey: string,
      apiEndpoint?: string
    ): Promise<Map<string, number[]>> => {
      setLoading(true)
      setError(null)

      try {
        const embeddings = await generateEmbeddings(
          stories,
          apiKey,
          apiEndpoint,
          (err) => {
            if (onError) {
              onError(err)
            }
            setError(err.message)
          }
        )

        setLoading(false)
        return embeddings
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error.message)
        setLoading(false)

        if (onError) {
          onError(error)
        }

        throw error
      }
    },
    [onError]
  )

  return {
    generateEmbeddingsForStories,
    loading,
    error,
  }
}

