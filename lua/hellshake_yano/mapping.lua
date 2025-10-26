-- lua/hellshake_yano/mapping.lua

local config = require('hellshake_yano.config')
local motion = require('hellshake_yano.motion')

local M = {}

--- モーションキーのマッピングを設定する
function M.setup()
  if not config.get().motion_counter_enabled then return end
  for _, key in ipairs(config.get_motion_keys()) do
    vim.keymap.set({ 'n', 'x' }, key, function()
      return motion.process(key)
    end, { silent = true, noremap = true, expr = true, desc = 'HSY Motion: ' .. key })
  end
end

--- モーションキーのマッピングを削除する
function M.clear()
  for _, key in ipairs(config.get_motion_keys()) do
    -- エラーを無視してキーマップを削除
    pcall(vim.keymap.del, { 'n', 'x' }, key)
  end
end

return M
