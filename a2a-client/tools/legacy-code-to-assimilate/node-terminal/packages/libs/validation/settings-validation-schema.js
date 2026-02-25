/**
 * Схема валидации для настроек
 */
const settingsValidationSchema = {
  validate: (data) => {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('Settings must be an object');
      return { isValid: false, errors };
    }

    // Базовая валидация
    if (typeof data.key !== 'string' || data.key.trim() === '') {
      errors.push('Key must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  validateMultiple: (settings) => {
    const results = {};
    let totalErrors = 0;

    for (const [key, value] of Object.entries(settings)) {
      const result = settingsValidationSchema.validate({ key, value });
      results[key] = result;
      if (!result.isValid) {
        totalErrors += result.errors.length;
      }
    }

    return {
      isValid: totalErrors === 0,
      results,
      totalErrors
    };
  }
};

export { settingsValidationSchema };
