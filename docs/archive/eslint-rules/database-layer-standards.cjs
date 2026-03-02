/**
 * Database Layer Standards Rule
 *
 * Правила для работы с базой данных (миграции, модели, сиды)
 * - ADR 1201: Database Layer Standards
 * - Laravel Database Best Practices
 * - Data Integrity Standards
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверяет соблюдение стандартов работы с базой данных',
            category: 'Database',
            recommended: true
        },
        schema: [],
        messages: {
            'db-migration-naming': 'Миграции должны иметь правильное именование (timestamp_name)',
            'db-migration-structure': 'Миграции должны иметь up() и down() методы',
            'db-migration-foreign-keys': 'Используйте foreign key constraints',
            'db-migration-indexes': 'Добавляйте индексы для часто используемых полей',
            'db-model-fillable-guarded': 'Модели должны иметь $fillable или $guarded',
            'db-model-relationships': 'Определяйте отношения между моделями',
            'db-model-scopes': 'Используйте scopes для сложных запросов',
            'db-model-validation': 'Добавляйте валидацию в модели',
            'db-seeder-naming': 'Сиды должны иметь правильное именование',
            'db-seeder-factory-usage': 'Используйте factories в сидах',
            'db-query-optimization': 'Оптимизируйте запросы (N+1 problem)',
            'db-transaction-usage': 'Используйте транзакции для связанных операций',
            'db-soft-deletes': 'Используйте soft deletes для важных данных',
            'db-timestamps': 'Используйте timestamps для аудита'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isDatabaseFile = filename.includes('/database/') || filename.includes('Migration') ||
            filename.includes('Factory') || filename.includes('Seeder')

        if (!isDatabaseFile) return {}

        return {
            Program(node) {
                const sourceCode = context.getSourceCode()
                const text = sourceCode.getText()

                // Проверяем миграции
                if (filename.includes('Migration') || text.includes('extends Migration')) {
                    // Проверяем структуру миграции
                    if (!text.includes('public function up()') || !text.includes('public function down()')) {
                        context.report({
                            node,
                            messageId: 'db-migration-structure'
                        })
                    }

                    // Проверяем foreign keys
                    if (text.includes('$table->') && !text.includes('foreign(') && !text.includes('references(')) {
                        const hasReferences = text.includes('->unsignedBigInteger(') || text.includes('->foreignId(')
                        if (hasReferences) {
                            context.report({
                                node,
                                messageId: 'db-migration-foreign-keys'
                            })
                        }
                    }

                    // Проверяем индексы
                    if (text.includes('$table->string(') && !text.includes('->index()') && !text.includes('->unique()')) {
                        // Для текстовых полей часто нужны индексы
                    }
                }

                // Проверяем модели
                if (text.includes('extends Model')) {
                    // Проверяем fillable/guarded
                    if (!text.includes('$fillable') && !text.includes('$guarded')) {
                        context.report({
                            node,
                            messageId: 'db-model-fillable-guarded'
                        })
                    }

                    // Проверяем relationships
                    const hasRelationships = text.includes('function ') &&
                        (text.includes('belongsTo') || text.includes('hasMany') ||
                            text.includes('hasOne') || text.includes('belongsToMany'))
                    if (!hasRelationships) {
                        // Возможно модель не имеет отношений, что нормально для некоторых случаев
                    }

                    // Проверяем soft deletes
                    if (!text.includes('SoftDeletes') && !text.includes('use SoftDeletes')) {
                        // Для многих моделей soft deletes желательны
                    }

                    // Проверяем timestamps
                    if (!text.includes('$timestamps') || text.includes('$timestamps = false')) {
                        // Timestamps обычно нужны
                    }
                }

                // Проверяем factories
                if (filename.includes('Factory') || text.includes('extends Factory')) {
                    if (!text.includes('definition()')) {
                        context.report({
                            node,
                            messageId: 'db-seeder-factory-usage'
                        })
                    }

                    if (!text.includes('fake()') && !text.includes('Faker')) {
                        // Factories должны использовать fake data
                    }
                }

                // Проверяем seeders
                if (filename.includes('Seeder') || text.includes('extends Seeder')) {
                    if (!text.includes('run()')) {
                        context.report({
                            node,
                            messageId: 'db-seeder-naming'
                        })
                    }

                    // Проверяем использование factories
                    if (!text.includes('factory(') && !text.includes('create(')) {
                        context.report({
                            node,
                            messageId: 'db-seeder-factory-usage'
                        })
                    }
                }

                // Общие правила для БД файлов
                if (text.includes('DB::') || text.includes('$query')) {
                    // Проверяем на N+1 проблему
                    if (text.includes('->get()') && !text.includes('with(') && !text.includes('load(')) {
                        // Возможная N+1 проблема
                    }

                    // Проверяем использование транзакций
                    if (text.includes('create(') && text.includes('update(') && !text.includes('DB::transaction')) {
                        context.report({
                            node,
                            messageId: 'db-transaction-usage'
                        })
                    }
                }
            }
        }
    }
}
