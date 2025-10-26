-- lua/hellshake_yano/detector.lua

local config = require('hellshake_yano.config')

local M = {}

--- 画面に表示されている単語を検出する
-- @return table|nil table of words {text=string, lnum=number, col=number}
function M.detect_visible()
  local conf = config.get()
  local words = {}
  local win_id = vim.api.nvim_get_current_win()
  local buf_id = vim.api.nvim_win_get_buf(win_id)

  -- 表示されている行の範囲を取得
  local first_line = vim.fn.line('w0')
  local last_line = vim.fn.line('w$')

  if first_line == 0 or last_line == 0 then
    return nil
  end

  local lines = vim.api.nvim_buf_get_lines(buf_id, first_line - 1, last_line, false)

  for i, line in ipairs(lines) do
    local lnum = first_line + i - 1
    local last_end_byte = 1

    while true do
      local start_byte, end_byte = string.find(line, conf.word_pattern, last_end_byte)

      if not start_byte then
        break
      end

      local word = string.sub(line, start_byte, end_byte)
      if #word >= conf.min_word_length then
        -- ★★★ ここからが修正箇所 ★★★
        -- 単語が始まる位置の直前までの部分文字列を取得する
        local prefix_of_line = string.sub(line, 1, start_byte - 1)

        -- その部分文字列の画面上での幅を計算し、1を足して列番号(1-indexed)とする
        -- これにより、マルチバイト文字やタブ文字が正しく扱われる
        local col = vim.fn.strdisplaywidth(prefix_of_line) + 1
        -- ★★★ 修正はここまで ★★★

        table.insert(words, {
          text = word,
          lnum = lnum,
          col = col,
        })
      end

      last_end_byte = end_byte + 1
    end
  end

  return words
end

return M
