import type { Denops } from "@denops/std";
import type { Config, HintMapping, Word } from "./types.ts";
import { assignHintsToWords, calculateHintPosition } from "./hint.ts";
import { generateHintsFromConfig, recordPerformance } from "./common/utils/performance.ts";

export const HIGHLIGHT_BATCH_SIZE = 15;
let _isRenderingHints = false;
let pendingHighlightTimerId: number | undefined;

export function isRenderingHints(): boolean { return _isRenderingHints; }
export function abortCurrentRendering(): void { _isRenderingHints = false; }

function getTimeoutDelay(): number {
  const isDeno = typeof Deno !== "undefined";
  const isTest = isDeno && (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
  const isCI = isDeno && Deno.env?.get?.("CI") === "true";
  if (isCI) return 30;
  if (isTest) return 20;
  return 0;
}

export function cleanupPendingTimers(): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
}

function getHighlightGroupName(config: Config): string {
  const configValue = config.highlightHintMarker;
  if (typeof configValue === "string") {
    return configValue;
  }
  return "HellshakeYanoMarker";
}

export async function displayHintsOptimized(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  currentHints?: HintMapping[],
  hintsVisible?: { value: boolean },
): Promise<HintMapping[]> {
  const cp = await denops.call("getpos", ".") as [number, number, number, number];
  const cl = cp[1], cc = cp[2];
  let ah = hints;
  if (hints.length < words.length) ah = generateHintsFromConfig(words.length, config);
  const nh = assignHintsToWords(words, ah, cl, cc, "normal", {
    hintPosition: config.hintPosition,
    bothMinWordLength: config.bothMinWordLength,
  });
  if (currentHints) { currentHints.length = 0; currentHints.push(...nh); }
  if (hintsVisible) hintsVisible.value = true;
  await displayHintsBatched(denops, nh, config, extmarkNamespace, fallbackMatchIds);
  return nh;
}

export function displayHintsAsync(
  denops: Denops,
  config: Config,
  hints: HintMapping[],
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  return displayHintsBatched(denops, hints, config, extmarkNamespace, fallbackMatchIds);
}

async function displayHintsBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  _isRenderingHints = true;
  try {
    for (let i = 0; i < hints.length; i += HIGHLIGHT_BATCH_SIZE) {
      if (!_isRenderingHints) break;
      const batch = hints.slice(i, i + HIGHLIGHT_BATCH_SIZE);
      if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
        await processExtmarksBatched(denops, batch, config, extmarkNamespace);
      } else if (fallbackMatchIds) {
        await processMatchaddBatched(denops, batch, config, fallbackMatchIds);
      }
      if (i + HIGHLIGHT_BATCH_SIZE < hints.length) await new Promise((r) => setTimeout(r, 1));
    }
  } finally {
    _isRenderingHints = false;
  }
}

async function clearHintDisplay(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await denops.call("nvim_buf_clear_namespace", 0, extmarkNamespace, 0, -1);
  } else if (fallbackMatchIds) {
    for (const mid of fallbackMatchIds) {
      try { await denops.call("matchdelete", mid); } catch { /* ignore */ }
    }
    fallbackMatchIds.length = 0;
  }
}

export async function hideHints(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  hintsVisible?: { value: boolean },
  currentHints?: HintMapping[],
): Promise<void> {
  const st = performance.now();
  try {
    abortCurrentRendering();
    await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
    if (hintsVisible) hintsVisible.value = false;
    if (currentHints) currentHints.length = 0;
  } finally {
    recordPerformance("hideHints", performance.now() - st);
  }
}

export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
  const delay = getTimeoutDelay();
  pendingHighlightTimerId = setTimeout(() => {
    pendingHighlightTimerId = undefined;
    highlightCandidateHintsOptimized(denops, input, hints, config, extmarkNamespace, fallbackMatchIds)
      .then(() => { if (onComplete) onComplete(); })
      .catch(() => { if (onComplete) onComplete(); });
  }, delay) as unknown as number;
}

export async function highlightCandidateHintsHybrid(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): Promise<void> {
  const SBS = 15;
  const cands = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  if (cands.length === 0) { if (onComplete) onComplete(); return; }
  const sc = cands.slice(0, SBS);
  const ac = cands.slice(SBS);
  await displayHintsBatched(denops, sc, config, extmarkNamespace, fallbackMatchIds);
  await denops.cmd("redraw");
  if (ac.length > 0) {
    queueMicrotask(async () => {
      try {
        await displayHintsBatched(denops, ac, config, extmarkNamespace, fallbackMatchIds);
        if (onComplete) onComplete();
      } catch { if (onComplete) onComplete(); }
    });
  } else {
    if (onComplete) onComplete();
  }
}

async function highlightCandidateHintsOptimized(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  const cands = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  await displayHintsBatched(denops, cands, config, extmarkNamespace, fallbackMatchIds);
}

async function processExtmarksBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
): Promise<void> {
  const highlightGroup = getHighlightGroupName(config);
  for (const h of hints) {
    const p = calculateHintPosition(h.word, { hintPosition: "offset" });
    await denops.call("nvim_buf_set_extmark", 0, extmarkNamespace, p.line - 1, p.col - 1, {
      virt_text: [[h.hint, highlightGroup]],
      virt_text_pos: "overlay",
    });
  }
}

async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  fallbackMatchIds: number[],
): Promise<void> {
  const highlightGroup = getHighlightGroupName(config);
  for (const h of hints) {
    const p = calculateHintPosition(h.word, "offset");
    const isSym = !h.hint.match(/^[A-Za-z0-9]+$/);
    if (isSym) {
      try {
        if (await denops.call("exists", "*prop_type_add") === 1) {
          try {
            await denops.call("prop_type_add", "HellshakeYanoSymbol", { highlight: highlightGroup });
          } catch { /* exists */ }
          await denops.call("prop_add", p.line, p.col, { type: "HellshakeYanoSymbol", length: h.hint.length, text: h.hint });
        } else {
          let eh = h.hint;
          const ne = ['\\', '.', '[', ']', '^', '$', '*'];
          if (ne.some(c => h.hint.includes(c))) {
            eh = h.hint.replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\[/g, '\\[')
              .replace(/\]/g, '\\]').replace(/\^/g, '\\^').replace(/\$/g, '\\$').replace(/\*/g, '\\*');
          }
          const pat = `\\%${p.line}l\\%${p.col}c.`;
          const mid = await denops.call("matchadd", highlightGroup, pat, 10) as number;
          fallbackMatchIds.push(mid);
        }
      } catch {
        const pat = `\\%${p.line}l\\%${p.col}c.`;
        const mid = await denops.call("matchadd", highlightGroup, pat) as number;
        fallbackMatchIds.push(mid);
      }
    } else {
      const pat = `\\%${p.line}l\\%${p.col}c.\\{${h.hint.length}}`;
      const mid = await denops.call("matchadd", highlightGroup, pat) as number;
      fallbackMatchIds.push(mid);
    }
  }
}
