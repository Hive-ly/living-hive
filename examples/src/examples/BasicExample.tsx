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

  // Get warm off-white and charcoal colors from parent scope
  const warmOffWhite = "#F5F5F0";
  const charcoalDark = "#1a1a1a";
  const charcoalMedium = "#2d2d2d";

  return (
    <div
      className="backdrop-blur-sm rounded-xl p-6 shadow-xl flex flex-col"
      style={{
        backgroundColor: `${charcoalMedium}99`,
        border: `1px solid ${warmOffWhite}20`,
        height: "calc(100vh - 312px)",
      }}
    >
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3
          className="font-display text-xl font-semibold"
          style={{color: warmOffWhite}}
        >
          Story Themes
        </h3>
        <svg
          className="w-5 h-5"
          style={{color: warmOffWhite, opacity: 0.7}}
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
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {sortedThemes.map((theme) => {
          const count = themeCounts.get(theme.id) || 0;
          const color = getThemeColor(theme.id);
          return (
            <div
              key={theme.id}
              className="flex items-center justify-between rounded-lg p-3 transition-colors"
              style={{
                backgroundColor: `${charcoalDark}80`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = `${charcoalDark}99`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = `${charcoalDark}80`)
              }
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{backgroundColor: color}}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-sm"
                    style={{color: warmOffWhite}}
                  >
                    {theme.label}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{color: warmOffWhite, opacity: 0.7}}
                  >
                    {count} {count === 1 ? "story" : "stories"}
                  </div>
                </div>
              </div>
              <div
                className="text-xs font-semibold px-2.5 py-1 rounded-md"
                style={{
                  backgroundColor: `${charcoalDark}99`,
                  color: warmOffWhite,
                }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-4 pt-4 flex-shrink-0"
        style={{borderTop: `1px solid ${warmOffWhite}20`}}
      >
        <div className="flex justify-between text-sm">
          <span style={{color: warmOffWhite, opacity: 0.7}}>
            Total Stories:
          </span>
          <span className="font-medium" style={{color: warmOffWhite}}>
            {stories.length}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span style={{color: warmOffWhite, opacity: 0.7}}>
            Active Clusters:
          </span>
          <span className="font-medium" style={{color: warmOffWhite}}>
            {themes.length}
          </span>
        </div>
      </div>
      <div
        className="mt-4 pt-4 flex-shrink-0"
        style={{borderTop: `1px solid ${warmOffWhite}20`}}
      >
        <p
          className="text-xs leading-relaxed"
          style={{color: warmOffWhite, opacity: 0.7}}
        >
          <strong style={{opacity: 0.9}}>How it works:</strong> Stories are
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

  // Color palette from image
  const colorPalette = [
    "#4F81B0", // Muted Blue
    "#AEBEC5", // Pale Blue-Grey
    "#DAA5AD", // Dusty Rose Pink
    "#FF6E7F", // Coral Pink
    "#CDB15E", // Muted Gold/Mustard
  ];

  // Dark charcoal backgrounds
  const charcoalDark = "#1a1a1a";
  const charcoalMedium = "#2d2d2d";

  // Warm off-white foreground
  const warmOffWhite = "#F5F5F0";

  // If using mock embeddings, API key is not required
  if (!useMockEmbeddings && !apiKey) {
    return (
      <div
        className="min-h-screen space-y-4 p-6"
        style={{
          background: `linear-gradient(to bottom right, ${charcoalDark}, ${charcoalMedium}, ${charcoalDark})`,
          color: warmOffWhite,
        }}
      >
        <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
        <p className="mb-4" style={{opacity: 0.9}}>
          Please set VITE_OPENAI_API_KEY in your .env.local file to see the
          visualization.
        </p>
        <p className="text-sm" style={{opacity: 0.7}}>
          Create a .env.local file in the root directory with:
          VITE_OPENAI_API_KEY=sk-your-key-here
        </p>
      </div>
    );
  }

  // Wait for mock embeddings to load
  if (useMockEmbeddings && !mockEmbeddings) {
    return (
      <div
        className="min-h-screen space-y-4 p-6"
        style={{
          background: `linear-gradient(to bottom right, ${charcoalDark}, ${charcoalMedium}, ${charcoalDark})`,
          color: warmOffWhite,
        }}
      >
        <h2 className="text-2xl font-bold mb-4">Basic Example</h2>
        <p className="mb-4" style={{opacity: 0.9}}>
          Loading mock embeddings...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        color: warmOffWhite,
      }}
    >
      {/* Hero Section */}
      <div style={{borderBottom: `1px solid rgba(255, 255, 255, 0.1)`}}>
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
          <div className="max-w-3xl">
            <h1
              className="font-display text-3xl md:text-4xl font-bold mb-3 tracking-tight"
              style={{color: colorPalette[0]}}
            >
              Living Hive
            </h1>
            <p
              className="text-base leading-relaxed mb-4"
              style={{color: warmOffWhite, opacity: 0.9}}
            >
              Explore workplace stories from{" "}
              <a
                href="https://www.reddit.com/r/work"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium transition-colors"
                style={{color: colorPalette[0], opacity: 0.9}}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.9")}
              >
                r/work
              </a>{" "}
              visualized as an interactive hive. Each hexagon represents a
              story, grouped by similar themes and workplace issues.
            </p>
            <div
              className="flex flex-wrap gap-3 text-sm"
              style={{color: warmOffWhite, opacity: 0.7}}
            >
              <span
                className="px-3 py-1.5 rounded-full border"
                style={{
                  backgroundColor: `${charcoalMedium}80`,
                  borderColor: `${warmOffWhite}20`,
                }}
              >
                {sampleStories.length} stories
              </span>
              {useMockEmbeddings && (
                <span
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: `${charcoalMedium}80`,
                    borderColor: `${warmOffWhite}20`,
                  }}
                >
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
            <div
              className="backdrop-blur-sm rounded-xl shadow-2xl"
              style={{backgroundColor: `${charcoalMedium}80`}}
            >
              <LivingHive
                stories={sampleStories}
                openaiApiKey={useMockEmbeddings ? "" : apiKey || ""}
                embeddings={useMockEmbeddings ? mockEmbeddings : undefined}
                themes={
                  useMockEmbeddings && mockThemes ? mockThemes : undefined
                }
                colorPalette={colorPalette}
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
                colorPalette={colorPalette}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
