import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import type { BaseStory, Theme, StoryWithEmbedding, LivingHiveProps } from '../types'
import { useUMAPPlacement } from '../hooks/useUMAPPlacement'
import { hexToPixel, getHexRadius } from '../utils/hex'
import { getThemeColor, DEFAULT_COLOR_PALETTE } from '../utils/colors'
import { HiveShimmer } from './HiveShimmer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { cn } from '../utils/cn'
import { assignStoriesToThemes } from '../data/StoryDataGenerator'

interface HexData<T extends BaseStory> {
  q: number
  r: number
  theme: Theme | null
  story: T
}

export function LivingHive<T extends BaseStory = BaseStory>({
  stories,
  embeddings,
  themes,
  colorPalette = DEFAULT_COLOR_PALETTE,
  loading: externalLoading,
  onHexClick,
  renderStory,
  onError,
  onThemesChange,
  onAssignmentsChange,
  className,
  config,
  dialogConfig,
}: LivingHiveProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hexes, setHexes] = useState<HexData<T>[]>([])
  const [selectedHex, setSelectedHex] = useState<HexData<T> | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [focusedHexIndex, setFocusedHexIndex] = useState<number | null>(null)
  const [storyAssignments, setStoryAssignments] = useState<Map<string, string>>(new Map())

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const initialPanRef = useRef({ x: 0, y: 0 })
  const autoFitAppliedRef = useRef<string>('') // Track which hex set we've auto-fitted

  const { computePlacement, loading: placementLoading, error: placementError } = useUMAPPlacement()

  // Use external loading prop if provided, otherwise use placement loading
  const loading = externalLoading !== undefined ? externalLoading : placementLoading

  // Compute story assignments when themes and embeddings are available
  useEffect(() => {
    if (stories.length === 0 || themes.length === 0 || embeddings.size === 0) {
      setStoryAssignments(new Map())
      return
    }

    // Compute assignments synchronously
    const assignments = assignStoriesToThemes(stories, embeddings, themes)
    setStoryAssignments(assignments)

    // Call callbacks when assignments are ready
    if (onThemesChange) {
      onThemesChange(themes)
    }
    if (onAssignmentsChange) {
      onAssignmentsChange(assignments)
    }
  }, [stories, themes, embeddings, onThemesChange, onAssignmentsChange])

  // Generate hex positions when data changes
  useEffect(() => {
    if (stories.length === 0 || themes.length === 0) {
      setHexes([])
      autoFitAppliedRef.current = '' // Reset auto-fit when clearing hexes
      return
    }

    // Wait for story assignments to be ready
    if (storyAssignments.size === 0 && stories.length > 0) {
      return
    }

    const generateHexes = async () => {
      try {
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

        const storyMap = new Map(validStories.map(story => [story.id, story]))
        const newHexes: HexData<T>[] = []
        result.placements.forEach((hexCoord, storyId) => {
          const story = storyMap.get(storyId)
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

        setHexes(newHexes)
        // Reset auto-fit flag so it runs for the new hex set
        autoFitAppliedRef.current = ''
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
        setHexes([])
      }
    }

    generateHexes()
  }, [stories, themes, embeddings, storyAssignments, config, computePlacement, onError])

  // Render hexes to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hexes.length) {
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

    // Fill with lighter background
    ctx.fillStyle = '#1a1a1a' // Dark gray background
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw outline/border
    ctx.strokeStyle = '#404040' // Medium gray outline
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2)

    const hexRadius = config?.hexRadius || getHexRadius()

    // Apply zoom and pan transforms
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    // Calculate center offset (hexes are positioned relative to center)
    const centerX = 0
    const centerY = 0

    hexes.forEach((hex, index) => {
      const pixel = hexToPixel(hex, hexRadius)
      const x = centerX + pixel.x
      const y = centerY + pixel.y

      // Check if hex is visible (accounting for zoom)
      const screenX = x * zoom + panX
      const screenY = y * zoom + panY
      const screenRadius = hexRadius * zoom

      if (
        screenX < -screenRadius ||
        screenX > rect.width + screenRadius ||
        screenY < -screenRadius ||
        screenY > rect.height + screenRadius
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

    ctx.restore()
  }, [hexes, selectedHex, focusedHexIndex, config, zoom, panX, panY, drawHex])

  // Auto-fit: Calculate bounds and center the hexes after they're rendered
  useEffect(() => {
    if (!hexes.length || !canvasRef.current) {
      return
    }

    // Create a unique identifier for this hex set including fullscreen state
    const hexSetId =
      hexes
        .map(h => `${h.q},${h.r}`)
        .sort()
        .join('|') + `|fullscreen:${isFullscreen}`

    // Skip if we've already auto-fitted this hex set in this state
    if (autoFitAppliedRef.current === hexSetId) {
      return
    }

    // Use double requestAnimationFrame to ensure canvas is rendered with final dimensions
    // First frame: wait for React to update DOM
    let frameId2: number | null = null
    const frameId1 = requestAnimationFrame(() => {
      // Second frame: ensure canvas has final dimensions
      frameId2 = requestAnimationFrame(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          // Canvas not ready yet, reset flag to retry on next render
          autoFitAppliedRef.current = ''
          return
        }

        const canvasWidth = rect.width
        const canvasHeight = rect.height
        const hexRadius = config?.hexRadius || getHexRadius()

        // Calculate bounds of all hexes
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity

        hexes.forEach(hex => {
          const pixel = hexToPixel(hex, hexRadius)
          minX = Math.min(minX, pixel.x)
          maxX = Math.max(maxX, pixel.x)
          minY = Math.min(minY, pixel.y)
          maxY = Math.max(maxY, pixel.y)
        })

        const hexWidth = maxX - minX
        const hexHeight = maxY - minY
        const centerHexX = (minX + maxX) / 2
        const centerHexY = (minY + maxY) / 2

        // Calculate zoom to fit with minimal padding
        const padding = 20
        const scaleX = (canvasWidth - padding * 2) / Math.max(hexWidth, 1)
        const scaleY = (canvasHeight - padding * 2) / Math.max(hexHeight, 1)
        const initialZoom = Math.min(scaleX, scaleY, 2) // Allow zooming in up to 2x to fill canvas

        // Center the hexes
        const initialPanX = canvasWidth / 2 - centerHexX * initialZoom
        const initialPanY = canvasHeight / 2 - centerHexY * initialZoom

        setZoom(initialZoom)
        setPanX(initialPanX)
        setPanY(initialPanY)
        initialPanRef.current = { x: initialPanX, y: initialPanY }

        // Mark this hex set as auto-fitted
        autoFitAppliedRef.current = hexSetId
      })
    })

    return () => {
      cancelAnimationFrame(frameId1)
      if (frameId2 !== null) {
        cancelAnimationFrame(frameId2)
      }
    }
  }, [hexes, config, isFullscreen])

  // Handle window resize - trigger re-render with zoom/pan
  useEffect(() => {
    const handleResize = () => {
      // Force re-render by updating zoom slightly (triggers canvas redraw)
      // The actual rendering will use current zoom/pan values
      if (canvasRef.current && hexes.length) {
        // Just trigger a re-render by setting zoom to itself
        setZoom(prev => prev)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [hexes.length])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newFullscreenState = !!document.fullscreenElement
      setIsFullscreen(newFullscreenState)
      // Reset auto-fit flag so it recalculates for the new canvas size
      autoFitAppliedRef.current = ''
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const drawHex = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      hex: HexData<T>,
      isSelected: boolean,
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
    },
    [colorPalette, themes],
  )

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // Zoom towards mouse position
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor))

      // Adjust pan to zoom towards mouse position
      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - panX) * zoomRatio
      const newPanY = mouseY - (mouseY - panY) * zoomRatio

      setZoom(newZoom)
      setPanX(newPanX)
      setPanY(newPanY)
    },
    [zoom, panX, panY],
  )

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return // Only left mouse button
      event.preventDefault()
      isDraggingRef.current = true
      // Store the initial mouse position relative to current pan
      dragStartRef.current = {
        x: event.clientX - panX,
        y: event.clientY - panY,
      }
    },
    [panX, panY],
  )

  // Handle mouse move for panning (global to continue panning outside canvas)
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return
      event.preventDefault()
      setPanX(event.clientX - dragStartRef.current.x)
      setPanY(event.clientY - dragStartRef.current.y)
    }

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  // Handle mouse move for panning
  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    event.preventDefault()
    setPanX(event.clientX - dragStartRef.current.x)
    setPanY(event.clientY - dragStartRef.current.y)
  }, [])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      // Don't trigger click if we were dragging
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        return
      }

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      // Convert screen coordinates to world coordinates
      const worldX = (event.clientX - rect.left - panX) / zoom
      const worldY = (event.clientY - rect.top - panY) / zoom
      const hexRadius = config?.hexRadius || getHexRadius()
      const centerX = 0
      const centerY = 0

      let foundHex: HexData<T> | null = null
      let foundIndex = -1

      for (let i = 0; i < hexes.length; i++) {
        const hex = hexes[i]
        const pixel = hexToPixel(hex, hexRadius)
        const hexX = centerX + pixel.x
        const hexY = centerY + pixel.y
        const distance = Math.sqrt((worldX - hexX) ** 2 + (worldY - hexY) ** 2)

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
    [hexes, config, onHexClick, zoom, panX, panY],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
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
    [hexes, focusedHexIndex, onHexClick],
  )

  if (loading) {
    return <HiveShimmer className={className} />
  }

  if (placementError) {
    console.error('Placement error:', placementError)
    return (
      <div
        className={cn('h-[calc(100vh-312px)] flex items-center justify-center', className)}
        role="alert"
      >
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to compute positions</p>
          <p className="text-sm text-muted-foreground">{placementError}</p>
        </div>
      </div>
    )
  }

  // Handle empty arrays gracefully with informative messages
  if (themes.length === 0 || embeddings.size === 0) {
    return (
      <div className={cn('h-[calc(100vh-312px)] flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            {themes.length === 0 && embeddings.size === 0
              ? 'No themes or embeddings provided'
              : themes.length === 0
                ? 'No themes provided'
                : 'No embeddings provided'}
          </p>
          <p className="text-sm text-muted-foreground">
            {themes.length === 0 && embeddings.size === 0
              ? 'Please provide themes and embeddings to visualize stories.'
              : themes.length === 0
                ? 'Please provide themes to group stories.'
                : 'Please provide embeddings to visualize stories.'}
          </p>
        </div>
      </div>
    )
  }

  if (!hexes.length) {
    return (
      <div className={cn('h-[calc(100vh-312px)] flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Computing positions...</p>
          <p className="text-sm text-muted-foreground">
            Processing {stories.length} {stories.length === 1 ? 'story' : 'stories'}...
          </p>
        </div>
      </div>
    )
  }

  // Full-screen handlers
  const handleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  // Keyboard navigation container intentionally focusable for arrow-key support
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Living Hive visualization"
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            'w-full border rounded-xl cursor-move focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary bg-gray-900',
            isFullscreen ? 'h-screen' : 'h-[calc(100vh-312px)]',
          )}
          style={{
            touchAction: 'none',
            borderColor: 'rgba(245, 245, 240, 0.2)',
          }}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          aria-label="Interactive hex grid visualization (scroll to zoom, drag to pan)"
          tabIndex={-1}
        />
        {/* Full-screen button */}
        <button
          onClick={handleFullscreen}
          className="absolute top-2 right-2 z-10 p-2 rounded-lg backdrop-blur-sm transition-colors"
          style={{
            backgroundColor: 'rgba(58, 58, 58, 0.8)',
            color: '#F5F5F0',
            border: '1px solid rgba(245, 245, 240, 0.2)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(58, 58, 58, 0.95)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(58, 58, 58, 0.8)'
          }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Dialog for selected hex - fixed on right side */}
      {selectedHex && (
        <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <DialogContent
            showOverlay={dialogConfig?.showOverlay === true}
            className={cn(
              // Override default centered positioning
              '!left-auto !right-0 !translate-x-0 !bottom-auto',
              // Base positioning - fixed on right side of viewport, full height
              'fixed right-0 top-0 bottom-0 h-screen z-50',
              // Default width and styling
              dialogConfig?.width || 'w-[32rem] max-w-[90vw]',
              // Position variants
              dialogConfig?.position === 'left' && '!left-0 !right-auto',
              dialogConfig?.position === 'top' && '!top-0 !bottom-auto !right-0 !left-auto h-auto',
              dialogConfig?.position === 'bottom' &&
                '!bottom-0 !top-auto !right-0 !left-auto h-auto',
              // Charcoal theme styling - slightly lighter than background
              'backdrop-blur-md',
              'border-l border-r-0 border-t-0 border-b-0',
              dialogConfig?.position === 'left' && 'border-l-0 border-r',
              dialogConfig?.position === 'top' && 'border-l-0 border-r-0 border-t border-b-0',
              dialogConfig?.position === 'bottom' && 'border-l-0 border-r-0 border-t-0 border-b',
              'rounded-none shadow-2xl',
              dialogConfig?.position === 'top' && 'rounded-b-xl',
              dialogConfig?.position === 'bottom' && 'rounded-t-xl',
              dialogConfig?.position === 'left' && 'rounded-r-xl',
              // Animation - slide in from right
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
              dialogConfig?.position === 'left' &&
                'data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full',
              dialogConfig?.position === 'top' &&
                'data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full',
              dialogConfig?.position === 'bottom' &&
                'data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full',
              'overflow-y-auto p-6 flex flex-col items-start',
              dialogConfig?.className,
            )}
            style={{
              backgroundColor: '#3a3a3a', // Slightly lighter charcoal than background (#2d2d2d)
              color: '#F5F5F0', // Warm off-white
              borderColor: 'rgba(245, 245, 240, 0.2)', // Subtle warm off-white border
              height: '100vh', // Always full height
            }}
            onOpenAutoFocus={e => e.preventDefault()}
            onInteractOutside={e => {
              // Prevent closing when clicking on canvas
              const target = e.target as HTMLElement
              if (target.closest('canvas')) {
                e.preventDefault()
              }
            }}
          >
            <DialogHeader className="flex-shrink-0">
              {selectedHex.theme && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full border flex-shrink-0"
                    style={{
                      backgroundColor: getThemeColor(selectedHex.theme.id, themes, colorPalette),
                      borderColor: 'rgba(245, 245, 240, 0.3)',
                    }}
                    aria-label={`Theme: ${selectedHex.theme.label}`}
                  />
                  <DialogTitle className="text-xl font-semibold" style={{ color: '#F5F5F0' }}>
                    {selectedHex.theme.label}
                  </DialogTitle>
                </div>
              )}
            </DialogHeader>
            <div
              className="text-base leading-relaxed pt-2 flex-shrink-0"
              style={{ color: '#F5F5F0', opacity: 0.95 }}
            >
              {renderStory ? (
                renderStory(selectedHex.story)
              ) : (
                <p className="whitespace-pre-wrap">{selectedHex.story.text}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Legend */}
      <div
        className="absolute bottom-4 right-4 backdrop-blur-sm rounded-lg px-3 py-2 text-sm z-10"
        style={{
          backgroundColor: 'rgba(58, 58, 58, 0.8)',
          border: '1px solid rgba(245, 245, 240, 0.2)',
          color: '#F5F5F0',
        }}
      >
        <div className="flex items-center gap-4">
          <span style={{ opacity: 0.9 }}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </span>
          <span style={{ opacity: 0.9 }}>
            {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
          </span>
        </div>
      </div>
    </div>
  )
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}
