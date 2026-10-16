import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const BASELINE = '67b9086366500b08bd80e5620571bdcade371d0a';
const ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const FALLBACK = '/private/tmp/Matchrim91-backend-web-preserve';
const PREFIX = 'supabase/functions/';
const PROVIDER = `${PREFIX}_shared/matchrim-ai-provider.ts`;
const OPENAI = `${PREFIX}_shared/matchrim-openai.ts`;
const SHIM = `${PREFIX}_shared/matchrim72/matchrim-ai-provider.ts`;
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const OLD_KEY_DIAGNOSTIC = 'LOVABLE_API_KEY not configured';
const OLD_PAYMENT_DIAGNOSTIC = 'Se requiere pago. Por favor, a\u00f1ade cr\u00e9ditos a tu cuenta de Lovable.';
const DIRECT_COUNTS = new Map([
  ['ai-wine-chat', 1], ['analyze-distributor-prices', 1], ['analyze-restaurant-prices', 1],
  ['analyze-shop-link', 1], ['analyze-wine-region', 1], ['calculate-wine-affinity', 1],
  ['detect-wine-regions', 1], ['extract-distributor-ocr', 1], ['extract-distributor-pdf', 1],
  ['extract-distributor-text', 1], ['extract-restaurant-ocr', 1], ['extract-restaurant-pdf', 1],
  ['extract-restaurant-text', 1], ['extract-wine-label-ocr', 2], ['extract-wines-ocr', 1],
  ['extract-wines-pdf', 1], ['extract-wines-text', 1], ['scan-food-pairing', 1],
  ['scan-wine-menu', 1], ['search-wine-image', 1], ['search-wines-v75', 1],
  ['search-wines', 1], ['wine-details', 2], ['wine-search', 3],
]);
const SHARED_TARGETS = [
  'analyze-wine-region-v72', 'calculate-wine-affinity-v72', 'detect-wine-regions-v72',
  'restaurant-workspace91', 'scan-wine-menu-v72',
];
const TARGETS = [...DIRECT_COUNTS.keys(), ...SHARED_TARGETS].sort();
const SUPPORT = [
  PROVIDER, SHIM, `${PREFIX}_shared/matchrim-catalog-search-v75.ts`,
  `${PREFIX}_shared/matchrim-restaurant91.ts`, `${PREFIX}_shared/matchrim72/matchrim-affinity.ts`,
  `${PREFIX}_shared/matchrim72/matchrim-learning.ts`,
  `${PREFIX}_shared/matchrim72/matchrim-menu-grounding.ts`,
  `${PREFIX}_shared/matchrim72/matchrim-scan-money.ts`,
  `${PREFIX}_shared/matchrim72/matchrim-scan-values.ts`,
  `${PREFIX}analyze-wine-region-v72/grounding.ts`, `${PREFIX}analyze-wine-region/grounding.ts`,
];
const BASELINE_FILES = new Set([...TARGETS.map(name => `${PREFIX}${name}/index.ts`), ...SUPPORT]);
const EXECUTABLE_FILES = new Set([...BASELINE_FILES, OPENAI]);
const LOCAL_OVERRIDES = new Set([PROVIDER, OPENAI]);
const TYPE_REPAIR_TARGETS = new Set([
  'calculate-wine-affinity-v72', 'calculate-wine-affinity', 'scan-wine-menu-v72', 'scan-wine-menu',
]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const blobSha = value => createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex');
const fail = message => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const inside = (root, path) => {
  const child = relative(root, path);
  return child === '' || (!child.startsWith('..' + '/') && child !== '..' && !isAbsolute(child));
};

function gitAt(root, args, allowFailure = false) {
  const result = spawnSync('git', ['--no-optional-locks', '-C', root, ...args], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    if (allowFailure) return null;
    fail(`Read-only Git command failed: ${args[0]}`);
  }
  return result.stdout;
}

function parse(path, content) {
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  check(source.parseDiagnostics.length === 0, `Cannot parse TypeScript without errors: ${path}`);
  return source;
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, child => walk(child, visit));
}

function propertyName(node) {
  return node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : null;
}

function objectProperty(object, name, path) {
  check(ts.isObjectLiteralExpression(object), `Expected inline object: ${path}:${name}`);
  check(object.properties.every(item => ts.isPropertyAssignment(item)
    && propertyName(item.name) !== null), `Unexpected object property shape: ${path}:${name}`);
  const found = object.properties.filter(item => propertyName(item.name) === name);
  check(found.length === 1, `Expected one ${name} property: ${path}`);
  return found[0];
}

function editsFor(source) {
  const edits = [];
  const add = (start, end, replacement, kind) => {
    check(Number.isInteger(start) && Number.isInteger(end) && start >= 0
      && end >= start && end <= source.text.length, `Invalid source range: ${source.fileName}`);
    edits.push({ start, end, replacement, kind });
  };
  const replace = (node, replacement, kind) => add(node.getStart(source), node.end, replacement, kind);
  return { edits, add, replace };
}

function applyEdits(source, edits) {
  const ordered = [...edits].sort((left, right) => left.start - right.start || left.end - right.end);
  let position = 0;
  let content = '';
  const records = [];
  for (const edit of ordered) {
    check(edit.start >= position, `Overlapping source edits: ${source.fileName}`);
    const before = source.text.slice(edit.start, edit.end);
    const start = source.getLineAndCharacterOfPosition(edit.start);
    const end = source.getLineAndCharacterOfPosition(edit.end);
    content += source.text.slice(position, edit.start) + edit.replacement;
    position = edit.end;
    records.push({ kind: edit.kind, startOffset: edit.start, endOffset: edit.end,
      offsetEncoding: 'utf16', startLine: start.line + 1, startColumn: start.character + 1,
      endLine: end.line + 1, endColumn: end.character + 1,
      before, after: edit.replacement, beforeSha256: sha256(before), afterSha256: sha256(edit.replacement),
      ...(edit.runtimeEquivalence ? { typeOnly: true, runtimeEquivalence: edit.runtimeEquivalence } : {}) });
  }
  content += source.text.slice(position);
  parse(source.fileName, content);
  return { content, changes: records };
}

function erasedRuntime(path, content) {
  const emitted = ts.transpileModule(content, { fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      removeComments: true, sourceMap: false, newLine: ts.NewLineKind.LineFeed } });
  check(!emitted.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error),
    `Cannot erase types for runtime-equivalence audit: ${path}`);
  const source = ts.createSourceFile(`${path}.erased.js`, emitted.outputText,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  check(source.parseDiagnostics.length === 0, `Cannot parse erased runtime: ${path}`);
  const fingerprint = node => {
    const children = [];
    ts.forEachChild(node, child => { children.push(fingerprint(child)); });
    return [node.kind, children.length ? children : node.getText(source)];
  };
  return { javaScriptSha256: sha256(emitted.outputText), astSha256: sha256(JSON.stringify(fingerprint(source))) };
}

function typeOnlyRepairs(path, content) {
  const name = path.slice(PREFIX.length).split('/')[0];
  if (!TYPE_REPAIR_TARGETS.has(name) || path !== `${PREFIX}${name}/index.ts`) return [];
  const source = parse(path, content);
  const { edits, replace } = editsFor(source);
  const clients = [];
  const results = [];
  walk(source, node => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)
      && node.typeName.text === 'ReturnType' && node.typeArguments?.length === 1
      && ts.isTypeQueryNode(node.typeArguments[0]) && ts.isIdentifier(node.typeArguments[0].exprName)
      && node.typeArguments[0].exprName.text === 'createClient') clients.push(node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'result') results.push(node);
  });
  check(clients.length === 1 && clients[0].getText(source) === 'ReturnType<typeof createClient>'
    && ts.isParameter(clients[0].parent) && ts.isIdentifier(clients[0].parent.name)
    && clients[0].parent.name.text === 'supabaseClient', `Unexpected inherited client parameter type: ${path}`);
  replace(clients[0], 'ReturnType<typeof createClient<any, string>>', 'type-only-specialize-existing-client-return-type');
  if (name === 'scan-wine-menu-v72') {
    check(results.length === 1 && results[0].type && ts.isTypeLiteralNode(results[0].type)
      && results[0].type.getText(source) === '{ vinos?: unknown; wines?: unknown; coverage?: unknown }',
    'Unexpected inherited v72 menu result annotation');
    replace(results[0].type, '{ vinos?: unknown; wines?: unknown; coverage?: unknown; moneda?: unknown; layout?: unknown }',
      'type-only-declare-already-read-menu-result-properties');
  }
  const before = erasedRuntime(path, content);
  for (const edit of edits) {
    const singleFix = content.slice(0, edit.start) + edit.replacement + content.slice(edit.end);
    parse(path, singleFix);
    const after = erasedRuntime(path, singleFix);
    check(before.javaScriptSha256 === after.javaScriptSha256 && before.astSha256 === after.astSha256,
      `Type-only repair changed erased runtime: ${path}`);
    edit.runtimeEquivalence = { verified: true, method: 'TypeScript-erased JavaScript byte equality and AST fingerprint equality',
      parserVersion: ts.version, before, after };
  }
  const combined = applyEdits(source, edits).content;
  const after = erasedRuntime(path, combined);
  check(before.javaScriptSha256 === after.javaScriptSha256 && before.astSha256 === after.astSha256,
    `Combined type-only repairs changed erased runtime: ${path}`);
  return edits;
}

function transformGateway(path, content, expectedCalls, typeEdits = []) {
  const source = parse(path, content);
  const { edits, add, replace } = editsFor(source);
  edits.push(...typeEdits);
  const calls = [];
  const keyReads = [];
  walk(source, node => {
    if (!ts.isCallExpression(node)) return;
    if (node.expression.getText(source) === 'Deno.env.get'
      && node.arguments.some(arg => ts.isStringLiteral(arg) && arg.text === 'LOVABLE_API_KEY')) keyReads.push(node);
    if (ts.isIdentifier(node.expression) && node.expression.text === 'fetch'
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === GATEWAY) calls.push(node);
  });
  check(calls.length === expectedCalls && keyReads.length === 1, `Unexpected provider/key call count: ${path}`);
  const keyRead = keyReads[0];
  const declaration = keyRead.parent;
  check(keyRead.arguments.length === 1 && ts.isVariableDeclaration(declaration)
    && declaration.initializer === keyRead && ts.isIdentifier(declaration.name) && !declaration.type
    && ts.isVariableDeclarationList(declaration.parent)
    && (declaration.parent.flags & ts.NodeFlags.Const) !== 0, `Unexpected key declaration: ${path}`);
  const keyName = declaration.name.text;
  const removedAuth = [];
  const inits = [];
  for (const call of calls) {
    check(call.arguments.length === 2 && !call.questionDotToken && !call.typeArguments,
      `Unexpected gateway fetch shape: ${path}`);
    const init = call.arguments[1];
    const method = objectProperty(init, 'method', path).initializer;
    check(ts.isStringLiteral(method) && method.text === 'POST', `Expected POST gateway request: ${path}`);
    const body = objectProperty(init, 'body', path).initializer;
    check(ts.isCallExpression(body) && body.expression.getText(source) === 'JSON.stringify'
      && body.arguments.length === 1 && ts.isObjectLiteralExpression(body.arguments[0]),
    `Unexpected gateway body shape: ${path}`);
    const headers = objectProperty(init, 'headers', path).initializer;
    const authorization = objectProperty(headers, 'Authorization', path);
    const value = authorization.initializer;
    check(ts.isTemplateExpression(value) && value.head.text === 'Bearer '
      && value.templateSpans.length === 1 && value.templateSpans[0].literal.text === ''
      && ts.isIdentifier(value.templateSpans[0].expression)
      && value.templateSpans[0].expression.text === keyName, `Unexpected Authorization value: ${path}`);
    const index = headers.properties.indexOf(authorization);
    const next = headers.properties[index + 1];
    check(next && /^,\s*$/.test(content.slice(authorization.end, next.getStart(source))),
      `Expected comma after old Authorization property: ${path}`);
    add(authorization.getStart(source), authorization.end + 1, '', 'remove-old-provider-authorization-only');
    removedAuth.push(authorization);
    replace(call.expression, 'fetchMatchrimAiChat', 'route-gateway-through-shared-helper');
    add(call.arguments[0].getStart(source), init.getStart(source), '', 'remove-old-provider-url-argument');
    inits.push(init);
  }
  replace(keyRead, 'hasMatchrimOpenAiKey()', 'replace-secret-read-with-boolean-preflight');
  walk(source, node => {
    if (!ts.isIdentifier(node)) return;
    check(!['hasOpenAiKey', 'hasMatchrimOpenAiKey', 'fetchMatchrimAiChat', 'getMatchrimOpenAiModel'].includes(node.text),
      `New helper binding already exists in baseline: ${path}`);
    if (node.text !== keyName || removedAuth.some(auth => node.pos >= auth.pos && node.end <= auth.end)) return;
    const parent = node.parent;
    const booleanPreflight = (ts.isIfStatement(parent) && parent.expression === node)
      || (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken
        && ts.isIfStatement(parent.parent) && parent.parent.expression === parent);
    check(node === declaration.name || booleanPreflight, `Unexpected old key use outside boolean preflight: ${path}`);
    replace(node, 'hasOpenAiKey', 'rename-boolean-preflight-binding');
  });
  walk(source, node => {
    if (!ts.isStringLiteral(node) || node.text !== OLD_KEY_DIAGNOSTIC) return;
    const parent = node.parent;
    const errorConstructor = ts.isNewExpression(parent) && ts.isIdentifier(parent.expression)
      && parent.expression.text === 'Error';
    const consoleDiagnostic = ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)
      && ts.isIdentifier(parent.expression.expression) && parent.expression.expression.text === 'console'
      && parent.expression.name.text === 'error';
    check((errorConstructor || consoleDiagnostic) && parent.arguments?.length === 1 && parent.arguments[0] === node,
      `Unexpected runtime key diagnostic shape: ${path}`);
    add(node.getStart(source) + 1, node.end - 1, 'Matchrim OpenAI key not configured',
      'replace-exact-legacy-key-runtime-diagnostic');
  });
  const imports = source.statements.filter(ts.isImportDeclaration);
  check(imports.length > 0, `No import insertion point: ${path}`);
  const aiRim = path === `${PREFIX}ai-wine-chat/index.ts`;
  const names = ['hasMatchrimOpenAiKey', 'fetchMatchrimAiChat', ...(aiRim ? ['getMatchrimOpenAiModel'] : [])];
  add(imports.at(-1).end, imports.at(-1).end,
    `\nimport { ${names.join(', ')} } from '../_shared/matchrim-openai.ts';`, 'add-shared-openai-import');
  if (aiRim) {
    const prompts = [];
    const models = [];
    const paymentDiagnostics = [];
    walk(source, node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'systemPrompt') prompts.push(node);
      if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'model'
        && ts.isStringLiteral(node.initializer) && node.initializer.text === 'google/gemini-2.5-pro'
        && !inits.some(init => node.pos >= init.pos && node.end <= init.end)) models.push(node);
      if (ts.isStringLiteral(node) && node.text === OLD_PAYMENT_DIAGNOSTIC) paymentDiagnostics.push(node);
    });
    check(prompts.length === 1 && prompts[0].initializer
      && ts.isNoSubstitutionTemplateLiteral(prompts[0].initializer), `Unexpected aiRIM system prompt: ${path}`);
    const prompt = prompts[0].initializer;
    const phrase = ', "En mi experiencia"';
    const raw = prompt.getText(source);
    const offset = raw.indexOf(phrase);
    check(offset !== -1 && raw.indexOf(phrase, offset + phrase.length) === -1, 'Unexpected aiRIM experience instruction');
    add(prompt.getStart(source) + offset, prompt.getStart(source) + offset + phrase.length, '',
      'remove-false-firsthand-experience-instruction');
    check(models.length === 1, 'Expected exactly one aiRIM query-log model metadata field');
    const model = models[0];
    const insert = model.parent.parent;
    check(ts.isObjectLiteralExpression(model.parent) && ts.isCallExpression(insert)
      && insert.arguments.length === 1 && insert.arguments[0] === model.parent
      && ts.isPropertyAccessExpression(insert.expression) && insert.expression.name.text === 'insert',
    'Unexpected aiRIM query-log insert shape');
    const from = insert.expression.expression;
    check(ts.isCallExpression(from) && ts.isPropertyAccessExpression(from.expression)
      && from.expression.name.text === 'from' && from.arguments.length === 1
      && ts.isStringLiteral(from.arguments[0]) && from.arguments[0].text === 'liquid_intelligence_queries',
    'aiRIM model metadata must belong only to liquid_intelligence_queries');
    let owner = model.parent;
    while (owner && !ts.isVariableDeclaration(owner)) owner = owner.parent;
    check(owner && ts.isIdentifier(owner.name) && owner.name.text === 'logAiRimQuery', 'Unexpected aiRIM metadata owner');
    replace(model.initializer, "getMatchrimOpenAiModel('quality')", 'record-actual-streaming-helper-model-metadata');
    const thenAccess = insert.parent;
    const thenCall = thenAccess?.parent;
    const catchAccess = thenCall?.parent;
    const catchCall = catchAccess?.parent;
    check(thenAccess && ts.isPropertyAccessExpression(thenAccess) && thenAccess.name.text === 'then'
      && thenCall && ts.isCallExpression(thenCall) && thenCall.expression === thenAccess
      && thenCall.arguments.length === 1 && thenCall.arguments[0].getText(source) === '() => {}'
      && catchAccess && ts.isPropertyAccessExpression(catchAccess) && catchAccess.name.text === 'catch'
      && catchCall && ts.isCallExpression(catchCall) && catchCall.expression === catchAccess
      && catchCall.arguments.length === 1
      && catchCall.arguments[0].getText(source) === '(err) => console.error("Error logging aiRIM query:", err)',
    'Unexpected inherited aiRIM PromiseLike logging chain');
    add(thenCall.arguments[0].end, thenCall.arguments[0].end,
      ', (err: unknown) => console.error("Error logging aiRIM query:", err)',
      'type-safe-postgrest-promiselike-rejection-handler');
    add(thenCall.end, catchCall.end, '', 'remove-unsupported-promiselike-catch-preserving-query-semantics');
    check(paymentDiagnostics.length === 1, 'Expected exactly one aiRIM legacy 402 payment diagnostic');
    const payment = paymentDiagnostics[0];
    check(ts.isPropertyAssignment(payment.parent) && payment.parent.initializer === payment
      && propertyName(payment.parent.name) === 'error', 'Unexpected aiRIM payment diagnostic field');
    let response = payment.parent;
    while (response && !ts.isNewExpression(response)) response = response.parent;
    check(response && ts.isIdentifier(response.expression) && response.expression.text === 'Response'
      && response.arguments?.length === 2, 'Unexpected aiRIM payment response shape');
    const status = objectProperty(response.arguments[1], 'status', path).initializer;
    check(ts.isNumericLiteral(status) && status.text === '402', 'aiRIM payment diagnostic must belong only to HTTP 402');
    add(payment.getStart(source) + 1, payment.end - 1, 'El servicio de IA no dispone de credito suficiente.',
      'replace-airim-402-user-diagnostic-only');
  }
  return applyEdits(source, edits);
}

const SHIM_CONTENT = `import { runMatchrimAi as runSharedMatchrimAi } from '../matchrim-ai-provider.ts';
export type { MatchrimAiResult } from '../matchrim-ai-provider.ts';

export const runMatchrimAi = async (request: Parameters<typeof runSharedMatchrimAi>[0]) => {
  const result = await runSharedMatchrimAi(request);
  if (result.complete !== true) throw new Error('La respuesta de IA esta incompleta. Repite el analisis.');
  return result;
};
`;

function exportedBindings(source) {
  const result = new Set();
  for (const statement of source.statements) {
    if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) result.add(declaration.name.text);
      }
    } else if (statement.name && ts.isIdentifier(statement.name)) result.add(statement.name.text);
  }
  return result;
}

function dependencies(path, content) {
  const source = parse(path, content);
  walk(source, node => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      check(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]), `Nonliteral dynamic import: ${path}`);
    }
    check(!(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require'),
      `Unreviewed require dependency: ${path}`);
  });
  const metadata = ts.preProcessFile(content, true, true);
  check(!metadata.referencedFiles.length && !metadata.typeReferenceDirectives.length
    && !metadata.libReferenceDirectives.length, `Unreviewed reference dependency: ${path}`);
  return metadata.importedFiles.map(item => item.fileName);
}

function auditExecutable(path, content) {
  const source = parse(path, content);
  let retainedErrorStrings = 0;
  const forbidden = /ai\.gateway\.lovable\.dev|api\.anthropic\.com|LOVABLE_API_KEY|ANTHROPIC_API_KEY|MATCHRIM_(?:LOVABLE|ANTHROPIC)_MODEL|MATCHRIM_(?:RESTAURANT91_)?AI_PROVIDER/i;
  walk(source, node => {
    if (LOCAL_OVERRIDES.has(path) && ts.isCallExpression(node)
      && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
      check(node.arguments.length === 2 && ts.isStringLiteral(node.arguments[0])
        && ['https://api.openai.com/v1/responses', 'https://api.openai.com/v1/chat/completions'].includes(node.arguments[0].text),
      `Unreviewed parent helper HTTP destination: ${path}`);
    }
    if (ts.isIdentifier(node)) check(!forbidden.test(node.text), `Legacy provider executable identifier: ${path}`);
    if (!ts.isStringLiteralLike(node) && !ts.isTemplateHead(node) && !ts.isTemplateMiddle(node)
      && !ts.isTemplateTail(node)) return;
    check(node.text !== OLD_KEY_DIAGNOSTIC && node.text !== OLD_PAYMENT_DIAGNOSTIC,
      `Requested diagnostic replacement missing: ${path}`);
    if (!forbidden.test(node.text)) return;
    const parent = node.parent;
    const errorConstructor = ts.isNewExpression(parent) && ts.isIdentifier(parent.expression)
      && parent.expression.text === 'Error';
    const consoleDiagnostic = ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)
      && ts.isIdentifier(parent.expression.expression) && parent.expression.expression.text === 'console'
      && parent.expression.name.text === 'error';
    const errorOnly = ts.isStringLiteral(node) && (errorConstructor || consoleDiagnostic)
      && parent.arguments?.length === 1 && parent.arguments[0] === node
      && /^(?:LOVABLE|ANTHROPIC)_API_KEY\s+no configurada$/.test(node.text);
    check(errorOnly, `Legacy provider endpoint/key in executable source: ${path}`);
    retainedErrorStrings++;
  });
  return { parsed: true, legacyProviderCalls: 0, legacySecretReads: 0, retainedDiagnosticOnlyKeyStrings: retainedErrorStrings };
}

function readJwtDeclarations(content) {
  const declarations = [];
  let section = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || /^project_id\s*=\s*"[a-z]+"$/.test(trimmed)) continue;
    const header = /^\[functions\.([a-z0-9-]+)\]$/.exec(trimmed);
    if (header) { section = header[1]; continue; }
    const jwt = /^verify_jwt\s*=\s*(true|false)$/.exec(trimmed);
    check(section && jwt && !declarations.some(item => item.name === section), 'Unexpected baseline JWT config shape');
    declarations.push({ name: section, verify_jwt: jwt[1] === 'true' });
  }
  return declarations;
}

function main() {
  const args = process.argv.slice(2);
  check(args.length === 2 && args[1] === '--helpers-stable' && !args[0].startsWith('-'),
    'Usage: node scripts/prepare-matchrim-openai92-deployment.mjs /absolute/new.json --helpers-stable (only after parent confirms helper stability). No deployment.');
  check(isAbsolute(args[0]) && extname(args[0]) === '.json', 'An explicit absolute new JSON output path is required');
  const output = resolve(realpathSync(dirname(args[0])), posix.basename(args[0]));
  check(!existsSync(output), 'Output already exists; overwriting is forbidden');
  check(!inside(ROOT, output) && !inside(resolve(FALLBACK), output), 'Output must be outside both source checkouts');
  check(TARGETS.length === 29 && BASELINE_FILES.size === 40 && EXECUTABLE_FILES.size === 41, 'Internal scope invariant failed');
  let baselineRoot = ROOT;
  if (gitAt(ROOT, ['cat-file', '-e', `${BASELINE}^{commit}`], true) === null) {
    baselineRoot = realpathSync(FALLBACK);
    check(gitAt(baselineRoot, ['rev-parse', 'refs/heads/main']).trim() === BASELINE,
      'Fallback clone main is not the authorized production baseline');
  }
  check(gitAt(baselineRoot, ['rev-parse', `${BASELINE}^{commit}`]).trim() === BASELINE, 'Production baseline is unavailable');
  const baselineGit = (...args) => gitAt(baselineRoot, args);
  const tree = new Map();
  for (const item of baselineGit('ls-tree', '-rz', '--full-tree', BASELINE, '--', 'supabase/functions', 'supabase/config.toml').split('\0')) {
    if (!item) continue;
    const match = /^(\d+) (\w+) ([a-f0-9]{40})\t(.+)$/.exec(item);
    check(match, 'Unexpected baseline tree entry');
    tree.set(match[4], { mode: match[1], type: match[2], blobSha: match[3] });
  }
  const baselineCache = new Map();
  const readBaseline = path => {
    const entry = tree.get(path);
    check(entry && entry.type === 'blob' && entry.mode === '100644', `Missing/nonregular baseline source: ${path}`);
    if (!baselineCache.has(path)) {
      const content = baselineGit('show', `${BASELINE}:${path}`);
      check(blobSha(content) === entry.blobSha, `Baseline source bytes do not match Git blob: ${path}`);
      baselineCache.set(path, content);
    }
    return baselineCache.get(path);
  };
  const matched = baselineGit('grep', '-l', '-E', 'ai\\.gateway\\.lovable\\.dev|anthropic|matchrim-ai-provider',
    BASELINE, '--', 'supabase/functions').trim().split('\n').map(value => {
    check(value.startsWith(`${BASELINE}:`), 'Unexpected baseline discovery result');
    return value.slice(BASELINE.length + 1);
  }).filter(path => !path.startsWith(`${PREFIX}_shared/`)).sort();
  const expectedEntrypoints = TARGETS.map(name => `${PREFIX}${name}/index.ts`).sort();
  check(JSON.stringify(matched) === JSON.stringify(expectedEntrypoints), 'AI discovery differs from the exactly 29 authorized targets');
  for (const excluded of ['calculate-wine-affinity-v73', 'restaurant-import91']) {
    check(!TARGETS.includes(excluded), `Non-AI function accidentally selected: ${excluded}`);
  }
  const baselineClosure = new Set();
  const inspectBaseline = path => {
    check(BASELINE_FILES.has(path), `Unreviewed baseline dependency: ${path}`);
    if (baselineClosure.has(path)) return;
    baselineClosure.add(path);
    for (const specifier of dependencies(path, readBaseline(path))) {
      if (specifier.startsWith('.')) inspectBaseline(posix.normalize(posix.join(posix.dirname(path), specifier)));
      else check(specifier.startsWith('https://'), `Unreviewed baseline external dependency: ${path}`);
    }
  };
  expectedEntrypoints.forEach(inspectBaseline);
  check(baselineClosure.size === BASELINE_FILES.size, 'Unexpected baseline source closure');
  const files = new Map();
  for (const path of [...BASELINE_FILES].sort()) {
    const baseline = readBaseline(path);
    let result = { content: baseline, changes: [] };
    let sourceKind = 'exact-production-baseline';
    const name = path.slice(PREFIX.length).split('/')[0];
    const typeEdits = typeOnlyRepairs(path, baseline);
    if (DIRECT_COUNTS.has(name) && path.endsWith('/index.ts')) {
      result = transformGateway(path, baseline, DIRECT_COUNTS.get(name), typeEdits);
      sourceKind = 'production-baseline-with-ast-range-edits';
    } else if (path === SHIM) {
      result = applyEdits(parse(path, baseline), [{ start: 0, end: baseline.length,
        replacement: SHIM_CONTENT, kind: 'replace-legacy-provider-with-completeness-enforcing-shim' }]);
      sourceKind = 'generated-shared-provider-shim';
    } else if (typeEdits.length) {
      result = applyEdits(parse(path, baseline), typeEdits);
      sourceKind = 'production-baseline-with-type-only-ast-range-edits';
    }
    files.set(path, { path, ...result, sha256: sha256(result.content), bytes: Buffer.byteLength(result.content),
      sourceKind, sourceCommit: BASELINE, baselineBlobSha: tree.get(path).blobSha,
      baselineSha256: sha256(baseline) });
  }
  const localSnapshots = new Map();
  for (const path of LOCAL_OVERRIDES) {
    const absolute = resolve(ROOT, path);
    check(lstatSync(absolute).isFile() && realpathSync(absolute) === absolute, `Local helper must be a regular nonsymlink file: ${path}`);
    const content = readFileSync(absolute, 'utf8');
    parse(path, content);
    localSnapshots.set(path, content);
    const baseline = path === PROVIDER ? readBaseline(path) : '';
    const result = applyEdits(parse(path, baseline), [{ start: 0, end: baseline.length,
      replacement: content, kind: path === PROVIDER ? 'parent-reviewed-shared-provider-override' : 'parent-reviewed-new-openai-router' }]);
    files.set(path, { path, ...result, sha256: sha256(content), bytes: Buffer.byteLength(content),
      sourceKind: 'explicit-local-shared-helper-override', sourceCommit: null,
      baselineBlobSha: tree.get(path)?.blobSha ?? null, baselineSha256: baseline ? sha256(baseline) : null,
      localHeadBlobSha: gitAt(ROOT, ['rev-parse', '--verify', `HEAD:${path}`], true)?.trim() ?? null,
      localGitStatus: gitAt(ROOT, ['status', '--porcelain=v1', '--untracked-files=all', '--', path]).trim() });
  }
  const openaiExports = exportedBindings(parse(OPENAI, files.get(OPENAI).content));
  for (const name of ['hasMatchrimOpenAiKey', 'getMatchrimOpenAiModel', 'fetchMatchrimAiChat']) {
    check(openaiExports.has(name), `Missing parent OpenAI helper export: ${name}`);
  }
  check(exportedBindings(parse(PROVIDER, files.get(PROVIDER).content)).has('runMatchrimAi'), 'Missing parent runMatchrimAi export');
  const closure = new Set();
  const externalImports = new Set();
  const collect = path => {
    check(EXECUTABLE_FILES.has(path) && files.has(path), `Dependency outside authorized executable closure: ${path}`);
    if (closure.has(path)) return;
    closure.add(path);
    const file = files.get(path);
    file.audit = auditExecutable(path, file.content);
    file.dependencies = [];
    for (const specifier of dependencies(path, file.content)) {
      if (specifier.startsWith('.')) {
        const dependency = posix.normalize(posix.join(posix.dirname(path), specifier));
        check(dependency.startsWith(PREFIX) && extname(dependency) === '.ts', `Dependency escapes function source scope: ${path}`);
        file.dependencies.push(dependency);
        collect(dependency);
      } else {
        check(specifier.startsWith('https://'), `Unexpected external dependency: ${path}`);
        externalImports.add(specifier);
      }
    }
    if (file.sourceKind === 'exact-production-baseline') {
      check(file.content === readBaseline(path) && file.changes.length === 0, `Unchanged dependency drift: ${path}`);
    }
  };
  expectedEntrypoints.forEach(collect);
  check(closure.size === EXECUTABLE_FILES.size && files.size === EXECUTABLE_FILES.size, 'Unexpected generated source closure');
  const diagnosticChanges = [...files.values()].flatMap(file => file.changes);
  const keyDiagnosticsUpdated = diagnosticChanges.filter(change => change.kind === 'replace-exact-legacy-key-runtime-diagnostic').length;
  const paymentDiagnosticsUpdated = diagnosticChanges.filter(change => change.kind === 'replace-airim-402-user-diagnostic-only').length;
  check(keyDiagnosticsUpdated === 15 && paymentDiagnosticsUpdated === 1, 'Unexpected diagnostic replacement counts');
  const typeRepairs = diagnosticChanges.filter(change => change.typeOnly);
  const typeRepairFiles = [...files.values()].filter(file => file.changes.some(change => change.typeOnly));
  check(typeRepairs.length === 5 && typeRepairFiles.length === TYPE_REPAIR_TARGETS.size
    && typeRepairs.every(change => change.runtimeEquivalence?.verified), 'Unexpected runtime-erased type repair audit');
  const config = readBaseline('supabase/config.toml');
  const configProvenance = { path: 'supabase/config.toml', baselineBlobSha: tree.get('supabase/config.toml').blobSha,
    sha256: sha256(config), declaredJwtSettings: readJwtDeclarations(config) };
  const localHead = gitAt(ROOT, ['rev-parse', 'HEAD']).trim();
  const dirty = gitAt(ROOT, ['status', '--porcelain=v1', '--untracked-files=all', '-z']);
  const agentPath = relative(ROOT, fileURLToPath(import.meta.url));
  const manifest = {
    schema: 'matchrim-openai92-production-baseline-deployment-v1',
    projectId: '7e9b6f66-d4ee-404a-8678-c9afab22de75', backendRef: 'cbjynrbvrhcmpaojmqdp',
    sourceCommit: BASELINE, sourceDirty: Boolean(dirty), baselineRepository: baselineRoot,
    baselineSelection: 'Exact authorized production commit, never current mobile sources or whole local functions',
    deploymentPerformed: false, pushPerformed: false, modelCallsPerformed: false,
    accountsAccessed: false, secretsRead: false, environmentRead: false,
    preservePublishedWeb: true, publishWeb: false, preserveExistingConfig: true,
    preserveAllJwtSettings: true, configChanges: [], configFilesIncluded: [], baselineConfig: configProvenance,
    deploymentConstraints: { maximumDeployments: 1, exactFunctionCount: 29, allowExtraFunctions: false,
      functionsOnly: true, configurationPolicy: 'Do not send or modify config, verify_jwt, secrets, accounts, or web assets',
      verifyJwtOmittedFromDefinitions: true, sourceOnlyArtifact: true },
    localProvenance: { root: ROOT, sourceCommit: localHead, sourceDirty: Boolean(dirty),
      statusPorcelainV1: dirty.split('\0').filter(Boolean),
      overrides: [...LOCAL_OVERRIDES].sort(), allOtherRuntimeSourcesFromProductionBaseline: true,
      helpersStableAcknowledgedByCaller: true },
    generatorProvenance: { path: agentPath, sha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
      callerScope: 'Worker C: only this preparation script; no runtime monkeypatching or additional backend edits',
      parser: 'typescript', parserVersion: ts.version, transformations: 'AST-validated source ranges; no TypeScript printer',
      typeRepairVerification: 'Erased JavaScript bytes and AST fingerprints only; transpiled output is never deployment source',
      helperExecution: false, runtimeImportsExecuted: false },
    functions: TARGETS.map(name => ({ name, entrypoint: `${PREFIX}${name}/index.ts` })),
    excludedNonAiFunctions: ['calculate-wine-affinity-v73', 'restaurant-import91'],
    externalImports: [...externalImports].sort(),
    documentedExceptions: [
      'ai-wine-chat: only query-log model metadata uses getMatchrimOpenAiModel(quality); the streaming request is the quality tier.',
      'ai-wine-chat: removed only the false first-person experience example; all other prompt text is unchanged.',
      'ai-wine-chat: moved the existing query-log rejection callback from unsupported PromiseLike.catch into the second then argument and typed err as unknown; query semantics are unchanged.',
      'Direct handlers: replaced only the exact English legacy key Error/console.error literals with Matchrim OpenAI key not configured using audited source ranges.',
      'ai-wine-chat: replaced only the HTTP 402 user-facing credit diagnostic; its status, response schema, and handling are unchanged.',
      'Four affinity/menu handlers: specialized only the existing supabaseClient parameter ReturnType to typeof createClient<any, string>; no parameters, callers, queries, formulas, or values changed.',
      'scan-wine-menu-v72: added only moneda?: unknown and layout?: unknown to the local result type for properties the baseline already reads; no response schema or runtime change.',
      'All five type-only source-range repairs individually and jointly preserve identical TypeScript-erased JavaScript bytes and runtime AST fingerprints.',
      'Non-English legacy key diagnostics remain unchanged only in original Error/console.error messages or comments, never provider calls, headers, bindings, or settings.',
      'Legacy model strings in unchanged request bodies are routing hints interpreted by the parent shared wrapper, not provider destinations.',
      'wine-details retains baseline image request/result handling; the parent router rejects modalities before any model call, so no fake bottle image is generated.',
      'The v72 shim rejects complete !== true before returning to legacy handlers; only the parent provider owns model-call logic.',
      'Remote HTTPS imports are recorded, not downloaded or executed; their transitive remote sources are not bundled.',
    ],
    audit: { exactAiTargets: TARGETS.length, baselineSourceClosure: baselineClosure.size,
      executableSourceClosure: closure.size, directGatewayCallsReplaced: [...DIRECT_COUNTS.values()].reduce((a, b) => a + b, 0),
      directSecretReadsReplaced: DIRECT_COUNTS.size, localRuntimeOverrideCount: LOCAL_OVERRIDES.size,
      runtimeKeyDiagnosticsUpdated: keyDiagnosticsUpdated, aiRim402UserDiagnosticsUpdated: paymentDiagnosticsUpdated,
      runtimeErasedTypeRepairCount: typeRepairs.length, typeOnlyRepairTargetCount: typeRepairFiles.length,
      typeRepairRuntimeEquivalenceVerified: true,
      legacyEndpointCalls: 0, legacyProviderKeyReads: 0,
      baselineSupportFilesUnchangedExceptExplicitProviderReplacements: true, unchangedBaselineSupportFileCount: SUPPORT.length - 2,
      sourceRangesUseBaselineOffsets: true, productionVisionAndQaLogicPreserved: true,
      configurationPayloadIncluded: false, jwtOverridesIncluded: false },
    files: [...files.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
  for (const [path, snapshot] of localSnapshots) {
    check(readFileSync(resolve(ROOT, path), 'utf8') === snapshot, `Parent helper changed while preparing; retry after stability: ${path}`);
  }
  check(gitAt(ROOT, ['rev-parse', 'HEAD']).trim() === localHead
    && gitAt(ROOT, ['status', '--porcelain=v1', '--untracked-files=all', '-z']) === dirty,
  'Checkout provenance changed during preparation; retry after stability');
  const json = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(output, json, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output, sha256: sha256(json), bytes: Buffer.byteLength(json),
    sourceCommit: BASELINE, functions: TARGETS.length, files: files.size, deploymentPerformed: false }));
}

main();
