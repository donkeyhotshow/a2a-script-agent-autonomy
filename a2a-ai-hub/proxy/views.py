"""
Views Module
Contains HTML templates for web UI
"""

PROMISE_VIEW_HTML = """
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Promise Monitor</title>
  <style>
    body { font-family: system-ui,-apple-system,'Segoe UI',sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:0; }
    main { max-width:960px; margin:0 auto; padding:2rem; }
    h1 { margin-bottom:0.5rem; }
    .panel { background:#1e293b; border-radius:12px; padding:1.5rem; box-shadow:0 10px 30px rgba(15,23,42,.6); }
    .row { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.35rem; }
    .label { font-weight:600; color:#94a3b8; }
    pre { background:#0f172a; border:1px solid #334155; border-radius:8px; padding:1rem; max-height:300px; overflow:auto; white-space:pre-wrap; word-break:break-word; }
    textarea { width:100%; min-height:120px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#e2e8f0; padding:0.5rem; font-family:monospace; }
    button { border:none; border-radius:8px; padding:0.65rem 1rem; font-weight:600; background:#38bdf8; color:#0f172a; cursor:pointer; transition:transform .15s ease; }
    button:active { transform:scale(.98); }
    button:disabled { opacity:.5; cursor:not-allowed; }
    .section { margin-top:1.25rem; }
    .section-title { font-size:0.95rem; text-transform:uppercase; letter-spacing:0.12em; color:#94a3b8; margin-bottom:0.35rem; }
    .actions { display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.5rem; }
    .message { margin-top:1rem; padding:0.75rem 1rem; border-radius:8px; background:#111827; font-size:0.9rem; }
    .message.error { background:#881337; color:#ffe4e6; }
    .message.info { background:#0f172a; }
    .hidden { display:none; }
    .input-row { display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; }
    input[type=text], input[type=number] { border-radius:8px; border:1px solid #334155; background:#0f172a; color:#e2e8f0; padding:0.4rem 0.75rem; }
    .empty { background:#1f2937; border-radius:12px; padding:1.75rem; text-align:center; border:1px solid #334155; }
    .response-meta { font-size:0.9rem; color:#cbd5f5; margin-bottom:0.35rem; }
  </style>
</head>
<body>
  <main>
    <h1>Promise monitor</h1>
    <p>Первый ожидающий <code>promise</code>. Можно копировать запрос, запускать его вручную или отправлять собственный ответ.</p>
    <div id="alert" class="message info">Загрузка...</div>
    <div id="no-promise" class="empty hidden">Нет ожидающих <code>promise</code>.</div>
    <div id="panel" class="panel hidden">
      <div class="row"><span class="label">Promise ID:</span><span id="promise-id"></span></div>
      <div class="row"><span class="label">Method:</span><span id="promise-method"></span></div>
      <div class="row"><span class="label">Target:</span><span id="promise-target"></span></div>
      <div class="row"><span class="label">Created:</span><span id="promise-created"></span></div>
      <div class="row"><span class="label">Status:</span><span id="promise-status"></span></div>

      <div class="section">
        <div class="section-title">Запрос</div>
        <pre id="request-json">—</pre>
        <div class="actions">
          <button id="copy-request">Copy request</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Ответ вручную</div>
        <div class="input-row">
          <label>Статус:<input type="number" id="manual-status" value="200" min="100" max="599"></label>
          <label>Content-Type:<input type="text" id="manual-content-type" value="text/plain; charset=utf-8"></label>
        </div>
        <textarea id="manual-body" placeholder="Вставьте тело ответа (JSON или текст)"></textarea>
        <div class="actions">
          <button id="approve-response">Одобрить ответ</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Действия</div>
        <div class="actions">
          <button id="execute-request">Выполнить запрос</button>
          <button id="refresh-view">Обновить</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Последний ответ</div>
        <div id="response-meta" class="response-meta">—</div>
        <pre id="response-body">—</pre>
      </div>

      <div id="action-msg" class="message info">Готово к действиям.</div>
    </div>
  </main>

  <script>
    const state = { promiseId: null, request: null };
    const alertEl = document.getElementById('alert');
    const panelEl = document.getElementById('panel');
    const noPromiseEl = document.getElementById('no-promise');
    const responseMetaEl = document.getElementById('response-meta');
    const responseBodyEl = document.getElementById('response-body');
    const requestEl = document.getElementById('request-json');

    function setAlert(text, error = false) {
      alertEl.textContent = text;
      alertEl.className = 'message ' + (error ? 'error' : 'info');
    }

    function setActionMessage(text, error = false) {
      const msg = document.getElementById('action-msg');
      msg.textContent = text;
      msg.className = 'message ' + (error ? 'error' : 'info');
    }

    async function loadPromise() {
      setAlert('Загрузка...');
      try {
        const res = await fetch('/ui/promises/next');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        const data = await res.json();
        if (!data.promiseId || !data.pending) {
          state.promiseId = null;
          state.request = null;
          panelEl.classList.add('hidden');
          noPromiseEl.classList.remove('hidden');
          setAlert('Нет ожидающих запросов.');
          return;
        }

        state.promiseId = data.promiseId;
        state.request = data.request || {};
        document.getElementById('promise-id').textContent = data.promiseId;
        document.getElementById('promise-method').textContent = data.method || '—';
        document.getElementById('promise-target').textContent = data.target_url || '—';
        document.getElementById('promise-created').textContent = data.created_at || '—';
        document.getElementById('promise-status').textContent = data.status || 'pending';
        requestEl.textContent = JSON.stringify(state.request, null, 2);
        responseMetaEl.textContent = data.result_status_code
          ? `Статус: ${data.result_status_code} · ${data.result_content_type || '—'}`
          : 'Результат пока не получен';
        responseBodyEl.textContent = data.error
          ? `Ошибка: ${data.error}`
          : '—';

        panelEl.classList.remove('hidden');
        noPromiseEl.classList.add('hidden');
        setAlert(`Ожидает ответ: ${data.promiseId}`);
      } catch (error) {
        setAlert('Ошибка загрузки: ' + error.message, true);
        panelEl.classList.add('hidden');
        noPromiseEl.classList.add('hidden');
      }
    }

    document.getElementById('copy-request').addEventListener('click', async () => {
      if (!state.request) {
        setActionMessage('Нет запроса для копирования.', true);
        return;
      }
      try {
        await navigator.clipboard.writeText(JSON.stringify(state.request, null, 2));
        setActionMessage('Запрос скопирован в буфер.');
      } catch (error) {
        setActionMessage('Не удалось скопировать: ' + error.message, true);
      }
    });

    document.getElementById('execute-request').addEventListener('click', async () => {
      if (!state.promiseId) {
        setActionMessage('Нет активного promise.', true);
        return;
      }
      setActionMessage('Выполняем запрос...');
      try {
        const response = await fetch(`/ui/promises/${state.promiseId}/execute`, { method: 'POST' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Запрос не выполнился');
        }
        setActionMessage(`Запрос выполнен (status ${data.result_status_code}).`);
        await loadPromise();
      } catch (error) {
        setActionMessage('Ошибка: ' + error.message, true);
      }
    });

    document.getElementById('approve-response').addEventListener('click', async () => {
      if (!state.promiseId) {
        setActionMessage('Нет активного promise.', true);
        return;
      }
      const defStatus = parseInt(document.getElementById('manual-status').value, 10) || 200;
      const contentType = document.getElementById('manual-content-type').value || 'text/plain; charset=utf-8';
      const body = document.getElementById('manual-body').value || '';
      setActionMessage('Сохраняем вручную...');
      try {
        const response = await fetch(`/ui/promises/${state.promiseId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status_code: defStatus,
            content_type: contentType,
            body,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Не удалось сохранить');
        }
        setActionMessage('Ответ сохранён вручную.');
        await loadPromise();
      } catch (error) {
        setActionMessage('Ошибка: ' + error.message, true);
      }
    });

    document.getElementById('refresh-view').addEventListener('click', () => {
      loadPromise();
    });

    document.addEventListener('DOMContentLoaded', () => {
      loadPromise();
    });
  </script>
</body>
</html>
"""
