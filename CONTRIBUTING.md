# Contributing to Living Hive

Thanks for your interest in improving Living Hive! This project thrives on community involvement. Please take a moment to read this guide before opening an issue or pull request.

## Getting Started

- **Fork the repo** (or use a feature branch if you have write access).
- **Install dependencies** with `npm install`.
- **Run the example playground** with `npm run dev` to validate local changes.

We use Node.js 20 in CI. Matching that version locally (e.g. via [`nvm`](https://github.com/nvm-sh/nvm)) helps avoid environment differences.

## Development Workflow

- **TypeScript first**: keep the library strongly typed and prefer type-safe APIs.
- **Lint and format**: run `npm run lint` and `npm run format:check` before committing. Use `npm run lint:fix` and `npm run format` to apply fixes.
- **Unit tests**: add or update tests alongside behavioral changes. Run `npm test` locally and make sure coverage stays healthy. Vitest is configured with jsdom so you can test utilities and React hooks/components.
- **Type checking**: confirm `npm run type-check` passes to catch API regressions early.
- **Keep examples current**: if you change public APIs, update the sample under `examples/` so new users can learn from it.
- **Data generation**: rely on `StoryDataGenerator` (`src/data/StoryDataGenerator.ts`) for embeddings and themes. Scripts under `scripts/` show how to wire it up.

## Pull Requests

- **One change per PR**: keep the scope focused and explain the context in the PR description.
- **Link issues** when relevant and describe the motivation, implementation, and testing.
- **Follow the template**: include screenshots or recordings when UI changes are involved.
- **CI must pass**: GitHub Actions will run linting, formatting checks, type checking, and unit tests for every pull request.
- **Request review**: once you're ready, mark the PR as ready for review and tag maintainers or relevant contributors.

## Reporting Issues

When reporting a bug or requesting a feature, please include:

- Your environment (OS, browser if applicable, Node.js version).
- Steps to reproduce or expected behavior.
- Any relevant logs, stack traces, or screenshots.

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Please treat fellow contributors with respect and empathy. Reports of unacceptable behavior can be sent privately to the maintainers.

We appreciate your time and contributions—thank you for helping Living Hive grow!
