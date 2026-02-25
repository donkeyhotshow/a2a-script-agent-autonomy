<template>
  <div v-if="elementsSource" id="root" :style="topBarStyle">
    <div v-if="withTopBar" class="top-bar">
      <RenderJson v-if="elementsSourceTopBar" :component="elementsSourceTopBar" />
    </div>
    <RenderJson :component="elementsSource" />
  </div>
</template>

<script>
import RenderJson from '../../../../common/js/Elements/RenderJson.vue'
import Layout from '@backend/Shared/Layout.vue'

export default {
  name: 'PrimaryIndex',
  components: { RenderJson },
  inject: ['hub'],
  layout: Layout,
  props: {
    content: {
      type: Object,
      default: () => null,
    },
    topBar: {
      type: Object,
      default: () => null,
    },
    forms: {
      type: Object,
      default: () => {
      },
    },
    withTopBar: {
      type: Boolean,
      default: false,
    },
    result: Object,
  },
  data() {
    return {
      component: null,
      componentTopBar: null,
    }
  },
  computed: {

    elementsSource() {
      if (this.content) {
        this.loadPage()
        return this.content
      } else {
        return this.component
      }
    },
    elementsSourceTopBar() {
      if (this.topBar) {
        this.loadTopBar()
        return this.topBar
      } else {
        return this.componentTopBar
      }
    },
    topBarStyle() {
      return this.withTopBar ? { paddingTop: '70px' } : {}
    },
  },
  watch: {
    result: {
      handler(newVal) {
        console.log('try to show result in toast from layout', newVal)
        this.hub.toast.add({
          severity: 'info',
          summary: 'Info',
          detail: newVal.title,
        })
      },
    },
    forms: {
      handler(newVal) {
        if (newVal) {
          console.log('Forms changed', newVal)
          Object.keys(newVal).forEach(formName => {
            Object.keys(newVal[formName]).forEach(field => {
              this.hub.formManager.updateFieldValue(formName, field, newVal[formName][field])
              this.hub.debug('Index', 'forms11113333', formName, field, newVal[formName][field])
            })
          })
        }
      },
      deep: true,
    },
  },
  created() {
    this.hub.formManager.initializeForms()
  },
  mounted() {
    console.log('backendIndex mounted')
    this.loadPage()
  },
  methods: {
    async loadTopBar() {
      try {
        this.componentTopBar = this.topBar
      } catch (error) {
        this.hub.debug('Index', 'loadTopBar', 'Error loading topBar:', error)
      }
    },
    async loadPage() {
      try {
        this.component = this.content ?? []
      } catch (error) {
        this.hub.notifyManager.emit('LOG_ERROR', {
          message: `Debug: Error loading page\n${error.message}`,
          type: 'error',
        })
      }
    },
    mergeFetchedData(fetchedData) {
      const mergedData = { ...fetchedData }
      for (const formName in fetchedData) {
        if (this.hub.formManager.get(formName)) {
          Object.assign(mergedData[formName], this.hub.formManager.getData(formName))
        }
      }
      return mergedData
    },
  },
}
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 16px;
}
</style>
