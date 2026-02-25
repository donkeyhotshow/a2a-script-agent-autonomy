<template>
  <div class="url-management">
    <div class="flex justify-between mb-4">
      <h1 class="text-2xl font-bold">URL Management</h1>
      <div class="flex gap-2">
        <Button icon="pi pi-plus" label="Create Permalink" @click="navigateToCreate" />
        <Button icon="pi pi-refresh" label="Reload Permalinks" severity="secondary" @click="reloadPermalinks" />
      </div>
    </div>

    <Card v-if="Object.keys(permalinks).length === 0" class="mb-4">
      <template #content>
        <div class="p-4 text-center">
          <i class="pi pi-link text-4xl mb-3 text-blue-500"></i>
          <h3 class="font-medium mb-2">No Permalinks Found</h3>
          <p class="text-gray-600 mb-3">Get started by creating your first permalink</p>
          <Button icon="pi pi-plus" label="Create Permalink" @click="navigateToCreate" />
        </div>
      </template>
    </Card>

    <div v-else>
      <Card v-for="(moduleData, slug) in permalinks" :key="slug" class="mb-4">
        <template #title>
          <div class="flex justify-between items-center">
            <span class="text-xl">{{ '/' + slug }}</span>
            <Tag :severity="getModuleSeverity(moduleData.module)">{{ moduleData.module }}</Tag>
          </div>
        </template>
        <template #subtitle>
          <div class="text-sm text-gray-500">
            Last updated: {{ formatDate(moduleData.updated_at) }}
          </div>
        </template>
        <template #content>
          <div class="mb-4">
            <div v-if="moduleData.metadata && Object.keys(moduleData.metadata).length > 0">
              <h3 class="text-lg font-medium mb-2">Metadata</h3>
              <div class="pl-4 border-l-2 border-blue-200">
                <div v-for="(value, key) in moduleData.metadata" :key="key" class="mb-1">
                  <span class="font-medium">{{ key }}:</span> {{ typeof value === 'object' ? JSON.stringify(value) :
                  value }}
                </div>
              </div>
            </div>
            <div v-else class="text-gray-500 italic">No metadata</div>
          </div>

          <div class="flex justify-end gap-2">
            <Button icon="pi pi-eye" severity="info" text @click="viewPermalink(slug)" />
            <Button icon="pi pi-pencil" severity="warning" text @click="editPermalink(slug)" />
            <Button icon="pi pi-trash" severity="danger" text @click="confirmDelete(slug)" />
          </div>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="deleteDialogVisible" :modal="true" :style="{width: '450px'}" header="Confirm Deletion">
      <div class="flex flex-column align-items-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-5xl mb-3"></i>
        <p>Are you sure you want to delete the permalink <strong>{{ permalinkToDelete }}</strong>?</p>
        <p class="text-gray-600">This action cannot be undone.</p>
      </div>
      <template #footer>
        <Button icon="pi pi-times" label="No" text @click="closeDeleteDialog" />
        <Button icon="pi pi-check" label="Yes" severity="danger" @click="deletePermalink" />
      </template>
    </Dialog>
  </div>
</template>

<script>
import ControllersLayout from '../../Shared/ControllersLayout.vue'
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

export default {
  layout: ControllersLayout,
  components: {
    Button,
    Card,
    Dialog,
    Tag,
  },
  props: {
    permalinks: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      deleteDialogVisible: false,
      permalinkToDelete: null,
    }
  },
  methods: {
    navigateToCreate() {
      router.get('/admin/permalinks/create')
    },
    viewPermalink(slug) {
      router.get('/admin/permalinks/' + slug)
    },
    editPermalink(slug) {
      router.get('/admin/permalinks/' + slug + '/edit')
    },
    confirmDelete(slug) {
      this.permalinkToDelete = slug
      this.deleteDialogVisible = true
    },
    closeDeleteDialog() {
      this.deleteDialogVisible = false
      this.permalinkToDelete = null
    },
    deletePermalink() {
      router.delete('/admin/permalinks/' + this.permalinkToDelete, {
        onSuccess: () => {
          this.closeDeleteDialog()
          this.$toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Permalink deleted successfully',
            life: 3000,
          })
        },
      })
    },
    reloadPermalinks() {
      router.get('/admin/permalinks/reload', {
        onSuccess: () => {
          this.$toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Permalinks reloaded from filesystem',
            life: 3000,
          })
        },
      })
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString()
    },
    getModuleSeverity(module) {
      const severities = {
        'page': 'info',
        'blog': 'success',
        'product': 'warning',
        'custom': 'danger',
      }
      return severities[module] || 'info'
    },
  },
}
</script>

<style lang="scss" scoped>
.url-management {
  @apply w-full;
}
</style>
