<template>
  <Form>
    <Fieldset v-bind="$attrs">
      <RenderJson
        v-for="(child, index) in renderableChildren"
        :key="index"
        :component="child"
      />
    </Fieldset>
  </Form>
</template>
<script>
import { defineAsyncComponent } from 'vue'
import Fieldset from 'primevue/fieldset'
import { Form } from '@primevue/forms'

export default {
  name: 'CustomFieldset',
  components: {
    Fieldset,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
    Form,
  },
  props: {
    component: Object,
  },
  computed: {
    renderableChildren() {
      if (Array.isArray(this.component?.children)) {
        return this.component.children
      }
      if (Array.isArray(this.component?.items)) {
        return this.component.items
      }
      return []
    },
  },
  inheritAttrs: false,
}
</script>
