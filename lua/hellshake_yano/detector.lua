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
    -- string.gmatchはバイト単位で位置を返すため、UTF-8を考慮
    for word, start_pos in string.gmatch(line, '(' .. conf.word_pattern .. ')()') do
      if #word >= conf.min_word_length then
        -- start_posは次のマッチの開始位置なので、単語の長さを引く
        local byte_col = start_pos - #word
        table.insert(words, {
          text = word,
          lnum = lnum,
          col = vim.fn.byte2col(byte_col), -- バイト列を文字列表現の列に変換
        })
      end
    end
  end

  return words
end

return M
