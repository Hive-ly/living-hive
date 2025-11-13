// Base story type - consumers can extend this with custom metadata
export interface BaseStory {
  id: string
  text: string
}

// Generic story type allowing consumers to extend with custom metadata
export type Story<T extends BaseStory = BaseStory> = T

// Theme/cluster type
export interface Theme {
  id: string
  label: string
}

// Hex grid coordinate system (axial coordinates)
export interface HexCoordinate {
  q: number
  r: number
}

// Pixel coordinate system
export interface PixelCoordinate {
  x: number
  y: number
}

// Story with embedding for UMAP computation
export interface StoryWithEmbedding {
  id: string
  text: string
  embedding: number[]
  cluster_id?: string
}

// Color palette type
export type ColorPalette = string[]

// Placement configuration
export interface PlacementConfig {
  canvasWidth: number
  canvasHeight: number
  hexRadius: number
  margin: number
}

// Dialog configuration
export interface DialogConfig {
  position?: 'right' | 'left' | 'top' | 'bottom'
  width?: string
  maxHeight?: string
  className?: string
  showOverlay?: boolean
}

// Embedding mode
export type EmbeddingMode = 'client' | 'server'

// Configuration options for generating embeddings
export interface GenerateEmbeddingsOptions {
  model?: string
  dimensions?: number
  batchSize?: number
  apiEndpoint?: string
  onError?: (error: Error) => void
}

// Configuration options for generating themes
export interface GenerateThemesOptions {
  model?: string
  minThemes?: number
  maxThemes?: number
  apiEndpoint?: string
}

// Component props interface
export interface LivingHiveProps<T extends BaseStory = BaseStory> {
  stories: Story<T>[]
  embeddings: Map<string, number[]>
  themes: Theme[]
  openaiApiKey?: string
  colorPalette?: ColorPalette
  apiEndpoint?: string
  loading?: boolean
  onHexClick?: (story: Story<T>, theme: Theme | null) => void
  renderStory?: (story: Story<T>) => React.ReactNode
  onError?: (error: Error) => void
  onThemesChange?: (themes: Theme[]) => void
  onAssignmentsChange?: (assignments: Map<string, string>) => void
  className?: string
  config?: Partial<PlacementConfig>
  dialogConfig?: DialogConfig
  canvasWidth?: number | string
  canvasHeight?: number | string
  workerUrl?: string
  throwIfMissingWorker?: boolean
}

// UMAP normalization parameters
export interface UMAPNormalization {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

// Placement result
export interface PlacementResult {
  placements: Map<string, HexCoordinate>
  umapCoords?: Array<{ id: string; x: number; y: number }>
}
