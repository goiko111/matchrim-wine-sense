/* QA95 only. The server replaces exactly one configuration sentinel below. */
(() => {
  "use strict";
  const loopback = "http://127.0.0.1:4605";
  const configuration = /*__QA95_CONFIGURATION__*/ null;
  const baseFetch = globalThis.fetch.bind(globalThis);
  const setImmutable = (object, key, value) => Object.defineProperty(object, key, {
    value, configurable: false, writable: false
  });
  let ready = false;
  const require = (condition, message) => { if (!condition) throw new Error("QA95: " + message); };
  const contextHeaders = () => ({
    "Content-Type": "application/json",
    "X-QA95-Run": configuration.run,
    "X-QA95-Reset": configuration.resetNonce,
    "X-QA95-Persona": String(configuration.persona)
  });
  const diagnostic = (endpoint, body) => baseFetch(loopback + "/__qa95/" + endpoint, {
    method: "POST", headers: contextHeaders(), body: JSON.stringify(body),
    credentials: "omit", redirect: "error", cache: "no-store"
  });
  const report = kind => { if (configuration) void diagnostic("blocked", { kind }).catch(() => {}); };
  const deny = kind => { report(kind); throw new TypeError("QA95 blocked " + kind); };
  const targetURL = value => {
    const url = new URL(value, location.href);
    require(!url.username && !url.password, "URL credentials refused");
    return url;
  };
  const localAsset = url => url.origin === configuration.origin && !url.pathname.startsWith("/__qa95/");
  const storageSnapshot = () => ({
    quizResultPresent: localStorage.getItem("matchrim_quiz_result") !== null,
    quizAnswersPresent: localStorage.getItem("matchrim_quiz_answers") !== null,
    scanHistoryPresent: localStorage.getItem("matchrim.scan_history.v1") !== null,
    authPresent: localStorage.getItem(configuration.authKey) !== null
  });

  // Install the fence synchronously, before any asynchronous boot work or app JS.
  setImmutable(globalThis, "fetch", async (input, init) => {
    if (!ready) return deny("fetch");
    const original = new Request(input instanceof Request ? input : targetURL(input).href, init);
    const url = targetURL(original.url);
    if (url.origin === configuration.backend && /^\/(auth|rest|functions)\/v1\//.test(url.pathname)) {
      if (!["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"].includes(original.method)) return deny("fetch");
      const headers = new Headers(contextHeaders());
      for (const key of ["accept", "content-type", "prefer", "range", "range-unit"]) {
        if (original.headers.has(key)) headers.set(key, original.headers.get(key));
      }
      const bearer = original.headers.get("authorization");
      const synthetic = bearer && configuration.allowedTokens.some(token => bearer === "Bearer " + token);
      // Supabase's bundled public API key is not needed by the in-memory adapter.
      // Drop it, including the anonymous bearer equivalent; reject other tokens.
      if (synthetic) headers.set("authorization", bearer);
      else if (bearer && bearer !== "Bearer " + original.headers.get("apikey")) return deny("fetch");
      const body = ["GET", "HEAD"].includes(original.method) ? undefined : await original.clone().text();
      const mapped = configuration.origin + "/__qa95/backend" + url.pathname + url.search;
      return baseFetch(mapped, {
        method: original.method, headers, body, credentials: "omit", redirect: "error",
        cache: "no-store", signal: original.signal
      });
    }
    if (!localAsset(url) || !["GET", "HEAD"].includes(original.method)) return deny("fetch");
    // Never carry an app bearer, cookie, API key or URL credentials to assets.
    return baseFetch(url.href, {
      method: original.method, credentials: "omit", redirect: "error", cache: "no-store",
      signal: original.signal
    });
  });

  const originalOpen = XMLHttpRequest.prototype.open;
  setImmutable(XMLHttpRequest.prototype, "open", function(method, value, ...rest) {
    if (!ready || !localAsset(targetURL(value)) || !["GET", "HEAD"].includes(String(method).toUpperCase())) return deny("xhr");
    return originalOpen.call(this, method, targetURL(value).href, ...rest);
  });
  setImmutable(navigator, "sendBeacon", () => deny("beacon"));
  for (const [name, kind] of [["WebSocket", "websocket"], ["EventSource", "eventsource"],
      ["Worker", "worker"], ["SharedWorker", "worker"], ["RTCPeerConnection", "webrtc"],
      ["webkitRTCPeerConnection", "webrtc"]]) {
    if (name in globalThis) setImmutable(globalThis, name, function() { return deny(kind); });
  }
  setImmutable(globalThis, "open", () => deny("navigation"));
  if (navigator.serviceWorker) {
    setImmutable(navigator.serviceWorker, "register", () => Promise.reject(new TypeError("QA95 service workers forbidden")));
  }
  // CSP is the independent subresource fence. Native navigation/external-open
  // plugins remain a parent bundle/configuration responsibility, not a JS claim.
  document.addEventListener("securitypolicyviolation", () => report("csp"));
  document.addEventListener("click", event => {
    const anchor = event.target.closest && event.target.closest("a[href]");
    if (anchor && !localAsset(targetURL(anchor.href))) {
      event.preventDefault(); event.stopImmediatePropagation(); report("navigation");
    }
  }, true);
  document.addEventListener("submit", event => {
    const action = event.target.action || location.href;
    if (!localAsset(targetURL(action))) {
      event.preventDefault(); event.stopImmediatePropagation(); report("navigation");
    }
  }, true);

  const start = async () => {
    require(configuration && configuration.origin === loopback, "loopback configuration required");
    require(configuration.backend === "https://cbjynrbvrhcmpaojmqdp.supabase.co", "exact backend shim only");
    require(configuration.bundle === "wine.matchrim.qa95synthetic", "dedicated QA95 bundle contract required");
    require(location.origin === configuration.origin && window === window.top, "loopback top-level only");
    require(Number.isInteger(configuration.persona) && configuration.persona >= 0 && configuration.persona < 50, "explicit selected persona required");
    require(configuration.allowedTokens.length === 2 && configuration.allowedTokens.every(token => token.endsWith(".invalid-synthetic-signature")), "synthetic JWTs only");
    require(configuration.initialSession.user.email.endsWith("@matchrim.invalid"), "synthetic identity only");
    if (navigator.serviceWorker) require((await navigator.serviceWorker.getRegistrations()).length === 0, "existing service worker: refuse startup");
    const context = JSON.stringify([configuration.run, configuration.persona, configuration.resetNonce]);
    const storageReset = localStorage.getItem("__qa95.context") !== context;
    if (storageReset) {
      // This origin must only be loaded in the isolated QA95 bundle. No owner's
      // browser, qa91live store, native keychain, or product storage is accessed.
      localStorage.clear();
      sessionStorage.clear();
      if (globalThis.caches) {
        for (const key of await caches.keys()) await caches.delete(key);
      }
      localStorage.setItem(configuration.authKey, JSON.stringify(configuration.initialSession));
      localStorage.setItem("matchrim.local_profile_owner.v1", configuration.owner);
      localStorage.setItem("__qa95.context", context);
    } else {
      const existing = localStorage.getItem(configuration.authKey);
      if (existing) {
        const session = JSON.parse(existing);
        require(configuration.allowedTokens.includes(session.access_token), "non-synthetic existing session refused");
      }
    }
    const response = await diagnostic("boot", { persona: configuration.persona, storageReset });
    require(response.ok, "stale selection or boot receipt rejected");
    let lastSnapshot = "";
    const reportStorage = () => {
      const snapshot = storageSnapshot();
      const text = JSON.stringify(snapshot);
      if (text !== lastSnapshot) {
        lastSnapshot = text;
        void diagnostic("storage", snapshot).catch(() => {});
      }
    };
    reportStorage();
    setInterval(reportStorage, 200);
    ready = true;
    if (document.readyState === "loading") {
      await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }
    const held = [...document.querySelectorAll('script[type="application/x-qa95-held"]')];
    require(held.length > 0, "missing gated app bundles");
    for (const old of held) {
      const url = targetURL(old.getAttribute("data-qa95-src"));
      require(localAsset(url) && url.pathname.startsWith("/assets/"), "local frozen bundle required");
      const script = document.createElement("script");
      script.type = old.getAttribute("data-qa95-type");
      script.src = url.href;
      script.async = false;
      for (const key of ["crossorigin", "integrity", "nomodule"]) {
        if (old.hasAttribute(key)) script.setAttribute(key, old.getAttribute(key));
      }
      old.replaceWith(script);
    }
  };
  void start().catch(error => {
    ready = false;
    report("bootstrap");
    // Held app scripts stay inert on a failed guard. No synthetic UI pass is
    // inferred from an error screen or from the mere presence of the WebView.
    const showFailure = () => {
      document.body.textContent = "QA95 synthetic bootstrap blocked";
      console.error("QA95 bootstrap stopped:", error.message);
    };
    if (document.body) showFailure();
    else document.addEventListener("DOMContentLoaded", showFailure, { once: true });
  });
})();
