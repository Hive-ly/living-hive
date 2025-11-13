import React, { useMemo } from 'react'
import { toast } from 'sonner'
import { LivingHive } from '@living-hive/react'
import type { BaseStory, Theme } from '@living-hive/react'
import mockEmbeddingsData from '../data/mockEmbeddings.json'
import sampleStoriesData from '../data/sampleStories.json'
import mockThemesData from '../data/mockThemes.json'

// Theme Legend Component
function ThemeLegend({
  themes,
  storyAssignments,
  stories,
  colorPalette,
}: {
  themes: Theme[]
  storyAssignments: Map<string, string>
  stories: BaseStory[]
  colorPalette: string[]
}) {
  // Memoize theme counts and sorted themes to prevent recalculation on every render
  const { themeCounts, sortedThemes } = React.useMemo(() => {
    const counts = new Map<string, number>()
    themes.forEach(theme => {
      counts.set(theme.id, 0)
    })
    stories.forEach(story => {
      const themeId = storyAssignments.get(story.id)
      if (themeId) {
        counts.set(themeId, (counts.get(themeId) || 0) + 1)
      }
    })

    // Sort themes by story count (descending - most stories first)
    const sorted = [...themes].sort((a, b) => {
      const countA = counts.get(a.id) || 0
      const countB = counts.get(b.id) || 0
      return countB - countA // Descending order
    })

    return { themeCounts: counts, sortedThemes: sorted }
  }, [themes, storyAssignments, stories])

  const getThemeColor = (themeId: string): string => {
    const themeIndex = themes.findIndex(t => t.id === themeId)
    if (themeIndex === -1) return colorPalette[0]
    return colorPalette[themeIndex % colorPalette.length]
  }

  // Get warm off-white and charcoal colors from parent scope
  const warmOffWhite = '#F5F5F0'
  const charcoalDark = '#1a1a1a'
  const charcoalMedium = '#2d2d2d'

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 shadow-xl flex flex-col"
      style={{
        backgroundColor: `${charcoalMedium}99`,
        border: `1px solid ${warmOffWhite}20`,
        height: 'calc(100vh - 312px)',
      }}
    >
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="font-display text-xl font-semibold" style={{ color: warmOffWhite }}>
          Story Themes
        </h3>
      </div>
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {sortedThemes.map(theme => {
          const count = themeCounts.get(theme.id) || 0
          const color = getThemeColor(theme.id)
          return (
            <div
              key={theme.id}
              className="flex items-center justify-between rounded-lg p-3 transition-colors"
              style={{
                backgroundColor: `${charcoalDark}80`,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${charcoalDark}99`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = `${charcoalDark}80`)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: warmOffWhite }}>
                    {theme.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: warmOffWhite, opacity: 0.7 }}>
                    {count} {count === 1 ? 'story' : 'stories'}
                  </div>
                </div>
              </div>
              <div
                className="text-xs font-semibold px-2.5 py-1 rounded-md"
                style={{
                  backgroundColor: `${charcoalDark}99`,
                  color: warmOffWhite,
                }}
              >
                {count}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-4 flex-shrink-0" style={{ borderTop: `1px solid ${warmOffWhite}20` }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: warmOffWhite, opacity: 0.7 }}>Total Stories:</span>
          <span className="font-medium" style={{ color: warmOffWhite }}>
            {stories.length}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span style={{ color: warmOffWhite, opacity: 0.7 }}>Active Clusters:</span>
          <span className="font-medium" style={{ color: warmOffWhite }}>
            {themes.length}
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 flex-shrink-0" style={{ borderTop: `1px solid ${warmOffWhite}20` }}>
        <p className="text-xs leading-relaxed" style={{ color: warmOffWhite, opacity: 0.7 }}>
          <strong style={{ opacity: 0.9 }}>How it works:</strong> Stories are grouped by similar
          themes and workplace issues.
        </p>
      </div>
    </div>
  )
}

export function BasicExample() {
  // Load stories from sampleStories.json
  const sampleStories: BaseStory[] = sampleStoriesData as BaseStory[]

  // Convert JSON embeddings to Map
  const embeddings = useMemo(() => {
    const embeddingsMap = new Map<string, number[]>()
    Object.entries(mockEmbeddingsData as Record<string, number[]>).forEach(([id, embedding]) => {
      embeddingsMap.set(id, embedding)
    })
    return embeddingsMap
  }, [])

  // Use themes directly from JSON
  const themes = useMemo(() => {
    return (mockThemesData as Theme[]) || []
  }, [])

  const [storyAssignments, setStoryAssignments] = React.useState<Map<string, string>>(new Map())

  // Color palette from image
  const colorPalette = [
    '#4F81B0', // Muted Blue
    '#AEBEC5', // Pale Blue-Grey
    '#DAA5AD', // Dusty Rose Pink
    '#FF6E7F', // Coral Pink
    '#CDB15E', // Muted Gold/Mustard
  ]

  // Dark charcoal backgrounds
  const charcoalMedium = '#2d2d2d'

  // Warm off-white foreground
  const warmOffWhite = '#F5F5F0'

  return (
    <div
      className="min-h-screen"
      style={{
        color: warmOffWhite,
      }}
    >
      {/* Hero Section */}
      <div style={{ borderBottom: `1px solid rgba(255, 255, 255, 0.1)` }}>
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
          <div className="max-w-3xl">
            <h1
              className="font-display text-3xl md:text-4xl font-bold mb-3 tracking-tight"
              style={{ color: colorPalette[0] }}
            >
              Living Hive
            </h1>
            <p
              className="text-base leading-relaxed mb-4"
              style={{ color: warmOffWhite, opacity: 0.9 }}
            >
              Explore workplace stories from{' '}
              <a
                href="https://www.reddit.com/r/work"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium transition-colors"
                style={{ color: colorPalette[0], opacity: 0.9 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
              >
                r/work
              </a>{' '}
              visualized as an interactive hive. Each hexagon represents a story, grouped by similar
              themes and workplace issues.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <span
                className="px-3 py-1.5 rounded-full border text-sm"
                style={{
                  backgroundColor: `${charcoalMedium}80`,
                  borderColor: `${warmOffWhite}20`,
                  color: warmOffWhite,
                  opacity: 0.7,
                }}
              >
                {sampleStories.length} stories
              </span>
              <span
                className="px-3 py-1.5 rounded-full border text-sm"
                style={{
                  backgroundColor: `${charcoalMedium}80`,
                  borderColor: `${warmOffWhite}20`,
                  color: warmOffWhite,
                  opacity: 0.7,
                }}
              >
                Pre-computed embeddings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div
              className="backdrop-blur-sm rounded-xl shadow-2xl"
              style={{ backgroundColor: `${charcoalMedium}80` }}
            >
              <LivingHive
                stories={sampleStories}
                embeddings={embeddings}
                themes={themes}
                colorPalette={colorPalette}
                onAssignmentsChange={setStoryAssignments}
                onError={error => {
                  console.error('Error in LivingHive:', error)
                  toast.error('Failed to process stories', {
                    description: error.message,
                    duration: 5000,
                  })
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            {themes.length > 0 && storyAssignments.size > 0 && (
              <ThemeLegend
                themes={themes}
                storyAssignments={storyAssignments}
                stories={sampleStories}
                colorPalette={colorPalette}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
