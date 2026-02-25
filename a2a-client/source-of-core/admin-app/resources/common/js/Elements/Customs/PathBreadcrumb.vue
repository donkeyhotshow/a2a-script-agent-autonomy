<template>
  <div class="breadcrumbs mb-6 text-sm text-gray-300 flex items-center space-x-2">
    <div class="breadcrumb-buttons inline-flex rounded-md shadow-xs overflow-x-auto" v-bind="component.props">
      <span
        v-for="(crumb, index) in component.items"
        :key="index"
        class="breadcrumb flex items-center gap-2"
      >
        <span
          class="px-6 py-3 text-base font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white"
          href="#"
          @click.prevent="handleBreadcrumbClick(crumb)"
        >
          <span>{{ getIcon(crumb) }}</span>
          {{ crumb.label }}
        </span>
      </span>
    </div>
  </div>
</template>

<script>
import { getIcon } from '@common/managers/imports/data.js'

export default {
  name: 'PathBreadcrumb',
  inject: ['hub'],
  inheritAttrs: false,
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
  methods: {
    getIcon,
    handleBreadcrumbClick(item) {
      item.action = 'program-section/fileSelected'
      this.hub.debug('PathBreadcrumb', 'handleBreadcrumbClick', `PathBreadcrumb item`, item)

      this.hub.notifyManager.emit('open-json-ui-drawer', item)
    },
  },
}
</script>

<style scoped>
.breadcrumb-buttons {
  overflow-x: auto;
}

.breadcrumb a {
  cursor: pointer;
}
</style>
