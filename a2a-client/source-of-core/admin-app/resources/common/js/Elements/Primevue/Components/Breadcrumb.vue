<template>
  <nav aria-label="breadcrumb">
    <ol class="breadcrumb">
      <li v-for="(item, index) in component.items" :key="index" class="breadcrumb-item">
        <a href="#" @click.prevent="handleBreadcrumbClick(item)">
          {{ item.label }}
        </a>
        <ul v-if="item.subItems && item.subItems.length" class="sub-breadcrumb">
          <li v-for="(subItem, subIndex) in item.subItems" :key="subIndex" class="sub-breadcrumb-item">
            <a href="#" @click.prevent="handleBreadcrumbClick(subItem)">
              {{ subItem.label }}
            </a>
          </li>
        </ul>
      </li>
    </ol>
  </nav>
</template>

<script>
export default {
  name: 'CustomBreadcrumb',
  inject: ['hub'],
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      files: [],
    }
  },
  methods: {
    handleBreadcrumbClick(item) {
      this.hub.debug('Breadcrumb', 'handleBreadcrumbClick', `breadcrumb item`, item.path)

    },

  },
}
</script>

<style scoped>
.breadcrumb {
  list-style: none;
  display: flex;
  padding: 0;
}

.breadcrumb-item {
  margin-right: 10px;
}

.breadcrumb-item a {
  text-decoration: none;
  color: #007bff;
}

.sub-breadcrumb {
  list-style: none;
  padding-left: 20px;
}

.sub-breadcrumb-item {
  margin-top: 5px;
}

.sub-breadcrumb-item a {
  text-decoration: none;
  color: #007bff;
}

.file-selector-button {
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

.file-list {
  margin-top: 10px;
}

.file-list ul {
  list-style: none;
  padding: 0;
}

.file-list li {
  cursor: pointer;
  color: #007bff;
  margin-bottom: 5px;
}
</style>
