<template>
  <div class="view-permalink">
    <div class="flex justify-between mb-4">
      <h1 class="text-2xl font-bold">Permalink Details</h1>
      <div class="flex gap-2">
        <Button icon="pi pi-pencil" label="Edit" @click="editPermalink" />
        <Button icon="pi pi-arrow-left" label="Back to List" severity="secondary" text @click="navigateBack" />
      </div>
    </div>

    <Card>
      <template #title>
        <div class="flex items-center">
          <span class="text-lg font-medium mr-2">/{{ slug }}</span>
          <Tag :severity="getModuleSeverity(permalink.module)">{{ permalink.module }}</Tag>
        </div>
      </template>
      <template #subtitle>
        <div class="text-sm text-gray-500">
          <div>Created: {{ formatDate(permalink.created_at) }}</div>
          <div>Last updated: {{ formatDate(permalink.updated_at) }}</div>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 class="text-lg font-medium mb-2">Basic Information</h3>
            <div class="bg-gray-50 p-4 rounded">
              <div class="mb-2">
                <span class="font-medium">Module:</span> {{ permalink.module }}
              </div>
              <div class="mb-2">
                <span class="font-medium">Handles Subpaths:</span>
                <Badge :severity="permalink.handles_subpaths ? 'success' : 'info'"
                       :value="permalink.handles_subpaths ? 'Yes' : 'No'"
                />
              </div>
              <div class="mb-2">
                <span class="font-medium">Full URL:</span>
                <div class="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                  {{ getFullUrl() }}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-medium mb-2">Metadata</h3>
            <div class="bg-gray-50 p-4 rounded min-h-32">
              <div v-if="permalink.metadata && Object.keys(permalink.metadata).length > 0">
                <div v-for="(value, key) in permalink.metadata" :key="key" class="mb-2">
                  <span class="font-medium">{{ key }}:</span>
                  <div class="mt-1 pl-3 border-l-2 border-blue-200">
                    <span v-if="typeof value === 'object'">
                      <pre class="text-sm bg-gray-100 p-2 rounded overflow-auto"
                      >{{ JSON.stringify(value, null, 2) }}</pre>
                    </span>
                    <span v-else>{{ value }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-gray-500 italic">No metadata</div>
            </div>
          </div>
        </div>

        <divider />

        <div class="flex justify-between mt-4">
          <Button
            icon="pi pi-trash"
            label="Delete Permalink"
            severity="danger"
            @click="confirmDelete"
          />
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" label="Edit" @click="editPermalink" />
            <Button icon="pi pi-list" label="Back to List" outlined severity="secondary" @click="navigateBack" />
          </div>
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="deleteDialogVisible" :modal="true" :style="{width: '450px'}" header="Confirm Deletion">
      <div class="flex flex-column align-items-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-5xl mb-3"></i>
        <p>Are you sure you want to delete the permalink <strong>{{ slug }}</strong>?</p>
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
import Badge from 'primevue/badge'
import divider from 'primevue/divider'

export default {
  layout: ControllersLayout,
  components: {
    Button,
    Card,
    Dialog,
    Tag,
    Badge,
    divider,
  },
  props: {
    permalink: {
      type: Object,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      deleteDialogVisible: false,
    }
  },
  methods: {
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
    getFullUrl() {
      return window.location.origin + '/' + this.slug
    },
    editPermalink() {
      router.get(route('permalinks.edit', this.slug))
    },
    navigateBack() {
      router.get(route('permalinks.index'))
    },
    confirmDelete() {
      this.deleteDialogVisible = true
    },
    closeDeleteDialog() {
      this.deleteDialogVisible = false
    },
    deletePermalink() {
      router.delete(route('permalinks.destroy', this.slug), {
        onSuccess: () => {
          this.closeDeleteDialog()
          this.$toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Permalink deleted successfully',
            life: 3000,
          })
          this.navigateBack()
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.view-permalink {
  @apply w-full;
}
</style>
