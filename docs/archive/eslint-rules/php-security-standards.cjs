/**
 * PHP Security Standards Rule
 *
 * Правила безопасности PHP кода
 * - ADR 403: Security Standards (расширен для PHP)
 * - OWASP Top 10 для PHP
 * - Laravel Security Best Practices
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов безопасности PHP',
      category: 'Security',
      recommended: true
    },
    schema: [],
    messages: {
      'php-sql-injection-risk': 'Потенциальный риск SQL инъекции - используйте prepared statements',
      'php-xss-risk': 'Потенциальный риск XSS - экранируйте вывод',
      'php-csrf-risk': 'Отсутствует защита CSRF в формах',
      'php-mass-assignment': 'Используйте $fillable/$guarded в Laravel моделях',
      'php-direct-database-query': 'Не используйте прямые запросы к БД - используйте Eloquent/Query Builder',
      'php-hardcoded-credentials': 'Не храните credentials в коде - используйте .env',
      'php-weak-password-hash': 'Используйте bcrypt для хеширования паролей',
      'php-file-upload-validation': 'Валидируйте загружаемые файлы (тип, размер, имя)',
      'php-session-security': 'Проверяйте безопасность сессий',
      'php-input-validation': 'Все входные данные должны быть валидированы',
      'php-output-escaping': 'Экранируйте вывод для предотвращения XSS',
      'php-authorization-check': 'Проверяйте авторизацию для всех действий',
      'php-rate-limiting': 'Реализуйте rate limiting для API endpoints',
      'php-logging-sensitive-data': 'Не логируйте чувствительные данные (пароли, токены)',
      'php-error-disclosure': 'Не раскрывайте детали ошибок в production'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPHP = filename.endsWith('.php')

    if (!isPHP) return {}

    return {
      Program(node) {
        const sourceCode = context.getSourceCode()
        const text = sourceCode.getText()

        // Проверяем на SQL инъекции
        if (text.includes('$query') || text.includes('DB::select') || text.includes('DB::raw')) {
          if (text.includes('$_') || text.includes('$request->') || text.includes('$input')) {
            context.report({
              node,
              messageId: 'php-sql-injection-risk'
            })
          }
        }

        // Проверяем Laravel модели на mass assignment
        if (text.includes('extends Model') && !text.includes('$fillable') && !text.includes('$guarded')) {
          context.report({
            node,
            messageId: 'php-mass-assignment'
          })
        }

        // Проверяем на хранение credentials в коде
        const credentialPatterns = [
          /password\s*=\s*['"][^'"]*['"]/i,
          /secret\s*=\s*['"][^'"]*['"]/i,
          /key\s*=\s*['"][^'"]*['"]/i,
          /token\s*=\s*['"][^'"]*['"]/i
        ]

        credentialPatterns.forEach(pattern => {
          if (pattern.test(text) && !text.includes('env(')) {
            context.report({
              node,
              messageId: 'php-hardcoded-credentials'
            })
          }
        })

        // Проверяем хеширование паролей
        if (text.includes('password') && text.includes('hash(') && !text.includes('bcrypt(') && !text.includes('Hash::make')) {
          context.report({
            node,
            messageId: 'php-weak-password-hash'
          })
        }

        // Проверяем file upload
        if (text.includes('$request->file') || text.includes('$_FILES')) {
          const hasValidation = text.includes('validate(') || text.includes('->isValid()')
          if (!hasValidation) {
            context.report({
              node,
              messageId: 'php-file-upload-validation'
            })
          }
        }

        // Проверяем валидацию входных данных
        const inputPatterns = ['$request->', '$_GET', '$_POST', '$_REQUEST']
        inputPatterns.forEach(pattern => {
          if (text.includes(pattern)) {
            const hasValidation = text.includes('validate(') || text.includes('->validated()')
            if (!hasValidation) {
              context.report({
                node,
                messageId: 'php-input-validation'
              })
            }
          }
        })

        // Проверяем экранирование вывода
        if (text.includes('echo ') || text.includes('<?=') || text.includes('print ')) {
          const hasEscaping = text.includes('htmlspecialchars') || text.includes('e(') || text.includes('{{')
          if (!hasEscaping) {
            context.report({
              node,
              messageId: 'php-output-escaping'
            })
          }
        }

        // Проверяем авторизацию
        const controllerActions = ['public function', 'function store', 'function update', 'function destroy']
        controllerActions.forEach(action => {
          if (text.includes(action)) {
            const hasAuth = text.includes('$this->authorize') || text.includes('Gate::') || text.includes('Policy::')
            if (!hasAuth) {
              context.report({
                node,
                messageId: 'php-authorization-check'
              })
            }
          }
        })

        // Проверяем логирование чувствительных данных
        if (text.includes('Log::') || text.includes('logger(')) {
          const sensitiveData = ['password', 'token', 'secret', 'key', 'credit_card']
          sensitiveData.forEach(field => {
            if (text.includes(field)) {
              context.report({
                node,
                messageId: 'php-logging-sensitive-data'
              })
            }
          })
        }
      }
    }
  }
}
