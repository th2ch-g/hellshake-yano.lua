#!/usr/bin/env python3
import re
import glob
from pathlib import Path

def remove_deleted_function_references(file_path):
    """削除された関数の参照を削除"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modifications = []

    # 1. インポート文から削除された関数を削除
    # toUnifiedConfig の削除
    pattern1 = r',?\s*toUnifiedConfig\s*,?'
    content = re.sub(pattern1, lambda m: ',' if m.group().startswith(',') and m.group().endswith(',') else '', content)
    if content != original_content:
        modifications.append("Removed toUnifiedConfig from imports")

    # fromUnifiedConfig の削除
    pattern2 = r',?\s*fromUnifiedConfig\s*,?'
    content = re.sub(pattern2, lambda m: ',' if m.group().startswith(',') and m.group().endswith(',') else '', content)
    if content != original_content:
        modifications.append("Removed fromUnifiedConfig from imports")

    # 重複したカンマを修正
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r'{\s*,', '{', content)
    content = re.sub(r',\s*}', '}', content)

    # 2. 関数呼び出しの削除/置換
    # toUnifiedConfig(config) → config (直接使用)
    content = re.sub(r'\btoUnifiedConfig\s*\(\s*([^)]+)\s*\)', r'\1', content)
    if re.search(r'\btoUnifiedConfig\s*\(', original_content):
        modifications.append("Replaced toUnifiedConfig() calls with direct config usage")

    # fromUnifiedConfig(config) → config (直接使用)
    content = re.sub(r'\bfromUnifiedConfig\s*\(\s*([^)]+)\s*\)', r'\1', content)
    if re.search(r'\bfromUnifiedConfig\s*\(', original_content):
        modifications.append("Replaced fromUnifiedConfig() calls with direct config usage")

    # 3. テストで削除された関数をテストしている部分をコメントアウト
    # toUnifiedConfig関数のテストをコメントアウト
    content = re.sub(
        r'(Deno\.test\(.*toUnifiedConfig.*?\{[^}]*?\}\);)',
        r'// \1 // Function removed in Process4 Sub3-2',
        content, flags=re.DOTALL
    )

    # fromUnifiedConfig関数のテストをコメントアウト
    content = re.sub(
        r'(Deno\.test\(.*fromUnifiedConfig.*?\{[^}]*?\}\);)',
        r'// \1 // Function removed in Process4 Sub3-2',
        content, flags=re.DOTALL
    )

    # ファイルが変更された場合のみ書き込み
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Modified: {', '.join(modifications)}")
        return len(modifications)
    else:
        print(f"  No changes needed")
        return 0

def main():
    """メイン処理"""
    # 削除された関数を参照しているファイルリスト
    target_files = [
        'tests/naming_convention_test.ts',
        'tests/lifecycle_config_migration_test.ts',
        'tests/core_test.ts',
        'tests/conversion_functions_simplification_test.ts',
        'tests/config_conversion_test.ts',
        'tests/conversion_functions_deletion_test.ts'
    ]

    total_modifications = 0

    print(f"Removing deleted function references from {len(target_files)} files")
    print("-" * 60)

    for file_path in target_files:
        if Path(file_path).exists():
            modifications = remove_deleted_function_references(file_path)
            total_modifications += modifications
        else:
            print(f"File not found: {file_path}")
        print()

    print("-" * 60)
    print(f"Total modifications: {total_modifications}")

if __name__ == "__main__":
    main()