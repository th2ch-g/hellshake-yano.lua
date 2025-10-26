-- lua/hellshake_yano/display.lua

local config = require('hellshake_yano.config')

local M = {}

local ns_id = vim.api.nvim_create_namespace('hellshake_yano')

--- ヒントを表示する
-- @param display_data table {{word=table, hint=string}, ...}
function M.show(display_data)
  M.hide() -- 既存のヒントをクリア
  local buf_id = vim.api.nvim_get_current_buf()
  local conf = config.get()

  local extmarks = {}
  for _, item in ipairs(display_data) do
    table.insert(extmarks, {
      ns_id,
      buf_id,
      item.word.lnum - 1, -- 0-indexed
      item.word.col - 1,  -- 0-indexed
      {
        virt_text = { { item.hint, conf.highlight_hint } },
        virt_text_pos = 'overlay',
      },
    })
  end

  -- vim.api.nvim_buf_set_extmarkは遅いので、nvim_buf_add_highlightのバッチ版相当がないため
  -- 一つずつ設定する
  for _, mark in ipairs(extmarks) do
    vim.api.nvim_buf_set_extmark(mark[2], mark[1], mark[3], mark[4], mark[5])
  end
end

--- ヒントを非表示にする
function M.hide()
  local buf_id = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_clear_namespace(buf_id, ns_id, 0, -1)
end

return M
