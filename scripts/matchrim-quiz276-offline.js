// Fault injection in an isolated QA copy only; never bundled into the product.
(() => {
  function findQuizHooks276(fiber) {
    const matches = new Map(), visited = new Set();
    for (let parent = fiber, depth = 0; parent && depth < 80 && !visited.has(parent); parent = parent.return, depth++) {
      visited.add(parent);
      for (const node of [parent, parent.alternate]) {
        let hook = node?.memoizedState;
        for (let count = 0; hook && count < 80; hook = hook.next, count++) {
          const index = hook.next, answers = index?.next, result = answers?.next;
          if (hook.memoizedState !== 'quiz' || index?.memoizedState !== 0
            || !answers?.memoizedState || Object.getPrototypeOf(answers.memoizedState) !== Object.prototype
            || Object.keys(answers.memoizedState).length || result?.memoizedState !== null
            || !Array.isArray(result.next?.memoizedState) || result.next.memoizedState.length
            || typeof result.next.next?.memoizedState !== 'boolean'
            || typeof index.queue?.dispatch !== 'function' || typeof answers.queue?.dispatch !== 'function') continue;
          matches.set(index.queue, { index, answers });
        }
      }
    }
    if (matches.size !== 1) throw Error('QA276_EXACT_EMPTY_QUIZ_STATE_REQUIRED');
    return [...matches.values()][0];
  }

  addEventListener('DOMContentLoaded', () => {
    if (location.protocol !== 'capacitor:') throw Error('QA276_NATIVE_COPY_ONLY');
    let injected = false;
    const clean = () => !localStorage.getItem('matchrim_quiz_result')
      && localStorage.getItem('matchrim_test_completed') !== 'true'
      && !Object.keys(localStorage).some(key => /^sb-.*-auth-token$/.test(key));
    const panel = document.createElement('div'), button = document.createElement('button'), status = document.createElement('span');
    button.textContent = 'QA276 preparar test incompleto';
    Object.assign(panel.style, { position: 'fixed', top: '66px', right: '8px', zIndex: '1000',
      maxWidth: '260px', background: 'white', color: '#111', fontSize: '14px', border: '2px solid #991b1b', padding: '8px' });
    Object.assign(button.style, { minHeight: '44px' });
    panel.append(button, status); document.body.append(panel);
    const update = () => {
      const first = /Pregunta\s*1\s*de\s*20/.test(document.getElementById('root').textContent);
      panel.hidden = !first || !clean(); button.hidden = injected;
      status.textContent = injected && first && clean() ? 'QA276 sin perfil guardado' : '';
    };
    new MutationObserver(update).observe(document.getElementById('root'), { childList: true, characterData: true, subtree: true });
    button.onclick = () => {
      if (injected || !clean() || !/Pregunta\s*1\s*de\s*20/.test(document.getElementById('root').textContent))
        throw Error('QA276_FRESH_ANONYMOUS_FIRST_QUESTION_REQUIRED');
      const found = new Map();
      for (const element of document.querySelectorAll('button')) {
        const key = Object.getOwnPropertyNames(element).find(name => name.startsWith('__reactFiber$'));
        if (!key) continue;
        try { const state = findQuizHooks276(element[key]); found.set(state.index.queue, state); } catch { /* Not the quiz owner. */ }
      }
      if (found.size !== 1) throw Error('QA276_UNIQUE_QUIZ_OWNER_REQUIRED');
      const state = [...found.values()][0]; injected = true; panel.hidden = true;
      state.answers.queue.dispatch({ 20: 'si' }); state.index.queue.dispatch(19);
    };
    update();
  });
})();
