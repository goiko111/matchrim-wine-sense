import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import plist from 'plist';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const root = process.argv[2];
const templateRoot = process.argv[3];
const manifestPath = process.argv[4];
const repo = process.cwd();
const bundle = 'wine.matchrim.qa95synthetic';
const origin = 'http://127.0.0.1:4605';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (!root?.startsWith('/private/tmp/Matchrim95-synthetic-') || fs.existsSync(root)
  || !templateRoot?.startsWith('/private/tmp/Matchrim95-consumer-') || !manifestPath) {
  throw new Error('New isolated synthetic root, existing consumer template and frozen manifest required');
}
const preparation = JSON.parse(fs.readFileSync(path.join(templateRoot, 'preparation.json'), 'utf8'));
if (preparation.productionBundle !== 'wine.matchrim.app' || preparation.build !== 95) throw new Error('Unexpected native template');
const manifestBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes);
if (manifest.origin !== origin || manifest.bundle !== bundle || manifest.schema !== 'qa95-native-synthetic-v1') throw new Error('Wrong synthetic fixture manifest');
const manifestSha256 = sha(manifestBytes);
const appSource = path.join(preparation.production, 'ios/App/App');
const sourceNative = fs.readFileSync(path.join(appSource, 'AppDelegate.swift'));
const swift = fs.readFileSync(path.join(repo, 'scripts/native-matchrim95-synthetic-tests.swift'));
const copy = (source, destination) => fs.cpSync(source, destination, { recursive: true,
  filter: file => !['build', 'DerivedData', 'public'].includes(path.basename(file)) });
fs.mkdirSync(root);
copy(path.join(preparation.production, 'ios'), path.join(root, 'ios'));
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
const app = path.join(root, 'ios/App/App');
const project = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');
const projectSource = fs.readFileSync(project, 'utf8');
if ((projectSource.match(/PRODUCT_BUNDLE_IDENTIFIER = wine\.matchrim\.app;/g) ?? []).length !== 2) throw new Error('Unexpected App-only bundle settings');
fs.writeFileSync(project, projectSource.replaceAll('PRODUCT_BUNDLE_IDENTIFIER = wine.matchrim.app;', `PRODUCT_BUNDLE_IDENTIFIER = ${bundle};`));
const infoPath = path.join(app, 'Info.plist');
const info = plist.parse(fs.readFileSync(infoPath, 'utf8'));
if (info.NSAppTransportSecurity) throw new Error('Review existing ATS before deriving a QA-only wrapper');
info.CFBundleDisplayName = 'Matchrim95 Synthetic QA';
info.NSAppTransportSecurity = { NSAllowsLocalNetworking: true };
fs.writeFileSync(infoPath, plist.build(info) + '\n');
const configPath = path.join(app, 'capacitor.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.appId = bundle;
config.appName = 'Matchrim95 Synthetic QA';
config.server = { url: origin, cleartext: true, allowNavigation: [] };
config.plugins = { ...config.plugins, CapacitorHttp: { enabled: false }, CapacitorCookies: { enabled: false } };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
fs.mkdirSync(path.join(app, 'public'));
fs.writeFileSync(path.join(app, 'public/index.html'), '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"><title>QA95 synthetic only</title></head><body>QA95: servidor local no disponible. Esta app no contiene una experiencia de produccion.</body></html>\n');
const runner = path.join(root, 'ui');
fs.mkdirSync(runner);
copy(path.join(repo, 'scripts/native-matchrim-qa.xcodeproj'), path.join(runner, 'Matchrim73QA.xcodeproj'));
fs.writeFileSync(path.join(runner, 'MatchrimCandidateUITests.swift'), swift);
const runnerProject = path.join(runner, 'Matchrim73QA.xcodeproj/project.pbxproj');
const runnerText = fs.readFileSync(runnerProject, 'utf8');
if ((runnerText.match(/PRODUCT_BUNDLE_IDENTIFIER = wine\.matchrim\.qa91live\.uitests;/g) ?? []).length !== 2) throw new Error('Unexpected UI-runner bundle settings');
fs.writeFileSync(runnerProject, runnerText.replaceAll('wine.matchrim.qa91live.uitests', `${bundle}.uitests`));
const schemePath = path.join(runner, 'Matchrim73QA.xcodeproj/xcshareddata/xcschemes/MatchrimCandidateQA.xcscheme');
const scheme = new DOMParser().parseFromString(fs.readFileSync(schemePath, 'utf8'), 'application/xml');
const testAction = scheme.getElementsByTagName('TestAction')[0];
if (!testAction || scheme.getElementsByTagName('parsererror').length) throw new Error('Invalid test scheme');
testAction.setAttribute('shouldUseLaunchSchemeArgsEnv', 'NO');
const variables = scheme.createElement('EnvironmentVariables');
for (const [key, value] of Object.entries({ QA95_ENABLE_NATIVE_SYNTHETIC: 'YES', QA95_MANIFEST_SHA256: manifestSha256 })) {
  const variable = scheme.createElement('EnvironmentVariable');
  variable.setAttribute('key', key); variable.setAttribute('value', value); variable.setAttribute('isEnabled', 'YES');
  variables.appendChild(variable);
}
testAction.appendChild(variables);
fs.writeFileSync(schemePath, new XMLSerializer().serializeToString(scheme));
if (sha(sourceNative) !== sha(fs.readFileSync(path.join(app, 'AppDelegate.swift')))
  || fs.readdirSync(path.join(app, 'public')).join() !== 'index.html') throw new Error('Native code changed or product fallback assets were bundled');
const receipt = { root, kind: 'synthetic-native-only', uploadForbidden: true, signedRelease: false,
  origin, bundle, simulator: 'B18822EF-BFBD-4A6A-89B2-33539BDE4127',
  templateRoot, templateCommit: preparation.sourceCommit, templateDirty: preparation.sourceDirty,
  manifestPath, manifestSha256, nativeAppDelegateSha256: sha(sourceNative), uiTestSha256: sha(swift),
  appConfig: config, ats: info.NSAppTransportSecurity, productFallbackAssets: 0,
  note: 'Dedicated local QA wrapper. Does not replace qa91live, use native provider/auth plugins, or certify arbitrary OS/native-plugin network egress. Never export or upload this application.' };
fs.writeFileSync(path.join(root, 'synthetic-preparation.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ root, bundle, origin, manifestSha256, uploadForbidden: true }));
