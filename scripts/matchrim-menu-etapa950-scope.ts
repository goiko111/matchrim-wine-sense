import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Explicit etapa950 structural revisions only. Behavioral expectations stay in
// their original suites; no current-source hash is generated as its own oracle.
type Stage = 'price' | 'style' | 'precision' | 'nav';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const reviewedMenu950 = {
  "current": "23e05fd6fe37074b5ad48ac396535974a3086f7da7e10219c365916ad89768f6",
  "historical": {
    "price": "58fa342fa3bb71c51512b6558fb56b29b10bf56b3d5a0131a0c5dd94fac1c105",
    "style": "a906de394bf35baae9200c7d4eb55927b5f570256f8a02534bbf84ed92545664",
    "nav": "b14576042f6f723e62ef6e9fda79ffaa49edff059a1ea12f3dbdbd6a2944dec8"
  },
  "initializers": {
    "formatPrice": "e31ed9bf638d3c3747df1ec688dfb23c59505831cbf707689c4f692ba41f5be2",
    "normalizeAttributesTo5": "666438b0161c6cf2514f4c0a8fb121eeae140ca32b9aa3590d2365ce13aa7ccd",
    "calculateWineSimilarity": "f5a071352f248fc5305a874a23b962dd3e60b9c87715a4ad123fdea35db1ca92",
    "score": null,
    "signals": null,
    "distance": null,
    "maxDistance": null,
    "sourceType": null,
    "candidateType": null,
    "sourceGrapes": null,
    "candidateGrapes": null,
    "overlap": null,
    "union": null,
    "menuPinClusters": "187aad5db8c668aed93c0f93f5457ceccc6754f502dcecd0a876ca5bdac453fe",
    "menuDecision": "da71234a428ff025007d118fa09b39391b69d9c532d8856a92e124a3681a8b14",
    "scored": "451c304f1271be6b0bc812e333f2a775b87343ffb7746d3fdd5b760f940fbaf3",
    "listPriceText": "686c8707ca13f185af1965b8dd8f066f7d339a39b8623b2a84cf1ec94af40a9c",
    "handleFileSelect": "e8ce7f26328309dc914cab13a0ac8c04d2ca2e1b0adec36356a92254d336bc83",
    "convertPdfToImage": "fc07099f2749c70c0fb71ac8f2b8a41f985a4bf6eba25b3ad75f067b0e5c92ad",
    "context": "2617f3f0be88fa807d842810cd334bddc0ccccfdb949c2e30948c7d9c2df2111",
    "processFile": "66414c2aad930a3d35cc73f97e96e2a8b7e925ed6462f93f46379ed2db3e4d80",
    "prepared": "d489aef853bc60f4c062047408771821ec036d6a7b374636feab14fc58f93d7d",
    "invokeScan": "dc41f435c2cbd5b8a69f08a743116a15550a77f24d35676f7fda306683de3f83",
    "scanTiles": "8e0fac6aa96730ec5d4a7ae229789fc82d0a62204fe7c533ff80475336412ede",
    "settledTiles": "13c79dc5496cacb642222dd9e47ced5c8c0323bfeaacd04dbaf8baf20cb0c409",
    "data": "d1ae52c12a2f0bdc19f86b6c4753edb0b3d35a5bf2588ddde364cfdefc3975d3",
    "focusImage": "217e836042fc612ab1c6f224ab121985f6e5bd7071eda1f244561070677c48cb",
    "normalizedWines": "c33f6afb74300802177065cdfbc7e94280660483d4b37b338ac1fc407af46192",
    "catalog": "ee0f4785fda5a1c94df5ba4e9937cbac297aafd5bf547c38ea7e808c71b96833",
    "message": "511bd805a3bae8f619ccb4b5b445e5aac49033398cdadd862810ec009bc3dc30",
    "clearScan": "537924ec4f5cf82a3fa6991bcb6a78c383277fcd58d7b0158aebf592f9397113",
    "getWineDecision": "7522b345cc01a5d47d7e0e116e1ea5c867b8ebdd195a7734520f82230b597a3e",
    "renderProfileRecovery": "b2bcfa06327762a0aa84d80900b8fe6c9e1d79584a3f807020e14d05360f9bd1",
    "renderWineAffinityExplanation": "cf0a857eb5052f562e6af00e4e720ca1fe0088b1b564ca24068bd67bb065dd64",
    "saveScannedWine": "a844b56af20f5d08b9cd202920db088783971100583149621ba0053755f2f157",
    "identity": "da3e0b9fd3a8050d00ac50dc179977a267b846cc98cea306599a305d9d87547e"
  }
} as const;
export const reviewedSources950: Record<string, { current: string; historical: Partial<Record<Stage, string>> }> = {
  "src/components/AffinityExplanation.tsx": {
    "current": "d70f855128aedc753e887a7050ac0e97b4c4375da20a6b20dc4a4bde625b31f1",
    "historical": {
      "price": "6eec193c82956516ce676ecebd94d043808abc684fcfdee743abf09336b6eaea"
    }
  },
  "src/components/wine-import/WineComparisonWorkspace.tsx": {
    "current": "6ba543f62c49c4e58893a8d9ab3ae28259a43a105aacbf0221476bcb75e41d65",
    "historical": {
      "price": "c1a50371899e7b85e5c8d5f61d50afcf29e78a761f60129841d71e97ed74f3af",
      "style": "c1a50371899e7b85e5c8d5f61d50afcf29e78a761f60129841d71e97ed74f3af"
    }
  },
  "src/components/wine-import/MultiWineLabelScanner.tsx": {
    "current": "bc496d943d6ed7631c3505e1b63f11a18c0e641a31f2cf6a9ae9763773ae4146",
    "historical": {
      "price": "a9987201e6da81906b0cd0ae8200b5761343f587f335e3639bbd6f926bb73cd7",
      "style": "a9987201e6da81906b0cd0ae8200b5761343f587f335e3639bbd6f926bb73cd7"
    }
  },
  "src/utils/multiWineScan.ts": {
    "current": "a1f4a526a0ab30255dd4ebccd661c70ed14f9170298cd44f439178f053bbc8b1",
    "historical": {
      "price": "66b909fd4e5232dd83ee1395601aa87da130b2fb1b39f20f702aea294f66ea54"
    }
  },
  "src/utils/wineAffinityExplanation.ts": {
    "current": "f660f235b14a6cc440e8a289025ace40982334741146a1e250f496ee73ae3c67",
    "historical": {
      "price": "0ee16a5b31391b2bd9a12da3851c33296c00fe2fa90bd589da89b029b869d313",
      "style": "0ee16a5b31391b2bd9a12da3851c33296c00fe2fa90bd589da89b029b869d313",
      "nav": "0ee16a5b31391b2bd9a12da3851c33296c00fe2fa90bd589da89b029b869d313"
    }
  },
  "src/utils/imageAnalysis.ts": {
    "current": "fa52c63a7a4caf19bc054e315f1eb3a85db8b480c37d89430d289df9a81b0273",
    "historical": {
      "price": "201c2ecef29f41ea2059f0fc7f9d7be5c7eb00798426feb16a1ccf7887a2d22a"
    }
  },
  "supabase/functions/search-wines/index.ts": {
    "current": "594cb533d6a3db477d6b53128c92400d89b4bc4bd9af311a4ec6b434dcb81b54",
    "historical": {
      "price": "67416c318afb4ff7b83264a381c405403b623732806e2eade2326b64b132cc35"
    }
  },
  "src/utils/wineMenuScan.ts": {
    "current": "4e619d70f425f107564a786ac0cca15f1f917a68634de2eaae2d303a457d32a9",
    "historical": {
      "style": "3b5462175913b92424b50405f5393e185531893d15387676fd52485975027c2a"
    }
  },
  "src/utils/scanWineEvidence.ts": {
    "current": "59842171d16b43cd7766f51376688e130798cc55c939392450f411626a268c39",
    "historical": {
      "precision": "34ac4eabe0f2c8117e8b3912ed0f3b830b9681012572012a0dd12122756c230b"
    }
  },
  "src/services/winerimApi.ts": {
    "current": "c19157cd96bec558d18ec63ad92b6ee8c1054cae0df07f871c6d377af45b7cc9",
    "historical": {
      "nav": "287415857462d68ce80a37b8043bf3f45a1a9c27ae8a13bbef666d62077d67ec"
    }
  },
  "src/utils/aiRimContextGuide.ts": {
    "current": "bab1cd5948327c7d7c99d0626bf152ad27e6388fbaff6a83125cda6c090c5d4e",
    "historical": {
      "nav": "6e9691805f9dacfcb29587efe53c94c854cad5455e42549105db87b8b7aa5b07"
    }
  }
};

export const createMenu950StructuralScope = (stage: Exclude<Stage, 'precision'>, historical: string, current: string) => {
  const assertSource = () => {
    assert.equal(hash(historical), reviewedMenu950.historical[stage], 'Historical menu source remains fingerprinted');
    assert.equal(hash(current), reviewedMenu950.current, 'Only the explicitly reviewed etapa950 menu source is accepted');
  };
  return {
    assertSource,
    initializer: (name: string, after: string | undefined, before: string | undefined) => {
      if (!Object.hasOwn(reviewedMenu950.initializers, name)) {
        assert.equal(after, before, name);
        return;
      }
      assert.ok(before !== undefined, 'Historical initializer must exist: ' + name);
      assertSource();
      const expected = reviewedMenu950.initializers[name as keyof typeof reviewedMenu950.initializers];
      assert.equal(after === undefined ? null : hash(after), expected, 'Reviewed initializer: ' + name);
    },
  };
};

export const assertMenu950ProtectedSource = (stage: Stage, path: string, current: string, historical: string) => {
  const review = reviewedSources950[path], previous = review?.historical[stage];
  if (!previous) {
    assert.equal(current, historical, 'Unaffected protected source: ' + path);
    return;
  }
  assert.equal(hash(historical), previous, 'Historical protected source: ' + path);
  assert.equal(hash(current), review.current, 'Reviewed etapa950 source: ' + path);
};
