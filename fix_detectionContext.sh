#!/bin/bash

# DetectionContext では defaultMinWordLength を minWordLength に修正

find tests -name "*.ts" -exec sed -i '' \
  -e 's/defaultMinWordLength: \([0-9]*\),\?\s*\}\)\s*:\s*DetectionContext/minWordLength: \1\1/g' \
  -e 's/defaultMinWordLength:\s*\([0-9]*\)\s*\}\s*;\s*$/minWordLength: \1\};/g' \
  -e 's/defaultMinWordLength:\s*\([0-9]*\),\s*$/minWordLength: \1,/g' \
  {} \;

# より具体的なパターンでDetectionContextのdefaultMinWordLengthをminWordLengthに変換
find tests -name "*.ts" -exec perl -i -pe '
  # DetectionContext内のdefaultMinWordLengthをminWordLengthに変換
  if (/DetectionContext\s*=\s*{/ .. /}/) {
    s/defaultMinWordLength:/minWordLength:/g;
  }
' {} \;

echo "DetectionContext内のdefaultMinWordLength → minWordLength変換が完了しました。"