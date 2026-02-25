class ServiceValidator {
  constructor(serviceConfigManager, logger) {
    this.serviceConfigManager = serviceConfigManager;
    this.logger = logger;
    this.validators = new Map();

    this.validators.set('service', this.validateServiceData.bind(this));
    this.validators.set('group', this.validateGroupData.bind(this));
  }

  /**
   * Валидация данных сервиса
   */
  validateServiceData(data) {
    const errors = [];

    if (!data.id || !/^[a-z0-9-]+$/.test(data.id)) {
      errors.push('ID сервиса обязателен и должен содержать только буквы, цифры и дефисы');
    }

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Название сервиса обязательно');
    }

    if (!data.group || !this.serviceConfigManager.groups?.[data.group]) {
      errors.push('Группа сервиса обязательна и должна существовать');
    }

    if (data.startCommands && Array.isArray(data.startCommands)) {
      for (let i = 0; i < data.startCommands.length; i++) {
        const cmd = data.startCommands[i];
        if (!cmd.command || cmd.command.trim().length === 0) {
          errors.push(`Команда ${i + 1}: команда обязательна`);
        }
        if (!cmd.cwd || cmd.cwd.trim().length === 0) {
          errors.push(`Команда ${i + 1}: рабочая директория обязательна`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Валидация данных группы
   */
  validateGroupData(data) {
    const errors = [];

    if (!data.id || !/^[a-z0-9-]+$/.test(data.id)) {
      errors.push('ID группы обязателен и должен содержать только буквы, цифры и дефисы');
    }

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Название группы обязательно');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  getValidator(type) {
    return this.validators.get(type);
  }
}

module.exports = { ServiceValidator };
