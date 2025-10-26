-- lua/hellshake_yano/input.lua

local M = {}

-- local core = require('hellshake_yano.core')
local util = require('hellshake_yano.util')
local config = require('hellshake_yano.config')

local input_buffer = ''
local hint_map = {}
local on_key_handler_id = nil

--- ジャンプを実行し、クリーンアップする
local function jump(word)
  local core = require('hellshake_yabi.core')
  M.stop() -- 先にキー入力を停止
  vim.api.nvim_win_set_cursor(0, { word.lnum, word.col - 1 })
  core.hide()
end

--- キー入力ハンドラ
-- @param char string 入力された文字
local function on_key(char)
  local core = require('hellshake_yabi.core')
  -- <Esc> や <C-c> でキャンセル
  if char == '' or char == '' then
    M.stop()
    core.hide()
    return
  end

  input_buffer = input_buffer .. char

  -- 完全一致をチェック
  if hint_map[input_buffer] then
    jump(hint_map[input_buffer])
    return
  end

  -- 部分一致をチェック
  local has_partial_match = false
  for hint, _ in pairs(hint_map) do
    if hint:sub(1, #input_buffer) == input_buffer then
      has_partial_match = true
      break
    end
  end

  -- 部分一致がなければ終了
  if not has_partial_match then
    M.stop()
    core.hide()
    util.show_warning('Invalid hint: ' .. input_buffer)
  else
    -- TODO: Update highlight for partial matches
  end
end

--- ユーザーの入力を待ち受ける
-- @param map table ヒントと単語のマッピング
function M.wait_for_input(map)
  M.stop() -- 念のため既存のハンドラを停止
  input_buffer = ''
  hint_map = map

  -- on_key()をラップしてエラーハンドリングを追加
  local safe_on_key = function(char)
    local status, err = pcall(on_key, char)
    if not status then
      util.show_warning('Error in key handler: ' .. tostring(err))
      M.stop()
      core.hide()
    end
  end

  on_key_handler_id = vim.on_key(safe_on_key)
  util.show_info('Enter hint to jump...')
end

--- 入力待ちを停止する
function M.stop()
  if on_key_handler_id then
    vim.uv.close(on_key_handler_id) -- on_keyハンドラを解除
    on_key_handler_id = nil
  end
  input_buffer = ''
  hint_map = {}
end

return M
