-- lua/hellshake_yano/motion.lua

local config = require('hellshake_yano.config')
local state = require('hellshake_yano.state')
local core = require('hellshake_yano.core')

local M = {}

--- キーリピート(長押し)を検出する
-- @return boolean trueならリピート中
local function detect_key_repeat()
  if not config.get().suppress_on_key_repeat then
    return false
  end

  local current_time = vim.loop.hrtime() / 1e6 -- nanosec -> millisec
  local last_time = state.get_last_key_press_time()
  state.set_last_key_press_time(current_time)

  if last_time == 0 then
    return false
  end

  local diff = current_time - last_time
  if diff < config.get().key_repeat_threshold then
    state.set_key_repeating(true)
    -- リピートが終わったら状態をリセットするタイマー
    state.start_repeat_end_timer()
    return true
  end

  state.set_key_repeating(false)
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

  -- 数値プレフィックス付きの場合はヒントを出さない
  if vim.v.count1 > 1 then
    state.reset_motion_count()
    return vim.v.count1 .. key
  end

  if detect_key_repeat() then
    return key
  end

  state.increment_motion_count(key)
  local motion_count = state.get_motion_count(key)
  local threshold = config.get_motion_count_for_key(key)

  if motion_count >= threshold then
    state.reset_motion_count(key)
    -- core.show()を直接呼ぶと<expr>マッピングがうまく動かないことがあるため
    -- vim.defer_fnで遅延実行する
    vim.defer_fn(core.show, 0)
  else
    state.start_motion_timeout_timer(key)
  end

  return key
end

return M

