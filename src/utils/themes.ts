import type {BaseStory, Theme} from "../types";

// Generate themes from stories using OpenAI
export async function generateThemes<T extends BaseStory>(
  stories: T[],
  apiKey: string,
  apiEndpoint?: string
): Promise<Theme[]> {
  if (stories.length === 0) {
    return [];
  }

  // Combine all story texts
  const combinedText = stories.map((s) => s.text).join("\n\n");

  // Use OpenAI to extract themes
  const prompt = `Analyze the following stories and extract the main themes or topics. 
Return a JSON array of theme objects, each with an "id" (short unique identifier) and "label" (human-readable name).
Focus on identifying distinct themes that group similar stories together.
Limit to 5-10 themes maximum.

Stories:
${combinedText}

Return only valid JSON array, no other text.`;

  // Retry logic for rate limiting
  const maxRetries = 3;
  let lastError: Error | null = null;
  const requestStartTime = Date.now();

  console.log("[generateThemes] 🚀 Starting theme generation API call", {
    storyCount: stories.length,
    apiEndpoint: apiEndpoint || "OpenAI",
    maxRetries,
  });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[generateThemes] 🔄 Retrying theme generation (attempt ${
            attempt + 1
          }/${maxRetries}) after ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const attemptStartTime = Date.now();
      console.log(
        `[generateThemes] 📡 Making API request (attempt ${
          attempt + 1
        }/${maxRetries})`
      );

      const response = apiEndpoint
        ? await fetch(apiEndpoint.replace("/embeddings", "/themes"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({prompt}),
          })
        : await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4-turbo-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant that extracts themes from stories. Always return valid JSON arrays.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              response_format: {type: "json_object"},
              temperature: 0.7,
            }),
          });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[generateThemes] ⚠️ Rate limited (429). Waiting ${waitTime}ms before retry...`,
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
        console.error(`[generateThemes] ❌ API error: ${response.status}`, {
          status: response.status,
          errorText: errorText.substring(0, 200),
          attempt: attempt + 1,
        });
        throw new Error(
          `Theme generation error: ${response.status} - ${errorText}`
        );
      }

      console.log(
        `[generateThemes] ✅ API request successful (attempt ${attempt + 1})`,
        {
          duration: `${Date.now() - attemptStartTime}ms`,
        }
      );

      const data = await response.json();
      const content = apiEndpoint
        ? data.themes
        : JSON.parse(data.choices[0].message.content);

      // Parse themes from response
      let themes: Theme[];
      if (Array.isArray(content)) {
        themes = content.map((theme: any, index: number) => ({
          id: theme.id || `theme-${index}`,
          label: theme.label || theme.name || `Theme ${index + 1}`,
        }));
      } else if (content.themes && Array.isArray(content.themes)) {
        // Handle JSON object response
        themes = content.themes.map((theme: any, index: number) => ({
          id: theme.id || `theme-${index}`,
          label: theme.label || theme.name || `Theme ${index + 1}`,
        }));
      } else {
        throw new Error("Invalid theme response format");
      }

      console.log(`[generateThemes] ✅ Theme generation complete`, {
        themeCount: themes.length,
        themes: themes.map((t) => t.label),
        totalDuration: `${Date.now() - requestStartTime}ms`,
        attempt: attempt + 1,
      });

      return themes;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we're out of retries, break and fall back
      if (attempt === maxRetries - 1) {
        break;
      }
      // Otherwise, continue to next retry attempt
    }
  }

  // If we get here, all retries failed - throw error instead of falling back
  console.error(
    "[generateThemes] ❌ Failed to generate themes with OpenAI after all retries",
    {
      error: lastError,
      attempts: maxRetries,
    }
  );
  throw lastError || new Error("Failed to generate themes after all retries");
}

// Note: Fallback theme generation removed - we prefer to fail gracefully
// and keep existing themes rather than generating low-quality "first words" themes

// Simple k-means clustering to assign stories to themes
function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations: number = 100
): number[] {
  if (embeddings.length === 0) return [];
  if (k >= embeddings.length) {
    // If k is greater than or equal to number of points, assign each to its own cluster
    return embeddings.map((_, i) => i);
  }

  const dimension = embeddings[0].length;
  let centroids: number[][] = [];
  let assignments: number[] = new Array(embeddings.length).fill(0);

  // Initialize centroids randomly
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * embeddings.length);
    centroids.push([...embeddings[randomIndex]]);
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign each point to nearest centroid
    const newAssignments: number[] = [];
    embeddings.forEach((embedding, idx) => {
      let nearestCentroid = 0;
      let minDistance = Infinity;

      centroids.forEach((centroid, cIdx) => {
        const distance = cosineSimilarity(embedding, centroid);
        // Use negative similarity as distance (we want to maximize similarity)
        const dist = 1 - distance;
        if (dist < minDistance) {
          minDistance = dist;
          nearestCentroid = cIdx;
        }
      });

      newAssignments.push(nearestCentroid);
    });

    // Check for convergence
    let changed = false;
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i] !== newAssignments[i]) {
        changed = true;
        break;
      }
    }
    if (!changed) break;

    assignments = newAssignments;

    // Recalculate centroids
    centroids = centroids.map((_, cIdx) => {
      const clusterPoints = embeddings.filter(
        (_, idx) => assignments[idx] === cIdx
      );
      if (clusterPoints.length === 0) return centroids[cIdx]; // Keep old centroid if empty

      const centroid = new Array(dimension).fill(0);
      clusterPoints.forEach((point) => {
        point.forEach((val, i) => {
          centroid[i] += val;
        });
      });
      return centroid.map((val) => val / clusterPoints.length);
    });
  }

  return assignments;
}

// Assign stories to themes based on embedding similarity using clustering
export function assignStoriesToThemes<T extends BaseStory>(
  stories: T[],
  embeddings: Map<string, number[]>,
  themes: Theme[]
): Map<string, string> {
  const assignments = new Map<string, string>();

  if (themes.length === 0 || stories.length === 0) {
    return assignments;
  }

  // Get valid stories with embeddings
  const validStories = stories.filter((s) => embeddings.has(s.id));
  if (validStories.length === 0) return assignments;

  // Extract embeddings in the same order as stories
  const embeddingArray = validStories.map((s) => embeddings.get(s.id)!);

  // Use k-means clustering to group stories
  const k = Math.min(themes.length, validStories.length);
  const clusterAssignments = kMeansClustering(embeddingArray, k);

  // Map cluster assignments to theme IDs
  validStories.forEach((story, idx) => {
    const clusterId = clusterAssignments[idx];
    const themeId = themes[clusterId % themes.length].id;
    assignments.set(story.id, themeId);
  });

  return assignments;
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
