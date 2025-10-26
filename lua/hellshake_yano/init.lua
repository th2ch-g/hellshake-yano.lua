-- lua/hellshake_yano/init.lua

local M = {}

M.config = require('hellshake_yano.config')
M.core = require('hellshake_yano.core')

--- ユーザー設定でプラグインをセットアップする
--- @param user_config table | nil ユーザー設定テーブル
function M.setup(user_config)
  M.config.setup(user_config)
end

--- ヒントを表示する
function M.show()
  M.core.show()
end

--- ヒントを非表示にする
function M.hide()
  M.core.hide()
end

--- プラグインを有効化する
function M.enable()
  M.core.enable()
end

--- プラグインを無効化する
function M.disable()
  M.core.disable()
end

--- プラグインの有効/無効を切り替える
function M.toggle()
  M.core.toggle()
end

return M
