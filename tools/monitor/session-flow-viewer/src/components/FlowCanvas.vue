<script setup lang="ts">
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type { Edge, Node } from '@vue-flow/core';
import ViewportAutoFit from './ViewportAutoFit.vue';

const nodes = defineModel<Node[]>('nodes', { required: true });
const edges = defineModel<Edge[]>('edges', { required: true });

const emit = defineEmits<{
  nodeClick: [payload: { node: { id: string } }];
}>();

function forwardNodeClick(e: { node: { id: string } }) {
  emit('nodeClick', e);
}
</script>

<template>
  <VueFlow
    v-model:nodes="nodes"
    v-model:edges="edges"
    :min-zoom="0.2"
    :max-zoom="2"
    fit-view-on-init
    @node-click="forwardNodeClick"
  >
    <ViewportAutoFit :nodes="nodes" :edges="edges" />
    <Background pattern-color="#aaa" :gap="16" />
    <Controls />
    <MiniMap />
  </VueFlow>
</template>
