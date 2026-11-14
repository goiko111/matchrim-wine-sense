// 155: «Compartir → Matchrim»: the share extension leaves a photo, the app takes it once and the label scanner reads it.
import fs from 'node:fs';
import { stashSharedPhoto155, takeSharedPhoto155, takeStashedSharedPhoto155 } from '../src/utils/sharedPhoto155';
let failed = 0;
const ok = (name: string, pass: boolean) => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); if (!pass) failed += 1; };
const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const jpeg = `data:image/jpeg;base64,${Buffer.from('foto').toString('base64')}`;
{
  const file = await takeSharedPhoto155({ takeSharedImage: async () => ({ status: 'captured', image: jpeg }) });
  ok('a shared photo comes back as a JPEG file', file instanceof File && file.type === 'image/jpeg' && file.size === 4);
}
ok('nothing waiting, a failing shell or a malformed answer give no photo', await takeSharedPhoto155({ takeSharedImage: async () => ({ status: 'empty' }) }) === null
  && await takeSharedPhoto155({ takeSharedImage: async () => { throw new Error('UNIMPLEMENTED'); } }) === null
  && await takeSharedPhoto155({ takeSharedImage: async () => ({ status: 'captured', image: 'data:text/html;base64,AAAA' }) }) === null);
{
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
  stashSharedPhoto155(file);
  ok('the waiting photo is handed over once', takeStashedSharedPhoto155() === file && takeStashedSharedPhoto155() === null);
}
const ext = read('ios/App/ShareExtension/ShareViewController.swift'), plugin = read('ios/App/App/MatchrimOCRPlugin106.swift'), project = read('ios/App/App.xcodeproj/project.pbxproj');
const group = 'group.wine.matchrim.app', file = 'shared-photo155.jpg';
ok('extension and app agree on the group and the file', [ext, plugin].every(source => source.includes(`"${group}"`) && source.includes(`"${file}"`))
  && [read('ios/App/App/App.entitlements'), read('ios/App/ShareExtension/ShareExtension.entitlements')].every(source => source.includes(`<string>${group}</string>`)));
ok('the extension takes one image and sends nothing anywhere', read('ios/App/ShareExtension/Info.plist').includes('NSExtensionActivationSupportsImageWithMaxCount') && !/URLSession|http/.test(ext) && ext.includes('matchrim://shared'));
ok('the app takes the photo once and announces a waiting one when it comes to the front', plugin.includes('CAPPluginMethod(name: "takeSharedImage"') && /takeSharedImage[\s\S]{0,300}removeItem\(at: url\)/.test(plugin) && plugin.includes('UIApplication.didBecomeActiveNotification') && plugin.includes('notifyListeners("sharedImage"'));
ok('the app answers to matchrim://', /<string>matchrim<\/string>/.test(read('ios/App/App/Info.plist')));
ok('the project embeds the extension, same version and team, its own identifier', project.includes('ShareExtension.appex in Embed Foundation Extensions') && project.includes('PRODUCT_BUNDLE_IDENTIFIER = wine.matchrim.app.share;')
  && (project.match(/DEVELOPMENT_TEAM = 8X3XTD6XYX;/g) ?? []).length === 4 && (project.match(/CURRENT_PROJECT_VERSION = \d+;/g) ?? []).length === 4);
const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
ok('the scanner starts with the shared photo, open or opening', scanner.includes('takeStashedSharedPhoto155()') && scanner.includes('window.addEventListener(SHARED_PHOTO_EVENT155, start)') && read('src/App.tsx').includes('useSharedPhoto155();'));
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
console.log('check-matchrim-ux155 OK');
