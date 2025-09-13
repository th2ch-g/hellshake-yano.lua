" Visual test for hint position issue
" Run this in Vim/Neovim to see where hints actually appear

" Create a test buffer with the problematic text
vnew
setlocal buftype=nofile
setlocal bufhidden=hide
setlocal noswapfile

" Insert the test text
call setline(1, '- **最終更新**: 2025-09-13 (Process8, Process9, Process10, Process50-sub1, sub2, sub3, sub4, sub5, sub6実装完了)')
call setline(2, '    Process8: 実装完了')
call setline(3, 'Process50-sub1 implementation')
call setline(4, '')
call setline(5, 'This is a test with Process8 in the middle')

" Save the file position
normal! gg

" Enable hellshake-yano with debug mode
if exists('g:hellshake_yano')
  let g:hellshake_yano.hint_position = 'start'
  let g:hellshake_yano.use_improved_detection = v:true
  let g:hellshake_yano.use_japanese = v:false
else
  let g:hellshake_yano = {
    \ 'hint_position': 'start',
    \ 'use_improved_detection': v:true,
    \ 'use_japanese': v:false,
    \ 'motion_count': 1
    \ }
endif

echom "Test buffer created. Move with hjkl to trigger hints."
echom "Expected: Hints should appear at 'P' of Process words"
echom "Problem: Hints may appear at 'o' instead"
echom ""
echom "To test: press j or k to trigger hints"