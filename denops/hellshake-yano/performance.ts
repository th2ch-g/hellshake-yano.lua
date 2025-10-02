import type { Denops } from "@denops/std";
import type { Config, DebugInfo, HintMapping, PerformanceMetrics, Word } from "./types.ts";
import { LRUCache } from "./cache.ts";
import { detectWordsWithManager } from "./word.ts";
import { generateHints } from "./hint.ts";
const wordsCache = new LRUCache<string, Word[]>(100);
const hintsCache = new LRUCache<string, string[]>(50);
let performanceMetrics: PerformanceMetrics = {showHints:[],hideHints:[],wordDetection:[],hintGeneration:[]};
export function recordPerformance(operation: keyof PerformanceMetrics, duration: number): void {
  const metrics = performanceMetrics[operation];
  metrics.push(duration);
  if (metrics.length > 50) metrics.shift();
}
export async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
  const cacheKey = `detectWords:${bufnr}`;
  const cached = wordsCache.get(cacheKey);
  if (cached) return cached;
  const result = await detectWordsWithManager(denops, {});
  const words = Array.isArray(result) ? result : result.words || [];
  wordsCache.set(cacheKey, words);
  return words;
}
export function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  const cacheKey = `generateHints:${wordCount}:${markers.join("")}`;
  const cached = hintsCache.get(cacheKey);
  if (cached) return cached;
  const hints = generateHints(wordCount, markers);
  hintsCache.set(cacheKey, hints);
  return hints;
}
export function generateHintsFromConfig(wordCount: number, config: Config): string[] {
  const hintConfig = {singleCharKeys: config.singleCharKeys, multiCharKeys: config.multiCharKeys, maxSingleCharHints: config.maxSingleCharHints, useNumericMultiCharHints: config.useNumericMultiCharHints, markers: config.markers};
  const cacheKey = `generateHints:${wordCount}:${JSON.stringify(hintConfig)}`;
  const cached = hintsCache.get(cacheKey);
  if (cached) return cached;
  const hints = generateHints(wordCount, { groups: true, ...hintConfig });
  hintsCache.set(cacheKey, hints);
  return hints;
}
export function collectDebugInfo(hintsVisible: boolean, currentHints: HintMapping[], config: Config): DebugInfo {
  return {hintsVisible, currentHints, config, metrics: performanceMetrics, timestamp: Date.now()};
}
export function clearDebugInfo(): void {
  performanceMetrics = {showHints:[],hideHints:[],wordDetection:[],hintGeneration:[]};
}
export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMetrics;
}
export function resetPerformanceMetrics(): void {
  performanceMetrics = {showHints:[],hideHints:[],wordDetection:[],hintGeneration:[]};
}
export function clearCaches(): void {
  wordsCache.clear();
  hintsCache.clear();
}
export function getWordsCache(): LRUCache<string, Word[]> {
  return wordsCache;
}
export function getHintsCache(): LRUCache<string, string[]> {
  return hintsCache;
}
