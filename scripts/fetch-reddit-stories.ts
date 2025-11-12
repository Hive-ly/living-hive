import {writeFile} from "fs/promises";
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

interface RedditPost {
  data: {
    id: string;
    selftext: string;
    title: string;
    over_18: boolean;
    removed_by_category: string | null;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

// Fetch stories from Reddit
async function fetchRedditStories(
  subreddit: string = "work",
  limit: number = 100
): Promise<string[]> {
  const stories: string[] = [];
  let after: string | null = null;
  const perPage = 25;
  const pagesNeeded = Math.ceil(limit / perPage);

  console.log(`Fetching stories from r/${subreddit}...`);

  for (let page = 0; page < pagesNeeded; page++) {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${perPage}${
      after ? `&after=${after}` : ""
    }`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "LivingHive-StoryFetcher/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data: RedditResponse = await response.json();

      data.data.children.forEach((post) => {
        const text = post.data.selftext || post.data.title;
        // Filter out removed/deleted posts, NSFW, and very short posts
        if (
          text &&
          text.length >= 50 &&
          text.length <= 2000 &&
          !post.data.over_18 &&
          !post.data.removed_by_category &&
          !text.toLowerCase().includes("[removed]") &&
          !text.toLowerCase().includes("[deleted]")
        ) {
          stories.push(text);
        }
      });

      after = data.data.after;
      console.log(`Fetched page ${page + 1}, total stories: ${stories.length}`);

      // Rate limiting: wait between requests
      if (page < pagesNeeded - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!after) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching page ${page + 1}:`, error);
      break;
    }
  }

  return stories.slice(0, limit);
}

// Sanitize story using OpenAI with retry logic
async function sanitizeStory(
  text: string,
  apiKey: string,
  retries: number = 3
): Promise<string | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  'You are a helpful assistant that cleans workplace stories. Remove NSFW content, personal identifiers (names, emails, specific company names), and URLs. Keep the core message intact. Return only the cleaned story text, nothing else. If the story cannot be cleaned appropriately, return "SKIP".',
              },
              {
                role: "user",
                content: `Clean and sanitize this workplace story:\n\n${text}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * 1000;
        console.log(
          `Rate limited. Waiting ${waitTime / 1000}s before retry ${
            attempt + 1
          }/${retries}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const cleaned = data.choices[0].message.content.trim();

      if (cleaned === "SKIP" || cleaned.length < 50) {
        return null;
      }

      return cleaned;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("Request timeout after 30s");
      } else {
        console.error(
          `Error sanitizing story (attempt ${attempt + 1}/${retries}):`,
          error.message || error
        );
      }

      // If this was the last attempt, return null
      if (attempt === retries - 1) {
        return null;
      }

      // Exponential backoff for other errors
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return null;
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
    // Fetch stories from Reddit
    const rawStories = await fetchRedditStories("work", 150); // Fetch extra to account for filtering
    console.log(`\nFetched ${rawStories.length} raw stories from Reddit`);

    // Sanitize stories with OpenAI
    console.log("\nSanitizing stories with OpenAI...");
    const sanitizedStories: BaseStory[] = [];
    const batchSize = 5; // Reduced batch size to avoid rate limits

    for (let i = 0; i < rawStories.length; i += batchSize) {
      const batch = rawStories.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(rawStories.length / batchSize);
      console.log(
        `Sanitizing batch ${batchNum}/${totalBatches} (${batch.length} stories)...`
      );

      // Process stories sequentially within batch to avoid overwhelming the API
      for (let j = 0; j < batch.length; j++) {
        const story = batch[j];
        const cleaned = await sanitizeStory(story, apiKey);
        if (cleaned) {
          sanitizedStories.push({
            id: `reddit-${i + j + 1}`,
            text: cleaned,
          });
          console.log(
            `  ✓ Story ${i + j + 1} sanitized (${
              sanitizedStories.length
            } total)`
          );
        } else {
          console.log(`  ✗ Story ${i + j + 1} skipped or failed`);
        }

        // Small delay between individual requests to avoid rate limits
        if (j < batch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Longer delay between batches
      if (i + batchSize < rawStories.length) {
        console.log(`  Waiting 2s before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`\nSuccessfully sanitized ${sanitizedStories.length} stories`);

    // Filter to ~100 stories
    const finalStories = sanitizedStories.slice(0, 100);

    // Write to sampleStories.json
    const outputPath = join(
      __dirname,
      "../examples/src/data/sampleStories.json"
    );
    await writeFile(outputPath, JSON.stringify(finalStories, null, 2), "utf-8");

    console.log(
      `\n✅ Successfully saved ${finalStories.length} stories to ${outputPath}`
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
