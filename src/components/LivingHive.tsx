import React, {useCallback, useEffect, useRef, useState} from "react";
import type {
  BaseStory,
  Theme,
  StoryWithEmbedding,
  LivingHiveProps,
} from "../types";
import {useEmbeddings} from "../hooks/useEmbeddings";
import {useThemes} from "../hooks/useThemes";
import {useUMAPPlacement} from "../hooks/useUMAPPlacement";
import {hexToPixel, getHexRadius} from "../utils/hex";
import {getThemeColor, DEFAULT_COLOR_PALETTE} from "../utils/colors";
import {HiveShimmer} from "./HiveShimmer";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "./ui/dialog";
import {cn} from "../utils/cn";

interface HexData<T extends BaseStory> {
  q: number;
  r: number;
  theme: Theme | null;
  story: T;
}

export function LivingHive<T extends BaseStory = BaseStory>({
  stories,
  openaiApiKey,
  themes: providedThemes,
  colorPalette = DEFAULT_COLOR_PALETTE,
  apiEndpoint,
  embeddings: providedEmbeddings,
  onHexClick,
  renderStory,
  onError,
  onThemesChange,
  onAssignmentsChange,
  className,
  config,
  dialogConfig,
}: LivingHiveProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatingThemesRef = useRef(false);
  const processedProvidedThemesRef = useRef<string>(""); // Track which provided themes we've processed
  const [hexes, setHexes] = useState<HexData<T>[]>([]);
  const [selectedHex, setSelectedHex] = useState<HexData<T> | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [focusedHexIndex, setFocusedHexIndex] = useState<number | null>(null);
  const [themes, setThemes] = useState<Theme[]>(providedThemes || []);
  const [storyAssignments, setStoryAssignments] = useState<Map<string, string>>(
    new Map()
  );

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({x: 0, y: 0});
  const initialPanRef = useRef({x: 0, y: 0});

  const {generateEmbeddingsForStories, loading: embeddingsLoading} =
    useEmbeddings<T>(onError);
  const {
    generateThemesFromStories,
    assignStories,
    loading: themesLoading,
  } = useThemes<T>();
  const {
    computePlacement,
    loading: placementLoading,
    error: placementError,
  } = useUMAPPlacement();

  // Only show loading if embeddings are being generated (not when provided)
  const loading =
    (providedEmbeddings ? false : embeddingsLoading) ||
    themesLoading ||
    placementLoading;

  // Generate or use provided themes
  useEffect(() => {
    if (providedThemes && providedThemes.length > 0) {
      // Create a unique key for these themes to avoid reprocessing
      const themesKey = providedThemes
        .map((t) => `${t.id}:${t.label}`)
        .join(",");

      // Skip if we've already processed these exact themes
      if (processedProvidedThemesRef.current === themesKey) {
        return;
      }

      processedProvidedThemesRef.current = themesKey;
      setThemes(providedThemes);

      // Still need to assign stories to themes when themes are provided
      if (stories.length > 0 && providedEmbeddings) {
        // Only generate assignments if we have embeddings (synchronous for provided embeddings)
        const assignments = assignStories(
          stories,
          providedEmbeddings,
          providedThemes
        );
        setStoryAssignments(assignments);

        // Only call callbacks once when both are ready
        if (onThemesChange) {
          onThemesChange(providedThemes);
        }
        if (onAssignmentsChange) {
          onAssignmentsChange(assignments);
        }
      } else if (stories.length > 0 && !providedEmbeddings) {
        // Only generate embeddings if not provided (async)
        const generateAssignments = async () => {
          try {
            const embeddings = await generateEmbeddingsForStories(
              stories,
              openaiApiKey,
              apiEndpoint
            );
            const assignments = assignStories(
              stories,
              embeddings,
              providedThemes
            );
            setStoryAssignments(assignments);

            // Only call callbacks once when both are ready
            if (onThemesChange) {
              onThemesChange(providedThemes);
            }
            if (onAssignmentsChange) {
              onAssignmentsChange(assignments);
            }
          } catch (error) {
            if (onError) {
              onError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          }
        };
        generateAssignments();
      }
      return;
    }

    // Reset the processed ref when not using provided themes
    processedProvidedThemesRef.current = "";

    if (stories.length === 0) {
      setThemes([]);
      return;
    }

    // Prevent duplicate theme generation calls
    if (generatingThemesRef.current) {
      console.log(
        "[LivingHive] ⚠️ Duplicate theme generation call prevented (already in progress)"
      );
      return;
    }

    const generateThemes = async () => {
      const startTime = Date.now();
      generatingThemesRef.current = true;
      console.log("[LivingHive] 🚀 Starting theme generation", {
        storyCount: stories.length,
        hasProvidedEmbeddings: !!providedEmbeddings,
        hasApiKey: !!openaiApiKey,
        apiEndpoint: apiEndpoint || "client",
        timestamp: new Date().toISOString(),
      });

      try {
        let embeddings: Map<string, number[]>;
        if (providedEmbeddings) {
          console.log("[LivingHive] ✅ Using provided embeddings", {
            count: providedEmbeddings.size,
          });
          embeddings = providedEmbeddings;
        } else {
          console.log("[LivingHive] 📡 Generating embeddings...");
          const embeddingStartTime = Date.now();
          embeddings = await generateEmbeddingsForStories(
            stories,
            openaiApiKey,
            apiEndpoint
          );
          console.log("[LivingHive] ✅ Embeddings generated", {
            count: embeddings.size,
            duration: `${Date.now() - embeddingStartTime}ms`,
          });
        }

        // Filter stories to only those with valid embeddings
        const storiesWithEmbeddings = stories.filter((s) => {
          const embedding = embeddings.get(s.id);
          return embedding && embedding.length > 0;
        });

        if (storiesWithEmbeddings.length === 0) {
          throw new Error("No stories have valid embeddings");
        }

        console.log("[LivingHive] 🎨 Generating themes...", {
          totalStories: stories.length,
          storiesWithEmbeddings: storiesWithEmbeddings.length,
          storiesWithoutEmbeddings:
            stories.length - storiesWithEmbeddings.length,
        });

        const themeStartTime = Date.now();
        const generatedThemes = await generateThemesFromStories(
          storiesWithEmbeddings, // Only use stories with embeddings for theme generation
          embeddings,
          openaiApiKey,
          apiEndpoint
        );
        console.log("[LivingHive] ✅ Themes generated", {
          themeCount: generatedThemes.length,
          themes: generatedThemes.map((t) => t.label),
          duration: `${Date.now() - themeStartTime}ms`,
        });

        // Only assign stories that have valid embeddings
        const assignments = assignStories(
          storiesWithEmbeddings,
          embeddings,
          generatedThemes
        );

        console.log("[LivingHive] ✅ Theme generation complete", {
          totalDuration: `${Date.now() - startTime}ms`,
          assignmentCount: assignments.size,
          storiesAssigned: assignments.size,
          storiesSkipped: stories.length - assignments.size,
        });

        // Set themes and assignments
        setThemes(generatedThemes);
        setStoryAssignments(assignments);

        // Only call callbacks once when both themes and assignments are ready
        if (onThemesChange) {
          onThemesChange(generatedThemes);
        }
        if (onAssignmentsChange) {
          onAssignmentsChange(assignments);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("[LivingHive] ❌ Theme generation failed", {
          error: errorMessage,
          duration: `${Date.now() - startTime}ms`,
          hasExistingThemes: themes.length > 0,
        });

        // If we have existing themes, keep them instead of clearing
        // This prevents losing good themes if a subsequent generation fails
        if (themes.length === 0) {
          // Only clear if we don't have any themes yet
          setThemes([]);
          setStoryAssignments(new Map());
        } else {
          console.log("[LivingHive] ⚠️ Keeping existing themes despite error", {
            existingThemeCount: themes.length,
          });
        }

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      } finally {
        generatingThemesRef.current = false;
      }
    };

    generateThemes();
  }, [
    stories,
    providedThemes,
    providedEmbeddings,
    openaiApiKey,
    apiEndpoint,
    generateEmbeddingsForStories,
    generateThemesFromStories,
    assignStories,
    onError,
  ]);

  // Generate hex positions when data changes
  useEffect(() => {
    if (stories.length === 0 || themes.length === 0) {
      setHexes([]);
      return;
    }

    // Wait for story assignments to be ready
    if (storyAssignments.size === 0 && stories.length > 0) {
      return;
    }

    const generateHexes = async () => {
      try {
        const embeddings = providedEmbeddings
          ? providedEmbeddings
          : await generateEmbeddingsForStories(
              stories,
              openaiApiKey,
              apiEndpoint
            );

        // Filter out stories without embeddings
        const validStories = stories.filter((story) => {
          const embedding = embeddings.get(story.id);
          return embedding && embedding.length > 0;
        });

        if (validStories.length === 0) {
          console.warn("No stories with valid embeddings");
          setHexes([]);
          return;
        }

        const storyData: StoryWithEmbedding[] = validStories.map((story) => ({
          id: story.id,
          text: story.text,
          embedding: embeddings.get(story.id)!,
          cluster_id: storyAssignments.get(story.id) || themes[0]?.id,
        }));

        const norm = {
          min_x: -10.0,
          max_x: 10.0,
          min_y: -10.0,
          max_y: 10.0,
        };

        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        const canvasWidth = rect?.width || config?.canvasWidth || 900;
        const canvasHeight = rect?.height || config?.canvasHeight || 600;

        const result = await computePlacement(storyData, norm, {
          canvasWidth,
          canvasHeight,
          hexRadius: config?.hexRadius || getHexRadius(),
          margin: config?.margin || 20,
        });

        const themeMap = new Map<string, Theme>();
        themes.forEach((theme) => {
          themeMap.set(theme.id, theme);
        });

        const newHexes: HexData<T>[] = [];
        result.placements.forEach((hexCoord, storyId) => {
          const story = validStories.find((s) => s.id === storyId);
          if (!story) return;

          const themeId = storyAssignments.get(storyId) || themes[0]?.id;
          const theme = themeId ? themeMap.get(themeId) || null : null;

          newHexes.push({
            q: hexCoord.q,
            r: hexCoord.r,
            theme,
            story,
          });
        });

        console.log("Generated hexes:", newHexes.length);
        setHexes(newHexes);

        // Auto-fit: Calculate bounds and center the hexes
        if (newHexes.length > 0) {
          const hexRadius = config?.hexRadius || getHexRadius();
          let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;

          newHexes.forEach((hex) => {
            const pixel = hexToPixel(hex, hexRadius);
            minX = Math.min(minX, pixel.x);
            maxX = Math.max(maxX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxY = Math.max(maxY, pixel.y);
          });

          const hexWidth = maxX - minX;
          const hexHeight = maxY - minY;
          const centerHexX = (minX + maxX) / 2;
          const centerHexY = (minY + maxY) / 2;

          // Calculate zoom to fit with padding
          const padding = 40;
          const scaleX = (canvasWidth - padding * 2) / Math.max(hexWidth, 1);
          const scaleY = (canvasHeight - padding * 2) / Math.max(hexHeight, 1);
          const initialZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x initially

          // Center the hexes
          const initialPanX = canvasWidth / 2 - centerHexX * initialZoom;
          const initialPanY = canvasHeight / 2 - centerHexY * initialZoom;

          setZoom(initialZoom);
          setPanX(initialPanX);
          setPanY(initialPanY);
          initialPanRef.current = {x: initialPanX, y: initialPanY};
        }
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
        setHexes([]);
      }
    };

    generateHexes();
  }, [
    stories,
    themes,
    storyAssignments,
    providedEmbeddings,
    openaiApiKey,
    apiEndpoint,
    config,
    generateEmbeddingsForStories,
    computePlacement,
    onError,
  ]);

  // Render hexes to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hexes.length) {
      if (hexes.length === 0 && canvas) {
        console.log("No hexes to render");
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get 2d context");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn("Canvas has zero dimensions:", rect.width, rect.height);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Fill with lighter background
    ctx.fillStyle = "#1a1a1a"; // Dark gray background
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw outline/border
    ctx.strokeStyle = "#404040"; // Medium gray outline
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);

    console.log(
      "Rendering",
      hexes.length,
      "hexes on canvas",
      rect.width,
      "x",
      rect.height
    );

    const hexRadius = config?.hexRadius || getHexRadius();

    // Apply zoom and pan transforms
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Calculate center offset (hexes are positioned relative to center)
    const centerX = 0;
    const centerY = 0;

    hexes.forEach((hex, index) => {
      const pixel = hexToPixel(hex, hexRadius);
      const x = centerX + pixel.x;
      const y = centerY + pixel.y;

      // Check if hex is visible (accounting for zoom)
      const screenX = x * zoom + panX;
      const screenY = y * zoom + panY;
      const screenRadius = hexRadius * zoom;

      if (
        screenX < -screenRadius ||
        screenX > rect.width + screenRadius ||
        screenY < -screenRadius ||
        screenY > rect.height + screenRadius
      ) {
        return;
      }

      const isFocused = focusedHexIndex === index;
      drawHex(ctx, x, y, hexRadius, hex, isFocused);
    });

    if (selectedHex) {
      const pixel = hexToPixel(selectedHex, hexRadius);
      const x = centerX + pixel.x;
      const y = centerY + pixel.y;
      drawHex(ctx, x, y, hexRadius, selectedHex, true);
    }

    ctx.restore();
  }, [hexes, selectedHex, focusedHexIndex, config, zoom, panX, panY]);

  // Handle window resize - trigger re-render with zoom/pan
  useEffect(() => {
    const handleResize = () => {
      // Force re-render by updating zoom slightly (triggers canvas redraw)
      // The actual rendering will use current zoom/pan values
      if (canvasRef.current && hexes.length) {
        // Just trigger a re-render by setting zoom to itself
        setZoom((prev) => prev);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hexes.length]);

  const drawHex = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    hex: HexData<T>,
    isSelected: boolean
  ) => {
    const fillColor = hex.theme
      ? getThemeColor(hex.theme.id, themes, colorPalette)
      : colorPalette[0];

    ctx.save();

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hexX = x + radius * Math.cos(angle);
      const hexY = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hexX, hexY);
      } else {
        ctx.lineTo(hexX, hexY);
      }
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, fillColor + "80");

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = isSelected ? "#000" : fillColor;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    if (isSelected) {
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = 15;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Zoom towards mouse position
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

      // Adjust pan to zoom towards mouse position
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - panX) * zoomRatio;
      const newPanY = mouseY - (mouseY - panY) * zoomRatio;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    },
    [zoom, panX, panY]
  );

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return; // Only left mouse button
      event.preventDefault();
      isDraggingRef.current = true;
      // Store the initial mouse position relative to current pan
      dragStartRef.current = {
        x: event.clientX - panX,
        y: event.clientY - panY,
      };
    },
    [panX, panY]
  );

  // Handle mouse move for panning (global to continue panning outside canvas)
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      event.preventDefault();
      setPanX(event.clientX - dragStartRef.current.x);
      setPanY(event.clientY - dragStartRef.current.y);
    };

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Handle mouse move for panning
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return;
      event.preventDefault();
      setPanX(event.clientX - dragStartRef.current.x);
      setPanY(event.clientY - dragStartRef.current.y);
    },
    []
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Don't trigger click if we were dragging
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Convert screen coordinates to world coordinates
      const worldX = (event.clientX - rect.left - panX) / zoom;
      const worldY = (event.clientY - rect.top - panY) / zoom;
      const hexRadius = config?.hexRadius || getHexRadius();
      const centerX = 0;
      const centerY = 0;

      let foundHex: HexData<T> | null = null;
      let foundIndex = -1;

      for (let i = 0; i < hexes.length; i++) {
        const hex = hexes[i];
        const pixel = hexToPixel(hex, hexRadius);
        const hexX = centerX + pixel.x;
        const hexY = centerY + pixel.y;
        const distance = Math.sqrt((worldX - hexX) ** 2 + (worldY - hexY) ** 2);

        if (distance <= hexRadius) {
          foundHex = hex;
          foundIndex = i;
          break;
        }
      }

      if (foundHex) {
        setSelectedHex(foundHex);
        setFocusedHexIndex(foundIndex);
        setIsPopoverOpen(true);
        if (onHexClick) {
          onHexClick(foundHex.story, foundHex.theme);
        }
      } else {
        setSelectedHex(null);
        setFocusedHexIndex(null);
        setIsPopoverOpen(false);
      }
    },
    [hexes, config, onHexClick, zoom, panX, panY]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (hexes.length === 0) return;

      let newIndex = focusedHexIndex;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          newIndex =
            focusedHexIndex === null || focusedHexIndex === hexes.length - 1
              ? 0
              : focusedHexIndex + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          newIndex =
            focusedHexIndex === null || focusedHexIndex === 0
              ? hexes.length - 1
              : focusedHexIndex - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (focusedHexIndex !== null) {
            const hex = hexes[focusedHexIndex];
            setSelectedHex(hex);
            setIsPopoverOpen(true);
            if (onHexClick) {
              onHexClick(hex.story, hex.theme);
            }
          }
          break;
        case "Escape":
          event.preventDefault();
          setSelectedHex(null);
          setFocusedHexIndex(null);
          setIsPopoverOpen(false);
          break;
        default:
          return;
      }

      if (newIndex !== null && newIndex !== focusedHexIndex) {
        setFocusedHexIndex(newIndex);
        setSelectedHex(hexes[newIndex]);
      }
    },
    [hexes, focusedHexIndex, onHexClick]
  );

  if (loading) {
    console.log("Loading state:", {
      embeddingsLoading,
      themesLoading,
      placementLoading,
    });
    return <HiveShimmer className={className} />;
  }

  if (placementError) {
    console.error("Placement error:", placementError);
    return (
      <div
        className={cn("h-96 flex items-center justify-center", className)}
        role="alert"
      >
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to compute positions</p>
          <p className="text-sm text-muted-foreground">{placementError}</p>
        </div>
      </div>
    );
  }

  console.log("Render state:", {
    themesCount: themes.length,
    hexesCount: hexes.length,
    storiesCount: stories.length,
    assignmentsCount: storyAssignments.size,
  });

  if (!themes.length || !hexes.length) {
    return (
      <div className={cn("h-96 flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-muted-foreground mb-2">
            {!themes.length ? "No themes available" : "No hexes to display"}
          </p>
          <p className="text-sm text-muted-foreground">
            {!themes.length
              ? "Generating themes..."
              : `Waiting for ${stories.length} stories to be processed...`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Living Hive visualization"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-96 border-2 border-gray-600 rounded-lg cursor-move focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary bg-gray-900"
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{touchAction: "none"}}
        aria-label="Interactive hex grid visualization (scroll to zoom, drag to pan)"
        tabIndex={-1}
      />

      {/* Dialog for selected hex - fixed on right side */}
      {selectedHex && (
        <Dialog open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <DialogContent
            showOverlay={dialogConfig?.showOverlay === true}
            className={cn(
              // Override default centered positioning
              "!left-auto !right-0 !translate-x-0 !bottom-auto",
              // Base positioning - fixed on right side of viewport
              "fixed right-0 top-0 bottom-0 z-50",
              // Default width and styling
              dialogConfig?.width || "w-96 max-w-[90vw]",
              dialogConfig?.maxHeight || "max-h-screen",
              // Position variants
              dialogConfig?.position === "left" && "!left-0 !right-auto",
              dialogConfig?.position === "top" &&
                "!top-0 !bottom-auto !right-0 !left-auto h-auto",
              dialogConfig?.position === "bottom" &&
                "!bottom-0 !top-auto !right-0 !left-auto h-auto",
              // Dark mode styling
              "bg-gray-900/95 backdrop-blur-md text-white",
              "border-l border-gray-800/50 border-r-0 border-t-0 border-b-0",
              dialogConfig?.position === "left" &&
                "border-l-0 border-r border-gray-800/50",
              dialogConfig?.position === "top" &&
                "border-l-0 border-r-0 border-t border-gray-800/50 border-b-0",
              dialogConfig?.position === "bottom" &&
                "border-l-0 border-r-0 border-t-0 border-b border-gray-800/50",
              "rounded-none shadow-2xl",
              dialogConfig?.position === "top" && "rounded-b-xl",
              dialogConfig?.position === "bottom" && "rounded-t-xl",
              dialogConfig?.position === "left" && "rounded-r-xl",
              // Animation - slide in from right
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
              dialogConfig?.position === "left" &&
                "data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full",
              dialogConfig?.position === "top" &&
                "data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full",
              dialogConfig?.position === "bottom" &&
                "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
              "overflow-y-auto p-6",
              dialogConfig?.className
            )}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Prevent closing when clicking on canvas
              const target = e.target as HTMLElement;
              if (target.closest("canvas")) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              {selectedHex.theme && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0"
                    style={{
                      backgroundColor: getThemeColor(
                        selectedHex.theme.id,
                        themes,
                        colorPalette
                      ),
                    }}
                    aria-label={`Theme: ${selectedHex.theme.label}`}
                  />
                  <DialogTitle className="text-xl font-semibold text-white">
                    {selectedHex.theme.label}
                  </DialogTitle>
                </div>
              )}
            </DialogHeader>
            <div className="text-base text-gray-100 leading-relaxed pt-2">
              {renderStory ? (
                renderStory(selectedHex.story)
              ) : (
                <p className="whitespace-pre-wrap text-gray-100">
                  "{selectedHex.story.text}"
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm z-10">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </span>
          <span className="text-muted-foreground">
            {themes.length} {themes.length === 1 ? "theme" : "themes"}
          </span>
        </div>
      </div>
    </div>
  );
}
