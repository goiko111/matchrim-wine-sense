const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = __dirname;
const prior = path.join(path.dirname(root), 'matchrim-native-integration-20261011');
const app = path.join(prior, 'mirror/Users/GOIKO/2matchrim76-recognition-20261008/ios/App');
const developer = '/Applications/Xcode.app/Contents/Developer';
const publicCore = '/Library/Developer/CoreSimulator';
const plist = file => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
const selectedSettings = settings => Object.fromEntries(Object.entries(settings || {}).filter(([key]) => /^(SDKROOT|SUPPORTED_PLATFORMS|IPHONEOS_DEPLOYMENT_TARGET|TARGETED_DEVICE_FAMILY|ARCHS|VALID_ARCHS|EXCLUDED_ARCHS|SUPPORTS_MACCATALYST|SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD|PRODUCT_NAME|PRODUCT_TYPE|SKIP_INSTALL|ENABLE_USER_SCRIPT_SANDBOXING)/.test(key)));
function project(file) {
  const parsed = plist(file);
  const o = parsed.objects;
  const configs = id => o[id].buildConfigurations.map(configId => ({ name: o[configId].name, settings: selectedSettings(o[configId].buildSettings), baseConfiguration: o[o[configId].baseConfigurationReference]?.path || null }));
  return { projectConfigurations: configs(o[parsed.rootObject].buildConfigurationList), targets: o[parsed.rootObject].targets.map(id => ({ name: o[id].name, productType: o[id].productType, configurations: configs(o[id].buildConfigurationList) })) };
}
const platforms = {};
for (const name of ['iPhoneOS', 'iPhoneSimulator']) {
  const dir = path.join(developer, 'Platforms', name + '.platform');
  const info = plist(path.join(dir, 'Info.plist'));
  const sdks = fs.readdirSync(path.join(dir, 'Developer/SDKs')).filter(name => name.endsWith('.sdk'));
  platforms[name] = { info, sdkDirectories: sdks };
}
const sdkFile = path.join(developer, 'Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/SDKSettings.json');
const sdk = JSON.parse(fs.readFileSync(sdkFile, 'utf8'));
function names(dir) {
  try { return { exists: true, names: fs.readdirSync(dir).sort() }; }
  catch (error) { return { exists: false, error: error.code }; }
}
const runtimeRoots = [path.join(publicCore, 'Profiles/Runtimes')];
const volumes = names(path.join(publicCore, 'Volumes'));
for (const volume of volumes.names || []) runtimeRoots.push(path.join(publicCore, 'Volumes', volume, 'Library/Developer/CoreSimulator/Profiles/Runtimes'));
const runtimeListings = Object.fromEntries(runtimeRoots.map(dir => [dir, names(dir)]));
const configFiles = [];
for (const target of ['Pods-App', 'Capacitor', 'CapacitorCordova']) {
  const dir = path.join(app, 'Pods/Target Support Files', target);
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.xcconfig'))) {
    const relevant = fs.readFileSync(path.join(dir, name), 'utf8').split('\n').filter(line => /^(SDKROOT|SUPPORTED_PLATFORMS|IPHONEOS_DEPLOYMENT_TARGET|TARGETED_DEVICE_FAMILY|ARCHS|VALID_ARCHS|EXCLUDED_ARCHS|SUPPORTS_MAC)/.test(line));
    configFiles.push({ file: path.relative(app, path.join(dir, name)), relevant });
  }
}
const result = {
  method: 'Static plist/json/xcconfig reads and directory listings only; no Xcode/simctl service query',
  appProject: project(path.join(app, 'App.xcodeproj/project.pbxproj')),
  podsProject: project(path.join(app, 'Pods/Pods.xcodeproj/project.pbxproj')),
  xcconfigPlatformOverrides: configFiles,
  schemeDirectories: {
    projectShared: names(path.join(app, 'App.xcodeproj/xcshareddata/xcschemes')),
    workspaceShared: names(path.join(app, 'App.xcworkspace/xcshareddata/xcschemes')),
  },
  platforms, simulatorSDK: sdk,
  publicRuntimeVolumes: volumes,
  publicRuntimeListings: runtimeListings,
  excluded: ['real user HOME', 'device registrations', 'accounts', 'sessions', 'keychains', '.env'],
};
fs.writeFileSync(path.join(root, 'metadata1.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ appProject: result.appProject, podsProject: result.podsProject, xcconfigPlatformOverrides: configFiles, schemeDirectories: result.schemeDirectories, platformNames: Object.keys(platforms), sdkCanonicalName: sdk.CanonicalName, sdkVersion: sdk.Version, supportedTargets: sdk.SupportedTargets, publicRuntimeVolumes: volumes, publicRuntimeListings: runtimeListings }, null, 2));
