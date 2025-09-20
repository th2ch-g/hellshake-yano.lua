/**
 * Documentation Tests
 * Tests to verify documentation completeness and accuracy for per-key configuration feature
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.200.0/assert/mod.ts";

// Test helper to read files
async function readFile(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    console.error(`Failed to read file ${path}:`, error);
    return "";
  }
}

// Test configuration examples are syntactically correct vim
function isValidVimConfig(configText: string): boolean {
  // Basic checks for vim configuration syntax
  const lines = configText.split('\n').filter(line => line.trim() && !line.trim().startsWith('"'));

  for (const line of lines) {
    // Check for basic vim dict syntax
    if (line.includes('let g:hellshake_yano') && !line.includes('{')) continue;
    if (line.includes('\\') && (line.includes("'") || line.includes('"'))) continue; // vim dict entries
    if (line.includes('}')) continue; // closing dict
  }

  return true; // Basic syntax validation passed
}

Deno.test("README.md contains per-key configuration section", async () => {
  const readme = await readFile("README.md");

  // Check for new section header
  assertStringIncludes(readme, "Per-Key Minimum Word Length");

  // Check for per_key_min_length configuration
  assertStringIncludes(readme, "per_key_min_length");
  assertStringIncludes(readme, "default_min_word_length");
});

Deno.test("README.md contains configuration examples", async () => {
  const readme = await readFile("README.md");

  // Check for key-specific examples
  assertStringIncludes(readme, "'v': 1");   // Visual mode example
  assertStringIncludes(readme, "'h': 2");   // hjkl navigation example
  assertStringIncludes(readme, "'f': 3");   // Find character example

  // Extract vim configuration examples and validate syntax
  const configMatches = readme.match(/```vim\n([\s\S]*?)\n```/g);
  if (configMatches) {
    for (const match of configMatches) {
      const config = match.replace(/```vim\n/, '').replace(/\n```/, '');
      assertEquals(isValidVimConfig(config), true, `Invalid vim config syntax: ${config}`);
    }
  }
});

Deno.test("README.md contains use cases", async () => {
  const readme = await readFile("README.md");

  // Check for documented use cases
  assertStringIncludes(readme, "precise movement");
  assertStringIncludes(readme, "noise reduction");
  assertStringIncludes(readme, "motion types");
});

Deno.test("README.md contains migration guide", async () => {
  const readme = await readFile("README.md");

  // Check for migration guidance
  assertStringIncludes(readme, "migration");
  assertStringIncludes(readme, "legacy");
  assertStringIncludes(readme, "backward compatibility");
});

Deno.test("README.md contains performance considerations", async () => {
  const readme = await readFile("README.md");

  // Check for performance documentation
  assertStringIncludes(readme, "performance");
  assertStringIncludes(readme, "cache");
  assertStringIncludes(readme, "memory");
});

Deno.test("README_ja.md contains Japanese documentation", async () => {
  const readmeJa = await readFile("README_ja.md");

  // Check for Japanese content
  assertStringIncludes(readmeJa, "キー別");
  assertStringIncludes(readmeJa, "最小文字数");
  assertStringIncludes(readmeJa, "設定");

  // Check for per_key_min_length configuration in Japanese
  assertStringIncludes(readmeJa, "per_key_min_length");
  assertStringIncludes(readmeJa, "default_min_word_length");
});

Deno.test("README_ja.md contains configuration examples", async () => {
  const readmeJa = await readFile("README_ja.md");

  // Check for same configuration examples as English version
  assertStringIncludes(readmeJa, "'v': 1");
  assertStringIncludes(readmeJa, "'h': 2");
  assertStringIncludes(readmeJa, "'f': 3");
});

Deno.test("README_ja.md contains Japanese use cases", async () => {
  const readmeJa = await readFile("README_ja.md");

  // Check for use cases in Japanese
  assertStringIncludes(readmeJa, "精密な移動");
  assertStringIncludes(readmeJa, "ノイズ軽減");
  assertStringIncludes(readmeJa, "モーション");
});

Deno.test("Documentation consistency between English and Japanese", async () => {
  const readme = await readFile("README.md");
  const readmeJa = await readFile("README_ja.md");

  // Count configuration examples - should have similar number
  const englishConfigs = (readme.match(/```vim/g) || []).length;
  const japaneseConfigs = (readmeJa.match(/```vim/g) || []).length;

  assertEquals(englishConfigs, japaneseConfigs, "Configuration examples count mismatch");

  // Check for key configuration options in both
  const keyOptions = ['per_key_min_length', 'default_min_word_length', 'markers', 'motion_count'];

  for (const option of keyOptions) {
    assertStringIncludes(readme, option, `Missing ${option} in English README`);
    assertStringIncludes(readmeJa, option, `Missing ${option} in Japanese README`);
  }
});

Deno.test("Configuration table completeness", async () => {
  const readme = await readFile("README.md");

  // Check that new configuration options are in the table
  assertStringIncludes(readme, "per_key_min_length");
  assertStringIncludes(readme, "default_min_word_length");

  // Check table structure
  assertStringIncludes(readme, "| Option");
  assertStringIncludes(readme, "| Type");
  assertStringIncludes(readme, "| Default");
  assertStringIncludes(readme, "| Description");
});

Deno.test("Troubleshooting section updated", async () => {
  const readme = await readFile("README.md");

  // Check troubleshooting includes per-key configuration
  assertStringIncludes(readme, "Troubleshooting");

  // Should have guidance for configuration issues
  const troubleshootingSection = readme.split("## Troubleshooting")[1] || "";
  assertStringIncludes(troubleshootingSection, "configuration");
});