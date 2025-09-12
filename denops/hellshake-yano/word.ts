import type { Denops } from "@denops/std";

export interface Word {
  text: string;
  line: number;
  col: number;
}

/**
 * 画面内の単語を検出する
 */
export async function detectWords(denops: Denops): Promise<Word[]> {
  const words: Word[] = [];

  // 画面の表示範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;

  // 各行から単語を検出
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;

    // 単語を検出（\b\w+\b パターン）
    const wordRegex = /\b\w+\b/g;
    let match;

    while ((match = wordRegex.exec(lineText)) !== null) {
      words.push({
        text: match[0],
        line: line,
        col: match.index + 1, // Vimの列番号は1から始まる
      });
    }
  }

  return words;
}
