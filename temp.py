import json, pathlib
base = pathlib.Path('simulations/auto-ai')
for i in range(1,17):
    path = base / str(i)
    req = json.loads((path / 'request.json').read_text())
    resp = json.loads((path / 'response.json').read_text())
    print('--- step', i)
    if 'task' in req and 'result' not in req:
        print('  client task form', req['task'])
    if 'context' in req:
        print('  context execution', req['context'].get('execution'))
    if 'result' in req:
        print('  result', req['result'])
    exec_keys = list(resp.get('execute', {}).keys())
    if exec_keys:
        print('  execute keys', exec_keys)
