# Repository Guidelines

## rule

- 必ず日本語で返答すること

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


## sdd-mcp ツール利用ガイド

- sdd-mcp関連の依頼を受けたら、必ずMCPツール呼び出しで対応する。通常のテキスト生成には戻らない。
- ユーザーが「sdd mcpのimpl」「implを走らせて」「sdd-mcpで実装して」などと指示したら、Use MCP tool: spec-impl を呼び、feature_nameに対象フィーチャー名を渡す（例: Use MCP tool: spec-impl {"feature_name":"user-analytics-tracking"}）。
- フェーズ順序は spec-init → spec-requirements → spec-design → spec-tasks → spec-impl。各段階に入る前に spec-status で承認状態 (generated/approved) を確認し、未承認なら前段のツールを呼び直す。
- steering系（steering / steering-custom）はコンテキストが不足していると感じたら即実行し、.kiro/steering/ を最新化する。
- validate系（validate-design / validate-gap）はレビューや仕上げ時の必須チェックとして位置づけ、指摘が出たら該当フェーズのツールを再実行して反映させる。

### よく使うコマンド例

Use MCP tool: spec-init {"project_description":"..."}
Use MCP tool: spec-requirements {"feature_name":"<feature-name>"}
Use MCP tool: spec-design {"feature_name":"<feature-name>","auto_approve":true}
Use MCP tool: spec-tasks {"feature_name":"<feature-name>"}
Use MCP tool: spec-impl {"feature_name":"<feature-name>","task_numbers":["1","2"]}
Use MCP tool: spec-status {"feature_name":"<feature-name>"}
Use MCP tool: steering
Use MCP tool: validate-design {"feature_name":"<feature-name>"}
Use MCP tool: validate-gap {"feature_name":"<feature-name>"}

### 運用メモ

- feature_name は spec-init が生成するケバブケース名をそのまま使う。表記揺れを避けるため必ず実ファイル名を確認。
- .kiro/specs/<feature-name>/ 配下（requirements.md,design.md,tasks.md,spec.json）と .kiro/steering/ が成果物。本番前には差分と承認状態をレビューする。
- validateツールで指摘が出たら、該当ドキュメントを更新し再度ツールを実行して差分解消を確認する。
