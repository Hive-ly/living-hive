# Living Hive React

A React library for visualizing interconnected stories using UMAP dimensionality reduction and interactive hex grid layouts.

## Features

- 🎨 Interactive hex grid visualization
- 🤖 OpenAI integration for story embeddings
- 🎯 Automatic theme extraction from stories
- 🎨 Customizable color palettes (defaults to warm palette)
- ♿ Full keyboard navigation and accessibility support
- ⚡ Web worker-based UMAP computation for smooth performance
- 🎭 Customizable story rendering
- 🔄 Support for both client-side and server-side embedding generation

## Installation

```bash
npm install @living-hive/react
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react react-dom tailwindcss class-variance-authority clsx tailwind-merge @radix-ui/react-popover
```

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

## API Reference

### `LivingHive` Component

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `stories` | `Story<T>[]` | Yes | - | Array of stories to visualize |
| `openaiApiKey` | `string` | Yes* | - | OpenAI API key (required if `apiEndpoint` not provided) |
| `themes` | `Theme[]` | No | Auto-generated | Predefined themes/clusters |
| `colorPalette` | `string[]` | No | Warm palette | Array of hex color strings |
| `apiEndpoint` | `string` | No | - | Server endpoint for embedding generation |
| `onHexClick` | `(story, theme) => void` | No | - | Callback when a hex is clicked |
| `renderStory` | `(story) => ReactNode` | No | Default renderer | Custom story renderer for popover |
| `onError` | `(error) => void` | No | - | Error handler callback |
| `className` | `string` | No | - | Additional CSS classes |
| `config` | `Partial<PlacementConfig>` | No | - | Canvas/hex configuration |

\* `openaiApiKey` is required unless `apiEndpoint` is provided.

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

## Keyboard Navigation

- **Arrow Keys**: Navigate between hexes
- **Enter/Space**: Open popover for focused hex
- **Escape**: Close popover and clear selection

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

## Examples

See the `examples/` directory for complete working examples:

- **Basic Example**: Simple usage with auto-generated themes
- **With Themes**: Using predefined themes
- **Server-Side**: Using a server endpoint for embeddings

To run the examples:

```bash
cd examples
npm install
npm run dev
```

## Deployment to Netlify

The examples directory includes a `netlify.toml` configuration file. To deploy:

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Set build command: `cd examples && npm install && npm run build`
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
- Embeddings are generated sequentially (consider server-side for large batches)
- Canvas rendering is optimized for smooth interactions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
