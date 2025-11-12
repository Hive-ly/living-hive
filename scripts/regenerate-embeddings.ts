import {readFile, writeFile} from "fs/promises";
import {join} from "path";
import {fileURLToPath} from "url";
import {dirname} from "path";
import {config} from "dotenv";
import {resolve} from "path";

// Load .env.local file from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
config({path: join(rootDir, ".env.local")});

interface BaseStory {
  id: string;
  text: string;
}

// Generate embedding using OpenAI API
async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
      dimensions: 384,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Generate embeddings for all stories
async function generateEmbeddingsForStories(
  stories: BaseStory[],
  apiKey: string
): Promise<Record<string, number[]>> {
  const embeddings: Record<string, number[]> = {};
  const concurrencyLimit = 10;

  console.log(`Generating embeddings for ${stories.length} stories...`);

  // Process in batches to avoid rate limiting
  for (let i = 0; i < stories.length; i += concurrencyLimit) {
    const batch = stories.slice(i, i + concurrencyLimit);
    console.log(
      `Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(
        stories.length / concurrencyLimit
      )}...`
    );

    const batchPromises = batch.map(async (story) => {
      try {
        const embedding = await generateEmbedding(story.text, apiKey);
        return {id: story.id, embedding};
      } catch (error) {
        console.error(
          `Error generating embedding for story ${story.id}:`,
          error
        );
        return null;
      }
    });

    const results = await Promise.all(batchPromises);

    results.forEach((result) => {
      if (result) {
        embeddings[result.id] = result.embedding;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + concurrencyLimit < stories.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `Successfully generated ${Object.keys(embeddings).length} embeddings`
  );
  return embeddings;
}

async function main() {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variable is required"
    );
    process.exit(1);
  }

  try {
    // Read stories from sampleStories.json (will be created by fetch-reddit-stories script)
    // For now, fallback to BasicExample stories
    const storiesPath = join(
      __dirname,
      "../examples/src/data/sampleStories.json"
    );
    let stories: BaseStory[] = [];

    try {
      const storiesContent = await readFile(storiesPath, "utf-8");
      stories = JSON.parse(storiesContent);
      console.log(`Loaded ${stories.length} stories from sampleStories.json`);
    } catch (error) {
      // Fallback: read from BasicExample.tsx
      console.log(
        "sampleStories.json not found, reading from BasicExample.tsx..."
      );
      const basicExamplePath = join(
        __dirname,
        "../examples/src/examples/BasicExample.tsx"
      );
      const basicExampleContent = await readFile(basicExamplePath, "utf-8");

      // Extract stories from BasicExample.tsx
      const storyMatches = basicExampleContent.matchAll(
        /id:\s*"([^"]+)",\s*text:\s*"([^"]+)"/g
      );
      for (const match of storyMatches) {
        stories.push({id: match[1], text: match[2]});
      }
      console.log(`Extracted ${stories.length} stories from BasicExample.tsx`);
    }

    if (stories.length === 0) {
      console.error("Error: No stories found");
      process.exit(1);
    }

    // Generate embeddings
    const embeddings = await generateEmbeddingsForStories(stories, apiKey);

    // Write to mockEmbeddings.json
    const outputPath = join(
      __dirname,
      "../examples/src/data/mockEmbeddings.json"
    );
    await writeFile(outputPath, JSON.stringify(embeddings, null, 2), "utf-8");

    console.log(
      `\n✅ Successfully generated embeddings and saved to ${outputPath}`
    );
    console.log(`   Generated ${Object.keys(embeddings).length} embeddings`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
