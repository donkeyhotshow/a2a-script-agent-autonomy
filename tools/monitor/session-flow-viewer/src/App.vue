<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Edge, Node } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

import FlowCanvas from './components/FlowCanvas.vue';
import type { LoadedSession } from './lib/types';
import { loadSessionFromFileList, readFileListAsTexts } from './lib/loadSessionFiles';
import { buildGraphFromSession } from './lib/sessionGraph';
import { detailText } from './lib/summarizeStep';
import { probeHub } from './lib/hubProbe';

const loaded = ref<LoadedSession | null>(null);
const loadError = ref('');
const panelText = ref('Select a session folder (must include session-index.json and step JSON).');
const hubBase = ref('http://localhost:11434');
const webBase = ref('http://127.0.0.1:5173');
const hubProbeJson = ref('');
const hubBusy = ref(false);

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

function applyLoaded(s: LoadedSession) {
  loaded.value = s;
  const g = buildGraphFromSession(s);
  nodes.value = g.nodes;
  edges.value = g.edges;
  panelText.value = `Loaded ${s.sessionId} (${s.steps.size} steps with files). Click a node for JSON.`;
  loadError.value = '';
}

async function onFolderInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const fl = input.files;
  if (!fl?.length) return;
  const texts = await readFileListAsTexts(fl);
  const s = loadSessionFromFileList(texts);
  if (!s) {
    loadError.value = 'No session-index.json in selection.';
    return;
  }
  applyLoaded(s);
  input.value = '';
}

async function onDrop(ev: DragEvent) {
  ev.preventDefault();
  const dt = ev.dataTransfer;
  if (!dt?.files?.length) return;
  const texts = await readFileListAsTexts(dt.files);
  const s = loadSessionFromFileList(texts);
  if (!s) {
    loadError.value = 'No session-index.json in dropped files.';
    return;
  }
  applyLoaded(s);
}

function onDragOver(ev: DragEvent) {
  ev.preventDefault();
}

function onNodeClick(ev: { node: { id: string } }) {
  const id = ev.node.id;
  const s = loaded.value;
  if (!s) return;
  if (id === 'meta') {
    panelText.value = JSON.stringify(s.index, null, 2);
    return;
  }
  const m = /^step-(\d+)$/.exec(id);
  if (!m) return;
  const n = parseInt(m[1], 10);
  const art = s.steps.get(n);
  panelText.value = art ? detailText(art) : `Step ${n}: no JSON files in folder.`;
}

const canProbe = computed(() => hubBase.value.trim().length > 0);

async function runHubProbe() {
  if (!canProbe.value) return;
  hubBusy.value = true;
  hubProbeJson.value = '';
  try {
    const r = await probeHub({
      hubBase: hubBase.value.trim(),
      webBase: webBase.value.trim() || undefined,
    });
    hubProbeJson.value = JSON.stringify(r, null, 2);
  } catch (e) {
    hubProbeJson.value = String((e as Error)?.message || e);
  } finally {
    hubBusy.value = false;
  }
}
</script>

<template>
  <div class="app">
    <header class="toolbar">
      <label class="btn">
        Open session folder
        <input
          type="file"
          webkitdirectory
          multiple
          class="hidden"
          @change="onFolderInput"
        />
      </label>
      <span class="hint">Need session-index.json + step/*/server-response.json (etc.)</span>
      <span v-if="loadError" class="err">{{ loadError }}</span>
      <span v-else-if="loaded" class="ok">{{ loaded.sessionId }}</span>
    </header>

    <div class="dropzone" @drop="onDrop" @dragover="onDragOver">
      <FlowCanvas v-model:nodes="nodes" v-model:edges="edges" @node-click="onNodeClick" />
    </div>

    <aside class="side">
      <h3>Step detail / index</h3>
      <pre class="panel">{{ panelText }}</pre>

      <h3>Hub promise queues (like check-promise-queue)</h3>
      <div class="row">
        <label>AI_HUB_URL <input v-model="hubBase" type="text" spellcheck="false" /></label>
      </div>
      <div class="row">
        <label>WEB_BASE (optional) <input v-model="webBase" type="text" spellcheck="false" /></label>
      </div>
      <button type="button" :disabled="!canProbe || hubBusy" @click="runHubProbe">
        {{ hubBusy ? 'Fetching…' : 'GET pending + errors' }}
      </button>
      <pre v-if="hubProbeJson" class="panel small">{{ hubProbeJson }}</pre>
    </aside>
  </div>
</template>

<style>
:root {
  color-scheme: dark;
  --bg: #0f1114;
  --panel: #1a1d23;
  --border: #2a3140;
  --text: #e8eaed;
  --muted: #9aa0a6;
  --accent: #8ab4f8;
}
* {
  box-sizing: border-box;
}
html,
body,
#app {
  margin: 0;
  height: 100%;
  font-family: system-ui, Segoe UI, sans-serif;
  background: var(--bg);
  color: var(--text);
}
.app {
  display: grid;
  grid-template-columns: 1fr 380px;
  grid-template-rows: auto 1fr;
  height: 100%;
  gap: 0;
}
.toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.dropzone {
  min-height: 0;
  border-right: 1px solid var(--border);
}
.dropzone .vue-flow {
  height: 100%;
  min-height: 400px;
}
.btn {
  display: inline-block;
  padding: 6px 12px;
  background: #2d3a52;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn input.hidden {
  display: none;
}
.hint {
  font-size: 12px;
  color: var(--muted);
}
.err {
  color: #f28b82;
  font-size: 12px;
}
.ok {
  color: #81c995;
  font-size: 13px;
}
.side {
  padding: 10px 12px;
  overflow: auto;
  background: var(--panel);
}
.side h3 {
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.side h3:first-child {
  margin-top: 0;
}
.panel {
  margin: 0;
  padding: 10px;
  background: #0b0d10;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 42vh;
  overflow: auto;
}
.panel.small {
  max-height: 22vh;
  margin-top: 8px;
}
.row {
  margin-bottom: 8px;
}
.row label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}
.row input {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: #0b0d10;
  color: var(--text);
  font-size: 12px;
}
button {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #2a3f5f;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vue-flow__node {
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #1e2430;
  padding: 8px 10px;
}
</style>
