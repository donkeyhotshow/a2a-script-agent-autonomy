<template>
  <Tabs v-bind="component.props">
    <TabList>
      <Tab
        v-for="(tab, index) in tabItems"
        :key="`tab-header-${index}`"
        :value="index"
      >
        {{ tab.props?.header || `Tab ${index + 1}` }}
      </Tab>
    </TabList>
    <TabPanels>
      <TabPanel
        v-for="(tab, index) in tabItems"
        :key="`tab-content-${index}`"
        :value="index"
      >

        <RenderJson
          v-for="(child, childIndex) in tab.children || []"
          :key="childIndex"
          :component="child"
        />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script>
import { TabList, TabPanel, TabPanels, Tabs, Tab } from 'primevue'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'RenderTabs',
  components: {
    TabList,
    TabPanels,
    TabPanel,
    Tabs,
    Tab,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: Object,
  },
  computed: {
    tabItems() {
      if (Array.isArray(this.component?.items)) {
        return this.component.items
      }
      if (Array.isArray(this.component?.children)) {
        return this.component.children
      }
      return []
    },
  },
}
</script>
