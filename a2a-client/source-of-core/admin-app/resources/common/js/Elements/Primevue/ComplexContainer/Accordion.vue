<template>
  <Accordion
    :activeIndex="component.props?.activeIndex || 0"
    :multiple="component.props?.multiple"
    v-bind="component.props"
  >
    <AccordionPanel
      v-for="(item, index) in accordionItems"
      :key="index"
      :disabled="item.props?.disabled"
      :value="index"
    >
      <AccordionHeader>{{ item.props?.header || `Panel ${index + 1}` }}</AccordionHeader>
      <AccordionContent>
        <RenderJson
          v-for="(child, childIndex) in item.children || []"
          :key="childIndex"
          :component="child"
        />
      </AccordionContent>

    </AccordionPanel>
  </Accordion>
</template>

<script>
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primevue'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'CustomAccordion',
  components: {
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
  },
  props: {
    component: {
      type: Object,
      default: () => ({ props: {}, items: [] }),
    },
  },
  computed: {
    accordionItems() {
      if (Array.isArray(this.component?.children)) {
        return this.component.children
      }
      return []
    },
  },
}
</script>

