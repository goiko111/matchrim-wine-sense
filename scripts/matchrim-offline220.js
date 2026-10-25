// Isolated QA copy only. No account/session/catalogue/matching fixtures.
(() => {
  const attempts = [];
  const blocked = (kind, input) => {
    attempts.push({ kind, origin: (() => { try { return new URL(String(input), location.href).origin; } catch { return 'invalid'; } })() });
    localStorage.setItem('matchrim.qa220.blocked', JSON.stringify(attempts));
  };
  const local = input => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
    return url.protocol === location.protocol && url.host === location.host;
  };
  const fetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    if (!local(input)) { blocked('fetch', input?.url ?? input); return Promise.reject(new TypeError('QA220_EXTERNAL_NETWORK_DISABLED')); }
    return fetch(input, options);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (!local(url)) { blocked('xhr', url); throw new TypeError('QA220_EXTERNAL_NETWORK_DISABLED'); }
    return open.call(this, method, url, ...args);
  };
  window.WebSocket = class { constructor(url) { blocked('websocket', url); throw new TypeError('QA220_EXTERNAL_NETWORK_DISABLED'); } };
  window.EventSource = class { constructor(url) { blocked('eventsource', url); throw new TypeError('QA220_EXTERNAL_NETWORK_DISABLED'); } };
  navigator.sendBeacon = url => { blocked('beacon', url); return false; };
  addEventListener('securitypolicyviolation', event => blocked('csp', event.blockedURI));
  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.textContent = 'QA220 cargar etiqueta local';
    button.setAttribute('aria-label', button.textContent);
    Object.assign(button.style, { position: 'fixed', top: '66px', right: '8px', zIndex: '1000', minHeight: '44px', maxWidth: '230px',
      padding: '8px', border: '2px solid #991b1b', background: 'white', color: '#111', fontSize: '14px' });
    document.body.append(button);
    const update = () => { button.hidden = !document.querySelector('input[type=file]') || !document.body.textContent.includes('Fotografía una etiqueta'); };
    new MutationObserver(update).observe(document.getElementById('root'), { childList: true, characterData: true, subtree: true }); update();
    button.onclick = async () => {
      const input = [...document.querySelectorAll('input[type=file]')].find(value => !value.hasAttribute('capture'));
      if (!input || !document.body.textContent.includes('Fotografía una etiqueta')) throw Error('QA220_LOCAL_MODE_REQUIRED');
      const image = await fetch('/qa220-label.jpg').then(response => response.blob());
      const data = new DataTransfer(); data.items.add(new File([image], 'QA220-resident-img061.jpg', { type: 'image/jpeg' }));
      input.files = data.files; button.hidden = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    };
  });
})();
