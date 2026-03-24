import json
from pathlib import Path
base = Path('simulations/auto-ai')
step_dirs = sorted(
    (p for p in base.iterdir() if p.is_dir() and p.name.isdigit()),
    key=lambda p: int(p.name),
)
if not step_dirs:
    raise SystemExit('no numeric step dirs under simulations/auto-ai')
for step_dir in step_dirs:
    req_path = step_dir / 'request.json'
    resp_path = step_dir / 'response.json'
    if not req_path.exists() or not resp_path.exists():
        raise SystemExit(f'missing request/response for {step_dir.name}')
    req = json.loads(req_path.read_text(encoding='utf-8'))
    resp = json.loads(resp_path.read_text(encoding='utf-8'))
    client = {'projectId': '123', 'sessionId': '456'}
    if isinstance(req.get('task'), str):
        client['result'] = {'message': req['task']}
    elif 'result' in req:
        client['result'] = req['result']
    elif 'context' in req and 'result' in req['context']:
        client['result'] = req['context']['result']
    execute = resp.get('execute')
    if execute is None:
        execute = resp.get('context', {}).get('execute')
    received = {'projectId': '123', 'sessionId': '456'}
    if execute is not None:
        received['execute'] = execute
    enc = 'utf-8'
    step_dir.joinpath('client.json').write_text(
        json.dumps(client, indent=2, ensure_ascii=False) + '\n', encoding=enc
    )
    step_dir.joinpath('received.json').write_text(
        json.dumps(received, indent=2, ensure_ascii=False) + '\n', encoding=enc
    )
print('generated client/received for auto-ai')
