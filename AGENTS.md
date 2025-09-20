# Repository Guidelines

## rule

- 言語は日本語で書くこと

## Project Structure & Module Organization

- `autoload/hellshake_yano.vim`: Vimscript entry points and motion logic.
- `plugin/hellshake-yano.vim`: Plugin bootstrap, default config, mappings, denops init.
- `denops/hellshake-yano/`: TypeScript runtime (main entry, helpers, word detection).
- `tests/`: Deno + @denops/test suites and helpers.
- `deno.jsonc`: Formatter, linter, test include, and TS compiler options.

## Build, Test, and Development Commands

- `deno test -A`: Run all tests (both Vim/Neovim via @denops/test).
- `deno test -A tests/highlight_test.ts`: Run a specific test file.
- `deno fmt`: Format all files according to `deno.jsonc`.
- `deno lint`: Lint TypeScript/JavaScript sources.
- Neovim local run: add repo to `runtimepath` and `:source plugin/hellshake-yano.vim`.

## Coding Style & Naming Conventions

- TypeScript (Deno): 2-space indent, line width 100, semicolons required; strict compiler options
  enabled.
- Vimscript: 2-space indent, script‑local `s:` for private helpers, `hellshake_yano#*` for public
  functions.
- File naming: kebab-case for TS files, use `hellshake-yano` namespace under `denops/`.
- Prefer pure helpers where possible; avoid global state leakage.

## Testing Guidelines

- Framework: Deno test + `@denops/test` (spawns Vim/Neovim). Tests live under `tests/`.
- Naming: `*_test.ts` for unit/integration tests; keep focused and deterministic.
- Running: use `-A` to grant required permissions for editor spawning and file access.
- Add regression tests first (TDD) when changing motion, hinting, or config behavior.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject; include scope when clear (e.g., `vim:`, `denops:`,
  `tests:`).
- PRs: describe problem, approach, and user-visible changes; link issues; include before/after notes
  or screenshots for UX-visible changes.
- Keep diffs minimal; avoid unrelated refactors. Update docs/comments when behavior changes.

## Agent-Specific Notes

- Follow TDD Red–Green–Refactor. Do not alter unrelated tests.
- Respect existing public APIs (`hellshake_yano#*`, denops messages). Keep defaults backward
  compatible.
- When adding settings, update defaults in `plugin/hellshake-yano.vim` and ensure propagation to
  denops.
