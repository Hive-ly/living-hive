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
npm install @hively/living-hive
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react react-dom tailwindcss class-variance-authority clsx tailwind-merge
```

**Note**: `@radix-ui/react-popover` is bundled with the library and does not need to be installed separately.

## Quick Start

### Basic Usage

You need to generate embeddings and themes before passing them to the `LivingHive` component. Living Hive does not include network helpers in the public API, so you can source embeddings and themes from your own data pipeline or reuse the mock data shipped in `examples/`.

```tsx
import { LivingHive, DEFAULT_WORKER_URL, type BaseStory, type Theme } from '@hively/living-hive'
import { useMemo, useState } from 'react'

function App() {
  const stories = [
    { id: '1', text: 'My first story about teamwork...' },
    { id: '2', text: 'Another story about collaboration...' },
  ]

  // Provide embeddings and themes from your own data pipeline.
  const [embeddings] = useState(
    () =>
      new Map<string, number[]>([
        ['1', [0.1, 0.2, 0.3]],
        ['2', [0.3, 0.1, 0.4]],
      ]),
  )
  const [themes] = useState<Theme[]>([
    { id: 'teamwork', label: 'Teamwork' },
    { id: 'collaboration', label: 'Collaboration' },
  ])

  return (
    <LivingHive
      stories={stories}
      embeddings={embeddings}
      themes={themes}
      workerUrl={DEFAULT_WORKER_URL}
    />
  )
}
```

### With Pre-generated Embeddings and Themes

For faster loading and to avoid API calls, you can pre-generate embeddings and themes:

```tsx
import { LivingHive, type BaseStory, type Theme } from '@hively/living-hive'

const stories: BaseStory[] = [
  { id: '1', text: 'Story about teamwork' },
  { id: '2', text: 'Story about collaboration' },
]

const embeddings = new Map<string, number[]>(
  stories.map((story, index) => [story.id, [index / 10, index / 5, index / 2]]),
)

const themes: Theme[] = [
  { id: 'teamwork', label: 'Teamwork' },
  { id: 'collaboration', label: 'Collaboration' },
]

export function App() {
  return <LivingHive stories={stories} embeddings={embeddings} themes={themes} />
}
```

**Note**: When using pre-generated embeddings and themes, no API calls are made. This is ideal for deployed examples or when you want to avoid API costs.

### Configuring the UMAP worker asset

The UMAP algorithm runs in a standalone worker that ships with the package at `dist/workers/umap-worker.js`. 

**Recommended approach (works with any bundler):**

Pass the worker URL explicitly using your bundler's worker import syntax:

**Vite:**
```tsx
import { LivingHive } from '@hively/living-hive'
// Option 1: Use the source worker path (recommended for Vite)
import workerUrl from '@hively/living-hive/workers/umap-placement.worker?worker&url'

// Option 2: Use the built worker file directly
// import workerUrl from '@hively/living-hive/workers/umap-worker.js?worker&url'

<LivingHive 
  stories={stories} 
  embeddings={embeddings} 
  themes={themes}
  workerUrl={workerUrl}
/>
```

**Note:** The library's package.json exports support both `umap-placement.worker` and `umap-worker.js` paths. Vite's `?worker&url` query string will work with either.

**Webpack 5+ (native worker support):**
```tsx
import { LivingHive } from '@hively/living-hive'
import Worker from '@hively/living-hive/workers/umap-placement.worker?worker'

// Create worker URL using the Worker constructor
const workerUrl = new URL(Worker, import.meta.url).href

<LivingHive 
  stories={stories} 
  embeddings={embeddings} 
  themes={themes}
  workerUrl={workerUrl}
/>
```

**Webpack 4 or older (with worker-loader):**
```tsx
import { LivingHive } from '@hively/living-hive'
// Configure worker-loader in your webpack config

<LivingHive 
  stories={stories} 
  embeddings={embeddings} 
  themes={themes}
  workerUrl={require('@hively/living-hive/workers/umap-worker.js')}
/>
```

**Manual setup (copy worker to public directory):**

If your bundler doesn't support worker imports, you can manually copy the worker file:

1. Copy `node_modules/@hively/living-hive/dist/workers/umap-worker.js` to your `public/workers/` directory
2. Pass the URL:

```tsx
<LivingHive 
  stories={stories} 
  embeddings={embeddings} 
  themes={themes}
  workerUrl="/workers/umap-worker.js"
/>
```

**Automatic resolution (fallback):**

If you don't provide `workerUrl`, the library will attempt to auto-resolve it using `import.meta.url`. This may work with some modern bundlers, but results vary. **It's recommended to pass `workerUrl` explicitly** for reliable behavior across all bundlers.

**Environment variables (alternative):**

You can also set the worker URL via environment variables that your bundler exposes:
- `VITE_LIVING_HIVE_WORKER_URL` (Vite)
- `NEXT_PUBLIC_LIVING_HIVE_WORKER_URL` (Next.js)
- `LIVING_HIVE_WORKER_URL` (generic)

### With Custom Themes

```tsx
import { LivingHive, StoryDataGenerator, type Theme } from '@hively/living-hive'
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

  return <LivingHive stories={stories} embeddings={embeddings} themes={themes} />
}
```

### With Custom Color Palette

```tsx
const customPalette = ['#FF6E7F', '#4F81B0', '#CDB15E', '#DAA5AD', '#AEBEC5']

// Assuming `stories`, `embeddings`, and `themes` are defined as in the basic example
<LivingHive
  stories={stories}
  embeddings={embeddings}
  themes={themes}
  colorPalette={customPalette}
/>
```

### With Custom Story Rendering

```tsx
<LivingHive
  stories={stories}
  embeddings={embeddings}
  themes={themes}
  renderStory={story => (
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

const embeddings = new Map<string, number[]>([['1', [0.1, 0.2, 0.3]]])

const themes: Theme[] = [{ id: 'teamwork', label: 'Teamwork' }]

<LivingHive<MyStory>
  stories={stories}
  embeddings={embeddings}
  themes={themes}
  renderStory={(story) => (
    <div>
      <h3>{story.title}</h3>
      <p>{story.text}</p>
      <small>By {story.author} on {story.date}</small>
    </div>
  )}
/>
```

## Understanding Embeddings and Themes

Embeddings are numerical vectors that capture the meaning of each story. Living Hive typically generates them with OpenAI's `text-embedding-3-small` model, which converts every story's text into a fixed-length array of numbers. Stories that discuss similar ideas end up with vectors that are close together in multidimensional space. The visualization uses those distances to place related stories near one another when UMAP projects the vectors down to the hex grid.

Themes are concise narrative labels that explain why clusters of stories belong together. After embeddings are computed, Living Hive prompts a language model (defaults to `gpt-4-turbo-preview`) to summarize the clusters and produce human-readable theme names. You can think of themes as the legend for the map: they describe the neighborhoods formed by the embeddings and act as the connective tissue between the qualitative stories and the quantitative placement.

Both embeddings and themes can be generated anywhere—client, server, or build scripts—and then shipped with your app. The component simply needs a `Map` of story IDs to embedding vectors plus an array of theme objects; how you produce them is up to your data pipeline.

## Custom Styling

`LivingHive` ships with a set of CSS custom properties so you can restyle the experience without forking the component. The library injects the styles automatically; opt into the default charcoal palette by wrapping the component in the provided `.living-hive-theme` class:

```tsx
export function App() {
  return (
    <div className="living-hive-theme">
      <LivingHive stories={stories} embeddings={embeddings} themes={themes} />
    </div>
  )
}
```

Override any variable by scoping new values to your own class or element:

```css
.my-product-hive {
  --living-hive-canvas-background: #ffffff;
  --living-hive-canvas-outline: rgba(28, 28, 28, 0.12);
  --living-hive-toggle-bg: rgba(255, 255, 255, 0.85);
  --living-hive-legend-background: rgba(28, 28, 28, 0.85);
  --living-hive-dialog-color: #1c1c1c;
}
```

```tsx
<div className="my-product-hive">
  <LivingHive stories={stories} embeddings={embeddings} themes={themes} canvasHeight={480} />
</div>
```

Available variables include:

| Variable                                                                                                                          | Purpose                                       |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `--living-hive-width`                                                                                                             | Canvas width (default `100%`)                 |
| `--living-hive-height`                                                                                                            | Canvas height (default `calc(100vh - 312px)`) |
| `--living-hive-canvas-background`                                                                                                 | Canvas background color shown behind hexes    |
| `--living-hive-canvas-outline`                                                                                                    | Canvas border color                           |
| `--living-hive-canvas-border-radius`                                                                                              | Canvas corner radius                          |
| `--living-hive-focus-ring` / `--living-hive-focus-ring-offset`                                                                    | Focus ring colors for keyboard users          |
| `--living-hive-toggle-bg` / `--living-hive-toggle-bg-hover` / `--living-hive-toggle-color` / `--living-hive-toggle-border`        | Fullscreen toggle palette                     |
| `--living-hive-dialog-background` / `--living-hive-dialog-color` / `--living-hive-dialog-border` / `--living-hive-dialog-radius`  | Story dialog surface styling                  |
| `--living-hive-popover-background` / `--living-hive-popover-color` / `--living-hive-popover-border` / `--living-hive-popover-radius` / `--living-hive-popover-shadow` | Popover component styling                     |
| `--living-hive-legend-background` / `--living-hive-legend-border` / `--living-hive-legend-color` / `--living-hive-legend-opacity` | Legend chip visuals                           |

You can also supply explicit dimensions via the new `canvasWidth` and `canvasHeight` props. Numbers are treated as pixel values (e.g. `canvasHeight={480}`), while strings accept any CSS length (e.g. `canvasHeight="70vh"`). When these props are omitted, the component falls back to the CSS custom properties so host applications can manage sizing through styles alone.

### Using the Popover Component

The library exports a customizable `Popover` component built on Radix UI. It uses living-hive theme variables by default, but can be customized via props or CSS variables.

**Basic Usage:**

```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@hively/living-hive'

function MyComponent() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button>Open Popover</button>
      </PopoverTrigger>
      <PopoverContent>
        <p>Popover content here</p>
      </PopoverContent>
    </Popover>
  )
}
```

**Customization Options:**

The `PopoverContent` component accepts several customization props:

```tsx
<PopoverContent
  // Use living-hive theme (default: true)
  useLivingHiveTheme={true}
  // Custom className for additional styling
  className="w-96"
  // Standard Radix UI props
  align="start"
  sideOffset={8}
  side="top"
>
  <p>Custom styled popover</p>
</PopoverContent>
```

**Customizing with CSS Variables:**

Override the popover styling using CSS variables:

```css
.my-custom-popover {
  --living-hive-popover-background: #ffffff;
  --living-hive-popover-color: #1a1a1a;
  --living-hive-popover-border: rgba(0, 0, 0, 0.1);
  --living-hive-popover-radius: 0.75rem;
  --living-hive-popover-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

**Using Tailwind Classes Instead:**

If you prefer to use Tailwind's `bg-popover` and `text-popover-foreground` classes (requires Tailwind config setup), set `useLivingHiveTheme={false}`:

```tsx
<PopoverContent useLivingHiveTheme={false} className="bg-popover text-popover-foreground">
  <p>Uses Tailwind popover classes</p>
</PopoverContent>
```

## Generating Embeddings and Themes

Living Hive ships with the `StoryDataGenerator` class for producing embeddings and themes. Use it client-side, server-side, or in build scripts—whichever best fits your data pipeline.

### Using StoryDataGenerator

The `StoryDataGenerator` class stores stories and API key once, making it easy to generate embeddings and themes:

```tsx
import { StoryDataGenerator } from '@hively/living-hive'

// Create generator with stories and API key
const generator = new StoryDataGenerator(stories, apiKey)

// Generate embeddings
const embeddings = await generator.generateEmbeddings({
  model: 'text-embedding-3-small',
  dimensions: 384,
  batchSize: 100,
})

// Generate themes using the embeddings
const themes = await generator.generateThemes(embeddings, {
  model: 'gpt-4-turbo-preview',
  minThemes: 5,
  maxThemes: 10,
})

// Assign stories to themes (synchronous)
const assignments = generator.assignStoriesToThemes(embeddings, themes)
```

### Client-Side Usage (React)

```tsx
import { StoryDataGenerator } from '@hively/living-hive'
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

  return <LivingHive stories={stories} embeddings={embeddings} themes={themes} loading={loading} />
}
```

### Server-Side Usage (API Routes)

```tsx
// In Next.js API route or similar
import { StoryDataGenerator } from '@hively/living-hive'

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
import { StoryDataGenerator } from '@hively/living-hive'
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

`StoryDataGenerator` accepts configuration options for both embeddings and themes:

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

| Prop                   | Type                       | Required | Default                                  | Description                                                                                        |
| ---------------------- | -------------------------- | -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `stories`              | `Story<T>[]`               | Yes      | -                                        | Array of stories to visualize                                                                      |
| `embeddings`           | `Map<string, number[]>`    | Yes      | -                                        | Pre-generated embeddings (Map of storyId to embedding vector). Can be empty Map if not yet loaded. |
| `themes`               | `Theme[]`                  | Yes      | -                                        | Pre-generated themes. Can be empty array if not yet loaded.                                        |
| `loading`              | `boolean`                  | No       | -                                        | Loading state to show shimmer while data is being fetched                                          |
| `openaiApiKey`         | `string`                   | No       | -                                        | Not used by component (only needed when using helper utilities like `StoryDataGenerator`)          |
| `apiEndpoint`          | `string`                   | No       | -                                        | Custom endpoint used by helper utilities in server-side mode                                       |
| `colorPalette`         | `string[]`                 | No       | Warm palette                             | Array of hex color strings                                                                         |
| `onHexClick`           | `(story, theme) => void`   | No       | -                                        | Callback when a hex is clicked                                                                     |
| `renderStory`          | `(story) => ReactNode`     | No       | Default renderer                         | Custom story renderer for dialog                                                                   |
| `onError`              | `(error) => void`          | No       | -                                        | Error handler callback                                                                             |
| `onThemesChange`       | `(themes) => void`         | No       | -                                        | Callback when themes are updated                                                                   |
| `onAssignmentsChange`  | `(assignments) => void`    | No       | -                                        | Callback when story-to-theme assignments change                                                    |
| `className`            | `string`                   | No       | -                                        | Additional CSS classes                                                                             |
| `canvasWidth`          | `number \| string`         | No       | `100%`                                   | Optional canvas width. Numbers are treated as pixel values; strings can be any CSS length.         |
| `canvasHeight`         | `number \| string`         | No       | `calc(100vh - 312px)`                    | Optional canvas height. Numbers are treated as pixel values; strings can be any CSS length.        |
| `config`               | `Partial<PlacementConfig>` | No       | -                                        | Canvas/hex configuration (used as internal defaults for placement math).                           |
| `dialogConfig`         | `DialogConfig`             | No       | -                                        | Dialog configuration options                                                                       |
| `workerUrl`            | `string`                   | No       | `prop → env → "/workers/umap-worker.js"` | URL that resolves to the compiled UMAP worker asset.                                               |
| `throwIfMissingWorker` | `boolean`                  | No       | `true`                                   | When `false`, the component surfaces worker issues via `error` state instead of throwing.          |

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
await generator.generateThemes(embeddings?: Map<string, number[]>, options?: GenerateThemesOptions): Promise<Theme[]>
generator.assignStoriesToThemes(embeddings?: Map<string, number[]>, themes?: Theme[]): Map<string, string>
```

### `useUMAPPlacement` Hook

If you prefer a hook for computing coordinates inside your own components, `useUMAPPlacement` remains available. It accepts the same `workerUrl` and `throwIfMissingWorker` options as the component and falls back to the environment variables / default URL when no prop is supplied:

```typescript
import { useUMAPPlacement, DEFAULT_WORKER_URL } from '@hively/living-hive'

const { computePlacement, loading, error } = useUMAPPlacement({
  workerUrl: DEFAULT_WORKER_URL,
  throwIfMissingWorker: false,
})
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
  embeddings={embeddings}
  themes={themes}
  onError={error => {
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

export const handler: Handler = async event => {
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

### Building the package

```bash
# Compile the worker asset and library bundles
npm run build

# Or run each step individually
npm run build:worker
npm run build:library
```

### Quality and Testing

Run these commands before opening a pull request:

```bash
# Static analysis
npm run lint
npm run format:check
npm run type-check

# Unit tests
npm test
```

### Data Utilities

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

Contributions are welcome! See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for detailed guidelines on
development workflow, testing, and pull request expectations.
