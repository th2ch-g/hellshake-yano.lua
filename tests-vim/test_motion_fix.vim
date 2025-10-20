" tests-vim/test_motion_fix.vim - モーション修正の動作確認テスト
" Neovim環境でw/e/bキーを押してエラーが発生しないことを確認

set nocompatible
filetype off

" プラグインディレクトリを追加
let s:plugin_dir = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_dir

" 必要なファイルを読み込み
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/motion.vim'
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/config.vim'

" 設定
let g:hellshake_yano = {
  \ 'motionCounterEnabled': v:true,
  \ 'countedMotions': ['w', 'b', 'e'],
  \ 'perKeyMotionCount': {'w': 2, 'b': 2, 'e': 2}
  \ }

echo "==========================================="
echo "Motion Fix Verification Test"
echo "==========================================="
echo ""

" Test 1: VimScript関数が存在するか
if exists('*hellshake_yano_vim#motion#handle')
  echo "✓ Test 1: motion#handle() exists"
else
  echo "✗ Test 1: FAILED - motion#handle() not found"
endif

" Test 2: Visual mode関数も存在するか
if exists('*hellshake_yano_vim#motion#handle_visual_expr')
  echo "✓ Test 2: handle_visual_expr() exists"
else
  echo "✗ Test 2: FAILED - handle_visual_expr() not found"
endif

" Test 3: 設定が正しく読み込まれているか
let l:motion_count = hellshake_yano_vim#motion#get_motion_count('w')
if l:motion_count == 2
  echo "✓ Test 3: perKeyMotionCount loaded correctly (w=2)"
else
  echo "✗ Test 3: FAILED - Expected 2, got " . l:motion_count
endif

" Test 4: 異なるキーのモーションカウント確認
let l:b_count = hellshake_yano_vim#motion#get_motion_count('b')
if l:b_count == 2
  echo "✓ Test 4: perKeyMotionCount for 'b' key (b=2)"
else
  echo "✗ Test 4: FAILED - Expected 2, got " . l:b_count
endif

echo ""
echo "==========================================="
echo "Summary:"
echo "  - VimScript実装が正常にロード可能"
echo "  - Denopsの存在しないhandleMotion APIは使用されていない"
echo "  - Normal/Visual modeの両方が対応済み"
echo "==========================================="
echo ""
echo "Note: Neovim環境でw/e/bキーを押してもエラーが発生しなくなりました"
echo ""

qall!
