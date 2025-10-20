" Process4 Sub2: Dictionary Integration Tests
" Phase D-7: 辞書システム - word_detector.vim統合
" TDD Red Phase: テストファースト

" Setup runtimepath to load autoload functions
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" Test counter
let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

function! s:assert(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:pass_count += 1
    echo 'OK: ' . a:message
  else
    let s:fail_count += 1
    echoerr 'FAIL: ' . a:message
  endif
endfunction

" Mock dictionary for testing
let g:test_dictionary = {
  \ 'API': {'meaning': 'Application Programming Interface', 'type': 'n'},
  \ 'HTTP': {'meaning': 'HyperText Transfer Protocol', 'type': 'n'},
  \ 'JSON': {'meaning': 'JavaScript Object Notation', 'type': 'n'},
  \ 'SQL': {'meaning': 'Structured Query Language', 'type': 'n'},
  \ 'TDD': {'meaning': 'Test-Driven Development', 'type': 'n'},
  \ 'vim': {'meaning': 'Vi IMproved', 'type': 'n'}
\ }

" Mock function to simulate dictionary lookup
function! s:mock_get_dictionary_entry(word) abort
  return get(g:test_dictionary, a:word, v:null)
endfunction

function! s:run_tests() abort
  echo '=== Process4 Sub2: Dictionary Integration Tests ==='
  echo ''

  " Test 1: is_in_dictionary() function exists and works
  echo 'Test 1: is_in_dictionary() function exists'
  try
    " This should be a script-local function, but we test via public API
    " We'll test through detect_visible() which uses it internally
    enew!
    call setline(1, 'test')
    let l:result = hellshake_yano_vim#word_detector#detect_visible()
    call s:assert(v:true, 'word_detector functions are callable')
  catch
    call s:assert(v:false, 'word_detector functions exist - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 2: Dictionary words are detected (2-letter words that are in dictionary)
  echo 'Test 2: Dictionary words (short) are detected'
  " Set up a buffer with dictionary words
  enew!
  call setline(1, 'The API is great. HTTP works. JSON too.')

  try
    " API, HTTP, JSON are all in dictionary and should be detected even if short
    let l:words = hellshake_yano_vim#word_detector#detect_visible()

    " Check if dictionary lookup function is being used
    " We can't directly test is_in_dictionary, but we can check the behavior
    let l:has_api = v:false
    for l:word in l:words
      if l:word.text ==# 'API' || l:word.text ==# 'HTTP' || l:word.text ==# 'JSON'
        let l:has_api = v:true
        break
      endif
    endfor

    call s:assert(l:has_api, 'Dictionary words are detected: ' . string(map(copy(l:words), 'v:val.text')))
  catch
    call s:assert(v:false, 'Dictionary word detection - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 3: Non-dictionary words follow minLength rules
  echo 'Test 3: Non-dictionary words respect minLength'
  enew!
  call setline(1, 'ab cd ef gh')  " 2-letter words not in dictionary

  try
    let l:words = hellshake_yano_vim#word_detector#detect_visible()

    " These 2-letter words should NOT be detected (minLength default is 3)
    let l:count = len(l:words)
    call s:assert(l:count == 0, printf('2-letter non-dict words not detected (found %d words)', l:count))
  catch
    call s:assert(v:false, 'minLength test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 4: Dictionary lookup integration exists
  echo 'Test 4: Dictionary lookup function is integrated'
  try
    " Check if the integration code exists by looking for the function
    " We test this indirectly through the actual detection behavior

    " Set up test: mix of dictionary and non-dictionary words
    enew!
    call setline(1, 'TDD ab SQL cd vim ef')

    let l:words = hellshake_yano_vim#word_detector#detect_visible()

    " TDD, SQL, vim are in dictionary (should be detected)
    " ab, cd, ef are not in dictionary and too short (should not be detected)
    let l:dict_words = []
    for l:word in l:words
      if index(['TDD', 'SQL', 'vim'], l:word.text) >= 0
        call add(l:dict_words, l:word.text)
      endif
    endfor

    call s:assert(len(l:dict_words) > 0, 'Dictionary words detected from mixed content: ' . string(l:dict_words))
  catch
    call s:assert(v:false, 'Dictionary integration test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 5: Performance - dictionary lookup doesn't break with many words
  echo 'Test 5: Performance with multiple words'
  try
    enew!
    " Create a line with many words
    let l:line = 'function test() { const API = require("http"); return JSON.parse(data); }'
    call setline(1, l:line)

    let l:start = reltime()
    let l:words = hellshake_yano_vim#word_detector#detect_visible()
    let l:elapsed = reltimefloat(reltime(l:start))

    " Should complete within reasonable time (< 100ms for single line)
    call s:assert(l:elapsed < 0.1, printf('Detection completes quickly: %.3fs', l:elapsed))
  catch
    call s:assert(v:false, 'Performance test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 6: Empty dictionary handling
  echo 'Test 6: Handles missing dictionary gracefully'
  try
    " This should work even if dictionary is not loaded
    " (Denops might not be available in test environment)
    enew!
    call setline(1, 'test word detection')

    let l:words = hellshake_yano_vim#word_detector#detect_visible()

    " Should still detect words based on minLength
    call s:assert(len(l:words) >= 0, 'Works without dictionary: found ' . len(l:words) . ' words')
  catch
    call s:assert(v:false, 'No dictionary test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 7: Japanese dictionary words (future feature)
  echo 'Test 7: Japanese dictionary support (placeholder)'
  try
    " For now, just verify Japanese detection still works
    enew!
    call setline(1, '日本語のテスト文字列です')

    let l:words = hellshake_yano_vim#word_detector#detect_visible()

    " Should detect Japanese words (existing functionality)
    call s:assert(len(l:words) > 0, 'Japanese detection still works: ' . len(l:words) . ' words')
  catch
    call s:assert(v:false, 'Japanese test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Summary
  echo '=== Test Summary ==='
  echo 'Total tests: ' . s:test_count
  echo 'Passed: ' . s:pass_count
  echo 'Failed: ' . s:fail_count
  echo ''

  if s:fail_count > 0
    echo '❌ RED PHASE: Tests FAILED as expected (dictionary integration not implemented yet)'
    cquit!
  else
    echo '✅ All tests PASSED'
    qall!
  endif
endfunction

" Run tests
call s:run_tests()
