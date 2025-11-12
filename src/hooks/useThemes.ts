import { useState, useCallback } from 'react'
import type { BaseStory, Theme } from '../types'
import { generateThemes, assignStoriesToThemes } from '../utils/themes'

interface UseThemesReturn<T extends BaseStory> {
  generateThemesFromStories: (
    stories: T[],
    embeddings: Map<string, number[]>,
    apiKey: string,
    apiEndpoint?: string
  ) => Promise<Theme[]>
  assignStories: (
    stories: T[],
    embeddings: Map<string, number[]>,
    themes: Theme[]
  ) => Map<string, string>
  loading: boolean
  error: string | null
}

export function useThemes<T extends BaseStory>(): UseThemesReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateThemesFromStories = useCallback(
    async (
      stories: T[],
      embeddings: Map<string, number[]>,
      apiKey: string,
      apiEndpoint?: string
    ): Promise<Theme[]> => {
      setLoading(true)
      setError(null)

      try {
        const themes = await generateThemes(stories, apiKey, apiEndpoint)
        setLoading(false)
        return themes
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error.message)
        setLoading(false)
        throw error
      }
    },
    []
  )

  const assignStories = useCallback(
    (
      stories: T[],
      embeddings: Map<string, number[]>,
      themes: Theme[]
    ): Map<string, string> => {
      return assignStoriesToThemes(stories, embeddings, themes)
    },
    []
  )

  return {
    generateThemesFromStories,
    assignStories,
    loading,
    error,
  }
}

