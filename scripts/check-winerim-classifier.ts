import assert from 'node:assert/strict';
import {
  AUTO_REVIEW_THRESHOLD,
  AUTO_SILENT_THRESHOLD,
  DIAGNOSTIC_STYLE,
  PUBLIC_WINE_STYLES,
  STYLE_COMPATIBILITY,
  WINE_TYPES,
  calcularEncaje,
  clasificarPorAtributos,
  clasificarVino,
  type PublicWineStyle,
} from '../src/lib/winerimClassifier';

const combos = () => {
  const values = [0, 1, 2, 3, 4, 5];
  const result: Array<[number, number, number, number, number]> = [];
  values.forEach((p) => {
    values.forEach((a) => {
      values.forEach((d) => {
        values.forEach((t) => {
          values.forEach((af) => result.push([p, a, d, t, af]));
        });
      });
    });
  });
  return result;
};

const allCombos = combos();
const sampleCombos = allCombos.filter((_, index) => index % 113 === 0);

const styles = new Set<PublicWineStyle>();
allCombos.forEach((combo) => styles.add(clasificarPorAtributos(...combo)));
assert.equal(styles.size, 16, 'V3 debe cubrir 16 estilos');
assert.deepEqual([...styles].sort(), [...PUBLIC_WINE_STYLES].sort(), 'V3 debe cubrir todos los estilos publicos');

const exactCases = [
  { args: [4, 4, 0, 0, 3, 'Espumoso'] as const, final: 'Brut Elegante', flag: 'directo', pct: 100 },
  { args: [5, 3, 0, 5, 2, 'Tinto'] as const, final: 'Tinto de Estructura', flag: 'directo', pct: 100 },
  { args: [1, 4, 5, 0, 4, 'Dulce'] as const, final: 'Dulce Ligero', flag: 'directo', pct: 100 },
  { args: [0, 4, 0, 0, 3, 'Blanco'] as const, final: 'Blanco Vital', flag: 'auto_reasignado', pct: 96 },
  { args: [4, 3, 0, 0, 2, 'Espumoso'] as const, final: 'Brut Elegante', flag: 'auto_reasignado', pct: 92 },
  { args: [1, 3, 4, 0, 4, 'Dulce'] as const, final: 'Dulce Ligero', flag: 'auto_reasignado', pct: 100 },
  { args: [3, 2, 0, 3, 1, 'Fortificado'] as const, final: 'Oxidativo/Maduro', flag: 'auto_reasignado', pct: 100 },
  { args: [2, 3, 0, 0, 1, 'Fortificado'] as const, final: 'Oxidativo/Maduro', flag: 'auto_reasignado', pct: 100 },
  { args: [1, 4, 0, 1, 4, 'Rosado'] as const, final: 'Rosado Ligero', flag: 'auto_reasignado', pct: 100 },
  { args: [5, 0, 5, 5, 0, 'Espumoso'] as const, final: DIAGNOSTIC_STYLE, flag: 'sin_encaje', pct: 56 },
  { args: [3, 4, 0, 2, 1, 'Tinto'] as const, final: 'Experimental', flag: 'directo', pct: 100 },
] as const;

exactCases.forEach(({ args, final, flag, pct }) => {
  const result = clasificarVino(...args);
  assert.equal(result.estiloFinal, final);
  assert.equal(result.flag, flag);
  assert.equal(result.encajePct, pct);
});

const frontierCases = [
  { args: [0, 0, 0, 0, 0, 'Tinto'] as const, pct: 92, flag: 'auto_reasignado' },
  { args: [0, 0, 0, 0, 0, 'Rosado'] as const, pct: 88, flag: 'auto_reasignado_revisar' },
  { args: [0, 0, 0, 0, 1, 'Espumoso'] as const, pct: 76, flag: 'auto_reasignado_revisar' },
  { args: [0, 0, 0, 0, 0, 'Espumoso'] as const, pct: 72, flag: 'sin_encaje' },
] as const;

frontierCases.forEach(({ args, pct, flag }) => {
  const result = clasificarVino(...args);
  assert.equal(result.encajePct, pct);
  assert.equal(result.flag, flag);
});

let noExperimentalAuto = true;
let flagsCoherent = true;
let visibleCompatibility = true;

sampleCombos.forEach((combo) => {
  WINE_TYPES.forEach((tipo) => {
    const result = clasificarVino(...combo, tipo);

    if (result.estiloFinal === 'Experimental' && result.flag !== 'directo') {
      noExperimentalAuto = false;
    }

    if (result.flag === 'auto_reasignado' && result.encajePct !== 100 && result.encajePct < AUTO_SILENT_THRESHOLD) {
      flagsCoherent = false;
    }
    if (result.flag === 'auto_reasignado_revisar') {
      flagsCoherent = flagsCoherent && result.encajePct >= AUTO_REVIEW_THRESHOLD && result.encajePct < AUTO_SILENT_THRESHOLD;
    }
    if (result.flag === 'sin_encaje') {
      flagsCoherent = flagsCoherent && result.encajePct < AUTO_REVIEW_THRESHOLD;
    }

    if (result.estiloFinal !== DIAGNOSTIC_STYLE && !STYLE_COMPATIBILITY[result.estiloFinal].includes(tipo)) {
      visibleCompatibility = false;
    }
  });
});

assert.equal(noExperimentalAuto, true, 'Experimental no debe participar en reasignacion automatica');
assert.equal(flagsCoherent, true, 'Los flags deben respetar umbrales V4.1');
assert.equal(visibleCompatibility, true, 'Ningun estilo visible debe ser incompatible con tipo');

const albariño = clasificarVino(0, 4, 0, 0, 3, 'Blanco');
assert.deepEqual(albariño.alternativas[0], { estilo: 'Blanco Vital', encaje: 96 });
assert.deepEqual(albariño.alternativas[1], { estilo: 'Blanco de Carácter', encaje: 96 });
assert.equal(calcularEncaje(0, 4, 0, 0, 3, 'Blanco Vital'), 96);
assert.equal(calcularEncaje(5, 0, 5, 5, 0, 'Burbuja Fresca'), 56);

assert.throws(() => clasificarVino(-1, 0, 0, 0, 0, 'Tinto'));
assert.throws(() => clasificarVino(0, 6, 0, 0, 0, 'Tinto'));
assert.throws(() => clasificarVino(0, 0, 0, 0, 0, 'TipoInvalido'));
assert.throws(() => clasificarVino(2.5, 0, 0, 0, 0, 'Tinto'));
assert.equal(clasificarVino(4.0, 4.0, 0.0, 0.0, 3.0, 'Espumoso').estiloFinal, 'Brut Elegante');
assert.equal(clasificarVino('4', '4', '0', '0', '3', 'Espumoso').estiloFinal, 'Brut Elegante');

console.log('Winerim V4.1 classifier checks passed');
