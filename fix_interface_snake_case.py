#!/usr/bin/env python3
import re
import glob
from pathlib import Path

def convert_interface_snake_to_camel(file_path):
    """インターフェース内のsnake_caseプロパティをcamelCaseに変換"""
    print(f"Processing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    conversions = []

    # snake_case -> camelCase のマッピング
    snake_to_camel_map = {
        'use_japanese': 'useJapanese',
        'use_improved_detection': 'useImprovedDetection',
        'per_key_min_length': 'perKeyMinLength',
        'default_min_word_length': 'defaultMinWordLength',
        'current_key_context': 'currentKeyContext',
        'enable_tinysegmenter': 'enableTinySegmenter',
        'segmenter_threshold': 'segmenterThreshold',
        'segmenter_cache_size': 'segmenterCacheSize',
        'enable_fallback': 'enableFallback',
        'fallback_to_regex': 'fallbackToRegex',
        'max_retries': 'maxRetries',
        'cache_enabled': 'cacheEnabled',
        'cache_max_size': 'cacheMaxSize',
        'batch_size': 'batchSize',
        'min_word_length': 'minWordLength',
        'max_word_length': 'maxWordLength',
        'ignore_case': 'ignoreCase',
        'detect_numbers': 'detectNumbers',
        'detect_symbols': 'detectSymbols',
        'auto_detect_language': 'autoDetectLanguage',
        'performance_monitoring': 'performanceMonitoring',
        'default_strategy': 'defaultStrategy',
        'fallback_strategy': 'fallbackStrategy',
        'timeout_ms': 'timeoutMs',
        'retry_delay_ms': 'retryDelayMs',
        'enable_async': 'enableAsync'
    }

    # インターフェース内のプロパティ定義を変換
    for snake_case, camel_case in snake_to_camel_map.items():
        # プロパティ定義パターン（/** コメント */\n  property?: type;）
        pattern = rf'(\s*\/\*\*[^*]*?\*\/\s*\n\s*){re.escape(snake_case)}(\??:\s*[^;]+;)'
        replacement = rf'\1{camel_case}\2'
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

        if new_content != content:
            conversions.append(f"{snake_case} -> {camel_case} (property definition)")
            content = new_content

        # シンプルなプロパティ定義パターン（  property?: type;）
        pattern2 = rf'(\s+){re.escape(snake_case)}(\??:\s*[^;]+;)'
        replacement2 = rf'\1{camel_case}\2'
        new_content = re.sub(pattern2, replacement2, content)

        if new_content != content and new_content not in [c for c in content if f"{snake_case} -> {camel_case}" in str(conversions)]:
            if f"{snake_case} -> {camel_case}" not in str(conversions):
                conversions.append(f"{snake_case} -> {camel_case} (simple property)")
            content = new_content

    # ファイルが変更された場合のみ書き込み
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Converted: {len(conversions)} properties")
        for conversion in conversions:
            print(f"    - {conversion}")
        return len(conversions)
    else:
        print(f"  No changes needed")
        return 0

def main():
    """メイン処理"""
    # インターフェース定義を含むファイルリスト
    source_files = [
        'denops/hellshake-yano/word.ts',
        'denops/hellshake-yano/word/manager.ts',
    ]

    total_conversions = 0

    print(f"Converting interface properties in {len(source_files)} files")
    print("-" * 60)

    for file_path in source_files:
        if Path(file_path).exists():
            conversions = convert_interface_snake_to_camel(file_path)
            total_conversions += conversions
        else:
            print(f"File not found: {file_path}")
        print()

    print("-" * 60)
    print(f"Total conversions: {total_conversions}")

if __name__ == "__main__":
    main()