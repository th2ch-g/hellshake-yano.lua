-- lua/hellshake_yano/core.lua

local config = require('hellshake_yano.config')
local detector = require('hellshake_yano.detector')
local hint_generator = require('hellshake_yano.hint_generator')
local display = require('hellshake_yano.display')
-- local input = require('hellshake_yano.input')
local state = require('hellshake_yano.state')
local util = require('hellshake_yano.util')

local M = {}

function M.show()
  if state.is_hints_visible() or not config.get().enabled then
    return
  end

  -- 1. 単語を検出
  local words = detector.detect_visible()
  if not words or #words == 0 then
    util.show_warning('No words detected on screen.')
    return
  end

  -- 2. ヒントを生成
  local hints = hint_generator.generate(#words)
  if not hints or #hints == 0 then
    util.show_warning('Failed to generate hints.')
    return
  end

  -- 3. ヒントと単語をマッピング
  local hint_map = {}
  local display_data = {}
  for i = 1, #words do
    if i > #hints then break end
    local word = words[i]
    local hint = hints[i]
    hint_map[hint] = word
    table.insert(display_data, { word = word, hint = hint })
  end

  state.set_hints_visible(true)

  -- 4. ヒントを表示
  display.show(display_data)

  -- 5. ユーザーの入力を待つ
  input.wait_for_input(hint_map)
end

function M.hide()
  if not state.is_hints_visible() then
    return
  end
  input.stop()
  display.hide()
  state.set_hints_visible(false)
end

function M.enable()
  if config.get().enabled then return end
  config.get().enabled = true
  _G.HellshakeYanoSetupMappings()
  util.show_info('Enabled')
end

function M.disable()
  if not config.get().enabled then return end
  M.hide()
  config.get().enabled = false
  _G.HellshakeYanoClearMappings()
  util.show_info('Disabled')
end

function M.toggle()
  if config.get().enabled then
    M.disable()
  else
    M.enable()
  end
end

return M
