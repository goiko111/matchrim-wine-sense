// QA-only copy, loaded after the existing network-denial guard and before React.
// This session is deliberately unsigned and cannot authenticate to a real service.
(() => {
  const project = 'https://cbjynrbvrhcmpaojmqdp.supabase.co';
  const id = '00000000-0000-4000-8000-000000000259';
  const expires = Math.floor(Date.now() / 1000) + 7200;
  const encode = value => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  localStorage.setItem('sb-cbjynrbvrhcmpaojmqdp-auth-token', JSON.stringify({
    access_token: encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: id, role: 'authenticated',
      aud: 'authenticated', iss: project + '/auth/v1', exp: expires }) + '.QA_OFFLINE_INVALID_SIGNATURE',
    refresh_token: 'QA259_NOT_A_REAL_REFRESH_TOKEN', expires_at: expires, expires_in: 7200, token_type: 'bearer',
    user: { id, email: 'offline259@example.invalid', aud: 'authenticated', role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
      created_at: '2026-10-26T00:00:00Z', is_anonymous: false },
  }));
  const fetch = window.fetch.bind(window);
  let calls = 0;
  const status = () => {
    let node = document.getElementById('qa259-counter');
    if (!node && document.body) {
      node = document.createElement('span'); node.id = 'qa259-counter';
      // Radix hides body siblings during a modal; live regions remain in AX.
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      node.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      document.body.append(node);
    }
    if (node) node.textContent = 'QA259 consultas locales: ' + calls;
  };
  window.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
    if (url.href !== project + '/functions/v1/matchrim-master-catalog') return fetch(input, options);
    if (options?.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    calls++; status();
    const body = JSON.parse(options?.body ?? '{}');
    const search = body.operation === 'search' && body.query?.includeUnlisted === true
      && body.query.name === 'La Migratoria' && body.query.winery === 'Bodegas Frontonio'
      && body.query.page === 1 && body.query.limit === 10;
    const detail = body.operation === 'detail' && body.mantalakWineId === 217480;
    if (!search && !detail) return new Response(JSON.stringify({ error: 'QA259_UNEXPECTED_OPERATION' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
    const response = await fetch(search ? '/qa259-search.json' : '/qa259-detail.json', { signal: options.signal });
    return new Response(await response.text(), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  addEventListener('DOMContentLoaded', status);
  addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file' && event.target.files?.length) {
      // Remove only the QA injection control, which otherwise obscures MAX UI.
      document.querySelector('button[aria-label="QA220 cargar etiqueta local"]')?.remove();
    }
  }, true);
})();
