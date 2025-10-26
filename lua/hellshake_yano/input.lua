-- lua/hellshake_yano/input.lua

local M = {}

local util = require('hellshake_yano.util')

-- モジュールの状態を管理するテーブル
-- これにより、requireのタイミングを気にせずに関数を呼び出せる
local S = {
  input_buffer = '',
  hint_map = {},
  is_active = false, -- 現在キー入力を受け付けているか
}

--- ジャンプを実行し、クリーンアップする
local function jump(word)
  local core = require('hellshake_yano.core')
  M.stop() -- 先にキー入力を停止

  -- pcallでエラーをキャッチして安全にカーソル移動
  local ok, err = pcall(vim.api.nvim_win_set_cursor, 0, { word.lnum, word.col - 1 })
  if not ok then
    util.show_warning('Jump failed: ' .. tostring(err))
  end

  core.hide()
end

--- キー入力ハンドラ
-- @param char string 入力された文字
local function on_key(char)
  -- ★★★ 修正点: is_activeフラグをチェック ★★★
  -- M.stop()が呼ばれた後は、このガードによって即座に関数が終了する
  if not S.is_active then
    return false -- このハンドラはもうアクティブではないので、キー入力をNeovimに渡す
  end

  local core = require('hellshake_yano.core')

  -- <Esc> や <C-c> でキャンセル
  if char == '<Esc>' or char == '<C-c>' then
    M.stop()
    core.hide()
    return true -- キー入力を消費
  end

  S.input_buffer = S.input_buffer .. char

  -- 完全一致をチェック
  if S.hint_map[S.input_buffer] then
    jump(S.hint_map[S.input_buffer])
    return true
  end

  -- 部分一致をチェック
  local has_partial_match = false
  for hint, _ in pairs(S.hint_map) do
    if hint:sub(1, #S.input_buffer) == S.input_buffer then
      has_partial_match = true
      break
    end
  end

  -- 部分一致がなければ終了
  if not has_partial_match then
    M.stop()
    core.hide()
    util.show_warning('Invalid hint: ' .. S.input_buffer)
  end
  return true -- キー入力を消費
end

--- ユーザーの入力を待ち受ける
-- @param map table ヒントと単語のマッピング
function M.wait_for_input(map)
  M.stop() -- 念のため既存の状態をクリア
  S.input_buffer = ''
  S.hint_map = map
  S.is_active = true -- ★★★ 状態をアクティブに ★★★

  -- ハンドラがまだ登録されていなければ登録する
  -- 毎回登録・解除するのではなく、一度だけ登録する
  if not M.handler_registered then
    vim.on_key(on_key)
    M.handler_registered = true
  end

  util.show_info('Enter hint to jump...')
end

--- 入力待ちを停止する
function M.stop()
  S.is_active = false -- ★★★ 状態を非アクティブに ★★★
  S.input_buffer = ''
  S.hint_map = {}
  -- 注: vim.on_keyの解除は行わない。代わりにis_activeフラグで制御する。
end

return M
