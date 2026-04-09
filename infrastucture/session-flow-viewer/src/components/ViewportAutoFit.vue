<script setup lang="ts">
import { watch } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { Edge, Node } from '@vue-flow/core';

const props = defineProps<{
  nodes: Node[];
  edges: Edge[];
}>();

const { onPaneReady, fitView } = useVueFlow();

onPaneReady(() => fitView({ padding: 0.2 }));

watch(
  () => [props.nodes, props.edges],
  () => {
    requestAnimationFrame(() => fitView({ padding: 0.15 }));
  },
  { deep: true }
);
</script>

<template>
  <span class="sr-only" aria-hidden="true" />
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
