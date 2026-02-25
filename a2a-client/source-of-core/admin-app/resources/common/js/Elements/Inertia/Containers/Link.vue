<template>
  <div>
    <Link v-if="!component.children" :href="component.props.href" method="post"
          v-bind="{...$attrs, ...component.link}" v-html="component.props?.content"
    />
    <Link v-else :href="component.props.href" method="post" v-bind="{...$attrs, ...component.link}">
      <RenderJson v-for="(child, childIndex) in component.children"
                  v-if="component.children"
                  :key="`child-${childIndex}`"
                  :component="child"
      />
    </Link>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { Link } from '@inertiajs/vue3'

export default {
  name: 'CustomLink',
  inheritAttrs: false,
  components: {
    Link,
    RenderJson: defineAsyncComponent(() => import('../../RenderJson.vue')),
  },
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
}
</script>
