#!/usr/bin/env -S deno run --allow-all

import { validateConfig } from "./denops/hellshake-yano/config.ts";

const result = validateConfig({
  motion_count: null as any,
  hint_position: null as any,
});

console.log("Valid:", result.valid);
console.log("Errors count:", result.errors.length);
console.log("Errors:", result.errors);