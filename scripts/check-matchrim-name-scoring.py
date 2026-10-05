#!/usr/bin/env python3
import ast
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


# Load only the pure scoring functions, without importing the browser runner.
source = Path(__file__).with_name('qa-matchrim-real-e2e.py')
tree = ast.parse(source.read_text())
names = {'normalize_name', 'single_name_similarity', 'name_similarity', 'compare_wine_names'}
module = ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names], type_ignores=[])
scope = {'re': re, 'unicodedata': unicodedata, 'SequenceMatcher': SequenceMatcher}
exec(compile(module, str(source), 'exec'), scope)
similarity = scope['name_similarity']

assert similarity('Castano Monastrell', 'Castano Monastrell 2023') >= 0.9
assert similarity('Brut JP Chenet', 'JP Chenet Brut') >= 0.9
assert similarity('Barolo Marchesi di Barolo', 'Barbaresco Marchesi di Barolo') < 0.78
assert similarity('Laurent Perrier Rose', 'Laurent Perrier Ultra Brut') < 0.78
assert similarity('Laurent Perrier La Cuvee', 'Laurent Perrier Rose') < 0.78
result = scope['compare_wine_names'](['Muga Reserva'], ['Muga Reserva', 'Muga Reserva'])
assert result['precision'] == 0.5 and result['recall'] == 1.0
print('Matchrim name scoring: PASS (variants distinct, duplicates penalized)')
