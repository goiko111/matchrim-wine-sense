"""Offline safeguards for the live challenge report; never contacts a backend."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='matchrim-live-scorer-') as directory:
    root = Path(directory)
    rows = [
        {'case': 'negative-http-error', 'mode': 'carta-vinos', 'expectation': 'abstain', 'terminal': 'abstained',
         'annotation_scope': 'structural', 'ui_rows': [], 'http': 500},
        {'case': 'ingredient-tags', 'mode': 'plato', 'expectation': 'mode_specific', 'terminal': 'completed',
         'annotation_scope': 'structural', 'expected_food_terms': ['cheese', 'bread'], 'http': 200},
        {'case': 'partial-wines', 'mode': 'etiqueta', 'expectation': 'identify_visible_subset', 'terminal': 'completed',
         'annotation_scope': 'visible_named_subset', 'expected_wines': ['Muga Reserva'],
         'ui_rows': ['Muga Reserva', 'Another unannotated wine'], 'http': 200},
        {'case': 'commons-55328769-carta-vinos', 'mode': 'carta-vinos', 'expectation': 'abstain',
         'terminal': 'completed', 'annotation_scope': 'structural', 'ui_rows': ['Visible tasting menu'], 'http': 200},
        *[{'case': f'original-{i}', 'mode': 'carta-vinos', 'expectation': 'legacy', 'terminal': 'completed',
           'annotation_scope': 'legacy_reference_names', 'expected_wines': ['Muga Reserva'],
           'ui_rows': [f'Muga Reserva\n{score}%'], 'http': 200} for i, score in enumerate([70, 80])],
    ]
    for row in rows:
        folder = root / row['case']
        folder.mkdir()
        (folder / 'backend-trace.json').write_text(json.dumps([{
            'function': 'scan-food-pairing' if row['mode'] == 'plato' else 'scan-wine-menu',
            'deployed_function': 'test-only', 'status': row['http'],
            'payload': {'dishes': [{'nombre': 'Tabla de queso y pan'}]} if row['mode'] == 'plato' else {},
        }]))
    (root / 'request-ledger.json').write_text(json.dumps({'requests': [], 'additional_limit': 300, 'blocked': None}))
    (root / 'run.json').write_text(json.dumps({'selected': len(rows), 'results': rows}))
    subprocess.run([sys.executable, str(ROOT / 'scripts/score-matchrim-challenge-live.py'), '--run', str(root)],
                   check=True, capture_output=True)
    scored = json.loads((root / 'scored.json').read_text())
    assert scored['negative_cases'] == 1 and scored['negative_pass'] == 0
    partial = next(row for row in scored['cases'] if row['case'] == 'partial-wines')
    assert 'precision' not in partial['name_observations']
    assert 'false_positives' not in partial['name_observations']
    assert 'menu-comida' not in scored['exhaustive_name_metrics_by_mode']
    assert scored['cross_photo_affinity_variation']['items'][0]['range_points'] == 10
    assert all(row['canonical_identity_precision'] is None for row in scored['cases'])
    assert not scored['certified']
print('Live scoring safeguards PASS: errors are not abstention success, partial truth is not precision, mixed negatives excluded, affinity variation traced')
