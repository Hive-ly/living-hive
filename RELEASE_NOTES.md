# Release Notes Template

This file provides a template for GitHub release notes. Copy and customize this template when creating a new release.

## Release 1.0.0 - Breaking Changes

### 🚨 Breaking Changes

This release includes significant breaking changes to simplify the API and give you more control over dialog/popover implementations.

#### What Changed

- **Removed internal Dialog/Popover**: The component no longer manages dialogs internally
- **Removed Popover exports**: `Popover`, `PopoverTrigger`, `PopoverContent` are no longer available
- **Removed props**: `dialogConfig` and `renderStory` props have been removed

#### Why This Change?

This change gives you:

- ✅ More flexibility to use any dialog/popover library
- ✅ Better control over dialog positioning and styling
- ✅ Reduced bundle size (no longer includes Radix UI popover)
- ✅ Simpler API surface

#### Migration Required

**Migration time**: ~15-30 minutes

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

#### Quick Migration Example

**Before:**

```tsx
<LivingHive
  stories={stories}
  dialogConfig={{ position: 'right' }}
  renderStory={story => <div>{story.text}</div>}
/>
```

**After:**

```tsx
const [selectedStory, setSelectedStory] = useState(null)

<LivingHive
  stories={stories}
  onHexClick={(story) => setSelectedStory(story)}
/>
{selectedStory && <YourDialog story={selectedStory} />}
```

### 📚 Documentation

- [Migration Guide](./MIGRATION.md)
- [Full Changelog](./CHANGELOG.md)
- [Updated Examples](./examples/src/examples/BasicExample.tsx)

---

## Template for Future Releases

### Release X.Y.Z - [Title]

#### 🎉 New Features

- Feature 1
- Feature 2

#### 🐛 Bug Fixes

- Fix 1
- Fix 2

#### 🔄 Changed

- Change 1
- Change 2

#### 🗑️ Removed

- Removed feature 1 (if applicable)

#### 📚 Documentation

- Updated docs...

#### 🔗 Links

- [Full Changelog](./CHANGELOG.md)
- [Migration Guide](./MIGRATION.md) (if breaking changes)
