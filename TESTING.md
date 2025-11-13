# Testing Guide

This guide will help you test the Living Hive library.

## Quick Start - Test the Example App

The easiest way to test the library is through the example app:

### 1. Install Dependencies

Install dependencies from the project root:

```bash
npm install
```

### 2. Run the Example App

```bash
npm run dev
```

This will start a development server (usually at `http://localhost:5173`).

### 3. Test the Examples

The example app includes a comprehensive example:

- **Basic Example**: Features stories from r/work Reddit, theme legend, zoom/pan controls, and support for both dynamic and pre-generated embeddings/themes

### 4. Set Up OpenAI API Key

To test the client-side embedding generation, you'll need an OpenAI API key:

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)
4. Create a `.env.local` file in the project root:
   ```bash
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```

**Note**: Keep your API key secure! Never commit `.env.local` to version control. The `.env.local.example` file shows the required format.

### Using Mock Mode (No API Calls)

To test without making API calls:

1. Generate pre-computed data:

   ```bash
   npm run fetch-stories          # Fetch stories from Reddit
   npm run regenerate-embeddings  # Generate embeddings
   npm run regenerate-themes      # Generate themes
   ```

2. Set environment variable:

   ```bash
   VITE_USE_MOCK_EMBEDDINGS=true
   ```

3. Run the app - it will use pre-generated data with no API calls!

## Testing the Library Build

To test that the library builds correctly:

### 1. Build the Library

```bash
npm run build
```

This will:

- Type-check the code
- Build the library in both ESM and UMD formats
- Generate TypeScript definitions

### 2. Type Check Only

```bash
npm run type-check
```

## Testing in Your Own Project

### Option 1: Link the Package Locally

1. Build the library:

   ```bash
   npm run build
   ```

2. Link it (from the library root):

   ```bash
   npm link
   ```

3. In your test project:
   ```bash
   npm link @living-hive/react
   ```

### Option 2: Use Workspace (if using pnpm/yarn workspaces)

If your project uses workspaces, you can add:

```json
{
  "dependencies": {
    "@living-hive/react": "workspace:*"
  }
}
```

### Option 3: Install from Local Path

In your test project's `package.json`:

```json
{
  "dependencies": {
    "@living-hive/react": "file:../living-hive"
  }
}
```

Then run `npm install`.

## Example Usage in Your Test Project

```tsx
import { LivingHive } from '@living-hive/react'
import '@living-hive/react/dist/style.css' // If you include styles

function App() {
  const stories = [
    { id: '1', text: 'My first story...' },
    { id: '2', text: 'Another story...' },
  ]

  return (
    <LivingHive
      stories={stories}
      openaiApiKey="your-api-key-here"
      onError={error => console.error('Error:', error)}
    />
  )
}
```

## Troubleshooting

### "Module not found" errors

Make sure you've installed all peer dependencies:

```bash
npm install react react-dom tailwindcss class-variance-authority clsx tailwind-merge
```

**Note**: `@radix-ui/react-popover` is bundled with the library and does not need to be installed separately.

### Tailwind CSS not working

Make sure you have Tailwind configured in your project. The library uses Tailwind classes but doesn't bundle Tailwind itself.

### Web Worker errors

The UMAP computation runs in a web worker. Make sure your build tool supports web workers (Vite does by default).

### TypeScript errors

Run `npm run type-check` to verify types are correct.

## Next Steps

- Check out the examples in `examples/src/examples/`
- Read the full README.md for API documentation
- Customize colors, themes, and story rendering
- Deploy the example app to Netlify using the included `netlify.toml`
