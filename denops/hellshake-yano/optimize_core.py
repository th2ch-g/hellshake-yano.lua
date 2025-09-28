#!/usr/bin/env python3
import re
import sys

def optimize_core_ts(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. 長いコメントブロックを短縮
    # @example ブロック全体を削除（基本的な使用法は自明のため）
    content = re.sub(r'\s*\*\s*@example[^}]*}\s*\*?\s*```[^`]*```\s*\*?\s*', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # 2. 冗長な説明コメントを削除
    # "このメソッドは..." など自明な説明を削除
    content = re.sub(r'\s*\*\s*このメソッドは[^\n]*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\s*\*\s*この関数は[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 3. 重複している型説明を削除
    content = re.sub(r'\s*\*\s*@param\s+\w+\s*-\s*[^\n]*インスタンス[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 4. 空のコメント行を削除
    content = re.sub(r'\s*\*\s*\n', '', content, flags=re.MULTILINE)
    
    # 5. 連続する空行を単一に統一
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content, flags=re.MULTILINE)
    
    # 6. 冗長なJSDocタグを削除（@sinceや@versionなど）
    content = re.sub(r'\s*\*\s*@(since|version|author)\s+[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 7. 重複するインポートコメントを削除
    content = re.sub(r'//\s*重複インポートを削除[^\n]*\n', '', content, flags=re.MULTILINE)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    optimize_core_ts("core.ts", "core.ts")
    print("Core.ts optimized")

