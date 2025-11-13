import type { BaseStory, Theme, GenerateEmbeddingsOptions, GenerateThemesOptions } from '../types'

interface EmbeddingDataItem {
  embedding: number[]
}

interface OpenAIEmbeddingResponse {
  data: EmbeddingDataItem[]
}

interface ThemeCandidate {
  id?: string
  label?: string
  name?: string
}

interface ThemeResponsePayload {
  themes: ThemeCandidate[]
}

interface OpenAIChatMessage {
  content: string
}

interface OpenAIChatChoice {
  message: OpenAIChatMessage
}

interface OpenAIChatCompletionResponse {
  choices: OpenAIChatChoice[]
}

interface ServerEmbeddingResponse {
  embedding: number[]
}

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(item => typeof item === 'number')

const isEmbeddingDataItem = (value: unknown): value is EmbeddingDataItem =>
  typeof value === 'object' &&
  value !== null &&
  'embedding' in value &&
  isNumberArray((value as { embedding?: unknown }).embedding)

const isOpenAIEmbeddingResponse = (value: unknown): value is OpenAIEmbeddingResponse =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { data?: unknown }).data) &&
  (value as { data: unknown[] }).data.every(isEmbeddingDataItem)

const isServerEmbeddingResponse = (value: unknown): value is ServerEmbeddingResponse =>
  typeof value === 'object' &&
  value !== null &&
  'embedding' in value &&
  isNumberArray((value as { embedding?: unknown }).embedding)

const isThemeCandidate = (value: unknown): value is ThemeCandidate => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<ThemeCandidate>
  const validId = candidate.id === undefined || typeof candidate.id === 'string'
  const validLabel = candidate.label === undefined || typeof candidate.label === 'string'
  const validName = candidate.name === undefined || typeof candidate.name === 'string'

  return validId && validLabel && validName
}

const isThemeResponsePayload = (value: unknown): value is ThemeResponsePayload =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { themes?: unknown }).themes) &&
  (value as { themes: unknown[] }).themes.every(isThemeCandidate)

const isOpenAIChatCompletionResponse = (value: unknown): value is OpenAIChatCompletionResponse =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { choices?: unknown }).choices) &&
  (value as { choices: unknown[] }).choices.every(choice => {
    if (typeof choice !== 'object' || choice === null) {
      return false
    }
    const message = (choice as { message?: unknown }).message
    return (
      typeof message === 'object' &&
      message !== null &&
      typeof (message as { content?: unknown }).content === 'string'
    )
  })

const DEFAULT_EMBEDDINGS_OPTIONS: Required<
  Pick<GenerateEmbeddingsOptions, 'model' | 'dimensions' | 'batchSize'>
> = {
  model: 'text-embedding-3-small',
  dimensions: 384,
  batchSize: 100,
}

const DEFAULT_THEMES_OPTIONS: Required<
  Pick<GenerateThemesOptions, 'model' | 'minThemes' | 'maxThemes'>
> = {
  model: 'gpt-4-turbo-preview',
  minThemes: 5,
  maxThemes: 10,
}

interface EmbeddingBatchResult {
  id: string
  embedding: number[]
}

export interface StoryDataGeneratorOptions {
  embeddings?: GenerateEmbeddingsOptions
  themes?: GenerateThemesOptions
}

async function generateEmbeddingServer(text: string, apiEndpoint: string): Promise<number[]> {
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

  const data: unknown = await response.json()
  if (!isServerEmbeddingResponse(data)) {
    throw new Error('Invalid embedding response format from server')
  }
  return data.embedding
}

async function generateEmbeddingsBatchClient(
  texts: string[],
  apiKey: string,
  model: string,
  dimensions: number,
  maxRetries = 3,
): Promise<number[][]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model,
          dimensions,
        }),
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt + 1) * 1000
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        throw new Error(`Rate limited after ${maxRetries} attempts`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const data: unknown = await response.json()
      if (!isOpenAIEmbeddingResponse(data)) {
        throw new Error('Invalid embedding response format from OpenAI')
      }
      return data.data.map(item => item.embedding)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt === maxRetries - 1) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Failed to generate embeddings')
}

async function generateThemesClient(
  stories: BaseStory[],
  apiKey: string,
  options: Required<Pick<GenerateThemesOptions, 'model' | 'minThemes' | 'maxThemes'>>,
): Promise<Theme[]> {
  const { model, minThemes, maxThemes } = options
  const prompt = `Analyze the following stories and extract the main themes or topics. 
Return a JSON array of theme objects, each with an "id" (short unique identifier) and "label" (human-readable name).
Focus on identifying distinct themes that group similar stories together.
Limit to ${minThemes}-${maxThemes} themes.

Stories:
${stories.map(story => story.text).join('\n\n')}

Return only valid JSON array, no other text.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
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

  const data: unknown = await response.json()
  if (!isOpenAIChatCompletionResponse(data) || data.choices.length === 0) {
    throw new Error('Invalid theme completion response from OpenAI')
  }

  const contentText = data.choices[0]?.message.content
  if (typeof contentText !== 'string') {
    throw new Error('Missing theme content in OpenAI response')
  }

  const parsed: unknown = JSON.parse(contentText)
  return normalizeThemes(parsed)
}

async function generateThemesServer(stories: BaseStory[], apiEndpoint: string): Promise<Theme[]> {
  const response = await fetch(apiEndpoint.replace('/embeddings', '/themes'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: stories.map(story => story.text).join('\n\n'),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Theme generation error: ${response.status} - ${errorText}`)
  }

  const data: unknown = await response.json()
  return normalizeThemes(data)
}

function normalizeThemes(content: unknown): Theme[] {
  if (isThemeResponsePayload(content)) {
    return normalizeThemes(content.themes)
  }

  if (Array.isArray(content)) {
    if (!content.every(isThemeCandidate)) {
      throw new Error('Invalid theme candidate format')
    }

    return content.map((theme, index) => ({
      id: theme.id ?? `theme-${index}`,
      label: theme.label ?? theme.name ?? `Theme ${index + 1}`,
    }))
  }

  throw new Error('Invalid theme response format')
}

function kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): number[] {
  if (embeddings.length === 0) return []
  if (k >= embeddings.length) {
    return embeddings.map((_, i) => i)
  }

  const dimension = embeddings[0].length
  let centroids: number[][] = []
  let assignments: number[] = new Array(embeddings.length).fill(0)

  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * embeddings.length)
    centroids.push([...embeddings[randomIndex]])
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const newAssignments: number[] = []

    embeddings.forEach(embedding => {
      let nearestCentroid = 0
      let minDistance = Infinity

      centroids.forEach((centroid, cIdx) => {
        const distance = cosineDistance(embedding, centroid)
        if (distance < minDistance) {
          minDistance = distance
          nearestCentroid = cIdx
        }
      })

      newAssignments.push(nearestCentroid)
    })

    let changed = false
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i] !== newAssignments[i]) {
        changed = true
        break
      }
    }
    if (!changed) break

    assignments = newAssignments

    centroids = centroids.map((_, cIdx) => {
      const clusterPoints = embeddings.filter((_, idx) => assignments[idx] === cIdx)
      if (clusterPoints.length === 0) return centroids[cIdx]

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

function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return 1 - dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function assignStoriesToThemes<T extends BaseStory>(
  stories: T[],
  embeddings: Map<string, number[]>,
  themes: Theme[],
): Map<string, string> {
  const assignments = new Map<string, string>()

  if (themes.length === 0 || stories.length === 0) {
    return assignments
  }

  const validStories = stories.filter(story => embeddings.has(story.id))
  if (validStories.length === 0) return assignments

  const embeddingArray = validStories.map(story => embeddings.get(story.id)!)
  const k = Math.min(themes.length, validStories.length)
  const clusterAssignments = kMeansClustering(embeddingArray, k)

  validStories.forEach((story, idx) => {
    const clusterId = clusterAssignments[idx]
    const themeId = themes[clusterId % themes.length].id
    assignments.set(story.id, themeId)
  })

  return assignments
}

export class StoryDataGenerator<T extends BaseStory = BaseStory> {
  private readonly embeddingDefaults: GenerateEmbeddingsOptions
  private readonly themeDefaults: GenerateThemesOptions

  private lastEmbeddings: Map<string, number[]> | null = null
  private lastThemes: Theme[] | null = null

  constructor(
    private readonly stories: T[],
    private readonly apiKey: string,
    options?: StoryDataGeneratorOptions,
  ) {
    this.embeddingDefaults = {
      ...DEFAULT_EMBEDDINGS_OPTIONS,
      ...(options?.embeddings ?? {}),
    }
    this.themeDefaults = {
      ...DEFAULT_THEMES_OPTIONS,
      ...(options?.themes ?? {}),
    }
  }

  async generateEmbeddings(options?: GenerateEmbeddingsOptions): Promise<Map<string, number[]>> {
    const mergedOptions: GenerateEmbeddingsOptions = {
      ...this.embeddingDefaults,
      ...(options ?? {}),
    }

    const {
      apiEndpoint,
      onError,
      batchSize = DEFAULT_EMBEDDINGS_OPTIONS.batchSize,
      model = DEFAULT_EMBEDDINGS_OPTIONS.model,
      dimensions = DEFAULT_EMBEDDINGS_OPTIONS.dimensions,
    } = mergedOptions

    const embeddings = new Map<string, number[]>()
    const totalBatches = Math.ceil(this.stories.length / batchSize)

    for (let i = 0; i < this.stories.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1
      const batch = this.stories.slice(i, i + batchSize)

      try {
        let batchResults: EmbeddingBatchResult[] = []

        if (apiEndpoint) {
          const batchPromises = batch.map(async story => {
            try {
              const embedding = await generateEmbeddingServer(story.text, apiEndpoint)
              return { id: story.id, embedding }
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error))
              if (onError) {
                onError(err)
              }
              return null
            }
          })

          const results = await Promise.all(batchPromises)
          batchResults = results.filter((result): result is EmbeddingBatchResult => result !== null)
        } else {
          const texts = batch.map(story => story.text)
          const embeddingsBatch = await generateEmbeddingsBatchClient(
            texts,
            this.apiKey,
            model,
            dimensions,
          )

          batchResults = embeddingsBatch.map((embedding, idx) => ({
            id: batch[idx].id,
            embedding,
          }))
        }

        batchResults.forEach(result => {
          embeddings.set(result.id, result.embedding)
        })

        if (!apiEndpoint && batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        if (onError) {
          onError(err)
        }
        throw err
      }
    }

    this.lastEmbeddings = embeddings
    return embeddings
  }

  async generateThemes(
    embeddings?: Map<string, number[]>,
    options?: GenerateThemesOptions,
  ): Promise<Theme[]> {
    const mergedOptions: GenerateThemesOptions = {
      ...this.themeDefaults,
      ...(options ?? {}),
    }

    const {
      apiEndpoint,
      model = DEFAULT_THEMES_OPTIONS.model,
      minThemes = DEFAULT_THEMES_OPTIONS.minThemes,
      maxThemes = DEFAULT_THEMES_OPTIONS.maxThemes,
    } = mergedOptions

    try {
      const themes = apiEndpoint
        ? await generateThemesServer(this.stories, apiEndpoint)
        : await generateThemesClient(this.stories, this.apiKey, {
            model,
            minThemes,
            maxThemes,
          })

      if (embeddings) {
        this.lastEmbeddings = embeddings
      }
      this.lastThemes = themes
      return themes
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw err
    }
  }

  assignStoriesToThemes(
    embeddings: Map<string, number[]> = this.lastEmbeddings ?? new Map(),
    themes: Theme[] = this.lastThemes ?? [],
  ): Map<string, string> {
    if (themes.length === 0 || embeddings.size === 0) {
      throw new Error(
        'No embeddings or themes available. Call generateEmbeddings/generateThemes first or pass explicit values.',
      )
    }

    return assignStoriesToThemes(this.stories, embeddings, themes)
  }
}
