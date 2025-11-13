import {useState, useCallback, useRef} from "react";
import type {BaseStory, GenerateEmbeddingsOptions} from "../types";
import {generateEmbeddings} from "../utils/embeddings";

interface UseEmbeddingsReturn<T extends BaseStory> {
  generateEmbeddingsForStories: (
    stories: T[],
    apiKey: string,
    options?: GenerateEmbeddingsOptions
  ) => Promise<Map<string, number[]>>;
  loading: boolean;
  error: string | null;
}

export function useEmbeddings<T extends BaseStory>(
  onError?: (error: Error) => void
): UseEmbeddingsReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache: Map<cacheKey, Map<storyId, embedding>>
  const cacheRef = useRef<Map<string, Map<string, number[]>>>(new Map());
  // In-flight promises: Map<cacheKey, Promise>
  const inFlightRef = useRef<Map<string, Promise<Map<string, number[]>>>>(
    new Map()
  );

  const getCacheKey = useCallback(
    (stories: T[], apiKey: string, options?: GenerateEmbeddingsOptions) => {
      const storyIds = stories
        .map((s) => s.id)
        .sort()
        .join(",");
      const optionsKey = options?.apiEndpoint || options?.model || "client";
      return `${storyIds}:${apiKey}:${optionsKey}`;
    },
    []
  );

  const generateEmbeddingsForStories = useCallback(
    async (
      stories: T[],
      apiKey: string,
      options?: GenerateEmbeddingsOptions
    ): Promise<Map<string, number[]>> => {
      const cacheKey = getCacheKey(stories, apiKey, options);
      const storyIds =
        stories
          .map((s) => s.id)
          .slice(0, 5)
          .join(",") + (stories.length > 5 ? "..." : "");

      console.log("[useEmbeddings] 🔍 Checking cache for embeddings", {
        storyCount: stories.length,
        storyIds: storyIds,
        cacheKey: cacheKey.substring(0, 50) + "...",
        cacheSize: cacheRef.current.size,
        inFlightCount: inFlightRef.current.size,
      });

      // Check cache first
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        console.log(
          "[useEmbeddings] ✅ Cache hit! Returning cached embeddings",
          {
            count: cached.size,
            storyIds: storyIds,
          }
        );
        return cached;
      }

      // Check in-flight promise
      const inFlight = inFlightRef.current.get(cacheKey);
      if (inFlight) {
        console.log(
          "[useEmbeddings] ⏳ In-flight request found, reusing promise",
          {
            storyIds: storyIds,
          }
        );
        return inFlight;
      }

      // Create new request
      console.log("[useEmbeddings] 🚀 Creating new embedding request", {
        storyCount: stories.length,
        storyIds: storyIds,
        apiEndpoint: options?.apiEndpoint || "client",
      });
      setLoading(true);
      setError(null);

      const promise = (async () => {
        const startTime = Date.now();
        try {
          const embeddings = await generateEmbeddings(stories, apiKey, {
            ...options,
            onError: (err) => {
              console.error(
                "[useEmbeddings] ❌ Error generating embedding for story",
                {
                  error: err.message,
                }
              );
              if (onError) {
                onError(err);
              }
              setError(err.message);
              if (options?.onError) {
                options.onError(err);
              }
            },
          });

          // Cache the result
          cacheRef.current.set(cacheKey, embeddings);
          // Remove from in-flight
          inFlightRef.current.delete(cacheKey);
          setLoading(false);

          console.log("[useEmbeddings] ✅ Embeddings generated and cached", {
            count: embeddings.size,
            duration: `${Date.now() - startTime}ms`,
            cacheSize: cacheRef.current.size,
          });

          return embeddings;
        } catch (err) {
          // Remove from in-flight on error
          inFlightRef.current.delete(cacheKey);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error.message);
          setLoading(false);

          console.error("[useEmbeddings] ❌ Failed to generate embeddings", {
            error: error.message,
            duration: `${Date.now() - startTime}ms`,
          });

          if (onError) {
            onError(error);
          }

          throw error;
        }
      })();

      inFlightRef.current.set(cacheKey, promise);
      return promise;
    },
    [onError, getCacheKey]
  );

  return {
    generateEmbeddingsForStories,
    loading,
    error,
  };
}
