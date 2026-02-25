<template>
  <Link :href="component.props.href">
    <svg :class="component.props.svg.class" :viewBox="component.props.svg.viewBox">
      <path :d="component.props.svg.path" fill="var(--primary-color)"></path>
    </svg>
    <span class="text-surface-900 dark:text-surface-0 font-medium text-2xl leading-normal mr-20">barberxxl.com.ua</span>
  </Link>
</template>

<script>
import { Link } from '@inertiajs/vue3'

export default {
  name: 'CustomLogo',
  props: {
    component: Object,
  },
  components: {
    Link,
  },
}
</script>
