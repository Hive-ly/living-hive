# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-12-19

### Breaking Changes
- **Removed `Popover` component export**: The `Popover`, `PopoverTrigger`, and `PopoverContent` components are no longer exported. Consumers should use their own popover/dialog solution.
- **Removed `dialogConfig` prop**: Dialog configuration is no longer supported. Use `onHexClick` callback to implement custom dialogs.
- **Removed `renderStory` prop**: Custom story rendering in dialogs is no longer supported. Implement custom rendering in your dialog component.
- **Changed hex click behavior**: Hex clicks now only trigger the `onHexClick` callback. The component no longer manages dialog/popover state internally.

### Migration Guide
See [MIGRATION.md](MIGRATION.md) for detailed migration instructions.

### Added
- `onHexClick` callback now supports custom dialog/popover implementations

### Removed
- `Popover`, `PopoverTrigger`, `PopoverContent` component exports
- `dialogConfig` prop from `LivingHiveProps`
- `renderStory` prop from `LivingHiveProps`
- `DialogConfig` type export
- Internal Dialog component and state management
- `@radix-ui/react-popover` dependency (moved to devDependencies for examples)

### Changed
- Hex click behavior: now only calls `onHexClick` callback instead of opening internal dialog
- Keyboard navigation: Enter/Space now triggers `onHexClick` instead of opening dialog
- Escape key: now only clears selection instead of closing dialog

## [0.4.0] - Previous version

Initial release with internal dialog/popover support.

