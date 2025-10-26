-- lua/hellshake_yano/config.lua

local M = {}

local default_config = {
  enabled = true,
  -- ヒント文字 (単一文字、複数文字)
  single_char_keys = 'asdfghjkl',
  multi_char_keys = 'qwertyuiopnmzxcvb',
  -- モーション連打検出
  motion_counter_enabled = true,
  counted_motions = { 'h', 'j', 'k', 'l', 'w', 'b', 'e' },
  default_motion_count = 3, -- ヒント表示に必要な連打回数
  per_key_motion_count = {}, --例: { j = 2 }
  motion_timeout = 1000, -- 連打とみなす時間 (ms)
  -- キーリピート(長押し)抑制
  suppress_on_key_repeat = true,
  key_repeat_threshold = 50, -- リピートとみなす時間 (ms)
  key_repeat_reset_delay = 300, -- リピート状態をリセットするまでの時間 (ms)
  -- 単語検出
  min_word_length = 3,
  -- word_pattern = '\\k\\+',
  word_pattern = '%w+',
  -- ハイライト
  highlight_hint = 'DiffAdd',
  highlight_input = 'DiffText',
}

M.config = {}

--- ユーザー設定とデフォルト設定をマージする
-- @param user_config table | nil
function M.setup(user_config)
  M.config = vim.tbl_deep_extend('force', {}, default_config, user_config or {})
end

--- 現在の設定テーブルを返す
function M.get()
  return M.config
end

--- モーション検出の対象となるキーを取得する
function M.get_motion_keys()
  if M.config.counted_motions and #M.config.counted_motions > 0 then
    return M.config.counted_motions
  end
  return default_config.counted_motions
end

--- キーごとのモーション閾値を取得する
-- @param key string
function M.get_motion_count_for_key(key)
  return M.config.per_key_motion_count[key] or M.config.default_motion_count
end

return M
