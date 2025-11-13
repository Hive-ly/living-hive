import type {BaseStory, Theme, GenerateEmbeddingsOptions, GenerateThemesOptions} from "../types";
import {generateEmbeddings} from "./embeddings";
import {generateThemes, assignStoriesToThemes} from "./themes";

/**
 * Generate embeddings for a list of stories.
 * 
 * This function can be used client-side, server-side, or in build scripts.
 * 
 * @param stories - Array of stories to generate embeddings for
 * @param apiKey - OpenAI API key (required for OpenAI API calls)
 * @param options - Optional configuration for embedding generation
 * @returns Promise resolving to a Map of story ID to embedding vector
 * 
 * @example
 * ```typescript
 * // Client-side usage
 * const embeddings = await generateEmbeddingsForStories(stories, apiKey, {
 *   model: 'text-embedding-3-small',
 *   dimensions: 384,
 *   batchSize: 100
 * })
 * 
 * // Server-side usage
 * const embeddings = await generateEmbeddingsForStories(stories, apiKey, {
 *   apiEndpoint: 'https://your-api.com/embeddings'
 * })
 * ```
 */
export async function generateEmbeddingsForStories<T extends BaseStory>(
  stories: T[],
  apiKey: string,
  options?: GenerateEmbeddingsOptions
): Promise<Map<string, number[]>> {
  return generateEmbeddings(stories, apiKey, options);
}

/**
 * Generate themes from a list of stories and their embeddings.
 * 
 * This function can be used client-side, server-side, or in build scripts.
 * 
 * @param stories - Array of stories to generate themes for
 * @param embeddings - Map of story ID to embedding vector (from generateEmbeddingsForStories)
 * @param apiKey - OpenAI API key (required for OpenAI API calls)
 * @param options - Optional configuration for theme generation
 * @returns Promise resolving to an array of Theme objects
 * 
 * @example
 * ```typescript
 * // Client-side usage
 * const themes = await generateThemesForStories(stories, embeddings, apiKey, {
 *   model: 'gpt-4-turbo-preview',
 *   minThemes: 5,
 *   maxThemes: 10
 * })
 * 
 * // Server-side usage
 * const themes = await generateThemesForStories(stories, embeddings, apiKey, {
 *   apiEndpoint: 'https://your-api.com/themes'
 * })
 * ```
 */
export async function generateThemesForStories<T extends BaseStory>(
  stories: T[],
  embeddings: Map<string, number[]>,
  apiKey: string,
  options?: GenerateThemesOptions
): Promise<Theme[]> {
  return generateThemes(stories, apiKey, options);
}

// Re-export assignStoriesToThemes from themes.ts for convenience
export {assignStoriesToThemes} from "./themes";

/**
 * A class for generating embeddings and themes for stories.
 * 
 * This class stores stories and API key once, allowing you to generate
 * embeddings and themes without passing them repeatedly.
 * 
 * @example
 * ```typescript
 * // Create generator with stories and API key
 * const generator = new StoryDataGenerator(stories, apiKey);
 * 
 * // Generate embeddings
 * const embeddings = await generator.generateEmbeddings({
 *   model: 'text-embedding-3-small',
 *   dimensions: 384
 * });
 * 
 * // Generate themes using the embeddings
 * const themes = await generator.generateThemes(embeddings, {
 *   minThemes: 5,
 *   maxThemes: 10
 * });
 * 
 * // Assign stories to themes
 * const assignments = generator.assignStoriesToThemes(embeddings, themes);
 * ```
 */
export class StoryDataGenerator<T extends BaseStory = BaseStory> {
  constructor(
    private readonly stories: T[],
    private readonly apiKey: string
  ) {}

  /**
   * Generate embeddings for the stories.
   * 
   * @param options - Optional configuration for embedding generation
   * @returns Promise resolving to a Map of story ID to embedding vector
   */
  async generateEmbeddings(
    options?: GenerateEmbeddingsOptions
  ): Promise<Map<string, number[]>> {
    return generateEmbeddings(this.stories, this.apiKey, options);
  }

  /**
   * Generate themes from embeddings.
   * 
   * @param embeddings - Map of story ID to embedding vector (from generateEmbeddings)
   * @param options - Optional configuration for theme generation
   * @returns Promise resolving to an array of Theme objects
   */
  async generateThemes(
    embeddings: Map<string, number[]>,
    options?: GenerateThemesOptions
  ): Promise<Theme[]> {
    return generateThemes(this.stories, this.apiKey, options);
  }

  /**
   * Assign stories to themes based on embedding similarity.
   * 
   * This is a synchronous operation that uses k-means clustering.
   * 
   * @param embeddings - Map of story ID to embedding vector
   * @param themes - Array of themes to assign stories to
   * @returns Map of story ID to theme ID
   */
  assignStoriesToThemes(
    embeddings: Map<string, number[]>,
    themes: Theme[]
  ): Map<string, string> {
    return assignStoriesToThemes(this.stories, embeddings, themes);
  }
}

