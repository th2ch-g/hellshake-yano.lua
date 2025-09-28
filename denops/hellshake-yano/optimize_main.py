#!/usr/bin/env python3
import re

def optimize_main_ts():
    with open("main.ts", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. @example ブロックを削除
    content = re.sub(r'\s*\*\s*@example[^}]*}\s*\*?\s*```[^`]*```\s*\*?\s*', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # 2. 冗長な説明を削除
    content = re.sub(r'\s*\*\s*このファイルは[^\n]*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\s*\*\s*process4[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 3. 重複コメントを削除
    content = re.sub(r'\s*\/\/ process4[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 4. 空行統一
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content, flags=re.MULTILINE)
    
    with open("main.ts", 'w', encoding='utf-8') as f:
        f.write(content)

optimize_main_ts()
print("Main.ts optimized")
