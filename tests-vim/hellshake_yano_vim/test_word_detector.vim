" tests-vim/hellshake_yano_vim/test_word_detector.vim - 単語検出機能のユニットテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process1: 単語検出テスト作成
"
" 目的:
"   - 画面内の単語を自動検出する word_detector#detect_visible() 関数のテスト
"   - Phase A-2: 固定座標から単語ベースのヒント表示への移行を検証
"
" テスト対象関数:
"   - hellshake_yano_vim#word_detector#detect_visible()
"
" データ構造:
"   返り値は以下の形式の Dictionary のリスト:
"   {
"     'text': 'hello',      " 単語文字列
"     'lnum': 10,           " 行番号（1-indexed）
"     'col': 5,             " 開始列（1-indexed）
"     'end_col': 10         " 終了列（matchstrposの戻り値）
"   }

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" Test_detect_words_basic: 基本的な英単語検出
" 目的: 1行に複数の単語が含まれる場合の検出と座標データの正確性を検証
function! Test_detect_words_basic() abort
  " テスト用バッファを作成
  new
  call setline(1, 'hello world vim')

  " カーソルを1行目に移動
  call cursor(1, 1)

  " 単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 3つの単語が検出されるか検証
  call AssertEqual(3, len(l:words), 'should detect 3 words in single line')

  " 1つ目の単語: 'hello'
  call AssertEqual('hello', l:words[0].text, 'first word should be "hello"')
  call AssertEqual(1, l:words[0].lnum, 'first word lnum should be 1')
  call AssertEqual(1, l:words[0].col, 'first word col should be 1')
  call AssertEqual(6, l:words[0].end_col, 'first word end_col should be 6')

  " 2つ目の単語: 'world'
  call AssertEqual('world', l:words[1].text, 'second word should be "world"')
  call AssertEqual(1, l:words[1].lnum, 'second word lnum should be 1')
  call AssertEqual(7, l:words[1].col, 'second word col should be 7')
  call AssertEqual(12, l:words[1].end_col, 'second word end_col should be 12')

  " 3つ目の単語: 'vim'
  call AssertEqual('vim', l:words[2].text, 'third word should be "vim"')
  call AssertEqual(1, l:words[2].lnum, 'third word lnum should be 1')
  call AssertEqual(13, l:words[2].col, 'third word col should be 13')
  call AssertEqual(16, l:words[2].end_col, 'third word end_col should be 16')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_detect_words_multiline: 複数行の単語検出
" 目的: 3～5行のテキストから全単語を検出し、行番号が正しく記録されているか検証
function! Test_detect_words_multiline() abort
  " テスト用バッファを作成（4行）
  new
  call setline(1, ['function test', 'let x 10', 'call echo', 'endfunction'])

  " カーソルを2行目に移動
  call cursor(2, 1)

  " 単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 最低でも8つの単語が検出されるか検証
  call Assert(len(l:words) >= 8, 'should detect at least 8 words from 4 lines')

  " 行番号が正しく記録されているか検証
  " 1行目の単語（function, test）
  let l:line1_words = filter(copy(l:words), 'v:val.lnum == 1')
  call Assert(len(l:line1_words) >= 2, 'should have at least 2 words in line 1')

  " 2行目の単語（let, x, 10）
  let l:line2_words = filter(copy(l:words), 'v:val.lnum == 2')
  call Assert(len(l:line2_words) >= 3, 'should have at least 3 words in line 2')

  " 3行目の単語（call, echo）
  let l:line3_words = filter(copy(l:words), 'v:val.lnum == 3')
  call Assert(len(l:line3_words) >= 2, 'should have at least 2 words in line 3')

  " 4行目の単語（endfunction）
  let l:line4_words = filter(copy(l:words), 'v:val.lnum == 4')
  call Assert(len(l:line4_words) >= 1, 'should have at least 1 word in line 4')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_detect_words_visible_area: 画面内範囲の検出
" 目的: line('w0') ～ line('w$') の範囲のみ検出し、範囲外の単語が含まれていないことを確認
function! Test_detect_words_visible_area() abort
  " テスト用バッファを作成（30行）
  new
  let l:lines = []
  for l:i in range(1, 30)
    call add(l:lines, 'line' . l:i . ' word' . l:i)
  endfor
  call setline(1, l:lines)

  " カーソルを15行目に移動
  call cursor(15, 1)

  " 画面の表示範囲を取得
  let l:w0 = line('w0')
  let l:wlast = line('w$')

  " 単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 全ての単語が画面内範囲に含まれているか検証
  for l:word in l:words
    call Assert(l:word.lnum >= l:w0, printf('word lnum %d should be >= w0 %d', l:word.lnum, l:w0))
    call Assert(l:word.lnum <= l:wlast, printf('word lnum %d should be <= w$ %d', l:word.lnum, l:wlast))
  endfor

  " 少なくとも1つの単語が検出されるか検証
  call Assert(len(l:words) > 0, 'should detect at least one word in visible area')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_detect_words_empty_line: 空行の処理
" 目的: 空行をスキップして次の行を処理し、エラーを投げずに空配列を返すか検証
function! Test_detect_words_empty_line() abort
  " テスト用バッファを作成（空行を含む）
  new
  call setline(1, ['hello', '', 'world', '', '', 'vim'])

  " カーソルを1行目に移動
  call cursor(1, 1)

  " 単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " エラーを投げずに実行されたか検証
  call Assert(type(l:words) == type([]), 'should return a list even with empty lines')

  " 空行以外の単語が検出されているか検証
  " 空行（2, 4, 5行目）以外に3つの単語（hello, world, vim）が検出されるはず
  call Assert(len(l:words) >= 3, 'should detect at least 3 words skipping empty lines')

  " 検出された単語に空文字列が含まれていないか検証
  for l:word in l:words
    call Assert(len(l:word.text) > 0, 'word text should not be empty string')
  endfor

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_detect_words_position_data: 座標データの正確性
" 目的: col が1-indexedで正しいか、end_col が matchstrpos() の戻り値と一致するか、
"       text が実際の単語文字列と一致するか検証
function! Test_detect_words_position_data() abort
  " テスト用バッファを作成
  new
  call setline(1, '  test_function  another_word  ')

  " カーソルを1行目に移動
  call cursor(1, 1)

  " 単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 2つの単語が検出されるか検証
  call AssertEqual(2, len(l:words), 'should detect 2 words')

  " 1つ目の単語: 'test_function' (空白2つの後、col=3)
  call AssertEqual('test_function', l:words[0].text, 'first word text should be "test_function"')
  call AssertEqual(1, l:words[0].lnum, 'first word lnum should be 1')
  call AssertEqual(3, l:words[0].col, 'first word col should be 3 (1-indexed)')
  call AssertEqual(16, l:words[0].end_col, 'first word end_col should be 16')

  " 2つ目の単語: 'another_word' (col=18)
  call AssertEqual('another_word', l:words[1].text, 'second word text should be "another_word"')
  call AssertEqual(1, l:words[1].lnum, 'second word lnum should be 1')
  call AssertEqual(18, l:words[1].col, 'second word col should be 18 (1-indexed)')
  call AssertEqual(30, l:words[1].end_col, 'second word end_col should be 30')

  " text フィールドが実際のバッファ内容と一致するか再確認
  let l:line = getline(1)
  for l:word in l:words
    " col-1 から end_col-col の長さで部分文字列を取得（0-indexed変換）
    let l:extracted = strpart(l:line, l:word.col - 1, l:word.end_col - l:word.col)
    call AssertEqual(l:word.text, l:extracted,
      \ printf('word.text should match extracted string at col %d', l:word.col))
  endfor

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_word_detector.vim (RED phase)...'
  echo ''
  call RunAllTests()
endif
