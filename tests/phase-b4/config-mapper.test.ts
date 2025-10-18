/**
 * Config Mapper Test - Phase B-4 TDD Implementation
 * REDフェーズ: 失敗するテストから開始
 */
import { assertEquals } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";

// これから実装するConfigMapperをインポート
import {
  ConfigMapper,
  VimScriptConfig,
  MappedConfig,
} from "../../denops/hellshake-yano/phase-b4/config-mapper.ts";

describe("ConfigMapper", () => {
  describe("mapFromVimScript", () => {
    it("should map basic configuration from VimScript format", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        hint_chars: "asdfjkl;",
        motion_threshold: 3,
        motion_timeout_ms: 500,
        motion_enabled: true,
        visual_mode_enabled: false,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        markers: ["a", "s", "d", "f", "j", "k", "l", ";"],
        motionCount: 3,
        motionTimeout: 500,
        motionCounterEnabled: true,
        visualModeEnabled: false,
      });
    });

    it("should handle motion_keys array transformation", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        motion_keys: ["h", "j", "k", "l"],
        motion_enabled: false,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        countedMotions: ["h", "j", "k", "l"],
        motionCounterEnabled: false,
      });
    });

    it("should map numeric values correctly", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        max_hints: 20,
        min_word_length: 3,
        motion_threshold: 5,
        motion_timeout_ms: 1000,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        maxHints: 20,
        defaultMinWordLength: 3,
        motionCount: 5,
        motionTimeout: 1000,
      });
    });

    it("should handle Japanese-specific settings", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        use_japanese: true,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        useJapanese: true,
      });
    });

    it("should handle debug mode setting", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        debug_mode: true,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        debugMode: true,
      });
    });

    it("should ignore unknown keys and only map known ones", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        hint_chars: "abc",
        unknown_key: "should_be_ignored",
        motion_threshold: 2,
        another_unknown: 123,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        markers: ["a", "b", "c"],
        motionCount: 2,
      });
      // Unknown keys should not appear in the result
      assertEquals("unknown_key" in result, false);
      assertEquals("another_unknown" in result, false);
    });

    it("should handle empty configuration", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {};

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {});
    });

    it("should handle null and undefined values gracefully", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        hint_chars: undefined,
        motion_threshold: null,
        motion_enabled: true,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        motionCounterEnabled: true,
      });
      // Undefined and null values should not be mapped
      assertEquals("markers" in result, false);
      assertEquals("motionCount" in result, false);
    });

    it("should preserve transformed values without modification", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        hint_chars: "xyz",
        motion_timeout_ms: 750,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      // Verify that the transformation is applied correctly
      assertEquals(result.markers, ["x", "y", "z"]);
      assertEquals(result.motionTimeout, 750);
    });

    it("should handle complex configuration with all supported keys", () => {
      const mapper = new ConfigMapper();

      const oldConfig: VimScriptConfig = {
        hint_chars: "asdf",
        motion_threshold: 4,
        motion_timeout_ms: 600,
        motion_keys: ["h", "j"],
        motion_enabled: true,
        visual_mode_enabled: true,
        max_hints: 15,
        min_word_length: 2,
        use_japanese: false,
        debug_mode: false,
      };

      const result = mapper.mapFromVimScript(oldConfig);

      assertEquals(result, {
        markers: ["a", "s", "d", "f"],
        motionCount: 4,
        motionTimeout: 600,
        countedMotions: ["h", "j"],
        motionCounterEnabled: true,
        visualModeEnabled: true,
        maxHints: 15,
        defaultMinWordLength: 2,
        useJapanese: false,
        debugMode: false,
      });
    });
  });

  describe("getMapping", () => {
    it("should return correct mapping for known keys", () => {
      const mapper = new ConfigMapper();

      const hintCharsMapping = mapper.getMapping("hint_chars");
      assertEquals(hintCharsMapping?.key, "markers");
      assertEquals(typeof hintCharsMapping?.transform, "function");

      const motionMapping = mapper.getMapping("motion_threshold");
      assertEquals(motionMapping?.key, "motionCount");
      assertEquals(typeof motionMapping?.transform, "function");
    });

    it("should return undefined for unknown keys", () => {
      const mapper = new ConfigMapper();

      assertEquals(mapper.getMapping("unknown_key"), undefined);
      assertEquals(mapper.getMapping("not_a_real_key"), undefined);
    });
  });

  describe("transformValue", () => {
    it("should split string into array for hint_chars", () => {
      const mapper = new ConfigMapper();
      const mapping = mapper.getMapping("hint_chars");

      if (mapping && mapping.transform) {
        const result = mapping.transform("abcd");
        assertEquals(result, ["a", "b", "c", "d"]);
      }
    });

    it("should pass through arrays unchanged for motion_keys", () => {
      const mapper = new ConfigMapper();
      const mapping = mapper.getMapping("motion_keys");

      if (mapping && mapping.transform) {
        const result = mapping.transform(["h", "j", "k", "l"]);
        assertEquals(result, ["h", "j", "k", "l"]);
      }
    });

    it("should pass through numbers unchanged", () => {
      const mapper = new ConfigMapper();
      const mapping = mapper.getMapping("motion_threshold");

      if (mapping && mapping.transform) {
        const result = mapping.transform(5);
        assertEquals(result, 5);
      }
    });

    it("should pass through booleans unchanged", () => {
      const mapper = new ConfigMapper();
      const mapping = mapper.getMapping("motion_enabled");

      if (mapping && mapping.transform) {
        const result = mapping.transform(true);
        assertEquals(result, true);
      }
    });
  });
});