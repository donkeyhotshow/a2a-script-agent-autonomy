<template>
  <component
    :is="getComponentType()"
    :key="uniqueKey"
    ref="component"
    :component="component"
    v-bind="bindProps(component)"
    v-on="boundDOMEvents[component.vAddress]"
  />
  <!-- ref="component" -->
</template>

<script>
import { defineAsyncComponent } from 'vue'

import ComponentMap from '@depot/component-map.json'
import { generateTempId, onlyUnique } from '@common/managers/imports/data.js'

export default {
  name: 'CustomPresets',
  components: {
    /* это все компоненты которые можно подключить в этом месте.*/
    Component: defineAsyncComponent(() => import('./Primevue/Component.vue')),
    Container: defineAsyncComponent(() => import('./Primevue/Container.vue')),
    ComplexContainer: defineAsyncComponent(() => import('./Primevue/ComplexContainer.vue')),
    VModel: defineAsyncComponent(() => import('./Primevue/VModel.vue')),
    Customs: defineAsyncComponent(() => import('./Primevue/Customs.vue')),
    Tag: defineAsyncComponent(() => import('./Primevue/Containers/Tag.vue')),
    /* /это все компоненты которые можно подключить в этом месте.*/
  },
  inject: ['hub'],
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      uniqueKey: generateTempId(),
      updateTrigger: false,
      listeners: [],
      thisVAddress: null,
    }
  },
  computed: {
    boundDOMEvents() {
      const events = {}
      const vAddress = this.component.vAddress
      events[vAddress] = {}

      // Получаем глобальные customHooks для данного компонента (те, у которых указан emitter)
      const globalHooks = this.findCustomHooksForComponent(vAddress) // объект: { click: [listener, ...], mouseover: [...], ... }

      // Группируем локальные слушатели (без emitter), которые были собраны в processComponentCustomHooks и сохранены в this.listeners
      const localGrouped = {}
      if (this.listeners && Array.isArray(this.listeners)) {
        this.listeners.forEach(listener => {
          if (listener.eventType) {
            if (!localGrouped[listener.eventType]) {
              localGrouped[listener.eventType] = []
            }
            localGrouped[listener.eventType].push(listener)
          }
        })
      }

      // Объединяем все типы событий из глобальных и локальных слушателей
      const allEventTypes = new Set([
        ...Object.keys(globalHooks || {}),
        ...Object.keys(localGrouped),
      ])

      // Для каждого типа события создаём единый обработчик, который вызывает сначала глобальные, затем локальные действия
      allEventTypes.forEach(eventType => {
        events[vAddress][eventType] = (eventData) => {//eventData
          // Выполнить действия глобальных слушателей (с emitter)
          if (globalHooks && globalHooks[eventType] && Array.isArray(globalHooks[eventType])) {
            globalHooks[eventType].forEach(listener => {
              this.hub.debug('Presets', 'boundDOMEvents', `Executing global action for event '${eventType}':`, listener)
              this.hub.notifyManager.emit(listener.data?.target || vAddress, {
                action: listener.action,
                source: vAddress,
                data: listener.data,
              })
            })
          }
          // Выполнить действия локальных слушателей (без emitter)
          if (localGrouped[eventType] && Array.isArray(localGrouped[eventType])) {
            localGrouped[eventType].forEach(listener => {
              this.hub.debug('Presets', 'boundDOMEvents', `Executing local action for event '${eventType}':`, listener)
              this.handleVAddressEvents({
                action: listener.action,
                source: vAddress,
                data: listener.data,
              })
            })
          }
        }
      })

      this.forceUpdate()
      return events
    },
  },
  created() {
    if (!this.component.vAddress && this.component.customHooks) {
      this.thisVAddress = this.uniqueKey
    }
    if (this.component.vAddress) {
      this.thisVAddress = this.component.vAddress
    }
  },
  mounted() {
    this.hub.componentManager.register(this.component)

    if (this.thisVAddress) {
      this.hub.debug('customHooks', '!!!init', this.thisVAddress, ' ', this.component.type)
      this.hub.notifyManager.on(this.thisVAddress, this.handleVAddressEvents)

      if (this.component.customHooks) {
        this.hub.debug('customHooks', '!!!customHooks ok', this.thisVAddress)
        const triggerUpdate = this.processComponentCustomHooks()
        this.forceUpdate()

        triggerUpdate.forEach(vAddress => {
          this.hub.notifyManager.emit(vAddress, {
            action: 'forceUpdate',
            source: this.thisVAddress,
          })
        })
      }
    }
  },
  beforeUnmount() {
    this.removeCustomHooksFromStateManager()
  },

  methods: {
    getComponentType() {
      return ComponentMap.items[this.component.type?.toLowerCase()] || ComponentMap.default
    },
    bindProps(component) {
      return this.hub.propsManager.bindProps(component)
    },

    /**
     * Processes customHooks from a component and adds them to the global state
     * @param {Object} component - The component object containing customHooks
     * @param {Object} state - The global state manager instance
     * @param {Object} event - The event manager instance
     * @returns {Array} - Array of unique vAddresses that need forceUpdate
     */

    removeCustomHooksFromStateManager() {
      if (!this.hub.customHooks || !this.thisVAddress) return

      Object.keys(this.hub.customHooks).forEach(listenerType => {
        let toRemove = this.hub.customHooks.get(listenerType).filter(listener => listener.owner !== this.thisVAddress)
        this.hub.customHooks.set(listenerType, toRemove)
      })
    },

    processComponentCustomHooks() {
      this.hub.debug('customHooks', '!!!processComponentCustomHooks', this.component)
      if (!this.component.customHooks) return []

      // Reset listeners for hooks without emitter
      this.listeners = []
      let processedCustomHooks = {}
      Object.keys(this.component.customHooks).forEach(eventType => {
        try {
          processedCustomHooks[eventType] = []
          this.component.customHooks[eventType].forEach(listener => {
            let newListener = { ...listener, owner: this.thisVAddress }
            if (listener.emitter) {
              newListener.emitter = listener.emitter
              processedCustomHooks[eventType].push(newListener)
            } else {
              newListener.eventType = eventType
              this.listeners.push(newListener)
            }
          })

        } catch (error) {
          console.log('error111 ', this.component.customHooks[eventType])
          this.hub.debug('customHooks', '!!!processComponentCustomHooks error, ET: ' + eventType + ' ', error)
        }

      })

      let triggerUpdate = []
      Object.keys(processedCustomHooks).forEach(eventType => {
        if (!this.hub.customHooks.has(eventType)) {
          this.hub.customHooks.set(eventType, [])
        }
        triggerUpdate.push(...processedCustomHooks[eventType].map(listener => listener.emitter))
        this.hub.customHooks.get(eventType).push(...processedCustomHooks[eventType])
      })

      return triggerUpdate.filter(onlyUnique)
    },

    /**
     * Finds customHooks for a specific component by its vAddress
     * @param {string} vAddress - The virtual address of the component
     * @param {Map} customHooks - The global customHooks map
     * @returns {Object} - Object containing filtered customHooks
     */
    findCustomHooksForComponent(vAddress) {
      const result = {}
      this.hub.debug('customHooks', '!!!findCustomHooksForComponent', vAddress, this.hub.customHooks)
      this.hub.customHooks.forEach((listenerArray, eventType) => {
        const filteredCustomHooks = listenerArray.filter(listener => listener.emitter === vAddress)
        if (filteredCustomHooks.length > 0) {
          result[eventType] = filteredCustomHooks
        }
      })
      this.hub.debug('customHooks', '!!!findCustomHooksForComponent result', result)

      return result
    },
    forceUpdate() {
      this.updateTrigger = !this.updateTrigger
    },
    /**
     * Handles vAddress events and performs actions based on the payload
     * @param {Object} payload - The event payload
     * @param {Object} hub - The global hub manager
     */
    handleVAddressEvents(payload) {
      this.hub.debug('customHooks', '!!!handleVAddressEvents', payload)
      const { action, data } = payload //source,
      switch (action) {
      case 'changeAttribute':
        this.hub.actionManager.changeAttribute(payload.data, this.$refs['component']?.$el)
        break
      case 'alert':
        this.hub.actionManager.alert(data)
        break
      case 'copyToClipboard':
        this.hub.actionManager.copyToClipboard(data)
        break
      case 'forceUpdate':
        this.forceUpdate()
        break
      case 'sendData':
        this.hub.actionManager.sendData(data)
        break
      case 'navigateTo':
        console.log('navigateTo=======', data)
        this.hub.actionManager.navigateTo(data)
        break
      case 'toggleClass':
        this.hub.actionManager.toggleClass(payload)
        break
      default:
        console.log('handleVAddressEvents=======', payload)
        this.hub.debug('Presets', 'handleVAddressEvents', `Неизвестное действие: ${action}`)
      }
    },
  },
}
</script>

<style scoped>
/* Your styles here */
</style>
