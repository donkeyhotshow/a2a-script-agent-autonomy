class ServiceFormGenerator {
  constructor(serviceConfigManager, logger) {
    this.serviceConfigManager = serviceConfigManager;
    this.logger = logger;
    this.forms = new Map();
  }

  /**
   * Получить форму для создания/редактирования сервиса
   */
  getServiceForm(mode = 'create', serviceId = null) {
    const formKey = `service-form:${mode}:${serviceId || 'new'}`;

    if (this.forms.has(formKey)) {
      return this.forms.get(formKey);
    }

    const form = this.generateServiceForm(mode, serviceId);
    this.forms.set(formKey, form);
    return form;
  }

  /**
   * Генерация формы сервиса
   */
  generateServiceForm(mode, serviceId) {
    const service = serviceId ? this.serviceConfigManager.services?.[serviceId] : null;

    const form = {
      id: `service-form-${mode}-${serviceId || 'new'}`,
      mode: mode,
      title: mode === 'create' ? 'Создать сервис' : 'Редактировать сервис',
      fields: [
        {
          name: 'id',
          label: 'ID сервиса',
          type: 'text',
          required: true,
          value: service?.id || '',
          validation: {
            pattern: '^[a-z0-9-]+$',
            message: 'ID может содержать только буквы, цифры и дефисы'
          }
        },
        {
          name: 'name',
          label: 'Название сервиса',
          type: 'text',
          required: true,
          value: service?.name || '',
          placeholder: 'Введите название сервиса'
        },
        {
          name: 'description',
          label: 'Описание',
          type: 'textarea',
          required: false,
          value: service?.description || '',
          rows: 3
        },
        {
          name: 'group',
          label: 'Группа',
          type: 'select',
          required: true,
          value: service?.group || 'tools',
          options: Object.entries(this.serviceConfigManager.groups || {}).map(([id, group]) => ({
            value: id,
            label: group.name
          }))
        },
        {
          name: 'enabled',
          label: 'Включен',
          type: 'checkbox',
          required: false,
          value: service?.enabled !== false
        },
        {
          name: 'autostart',
          label: 'Автозапуск',
          type: 'checkbox',
          required: false,
          value: service?.autostart || false
        },
        {
          name: 'type',
          label: 'Тип сервиса',
          type: 'select',
          required: true,
          value: service?.type || 'web',
          options: [
            { value: 'web', label: 'Web сервис' },
            { value: 'api', label: 'API сервис' },
            { value: 'desktop', label: 'Desktop приложение' },
            { value: 'daemon', label: 'Демон/Служба' },
            { value: 'tool', label: 'Инструмент' }
          ]
        }
      ],
      actions: [
        {
          type: 'submit',
          label: mode === 'create' ? 'Создать' : 'Сохранить',
          primary: true
        },
        {
          type: 'cancel',
          label: 'Отмена'
        }
      ]
    };

    // Добавляем поля для команд запуска
    if (mode === 'edit' || mode === 'create') {
      form.fields.push({
        name: 'startCommands',
        label: 'Команды запуска',
        type: 'array',
        value: service?.startCommands || [this.getDefaultStartCommand()],
        itemTemplate: this.getStartCommandTemplate()
      });
    }

    return form;
  }

  /**
   * Шаблон команды запуска
   */
  getStartCommandTemplate() {
    return {
      id: '',
      name: '',
      command: '',
      args: [],
      cwd: '',
      logFile: '',
      enabled: true,
      port: null,
      description: ''
    };
  }

  /**
   * Получить форму для группы сервисов
   */
  getGroupForm(mode = 'create', groupId = null) {
    const group = groupId ? this.serviceConfigManager.groups?.[groupId] : null;

    return {
      id: `group-form-${mode}-${groupId || 'new'}`,
      mode: mode,
      title: mode === 'create' ? 'Создать группу' : 'Редактировать группу',
      fields: [
        {
          name: 'id',
          label: 'ID группы',
          type: 'text',
          required: true,
          value: group?.id || '',
          validation: {
            pattern: '^[a-z0-9-]+$',
            message: 'ID может содержать только буквы, цифры и дефисы'
          }
        },
        {
          name: 'name',
          label: 'Название группы',
          type: 'text',
          required: true,
          value: group?.name || ''
        },
        {
          name: 'description',
          label: 'Описание',
          type: 'textarea',
          required: false,
          value: group?.description || '',
          rows: 3
        },
        {
          name: 'enabled',
          label: 'Включена',
          type: 'checkbox',
          required: false,
          value: group?.enabled !== false
        },
        {
          name: 'autoStart',
          label: 'Автозапуск',
          type: 'checkbox',
          required: false,
          value: group?.autoStart || false
        },
        {
          name: 'services',
          label: 'Сервисы в группе',
          type: 'multiselect',
          required: false,
          value: group?.services || [],
          options: Object.entries(this.serviceConfigManager.services || {}).map(([id, service]) => ({
            value: id,
            label: service.name || id
          }))
        }
      ],
      actions: [
        {
          type: 'submit',
          label: mode === 'create' ? 'Создать' : 'Сохранить',
          primary: true
        },
        {
          type: 'cancel',
          label: 'Отмена'
        }
      ]
    };
  }

  /**
   * Получить дефолтную команду запуска
   */
  getDefaultStartCommand() {
    return {
      id: 'default',
      name: 'Default Start',
      command: 'npm',
      args: ['start'],
      cwd: './',
      logFile: 'logs/service.log',
      enabled: true,
      port: null,
      description: 'Default start command'
    };
  }

  async loadFormsAndTemplates() {
    // Здесь можно загружать кастомные формы и шаблоны из файлов
    // Пока используем встроенные
  }
}

module.exports = { ServiceFormGenerator };
