-- lua/hellshake_yano/motion.lua

local config = require('hellshake_yano.config')
local state = require('hellshake_yano.state')
-- local core = require('hellshake_yano.core') -- ← この行を削除またはコメントアウトします

local M = {}

local function detect_key_repeat(bufnr)
  if not config.get().suppress_on_key_repeat then
    return false
  end

  local current_time = vim.loop.hrtime() / 1e6 -- nanosec -> millisec
  local last_time = state.get_last_key_press_time(bufnr)
  state.set_last_key_press_time(bufnr, current_time)

  if last_time == 0 then
    return false
  end

  local diff = current_time - last_time
  if diff < config.get().key_repeat_threshold then
    state.set_key_repeating(bufnr, true)
    state.start_repeat_end_timer(bufnr)
    return true
  end

  state.set_key_repeating(bufnr, false)
  return false
end

--- モーションキーが押された時の処理
-- @param key string 押されたキー
-- @return string Vimに返すキーシーケンス
function M.process(key)
  local conf = config.get()
  if not conf.enabled or not conf.motion_counter_enabled then
    return key
  end

  local bufnr = vim.api.nvim_get_current_buf()

  if vim.v.count1 > 1 then
    state.reset_motion_count(bufnr)
    return vim.v.count1 .. key
  end

  if detect_key_repeat(bufnr) then
    return key
  end

  state.increment_motion_count(bufnr, key)
  local motion_count = state.get_motion_count(bufnr, key)
  local threshold = config.get_motion_count_for_key(key)

  if motion_count >= threshold then
    state.reset_motion_count(bufnr, key)
    -- ★★★ ここが修正箇所 ★★★
    local core = require('hellshake_yano.core') -- この関数の中でrequireする
    vim.defer_fn(core.show, 0)
  else
    state.start_motion_timeout_timer(bufnr, key)
  end

  return key
end

return M
