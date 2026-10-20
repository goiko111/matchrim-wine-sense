import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const priorSHA = '90be420fb0fae1dedf75f406130f7e0781410a67151ec55d12ce9e59bbbd29da';
const replacement = (source, current, prior) => {
  assert.equal(source.split(current).length, 2, 'Exactly one reviewed native cellar delta');
  return source.replace(current, prior);
};

export const restoreNativeCellar97 = (file, source) => {
  if (file !== 'src/pages/MyWines.tsx') return source;
  source = replacement(source, "import { NativeCellarToolbar97 } from '@/components/NativeCellarToolbar97';\n", '');
  source = replacement(source, '          body: isNative ? { query, limit: 6, catalogOnly: true } : { query, limit: 6 },',
    '          body: { query, limit: 6 },');
  source = replacement(source, '        {!isNative && <div className="mb-8">', '        <div className="mb-8">');
  source = replacement(source, `        </div>}

        <div className="space-y-6">
          {isNative && <NativeCellarToolbar97 section={statusFilter} counts={sectionCounts}
            onSectionChange={section => { navigateToWineSection(section); setFilterType('all'); }}
            onScanLabel={() => navigate('/escanear/etiqueta')}
            onScanMenu={() => navigate('/escanear/carta-vinos')}
            onAddManually={() => navigate('/my-wines/add')}
            search={<WineSearchBar onSelectWine={handleSearchWineSelect} />} />}
          {!isNative && <>`, `        </div>

        <div className="space-y-6">`);
  source = replacement(source, '\t            </Card>\n          </>}\n\n\t            <Tabs', '\t            </Card>\n\n\t            <Tabs');
  source = replacement(source, '              {!isNative && <TabsList className=', '              <TabsList className=');
  source = replacement(source, '              </TabsList>}', '              </TabsList>');
  source = replacement(source, "{statusFilter === 'tasted' && !isNative && (", "{statusFilter === 'tasted' && (");
  source = replacement(source, "              <div className={isNative ? 'mt-2 space-y-3' : 'mt-6 space-y-6'}>", '              <div className="mt-6 space-y-6">');
  source = replacement(source, `            {isNative && <details className="min-w-0 border-y border-stone-200 py-2" data-testid="native-cellar-learning97">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700">Tu perfil de gustos</summary>
              <p className="text-sm leading-6 text-stone-600">{cellarProfile?.note || 'Cargando tu perfil.'}</p>
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => navigate('/profile')}>Ver mi perfil</Button>
            </details>}
`, '');
  assert.equal(createHash('sha256').update(source).digest('hex'), priorSHA,
    'Every other cellar byte, web branch, mutation and affinity closure stays unchanged');
  return source;
};
