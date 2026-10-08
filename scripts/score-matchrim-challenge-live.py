"""Score bounded observations without promoting partial annotations to full truth."""
import argparse
import importlib.util
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('real_e2e', ROOT / 'scripts/qa-matchrim-real-e2e.py')
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)


def percentile(values, p):
    return sorted(values)[max(0, math.ceil(len(values) * p) - 1)] if values else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    args = parser.parse_args()
    run = json.loads((args.run / 'run.json').read_text())
    ledger = json.loads((args.run / 'request-ledger.json').read_text())
    review = json.loads((ROOT / 'qa/ground-truth/matchrim-challenge-v4-review-20261008.json').read_text())
    invalid_negatives = {r['case'] for r in review['corrections'] if r.get('invalid_negative')}
    cases, functions, http = [], Counter(), Counter()
    for result in run['results']:
        trace = json.loads((args.run / result['case'] / 'backend-trace.json').read_text())
        for call in trace:
            functions[call['deployed_function']] += 1
            http[str(call['status'])] += 1
        mode = result['mode']
        food = mode in {'menu-comida', 'plato'}
        dishes = next((c['payload'].get('dishes', []) for c in reversed(trace)
                       if c['function'] == 'scan-food-pairing' and c['status'] == 200), [])
        names = [d.get('nombre', '') for d in dishes] if food else result.get('ui_rows', [])
        expected = result.get('expected_food_terms') if food else result.get('expected_wines')
        # Food tags describe ingredients, not necessarily independent dishes; translated
        # outputs need a reviewed alias set before lexical metrics are meaningful.
        score_expected = expected if not food or result['case'] == 'commons-171025734-menu-comida' else None
        comparison = legacy.compare_wine_names(score_expected, names) if score_expected else None
        negative = result['expectation'] == 'abstain' or (
            not food and result['expectation'] in {'food_only', 'no_grape_wine_identity'})
        invalid_annotation = result['case'] in invalid_negatives
        if invalid_annotation:
            negative = False
        terminal_ok = result['terminal'] in {'completed', 'abstained'}
        negative_pass = (terminal_ok and not names and bool(trace)
                         and all(c['status'] == 200 for c in trace)) if negative else None
        exhaustive = result['annotation_scope'] == 'legacy_reference_names' or result['case'] == 'commons-171025734-menu-comida'
        issues = []
        if invalid_annotation:
            issues.append('NEGATIVE_ANNOTATION_INVALID_EXCLUDED')
        if result.get('harness_error'):
            issues.append('HARNESS_ERROR')
        if not terminal_ok:
            issues.append('NON_TERMINAL_OR_PROVIDER_ERROR')
        if len(ledger['requests']) >= ledger['additional_limit'] and result.get('network_failures'):
            issues.append('CHECK_BUDGET_INTERRUPTION')
        if result.get('horizontal_overflow'):
            issues.append('HORIZONTAL_OVERFLOW')
        if any(c['status'] >= 400 for c in trace):
            issues.append('HTTP_ERROR_INCLUDING_RECOVERED')
        if negative and names:
            issues.append('NEGATIVE_RETURNED_ITEMS')
        if comparison and comparison['missed']:
            issues.append('ANNOTATED_NAMES_MISSED')
        if comparison and exhaustive and comparison['false_positives']:
            issues.append('UNMATCHED_OR_DUPLICATE_NAMES')
        if result['case'] == 'commons-7478133-etiqueta' and 'botellas visibles' in result.get('body', ''):
            issues.append('PRINTED_LABELS_COUNTED_AS_PHYSICAL_BOTTLES')
        # Raw outputs are preserved for human review; they are not canonical truth.
        raw_versions = sorted({str(c['payload'][key]) for c in trace for key in
            ['scan_version', 'analysis_version', 'detector_version', 'ai_model', 'ai_provider'] if c['payload'].get(key)})
        row = {'case': result['case'], 'mode': mode, 'terminal': result['terminal'], 'items': len(names),
            'actual_names_or_rows': names, 'expected': expected, 'negative': negative,
            'negative_pass': negative_pass, 'issues': issues, 'latency_ms': result.get('latency_ms'),
            'function_calls': len(trace), 'runtime_versions': raw_versions,
            'region_count': result.get('regions'), 'canonical_identity_precision': None,
            'canonical_identity_recall': None, 'independent_human_validated': False}
        if comparison:
            row['name_observations'] = {k: v for k, v in comparison.items()
                if exhaustive or k not in {'precision', 'false_positives'}}
            row['metric_scope'] = 'exhaustive legacy/agent name transcription, not canonical identity' if exhaustive else 'visible annotated subset only; other outputs unjudged'
            row['aggregate_name_eligible'] = exhaustive
        if food:
            row['recommendations'] = [{ 'dish': d.get('nombre'), 'score': d.get('match'),
                'wines': [{'name': w.get('nombre'), 'score': w.get('match'), 'reason': w.get('razon')}
                          for w in d.get('recomendaciones', [])]} for d in dishes]
        cases.append(row)
    full = [r for r in cases if r.get('aggregate_name_eligible')]
    matched = sum(r['name_observations']['matched_count'] for r in full)
    actual = sum(r['name_observations']['actual_count'] for r in full)
    expected = sum(r['name_observations']['expected_count'] for r in full)
    by_mode = {}
    for mode in sorted({r['mode'] for r in full}):
        group = [r['name_observations'] for r in full if r['mode'] == mode]
        m, a, e = (sum(r[key] for r in group) for key in ['matched_count', 'actual_count', 'expected_count'])
        by_mode[mode] = {'cases': len(group), 'matched': m, 'actual': a, 'expected': e,
            'precision': m / a if a else None, 'recall': m / e if e else None}
    negatives = [r for r in cases if r['negative']]
    latency = [r['latency_ms'] for r in cases if r['latency_ms'] is not None]
    repeated = {}
    for row in full:
        if row['mode'] != 'carta-vinos':
            continue
        matches = row['name_observations']['matches']
        counts = Counter(m['expected'] for m in matches)
        for match in matches:
            score = re.search(r'(?:≈)?(\d{1,3})%', match['actual'])
            if score and counts[match['expected']] == 1:
                repeated.setdefault(match['expected'], []).append({'case': row['case'], 'score': int(score[1])})
    variations = [{'name': name, 'observations': observations,
                   'range_points': max(o['score'] for o in observations) - min(o['score'] for o in observations)}
                  for name, observations in repeated.items() if len(observations) > 1]
    variations.sort(key=lambda v: -v['range_points'])
    summary = {'candidate': 77, 'selected': run['selected'], 'completed': len(cases),
        'complete': len(cases) == run['selected'], 'certified': False,
        'new_edge_requests': len(ledger['requests']), 'limit': ledger['additional_limit'],
        'provider_stop': ledger['blocked'], 'functions': dict(functions), 'http_statuses': dict(http),
        'negative_cases': len(negatives), 'negative_pass': sum(r['negative_pass'] for r in negatives),
        'negative_false_item_cases': [r['case'] for r in negatives if r['items']],
        'exhaustive_name_metrics': {'cases': len(full), 'matched': matched, 'actual': actual, 'expected': expected,
            'precision': matched / actual if actual else None, 'recall': matched / expected if expected else None},
        'exhaustive_name_metrics_by_mode': by_mode,
        'cross_photo_affinity_variation': {'scope': 'Same synthetic profile, matched reference names across different photos. Inferred wine attributes may differ; not a fixed-input scoring determinism test.', 'items': variations},
        'latency': {'p50_ms': percentile(latency, .5), 'p95_ms': percentile(latency, .95),
            'definition': 'Local UI elapsed including navigation and 4-second terminal stability wait; not provider-only latency'},
        'issue_counts': dict(Counter(i for r in cases for i in r['issues'])), 'cases': cases}
    (args.run / 'scored.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({k: v for k, v in summary.items() if k != 'cases'}, indent=2))


if __name__ == '__main__':
    main()
