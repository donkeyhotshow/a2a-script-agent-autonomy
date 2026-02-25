<template>
  <div class="container mx-auto p-4 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold mb-6">Управление сценой AiRudeDepot</h1>
    <div>
      <!-- Отображаем секции (модули) -->
      <div v-for="section in formSchema.sections" :key="section.name" class="mb-6">
        <h2 class="text-xl font-semibold mb-3 bg-gray-100 p-2 rounded">{{ section.label }}</h2>

        <!-- Показываем общие файлы для модуля, если они есть -->
        <div v-if="section.commonFiles && section.commonFiles.length" class="mb-3 pl-4">
          <div class="flex items-center">
            <span class="mr-2 text-gray-700 font-medium">Общие файлы модуля:</span>
            <button
              class="text-xs text-blue-600 hover:text-blue-800"
              type="button"
              @click="toggleCommonFileList(section.name)"
            >
              {{ isCommonFileListVisible(section.name) ? 'Скрыть файлы' : 'Показать файлы' }}
            </button>

            <!-- Индикатор ошибок валидации для общих файлов -->
            <span
              v-if="section.commonValidationErrors && section.commonValidationErrors.length"
              class="ml-2 text-red-500 cursor-pointer"
              title="Найдены ошибки в структуре общих файлов"
              @click="toggleCommonValidationErrors(section.name)"
            >
              ⚠️
            </span>

            <!-- Кнопка "Блок common на сцену" -->
            <button
              class="ml-2 px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
              type="button"
              @click="handleBlockCommon(section.name)"
            >
              Блок common на сцену
            </button>
          </div>

          <!-- Описание для общих файлов -->
          <div class="text-sm text-gray-600 ml-2 mt-1 italic">
            Эти файлы будут установлены, если активен хотя бы один компонент модуля
          </div>

          <!-- Ошибки валидации для общих файлов -->
          <div
            v-if="isCommonValidationErrorsVisible(section.name) &&
                  section.commonValidationErrors &&
                  section.commonValidationErrors.length"
            class="mt-2 ml-6 p-2 bg-red-50 rounded border border-red-200 text-sm"
          >
            <div class="text-xs text-red-700 mb-1 font-medium">Найдены проблемы в структуре общих файлов:</div>
            <ul class="text-red-600 list-disc pl-4">
              <li v-for="(error, index) in section.commonValidationErrors" :key="index" class="text-xs">
                {{ error }}
              </li>
            </ul>
          </div>

          <!-- Список общих файлов -->
          <div
            v-if="isCommonFileListVisible(section.name)"
            class="mt-2 ml-6 p-2 bg-gray-50 rounded border border-gray-200 text-sm"
          >
            <div class="text-xs text-gray-500 mb-1">Общие файлы модуля (из @common.json):</div>
            <ul class="text-gray-600 list-disc pl-4">
              <li v-for="(file, index) in section.commonFiles" :key="index" class="text-xs">
                {{ file }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Отображаем элементы (блоки) внутри секции -->
        <div class="pl-4">
          <div v-for="item in section.items" :key="item.name" class="mb-4">
            <div class="flex items-center">
              <!-- Чекбокс убран -->
              <label :for="item.name" class="text-gray-700 font-medium">{{ item.label }}</label>
              <!-- New block button next to label -->
              <button
                class="ml-2 px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                type="button"
                @click="handleBlockForItem(item.name)"
              >
                Блок на сцену
              </button>

              <!-- Индикатор ошибок валидации -->
              <span
                v-if="item.validationErrors && item.validationErrors.length"
                class="ml-2 text-red-500 cursor-pointer"
                title="Найдены ошибки в структуре файлов"
                @click="toggleValidationErrors(item.name)"
              >
                ⚠️
              </span>

              <!-- Кнопка для отображения/скрытия списка файлов -->
              <button
                v-if="item.files && item.files.length"
                class="ml-2 text-xs text-blue-600 hover:text-blue-800"
                type="button"
                @click="toggleFileList(item.name)"
              >
                {{ isFileListVisible(item.name) ? 'Скрыть файлы' : 'Показать файлы' }}
              </button>
            </div>

            <!-- Ошибки валидации для этого элемента -->
            <div
              v-if="isValidationErrorsVisible(item.name) && item.validationErrors && item.validationErrors.length"
              class="mt-2 ml-6 p-2 bg-red-50 rounded border border-red-200 text-sm"
            >
              <div class="text-xs text-red-700 mb-1 font-medium">Найдены проблемы в структуре файлов:</div>
              <ul class="text-red-600 list-disc pl-4">
                <li v-for="(error, index) in item.validationErrors" :key="index" class="text-xs">
                  {{ error }}
                </li>
              </ul>
            </div>

            <!-- Список файлов для этого элемента (блока) -->
            <div
              v-if="isFileListVisible(item.name) && item.files && item.files.length"
              class="mt-2 ml-6 p-2 bg-gray-50 rounded border border-gray-200 text-sm"
            >
              <div class="text-xs text-gray-500 mb-1">Файлы, входящие в данный компонент:</div>
              <ul class="text-gray-600 list-disc pl-4">
                <li v-for="(file, index) in item.files" :key="index" class="text-xs">
                  {{ file }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопки -->
      <div class="flex mt-6">
        <button
          class="mr-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          type="button"
          @click="handleSceneMerge"
        >
          Слить со сцены в инсталятор
        </button>
        <button
          class="mr-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          type="button"
          @click="handleProductionCopy"
        >
          Копировать со сцены на production
        </button>
        <button
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          type="button"
          @click="handleClearScene"
        >
          Очистить сцену
        </button>
      </div>
    </div>

    <div v-if="isInstalling" class="mt-6">
      <p class="mb-2">Установка: {{ currentModule }}</p>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div
          :style="{ width: progress + '%' }"
          class="bg-blue-600 h-4 rounded-full"
        ></div>
      </div>
    </div>

    <div v-if="message" class="mt-4 p-4 bg-green-100 text-green-700 rounded">
      {{ message }}
    </div>

    <div v-if="error" class="mt-4 p-4 bg-red-100 text-red-700 rounded">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { router } from '@inertiajs/vue3'

export default {
  name: 'SceneIndex',
  props: {
    formSchema: Object,
    installSections: Object,
  },
  data() {
    return {
      modulesState: {},
      message: '',
      error: '',
      isInstalling: false,
      progress: 0,
      currentModule: '',
      visibleCommonFileLists: {},
      visibleCommonValidationErrors: {},
      visibleFileLists: {},
      visibleValidationErrors: {},
    }
  },
  created() {
    this.modulesState = {}
    if (this.formSchema && this.formSchema.sections) {
      this.formSchema.sections.forEach(section => {
        this.visibleCommonValidationErrors[section.name] = false
      })
    }
  },
  methods: {

    // Методы для управления видимостью общих файлов
    toggleCommonFileList(sectionName) {
      this.visibleCommonFileLists[sectionName] = !this.isCommonFileListVisible(sectionName)
    },

    isCommonFileListVisible(sectionName) {
      return !!this.visibleCommonFileLists[sectionName]
    },

    // Методы для управления видимостью ошибок валидации общих файлов
    toggleCommonValidationErrors(sectionName) {
      this.visibleCommonValidationErrors[sectionName] = !this.isCommonValidationErrorsVisible(sectionName)
    },

    isCommonValidationErrorsVisible(sectionName) {
      return !!this.visibleCommonValidationErrors[sectionName]
    },

    // Методы для управления видимостью списков файлов
    toggleFileList(itemName) {
      this.visibleFileLists[itemName] = !this.isFileListVisible(itemName)
    },

    isFileListVisible(itemName) {
      return !!this.visibleFileLists[itemName]
    },

    // Методы для управления видимостью ошибок валидации
    toggleValidationErrors(itemName) {
      this.visibleValidationErrors[itemName] = !this.isValidationErrorsVisible(itemName)
    },

    isValidationErrorsVisible(itemName) {
      return !!this.visibleValidationErrors[itemName]
    },

    async handleSceneMerge() {
      try {
        await router.post('/panel/scene/scene-merge', {}, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || 'Слияние со сцены успешно завершено.'
      } catch (err) {
        console.error(err)
        this.error = err.response?.data?.message || 'Ошибка слияния со сценой.'
      }
    },
    async handleProductionCopy() {
      try {
        await router.post('/panel/scene/production-copy', {}, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || 'Копирование на production успешно завершено.'
      } catch (err) {
        console.error(err)
        this.error = err.response?.data?.message || 'Ошибка копирования на production.'
      }
    },
    async handleClearScene() {
      try {
        await router.post('/panel/scene/clear-scene', {}, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || 'Сцена успешно очищена.'
      } catch (err) {
        console.error(err)
        this.error = err.response?.data?.message || 'Ошибка очистки сцены.'
      }
    },
    async handleBlockCommon(sectionName) {
      try {
        // Подготавливаем данные для блоковой установки общих файлов
        const installData = {
          modules: {},
          activeSections: { [sectionName]: true },
          blockItems: [],
          commonFilesOnly: true,
          moduleName: sectionName,
        }

        await router.post('/panel/scene/block-scene-install', installData, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || `Общие файлы модуля ${sectionName} успешно выведены на сцену.`
      } catch (err) {
        console.error(err)
        this.error = err.response?.data?.message || `Ошибка при выводе общих файлов модуля ${sectionName} на сцену.`
      }
    },
    async handleBlockForItem(itemName) {
      try {
        // Подготавливаем данные для блоковой установки для одного элемента
        const installData = {
          modules: this.modulesState,
          activeSections: {},
          blockItems: [itemName],
        }
        if (this.formSchema.sections) {
          this.formSchema.sections.forEach(section => {
            installData.activeSections[section.name] = true
          })
        }
        await router.post('/panel/scene/block-scene-install', installData, {
          preserveScroll: true,
          preserveState: true,
        })
        this.message = this.$page.props.flash.success || 'Блок успешно выведен на сцену.'
      } catch (err) {
        console.error(err)
        this.error = err.response?.data?.message || 'Ошибка при выводе блока на сцену.'
      }
    },
  },
}
</script>

<style scoped>
/* Tailwind CSS используется для стилизации */
</style>

