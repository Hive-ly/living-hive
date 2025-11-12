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

```tsx
import { LivingHive } from '@living-hive/react'

function App() {
  const stories = [
    { id: '1', text: 'My first story about teamwork...' },
    { id: '2', text: 'Another story about collaboration...' },
  ]

  return (
    <LivingHive
      stories={stories}
      openaiApiKey="your-api-key-here"
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
      openaiApiKey="" // Not needed when using pre-generated data
      embeddings={embeddings}
      themes={themes}
    />
  )
}
```

**Note**: When using pre-generated embeddings and themes, no API calls are made. This is ideal for deployed examples or when you want to avoid API costs.

### With Custom Themes

```tsx
import { LivingHive, type Theme } from '@living-hive/react'

const themes: Theme[] = [
  { id: 'teamwork', label: 'Teamwork' },
  { id: 'collaboration', label: 'Collaboration' },
]

function App() {
  return (
    <LivingHive
      stories={stories}
      openaiApiKey="your-api-key-here"
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

### Server-Side Embedding Generation

```tsx
<LivingHive
  stories={stories}
  openaiApiKey="" // Not used when apiEndpoint is provided
  apiEndpoint="https://your-api.com/embeddings"
/>
```

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
| `openaiApiKey` | `string` | Yes* | - | OpenAI API key (required if `apiEndpoint` not provided or when generating themes) |
| `themes` | `Theme[]` | No | Auto-generated | Predefined themes/clusters |
| `colorPalette` | `string[]` | No | Warm palette | Array of hex color strings |
| `apiEndpoint` | `string` | No | - | Server endpoint for embedding generation |
| `embeddings` | `Map<string, number[]>` | No | - | Pre-generated embeddings (Map of storyId to embedding vector) |
| `onHexClick` | `(story, theme) => void` | No | - | Callback when a hex is clicked |
| `renderStory` | `(story) => ReactNode` | No | Default renderer | Custom story renderer for dialog |
| `onError` | `(error) => void` | No | - | Error handler callback |
| `onThemesChange` | `(themes) => void` | No | - | Callback when themes are generated/updated |
| `onAssignmentsChange` | `(assignments) => void` | No | - | Callback when story-to-theme assignments change |
| `className` | `string` | No | - | Additional CSS classes |
| `config` | `Partial<PlacementConfig>` | No | - | Canvas/hex configuration |

\* `openaiApiKey` is required unless `apiEndpoint` is provided, or when using pre-generated `embeddings` and `themes`.

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

### Hooks

#### `useEmbeddings`

```typescript
const { generateEmbeddingsForStories, loading, error } = useEmbeddings(onError)
```

#### `useThemes`

```typescript
const { generateThemesFromStories, assignStories, loading, error } = useThemes()
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
