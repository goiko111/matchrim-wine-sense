import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const local = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host || 'localhost');
const denied = () => { throw new Error('MATCHRIM185_EXTERNAL_NETWORK_DENIED'); };
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!local(url.hostname)) return Promise.reject(new Error('MATCHRIM185_EXTERNAL_FETCH_DENIED'));
  return originalFetch(input, init);
};
const net = require('node:net');
for (const name of ['connect', 'createConnection']) {
  const original = net[name];
  net[name] = (...args) => {
    const options = args[0];
    const host = options && typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
    if (!local(host)) return denied();
    return original(...args);
  };
}
const tls = require('node:tls'), originalTLS = tls.connect;
tls.connect = (...args) => {
  const options = args.find(item => item && typeof item === 'object') || {};
  const host = options.host || options.servername || (typeof args[1] === 'string' ? args[1] : 'localhost');
  if (!local(host)) return denied();
  return originalTLS(...args);
};
require('node:dgram').createSocket = denied;
