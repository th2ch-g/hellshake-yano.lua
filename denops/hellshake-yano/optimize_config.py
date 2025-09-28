#!/usr/bin/env python3
import re

def optimize_config_ts():
    with open("config.ts", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. @example ブロック全体を削除
    content = re.sub(r'\s*\*\s*@example[^}]*}\s*\*?\s*```[^`]*```\s*\*?\s*', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # 2. 長いコメント説明を短縮
    content = re.sub(r'\s*\*\s*詳細な説明[^\n]*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\s*\*\s*このプロパティは[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 3. @default値だけ残してコメントを削除
    content = re.sub(r'\s*\*\s*@(since|version|author|description)\s+[^\n]*\n', '', content, flags=re.MULTILINE)
    
    # 4. 空行を統一
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content, flags=re.MULTILINE)
    
    # 5. 型エイリアス前後の冗長コメントを削除
    content = re.sub(r'\/\*\*\s*\*\s*型定義[^\n]*\n\s*\*\/\n', '', content, flags=re.MULTILINE | re.DOTALL)
    
    with open("config.ts", 'w', encoding='utf-8') as f:
        f.write(content)

optimize_config_ts()
print("Config.ts optimized")
