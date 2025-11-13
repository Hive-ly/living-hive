import type {BaseStory, GenerateEmbeddingsOptions} from "../types";

// Generate embeddings for multiple texts in a single API call (batch)
export async function generateEmbeddingsBatchClient(
  texts: string[],
  apiKey: string,
  maxRetries: number = 3,
  model?: string,
  dimensions?: number
): Promise<number[][]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(
          `[generateEmbeddingsBatchClient] 🔄 Retrying batch request (attempt ${
            attempt + 1
          }/${maxRetries}) after ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: texts, // Array of texts for batch processing
          model: model || "text-embedding-3-small",
          dimensions: dimensions || 384,
        }),
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[generateEmbeddingsBatchClient] ⚠️ Rate limited (429). Waiting ${waitTime}ms before retry...`,
          {
            attempt: attempt + 1,
            maxRetries,
            retryAfter: retryAfter || "not provided",
            waitTime: `${waitTime}ms`,
          }
        );

        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`Rate limited after ${maxRetries} attempts`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      // Return embeddings in the same order as input texts
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Failed to generate embeddings");
}

// Generate embedding using OpenAI API (client-side) - single text (kept for compatibility)
export async function generateEmbeddingClient(
  text: string,
  apiKey: string,
  model?: string,
  dimensions?: number
): Promise<number[]> {
  const embeddings = await generateEmbeddingsBatchClient([text], apiKey, 3, model, dimensions);
  return embeddings[0];
}

// Generate embeddings via server endpoint
export async function generateEmbeddingServer(
  text: string,
  apiEndpoint: string
): Promise<number[]> {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({text}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.embedding;
}

// Batch generate embeddings for multiple stories (optimized with API-level batching)
export async function generateEmbeddings<T extends BaseStory>(
  stories: T[],
  apiKey: string,
  options?: GenerateEmbeddingsOptions
): Promise<Map<string, number[]>> {
  const {
    apiEndpoint,
    onError,
    batchSize = 100,
    model = "text-embedding-3-small",
    dimensions = 384,
  } = options || {};
  const embeddings = new Map<string, number[]>();
  const totalBatches = Math.ceil(stories.length / batchSize);

  console.log("[generateEmbeddings] 📦 Starting optimized batch processing", {
    totalStories: stories.length,
    batchSize,
    totalBatches,
    apiEndpoint: apiEndpoint || "client",
    strategy: apiEndpoint ? "server (individual)" : "OpenAI batch API",
  });

  // Process stories in batches
  for (let i = 0; i < stories.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = stories.slice(i, i + batchSize);

    console.log(
      `[generateEmbeddings] 📤 Processing batch ${batchNumber}/${totalBatches}`,
      {
        batchSize: batch.length,
        storyIds:
          batch
            .slice(0, 5)
            .map((s) => s.id)
            .join(", ") + (batch.length > 5 ? "..." : ""),
      }
    );

    const batchStartTime = Date.now();

    try {
      if (apiEndpoint) {
        // Server endpoint: process individually (server may not support batching)
        const batchPromises = batch.map(async (story) => {
          try {
            const embedding = await generateEmbeddingServer(
              story.text,
              apiEndpoint
            );
            return {id: story.id, embedding};
          } catch (error) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            console.error(
              `[generateEmbeddings] ❌ Failed to get embedding for story: ${story.id}`,
              {error: err.message}
            );
            if (onError) {
              onError(err);
            }
            return null;
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach((result) => {
          if (result) {
            embeddings.set(result.id, result.embedding);
          }
        });
      } else {
        // OpenAI API: use batch endpoint (much more efficient!)
        const texts = batch.map((s) => s.text);
        const batchEmbeddings = await generateEmbeddingsBatchClient(
          texts,
          apiKey,
          3,
          model,
          dimensions
        );

        // Map embeddings back to story IDs
        batch.forEach((story, idx) => {
          if (batchEmbeddings[idx]) {
            embeddings.set(story.id, batchEmbeddings[idx]);
          }
        });
      }

      const successCount = batch.filter((s) => embeddings.has(s.id)).length;
      console.log(
        `[generateEmbeddings] ✅ Batch ${batchNumber}/${totalBatches} complete`,
        {
          successCount,
          failedCount: batch.length - successCount,
          duration: `${Date.now() - batchStartTime}ms`,
        }
      );

      // Add delay between batches to respect rate limits (only for OpenAI API)
      if (!apiEndpoint && batchNumber < totalBatches) {
        const delay = 100; // 100ms delay between batches
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[generateEmbeddings] ❌ Batch ${batchNumber} failed`, {
        error: err.message,
      });

      // If batch fails, try individual requests as fallback (only for OpenAI)
      if (!apiEndpoint && onError) {
        console.log(
          `[generateEmbeddings] 🔄 Falling back to individual requests for batch ${batchNumber}`
        );
        for (const story of batch) {
          try {
            const embedding = await generateEmbeddingClient(story.text, apiKey, model, dimensions);
            embeddings.set(story.id, embedding);
          } catch (individualError) {
            const individualErr =
              individualError instanceof Error
                ? individualError
                : new Error(String(individualError));
            onError(individualErr);
          }
        }
      } else if (onError) {
        onError(err);
      } else {
        throw err;
      }
    }
  }

  console.log("[generateEmbeddings] ✅ All batches complete", {
    totalEmbeddings: embeddings.size,
    expectedCount: stories.length,
    efficiency: `${Math.round((embeddings.size / stories.length) * 100)}%`,
  });

  return embeddings;
}
