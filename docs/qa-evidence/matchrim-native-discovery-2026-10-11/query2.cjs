const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = __dirname;
const prior = path.join(path.dirname(root), 'matchrim-native-integration-20261011');
const initial = JSON.parse(fs.readFileSync(path.join(root, 'metadata1.json')));
const plist = file => JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' }));
const select = data => Object.fromEntries(Object.entries(data).filter(([key]) => /version|platform|runtime|build|minimum|maximum|compatib|architect|host|identifier|name|root/i.test(key) && !/SupportedDevice|DeviceType/i.test(key)));
const runtimes = [];
for (const [dir, listing] of Object.entries(initial.publicRuntimeListings)) {
  for (const name of listing.names || []) {
    if (!name.endsWith('.simruntime')) continue;
    const runtime = path.join(dir, name);
    const contents = path.join(runtime, 'Contents');
    const resources = path.join(contents, 'Resources');
    const info = plist(path.join(contents, 'Info.plist'));
    const candidates = [path.join(resources, 'profile.plist'), path.join(resources, 'RuntimeRoot/System/Library/CoreServices/SystemVersion.plist')];
    const metadata = {};
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      const data = plist(file);
      metadata[path.relative(runtime, file)] = { keys: Object.keys(data), selected: select(data) };
    }
    runtimes.push({ runtime, infoKeys: Object.keys(info), info: select(info), resourceNames: fs.readdirSync(resources).sort(), metadata });
  }
}
const isolatedCore = path.join(process.env.HOME, 'Library/Developer/CoreSimulator');
const safeExists = file => fs.existsSync(file);
const includes = initial.xcconfigPlatformOverrides.map(item => {
  const file = path.join(prior, 'mirror/Users/GOIKO/2matchrim76-recognition-20261008/ios/App', item.file);
  return { file: item.file, includes: fs.readFileSync(file, 'utf8').split('\n').filter(line => /^\s*#include/.test(line)) };
});
const result = {
  method: 'Second and final static public runtime metadata read; no service invocation or private registry access',
  runtimes,
  hostPublicSystemVersion: select(plist('/System/Library/CoreServices/SystemVersion.plist')),
  isolatedCoreSimulator: { directoryExists: safeExists(isolatedCore), devicesDirectoryExists: safeExists(path.join(isolatedCore, 'Devices')), defaultDeviceSetExists: safeExists(path.join(isolatedCore, 'Devices/device_set.plist')) },
  inspectedXCConfigIncludes: includes,
  realUserRegistryInspected: false,
  runtimeRegistrationOrAvailabilityQueried: false,
  effectiveBuildSettingsServiceQueried: false,
};
fs.writeFileSync(path.join(root, 'metadata2.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
