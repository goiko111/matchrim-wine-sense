#!/usr/bin/env python3
"""Valida EJEMPLOS.json y reproduce NEGATIVOS.json. Draft-07 (jsonschema; equivalente a Ajv draft-07). Uso: python3 validate.py"""
import json, copy, sys, os
from jsonschema import Draft7Validator, FormatChecker
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, 'sensory-evidence-1.schema.json')))
E = json.load(open(os.path.join(HERE, 'EJEMPLOS.json')))
N = json.load(open(os.path.join(HERE, 'NEGATIVOS.json')))
AX = ["power", "sweetness", "acidity", "tannin", "fruity", "aging"]
root = Draft7Validator(S, format_checker=FormatChecker())
search = Draft7Validator({**S, '$ref': '#/definitions/searchResult'}, format_checker=FormatChecker())

def cross(b):
    err = []
    rows = b.get('attributesByVintage', [])
    m = b.get('evidenceMethod', {}); rules = m.get('rulesActive', [])
    for i, r in enumerate(rows):
        for a in AX:
            if a in r and r['evidence'][a]['value'] != r[a]: err.append(f'X1 fila {i} eje {a}')
        for a, ev in r['evidence'].items():
            t = r['origin']['type']
            if ev['state'] == 'ai_estimate_recorded' and t != 'ai_recorded': err.append(f'X5 fila {i} {a}')
            if ev['state'] == 'unknown_origin' and t != 'unrecorded': err.append(f'X5 fila {i} {a}')
            if ev['state'] == 'suspected_default':
                rl = ev['rule']; key = f"{rl['id']}@{rl['version']}"
                if key not in rules: err.append(f'X6 fila {i} {a} regla {key} no activa')
                if key == 'R2@1' and (a != 'tannin' or b.get('type') not in ('blanco', 'espumoso')): err.append(f'X6 fila {i} R2@1 fuera de alcance')
            if 'R2@1' in rules and a == 'tannin' and b.get('type') in ('blanco', 'espumoso') and ev['value'] == 3 and ev['state'] != 'suspected_default':
                err.append(f'X7 fila {i} R2@1 no aplicada')
    gen = [r for r in rows if r['vintage'] is None]
    vs = [r['vintage'] for r in rows if r['vintage'] is not None]
    if len(vs) != len(set(vs)): err.append('X3 añada exacta repetida')
    for r in gen:
        if ('conflict' in r) != (len(gen) > 1): err.append('X2 conflict inconsistente')
    vr = b.get('vintageResolution')
    if vr:
        if vr['genericRowCount'] != len(gen): err.append('X2 genericRowCount')
        if (vr['status'] == 'exact') != (vr['requested'] in vs): err.append('X4 status/fila de la añada pedida')
        if 'vintages' in b and sorted(vr['knownVintages']) != sorted(b['vintages']): err.append('X4 knownVintages != vintages')
    return err

def apply(doc, ops):
    doc = copy.deepcopy(doc)
    for op in ops:
        path = (op.get('set') or op.get('del')).split('.')
        cur = doc
        for p in path[:-1]: cur = cur[int(p)] if isinstance(cur, list) else cur[p]
        k = path[-1]
        if 'set' in op:
            if isinstance(cur, list):
                i = int(k)
                if i == len(cur): cur.append(op['value'])
                else: cur[i] = op['value']
            else: cur[k] = op['value']
        else:
            if isinstance(cur, list): cur.pop(int(k))
            else: del cur[k]
    return doc

fails = 0
def check(cond, msg):
    global fails
    print(('OK   ' if cond else 'FALLA'), msg); fails += (not cond)

for name, doc in E['valid'].items():
    errs = [e.message[:60] for e in root.iter_errors(doc)] + cross(doc)
    check(not errs, f'valido {name} {errs[:2]}')
for name, ex in E['search'].items():
    check(not list(search.iter_errors(ex['resultItem'])), f'valido busqueda {name}')
for n in N['schema']:
    doc = n['doc'] if 'doc' in n else apply(E['valid'][n['base']], n['ops'])
    v = search if n.get('search') else root
    check(bool(list(v.iter_errors(doc))), f"negativo schema {n['id']}: {n['expect']}")
for n in N['cross']:
    doc = apply(E['valid'][n['base']], n['ops'])
    check(not list(root.iter_errors(doc)) and bool(cross(doc)), f"negativo cross {n['id']}: {n['expect']} -> {cross(doc)[:1]}")
print('RESULTADO:', 'TODO OK' if not fails else f'{fails} fallos'); sys.exit(1 if fails else 0)
