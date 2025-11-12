import type { BaseStory, Theme } from '../types'

// Generate themes from stories using OpenAI
export async function generateThemes<T extends BaseStory>(
  stories: T[],
  apiKey: string,
  apiEndpoint?: string
): Promise<Theme[]> {
  if (stories.length === 0) {
    return []
  }

  // Combine all story texts
  const combinedText = stories.map(s => s.text).join('\n\n')

  // Use OpenAI to extract themes
  const prompt = `Analyze the following stories and extract the main themes or topics. 
Return a JSON array of theme objects, each with an "id" (short unique identifier) and "label" (human-readable name).
Focus on identifying distinct themes that group similar stories together.
Limit to 5-10 themes maximum.

Stories:
${combinedText}

Return only valid JSON array, no other text.`

  try {
    const response = apiEndpoint
      ? await fetch(apiEndpoint.replace('/embeddings', '/themes'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        })
      : await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant that extracts themes from stories. Always return valid JSON arrays.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Theme generation error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = apiEndpoint ? data.themes : JSON.parse(data.choices[0].message.content)

    // Parse themes from response
    if (Array.isArray(content)) {
      return content.map((theme: any, index: number) => ({
        id: theme.id || `theme-${index}`,
        label: theme.label || theme.name || `Theme ${index + 1}`,
      }))
    }

    // Handle JSON object response
    if (content.themes && Array.isArray(content.themes)) {
      return content.themes.map((theme: any, index: number) => ({
        id: theme.id || `theme-${index}`,
        label: theme.label || theme.name || `Theme ${index + 1}`,
      }))
    }

    throw new Error('Invalid theme response format')
  } catch (error) {
    // Fallback: create themes based on story clustering
    console.warn('Failed to generate themes with OpenAI, using fallback', error)
    return generateFallbackThemes(stories)
  }
}

// Fallback theme generation based on simple clustering
function generateFallbackThemes<T extends BaseStory>(stories: T[]): Theme[] {
  // Simple fallback: create themes based on story length or first few words
  const themes: Theme[] = []
  const themeMap = new Map<string, number>()

  stories.forEach(story => {
    const words = story.text.toLowerCase().split(/\s+/).slice(0, 3)
    const key = words.join('-')
    themeMap.set(key, (themeMap.get(key) || 0) + 1)
  })

  let index = 0
  themeMap.forEach((count, key) => {
    if (count > 1) {
      themes.push({
        id: `theme-${index}`,
        label: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      })
      index++
    }
  })

  // If no themes found, create a default one
  if (themes.length === 0) {
    themes.push({
      id: 'theme-0',
      label: 'General',
    })
  }

  return themes
}

// Simple k-means clustering to assign stories to themes
function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations: number = 100
): number[] {
  if (embeddings.length === 0) return []
  if (k >= embeddings.length) {
    // If k is greater than or equal to number of points, assign each to its own cluster
    return embeddings.map((_, i) => i)
  }

  const dimension = embeddings[0].length
  let centroids: number[][] = []
  let assignments: number[] = new Array(embeddings.length).fill(0)

  // Initialize centroids randomly
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * embeddings.length)
    centroids.push([...embeddings[randomIndex]])
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign each point to nearest centroid
    const newAssignments: number[] = []
    embeddings.forEach((embedding, idx) => {
      let nearestCentroid = 0
      let minDistance = Infinity

      centroids.forEach((centroid, cIdx) => {
        const distance = cosineSimilarity(embedding, centroid)
        // Use negative similarity as distance (we want to maximize similarity)
        const dist = 1 - distance
        if (dist < minDistance) {
          minDistance = dist
          nearestCentroid = cIdx
        }
      })

      newAssignments.push(nearestCentroid)
    })

    // Check for convergence
    let changed = false
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i] !== newAssignments[i]) {
        changed = true
        break
      }
    }
    if (!changed) break

    assignments = newAssignments

    // Recalculate centroids
    centroids = centroids.map((_, cIdx) => {
      const clusterPoints = embeddings.filter((_, idx) => assignments[idx] === cIdx)
      if (clusterPoints.length === 0) return centroids[cIdx] // Keep old centroid if empty

      const centroid = new Array(dimension).fill(0)
      clusterPoints.forEach(point => {
        point.forEach((val, i) => {
          centroid[i] += val
        })
      })
      return centroid.map(val => val / clusterPoints.length)
    })
  }

  return assignments
}

// Assign stories to themes based on embedding similarity using clustering
export function assignStoriesToThemes<T extends BaseStory>(
  stories: T[],
  embeddings: Map<string, number[]>,
  themes: Theme[]
): Map<string, string> {
  const assignments = new Map<string, string>()

  if (themes.length === 0 || stories.length === 0) {
    return assignments
  }

  // Get valid stories with embeddings
  const validStories = stories.filter(s => embeddings.has(s.id))
  if (validStories.length === 0) return assignments

  // Extract embeddings in the same order as stories
  const embeddingArray = validStories.map(s => embeddings.get(s.id)!)
  
  // Use k-means clustering to group stories
  const k = Math.min(themes.length, validStories.length)
  const clusterAssignments = kMeansClustering(embeddingArray, k)

  // Map cluster assignments to theme IDs
  validStories.forEach((story, idx) => {
    const clusterId = clusterAssignments[idx]
    const themeId = themes[clusterId % themes.length].id
    assignments.set(story.id, themeId)
  })

  return assignments
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

