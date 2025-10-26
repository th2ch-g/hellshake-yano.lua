-- lua/hellshake_yano/state.lua

local config = require('hellshake_yano.config')

local M = {}

local state = {
  hints_visible = false,
  -- バッファごとの状態
  buffers = {},
}

local function get_buf_state(bufnr)
  -- bufnrが渡されなかった場合のみ現在のバッファを取得するが、
  -- 非同期コールバックからは呼ばないようにする
  bufnr = bufnr or vim.api.nvim_get_current_buf()
  if not state.buffers[bufnr] then
    state.buffers[bufnr] = {
      motion_counts = {},
      motion_timeout_timers = {},
      last_key_press_time = 0,
      is_key_repeating = false,
      repeat_end_timer = nil,
    }
  end
  return state.buffers[bufnr]
end

function M.init_buffer_state(bufnr)
  get_buf_state(bufnr)
end

function M.is_hints_visible()
  return state.hints_visible
end

function M.set_hints_visible(visible)
  state.hints_visible = visible
end

function M.increment_motion_count(bufnr, key)
  local buf_state = get_buf_state(bufnr)
  buf_state.motion_counts[key] = (buf_state.motion_counts[key] or 0) + 1
end

function M.get_motion_count(bufnr, key)
  return get_buf_state(bufnr).motion_counts[key] or 0
end

function M.reset_motion_count(bufnr, key)
  local buf_state = get_buf_state(bufnr)
  if key then
    buf_state.motion_counts[key] = 0
  else
    buf_state.motion_counts = {}
  end
end

function M.start_motion_timeout_timer(bufnr, key)
  local buf_state = get_buf_state(bufnr)
  if buf_state.motion_timeout_timers[key] then
    buf_state.motion_timeout_timers[key]:close()
  end

  local timer = vim.loop.new_timer()
  buf_state.motion_timeout_timers[key] = timer
  -- ★重要: コールバックにbufnrを渡す
  timer:start(config.get().motion_timeout, 0, function()
    M.reset_motion_count(bufnr, key) -- 覚えておいたbufnrを使う
    timer:close()
    buf_state.motion_timeout_timers[key] = nil
  end)
end

function M.get_last_key_press_time(bufnr)
  return get_buf_state(bufnr).last_key_press_time
end

function M.set_last_key_press_time(bufnr, time)
  get_buf_state(bufnr).last_key_press_time = time
end

function M.set_key_repeating(bufnr, repeating)
  get_buf_state(bufnr).is_key_repeating = repeating
end

function M.start_repeat_end_timer(bufnr)
  local buf_state = get_buf_state(bufnr)
  if buf_state.repeat_end_timer then
    buf_state.repeat_end_timer:close()
  end
  local timer = vim.loop.new_timer()
  buf_state.repeat_end_timer = timer
  timer:start(config.get().key_repeat_reset_delay, 0, function()
    M.set_key_repeating(bufnr, false) -- 覚えておいたbufnrを使う
    timer:close()
    buf_state.repeat_end_timer = nil
  end)
end

return M
