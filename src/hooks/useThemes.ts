import {useState, useCallback} from "react";
import type {BaseStory, Theme, GenerateThemesOptions} from "../types";
import {generateThemes, assignStoriesToThemes} from "../utils/themes";

interface UseThemesReturn<T extends BaseStory> {
  generateThemesFromStories: (
    stories: T[],
    embeddings: Map<string, number[]>,
    apiKey: string,
    options?: GenerateThemesOptions
  ) => Promise<Theme[]>;
  assignStories: (
    stories: T[],
    embeddings: Map<string, number[]>,
    themes: Theme[]
  ) => Map<string, string>;
  loading: boolean;
  error: string | null;
}

export function useThemes<T extends BaseStory>(): UseThemesReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateThemesFromStories = useCallback(
    async (
      stories: T[],
      embeddings: Map<string, number[]>,
      apiKey: string,
      options?: GenerateThemesOptions
    ): Promise<Theme[]> => {
      const startTime = Date.now();
      console.log("[useThemes] 🎨 Starting theme generation", {
        storyCount: stories.length,
        embeddingCount: embeddings.size,
        apiEndpoint: options?.apiEndpoint || "client",
        timestamp: new Date().toISOString(),
      });

      setLoading(true);
      setError(null);

      try {
        const themes = await generateThemes(stories, apiKey, options);
        console.log("[useThemes] ✅ Theme generation complete", {
          themeCount: themes.length,
          themes: themes.map((t) => t.label),
          duration: `${Date.now() - startTime}ms`,
        });
        setLoading(false);
        return themes;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[useThemes] ❌ Theme generation failed", {
          error: error.message,
          duration: `${Date.now() - startTime}ms`,
        });
        setError(error.message);
        setLoading(false);
        throw error;
      }
    },
    []
  );

  const assignStories = useCallback(
    (
      stories: T[],
      embeddings: Map<string, number[]>,
      themes: Theme[]
    ): Map<string, string> => {
      return assignStoriesToThemes(stories, embeddings, themes);
    },
    []
  );

  return {
    generateThemesFromStories,
    assignStories,
    loading,
    error,
  };
}
