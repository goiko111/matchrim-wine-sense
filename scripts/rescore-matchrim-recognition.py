#!/usr/bin/env python3
"""Rescore saved real-provider reports without uploads or provider calls."""
import argparse
import ast
import hashlib
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('reports', nargs='+', type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
source = Path(__file__).with_name('qa-matchrim-real-e2e.py')
source_text = source.read_text()
function_names = {'normalize_name', 'single_name_similarity', 'name_similarity', 'compare_wine_names'}
tree = ast.parse(source_text)
module = ast.Module(body=[node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in function_names], type_ignores=[])
scope = {'re': re, 'unicodedata': unicodedata, 'SequenceMatcher': SequenceMatcher}
exec(compile(module, str(source), 'exec'), scope)
compare = scope['compare_wine_names']
results = []
for report_path in args.reports:
    payload = json.loads(report_path.read_text())
    for result in payload['results']:
        previous = result.get('accuracy')
        expected = ([match['expected'] for match in previous['matches']] + previous['missed']) if previous else []
        displayed = result.get('displayed_names', [])
        accuracy = compare(expected, displayed) if expected else None
        backend = result.get('backend', {})
        backend_accuracy = compare(expected, backend.get('names', [])) if expected else None
        if result.get('expectation') == 'abstain':
            status = 'PASS' if not displayed and result['status'] == 'PASS' else 'FAIL'
        elif accuracy:
            status = 'PASS' if result['status'] == 'PASS' and accuracy['precision'] >= .9 and accuracy['recall'] >= .85 else 'FAIL'
        else:
            status = 'STRUCTURAL_ONLY'
        results.append({
            'source_report': str(report_path.resolve()),
            'fixture': result['fixture'],
            'expected_names': expected,
            'displayed_names': displayed,
            'name_accuracy': accuracy,
            'backend_name_accuracy': backend_accuracy,
            'latency_ms': result['latency_ms'],
            'individual_affinity_scores': result['individual_affinity_scores'],
            'original_status': result['status'],
            'rescored_status': status,
        })
output = {
    'scope': 'Approximate reference-name matching only; producer, vintage, price and sensory facts require separate independent validation.',
    'provider_calls': 0,
    'scorer_sha256': hashlib.sha256(source_text.encode()).hexdigest(),
    'results': results,
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
for result in results:
    accuracy = result['name_accuracy']
    print(result['fixture'], result['rescored_status'], f"P={accuracy['precision']} R={accuracy['recall']}" if accuracy else 'no exhaustive identity ground truth')
