import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {toast} from "sonner";
import {LivingHive} from "@living-hive/react";
import type {BaseStory, Theme} from "@living-hive/react";
import mockEmbeddingsData from "../data/mockEmbeddings.json";
import sampleStoriesData from "../data/sampleStories.json";
import mockThemesData from "../data/mockThemes.json";

// Fallback stories if sampleStories.json doesn't exist or is empty
const fallbackStories: BaseStory[] = [
  {
    id: "1",
    text: "I had a great experience working with my team today. We collaborated effectively and achieved our goals.",
  },
  {
    id: "2",
    text: "My colleagues were incredibly supportive when I was struggling with a difficult project. They offered help and shared resources.",
  },
];

// Theme Legend Component
function ThemeLegend({
  themes,
  storyAssignments,
  stories,
  colorPalette,
}: {
  themes: Theme[];
  storyAssignments: Map<string, string>;
  stories: BaseStory[];
  colorPalette: string[];
}) {
  // Memoize theme counts and sorted themes to prevent recalculation on every render
  const {themeCounts, sortedThemes} = React.useMemo(() => {
    const counts = new Map<string, number>();
    themes.forEach((theme) => {
      counts.set(theme.id, 0);
    });
    stories.forEach((story) => {
      const themeId = storyAssignments.get(story.id);
      if (themeId) {
        counts.set(themeId, (counts.get(themeId) || 0) + 1);
      }
    });

    // Sort themes by story count (descending - most stories first)
    const sorted = [...themes].sort((a, b) => {
      const countA = counts.get(a.id) || 0;
      const countB = counts.get(b.id) || 0;
      return countB - countA; // Descending order
    });

    return {themeCounts: counts, sortedThemes: sorted};
  }, [themes, storyAssignments, stories]);

  const getThemeColor = (themeId: string): string => {
    const themeIndex = themes.findIndex((t) => t.id === themeId);
    if (themeIndex === -1) return colorPalette[0];
    return colorPalette[themeIndex % colorPalette.length];
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl font-semibold text-white">
          Story Themes
        </h3>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </div>
      <div className="space-y-2">
        {sortedThemes.map((theme) => {
          const count = themeCounts.get(theme.id) || 0;
          const color = getThemeColor(theme.id);
          return (
            <div
              key={theme.id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{backgroundColor: color}}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm">
                    {theme.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {count} {count === 1 ? "story" : "stories"}
                  </div>
                </div>
              </div>
              <div className="bg-gray-800/70 text-gray-200 text-xs font-semibold px-2.5 py-1 rounded-md">
                {count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Stories:</span>
          <span className="text-white font-medium">{stories.length}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-400">Active Clusters:</span>
          <span className="text-white font-medium">{themes.length}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-300">How it works:</strong> Stories are
          grouped by similar themes and workplace issues.
        </p>
      </div>
    </div>
  );
}

export function BasicExample() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const useMockEmbeddings = import.meta.env.VITE_USE_MOCK_EMBEDDINGS === "true";

  // All hooks must be called before any conditional returns
  const [mockEmbeddings, setMockEmbeddings] = useState<
    Map<string, number[]> | undefined
  >(undefined);
  const [mockThemes, setMockThemes] = useState<Theme[] | undefined>(undefined);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [storyAssignments, setStoryAssignments] = useState<Map<string, string>>(
    new Map()
  );

  // Callbacks to track themes and assignments - use refs to prevent duplicate updates
  const themesRef = useRef<Theme[]>([]);
  const assignmentsRef = useRef<Map<string, string>>(new Map());

  const handleThemesChange = useCallback((generatedThemes: Theme[]) => {
    // Only update if themes actually changed
    const themesChanged =
      generatedThemes.length !== themesRef.current.length ||
      generatedThemes.some(
        (t, i) =>
          !themesRef.current[i] ||
          t.id !== themesRef.current[i].id ||
          t.label !== themesRef.current[i].label
      );

    if (themesChanged) {
      themesRef.current = generatedThemes;
      setThemes(generatedThemes);
    }
  }, []);

  const handleAssignmentsChange = useCallback(
    (assignments: Map<string, string>) => {
      // Only update if assignments actually changed
      const assignmentsChanged =
        assignments.size !== assignmentsRef.current.size ||
        Array.from(assignments.entries()).some(
          ([id, themeId]) => assignmentsRef.current.get(id) !== themeId
        );

      if (assignmentsChanged) {
        assignmentsRef.current = assignments;
        setStoryAssignments(assignments);
      }
    },
    []
  );

  // Debug: log API key status (first few chars only)
  useEffect(() => {
    if (apiKey) {
      console.log("API key found:", apiKey.substring(0, 10) + "...");
    } else {
      console.warn("No API key found in environment");
    }
  }, [apiKey]);

  // Convert JSON objects to Maps/Arrays when using mock embeddings
  useEffect(() => {
    if (useMockEmbeddings) {
      // Load mock embeddings
      const embeddingsMap = new Map<string, number[]>();
      Object.entries(mockEmbeddingsData as Record<string, number[]>).forEach(
        ([id, embedding]) => {
          embeddingsMap.set(id, embedding);
        }
      );
      setMockEmbeddings(embeddingsMap);

      // Load mock themes (if available)
      if (Array.isArray(mockThemesData) && mockThemesData.length > 0) {
        setMockThemes(mockThemesData as Theme[]);
        console.log(`✅ Loaded ${mockThemesData.length} pre-generated themes`);
      } else {
        console.warn(
          "⚠️ No pre-generated themes found. Run 'npm run regenerate-themes' to generate them."
        );
      }
    }
  }, [useMockEmbeddings]);

  // Load stories from sampleStories.json, fallback to hardcoded if not available
  const sampleStories: BaseStory[] =
    Array.isArray(sampleStoriesData) && sampleStoriesData.length > 0
      ? (sampleStoriesData as BaseStory[])
      : fallbackStories;

  // If using mock embeddings, API key is not required
  if (!useMockEmbeddings && !apiKey) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
        <p className="text-gray-600 mb-4">
          Please set VITE_OPENAI_API_KEY in your .env.local file to see the
          visualization.
        </p>
        <p className="text-sm text-gray-500">
          Create a .env.local file in the root directory with:
          VITE_OPENAI_API_KEY=sk-your-key-here
        </p>
      </div>
    );
  }

  // Wait for mock embeddings to load
  if (useMockEmbeddings && !mockEmbeddings) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
        <p className="text-gray-600 mb-4">Loading mock embeddings...</p>
      </div>
    );
  }

  // Dark mode color palette
  const darkColorPalette = [
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#3B82F6", // Blue
    "#F59E0B", // Amber
    "#A855F7", // Light Purple
    "#EF4444", // Red
    "#10B981", // Green
    "#EC4899", // Pink
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Hero Section */}
      <div className="border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Living Hive
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed mb-6">
              Explore workplace stories from{" "}
              <a
                href="https://www.reddit.com/r/work"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                r/work
              </a>{" "}
              visualized as an interactive hive. Each hexagon represents a
              story, grouped by similar themes and workplace issues.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
              <span className="px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-800">
                {sampleStories.length} stories
              </span>
              {useMockEmbeddings && (
                <span className="px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-800">
                  Pre-computed embeddings
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 shadow-2xl">
              <LivingHive
                stories={sampleStories}
                openaiApiKey={useMockEmbeddings ? "" : apiKey || ""}
                embeddings={useMockEmbeddings ? mockEmbeddings : undefined}
                themes={
                  useMockEmbeddings && mockThemes ? mockThemes : undefined
                }
                colorPalette={darkColorPalette}
                onThemesChange={handleThemesChange}
                onAssignmentsChange={handleAssignmentsChange}
                onError={(error) => {
                  console.error("Error in LivingHive:", error);
                  // Only show toast for critical errors, not theme fallbacks
                  if (
                    !error.message.includes("fallback") &&
                    !error.message.includes("Failed to generate themes")
                  ) {
                    toast.error("Failed to process stories", {
                      description: error.message,
                      duration: 5000,
                    });
                  }
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            {themes.length > 0 && storyAssignments.size > 0 && (
              <ThemeLegend
                themes={themes}
                storyAssignments={storyAssignments}
                stories={sampleStories}
                colorPalette={darkColorPalette}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
