# Personal Site

## Before committing

Always run `npx prettier --write .` from `packages/ui` before committing to ensure code is formatted. CI will reject unformatted code.

## Project structure

- Monorepo with npm workspaces: `packages/ui` (SvelteKit app), `packages/model` (types), `packages/spotify`, `packages/synth-builder`
- Type checking: `npm run check` from `packages/ui`
- Linting: `npm run lint` from `packages/ui` (prettier + eslint)
