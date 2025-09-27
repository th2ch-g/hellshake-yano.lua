#!/bin/bash

# 最終的なエラー修正

find tests -name "*.ts" -exec sed -i '' \
  -e 's/fallback_to_regex/fallbackToRegex/g' \
  -e 's/"overlay"/"end"/g' \
  {} \;

echo "最終エラー修正が完了しました。"