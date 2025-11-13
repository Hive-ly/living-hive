# Living Hive React

A React library for visualizing interconnected stories using UMAP dimensionality reduction and interactive hex grid layouts.

## Features

- 🎨 Interactive hex grid visualization with zoom and pan
- 🤖 OpenAI integration for story embeddings and theme generation
- 🎯 Automatic theme extraction from stories
- 🎨 Customizable color palettes (defaults to warm palette)
- ♿ Full keyboard navigation and accessibility support
- ⚡ Web worker-based UMAP computation for smooth performance
- 🎭 Customizable story rendering
- 🔄 Support for both client-side and server-side embedding generation
- 💾 Pre-generated embeddings and themes support for faster loading
- 🚀 Optimized batch API calls with retry logic and rate limiting
- 📊 Theme legend with story counts

## Installation

```bash
npm install @living-hive/react
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react react-dom tailwindcss class-variance-authority clsx tailwind-merge
```

**Note**: `@radix-ui/react-popover` is bundled with the library and does not need to be installed separately.

## Quick Start

### Basic Usage

You need to generate embeddings and themes before passing them to the `LivingHive` component. Here's how:

```tsx
import { LivingHive, StoryDataGenerator } from '@living-hive/react'
import { useState, useEffect } from 'react'

function App() {
  const stories = [
    { id: '1', text: 'My first story about teamwork...' },
    { id: '2', text: 'Another story about collaboration...' },
  ]

  const [embeddings, setEmbeddings] = useState<Map<string, number[]>>(new Map())
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const generateData = async () => {
      setLoading(true)
      const generator = new StoryDataGenerator(stories, 'your-api-key-here')
      
      const embeddings = await generator.generateEmbeddings()
      const themes = await generator.generateThemes(embeddings)
      
      setEmbeddings(embeddings)
      setThemes(themes)
      setLoading(false)
    }
    generateData()
  }, [stories])

  return (
    <LivingHive
      stories={stories}
      embeddings={embeddings}
      themes={themes}
      loading={loading}
    />
  )
}
```

### With Pre-generated Embeddings and Themes

For faster loading and to avoid API calls, you can pre-generate embeddings and themes:

```tsx
import { LivingHive } from '@living-hive/react'

// Pre-generated embeddings (Map<storyId, embedding>)
const embeddings = new Map([
  ['1', [0.1, 0.2, ...]], // 384-dimensional vector
  ['2', [0.3, 0.4, ...]],
])

// Pre-generated themes
const themes = [
  { id: 'theme-1', label: 'Teamwork' },
  { id: 'theme-2', label: 'Collaboration' },
]

function App() {
  return (
    <LivingHive
      stories={stories}
      embeddings={embeddings}
      themes={themes}
    />
  )
}
```

**Note**: When using pre-generated embeddings and themes, no API calls are made. This is ideal for deployed examples or when you want to avoid API costs.

### With Custom Themes

```tsx
import { LivingHive, StoryDataGenerator, type Theme } from '@living-hive/react'
import { useState, useEffect } from 'react'

function App() {
  const [embeddings, setEmbeddings] = useState<Map<string, number[]>>(new Map())
  const themes: Theme[] = [
    { id: 'teamwork', label: 'Teamwork' },
    { id: 'collaboration', label: 'Collaboration' },
  ]

  useEffect(() => {
    const generator = new StoryDataGenerator(stories, 'your-api-key-here')
    generator.generateEmbeddings().then(setEmbeddings)
  }, [stories])

  return (
    <LivingHive
      stories={stories}
      embeddings={embeddings}
      themes={themes}
    />
  )
}
```

### With Custom Color Palette

```tsx
const customPalette = ['#FF6E7F', '#4F81B0', '#CDB15E', '#DAA5AD', '#AEBEC5']

<LivingHive
  stories={stories}
  openaiApiKey="your-api-key-here"
  colorPalette={customPalette}
/>
```

### With Custom Story Rendering

```tsx
<LivingHive
  stories={stories}
  openaiApiKey="your-api-key-here"
  renderStory={(story) => (
    <div>
      <h3>{story.title}</h3>
      <p>{story.text}</p>
      {story.metadata && <span>{story.metadata}</span>}
    </div>
  )}
/>
```

### With Extended Story Types

```tsx
interface MyStory extends BaseStory {
  title: string
  author: string
  date: string
}

const stories: MyStory[] = [
  {
    id: '1',
    text: 'Story content...',
    title: 'My Story',
    author: 'John Doe',
    date: '2024-01-01',
  },
]

<LivingHive<MyStory>
  stories={stories}
  openaiApiKey="your-api-key-here"
  renderStory={(story) => (
    <div>
      <h3>{story.title}</h3>
      <p>{story.text}</p>
      <small>By {story.author} on {story.date}</small>
    </div>
  )}
/>
```

## Generating Embeddings and Themes

The library provides helper functions and a class-based API for generating embeddings and themes. These can be used client-side, server-side, or in build scripts.

### Using StoryDataGenerator Class (Recommended)

The `StoryDataGenerator` class stores stories and API key once, making it easy to generate embeddings and themes:

```tsx
import { StoryDataGenerator } from '@living-hive/react'

// Create generator with stories and API key
const generator = new StoryDataGenerator(stories, apiKey)

// Generate embeddings
const embeddings = await generator.generateEmbeddings({
  model: 'text-embedding-3-small',
  dimensions: 384,
  batchSize: 100
})

// Generate themes using the embeddings
const themes = await generator.generateThemes(embeddings, {
  model: 'gpt-4-turbo-preview',
  minThemes: 5,
  maxThemes: 10
})

// Assign stories to themes (synchronous)
const assignments = generator.assignStoriesToThemes(embeddings, themes)
```

### Using Helper Functions

You can also use the standalone helper functions:

```tsx
import { 
  generateEmbeddingsForStories, 
  generateThemesForStories,
  assignStoriesToThemes 
} from '@living-hive/react'

// Generate embeddings
const embeddings = await generateEmbeddingsForStories(stories, apiKey, {
  model: 'text-embedding-3-small',
  dimensions: 384
})

// Generate themes
const themes = await generateThemesForStories(stories, embeddings, apiKey, {
  minThemes: 5,
  maxThemes: 10
})

// Assign stories to themes
const assignments = assignStoriesToThemes(stories, embeddings, themes)
```

### Client-Side Usage (React)

```tsx
import { StoryDataGenerator } from '@living-hive/react'
import { useState, useEffect } from 'react'

function MyComponent() {
  const [embeddings, setEmbeddings] = useState<Map<string, number[]>>(new Map())
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const generateData = async () => {
      setLoading(true)
      try {
        const generator = new StoryDataGenerator(stories, apiKey)
        const embeddings = await generator.generateEmbeddings()
        const themes = await generator.generateThemes(embeddings)
        setEmbeddings(embeddings)
        setThemes(themes)
      } finally {
        setLoading(false)
      }
    }
    generateData()
  }, [stories])

  return (
    <LivingHive
      stories={stories}
      embeddings={embeddings}
      themes={themes}
      loading={loading}
    />
  )
}
```

### Server-Side Usage (API Routes)

```tsx
// In Next.js API route or similar
import { StoryDataGenerator } from '@living-hive/react'

export async function GET(request: Request) {
  const stories = await getStories()
  const generator = new StoryDataGenerator(stories, process.env.OPENAI_API_KEY)
  
  const embeddings = await generator.generateEmbeddings()
  const themes = await generator.generateThemes(embeddings)
  
  return Response.json({ embeddings, themes })
}
```

### Script Usage (Pre-computation)

```tsx
// In build script or pre-computation script
import { StoryDataGenerator } from '@living-hive/react'
import fs from 'fs'

const stories = [...]
const generator = new StoryDataGenerator(stories, process.env.OPENAI_API_KEY)

const embeddings = await generator.generateEmbeddings({
  model: 'text-embedding-3-small',
  dimensions: 384,
  batchSize: 100
})

const themes = await generator.generateThemes(embeddings, {
  model: 'gpt-4-turbo-preview',
  minThemes: 5,
  maxThemes: 10
})

// Save to JSON files for use in component
fs.writeFileSync('embeddings.json', JSON.stringify(Object.fromEntries(embeddings)))
fs.writeFileSync('themes.json', JSON.stringify(themes))
```

### OpenAI Parameter Configuration

Both the class and helper functions accept configuration options:

**Embedding Options:**
- `model?: string` - Embedding model (default: `"text-embedding-3-small"`)
- `dimensions?: number` - Embedding dimensions (default: `384`)
- `batchSize?: number` - Batch size for API calls (default: `100`)
- `apiEndpoint?: string` - Server endpoint URL (for server-side usage)
- `onError?: (error: Error) => void` - Error callback

**Theme Options:**
- `model?: string` - Theme generation model (default: `"gpt-4-turbo-preview"`)
- `minThemes?: number` - Minimum number of themes (default: `5`)
- `maxThemes?: number` - Maximum number of themes (default: `10`)
- `apiEndpoint?: string` - Server endpoint URL (for server-side usage)

### Zoom and Pan

The visualization supports interactive zoom and pan:

- **Scroll wheel**: Zoom in/out (towards mouse cursor)
- **Click and drag**: Pan around the visualization
- **Auto-fit**: Automatically centers and zooms to fit all hexes on initial load

The canvas has a visible background and border to show the visualization boundaries.

## API Reference

### `LivingHive` Component

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `stories` | `Story<T>[]` | Yes | - | Array of stories to visualize |
| `embeddings` | `Map<string, number[]>` | Yes | - | Pre-generated embeddings (Map of storyId to embedding vector). Can be empty Map if not yet loaded. |
| `themes` | `Theme[]` | Yes | - | Pre-generated themes. Can be empty array if not yet loaded. |
| `loading` | `boolean` | No | - | Loading state to show shimmer while data is being fetched |
| `openaiApiKey` | `string` | No | - | Not used by component (only needed for helper functions) |
| `colorPalette` | `string[]` | No | Warm palette | Array of hex color strings |
| `onHexClick` | `(story, theme) => void` | No | - | Callback when a hex is clicked |
| `renderStory` | `(story) => ReactNode` | No | Default renderer | Custom story renderer for dialog |
| `onError` | `(error) => void` | No | - | Error handler callback |
| `onThemesChange` | `(themes) => void` | No | - | Callback when themes are updated |
| `onAssignmentsChange` | `(assignments) => void` | No | - | Callback when story-to-theme assignments change |
| `className` | `string` | No | - | Additional CSS classes |
| `config` | `Partial<PlacementConfig>` | No | - | Canvas/hex configuration |
| `dialogConfig` | `DialogConfig` | No | - | Dialog configuration options |

#### Types

```typescript
interface BaseStory {
  id: string
  text: string
}

interface Theme {
  id: string
  label: string
}

interface PlacementConfig {
  canvasWidth: number
  canvasHeight: number
  hexRadius: number
  margin: number
}
```

### StoryDataGenerator Class

```typescript
const generator = new StoryDataGenerator<T extends BaseStory>(
  stories: T[],
  apiKey: string
)

// Methods:
await generator.generateEmbeddings(options?: GenerateEmbeddingsOptions): Promise<Map<string, number[]>>
await generator.generateThemes(embeddings: Map<string, number[]>, options?: GenerateThemesOptions): Promise<Theme[]>
generator.assignStoriesToThemes(embeddings: Map<string, number[]>, themes: Theme[]): Map<string, string>
```

### Helper Functions

```typescript
// Generate embeddings
await generateEmbeddingsForStories<T>(
  stories: T[],
  apiKey: string,
  options?: GenerateEmbeddingsOptions
): Promise<Map<string, number[]>>

// Generate themes
await generateThemesForStories<T>(
  stories: T[],
  embeddings: Map<string, number[]>,
  apiKey: string,
  options?: GenerateThemesOptions
): Promise<Theme[]>

// Assign stories to themes
assignStoriesToThemes<T>(
  stories: T[],
  embeddings: Map<string, number[]>,
  themes: Theme[]
): Map<string, string>
```

### Hooks

Hooks are available for React components but are not required. The component now requires embeddings and themes as props.

#### `useEmbeddings`

```typescript
const { generateEmbeddingsForStories, loading, error } = useEmbeddings(onError)
// generateEmbeddingsForStories now accepts options?: GenerateEmbeddingsOptions
```

#### `useThemes`

```typescript
const { generateThemesFromStories, assignStories, loading, error } = useThemes()
// generateThemesFromStories now accepts options?: GenerateThemesOptions
```

#### `useUMAPPlacement`

```typescript
const { computePlacement, loading, error } = useUMAPPlacement()
```

## Interaction

### Keyboard Navigation

- **Arrow Keys**: Navigate between hexes
- **Enter/Space**: Open dialog for focused hex
- **Escape**: Close dialog and clear selection

### Mouse Controls

- **Scroll Wheel**: Zoom in/out (towards cursor position)
- **Click and Drag**: Pan around the visualization
- **Click Hex**: Open dialog with story details

## Accessibility

The component includes:
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Error Handling

Errors can be handled in two ways:

1. **Callback**: Use the `onError` prop for error handling integration (e.g., Sentry)
2. **Try/Catch**: Errors are also thrown and can be caught in try/catch blocks

```tsx
<LivingHive
  stories={stories}
  openaiApiKey="your-api-key"
  onError={(error) => {
    // Send to error tracking service
    Sentry.captureException(error)
  }}
/>
```

## Server-Side Setup

For server-side embedding generation, create an API endpoint that accepts:

```json
{
  "text": "Story text here"
}
```

And returns:

```json
{
  "embedding": [0.1, 0.2, ...]
}
```

**Note**: If you're using server-side embeddings (`apiEndpoint`), you can also provide a server-side theme generation endpoint. The library will automatically call `{apiEndpoint.replace('/embeddings', '/themes')}` for theme generation if using server-side mode.

Example Netlify Function:

```typescript
import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  const { text } = JSON.parse(event.body || '{}')
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: 384,
    }),
  })
  
  const data = await response.json()
  
  return {
    statusCode: 200,
    body: JSON.stringify({ embedding: data.data[0].embedding }),
  }
}
```

## Development Scripts

The project includes several utility scripts:

```bash
# Fetch stories from Reddit and sanitize with OpenAI
npm run fetch-stories

# Generate embeddings for sample stories (saves to mockEmbeddings.json)
npm run regenerate-embeddings

# Generate themes for sample stories (saves to mockThemes.json)
npm run regenerate-themes
```

These scripts require an OpenAI API key in `.env.local`:

```bash
VITE_OPENAI_API_KEY=sk-your-key-here
VITE_USE_MOCK_EMBEDDINGS=false  # Set to "true" to use pre-generated data
```

## Examples

See the `examples/` directory for a complete working example:

- **Basic Example**: Features stories from r/work Reddit, theme legend, zoom/pan controls, and support for pre-generated embeddings/themes

To run the example:

```bash
# Install dependencies (from project root)
npm install

# Set up environment variables (see .env.local.example)
cp .env.local.example .env.local
# Edit .env.local and add your OpenAI API key

# Run the example app
npm run dev
```

The examples app will start at `http://localhost:5173`.

### Using Mock Mode (No API Calls)

To use pre-generated embeddings and themes:

1. Generate the data once:
   ```bash
   npm run fetch-stories      # Fetch and sanitize stories
   npm run regenerate-embeddings  # Generate embeddings
   npm run regenerate-themes      # Generate themes
   ```

2. Set environment variable:
   ```bash
   VITE_USE_MOCK_EMBEDDINGS=true
   ```

3. Run the app - no API calls will be made!

## Deployment to Netlify

The examples directory includes a `netlify.toml` configuration file. To deploy:

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Set build command: `npm install && npm run build:examples`
4. Set publish directory: `examples/dist`

## Default Color Palette

The default warm color palette includes:
- `#4F81B0` - Blue
- `#AEBEC5` - Light Gray
- `#DAA5AD` - Pink
- `#FF6E7F` - Coral
- `#CDB15E` - Gold

## Performance Considerations

- UMAP computation runs in a web worker to avoid blocking the UI
- Embeddings use batch API calls (up to 100 stories per request) for efficiency
- Built-in caching prevents duplicate embedding generation
- Retry logic with exponential backoff handles rate limiting gracefully
- Pre-generated embeddings/themes eliminate API calls entirely
- Canvas rendering is optimized for smooth interactions
- Zoom and pan are hardware-accelerated

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
