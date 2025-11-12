import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { BaseStory, Theme, HexCoordinate, StoryWithEmbedding, LivingHiveProps } from '../types'
import { useEmbeddings } from '../hooks/useEmbeddings'
import { useThemes } from '../hooks/useThemes'
import { useUMAPPlacement } from '../hooks/useUMAPPlacement'
import { hexToPixel, getHexRadius } from '../utils/hex'
import { getThemeColor, DEFAULT_COLOR_PALETTE } from '../utils/colors'
import { HiveShimmer } from './HiveShimmer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { cn } from '../utils/cn'

interface HexData<T extends BaseStory> {
  q: number
  r: number
  theme: Theme | null
  story: T
}

export function LivingHive<T extends BaseStory = BaseStory>({
  stories,
  openaiApiKey,
  themes: providedThemes,
  colorPalette = DEFAULT_COLOR_PALETTE,
  apiEndpoint,
  onHexClick,
  renderStory,
  onError,
  className,
  config,
}: LivingHiveProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hexes, setHexes] = useState<HexData<T>[]>([])
  const [selectedHex, setSelectedHex] = useState<HexData<T> | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [focusedHexIndex, setFocusedHexIndex] = useState<number | null>(null)
  const [themes, setThemes] = useState<Theme[]>(providedThemes || [])
  const [storyAssignments, setStoryAssignments] = useState<Map<string, string>>(
    new Map()
  )

  const { generateEmbeddingsForStories, loading: embeddingsLoading } =
    useEmbeddings<T>(onError)
  const { generateThemesFromStories, assignStories, loading: themesLoading } =
    useThemes<T>()
  const {
    computePlacement,
    loading: placementLoading,
    error: placementError,
  } = useUMAPPlacement()

  const loading = embeddingsLoading || themesLoading || placementLoading

  // Generate or use provided themes
  useEffect(() => {
    if (providedThemes && providedThemes.length > 0) {
      setThemes(providedThemes)
      // Still need to assign stories to themes when themes are provided
      if (stories.length > 0) {
        const generateAssignments = async () => {
          try {
            const embeddings = await generateEmbeddingsForStories(
              stories,
              openaiApiKey,
              apiEndpoint
            )
            const assignments = assignStories(stories, embeddings, providedThemes)
            setStoryAssignments(assignments)
          } catch (error) {
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)))
            }
          }
        }
        generateAssignments()
      }
      return
    }

    if (stories.length === 0) {
      setThemes([])
      return
    }

    const generateThemes = async () => {
      try {
        const embeddings = await generateEmbeddingsForStories(
          stories,
          openaiApiKey,
          apiEndpoint
        )

        const generatedThemes = await generateThemesFromStories(
          stories,
          embeddings,
          openaiApiKey,
          apiEndpoint
        )

        setThemes(generatedThemes)

        const assignments = assignStories(stories, embeddings, generatedThemes)
        setStoryAssignments(assignments)
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    generateThemes()
  }, [
    stories,
    providedThemes,
    openaiApiKey,
    apiEndpoint,
    generateEmbeddingsForStories,
    generateThemesFromStories,
    assignStories,
    onError,
  ])

  // Generate hex positions when data changes
  useEffect(() => {
    if (stories.length === 0 || themes.length === 0) {
      setHexes([])
      return
    }

    // Wait for story assignments to be ready
    if (storyAssignments.size === 0 && stories.length > 0) {
      return
    }

    const generateHexes = async () => {
      try {
        const embeddings = await generateEmbeddingsForStories(
          stories,
          openaiApiKey,
          apiEndpoint
        )

        // Filter out stories without embeddings
        const validStories = stories.filter(story => {
          const embedding = embeddings.get(story.id)
          return embedding && embedding.length > 0
        })

        if (validStories.length === 0) {
          console.warn('No stories with valid embeddings')
          setHexes([])
          return
        }

        const storyData: StoryWithEmbedding[] = validStories.map(story => ({
          id: story.id,
          text: story.text,
          embedding: embeddings.get(story.id)!,
          cluster_id: storyAssignments.get(story.id) || themes[0]?.id,
        }))

        const norm = {
          min_x: -10.0,
          max_x: 10.0,
          min_y: -10.0,
          max_y: 10.0,
        }

        const canvas = canvasRef.current
        const rect = canvas?.getBoundingClientRect()
        const canvasWidth = rect?.width || config?.canvasWidth || 900
        const canvasHeight = rect?.height || config?.canvasHeight || 600

        const result = await computePlacement(storyData, norm, {
          canvasWidth,
          canvasHeight,
          hexRadius: config?.hexRadius || getHexRadius(),
          margin: config?.margin || 20,
        })

        const themeMap = new Map<string, Theme>()
        themes.forEach(theme => {
          themeMap.set(theme.id, theme)
        })

        const newHexes: HexData<T>[] = []
        result.placements.forEach((hexCoord, storyId) => {
          const story = validStories.find(s => s.id === storyId)
          if (!story) return

          const themeId = storyAssignments.get(storyId) || themes[0]?.id
          const theme = themeId ? themeMap.get(themeId) || null : null

          newHexes.push({
            q: hexCoord.q,
            r: hexCoord.r,
            theme,
            story,
          })
        })

        console.log('Generated hexes:', newHexes.length)
        setHexes(newHexes)
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
        setHexes([])
      }
    }

    generateHexes()
  }, [
    stories,
    themes,
    storyAssignments,
    openaiApiKey,
    apiEndpoint,
    config,
    generateEmbeddingsForStories,
    computePlacement,
    onError,
  ])

  // Render hexes to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hexes.length) {
      if (hexes.length === 0 && canvas) {
        console.log('No hexes to render')
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get 2d context')
      return
    }

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Canvas has zero dimensions:', rect.width, rect.height)
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)
    
    console.log('Rendering', hexes.length, 'hexes on canvas', rect.width, 'x', rect.height)

    const hexRadius = config?.hexRadius || getHexRadius()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    hexes.forEach((hex, index) => {
      const pixel = hexToPixel(hex, hexRadius)
      const x = centerX + pixel.x
      const y = centerY + pixel.y

      if (
        x < -hexRadius ||
        x > rect.width + hexRadius ||
        y < -hexRadius ||
        y > rect.height + hexRadius
      ) {
        return
      }

      const isFocused = focusedHexIndex === index
      drawHex(ctx, x, y, hexRadius, hex, isFocused)
    })

    if (selectedHex) {
      const pixel = hexToPixel(selectedHex, hexRadius)
      const x = centerX + pixel.x
      const y = centerY + pixel.y
      drawHex(ctx, x, y, hexRadius, selectedHex, true)
    }
  }, [hexes, selectedHex, focusedHexIndex, config])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && hexes.length) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const rect = canvas.getBoundingClientRect()
          const dpr = window.devicePixelRatio || 1
          canvas.width = rect.width * dpr
          canvas.height = rect.height * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, rect.width, rect.height)

          const hexRadius = config?.hexRadius || getHexRadius()
          const centerX = rect.width / 2
          const centerY = rect.height / 2

          hexes.forEach((hex, index) => {
            const pixel = hexToPixel(hex, hexRadius)
            const x = centerX + pixel.x
            const y = centerY + pixel.y

            if (
              x >= -hexRadius &&
              x <= rect.width + hexRadius &&
              y >= -hexRadius &&
              y <= rect.height + hexRadius
            ) {
              const isFocused = focusedHexIndex === index
              drawHex(ctx, x, y, hexRadius, hex, isFocused)
            }
          })

          if (selectedHex) {
            const pixel = hexToPixel(selectedHex, hexRadius)
            const x = centerX + pixel.x
            const y = centerY + pixel.y
            drawHex(ctx, x, y, hexRadius, selectedHex, true)
          }
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hexes, selectedHex, focusedHexIndex, config])

  const drawHex = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    hex: HexData<T>,
    isSelected: boolean
  ) => {
    const fillColor = hex.theme
      ? getThemeColor(hex.theme.id, themes, colorPalette)
      : colorPalette[0]

    ctx.save()

    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const hexX = x + radius * Math.cos(angle)
      const hexY = y + radius * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(hexX, hexY)
      } else {
        ctx.lineTo(hexX, hexY)
      }
    }
    ctx.closePath()

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, fillColor)
    gradient.addColorStop(1, fillColor + '80')

    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = isSelected ? '#000' : fillColor
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()

    if (isSelected) {
      ctx.shadowColor = fillColor
      ctx.shadowBlur = 15
      ctx.stroke()
    }

    ctx.restore()
  }

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const hexRadius = config?.hexRadius || getHexRadius()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      let foundHex: HexData<T> | null = null
      let foundIndex = -1

      for (let i = 0; i < hexes.length; i++) {
        const hex = hexes[i]
        const pixel = hexToPixel(hex, hexRadius)
        const hexX = centerX + pixel.x
        const hexY = centerY + pixel.y
        const distance = Math.sqrt((x - hexX) ** 2 + (y - hexY) ** 2)

        if (distance <= hexRadius) {
          foundHex = hex
          foundIndex = i
          break
        }
      }

      if (foundHex) {
        setSelectedHex(foundHex)
        setFocusedHexIndex(foundIndex)
        setIsPopoverOpen(true)
        if (onHexClick) {
          onHexClick(foundHex.story, foundHex.theme)
        }
      } else {
        setSelectedHex(null)
        setFocusedHexIndex(null)
        setIsPopoverOpen(false)
      }
    },
    [hexes, config, onHexClick]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (hexes.length === 0) return

      let newIndex = focusedHexIndex

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          newIndex =
            focusedHexIndex === null || focusedHexIndex === hexes.length - 1
              ? 0
              : focusedHexIndex + 1
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          newIndex =
            focusedHexIndex === null || focusedHexIndex === 0
              ? hexes.length - 1
              : focusedHexIndex - 1
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (focusedHexIndex !== null) {
            const hex = hexes[focusedHexIndex]
            setSelectedHex(hex)
            setIsPopoverOpen(true)
            if (onHexClick) {
              onHexClick(hex.story, hex.theme)
            }
          }
          break
        case 'Escape':
          event.preventDefault()
          setSelectedHex(null)
          setFocusedHexIndex(null)
          setIsPopoverOpen(false)
          break
        default:
          return
      }

      if (newIndex !== null && newIndex !== focusedHexIndex) {
        setFocusedHexIndex(newIndex)
        setSelectedHex(hexes[newIndex])
      }
    },
    [hexes, focusedHexIndex, onHexClick]
  )

  if (loading) {
    console.log('Loading state:', { embeddingsLoading, themesLoading, placementLoading })
    return <HiveShimmer className={className} />
  }

  if (placementError) {
    console.error('Placement error:', placementError)
    return (
      <div
        className={cn(
          'h-96 flex items-center justify-center',
          className
        )}
        role="alert"
      >
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to compute positions</p>
          <p className="text-sm text-muted-foreground">{placementError}</p>
        </div>
      </div>
    )
  }

  console.log('Render state:', { 
    themesCount: themes.length, 
    hexesCount: hexes.length, 
    storiesCount: stories.length,
    assignmentsCount: storyAssignments.size 
  })

  if (!themes.length || !hexes.length) {
    return (
      <div
        className={cn(
          'h-96 flex items-center justify-center',
          className
        )}
      >
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            {!themes.length ? 'No themes available' : 'No hexes to display'}
          </p>
          <p className="text-sm text-muted-foreground">
            {!themes.length 
              ? 'Generating themes...' 
              : `Waiting for ${stories.length} stories to be processed...`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Living Hive visualization"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-96 border border-border rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        onClick={handleCanvasClick}
        style={{ touchAction: 'none' }}
        aria-label="Interactive hex grid visualization"
        tabIndex={-1}
      />

      {selectedHex && (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="sr-only"
              aria-label={`Story: ${selectedHex.story.text.substring(0, 50)}...`}
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-80 max-h-96 overflow-y-auto"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <div className="space-y-3">
              {selectedHex.theme && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{
                      backgroundColor: getThemeColor(
                        selectedHex.theme.id,
                        themes,
                        colorPalette
                      ),
                    }}
                    aria-label={`Theme: ${selectedHex.theme.label}`}
                  />
                  <h3 className="font-semibold text-lg">
                    {selectedHex.theme.label}
                  </h3>
                </div>
              )}
              <div className="text-sm text-foreground leading-relaxed">
                {renderStory ? (
                  renderStory(selectedHex.story)
                ) : (
                  <p>"{selectedHex.story.text}"</p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </span>
          <span className="text-muted-foreground">
            {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
          </span>
        </div>
      </div>
    </div>
  )
}

