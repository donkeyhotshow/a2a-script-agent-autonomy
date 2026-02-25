<template>
  <div class="installation-panel">
    <!-- Sidebar (Left) -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Модули</h2>
      </div>
      <div class="sidebar-content">
        <ul class="module-tree">
          <li v-for="section in formSchema.sections" :key="section.name">
            <div class="module-section" @click="toggleSection(section)">
              <span class="section-label">{{ section.label }}</span>
              <i class="pi pi-cog config-icon" @click.stop="selectSectionConfig(section)"></i>
              <i :class="isExpanded(section) ? 'pi-chevron-down' : 'pi-chevron-right'" class="pi"></i>
            </div>
            <div v-if="isExpanded(section)" class="section-controls">
              <ul class="module-items">
                <li v-for="item in section.items" :key="item.name">
                  <div class="module-item">
                    <input :id="item.name" v-model="modulesState[item.name]" :disabled="section.autoInstall"
                           type="checkbox"
                    />
                    <label :for="item.name">{{ item.label }}</label>
                    <i class="pi pi-play play-icon" @click.stop="selectItem(item, section)"></i>
                    <i v-if="item.files && item.files.length" class="pi pi-folder file-icon"
                       @click.stop="selectFiles(item, section)"
                    ></i>
                  </div>
                </li>
              </ul>
            </div>
            <!-- Indicators: каждый индикатор соответствует одной галочке -->
            <div class="section-indicators">
                  <span v-for="item in section.items" :key="item.name"
                        :style="{ backgroundColor: getItemColor(item, section) }"
                  ></span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1 class="title">Установщик AiRudeDepot</h1>
        <div class="header-buttons">
          <button class="toggle-btn action-btn" type="button" @click="handleSave">Сохранить состояние</button>
          <button class="toggle-btn action-btn" type="button" @click="handleInstall">Обновить состояние</button>
        </div>
      </header>
      <div class="notification-container">
        <div v-if="message" class="message success">{{ message }}</div>
        <div v-if="error" class="message error">{{ error }}</div>
      </div>
      <div class="content-display">
        <template v-if="currentContent">
          <div v-if="currentContent.type==='section'">
            <h2>Конфигурация модуля: {{ currentContent.data.label }}</h2>
            <p v-if="currentContent.data.meta">{{ currentContent.data.meta }}</p>
            <div v-if="currentContent.data.commonFiles && currentContent.data.commonFiles.length">
              <h4>Общие файлы модуля:</h4>
              <ul>
                <li v-for="(file,index) in currentContent.data.commonFiles" :key="index">{{ file }}</li>
              </ul>
            </div>
          </div>
          <div v-else-if="currentContent.type==='item'">
            <h2>Рендер компонента: {{ currentContent.data.label }}</h2>
            <p>Здесь будет отображаться содержимое компонента.</p>
          </div>
          <div v-else-if="currentContent.type==='files'">
            <h2>Файлы: {{ currentContent.data.label }}</h2>
            <ul>
              <li v-for="(file,index) in currentContent.data.files" :key="index">{{ file }}</li>
            </ul>
          </div>
        </template>
        <template v-else>
          <p>Выберите модуль, компонент или файлы для отображения.</p>
        </template>
      </div>
      <div class="terminal">
        <h2>Terminal</h2>
        <div class="terminal-output">
          <div v-for="(msg,index) in consoleMessages" :key="index"
               :class="{ 'success': msg.type==='success', 'error': msg.type==='error', 'info': msg.type==='info' }"
          >
            {{ msg.text }}
          </div>
        </div>
      </div>
    </main>
    <footer class="footer">
      <p>&copy; 2023 Your Company</p>
    </footer>
  </div>
</template>

<script>
import { Inertia } from '@inertiajs/inertia'
import CommonLayout from '@backend/Shared/ControllersLayout.vue'

export default {
  name: 'InstallerIndex',
  layout: CommonLayout,
  props: { formSchema: Object, currentParams: Object, installSections: Object },
  data() {
    return {
      modulesState: {},
      message: '',
      error: '',
      isInstalling: false,
      progress: 0,
      currentContent: null,
      expandedSections: [],
      consoleMessages: [],
    }
  },
  created() {
    this.modulesState = {}
    if (this.formSchema.sections) {
      this.formSchema.sections.forEach(section => {
        if (section.items) {
          section.items.forEach(item => {
            this.modulesState[item.name] = section.autoInstall
              ? true
              : (this.currentParams[item.name] !== undefined ? this.currentParams[item.name] : false)
          })
        }
      })
    }
  },
  methods: {
    toggleSection(section) {
      const idx = this.expandedSections.indexOf(section.name)
      if (idx > -1) {
        this.expandedSections.splice(idx, 1)
      } else {
        this.expandedSections.push(section.name)
      }
    },
    isExpanded(section) {
      return this.expandedSections.includes(section.name)
    },
    getItemColor(item, section) {
      // Если секция автоинсталлируется, всегда зеленая
      if (section.autoInstall) return '#4caf50'
      return this.modulesState[item.name] ? '#4caf50' : '#f44336'
    },
    selectSectionConfig(section) {
      this.currentContent = { type: 'section', data: section }
      this.consoleMessages.push({ type: 'info', text: `Конфигурация секции: ${section.label}` })
    },
    selectItem(item, section) {
      this.currentContent = { type: 'item', data: item, section }
      this.consoleMessages.push({ type: 'info', text: `Выбран компонент: ${item.label} из ${section.label}` })
    },
    selectFiles(item, section) {
      this.currentContent = { type: 'files', data: { label: item.label, files: item.files } }
      this.consoleMessages.push({ type: 'info', text: `Отображены файлы для: ${item.label}` })
    },
    async handleSave() {
      try {
        await this.$inertia.post('/panel/installer/save', { params: this.modulesState }, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = 'Состояние успешно сохранено.'
      } catch (err) {
        this.error = err.response?.data?.message || 'Ошибка сохранения состояния.'
      }
    },
    async handleInstall() {
      try {
        this.isInstalling = true
        this.progress = 0
        this.message = ''
        this.error = ''
        const installData = { modules: this.modulesState, activeSections: {} }
        if (this.formSchema.sections) {
          this.formSchema.sections.forEach(section => {
            installData.activeSections[section.name] = section.autoInstall
              ? true
              : (section.items ? section.items.some(item => this.modulesState[item.name]) : false)
          })
        }
        await this.$inertia.post('/admin/installer/install', installData, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || 'Инсталляция успешно завершена.'
        this.isInstalling = false
      } catch (err) {
        this.error = err.response?.data?.message || 'Ошибка при установке.'
        this.isInstalling = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.sidebar-header h2 {
  @apply text-orange-500 text-xl font-semibold uppercase;
}

.module-tree li {
  @apply mb-2 cursor-pointer transition-colors;
}

.module-tree li:hover {
  @apply bg-gray-700;
}

.module-section {
  @apply flex justify-between items-center p-2 bg-gray-600 rounded;
}

.config-icon {
  @apply cursor-pointer text-blue-500 text-base ml-1;
}

.pi-chevron-down, .pi-chevron-right {
  @apply text-orange-500 text-base ml-1;
}

.section-controls {
  @apply mt-2;
}

.module-items {
  list-style: none;
  padding: 0;
  margin: 0
}

.module-item {
  @apply flex items-center gap-2 mb-2;
}

.play-icon, .file-icon {
  @apply cursor-pointer text-blue-300 text-base;
}

.title {
  @apply text-white;
}

.header-buttons {
  display: flex;
  gap: 10px
}

.toggle-btn {
  @apply bg-orange-500 text-white border-none py-2 px-4 rounded transition-colors;
}

.toggle-btn:hover {
  @apply bg-orange-600;
}

.control-panel {
  background-color: #2a2a2a;
  padding: 20px;
  border-radius: 8px
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px
}

.action-btn {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s
}

.action-btn:hover {
  background-color: #e67e00
}

.action-btn:disabled {
  background-color: #aaa;
  cursor: not-allowed
}

.progress-container {
  margin-top: 16px
}

.progress-label {
  margin-bottom: 4px;
  color: #f8f8f8
}

.progress-bar {
  height: 20px;
  background-color: #444;
  border-radius: 10px;
  overflow: hidden
}

.progress-value {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s
}

.notification-container {
  @apply mt-2;
}

.message {
  @apply mt-4 p-3 rounded text-sm;
}

.message.success {
  @apply bg-green-100 text-green-700;
}

.message.error {
  @apply bg-red-100 text-red-700;
}

.content-display {
  @apply bg-white p-5 rounded shadow;
}

.terminal {
  @apply bg-white p-5 rounded shadow mt-5;
}

.terminal-output {
  @apply bg-gray-100 p-3 rounded overflow-y-auto font-mono text-xs border;
  height: 300px;
}

.terminal-output .success {
  color: #4caf50
}

.terminal-output .error {
  color: #f44336
}

.terminal-output .info {
  color: #2196f3
}

.section-indicators {
  display: flex;
  height: 4px;
  margin-top: 4px;
  border-radius: 2px;
  overflow: hidden
}

.section-indicators span {
  flex: 1;
  display: block
}

</style>
