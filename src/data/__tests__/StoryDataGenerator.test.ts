import { afterEach, describe, expect, it, vi } from 'vitest'

import { StoryDataGenerator } from '../StoryDataGenerator'

const originalFetch = globalThis.fetch

const sampleStories = [
  { id: 'story-1', text: 'A calm story about the ocean' },
  { id: 'story-2', text: 'An exciting tale about mountains' },
]

describe('StoryDataGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    if (originalFetch) {
      globalThis.fetch = originalFetch
    } else {
      // @ts-expect-error cleanup for test environment
      delete globalThis.fetch
    }
  })

  it('generates embeddings using OpenAI defaults', async () => {
    const embeddingsResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
      }),
    } as Response

    const fetchMock = vi.fn().mockResolvedValue(embeddingsResponse)
    vi.stubGlobal('fetch', fetchMock)

    const generator = new StoryDataGenerator(sampleStories, 'test-api-key')
    const embeddings = await generator.generateEmbeddings()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(embeddings.get('story-1')).toEqual([0.1, 0.2, 0.3])
    expect(embeddings.get('story-2')).toEqual([0.4, 0.5, 0.6])
  })

  it('generates embeddings using a custom server endpoint', async () => {
    const responses = [
      {
        ok: true,
        status: 200,
        json: async () => ({
          embedding: [0.9, 0.1, 0.3],
        }),
      },
      {
        ok: true,
        status: 200,
        json: async () => ({
          embedding: [0.2, 0.8, 0.6],
        }),
      },
    ] as unknown as Response[]

    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(responses.shift() as Response))
    vi.stubGlobal('fetch', fetchMock)

    const generator = new StoryDataGenerator(sampleStories, 'test-api-key')
    const embeddings = await generator.generateEmbeddings({
      apiEndpoint: 'https://api.example.com/embeddings',
    })

    expect(fetchMock).toHaveBeenCalledTimes(sampleStories.length)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/embeddings',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(embeddings.get('story-1')).toEqual([0.9, 0.1, 0.3])
    expect(embeddings.get('story-2')).toEqual([0.2, 0.8, 0.6])
  })

  it('generates themes and assigns stories using stored embeddings', async () => {
    const embeddingsResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
      }),
    } as Response

    const themesResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                themes: [
                  { id: 'theme-1', label: 'Theme One' },
                  { id: 'theme-2', label: 'Theme Two' },
                ],
              }),
            },
          },
        ],
      }),
    } as Response

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(embeddingsResponse)
      .mockResolvedValueOnce(themesResponse)
    vi.stubGlobal('fetch', fetchMock)

    const generator = new StoryDataGenerator(sampleStories, 'test-api-key')
    const embeddings = await generator.generateEmbeddings()
    const themes = await generator.generateThemes(embeddings)
    const assignments = generator.assignStoriesToThemes()

    expect(themes).toHaveLength(2)
    expect(assignments.size).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws when assigning without embeddings or themes', () => {
    const generator = new StoryDataGenerator(sampleStories, 'test-api-key')
    expect(() => generator.assignStoriesToThemes()).toThrowError(
      /No embeddings or themes available/,
    )
  })
})
