import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { config } from 'dotenv'
import { resolve } from 'path'
import { StoryDataGenerator } from '../src/data/StoryDataGenerator.js'

// Load .env.local file from root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')
config({ path: join(rootDir, '.env.local') })

interface BaseStory {
  id: string
  text: string
}

async function main() {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('Error: VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Read stories from sampleStories.json (will be created by fetch-reddit-stories script)
    // For now, fallback to BasicExample stories
    const storiesPath = join(__dirname, '../examples/src/data/sampleStories.json')
    let stories: BaseStory[] = []

    try {
      const storiesContent = await readFile(storiesPath, 'utf-8')
      stories = JSON.parse(storiesContent)
      console.log(`Loaded ${stories.length} stories from sampleStories.json`)
    } catch (error) {
      // Fallback: read from BasicExample.tsx
      console.log('sampleStories.json not found, reading from BasicExample.tsx...')
      const basicExamplePath = join(__dirname, '../examples/src/examples/BasicExample.tsx')
      const basicExampleContent = await readFile(basicExamplePath, 'utf-8')

      // Extract stories from BasicExample.tsx
      const storyMatches = basicExampleContent.matchAll(/id:\s*"([^"]+)",\s*text:\s*"([^"]+)"/g)
      for (const match of storyMatches) {
        stories.push({ id: match[1], text: match[2] })
      }
      console.log(`Extracted ${stories.length} stories from BasicExample.tsx`)
    }

    if (stories.length === 0) {
      console.error('Error: No stories found')
      process.exit(1)
    }

    console.log(`Generating embeddings for ${stories.length} stories...`)

    const generator = new StoryDataGenerator(stories, apiKey)
    const embeddingsMap = await generator.generateEmbeddings()
    const embeddings = Object.fromEntries(embeddingsMap)

    // Write to mockEmbeddings.json
    const outputPath = join(__dirname, '../examples/src/data/mockEmbeddings.json')
    await writeFile(outputPath, JSON.stringify(embeddings, null, 2), 'utf-8')

    console.log(`\n✅ Successfully generated embeddings and saved to ${outputPath}`)
    console.log(`   Generated ${Object.keys(embeddings).length} embeddings`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
