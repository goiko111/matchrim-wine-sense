import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
export const restoreAccountLabel151 = (file, source) => {
  if (file !== 'src/components/NativeAccountActions.tsx'
    || hash(source) !== '83351427611a23044638e9e10be1c2a071a2c4db775e9fc44053b1dc5bf26a89') return source;
  const changes = [
    ["    <div className=\"mb-3 flex min-w-0 items-start justify-between gap-3\">\n      <div className=\"min-w-0 [overflow-wrap:anywhere]\" aria-label=\"Cuenta actual\">\n        <p className=\"text-xs font-medium leading-5 text-stone-500\">Tu cuenta</p>\n        <p className=\"text-sm font-semibold leading-6 text-stone-950\" aria-label={user.email ? `Correo de tu cuenta: ${user.email}` : 'Sesion iniciada'}><span aria-hidden=\"true\">{user.email || 'Sesion iniciada'}</span></p>\n      </div>",
      '    <div className="mb-3 flex justify-end">'],
    ['className="h-11 w-11 shrink-0" aria-label="Ajustes de cuenta" title="Ajustes de cuenta" disabled={closing}><Settings aria-hidden="true" className="h-5 w-5" />',
      'className="h-11 w-11" aria-label="Ajustes de cuenta" title="Ajustes de cuenta" disabled={closing}><Settings className="h-5 w-5" />'],
  ];
  for (const [current, previous] of changes) {
    assert.equal(source.split(current).length, 2, 'One exact native account-label inverse');
    source = source.replace(current, previous);
  }
  assert.equal(hash(source), '1168b0d99ef442998350625d39039fceb4ac034fa99f3255c8fc0cd9ce5ded7b',
    'Every prior native account lifecycle/signout/web-gate byte remains exact');
  return source;
};
