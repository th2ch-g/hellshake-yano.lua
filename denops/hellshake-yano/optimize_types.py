#!/usr/bin/env python3
import re

def optimize_types_ts():
    with open("types.ts", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. @example ブロックを削除
    content = re.sub(r'\s*\*\s*@example[^}]*}\s*\*?\s*```[^`]*```\s*\*?\s*', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # 2. 冗長な型説明を削除
    content = re.sub(r'\s*\*\s*型定義[^\n]*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\s*\*\s*このインターフェース[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 3. @deprecated ブロックの長い説明を短縮
    content = re.sub(r'(\s*\*\s*@deprecated[^\n]*)\n(\s*\*\s*代わりに[^\n]*\n)*(\s*\*\s*移行方法[^\n]*\n)*(\s*\*\s*@see[^\n]*\n)*', r'\1\n', content, flags=re.MULTILINE)
    
    # 4. 重複する説明を削除
    content = re.sub(r'\s*\*\s*@(since|version|author)\s+[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 5. 空行の統一
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content, flags=re.MULTILINE)
    
    with open("types.ts", 'w', encoding='utf-8') as f:
        f.write(content)

optimize_types_ts()
print("Types.ts optimized")
