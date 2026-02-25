<template>
  <div class="json-path-editor">
    <div v-if="loading" class="spinner">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>
    <div v-else>
      <div class="grid grid-cols-12 gap-4">
        <!-- File Browser Panel -->
        <div class="col-span-3 bg-gray-800 p-4 rounded">
          <h2 class="text-lg font-bold mb-4 text-white">Files</h2>
          <div class="search-box mb-4">
            <InputText v-model="searchTerm" class="w-full" placeholder="Search files..." />
          </div>
          <div class="file-list max-h-screen overflow-y-auto">
            <ul>
              <li v-for="file in filteredFiles" :key="file.path"
                  :class="{'active': currentFile === file.path}"
                  class="cursor-pointer p-2 hover:bg-gray-700 rounded mb-1 text-gray-200"
                  @click="loadFile(file.path)"
              >
                {{ file.path }}
              </li>
            </ul>
          </div>
        </div>

        <!-- JSON Editor Panel -->
        <div class="col-span-9 bg-gray-800 p-4 rounded">
          <div class="header-actions flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-white">JSON Editor</h2>
            <span class="text-sm text-gray-400">Integrated with internal address system</span>
            <div class="flex space-x-2">
              <Button :disabled="!currentFile" class="p-button-success"
                      @click="saveContent"
              >
                <i class="pi pi-save mr-2"></i>Save
              </Button>
              <Button :disabled="!currentFile" class="p-button-info"
                      @click="validateJson"
              >
                <i class="pi pi-check-circle mr-2"></i>Validate
              </Button>
            </div>
          </div>

          <div v-if="currentFile" class="editor-container">
            <div class="path-navigation mb-4">
              <span class="text-white">Current File: {{ currentFile }}</span>
              <div class="mt-2 flex items-center">
                <InputText v-model="jsonPath" class="w-full mr-2" placeholder="JSON Path (e.g., $.users[0].name)" />
                <Button class="p-button-primary" @click="queryPath">
                  <i class="pi pi-search mr-2"></i>Query
                </Button>
                <Button class="p-button-warning ml-2" @click="assignIdToPath">
                  <i class="pi pi-id-card mr-2"></i>Assign ID
                </Button>
              </div>
            </div>

            <div class="editor-wrapper">
              <Textarea v-model="jsonContent" class="w-full h-96 font-mono" />
            </div>

            <div v-if="queryResult" class="query-result mt-4">
              <h3 class="text-lg font-bold text-white mb-2">Query Result:</h3>
              <div class="bg-gray-900 p-4 rounded">
                <pre class="text-green-400">{{ JSON.stringify(queryResult, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <div v-else class="empty-state flex flex-col items-center justify-center h-64">
            <i class="pi pi-file-o text-gray-500" style="font-size: 3rem"></i>
            <p class="text-gray-500 mt-4">Select a file to edit or</p>
            <InputText v-model="newFileName" class="mt-2 w-64" placeholder="Enter new file name" />
            <Button class="mt-2 p-button-outlined" @click="createNewFile">
              <i class="pi pi-plus mr-2"></i>Create New File
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Toast />
  </div>
</template>

<script>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import ControllersLayout from '@backend/Shared/ControllersLayout.vue'
import { useToast } from 'primevue/usetoast'
import axios from 'axios'

export default {
  layout: ControllersLayout,
  components: {
    Button,
    InputText,
    Textarea,
    Toast,
  },
  props: {
    title: String,
    basePath: String,
    jsonFiles: Array,
  },
  data() {
    return {
      loading: false,
      currentFile: null,
      jsonContent: '',
      jsonPath: '',
      searchTerm: '',
      queryResult: null,
      newFileName: '',
      files: this.jsonFiles || [],
    }
  },
  computed: {
    filteredFiles() {
      if (!this.searchTerm) return this.files
      return this.files.filter(file =>
        file.path.toLowerCase().includes(this.searchTerm.toLowerCase()),
      )
    },
  },
  mounted() {
    this.setupLayout()
  },
  methods: {
    setupLayout() {
      // Set the title in the layout
      const titleElem = document.getElementById('header-title')
      if (titleElem) titleElem.textContent = this.title || 'JSON Path Editor'
    },
    loadFile(path) {
      this.loading = true
      this.currentFile = path
      this.jsonContent = ''
      this.queryResult = null

      axios.post('/admin/json-editor/load', {
        filename: path,
      })
        .then(response => {
          this.jsonContent = JSON.stringify(response.data.content, null, 2)
        })
        .catch(error => {
          this.showError('Error loading file: ' + (error.response?.data?.error || error.message))
        })
        .finally(() => {
          this.loading = false
        })
    },
    saveContent() {
      if (!this.currentFile) return

      try {
        // Validate the JSON format before saving
        JSON.parse(this.jsonContent)

        this.loading = true
        axios.post('/admin/json-editor/store', {
          address: this.currentFile,
          content: this.jsonContent,
        })
          .then(() => {
            this.showSuccess('File saved successfully')
          })
          .catch(error => {
            this.showError('Error saving file: ' + (error.response?.data?.error || error.message))
          })
          .finally(() => {
            this.loading = false
          })
      } catch (e) {
        this.showError('Invalid JSON format: ' + e.message)
      }
    },
    queryPath() {
      if (!this.currentFile || !this.jsonPath) return

      this.loading = true
      axios.post('/admin/json-editor/query', {
        filename: this.currentFile,
        path: this.jsonPath,
      })
        .then(response => {
          this.queryResult = response.data.result
          if (!this.queryResult || (Array.isArray(this.queryResult) && this.queryResult.length === 0)) {
            this.showInfo('No results found for the given path')
          }
        })
        .catch(error => {
          this.showError('Error querying path: ' + (error.response?.data?.error || error.message))
        })
        .finally(() => {
          this.loading = false
        })
    },
    assignIdToPath() {
      if (!this.currentFile || !this.jsonPath) {
        this.showError('Please specify a file and JSON path')
        return
      }

      this.loading = true
      axios.post('/admin/json-editor/assign-id', {
        filename: this.currentFile,
        path: this.jsonPath,
      })
        .then(response => {
          this.showSuccess('ID assigned successfully: ' + response.data.assignedId)
          this.loadFile(this.currentFile) // Reload file to show the changes
        })
        .catch(error => {
          this.showError('Error assigning ID: ' + (error.response?.data?.error || error.message))
        })
        .finally(() => {
          this.loading = false
        })
    },
    validateJson() {
      try {
        JSON.parse(this.jsonContent)
        this.showSuccess('JSON is valid')
      } catch (e) {
        this.showError('Invalid JSON: ' + e.message)
      }
    },
    createNewFile() {
      if (!this.newFileName) {
        this.showError('Please enter a file name')
        return
      }

      this.loading = true
      const newPath = this.newFileName.endsWith('.json') ? this.newFileName : this.newFileName + '.json'

      axios.post('/admin/json-editor/store', {
        address: newPath,
        content: '{}',
      })
        .then(() => {
          this.showSuccess('New file created successfully')
          this.files.push({
            name: newPath,
            path: newPath,
            modified: Date.now(),
            size: 2,
          })
          this.newFileName = ''
          this.loadFile(newPath)
        })
        .catch(error => {
          this.showError('Error creating file: ' + (error.response?.data?.error || error.message))
        })
        .finally(() => {
          this.loading = false
        })
    },
    showSuccess(message) {
      const toast = useToast()
      toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 })
    },
    showError(message) {
      const toast = useToast()
      toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 })
    },
    showInfo(message) {
      const toast = useToast()
      toast.add({ severity: 'info', summary: 'Info', detail: message, life: 3000 })
    },
  },
}
</script>

<style lang="scss">
.json-path-editor {
  @apply p-4;

  .spinner {
    @apply flex justify-center items-center h-64;
  }

  .active {
    @apply bg-blue-700 text-white;
  }

  .editor-wrapper {
    @apply relative;

    textarea {
      @apply p-4 bg-gray-900 text-gray-100 rounded font-mono text-sm;
    }
  }
}
</style>
