" autoload/hellshake_yano_vim/motion.vim - モーション連打検出
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process1: motion.vim の実装
"
" このモジュールは w/b/e モーションの連打を検出し、
" 自動的にヒント表示をトリガーする機能を提供します。
" Phase A-4: モーション連打検出機能の実装。
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" モーション状態管理
" PLAN.md の仕様に基づくデータ構造
let s:motion_state = {
  \ 'last_motion': '',
  \ 'last_motion_time': 0,
  \ 'motion_count': 0,
  \ 'timeout_ms': 2000,
  \ 'threshold': 2
\ }

" hellshake_yano_vim#motion#init() - 状態変数の初期化
"
" 目的:
"   - s:motion_state を初期値にリセット
"   - プラグインの起動時や再初期化時に呼び出される
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#init()
function! hellshake_yano_vim#motion#init() abort
  let s:motion_state = {
    \ 'last_motion': '',
    \ 'last_motion_time': 0,
    \ 'motion_count': 0,
    \ 'timeout_ms': 2000,
    \ 'threshold': 2
  \ }
endfunction

" hellshake_yano_vim#motion#get_state() - 状態変数の取得（テスト用）
"
" 目的:
"   - スクリプトローカル変数 s:motion_state への読み取り専用アクセスを提供
"   - 主にユニットテストで状態を検証するために使用
"
" @return Dictionary s:motion_state のコピー
"
" 使用例:
"   let l:state = hellshake_yano_vim#motion#get_state()
"   echo l:state.motion_count
function! hellshake_yano_vim#motion#get_state() abort
  return deepcopy(s:motion_state)
endfunction

" hellshake_yano_vim#motion#set_threshold(count) - 閾値の設定
"
" 目的:
"   - ヒント表示トリガーの閾値を設定
"   - デフォルトは2回（2回連打でヒント表示）
"
" パラメータ:
"   @param a:count Number 閾値（1以上の整数）
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#set_threshold(3)
"   " 3回連打でヒント表示されるようになる
function! hellshake_yano_vim#motion#set_threshold(count) abort
  let s:motion_state.threshold = a:count
endfunction

" hellshake_yano_vim#motion#set_timeout(ms) - タイムアウトの設定
"
" 目的:
"   - モーション連打のタイムアウト時間を設定
"   - デフォルトは2000ms（2秒）
"
" パラメータ:
"   @param a:ms Number タイムアウト時間（ミリ秒）
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#set_timeout(1500)
"   " 1.5秒以内に連打する必要がある
function! hellshake_yano_vim#motion#set_timeout(ms) abort
  let s:motion_state.timeout_ms = a:ms
endfunction

" hellshake_yano_vim#motion#handle(motion_key) - モーション処理のメインロジック
"
" 目的:
"   - モーションキー（w/b/e）の連打を検出
"   - 閾値に達した場合はヒント表示をトリガー
"   - 通常のモーション実行も行う
"
" アルゴリズム:
"   1. 現在時刻を取得（reltime()）
"   2. 前回のモーションとの時間差をチェック
"   3. タイムアウト内 && 同じモーション → カウント++
"   4. タイムアウト外 || 異なるモーション → カウント=1にリセット
"   5. カウントが閾値以上 → ヒント表示トリガー & カウントリセット
"   6. 通常モーション実行（ヒント表示しない場合）
"   7. 現在時刻と現在モーションを記録
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e')
"
" @return なし
"
" 使用例:
"   nnoremap <silent> w :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
"
" エラーハンドリング:
"   - 不正なモーションキーの場合はエラーメッセージを表示
"   - reltime() のエラーは try-catch で処理
"
" パフォーマンス特性:
"   - reltime() と reltimefloat() を使用（高精度な時間計測）
"   - 状態更新は最小限の操作で実行
"
" 注意事項:
"   - ヒント表示はブロッキング方式（Phase A-3で確立）
"   - ヒント表示後はカウントをリセット（連続表示を防ぐ）
function! hellshake_yano_vim#motion#handle(motion_key) abort
  " 不正なモーションキーのチェック
  if index(['w', 'b', 'e'], a:motion_key) == -1
    echohl ErrorMsg
    echomsg 'hellshake_yano_vim#motion#handle: invalid motion key: ' . a:motion_key
    echohl None
    return
  endif

  try
    " 1. 現在時刻を取得
    let l:current_time = reltime()

    " 2. 前回のモーションとの時間差をチェック
    let l:should_reset = v:false
    let l:time_diff_ms = 0

    " last_motion_time が初期化されているかチェック（0 ではなくリストかどうか）
    if type(s:motion_state.last_motion_time) == type([])
      " 時間差を計算（ミリ秒）
      let l:time_diff = reltimefloat(reltime(s:motion_state.last_motion_time, l:current_time))
      let l:time_diff_ms = float2nr(l:time_diff * 1000.0)

      " タイムアウトチェック
      if l:time_diff_ms > s:motion_state.timeout_ms
        let l:should_reset = v:true
      endif
    endif

    " 3. 異なるモーションの場合もリセット
    if s:motion_state.last_motion != '' && s:motion_state.last_motion != a:motion_key
      let l:should_reset = v:true
    endif

    " 4. カウントの更新
    if l:should_reset || s:motion_state.motion_count == 0
      " リセット
      let s:motion_state.motion_count = 1
    else
      " 同じモーションをタイムアウト内に実行 → カウント++
      let s:motion_state.motion_count += 1
    endif

    " 5. 閾値チェックとヒント表示トリガー
    let l:should_trigger_hint = v:false
    if s:motion_state.motion_count >= s:motion_state.threshold
      let l:should_trigger_hint = v:true
      " カウントをリセット（連続表示を防ぐ）
      let s:motion_state.motion_count = 0
    endif

    " 6. 通常モーション実行（ヒント表示の前に実行）
    execute 'normal! ' . a:motion_key

    " 7. ヒント表示トリガー（閾値に達した場合）
    if l:should_trigger_hint
      " core#show() を呼び出してヒント表示
      " ブロッキング方式なので、ヒント入力が完了するまで制御は戻らない
      call hellshake_yano_vim#core#show()
    endif

    " 8. 現在時刻と現在モーションを記録
    let s:motion_state.last_motion = a:motion_key
    let s:motion_state.last_motion_time = l:current_time

  catch
    " エラーハンドリング
    echohl ErrorMsg
    echomsg 'hellshake_yano_vim#motion#handle: error occurred: ' . v:exception
    echohl None

    " エラー時は状態をリセット
    call hellshake_yano_vim#motion#init()
  endtry
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
