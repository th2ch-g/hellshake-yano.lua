-- lua/hellshake_yano/hint_generator.lua

local config = require('hellshake_yano.config')

local M = {}

--- 指定された数のヒント文字列を生成する
-- @param count number 必要なヒントの数
-- @return table 生成されたヒント文字列の配列
function M.generate(count)
  local conf = config.get()
  local hints = {}
  local single_keys = {}
  for c in conf.single_char_keys:gmatch('.') do
    table.insert(single_keys, c)
  end

  local multi_keys = {}
  for c in conf.multi_char_keys:gmatch('.') do
    table.insert(multi_keys, c)
  end

  -- 1. 単一文字のヒント
  for i = 1, #single_keys do
    if #hints < count then
      table.insert(hints, single_keys[i])
    else
      return hints
    end
  end

  -- 2. 複数文字のヒント
  if #multi_keys > 0 then
    for i = 1, #multi_keys do
      for j = 1, #multi_keys do
        if #hints < count then
          table.insert(hints, multi_keys[i] .. multi_keys[j])
        else
          return hints
        end
      end
    end
  end

  return hints
end

return M
