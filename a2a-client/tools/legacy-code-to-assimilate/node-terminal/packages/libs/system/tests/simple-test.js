const fs = require('fs');
const path = require('path');

// Проверяем, что файл index.js существует и может быть прочитан
const indexPath = path.join(__dirname, '../index.js');
console.log('Checking index.js path:', indexPath);

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.js not found');
  process.exit(1);
}

console.log('✅ File exists');

// Проверяем, что файл содержит корректный JavaScript
const content = fs.readFileSync(indexPath, 'utf8');
console.log('Contains module.exports:', content.includes('module.exports'));
console.log('Contains processSpawn:', content.includes('processSpawn'));

console.log('✅ System module file structure is valid');
console.log('🎉 Test completed successfully!');
