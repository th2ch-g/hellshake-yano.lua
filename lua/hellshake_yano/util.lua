-- lua/hellshake_yano/util.lua

local M = {}

--- 情報メッセージを表示
-- @param msg string
function M.show_info(msg)
  vim.notify('[HSY] ' .. msg, vim.log.levels.INFO)
end

--- 警告メッセージを表示
-- @param msg string
function M.show_warning(msg)
  vim.notify('[HSY] ' .. msg, vim.log.levels.WARN)
end

return M
