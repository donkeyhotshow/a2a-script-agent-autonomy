<template>
  <i :class="component.props.class"></i>
</template>

<script>
export default {
  name: 'CustomIcon',
  props: {
    component: Object,
  },
}
</script>
