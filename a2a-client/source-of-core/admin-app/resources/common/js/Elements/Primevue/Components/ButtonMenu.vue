<template>
  <div class="button-menu-container">
    <Button
      v-bind="buttonProps"
      @click="toggleMenu"
    />

    <Menu
      ref="menu"
      :model="menuItems"
      :popup="true"
    />
  </div>
</template>

<script>
import { Button, Menu } from 'primevue'
import { inject } from 'vue'

export default {
  name: 'ButtonMenu',
  components: { Button, Menu },
  props: {
    component: Object,
    buttonClass: {
      type: String,
      default: '',
    },
  },
  setup() {
    const hub = inject('hub') ///bbb4ggg
    return {
      hub,
    }
  },
  computed: {
    buttonProps() {
      const propsFromComponent = this.hub?.propsManager?.bindProps(this.component)
      return {
        ...propsFromComponent,
        class: propsFromComponent.class || this.buttonClass,
      }
    },
    menuItems() {
      return this.component.items.map(item => ({
        ...item,
        command: (event) => this.handleItemSelect(event, item),
      }))
    },
  },
  methods: {
    toggleMenu(event) {
      this.$refs.menu.toggle(event)
    },
    handleItemSelect(event, item) {
      this.hub.debug('ButtonMenu', 'handleItemSelect', `Item selected:`, item)
      if (item.command && typeof item.command === 'function') {
        item.command(event)
      }
      if (item.dialogConfig) {
        this.hub.notifyManager.emit('dialogOpened', item.dialogConfig)
      }
    },
  },
}
</script>


