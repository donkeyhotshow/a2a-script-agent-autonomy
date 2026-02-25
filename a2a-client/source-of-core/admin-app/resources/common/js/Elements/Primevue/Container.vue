<template>
  <component
    :is="getComponentType()"
    :component="component"
    v-bind="$attrs"
  />
</template>

<script>
import { defineAsyncComponent } from 'vue'
import ComponentMap from '@depot/component-containers-map.json'

export default {
  name: 'CustomContainer',
  components: {
    ButtonGroup: defineAsyncComponent(() => import('./Containers/ButtonGroup.vue')),
    Column: defineAsyncComponent(() => import('./Containers/Column.vue')),
    Fieldset: defineAsyncComponent(() => import('./Containers/Fieldset.vue')),
    FloatLabel: defineAsyncComponent(() => import('./Containers/FloatLabel.vue')),
    Fluid: defineAsyncComponent(() => import('./Containers/Fluid.vue')),
    Form: defineAsyncComponent(() => import('./Containers/Form.vue')),
    IconField: defineAsyncComponent(() => import('./Containers/IconField.vue')),
    InputGroup: defineAsyncComponent(() => import('./Containers/InputGroup.vue')),
    InputGroupAddon: defineAsyncComponent(() => import('./Containers/InputGroupAddon.vue')),
    InputIcon: defineAsyncComponent(() => import('./Containers/InputIcon.vue')),
    Panel: defineAsyncComponent(() => import('./Containers/Panel.vue')),
    Row: defineAsyncComponent(() => import('./Containers/Row.vue')),
    ScrollPanel: defineAsyncComponent(() => import('./Containers/ScrollPanel.vue')),
    Label: defineAsyncComponent(() => import('./Containers/Label.vue')),
    Link: defineAsyncComponent(() => import('../Inertia/Containers/Link.vue')),
    Tag: defineAsyncComponent(() => import('./Containers/Tag.vue')),

  },
  props: {
    component: Object,
  },
  methods: {
    getComponentType() {
      return ComponentMap.items[this.component.type?.toLowerCase()] || ComponentMap.default
    },
  },
}
</script>


