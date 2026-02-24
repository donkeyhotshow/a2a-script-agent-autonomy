/**
 * Simple test rule for ESLint 9.x (CommonJS)
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Simple test rule',
      category: 'Best Practices'
    },
    schema: [],
    messages: {
      testMessage: 'Test rule triggered on console.log'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.name === 'console' && node.callee.object.name === 'console') {
          context.report({
            node,
            messageId: 'testMessage'
          });
        }
      }
    };
  }
};