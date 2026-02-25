<template>
  <div class="create-permalink">
    <div class="flex justify-between mb-4">
      <h1 class="text-2xl font-bold">Create Permalink</h1>
      <Button icon="pi pi-arrow-left" label="Back to List" severity="secondary" text @click="navigateBack" />
    </div>

    <Card>
      <template #content>
        <form @submit.prevent="submitForm">
          <div class="formgrid grid">
            <div class="field col-12 md:col-6">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="slug">Slug <span class="text-red-500"
              >*</span></label>
              <InputText
                id="slug"
                v-model="form.slug"
                :class="{'p-invalid': errors.slug}"
                class="w-full"
                placeholder="e.g. blog/my-first-post"
              />
              <small v-if="errors.slug" class="p-error">{{ errors.slug }}</small>
              <small class="text-gray-500">The URL path for this permalink (without leading slash)</small>
            </div>

            <div class="field col-12 md:col-6">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="module">Module <span
                class="text-red-500"
              >*</span></label>
              <Dropdown
                id="module"
                v-model="form.module"
                :class="{'p-invalid': errors.module}"
                :options="modules"
                class="w-full"
                optionLabel="title"
                optionValue="name"
                placeholder="Select a module"
              />
              <small v-if="errors.module" class="p-error">{{ errors.module }}</small>
              <small class="text-gray-500">The module that will handle this permalink</small>
            </div>

            <div class="field col-12">
              <div class="flex align-items-center">
                <Checkbox
                  id="handles_subpaths"
                  v-model="form.handles_subpaths"
                  :binary="true"
                  class="mr-2"
                />
                <label class="text-sm font-medium text-gray-700" for="handles_subpaths">Handles Subpaths</label>
              </div>
              <small class="text-gray-500 block mt-1">
                If enabled, this permalink will also handle all subpaths (e.g. /blog will handle /blog/post1,
                /blog/post2, etc.)
              </small>
            </div>

            <div class="field col-12">
              <label class="block text-sm font-medium text-gray-700 mb-1" for="metadata">Metadata (JSON)</label>
              <Textarea
                id="metadata"
                v-model="metadataJson"
                :class="{'p-invalid': errors.metadata}"
                class="w-full"
                placeholder='{"title": "My Page", "description": "Page description"}'
                rows="5"
              />
              <small v-if="errors.metadata" class="p-error">{{ errors.metadata }}</small>
              <small class="text-gray-500">Additional data in JSON format</small>
            </div>

            <div class="field col-12 flex justify-end gap-2">
              <Button
                label="Cancel"
                outlined
                severity="secondary"
                type="button"
                @click="navigateBack"
              />
              <Button
                :loading="submitting"
                icon="pi pi-check"
                label="Create Permalink"
                type="submit"
              />
            </div>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script>
import ControllersLayout from '../../Shared/ControllersLayout.vue'
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'

export default {
  layout: ControllersLayout,
  components: {
    Button,
    Card,
    InputText,
    Dropdown,
    Checkbox,
    Textarea,
  },
  props: {
    modules: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      form: {
        slug: '',
        module: '',
        handles_subpaths: false,
        metadata: {},
      },
      metadataJson: '{}',
      errors: {},
      submitting: false,
    }
  },
  watch: {
    metadataJson: {
      handler(val) {
        try {
          this.form.metadata = JSON.parse(val)
          this.errors.metadata = null
        } catch (e) {
          this.errors.metadata = 'Invalid JSON format'
        }
      },
      immediate: true,
    },
  },
  methods: {
    submitForm() {
      // Validate metadata JSON format
      try {
        JSON.parse(this.metadataJson)
      } catch (e) {
        this.errors.metadata = 'Invalid JSON format'
        return
      }

      this.submitting = true

      router.post('/admin/permalinks/store', this.form, {
        onSuccess: () => {
          this.submitting = false
          this.$toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Permalink created successfully',
            life: 3000,
          })
          this.navigateBack()
        },
        onError: (errors) => {
          this.submitting = false
          this.errors = errors
          this.$toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Please check the form for errors',
            life: 3000,
          })
        },
      })
    },
    navigateBack() {
      router.get('/admin/permalinks/index')
    },
  },
}
</script>

<style lang="scss" scoped>
.create-permalink {
  @apply w-full;
}
</style>
