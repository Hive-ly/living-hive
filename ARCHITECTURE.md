# Living Hive Architecture: Embeddings and UMAP

## Overview

The Living Hive visualization uses a two-stage process to position stories in a hex grid:

1. **OpenAI Embeddings** → Convert text to high-dimensional vectors
2. **UMAP** → Reduce dimensions from 384D to 2D while preserving relationships
3. **Hex Grid** → Map 2D coordinates to hex positions

## The Pipeline

```
Story Text
    ↓
OpenAI Embedding (384 dimensions)
    ↓
UMAP Dimensionality Reduction (2 dimensions: x, y)
    ↓
Hex Grid Coordinate (q, r)
    ↓
Canvas Pixel Position
```

## 1. OpenAI Embeddings

**Purpose**: Convert story text into a mathematical representation that captures semantic meaning.

- **Input**: Story text (e.g., "I had a great experience working with my team")
- **Output**: A 384-dimensional vector (array of 384 numbers)
- **What it captures**: Semantic similarity - stories about similar topics have similar embeddings
- **Example**: Two stories about "team collaboration" will have embeddings that are mathematically close (high cosine similarity)

**Key Property**: Stories with similar meanings have embeddings that are close together in the 384-dimensional space.

## 2. UMAP (Uniform Manifold Approximation and Projection)

**Purpose**: Reduce the 384-dimensional embedding space to 2D while preserving local structure and relationships.

- **Input**: Array of 384-dimensional embeddings (one per story)
- **Output**: Array of 2D coordinates (x, y) - one per story
- **What it preserves**:
  - Stories that are close in 384D space stay close in 2D space
  - Local neighborhoods (similar stories cluster together)
  - Global structure (distant stories stay distant)

**Key Property**: If two stories have similar embeddings (semantically similar), UMAP will place them close together in 2D space.

## 3. Theme Assignment (Separate Process)

**Purpose**: Group stories into themes/clusters and assign colors.

- **Process**: Uses k-means clustering on the embeddings to group similar stories
- **Output**: Each story gets assigned to a theme (which gets a color)
- **Important**: This happens independently of UMAP placement

## The Connection

**Yes, they ARE connected:**

1. **Embeddings determine UMAP placement**: UMAP takes the embeddings as input. The 2D positions you see are directly computed from the embedding vectors.

2. **Semantic similarity → Spatial proximity**:
   - Stories with similar embeddings → Close in 384D space
   - UMAP preserves this → Close in 2D space
   - Result: Semantically similar stories appear near each other in the visualization

3. **Theme colors vs UMAP positions**:
   - **Theme colors** are assigned via k-means clustering on embeddings
   - **UMAP positions** are computed from the same embeddings
   - Stories with the same theme color should generally be close together (because both use the same embedding similarity)
   - However, UMAP prioritizes preserving ALL relationships, not just theme boundaries

## Why Stories with the Same Theme Might Not Be Grouped Together

Even though stories share a theme label, they might be placed far apart because:

1. **UMAP preserves global structure**: It tries to preserve ALL relationships, not just theme boundaries. A story about "team collaboration" might be semantically closer to a story about "communication" than to another "team collaboration" story.

2. **Theme assignment is separate**: Themes are assigned via clustering, but UMAP placement is based purely on embedding similarity. These can sometimes conflict.

3. **Semantic nuance**: Two stories might both be about "teamwork" but have different semantic nuances that place them in different parts of the embedding space.

## Visual Example

Imagine the 384D embedding space as a high-dimensional "semantic map":

```
Story A (about collaboration) ──┐
                                 ├──> Close in 384D → UMAP → Close in 2D
Story B (about teamwork) ────────┘

Story C (about collaboration) ──┐
                                 ├──> Far in 384D → UMAP → Far in 2D
Story D (about compensation) ───┘
```

Even though A and C both have the "collaboration" theme, if their embeddings are semantically different, UMAP will place them far apart.

## Summary

- **Embeddings** = Semantic representation (384D)
- **UMAP** = Dimensionality reduction (384D → 2D) that preserves similarity
- **Themes** = Clustering/grouping based on embeddings (separate from UMAP)
- **Connection**: UMAP uses embeddings as input, so semantically similar stories (similar embeddings) appear close together in the visualization

The visualization shows semantic relationships (via UMAP) with color coding by themes (via clustering). Both use the same embeddings, but serve different purposes: UMAP for spatial layout, clustering for categorization.
