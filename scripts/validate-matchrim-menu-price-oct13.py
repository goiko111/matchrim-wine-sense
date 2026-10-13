"""Local validation receipt. No servers, provider, schema, corpus regeneration or release mutations."""
import argparse
import hashlib
import json
import subprocess
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[1]
action_input = root / 'docs/qa-evidence/matchrim-menu-actions-2026-10-12/before/results.json'
action_output = args.output / 'actions'
(action_output / 'before').mkdir(parents=True, exist_ok=True)
shutil.copyfile(action_input, action_output / 'before/results.json')
commands = [
    ['npx', 'tsx', 'scripts/check-matchrim-menu-price-resolution-oct13.ts', str(args.output / 'contracts.json')],
    ['npx', 'tsx', 'scripts/check-matchrim-menu-save-oct12.ts', str(args.output)],
    ['npx', 'tsx', 'scripts/check-matchrim-menu-list-oct12.ts'],
    ['npx', 'tsx', 'scripts/check-matchrim-menu-comparison-oct12.ts'],
    ['npx', 'tsx', 'scripts/check-matchrim-menu-actions-oct12.ts', str(action_output)],
    ['npm', 'run', 'test:release'],
    ['npm', 'run', 'typecheck'],
    ['npm', 'run', 'lint'],
    ['npm', 'run', 'build'],
    ['git', 'diff', '--check'],
]
results = []
for index, command in enumerate(commands):
    started = time.perf_counter()
    run = subprocess.run(command, cwd=root, capture_output=True, text=True)
    log = args.output / ('%02d-' % index + command[0] + '.log')
    log.write_text(run.stdout + run.stderr)
    results.append({'command': command, 'exitCode': run.returncode, 'durationSeconds': round(time.perf_counter() - started, 3), 'log': log.name, 'sha256': hashlib.sha256(log.read_bytes()).hexdigest()})
    print(command, 'PASS' if run.returncode == 0 else 'FAIL', flush=True)
(args.output / 'validation.json').write_text(json.dumps({'scope': __doc__, 'timeUtc': datetime.now(timezone.utc).isoformat(), 'allPassed': all(row['exitCode'] == 0 for row in results), 'reusedActionReceipt': {'path': str(action_input.relative_to(root)), 'sha256': hashlib.sha256(action_input.read_bytes()).hexdigest()}, 'commands': results}, indent=2) + '\n')
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
