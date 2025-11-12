import type { BaseStory } from '../types'

// Generate embedding using OpenAI API (client-side)
export async function generateEmbeddingClient(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: 384,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

// Generate embeddings via server endpoint
export async function generateEmbeddingServer(
  text: string,
  apiEndpoint: string
): Promise<number[]> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Server API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.embedding
}

// Batch generate embeddings for multiple stories
export async function generateEmbeddings<T extends BaseStory>(
  stories: T[],
  apiKey: string,
  apiEndpoint?: string,
  onError?: (error: Error) => void
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>()

  for (const story of stories) {
    try {
      const embedding = apiEndpoint
        ? await generateEmbeddingServer(story.text, apiEndpoint)
        : await generateEmbeddingClient(story.text, apiKey)

      embeddings.set(story.id, embedding)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (onError) {
        onError(err)
      } else {
        throw err
      }
    }
  }

  return embeddings
}

