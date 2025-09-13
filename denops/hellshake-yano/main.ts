import type { Denops } from "@denops/std";
import { detectWords } from "./word.ts";
import { assignHintsToWords, generateHints, type HintMapping } from "./hint.ts";

// 設定の型定義
interface Config {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: string;
  trigger_on_hjkl: boolean;
  enabled: boolean;
  maxHints: number; // パフォーマンス最適化: 最大ヒント数
  debounceDelay: number; // デバウンス遅延時間
  use_numbers: boolean; // 数字(0-9)をヒント文字として使用
  highlight_selected: boolean; // 選択中のヒントをハイライト（UX改善）
}

// グローバル状態
// deno-lint-ignore prefer-const
let config: Config = {
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motion_count: 3,
  motion_timeout: 2000,
  hint_position: "start",
  trigger_on_hjkl: true,
  enabled: true,
  maxHints: 100, // デフォルト最大100個のヒント
  debounceDelay: 50, // 50msのデバウンス
  use_numbers: false, // デフォルトでは数字は使用しない
  highlight_selected: true, // デフォルトで選択中ヒントをハイライト
};

let currentHints: HintMapping[] = [];
let hintsVisible = false;
let extmarkNamespace: number | undefined;
let fallbackMatchIds: number[] = []; // matchadd()のフォールバック用ID

// パフォーマンス最適化用の状態管理
let debounceTimeoutId: number | undefined;
let lastShowHintsTime = 0;
let wordsCache: { bufnr: number; content: string; words: any[] } | null = null;
let hintsCache: { wordCount: number; hints: string[] } | null = null;

/**
 * プラグインのメインエントリポイント
 */
export async function main(denops: Denops): Promise<void> {
  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  // dispatcherの設定
  denops.dispatcher = {
    /**
     * 設定を更新（検証処理付き）
     */
    updateConfig(newConfig: unknown): void {
      // 型安全のため、Partial<Config>として処理
      const cfg = newConfig as Partial<Config>;

      // カスタムマーカー設定の検証と適用
      if (cfg.markers && Array.isArray(cfg.markers)) {
        // マーカーの検証: 文字列配列であることを確認
        const validMarkers = cfg.markers.filter((m): m is string => 
          typeof m === "string" && m.length > 0
        );
        if (validMarkers.length > 0) {
          config.markers = validMarkers;
          console.log(`[hellshake-yano] Custom markers set: ${validMarkers.slice(0, 5).join(", ")}${validMarkers.length > 5 ? "..." : ""}`);
        } else {
          console.warn("[hellshake-yano] Invalid markers provided, keeping default");
        }
      }
      
      // motion_count の検証（1以上の整数）
      if (typeof cfg.motion_count === "number") {
        if (cfg.motion_count >= 1 && Number.isInteger(cfg.motion_count)) {
          config.motion_count = cfg.motion_count;
        } else {
          console.warn(`[hellshake-yano] Invalid motion_count: ${cfg.motion_count}, must be integer >= 1`);
        }
      }
      
      // motion_timeout の検証（100ms以上）
      if (typeof cfg.motion_timeout === "number") {
        if (cfg.motion_timeout >= 100) {
          config.motion_timeout = cfg.motion_timeout;
        } else {
          console.warn(`[hellshake-yano] Invalid motion_timeout: ${cfg.motion_timeout}, must be >= 100ms`);
        }
      }
      
      // hint_position の検証（'start', 'end', 'overlay'のみ許可）
      if (typeof cfg.hint_position === "string") {
        const validPositions = ["start", "end", "overlay"];
        if (validPositions.includes(cfg.hint_position)) {
          config.hint_position = cfg.hint_position;
        } else {
          console.warn(`[hellshake-yano] Invalid hint_position: ${cfg.hint_position}, must be one of: ${validPositions.join(", ")}`);
        }
      }
      
      // trigger_on_hjkl の適用
      if (typeof cfg.trigger_on_hjkl === "boolean") {
        config.trigger_on_hjkl = cfg.trigger_on_hjkl;
      }

      // enabled の適用
      if (typeof cfg.enabled === "boolean") {
        config.enabled = cfg.enabled;
      }

      // use_numbers の適用（数字対応）
      if (typeof cfg.use_numbers === "boolean") {
        config.use_numbers = cfg.use_numbers;
        // 数字を使用する場合、マーカーを再生成
        if (cfg.use_numbers) {
          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const numbers = "0123456789".split("");
          config.markers = [...letters, ...numbers];
          console.log("[hellshake-yano] Numbers enabled in markers");
        } else {
          config.markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        }
      }

      // highlight_selected の適用（UX改善）
      if (typeof cfg.highlight_selected === "boolean") {
        config.highlight_selected = cfg.highlight_selected;
      }
    },

    /**
     * ヒントを表示（デバウンス機能付き）
     */
    async showHints(): Promise<void> {
      // デバウンス処理
      const now = Date.now();
      if (now - lastShowHintsTime < config.debounceDelay) {
        if (debounceTimeoutId) {
          clearTimeout(debounceTimeoutId);
        }
        debounceTimeoutId = setTimeout(() => {
          this.showHintsInternal();
        }, config.debounceDelay) as unknown as number;
        return;
      }
      
      await this.showHintsInternal();
    },

    /**
     * 内部的なヒント表示処理（最適化版）
     */
    async showHintsInternal(): Promise<void> {
      lastShowHintsTime = Date.now();
      
      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }

      const maxRetries = 2;
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          // プラグインが無効化されている場合は何もしない
          if (!config.enabled) {
            await denops.cmd("echo 'hellshake-yano is disabled'");
            return;
          }

          // すでに表示中の場合は何もしない
          if (hintsVisible) {
            return;
          }

          // バッファの状態をチェック
          const bufnr = await denops.call("bufnr", "%") as number;
          if (bufnr === -1) {
            throw new Error("No valid buffer available");
          }

          const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
          if (buftype && buftype !== "") {
            await denops.cmd("echo 'hellshake-yano: Cannot show hints in special buffer type'");
            return;
          }

          // キャッシュを使用して単語を検出（最適化）
          const words = await detectWordsOptimized(denops, bufnr);
          if (words.length === 0) {
            await denops.cmd("echo 'No words found for hints'");
            return;
          }

          // maxHints設定を使用してヒント数を制限
          const effectiveMaxHints = Math.min(config.maxHints, config.markers.length * config.markers.length);
          const limitedWords = words.slice(0, effectiveMaxHints);
          
          if (words.length > effectiveMaxHints) {
            await denops.cmd(`echo 'Too many words (${words.length}), showing first ${effectiveMaxHints} hints'`);
          }

          // カーソル位置を取得
          const cursorLine = await denops.call("line", ".") as number;
          const cursorCol = await denops.call("col", ".") as number;

          // キャッシュを使用してヒントを生成（最適化）
          const hints = generateHintsOptimized(limitedWords.length, config.markers);
          currentHints = assignHintsToWords(
            limitedWords, 
            hints, 
            cursorLine, 
            cursorCol
          );

          if (currentHints.length === 0) {
            await denops.cmd("echo 'No valid hints could be generated'");
            return;
          }

          // バッチ処理でヒントを表示（最適化）
          await displayHintsOptimized(denops, currentHints);
          hintsVisible = true;

          // ユーザー入力を待機
          await waitForUserInput(denops);
          return; // 成功した場合はリトライループを抜ける

        } catch (error) {
          retryCount++;
          console.error(`[hellshake-yano] Error in showHintsInternal (attempt ${retryCount}/${maxRetries + 1}):`, error);
          
          // ヒントをクリア
          await hideHints(denops);

          if (retryCount <= maxRetries) {
            // リトライする場合
            console.log(`[hellshake-yano] Retrying showHintsInternal in 100ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
          } else {
            // 最大リトライ回数に達した場合
            await denops.cmd("echohl ErrorMsg | echo 'hellshake-yano: Failed to show hints after retries' | echohl None");
            try {
              await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
            } catch {
              // ベル音が失敗しても続行
            }
            throw error;
          }
        }
      }
    },

    /**
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }
      await hideHints(denops);
    },

    /**
     * キャッシュをクリア
     */
    clearCache(): void {
      wordsCache = null;
      hintsCache = null;
      console.log("[hellshake-yano] Cache cleared");
    },

    /**
     * デバッグ情報を取得（拡充版）
     */
    async debug(): Promise<unknown> {
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        const bufname = await denops.call("bufname", bufnr) as string;
        const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
        const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
        const lineCount = await denops.call("line", "$") as number;

        return {
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          currentHints: currentHints.map(h => ({ 
            hint: h.hint, 
            word: h.word.text, 
            line: h.word.line, 
            col: h.word.col 
          })),
          host: denops.meta.host,
          extmarkNamespace,
          fallbackMatchIdsCount: fallbackMatchIds.length,
          buffer: {
            number: bufnr,
            name: bufname,
            type: buftype,
            readonly: readonly === 1,
            lineCount,
          },
          capabilities: {
            hasExtmarks: denops.meta.host === "nvim" && extmarkNamespace !== undefined,
            canUseFallback: true,
          }
        };
      } catch (error) {
        return {
          error: `Failed to gather debug info: ${error}`,
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          host: denops.meta.host,
          extmarkNamespace,
        };
      }
    },

    /**
     * エラーハンドリングのテスト
     */
    async testErrorHandling(): Promise<void> {
      try {
        console.log("[hellshake-yano] Starting error handling tests...");
        
        // テスト1: 無効なバッファでのヒント表示
        console.log("[hellshake-yano] Test 1: Invalid buffer handling");
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("setlocal buftype=nofile"); // 特殊バッファタイプに設定
          await denops.dispatcher.showHints?.();
          console.log("[hellshake-yano] Test 1: PASSED - Special buffer handled correctly");
        } catch (error) {
          console.log("[hellshake-yano] Test 1: FAILED -", error);
        }

        // テスト2: 読み取り専用バッファでのヒント表示
        console.log("[hellshake-yano] Test 2: Readonly buffer handling");
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("put ='test content for hints'");
          await denops.cmd("setlocal readonly");
          await denops.dispatcher.showHints?.();
          console.log("[hellshake-yano] Test 2: PASSED - Readonly buffer handled correctly");
        } catch (error) {
          console.log("[hellshake-yano] Test 2: FAILED -", error);
        }

        // テスト3: プラグイン無効状態でのヒント表示
        console.log("[hellshake-yano] Test 3: Disabled plugin handling");
        try {
          const originalEnabled = config.enabled;
          config.enabled = false;
          await denops.dispatcher.showHints?.();
          config.enabled = originalEnabled;
          console.log("[hellshake-yano] Test 3: PASSED - Disabled state handled correctly");
        } catch (error) {
          console.log("[hellshake-yano] Test 3: FAILED -", error);
        }

        // テスト4: extmarkフォールバック機能
        console.log("[hellshake-yano] Test 4: Extmark fallback functionality");
        try {
          // 通常のバッファでテスト
          await denops.cmd("new");
          await denops.cmd("put ='word1 word2 word3'");
          await denops.cmd("normal! gg");
          
          const debugInfo = await denops.dispatcher.debug?.() as {
            capabilities?: { hasExtmarks?: boolean };
            buffer?: { type?: string; readonly?: boolean };
          };
          console.log("[hellshake-yano] Test 4: Debug info -", {
            hasExtmarks: debugInfo.capabilities?.hasExtmarks,
            bufferType: debugInfo.buffer?.type,
            readonly: debugInfo.buffer?.readonly
          });
          
          console.log("[hellshake-yano] Test 4: PASSED - Fallback test completed");
        } catch (error) {
          console.log("[hellshake-yano] Test 4: FAILED -", error);
        }

        console.log("[hellshake-yano] Error handling tests completed");
        await denops.cmd("echo 'Error handling tests completed. Check console for results.'");
      } catch (error) {
        console.error("[hellshake-yano] Error in testErrorHandling:", error);
        await denops.cmd("echohl ErrorMsg | echo 'Error handling test failed' | echohl None");
      }
    },

    /**
     * 設定のテスト
     */
    async testConfig(): Promise<void> {
      try {
        console.log("[hellshake-yano] Testing configuration validation");
        
        // テスト1: カスタムマーカー設定
        console.log("[TEST] Custom markers");
        await denops.dispatcher.updateConfig?.({
          markers: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"]
        });
        console.log("Custom markers test passed");
        
        // テスト2: 無効なマーカー設定
        console.log("[TEST] Invalid markers");
        await denops.dispatcher.updateConfig?.({
          markers: [123, null, "", "valid"]  // 混在した無効な値
        });
        
        // テスト3: hint_position設定
        console.log("[TEST] hint_position variations");
        for (const pos of ["start", "end", "overlay", "invalid"]) {
          await denops.dispatcher.updateConfig?.({ hint_position: pos });
          console.log(`Set hint_position to: ${pos}`);
        }
        
        // テスト4: motion_count検証
        console.log("[TEST] motion_count validation");
        for (const count of [0, -1, 1.5, 3, 10]) {
          await denops.dispatcher.updateConfig?.({ motion_count: count });
        }
        
        // テスト5: motion_timeout検証
        console.log("[TEST] motion_timeout validation");
        for (const timeout of [50, 100, 500, 2000]) {
          await denops.dispatcher.updateConfig?.({ motion_timeout: timeout });
        }
        
        // 現在の設定を表示
        const debugInfo = await denops.dispatcher.debug?.();
        console.log("[hellshake-yano] Final configuration:", debugInfo);
        
        await denops.cmd("echo 'Configuration test completed. Check console for results.'");
      } catch (error) {
        console.error("[hellshake-yano] Error in testConfig:", error);
      }
    },

    /**
     * 複数文字ヒントのテスト
     */
    async testMultiCharHints(): Promise<void> {
      try {
        console.log("[hellshake-yano] Testing multi-character hints functionality");
        
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/multi_char_test.txt");
        
        // ヒントを表示
        await denops.dispatcher.showHints?.();
        
        const debugInfo = await denops.dispatcher.debug?.() as {
          currentHints?: Array<{ hint: string; word: string; line: number; col: number }>;
        };
        console.log("[hellshake-yano] Debug info:", debugInfo);
        
        if (debugInfo.currentHints) {
          console.log("[hellshake-yano] Generated hints:");
          debugInfo.currentHints.forEach((h, i: number) => {
            console.log(`  ${i + 1}: ${h.hint} -> "${h.word}" at (${h.line}, ${h.col})`);
          });
          
          // 複数文字ヒントの存在を確認
          const multiCharHints = debugInfo.currentHints.filter((h) => h.hint.length > 1);
          console.log(`[hellshake-yano] Multi-character hints found: ${multiCharHints.length}`);
          
          if (multiCharHints.length > 0) {
            console.log("[hellshake-yano] Sample multi-character hints:");
            multiCharHints.slice(0, 5).forEach((h) => {
              console.log(`  ${h.hint} -> "${h.word}"`);
            });
          }
        }
      } catch (error) {
        console.error("[hellshake-yano] Error in testMultiCharHints:", error);
      }
    },

    /**
     * パフォーマンステスト
     */
    async testPerformance(): Promise<void> {
      try {
        console.log("[hellshake-yano] Starting performance tests...");
        
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");
        
        const startTime = Date.now();
        
        // 1. 単語検出の性能テスト
        console.log("[hellshake-yano] Test 1: Word detection performance");
        const wordDetectionStart = Date.now();
        const words = await detectWords(denops);
        const wordDetectionTime = Date.now() - wordDetectionStart;
        console.log(`Word detection: ${words.length} words in ${wordDetectionTime}ms`);
        
        // 2. ヒント生成の性能テスト
        console.log("[hellshake-yano] Test 2: Hint generation performance");
        const hintGenerationStart = Date.now();
        const hints = generateHints(words.length, config.markers, config.maxHints);
        const hintGenerationTime = Date.now() - hintGenerationStart;
        console.log(`Hint generation: ${hints.length} hints in ${hintGenerationTime}ms`);
        
        // 3. 実際のヒント表示性能テスト
        console.log("[hellshake-yano] Test 3: Full hint display performance");
        const fullTestStart = Date.now();
        await denops.dispatcher.showHints?.();
        const fullTestTime = Date.now() - fullTestStart;
        console.log(`Full hint display: completed in ${fullTestTime}ms`);
        
        // 4. キャッシュ効果のテスト
        console.log("[hellshake-yano] Test 4: Cache effectiveness test");
        const cachedTestStart = Date.now();
        await denops.dispatcher.hideHints?.();
        await denops.dispatcher.showHints?.();
        const cachedTestTime = Date.now() - cachedTestStart;
        console.log(`Cached hint display: completed in ${cachedTestTime}ms`);
        
        // 5. デバウンス機能のテスト
        console.log("[hellshake-yano] Test 5: Debounce functionality test");
        const debounceTestStart = Date.now();
        await denops.dispatcher.hideHints?.();
        
        // 連続してshowHintsを呼び出してデバウンス効果をテスト
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(denops.dispatcher.showHints?.());
        }
        await Promise.all(promises);
        const debounceTestTime = Date.now() - debounceTestStart;
        console.log(`Debounced multiple calls: completed in ${debounceTestTime}ms`);
        
        const totalTime = Date.now() - startTime;
        
        // 統計情報を表示
        const debugInfo = await denops.dispatcher.debug?.() as any;
        
        console.log("\n=== Performance Test Results ===");
        console.log(`Total test time: ${totalTime}ms`);
        console.log(`Words detected: ${words.length}`);
        console.log(`Hints generated: ${hints.length}`);
        console.log(`Current hints displayed: ${debugInfo?.currentHintsCount || 0}`);
        console.log(`Host: ${denops.meta.host}`);
        console.log(`Has extmarks: ${debugInfo?.capabilities?.hasExtmarks || false}`);
        
        // キャッシュ統計
        try {
          const { getWordDetectionCacheStats } = await import("./word.ts");
          const { getHintCacheStats } = await import("./hint.ts");
          
          const wordCacheStats = getWordDetectionCacheStats();
          const hintCacheStats = getHintCacheStats();
          
          console.log("\n=== Cache Statistics ===");
          console.log(`Word cache entries: ${wordCacheStats.cacheSize}/${wordCacheStats.maxCacheSize}`);
          console.log(`Hint cache entries: ${hintCacheStats.hintCacheSize}`);
          console.log(`Assignment cache entries: ${hintCacheStats.assignmentCacheSize}`);
        } catch (error) {
          console.warn("Could not retrieve cache statistics:", error);
        }
        
        await denops.cmd("echo 'Performance test completed. Check console for detailed results.'");
      } catch (error) {
        console.error("[hellshake-yano] Error in testPerformance:", error);
        await denops.cmd("echohl ErrorMsg | echo 'Performance test failed' | echohl None");
      }
    },
    
    /**
     * 大量単語でのストレステスト
     */
    async testStress(): Promise<void> {
      try {
        console.log("[hellshake-yano] Starting stress test with large file...");
        
        // パフォーマンステストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");
        
        // maxHintsを一時的に大きな値に設定
        const originalMaxHints = config.maxHints;
        config.maxHints = 500;
        
        console.log(`[hellshake-yano] Stress test with maxHints: ${config.maxHints}`);
        
        const startTime = Date.now();
        
        // ストレステスト実行
        await denops.dispatcher.showHints?.();
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // 結果を取得
        const debugInfo = await denops.dispatcher.debug?.() as any;
        
        console.log("\n=== Stress Test Results ===");
        console.log(`Execution time: ${executionTime}ms`);
        console.log(`Hints displayed: ${debugInfo?.currentHintsCount || 0}`);
        console.log(`Performance: ${((debugInfo?.currentHintsCount || 0) / executionTime * 1000).toFixed(2)} hints/second`);
        
        // 設定を元に戻す
        config.maxHints = originalMaxHints;
        
        await denops.cmd(`echo 'Stress test completed in ${executionTime}ms with ${debugInfo?.currentHintsCount || 0} hints'`);
      } catch (error) {
        console.error("[hellshake-yano] Error in testStress:", error);
        await denops.cmd("echohl ErrorMsg | echo 'Stress test failed' | echohl None");
      }
    },
  };
}

/**
 * キャッシュを使用した最適化済み単語検出
 */
async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<any[]> {
  try {
    // バッファの内容を取得してキャッシュと比較
    const lines = await denops.call("getbufline", bufnr, 1, "$") as string[];
    const content = lines.join("\n");
    
    // キャッシュヒットチェック
    if (wordsCache && wordsCache.bufnr === bufnr && wordsCache.content === content) {
      console.log("[hellshake-yano] Using cached word detection results");
      return wordsCache.words;
    }
    
    // キャッシュミスの場合、新たに単語を検出
    console.log("[hellshake-yano] Cache miss, detecting words...");
    const words = await detectWords(denops);
    
    // キャッシュを更新（メモリ使用量を制限）
    if (content.length < 1000000) { // 1MB未満のファイルのみキャッシュ
      wordsCache = { bufnr, content, words };
    }
    
    return words;
  } catch (error) {
    console.error("[hellshake-yano] Error in detectWordsOptimized:", error);
    // フォールバックとして通常の単語検出を使用
    return await detectWords(denops);
  }
}

/**
 * キャッシュを使用した最適化済みヒント生成
 */
function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  // キャッシュヒットチェック
  if (hintsCache && hintsCache.wordCount === wordCount) {
    console.log("[hellshake-yano] Using cached hint generation results");
    return hintsCache.hints.slice(0, wordCount);
  }
  
  // キャッシュミスの場合、新たにヒントを生成
  console.log("[hellshake-yano] Cache miss, generating hints...");
  const hints = generateHints(wordCount, markers);
  
  // キャッシュを更新（最大1000個まで）
  if (wordCount <= 1000) {
    hintsCache = { wordCount, hints };
  }
  
  return hints;
}

/**
 * バッチ処理で最適化されたヒント表示
 */
async function displayHintsOptimized(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
      console.warn("[hellshake-yano] Buffer is readonly, hints may not display correctly");
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: バッチ処理でextmarkを作成
      await displayHintsWithExtmarksBatch(denops, bufnr, hints);
    } else {
      // Vim: バッチ処理でmatchaddを作成
      await displayHintsWithMatchAddBatch(denops, hints);
    }

    // 表示フィードバック
    const displayedCount = hints.length;
    if (displayedCount > 0) {
      await denops.cmd(`echo 'Displayed ${displayedCount} hints. Press a hint key to jump.'`);
    } else {
      await denops.cmd("echo 'No hints to display'");
    }
  } catch (error) {
    console.error("[hellshake-yano] Critical error in displayHintsOptimized:", error);
    
    // フォールバックとして通常の表示処理を使用
    await displayHints(denops, hints);
  }
}

/**
 * バッチ処理でextmarkを作成
 */
async function displayHintsWithExtmarksBatch(denops: Denops, bufnr: number, hints: HintMapping[]): Promise<void> {
  const batchSize = 50; // バッチサイズ
  let extmarkFailCount = 0;
  const maxFailures = 5;
  
  console.log(`[hellshake-yano] Creating ${hints.length} extmarks in batches of ${batchSize}`);
  
  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize);
    
    try {
      // バッチ内の各extmarkを作成
      await Promise.all(batch.map(async ({ word, hint }, index) => {
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          // hint_positionに基づいてカラム位置を計算
          let col: number;
          let virtTextPos: "overlay" | "eol" = "overlay";
          
          switch (config.hint_position) {
            case "start":
              col = word.col - 1;
              break;
            case "end":
              col = word.col + word.text.length - 1;
              break;
            case "overlay":
              col = word.col - 1;
              virtTextPos = "overlay";
              break;
            default:
              col = word.col - 1;
          }
          
          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (word.line > lineCount || word.line < 1) {
            console.warn(`[hellshake-yano] Invalid line number: ${word.line} (max: ${lineCount})`);
            return;
          }

          await denops.call("nvim_buf_set_extmark", bufnr, extmarkNamespace, word.line - 1, Math.max(0, col), {
            virt_text: [[hint, "HellshakeYanoMarker"]],
            virt_text_pos: virtTextPos,
            priority: 100,
          });
        } catch (extmarkError) {
          extmarkFailCount++;
          console.warn(`[hellshake-yano] Extmark failed for hint '${hint}' in batch ${Math.floor(i / batchSize)}:`, extmarkError);
          
          // フォールバックとしてmatchaddを使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern, 100) as number;
            fallbackMatchIds.push(matchId);
            console.log(`[hellshake-yano] Used matchadd fallback for hint '${hint}'`);
          } catch (matchError) {
            console.error(`[hellshake-yano] Both extmark and matchadd failed for hint '${hint}':`, matchError);
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            console.warn("[hellshake-yano] Too many extmark failures, switching to matchadd for remaining hints");
            const remainingHints = hints.slice(i + index + 1);
            if (remainingHints.length > 0) {
              await displayHintsWithMatchAddBatch(denops, remainingHints);
            }
            return;
          }
        }
      }));
      
      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 100) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      console.error(`[hellshake-yano] Error in batch ${Math.floor(i / batchSize)}:`, batchError);
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * バッチ処理でmatchaddを作成
 */
async function displayHintsWithMatchAddBatch(denops: Denops, hints: HintMapping[]): Promise<void> {
  const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ
  
  console.log(`[hellshake-yano] Creating ${hints.length} matches in batches of ${batchSize}`);
  
  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize);
    
    try {
      // バッチ内の各matchを作成
      const matchPromises = batch.map(async ({ word, hint }) => {
        try {
          // hint_positionに基づいてパターンを調整
          let pattern: string;
          switch (config.hint_position) {
            case "start":
              pattern = `\\%${word.line}l\\%${word.col}c.`;
              break;
            case "end": {
              const endCol = word.col + word.text.length - 1;
              pattern = `\\%${word.line}l\\%${endCol}c.`;
              break;
            }
            case "overlay":
              pattern = `\\%${word.line}l\\%>${word.col - 1}c\\%<${word.col + word.text.length + 1}c`;
              break;
            default:
              pattern = `\\%${word.line}l\\%${word.col}c.`;
          }
          
          const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern, 100) as number;
          fallbackMatchIds.push(matchId);
          
          console.log(`[hellshake-yano] Added match for hint '${hint}' at (${word.line}, ${word.col})`);
          return matchId;
        } catch (matchError) {
          console.warn(`[hellshake-yano] Failed to add match for hint '${hint}' at (${word.line}, ${word.col}):`, matchError);
          return null;
        }
      });
      
      await Promise.all(matchPromises);
      
      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 200) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      console.error(`[hellshake-yano] Error in match batch ${Math.floor(i / batchSize)}:`, batchError);
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * ヒントを表示する（エラーハンドリング強化版）
 */
async function displayHints(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
      console.warn("[hellshake-yano] Buffer is readonly, hints may not display correctly");
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkを使用（フォールバック付き）
      let extmarkFailCount = 0;
      const maxFailures = 3;
      
      for (const { word, hint } of hints) {
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          // hint_positionに基づいてカラム位置を計算
          let col: number;
          let virtTextPos: "overlay" | "eol" = "overlay";
          
          switch (config.hint_position) {
            case "start":
              col = word.col - 1;
              break;
            case "end":
              col = word.col + word.text.length - 1;
              break;
            case "overlay":
              col = word.col - 1;
              virtTextPos = "overlay";
              break;
            default:
              col = word.col - 1; // デフォルトは開始位置
          }
          
          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (word.line > lineCount || word.line < 1) {
            console.warn(`[hellshake-yano] Invalid line number: ${word.line} (max: ${lineCount})`);
            continue;
          }

          await denops.call("nvim_buf_set_extmark", bufnr, extmarkNamespace, word.line - 1, Math.max(0, col), {
            virt_text: [[hint, "HellshakeYanoMarker"]],
            virt_text_pos: virtTextPos,
            priority: 100,
          });
        } catch (extmarkError) {
          extmarkFailCount++;
          console.warn(`[hellshake-yano] Extmark failed for hint '${hint}' at (${word.line}, ${word.col}):`, extmarkError);
          
          // フォールバックとしてmatchadd()を使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern, 100) as number;
            fallbackMatchIds.push(matchId);
            console.log(`[hellshake-yano] Used matchadd fallback for hint '${hint}'`);
          } catch (matchError) {
            console.error(`[hellshake-yano] Both extmark and matchadd failed for hint '${hint}':`, matchError);
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            console.warn("[hellshake-yano] Too many extmark failures, switching to matchadd for remaining hints");
            await displayHintsWithMatchAdd(denops, hints.slice(hints.indexOf({ word, hint })));
            break;
          }
        }
      }
    } else {
      // Vim または extmark が利用できない場合: matchadd()を使用
      await displayHintsWithMatchAdd(denops, hints);
    }

    // 表示フィードバック
    const displayedCount = hints.length;
    if (displayedCount > 0) {
      await denops.cmd(`echo 'Displayed ${displayedCount} hints. Press a hint key to jump.'`);
    } else {
      await denops.cmd("echo 'No hints to display'");
    }
  } catch (error) {
    console.error("[hellshake-yano] Critical error in displayHints:", error);
    
    // 最後の手段としてユーザーに通知
    await denops.cmd("echohl ErrorMsg | echo 'hellshake-yano: Failed to display hints' | echohl None");
    
    // 音声フィードバック（可能な場合）
    try {
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // ベル音も失敗した場合は何もしない
    }
    
    throw error;
  }
}

/**
 * matchadd()を使用してヒントを表示する（フォールバック機能）
 */
async function displayHintsWithMatchAdd(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    for (const { word, hint } of hints) {
      try {
        // hint_positionに基づいてパターンを調整
        let pattern: string;
        switch (config.hint_position) {
          case "start":
            // 単語の開始位置にマッチ
            pattern = `\\%${word.line}l\\%${word.col}c.`;
            break;
          case "end": {
            // 単語の終了位置にマッチ
            const endCol = word.col + word.text.length - 1;
            pattern = `\\%${word.line}l\\%${endCol}c.`;
            break;
          }
          case "overlay":
            // 単語全体にマッチ（オーバーレイ風）
            pattern = `\\%${word.line}l\\%>${word.col - 1}c\\%<${word.col + word.text.length + 1}c`;
            break;
          default:
            // デフォルトは開始位置
            pattern = `\\%${word.line}l\\%${word.col}c.`;
        }
        
        const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern, 100) as number;
        fallbackMatchIds.push(matchId);
        
        // Vimではテキストの表示はできないので、ヒント文字の情報をコメントとして記録
        console.log(`[hellshake-yano] Added match for hint '${hint}' at (${word.line}, ${word.col}) with position '${config.hint_position}'`);
      } catch (matchError) {
        console.warn(`[hellshake-yano] Failed to add match for hint '${hint}' at (${word.line}, ${word.col}):`, matchError);
      }
    }
  } catch (error) {
    console.error("[hellshake-yano] Error in displayHintsWithMatchAdd:", error);
    throw error;
  }
}

/**
 * ヒントを非表示にする（エラーハンドリング強化版）
 */
async function hideHints(denops: Denops): Promise<void> {
  if (!hintsVisible) {
    return;
  }

  try {
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkをクリア
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        if (bufnr !== -1) {
          const bufExists = await denops.call("bufexists", bufnr) as number;
          if (bufExists) {
            await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          }
        }
      } catch (extmarkError) {
        console.warn("[hellshake-yano] Failed to clear extmarks:", extmarkError);
      }
    }

    // フォールバック用のmatchをクリア
    if (fallbackMatchIds.length > 0) {
      try {
        for (const matchId of fallbackMatchIds) {
          try {
            await denops.call("matchdelete", matchId);
          } catch (matchError) {
            // 個別のmatch削除エラーは警告のみ
            console.warn(`[hellshake-yano] Failed to delete match ${matchId}:`, matchError);
          }
        }
        fallbackMatchIds = [];
      } catch (error) {
        console.warn("[hellshake-yano] Error clearing fallback matches:", error);
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
          console.error("[hellshake-yano] Failed to clear all matches:", clearError);
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
        console.warn("[hellshake-yano] Failed to clear matches:", clearError);
      }
    }
  } catch (error) {
    console.error("[hellshake-yano] Error in hideHints:", error);
  } finally {
    // エラーが発生しても状態はリセットする
    currentHints = [];
    hintsVisible = false;
    fallbackMatchIds = [];
  }
}

/**
 * 候補のヒントをハイライト表示（UX改善）
 */
async function highlightCandidateHints(
  denops: Denops,
  inputPrefix: string,
): Promise<void> {
  if (!config.highlight_selected) return;

  try {
    // 候補となるヒントを見つける
    const candidates = currentHints.filter(h =>
      h.hint.startsWith(inputPrefix)
    );

    if (candidates.length === 0) return;

    // Neovimの場合はextmarkでハイライト
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      for (const candidate of candidates) {
        try {
          await denops.call(
            "nvim_buf_set_extmark",
            0,
            extmarkNamespace,
            candidate.word.line - 1,
            candidate.word.col - 1,
            {
              virt_text: [[candidate.hint, "HellshakeYanoMarkerCurrent"]],
              virt_text_pos: "overlay",
              priority: 999,
            }
          );
        } catch (error) {
          console.warn("[hellshake-yano] Failed to highlight candidate:", error);
        }
      }
    } else {
      // Vimの場合はmatchadd()でハイライト（フォールバック）
      for (const candidate of candidates) {
        try {
          const pattern = `\\%${candidate.word.line}l\\%${candidate.word.col}c${candidate.hint}`;
          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarkerCurrent",
            pattern,
            999
          ) as number;
          fallbackMatchIds.push(matchId);
        } catch (error) {
          console.warn("[hellshake-yano] Failed to highlight candidate with matchadd:", error);
        }
      }
    }
  } catch (error) {
    console.error("[hellshake-yano] Error highlighting candidates:", error);
  }
}

/**
 * ユーザー入力を待機してジャンプ（エラーハンドリング強化版）
 */
async function waitForUserInput(denops: Denops): Promise<void> {
  let timeoutId: number | undefined;
  
  try {
    // 入力タイムアウト設定（設定可能）
    const inputTimeout = config.motion_timeout || 2000;
    
    // プロンプトを表示
    await denops.cmd("echo 'Select hint: '");

    // タイムアウト付きでユーザー入力を取得
    const inputPromise = denops.call("getchar") as Promise<number>;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => resolve(-2), inputTimeout) as unknown as number; // -2 = 全体タイムアウト
    });

    const char = await Promise.race([inputPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    // 全体タイムアウトの場合
    if (char === -2) {
      await denops.cmd("echohl WarningMsg | echo 'Input timeout - hints cleared' | echohl None");
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (char === 27) {
      await denops.cmd("echo 'Cancelled'");
      await hideHints(denops);
      return;
    }

    // Ctrl+C やその他の制御文字の処理
    if (char < 32 && char !== 13) { // Enter(13)以外の制御文字
      await denops.cmd("echohl WarningMsg | echo 'Invalid input - hints cleared' | echohl None");
      await hideHints(denops);
      return;
    }

    // 文字に変換
    let inputChar: string;
    try {
      inputChar = String.fromCharCode(char);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(inputChar)) {
        inputChar = inputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid character input' | echohl None");
      await hideHints(denops);
      return;
    }

    // 有効な文字範囲チェック（数字対応を追加）
    const validPattern = config.use_numbers ? /[A-Z0-9]/ : /[A-Z]/;
    const errorMessage = config.use_numbers
      ? "Please use alphabetic characters (A-Z) or numbers (0-9) only"
      : "Please use alphabetic characters only";

    if (!validPattern.test(inputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${errorMessage}' | echohl None`);
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 単一文字のヒントを探す
    const singleCharTarget = currentHints.find((h) => h.hint === inputChar);

    if (singleCharTarget) {
      // 単一文字のヒントが見つかった場合、すぐにジャンプ
      try {
        await denops.call("cursor", singleCharTarget.word.line, singleCharTarget.word.col);
        await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"'`);
      } catch (jumpError) {
        console.error("[hellshake-yano] Failed to jump to target:", jumpError);
        await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
      }
      await hideHints(denops);
      return;
    }

    // 複数文字のヒントの可能性をチェック
    const multiCharHints = currentHints.filter((h) => h.hint.startsWith(inputChar));

    if (multiCharHints.length === 0) {
      // 該当するヒントがない場合は終了（視覚・音声フィードバック付き）
      await denops.cmd("echohl WarningMsg | echo 'No matching hint found' | echohl None");
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 候補のヒントをハイライト表示（UX改善）
    if (config.highlight_selected && multiCharHints.length > 1) {
      await highlightCandidateHints(denops, inputChar);
    }

    // 第2文字の入力を待機
    await denops.cmd(`echo 'Select hint: ${inputChar}' | redraw`);
    
    // 短いタイムアウトで第2文字を取得
    const secondInputPromise = denops.call("getchar") as Promise<number>;
    const secondTimeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
    });
    
    const secondChar = await Promise.race([secondInputPromise, secondTimeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    if (secondChar === -1) {
      // タイムアウトの場合
      if (multiCharHints.length === 1) {
        // 候補が1つの場合は自動選択
        const target = multiCharHints[0];
        try {
          await denops.call("cursor", target.word.line, target.word.col);
          await denops.cmd(`echo 'Auto-selected "${target.word.text}"'`);
        } catch (jumpError) {
          console.error("[hellshake-yano] Failed to jump to auto-selected target:", jumpError);
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else {
        await denops.cmd(`echo 'Timeout - ${multiCharHints.length} candidates available'`);
      }
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (secondChar === 27) {
      await denops.cmd("echo 'Cancelled'");
      await hideHints(denops);
      return;
    }

    // 第2文字を結合
    let secondInputChar: string;
    try {
      secondInputChar = String.fromCharCode(secondChar);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(secondInputChar)) {
        secondInputChar = secondInputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid second character' | echohl None");
      await hideHints(denops);
      return;
    }

    // 有効な文字範囲チェック（数字対応）
    const secondValidPattern = config.use_numbers ? /[A-Z0-9]/ : /[A-Z]/;
    const secondErrorMessage = config.use_numbers
      ? "Second character must be alphabetic or numeric"
      : "Second character must be alphabetic";

    if (!secondValidPattern.test(secondInputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${secondErrorMessage}' | echohl None`);
      await hideHints(denops);
      return;
    }

    const fullHint = inputChar + secondInputChar;

    // 完全なヒントを探す
    const target = currentHints.find((h) => h.hint === fullHint);

    if (target) {
      // カーソルを移動
      try {
        await denops.call("cursor", target.word.line, target.word.col);
        await denops.cmd(`echo 'Jumped to "${target.word.text}"'`);
      } catch (jumpError) {
        console.error("[hellshake-yano] Failed to jump to target:", jumpError);
        await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
      }
    } else {
      // 無効なヒント組み合わせの場合（視覚・音声フィードバック付き）
      await denops.cmd(`echohl ErrorMsg | echo 'Invalid hint combination: ${fullHint}' | echohl None`);
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
    }

    // ヒントを非表示
    await hideHints(denops);
  } catch (error) {
    console.error("[hellshake-yano] Critical error in waitForUserInput:", error);
    
    // タイムアウトをクリア
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // エラー時のユーザーフィードバック
    try {
      await denops.cmd("echohl ErrorMsg | echo 'Input error - hints cleared' | echohl None");
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // フィードバックが失敗しても続行
    }
    
    await hideHints(denops);
    throw error;
  }
}
