#!/usr/bin/env python3
import json
import os
import re
import glob
from pathlib import Path

def load_mapping():
    """snake_to_camel_mapping.jsonを読み込む"""
    with open('snake_to_camel_mapping.json', 'r') as f:
        return json.load(f)

def convert_file(file_path, mapping):
    """ファイル内のsnake_caseプロパティをcamelCaseに変換"""
    print(f"Converting: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    converted_count = 0

    # プロパティアクセスパターンを変換 (例: config.motion_count → config.motionCount)
    for snake_case, camel_case in mapping.items():
        # .property_name パターン
        pattern1 = rf'\.{re.escape(snake_case)}\b'
        replacement1 = f'.{camel_case}'
        content, count1 = re.subn(pattern1, replacement1, content)

        # {property_name: パターン
        pattern2 = rf'\{{\s*{re.escape(snake_case)}\s*:'
        replacement2 = f'{{{camel_case}:'
        content, count2 = re.subn(pattern2, replacement2, content)

        # {property_name} パターン（分割代入）
        pattern3 = rf'\{{\s*{re.escape(snake_case)}\s*\}}'
        replacement3 = f'{{{camel_case}}}'
        content, count3 = re.subn(pattern3, replacement3, content)

        # 'property_name': パターン
        pattern4 = rf"'{re.escape(snake_case)}':"
        replacement4 = f"'{camel_case}':"
        content, count4 = re.subn(pattern4, replacement4, content)

        # "property_name": パターン
        pattern5 = rf'"{re.escape(snake_case)}":'
        replacement5 = f'"{camel_case}":'
        content, count5 = re.subn(pattern5, replacement5, content)

        total_count = count1 + count2 + count3 + count4 + count5
        if total_count > 0:
            print(f"  {snake_case} → {camel_case}: {total_count} replacements")
            converted_count += total_count

    # ファイルが変更された場合のみ書き込み
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Total conversions: {converted_count}")
        return converted_count
    else:
        print(f"  No changes needed")
        return 0

def main():
    """メイン処理"""
    # マッピングを読み込み
    mapping = load_mapping()

    # testsディレクトリとdenopsディレクトリ内の全.tsファイルを取得
    test_files = glob.glob('tests/*.ts')
    source_files = glob.glob('denops/hellshake-yano/**/*.ts', recursive=True)
    all_files = test_files + source_files

    total_conversions = 0

    print(f"Found {len(test_files)} test files and {len(source_files)} source files to convert")
    print(f"Total files: {len(all_files)}")
    print("-" * 50)

    for file_path in sorted(all_files):
        conversions = convert_file(file_path, mapping)
        total_conversions += conversions
        print()

    print("-" * 50)
    print(f"Total conversions across all files: {total_conversions}")

if __name__ == "__main__":
    main()