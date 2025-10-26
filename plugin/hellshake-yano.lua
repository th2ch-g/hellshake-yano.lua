-- -- plugin/hellshake-yano.lua
--
-- -- ロードガード
-- if vim.g.loaded_hellshake_yano_lua then
--   return
-- end
-- vim.g.loaded_hellshake_yano_lua = 1
--
-- local config = require('hellshake_yano.config')
-- local motion = require('hellshake_yano.motion')
-- local core = require('hellshake_yano.core')
-- local state = require('hellshake_yano.state')
-- local util = require('hellshake_yano.util')
--
-- -- ユーザー設定を読み込んで初期化
-- config.setup(vim.g.hellshake_yano)
--
-- -- コマンド定義
-- vim.api.nvim_create_user_command('HellshakeYanoShow', core.show, { desc = 'Show Hellshake Yano hints' })
-- vim.api.nvim_create_user_command('HellshakeYanoHide', core.hide, { desc = 'Hide Hellshake Yano hints' })
-- vim.api.nvim_create_user_command('HellshakeYanoEnable', core.enable, { desc = 'Enable Hellshake Yano' })
-- vim.api.nvim_create_user_command('HellshakeYanoDisable', core.disable, { desc = 'Disable Hellshake Yano' })
-- vim.api.nvim_create_user_command('HellshakeYanoToggle', core.toggle, { desc = 'Toggle Hellshake Yano' })
--
-- -- キーマッピング
-- local function nmap(lhs, rhs, desc)
--   vim.keymap.set('n', lhs, rhs, { silent = true, noremap = true, desc = 'hellshake-yano: ' .. desc })
-- end
--
-- nmap('<Leader>h', core.show, 'Show hints')
--
-- -- モーションキーのマッピングをセットアップ/クリアする関数
-- function _G.HellshakeYanoSetupMappings()
--   for _, key in ipairs(config.get_motion_keys()) do
--     vim.keymap.set({ 'n', 'x' }, key, function()
--       return motion.process(key)
--     end, { silent = true, noremap = true, expr = true })
--   end
-- end
--
-- function _G.HellshakeYanoClearMappings()
--   for _, key in ipairs(config.get_motion_keys()) do
--     pcall(vim.keymap.del, { 'n', 'x' }, key)
--   end
-- end
--
-- -- 初期マッピングを設定
-- if config.get().enabled then
--   _G.HellshakeYanoSetupMappings()
-- end
--
-- -- 自動コマンド
-- local augroup = vim.api.nvim_create_augroup('HellshakeYano', { clear = true })
--
-- vim.api.nvim_create_autocmd('BufEnter', {
--   group = augroup,
--   pattern = '*',
--   callback = function()
--     state.init_buffer_state(vim.api.nvim_get_current_buf())
--   end,
-- })
--
-- vim.api.nvim_create_autocmd({ 'BufLeave', 'WinLeave' }, {
--   group = augroup,
--   pattern = '*',
--   callback = function()
--     if state.is_hints_visible() then
--       core.hide()
--     end
--   end,
-- })
--
-- util.show_info('Hellshake Yano (Lua) loaded')

-- -- plugin/hellshake-yano.lua
--
-- -- ロードガード
-- if vim.g.loaded_hellshake_yano_lua then
--   return
-- end
-- vim.g.loaded_hellshake_yano_lua = 1
--
-- -- ★★★ ここが修正箇所 ★★★
-- -- 中心的なモジュールを最初に読み込む
-- local core = require('hellshake_yano.core')
-- local config = require('hellshake_yano.config')
-- local motion = require('hellshake_yano.motion')
-- local state = require('hellshake_yano.state')
-- local util = require('hellshake_yano.util')
-- -- ★★★ 修正はここまで ★★★
--
--
-- -- ユーザー設定を読み込んで初期化
-- config.setup(vim.g.hellshake_yano)
--
-- -- コマンド定義
-- -- coreが完全にロードされているので、core.showなどはnilにならない
-- vim.api.nvim_create_user_command('HellshakeYanoShow', core.show, { desc = 'Show Hellshake Yano hints' })
-- vim.api.nvim_create_user_command('HellshakeYanoHide', core.hide, { desc = 'Hide Hellshake Yano hints' })
-- vim.api.nvim_create_user_command('HellshakeYanoEnable', core.enable, { desc = 'Enable Hellshake Yano' })
-- vim.api.nvim_create_user_command('HellshakeYanoDisable', core.disable, { desc = 'Disable Hellshake Yano' })
-- vim.api.nvim_create_user_command('HellshakeYanoToggle', core.toggle, { desc = 'Toggle Hellshake Yano' })
--
-- -- キーマッピング
-- local function nmap(lhs, rhs, desc)
--   vim.keymap.set('n', lhs, rhs, { silent = true, noremap = true, desc = 'hellshake-yano: ' .. desc })
-- end
--
-- nmap('<Leader>h', core.show, 'Show hints')
--
-- -- モーションキーのマッピングをセットアップ/クリアする関数
-- function _G.HellshakeYanoSetupMappings()
--   if not config.get().motion_counter_enabled then return end
--   for _, key in ipairs(config.get_motion_keys()) do
--     vim.keymap.set({ 'n', 'x' }, key, function()
--       return motion.process(key)
--     end, { silent = true, noremap = true, expr = true })
--   end
-- end
--
-- function _G.HellshakeYanoClearMappings()
--   for _, key in ipairs(config.get_motion_keys()) do
--     pcall(vim.keymap.del, { 'n', 'x' }, key)
--   end
-- end
--
-- -- 初期マッピングを設定
-- if config.get().enabled then
--   _G.HellshakeYanoSetupMappings()
-- end
--
-- -- 自動コマンド
-- local augroup = vim.api.nvim_create_augroup('HellshakeYano', { clear = true })
--
-- vim.api.nvim_create_autocmd('BufEnter', {
--   group = augroup,
--   pattern = '*',
--   callback = function()
--     state.init_buffer_state(vim.api.nvim_get_current_buf())
--   end,
-- })
--
-- vim.api.nvim_create_autocmd({ 'BufLeave', 'WinLeave' }, {
--   group = augroup,
--   pattern = '*',
--   callback = function()
--     if state.is_hints_visible() then
--       core.hide()
--     end
--   end,
-- })
--
-- util.show_info('Hellshake Yano (Lua) loaded')


-- plugin/hellshake-yano.lua

-- ロードガード
if vim.g.loaded_hellshake_yano_lua then
  return
end
vim.g.loaded_hellshake_yano_lua = 1

-- 依存関係の少ないモジュールから順番に読み込む
local config = require('hellshake_yano.config')
local state = require('hellshake_yano.state')
local util = require('hellshake_yano.util')
local mapping = require('hellshake_yano.mapping')
local core = require('hellshake_yano.core')

-- ユーザー設定を読み込んで初期化
config.setup(vim.g.hellshake_yano)

-- コマンド定義
vim.api.nvim_create_user_command('HellshakeYanoShow', core.show, { desc = 'Show Hellshake Yano hints' })
vim.api.nvim_create_user_command('HellshakeYanoHide', core.hide, { desc = 'Hide Hellshake Yano hints' })
vim.api.nvim_create_user_command('HellshakeYanoEnable', core.enable, { desc = 'Enable Hellshake Yano' })
vim.api.nvim_create_user_command('HellshakeYanoDisable', core.disable, { desc = 'Disable Hellshake Yano' })
vim.api.nvim_create_user_command('HellshakeYanoToggle', core.toggle, { desc = 'Toggle Hellshake Yano' })

-- キーマッピング
vim.keymap.set('n', '<Leader>h', core.show, { silent = true, noremap = true, desc = 'hellshake-yano: Show hints' })

-- モーションキーの初期マッピングを設定
if config.get().enabled then
  mapping.setup()
end

-- 自動コマンド
local augroup = vim.api.nvim_create_augroup('HellshakeYano', { clear = true })

vim.api.nvim_create_autocmd('BufEnter', {
  group = augroup,
  pattern = '*',
  callback = function()
    state.init_buffer_state(vim.api.nvim_get_current_buf())
  end,
})

vim.api.nvim_create_autocmd({ 'BufLeave', 'WinLeave' }, {
  group = augroup,
  pattern = '*',
  callback = function()
    if state.is_hints_visible() then
      core.hide()
    end
  end,
})

util.show_info('Hellshake Yano (Lua) loaded')
