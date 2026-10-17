import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as geometry from '../src/utils/imageCropGeometry';
import type * as ImageAnalysis from '../src/utils/imageAnalysis';

// Execute the complete real module with the existing read/decode/canvas lifecycle
// boundaries mocked. Pixel dimensions are synthetic; this does not measure memory.
const path = 'src/utils/imageAnalysis.ts';
const baseline = 'c25b28287d431e50239e45a25baebe8965f5077d';
const source = readFileSync(path, 'utf8');
const before = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
type Module = typeof ImageAnalysis;
type Controls = {
  width?: number; height?: number; holdRead?: boolean; holdDecode?: boolean;
  afterRead?: () => void; afterDecode?: () => void;
  readError?: boolean; decodeError?: boolean; noContext?: boolean;
};
const create = (controls: Controls = {}, text = source) => {
  const reads: Reader[] = [], images: Picture[] = [], canvases: Array<{ width: number; height: number }> = [];
  const activity = { readCalls: 0, aborts: 0, removedSources: 0, draws: 0, encodes: 0 };
  class Reader {
    static LOADING = 1;
    readyState = 0;
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    constructor() { reads.push(this); }
    readAsDataURL(_file: File) {
      activity.readCalls++; this.readyState = 1;
      if (!controls.holdRead) queueMicrotask(() => {
        if (controls.readError) { this.readyState = 2; this.onerror?.(); }
        else this.finish();
      });
    }
    finish() { this.readyState = 2; this.result = 'data:image/jpeg;base64,source'; this.onload?.(); controls.afterRead?.(); }
    abort() { activity.aborts++; this.readyState = 2; this.onabort?.(); }
  }
  class Picture {
    naturalWidth = controls.width ?? 1320;
    naturalHeight = controls.height ?? 1239;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { images.push(this); }
    set src(_value: string) {
      if (!controls.holdDecode) queueMicrotask(() => {
        if (controls.decodeError) this.onerror?.();
        else this.finish();
      });
    }
    finish() { this.onload?.(); controls.afterDecode?.(); }
    removeAttribute(name: string) { assert.equal(name, 'src'); activity.removedSources++; }
  }
  const document = { createElement: (tag: string) => {
    assert.equal(tag, 'canvas');
    const canvas = {
      width: 0, height: 0,
      getContext: () => controls.noContext ? null : {
        canvas, imageSmoothingEnabled: false, imageSmoothingQuality: 'low',
        drawImage: (..._args: unknown[]) => { activity.draws++; },
        getImageData: (_x: number, _y: number, width: number, height: number) => {
          assert.ok(width <= 96 && height <= 96, 'Only bounded sampling pixels are materialized');
          const data = new Uint8ClampedArray(width * height * 4);
          for (let index = 0; index < data.length; index += 4) {
            const value = (index / 4) % 2 ? 220 : 20;
            data.set([value, value, value, 255], index);
          }
          return { data };
        },
      },
      toDataURL: (format: string, quality: number) => {
        activity.encodes++; assert.equal(format, 'image/jpeg'); assert.equal(quality, 0.9);
        return 'data:image/jpeg;base64,prepared';
      },
    };
    canvases.push(canvas); return canvas;
  } };
  const sandbox = { exports: {}, DOMException, FileReader: Reader, Image: Picture, document, queueMicrotask,
    require: (id: string) => { assert.equal(id, './imageCropGeometry'); return geometry; } };
  const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, sandbox);
  return { module: sandbox.exports as Module, reads, images, canvases, activity };
};
const file = (size = 1024) => ({ name: 'controlled-image.jpg', type: 'image/jpeg', size }) as File;
const serializable = (value: unknown) => JSON.parse(JSON.stringify(value));
const module = create().module;
const limits = module.NATIVE_IMAGE_PREPARATION_LIMITS;
const typed = (subject: Module, code: string) => (error: unknown) => {
  assert.ok(error instanceof subject.ImagePreparationError);
  assert.equal(error.code, code); assert.equal(error.name, 'ImagePreparationError');
  assert.match(error.message, /foto/i); assert.doesNotMatch(error.message, /backend|token|http|provider|NaN|Infinity/i);
  return true;
};
const aborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
const trackedController = () => {
  const controller = new AbortController(), active = new Set<EventListenerOrEventListenerObject>();
  const add = controller.signal.addEventListener.bind(controller.signal);
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
    if (type === 'abort') active.add(listener); add(type, listener, options);
  };
  controller.signal.removeEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => {
    if (type === 'abort') active.delete(listener); remove(type, listener, options);
  };
  return { controller, active };
};
let checks = 0;
const check = async (name: string, run: () => void | Promise<void>) => { await run(); checks++; console.log('PASS', name); };

await check('Native limits are immutable 25 MiB / 64 decimal MP, not a working-resolution change', () => {
  assert.equal(limits.maxFileBytes, 25 * 1024 * 1024);
  assert.equal(limits.maxImagePixels, 64_000_000);
  assert.ok(Object.isFrozen(limits));
});
await check('Bytes over the limit, empty, negative, fractional, unsafe and nonfinite reject before FileReader', async () => {
  for (const size of [limits.maxFileBytes + 1, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity]) {
    const subject = create();
    await assert.rejects(subject.module.prepareImageForAnalysis(file(size), 2400, undefined, limits), typed(subject.module, 'file_size_limit'));
    assert.equal(subject.reads.length, 0); assert.equal(subject.activity.readCalls, 0);
    assert.equal(subject.images.length, 0); assert.equal(subject.canvases.length, 0);
  }
});
await check('File byte limit accepts its exact boundary and one byte below', async () => {
  for (const size of [limits.maxFileBytes - 1, limits.maxFileBytes]) {
    const subject = create();
    const result = await subject.module.prepareImageForAnalysis(file(size), 2400, undefined, limits);
    assert.equal(result.width, 1320); assert.equal(result.height, 1239);
    assert.equal(subject.activity.readCalls, 1); assert.equal(subject.activity.encodes, 1);
  }
});
await check('48 MP phone input and exact 64 MP edge retain the original 2400px preparation', async () => {
  for (const [width, height, preparedWidth, preparedHeight] of [[8000, 6000, 2400, 1800], [8000, 8000, 2400, 2400]]) {
    const subject = create({ width, height });
    const result = await subject.module.prepareImageForAnalysis(file(), 2400, undefined, limits);
    assert.equal(result.width, preparedWidth); assert.equal(result.height, preparedHeight);
    assert.equal(result.quality.width, width); assert.equal(result.quality.height, height);
    assert.equal(subject.activity.readCalls, 1); assert.equal(subject.images.length, 1);
    assert.equal(subject.canvases.length, 2);
  }
});
await check('Over 64 MP, unsafe products, zero/negative/fractional/nonfinite dimensions reject before any canvas', async () => {
  for (const [width, height] of [[64_000_001, 1], [8001, 8000], [Number.MAX_SAFE_INTEGER, 2],
    [0, 1239], [1320, 0], [-1, 1239], [1320, -1], [-1, -1], [1.5, 1239],
    [NaN, 1239], [1320, NaN], [Infinity, 1239], [1320, Infinity], [-Infinity, 1239], [1e308, 1e308]]) {
    const subject = create({ width, height });
    await assert.rejects(subject.module.prepareImageForAnalysis(file(), 2400, undefined, limits), typed(subject.module, 'image_pixel_limit'));
    assert.equal(subject.activity.readCalls, 1); assert.equal(subject.images.length, 1);
    assert.equal(subject.canvases.length, 0); assert.equal(subject.activity.draws, 0); assert.equal(subject.activity.encodes, 0);
    assert.equal(subject.images[0].onload, null); assert.equal(subject.images[0].onerror, null);
  }
});
await check('Optional limits are independent; omitted/empty options do not inspect File.size or cap existing callers', async () => {
  const unreadSize = { get size(): number { return assert.fail('Legacy or pixel-only path must not inspect File.size'); } } as File;
  for (const options of [undefined, {}, { maxImagePixels: 64_000_000 }]) {
    const subject = create();
    const result = await subject.module.prepareImageForAnalysis(unreadSize, 2400, undefined, options);
    assert.equal(result.width, 1320);
  }
  const bytesOnly = create({ width: 9000, height: 9000 });
  assert.equal((await bytesOnly.module.prepareImageForAnalysis(file(), 2400, undefined, { maxFileBytes: limits.maxFileBytes })).width, 2400);
});
await check('Malformed explicit limits fail closed without changing omitted defaults', async () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const bytes = create();
    await assert.rejects(bytes.module.prepareImageForAnalysis(file(), 2400, undefined, { maxFileBytes: value }), typed(bytes.module, 'file_size_limit'));
    assert.equal(bytes.reads.length, 0);
    const pixels = create();
    await assert.rejects(pixels.module.prepareImageForAnalysis(file(), 2400, undefined, { maxImagePixels: value }), typed(pixels.module, 'image_pixel_limit'));
    assert.equal(pixels.canvases.length, 0);
  }
});
await check('Already-aborted native request wins over invalid size without reading File.size or constructing resources', async () => {
  const { controller, active } = trackedController(); controller.abort();
  const subject = create();
  const input = { get size(): number { return assert.fail('Abort must win before size read'); } } as File;
  await assert.rejects(subject.module.prepareImageForAnalysis(input, 2400, controller.signal, limits), aborted);
  assert.equal(subject.reads.length, 0); assert.equal(subject.images.length, 0); assert.equal(subject.canvases.length, 0);
  assert.equal(active.size, 0);
});
await check('Cancellation during held read aborts reader, cleans listeners and ignores late completion', async () => {
  const { controller, active } = trackedController(), subject = create({ holdRead: true });
  const pending = subject.module.prepareImageForAnalysis(file(), 2400, controller.signal, limits);
  assert.equal(subject.activity.readCalls, 1); assert.equal(active.size, 1);
  controller.abort(); await assert.rejects(pending, aborted);
  subject.reads[0].finish(); await flush();
  assert.equal(subject.activity.aborts, 1); assert.equal(subject.images.length, 0); assert.equal(subject.canvases.length, 0);
  assert.equal(active.size, 0); assert.equal(subject.reads[0].onload, null); assert.equal(subject.reads[0].onerror, null);
  assert.equal(subject.reads[0].onabort, null);
});
await check('Cancellation between read/decode and decode/pixel guard wins before the next allocation', async () => {
  const readController = new AbortController();
  const afterRead = create({ afterRead: () => readController.abort() });
  await assert.rejects(afterRead.module.prepareImageForAnalysis(file(), 2400, readController.signal, limits), aborted);
  assert.equal(afterRead.images.length, 0); assert.equal(afterRead.canvases.length, 0);
  const decodeController = new AbortController();
  const afterDecode = create({ width: 0, height: Infinity, afterDecode: () => decodeController.abort() });
  await assert.rejects(afterDecode.module.prepareImageForAnalysis(file(), 2400, decodeController.signal, limits), aborted);
  assert.equal(afterDecode.canvases.length, 0);
});
await check('Cancellation during held decode clears src/handlers; late decode cannot allocate a canvas', async () => {
  const { controller, active } = trackedController(), subject = create({ holdDecode: true });
  const pending = subject.module.prepareImageForAnalysis(file(), 2400, controller.signal, limits);
  await flush(); assert.equal(subject.images.length, 1); assert.equal(active.size, 1);
  controller.abort(); await assert.rejects(pending, aborted);
  subject.images[0].finish(); await flush();
  assert.equal(subject.activity.removedSources, 1); assert.equal(subject.canvases.length, 0); assert.equal(active.size, 0);
  assert.equal(subject.images[0].onload, null); assert.equal(subject.images[0].onerror, null);
});
await check('Read/decode/prepare errors and successful listener cleanup retain existing lifecycles', async () => {
  for (const [controls, code] of [[{ readError: true }, 'read'], [{ decodeError: true }, 'decode'], [{ noContext: true }, 'prepare']] as const) {
    const { controller, active } = trackedController(), subject = create(controls);
    await assert.rejects(subject.module.prepareImageForAnalysis(file(), 2400, controller.signal, limits), error => {
      assert.ok(error instanceof subject.module.ImagePreparationError); assert.equal(error.code, code); return true;
    });
    assert.equal(active.size, 0);
  }
  const { controller, active } = trackedController(), subject = create();
  await subject.module.prepareImageForAnalysis(file(), 2400, controller.signal, limits);
  assert.equal(active.size, 0); assert.equal(subject.reads[0].onload, null); assert.equal(subject.images[0].onload, null);
});
await check('Actual dense 1320x1239 is not upsampled; legacy output/quality and custom working dimension stay exact', async () => {
  for (const [width, height] of [[1320, 1239], [8000, 6000], [8000, 8000], [9000, 9000], [320, 240]]) {
    for (const maxDimension of [2400, 1600]) {
      const current = create({ width, height }), legacy = create({ width, height }, before);
      const result = await current.module.prepareImageForAnalysis(file(100_000_000), maxDimension);
      assert.deepEqual(serializable(result), serializable(await legacy.module.prepareImageForAnalysis(file(100_000_000), maxDimension)));
      assert.deepEqual(serializable(current.canvases.map(canvas => [canvas.width, canvas.height])), serializable(legacy.canvases.map(canvas => [canvas.width, canvas.height])));
      if (width === 1320) { assert.equal(result.width, 1320); assert.equal(result.height, 1239); }
    }
  }
});
await check('Read, decode, resizing, quality, crop and detector/defer policy source preserved outside two optional guards', () => {
  const inspect = (text: string) => {
    const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true), values = new Map<string, ts.Expression>();
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) values.set(node.name.text, node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(tree); return { tree, values };
  };
  const current = inspect(source), legacy = inspect(before);
  for (const name of ['fileToDataUrl', 'loadImage', 'throwIfAborted', 'canvasToDataUrl', 'inspectPixels', 'shouldRejectTextAnalysis', 'cropImageRegionWithQuality', 'cropImageRegion']) {
    assert.equal(current.values.get(name)!.getText(current.tree), legacy.values.get(name)!.getText(legacy.tree), name);
  }
  const body = (subject: ReturnType<typeof inspect>) => (subject.values.get('prepareImageForAnalysis') as ts.ArrowFunction).body as ts.Block;
  const statements = body(current).statements.filter(statement => !ts.isIfStatement(statement) || !statement.expression.getText(current.tree).startsWith('options?.max'));
  assert.equal(body(current).statements.length - statements.length, 2);
  assert.deepEqual(statements.map(node => node.getText(current.tree)), body(legacy).statements.map(node => node.getText(legacy.tree)));
  for (const name of ['src/utils/imageCropGeometry.ts', 'src/utils/scanAnalysisPolicy.ts', 'src/utils/multiWineScan.ts']) {
    assert.equal(readFileSync(name, 'utf8'), execFileSync('git', ['show', `${baseline}:${name}`], { encoding: 'utf8' }), name);
  }
});
await check('Actual label call supplies native limits only; original three arguments and all other startScan code stay exact', async () => {
  const scannerPath = 'src/components/wine-import/MultiWineLabelScanner.tsx';
  const scanner = readFileSync(scannerPath, 'utf8');
  const parse = (text: string) => ts.createSourceFile(scannerPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const current = parse(scanner), legacy = parse(execFileSync('git', ['show', `${baseline}:${scannerPath}`], { encoding: 'utf8' }));
  let call: ts.CallExpression | undefined;
  const scanBody = (tree: ts.SourceFile) => {
    let value: ts.ArrowFunction | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'startScan') value = node.initializer as ts.ArrowFunction;
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 'prepareImageForAnalysis' && tree === current) call = node;
      ts.forEachChild(node, visit);
    };
    visit(tree); return value!;
  };
  const now = scanBody(current), old = scanBody(legacy);
  assert.ok(call); assert.equal(call.arguments.length, 4);
  assert.deepEqual(call.arguments.slice(0, 3).map(argument => argument.getText(current)), ['file', '2400', 'controller.signal']);
  for (const native of [false, true]) {
    const args: unknown[][] = [], input = file(), controller = new AbortController();
    runInNewContext(ts.transpileModule(call.getText(current), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      file: input, controller, isNative: native, NATIVE_IMAGE_PREPARATION_LIMITS: limits,
      prepareImageForAnalysis: (...values: unknown[]) => { args.push(values); },
    });
    assert.equal(args.length, 1); assert.equal(args[0][0], input); assert.equal(args[0][1], 2400);
    assert.equal(args[0][2], controller.signal); assert.equal(args[0][3], native ? limits : undefined);
  }
  const restored = ts.transform(now, [context => root => {
    const visit: ts.Visitor = node => ts.isCallExpression(node) && node.expression.getText(current) === 'prepareImageForAnalysis'
      ? context.factory.updateCallExpression(node, node.expression, node.typeArguments, node.arguments.slice(0, 3))
      : ts.visitEachChild(node, visit, context);
    return ts.visitNode(root, visit) as ts.ArrowFunction;
  }]);
  try {
    const printer = ts.createPrinter();
    assert.equal(printer.printNode(ts.EmitHint.Unspecified, restored.transformed[0], current), printer.printNode(ts.EmitHint.Unspecified, old, legacy));
  } finally { restored.dispose(); }
});
console.log(JSON.stringify({ checks, passed: checks, scope: 'Actual imageAnalysis module and label call with synthetic read/decode/canvas lifecycle controls; no network, detector redo, native memory or recognition claim.' }));
