# Migration Guide

## Migrating from 0.4.0 to 1.0.0

This guide will help you migrate from version 0.4.0 to 1.0.0, which includes breaking changes to how dialogs/popovers are handled.

### Overview of Changes

The library has been simplified to remove internal dialog/popover management. Instead, you now implement your own dialog/popover solution using the `onHexClick` callback.

### Step 1: Remove Popover Imports

**Before:**

```tsx
import { LivingHive, Popover, PopoverTrigger, PopoverContent } from '@hively/living-hive'
```

**After:**

```tsx
import { LivingHive } from '@hively/living-hive'
// Use your own dialog/popover component
import { Dialog } from './components/Dialog'
```

### Step 2: Remove dialogConfig and renderStory Props

**Before:**

```tsx
<LivingHive
  stories={stories}
  embeddings={embeddings}
  themes={themes}
  dialogConfig={{
    position: 'right',
    width: '32rem',
    showOverlay: false,
  }}
  renderStory={story => <CustomStoryView story={story} />}
/>
```

**After:**

```tsx
<LivingHive
  stories={stories}
  embeddings={embeddings}
  themes={themes}
  // dialogConfig and renderStory removed
/>
```

### Step 3: Implement Your Own Dialog

**Before:** Dialog was managed internally by LivingHive.

**After:** Implement your own dialog using `onHexClick`:

```tsx
import { useState } from 'react'
import { LivingHive } from '@hively/living-hive'
import { Dialog, DialogContent } from './components/Dialog'

function App() {
  const [selectedStory, setSelectedStory] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <LivingHive
        stories={stories}
        embeddings={embeddings}
        themes={themes}
        onHexClick={(story, theme) => {
          setSelectedStory(story)
          setSelectedTheme(theme)
          setIsDialogOpen(true)
        }}
      />

      {selectedStory && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            {selectedTheme && <h2>{selectedTheme.label}</h2>}
            <p>{selectedStory.text}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
```

### Step 4: Update Dependencies

Remove `@radix-ui/react-popover` from your dependencies if you were relying on the library's bundled version. The library no longer includes it.

If you need a dialog/popover solution, install your preferred library:

- `@radix-ui/react-dialog` for dialogs
- `@radix-ui/react-popover` for popovers
- Or any other UI library of your choice

### Common Patterns

#### Side Panel Dialog (like the old behavior)

See `examples/src/examples/BasicExample.tsx` for a complete example of implementing a side panel dialog.

#### Prevent Re-renders

Wrap your `onHexClick` callback in `useCallback` to prevent unnecessary re-renders:

```tsx
const handleHexClick = useCallback((story, theme) => {
  setSelectedStory(story)
  setSelectedTheme(theme)
  setIsDialogOpen(true)
}, [])
```

### Need Help?

If you encounter issues during migration, please open an issue on GitHub.
