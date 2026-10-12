const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = __dirname;
const appCopy = path.join(path.dirname(path.dirname(root)), 'matchrim-native-integration-20261011/mirror/Users/GOIKO/2matchrim76-recognition-20261008');
const env = { PATH:'/usr/bin:/bin:/usr/sbin:/sbin', HOME:path.join(root,'qa-home'), CFFIXED_USER_HOME:path.join(root,'qa-home'), TMPDIR:path.join(root,'tmp')+'/', LANG:'en_US.UTF-8', DEVELOPER_DIR:'/Applications/Xcode.app/Contents/Developer', USER:'local-qa', LOGNAME:'local-qa', CI:'1', DO_NOT_TRACK:'1' };
const args = ['-f',path.join(root,'offline.sb'),'/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild','-workspace','ios/App/App.xcworkspace','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-showdestinations','-disableAutomaticPackageResolution','-skipPackageUpdates','-onlyUsePackageVersionsFromResolvedFile'];
if (fs.existsSync(path.join(root,'destinations.json'))) throw Error('One bounded scheme discovery only');
const result = spawnSync('/usr/bin/sandbox-exec',args,{env,cwd:appCopy,encoding:'utf8',timeout:30000,maxBuffer:2e6});
const raw = (result.stdout||'')+(result.stderr||'');
const clean = raw.replaceAll(root,'<NATIVE_QA>').replaceAll(appCopy,'<APP_COPY11>').replaceAll('/Users/GOIKO','<HOME>').replace(/id:([^,}\n]+)/g,'id:<REDACTED>').replace(/name:([^}\n]+)/g,'name:<REDACTED>').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'<REDACTED_EMAIL>');
fs.writeFileSync(path.join(root,'destinations.log'),clean.trimEnd()+'\n');
const report = {
  exitCode:result.status, signal:result.signal, error:result.error?.code||null,
  command:['/usr/bin/sandbox-exec',...args].map(x=>x.replaceAll(root,'<NATIVE_QA>')),
  usesCopy11ConfigurationOnly:true, noBuild:true,
  availableSimulatorSection: /Available destinations[^]*?platform:iOS Simulator/.test(raw.split('Ineligible destinations')[0]),
  missing18_5Reported: /iOS 18\.5 is not installed/.test(raw),
  realHomeUseReported: /\/Users\/GOIKO\/Library/.test(raw),
  initializationObserved: 'Tool output and explicitly isolated QA directories only; out-of-process service caches not inspected',
};
fs.writeFileSync(path.join(root,'destinations.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2)); console.log(clean.slice(-4000));
process.exitCode = result.status === 0 ? 0 : 1;
