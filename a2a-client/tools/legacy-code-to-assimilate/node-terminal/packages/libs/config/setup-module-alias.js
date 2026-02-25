const moduleAlias = require('module-alias');
const path = require('path');

// Используем локальный путь packages/libs относительно этого файла
// __dirname = packages/libs/config, поэтому packages/libs = ../../
const resolvedPath = path.resolve(__dirname, '../..');
moduleAlias.addAlias('@libs', resolvedPath);

console.log('✅ Jest: module-alias configured for @libs');
console.log('   Resolved @libs path in Jest setup:', resolvedPath);
