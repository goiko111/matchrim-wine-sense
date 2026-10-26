import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const prepRoot = path.resolve(process.argv[2]), compiledRoot = path.resolve(process.argv[3]);
const prep = JSON.parse(fs.readFileSync(path.join(prepRoot, 'preparation.json')));
const compiled = JSON.parse(fs.readFileSync(path.join(compiledRoot, 'RESULT.json')));
assert(prep.passed && compiled.passed && prep.commit === compiled.sourceCommit && prep.build === compiled.build);
const sourcePath = 'src/data/quizData.ts', bytes = fs.readFileSync(sourcePath);
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha(bytes), prep.sourceFingerprints[sourcePath]);
const source = ts.createSourceFile(sourcePath, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
const images = new Map();
let questions;
for (const statement of source.statements) {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text.startsWith('@/assets/quiz/')) {
    assert(statement.importClause?.name);
    images.set(statement.importClause.name.text, 'src/' + statement.moduleSpecifier.text.slice(2));
  }
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.name.text === 'questions') {
      assert(!questions && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer));
      questions = declaration.initializer.elements;
    }
  }
}
assert(questions); assert.equal(questions.length, 20); assert.equal(images.size, 20);
const records = questions.map((node, index) => {
  assert(ts.isObjectLiteralExpression(node));
  const properties = new Map(node.properties.map(property => {
    assert(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name));
    return [property.name.text, property.initializer];
  }));
  const id = properties.get('id'), text = properties.get('text'), image = properties.get('image');
  assert(ts.isNumericLiteral(id) && ts.isStringLiteral(text) && ts.isIdentifier(image));
  assert.equal(Number(id.text), index + 1);
  const file = images.get(image.text); assert(file);
  const content = fs.readFileSync(file), hash = sha(content);
  assert(content[0] === 0xff && content[1] === 0xd8 && content.at(-2) === 0xff && content.at(-1) === 0xd9,
    'Expected complete retained JPEG: ' + file);
  const resources = Object.entries(prep.webResources).filter(([, value]) => value === hash);
  assert.equal(resources.length, 1, 'Expected one exact bundled asset per source photo: ' + file);
  const [resource] = resources[0];
  assert.equal(sha(fs.readFileSync(path.join(prepRoot, 'web', resource))), hash);
  assert.equal(sha(fs.readFileSync(path.join(compiled.app.path, 'public', resource))), hash);
  return { id: Number(id.text), question: text.text, sourceAsset: file, bundledResource: resource, sha256: hash,
    bytes: content.length, boundToCompiledApp: true };
});
assert.equal(new Set(records.map(row => row.sourceAsset)).size, 20);
console.log(JSON.stringify({ recordedUTC: new Date().toISOString(), passed: true, build: prep.build,
  sourceCommit: prep.commit, questions: records,
  scope: 'Actual TypeScript AST question/import mapping and exact source/prepared/compiled JPEG byte parity for20retained assets. Not twenty native image-frame captures, decoding, human recognition, ingredient/preparation verification or quiz calibration.',
  sourceSHA256: sha(bytes), externalCalls: 0, writes: 0,
}, null, 2));
