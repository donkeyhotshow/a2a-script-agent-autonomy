<template>
  <TreeSelect :empty-values="[null, undefined]" v-bind="$attrs" />
  <!--  :not-empty="[0, '']"  :empty-values="[null, undefined]"-->
</template>

<script>
import TreeSelect from 'primevue/treeselect'

export default {
  name: 'CustomTreeSelect',
  components: {
    TreeSelect,
  },
  props: {
    component: Object,
  },
}
</script>
