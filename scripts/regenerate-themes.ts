import {readFile, writeFile} from "fs/promises";
import {join} from "path";
import {fileURLToPath} from "url";
import {dirname} from "path";
import {config} from "dotenv";
import {resolve} from "path";
import {generateThemes} from "../src/utils/themes.js";
import type {BaseStory, Theme} from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Load environment variables
config({path: join(rootDir, ".env.local")});

async function regenerateThemes() {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variable is required"
    );
    process.exit(1);
  }

  try {
    // Read stories
    const storiesPath = join(rootDir, "examples/src/data/sampleStories.json");
    const storiesData = await readFile(storiesPath, "utf-8");
    const stories: BaseStory[] = JSON.parse(storiesData);

    console.log(`📚 Loaded ${stories.length} stories`);

    // Generate themes
    console.log("🎨 Generating themes...");
    const themes = await generateThemes(stories, apiKey);

    console.log(
      `✅ Generated ${themes.length} themes:`,
      themes.map((t) => t.label)
    );

    // Save themes to JSON file
    const themesPath = join(rootDir, "examples/src/data/mockThemes.json");
    await writeFile(themesPath, JSON.stringify(themes, null, 2), "utf-8");

    console.log(`💾 Saved themes to ${themesPath}`);
  } catch (error) {
    console.error("Error generating themes:", error);
    process.exit(1);
  }
}

regenerateThemes();
