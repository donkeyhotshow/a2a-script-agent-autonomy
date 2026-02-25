<template>
  <Card>
    <template v-if="$attrs.header" #header>
      <div class="header">
        <h1>{{ $attrs.header }}</h1>
      </div>
    </template>

    <template #title>
      <div class="title">
        <RenderJson
          v-for="(child, index) in component.title"
          v-if="component.title"
          :key="index"
          :component="child"
        />
        <span v-else>{{ $attrs.title }}</span>
      </div>
    </template>

    <template v-if="$attrs.subtitle" #subtitle>
      <div class="subtitle">{{ $attrs.subtitle }}</div>
    </template>

    <template #content>
      <RenderJson
        v-for="(child, index) in children"
        :key="index"
        :component="child"
      />
    </template>

    <template v-if="$attrs.footer" #footer>
      <div class="footer">
        {{ $attrs.footer }}
        <slot name="footer-links"></slot>
      </div>
    </template>
  </Card>
</template>

<script>
import { Card } from 'primevue'
import { defineAsyncComponent } from 'vue'

export default {
  components: {
    Card,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),

  },
  props: {
    component: {
      type: Object,
      required: false,
    },
  },
  computed: {
    children() {
      let ret = Array.isArray(this.component.children) ? this.component.children : null

      if (!ret) ret = Array.isArray(this.component.items) ? this.component.items : null


      if (ret) return ret
      return []
    },
  },
}
</script>

<style scoped>
.header {
  font-weight: bold;
  margin-bottom: 10px;
}
</style>
