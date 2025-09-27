#!/bin/bash

# minWordLength を defaultMinWordLength に変換

find tests -name "*.ts" -exec sed -i '' \
  -e 's/minWordLength:/defaultMinWordLength:/g' \
  -e 's/minWordLength,/defaultMinWordLength,/g' \
  -e 's/minWordLength\s*=/defaultMinWordLength =/g' \
  {} \;

echo "minWordLength → defaultMinWordLength 変換が完了しました。"