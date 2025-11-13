import { afterEach, describe, expect, it, vi } from 'vitest'

import { assignStoriesToThemes } from '../../data/StoryDataGenerator'

const themes = [
  { id: 'theme-1', label: 'Theme 1' },
  { id: 'theme-2', label: 'Theme 2' },
]

const stories = [
  { id: 'story-1', text: 'A calm story about the ocean' },
  { id: 'story-2', text: 'An exciting tale about mountains' },
  { id: 'story-3', text: 'Story without embedding' },
]

const embeddings = new Map<string, number[]>([
  ['story-1', [0.1, 0.2, 0.3]],
  ['story-2', [0.9, 0.8, 0.7]],
])

describe('assignStoriesToThemes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('assigns stories with embeddings to themes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // deterministic centroid choice

    const assignments = assignStoriesToThemes(stories, embeddings, themes)
    expect(assignments.size).toBe(2)
    expect(assignments.get('story-1')).toBeDefined()
    expect(assignments.get('story-2')).toBeDefined()
    expect(assignments.has('story-3')).toBe(false)
  })

  it('returns empty assignments when inputs are missing', () => {
    expect(assignStoriesToThemes([], embeddings, themes).size).toBe(0)
    expect(assignStoriesToThemes(stories, new Map(), themes).size).toBe(0)
    expect(assignStoriesToThemes(stories, embeddings, []).size).toBe(0)
  })
})
