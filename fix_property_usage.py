#!/usr/bin/env python3
import re
import glob
from pathlib import Path

def fix_property_usage(file_path):
    """実装部分でのsnake_caseプロパティ使用を修正"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modifications = []

    # プロパティアクセスパターンの修正
    property_mappings = {
        'min_word_length': 'minWordLength',
        'max_word_length': 'maxWordLength',
        'enable_tinysegmenter': 'enableTinySegmenter',
    }

    for snake_case, camel_case in property_mappings.items():
        # .property_name パターン
        pattern1 = rf'\.{re.escape(snake_case)}\b'
        replacement1 = f'.{camel_case}'
        new_content = re.sub(pattern1, replacement1, content)

        if new_content != content:
            modifications.append(f"{snake_case} -> {camel_case} (property access)")
            content = new_content

        # config.property_name in string check パターン
        pattern2 = rf"'{re.escape(snake_case)}'\s+in\s+config"
        replacement2 = f"'{camel_case}' in config"
        new_content = re.sub(pattern2, replacement2, content)

        if new_content != content:
            modifications.append(f"{snake_case} -> {camel_case} (in check)")
            content = new_content

        # config.property_name instanceof check パターン
        pattern3 = rf"config\.{re.escape(snake_case)}\b"
        replacement3 = f"config.{camel_case}"
        new_content = re.sub(pattern3, replacement3, content)

        if new_content != content:
            modifications.append(f"{snake_case} -> {camel_case} (config access)")
            content = new_content

    # ファイルが変更された場合のみ書き込み
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Modified: {len(modifications)} usages")
        for modification in modifications:
            print(f"    - {modification}")
        return len(modifications)
    else:
        print(f"  No changes needed")
        return 0

def main():
    """メイン処理"""
    # 実装ファイルリスト
    source_files = [
        'denops/hellshake-yano/word.ts',
        'denops/hellshake-yano/word/manager.ts',
        'denops/hellshake-yano/main.ts',
    ]

    total_modifications = 0

    print(f"Fixing property usage in {len(source_files)} files")
    print("-" * 60)

    for file_path in source_files:
        if Path(file_path).exists():
            modifications = fix_property_usage(file_path)
            total_modifications += modifications
        else:
            print(f"File not found: {file_path}")
        print()

    print("-" * 60)
    print(f"Total modifications: {total_modifications}")

if __name__ == "__main__":
    main()