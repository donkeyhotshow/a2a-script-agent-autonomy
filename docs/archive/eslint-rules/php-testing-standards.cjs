/**
 * PHP Testing Standards Rule
 *
 * Правила для PHP тестов (Unit, Feature, Integration)
 * - ADR 2004: Testing-First Standards (расширен для PHP)
 * - PHPUnit Best Practices
 * - Laravel Testing Conventions
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов PHP тестирования',
      category: 'Testing',
      recommended: true
    },
    schema: [],
    messages: {
      'php-test-class-naming': 'Классы тестов должны заканчиваться на Test',
      'php-test-method-naming': 'Методы тестов должны начинаться с test или использовать @test аннотацию',
      'php-test-extends-testcase': 'Тест классы должны наследоваться от TestCase',
      'php-test-data-provider': 'Используйте data providers для параметризованных тестов',
      'php-test-assertion-count': 'Каждый тест должен содержать хотя бы одно assertion',
      'php-test-database-transactions': 'Используйте DatabaseTransactions в feature тестах',
      'php-test-mocking': 'Используйте моки вместо реальных зависимостей',
      'php-test-coverage': 'Обеспечьте покрытие критически важного кода',
      'php-test-arrange-act-assert': 'Следуйте паттерну Arrange-Act-Assert',
      'php-test-descriptive-names': 'Названия тестов должны быть описательными',
      'php-test-one-assertion': 'Один тест - одно assertion (AAA pattern)',
      'php-test-exception-testing': 'Тестируйте исключения с expectException',
      'php-test-factory-usage': 'Используйте factories для создания тестовых данных',
      'php-test-seeder-avoidance': 'Избегайте seeders в тестах - используйте factories',
      'php-test-api-testing': 'API тесты должны проверять JSON структуру и статус коды'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPHPTest = filename.endsWith('Test.php') || filename.includes('/tests/')

    if (!isPHPTest) return {}

    return {
      Program(node) {
        const sourceCode = context.getSourceCode()
        const text = sourceCode.getText()

        // Проверяем название класса
        const classRegex = /class\s+(\w+)/
        const classMatch = text.match(classRegex)
        if (classMatch && !classMatch[1].endsWith('Test')) {
          context.report({
            node,
            messageId: 'php-test-class-naming'
          })
        }

        // Проверяем наследование от TestCase
        if (!text.includes('extends TestCase') && !text.includes('extends FeatureTestCase') &&
            !text.includes('extends UnitTestCase') && !text.includes('extends IntegrationTestCase')) {
          if (classMatch && classMatch[1].endsWith('Test')) {
            context.report({
              node,
              messageId: 'php-test-extends-testcase'
            })
          }
        }

        // Проверяем методы тестов
        const methodRegex = /public function (\w+)\(\)/g
        let methodMatch
        const testMethods = []
        while ((methodMatch = methodRegex.exec(text)) !== null) {
          const methodName = methodMatch[1]
          testMethods.push(methodName)

          if (!methodName.startsWith('test') && !text.includes(`@${methodName}`) &&
              !text.includes(`@test ${methodName}`)) {
            context.report({
              node,
              messageId: 'php-test-method-naming'
            })
          }
        }

        // Проверяем assertions
        const assertions = ['assert', 'assertEquals', 'assertTrue', 'assertFalse', 'assertNull', 'assertNotNull']
        let hasAssertions = false
        assertions.forEach(assertion => {
          if (text.includes(assertion)) {
            hasAssertions = true
          }
        })

        if (!hasAssertions && testMethods.length > 0) {
          context.report({
            node,
            messageId: 'php-test-assertion-count'
          })
        }

        // Проверяем DatabaseTransactions в feature тестах
        if (filename.includes('Feature') && !text.includes('use DatabaseTransactions') &&
            !text.includes('use RefreshDatabase')) {
          context.report({
            node,
            messageId: 'php-test-database-transactions'
          })
        }

        // Проверяем использование factories вместо seeders
        if (text.includes('Seeder') && !text.includes('DatabaseSeeder')) {
          context.report({
            node,
            messageId: 'php-test-seeder-avoidance'
        })
        }

        // Проверяем использование factories
        if ((text.includes('create(') || text.includes('make(')) && !text.includes('factory(') &&
            !text.includes('Factory::')) {
          // Возможно нужно factory
        }

        // Проверяем API тесты
        if (filename.includes('Feature') && text.includes('get(') || text.includes('post(')) {
          const hasJsonCheck = text.includes('assertJson') || text.includes('assertExactJson')
          const hasStatusCheck = text.includes('assertStatus') || text.includes('assertOk')

          if (!hasJsonCheck || !hasStatusCheck) {
            context.report({
              node,
              messageId: 'php-test-api-testing'
            })
          }
        }

        // Проверяем тестирование исключений
        if (text.includes('expectException') && !text.includes('expectExceptionMessage')) {
          // Хорошо бы проверять сообщение исключения
        }
      }
    }
  }
}
