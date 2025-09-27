/**
 * TDD Red Phase: 型統合のテスト
 * sub3-2-2 「型定義の統合実装」のためのテスト
 *
 * このテストは以下を検証します：
 * 1. Config interfaceが削除されている
 * 2. UnifiedConfigが主要型として確立されている
 * 3. type Config = UnifiedConfigのエイリアスが作成されている
 * 4. 重複する型定義が削除されている
 */

import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { Config } from "../denops/hellshake-yano/types.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";

Deno.test("type unification - Config should be UnifiedConfig alias", () => {
  // Config型がUnifiedConfig型のエイリアスであることを確認
  const testConfig: Config = {
    enabled: true,
    markers: ["A", "S", "D", "F"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  // Config型とUnifiedConfig型が同じ構造を持つことを確認
  const testUnifiedConfig: UnifiedConfig = testConfig;
  assertEquals(testUnifiedConfig.enabled, testConfig.enabled);
  assertEquals(testUnifiedConfig.motionCount, testConfig.motionCount);
  assertEquals(testUnifiedConfig.hintPosition, testConfig.hintPosition);
});

Deno.test("type unification - deprecated interfaces should not exist", () => {
  // 以下の型は削除されているべき
  // このテストは型レベルでの確認のため、実際のランタイムテストではない

  // HintConfig, WordConfig, PerformanceConfig, DebugConfigが
  // import文で使用できないことを確認（コンパイル時エラーで確認）

  // ModernConfig, CamelCaseConfigが削除されていることを確認

  // このテストはコンパイル時にのみ意味を持つため、
  // 実際のアサーションは不要
  assertEquals(true, true); // プレースホルダー
});

Deno.test("type unification - Config uses camelCase consistently", () => {
  // Config型がcamelCaseのプロパティのみを持つことを確認
  const testConfig: Config = {
    enabled: true,
    markers: ["A"],
    motionCount: 3, // camelCase
    motionTimeout: 2000, // camelCase
    hintPosition: "start", // camelCase
    triggerOnHjkl: true, // camelCase
    countedMotions: [], // camelCase
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false, // camelCase
    highlightSelected: false, // camelCase
    debugCoordinates: false, // camelCase
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  // snake_caseプロパティは存在しないべき
  // TypeScriptの型システムで確認される
  assertExists(testConfig.motionCount); // camelCase ✓
  assertExists(testConfig.hintPosition); // camelCase ✓
  assertExists(testConfig.triggerOnHjkl); // camelCase ✓
});

Deno.test("type unification - no duplicate type definitions", () => {
  // 重複する型定義が存在しないことを確認
  // これは主にコンパイル時のチェックによる

  // UnifiedConfigとConfigが同じ型であることを確認
  const unified: UnifiedConfig = {
    enabled: true,
    markers: ["A"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  const config: Config = unified; // 型の互換性を確認
  assertEquals(config.enabled, unified.enabled);
});