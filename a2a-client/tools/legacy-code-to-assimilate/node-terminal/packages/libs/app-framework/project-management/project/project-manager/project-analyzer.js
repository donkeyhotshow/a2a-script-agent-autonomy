/**
 * Вспомогательные функции для анализа и категоризации проектов.
 */

/**
 * Категоризирует список проектов и возвращает статистику.
 * @param {Array<object>} projects - Список проектов.
 * @returns {object} Объект со статистикой проектов и категориями.
 */
function analyzeProjects(projects) {
  const categories = [...new Set(projects.map(p => p.category))];
  
  const stats = {
    total: projects.length,
    byType: {},
    byCategory: {},
    totalSize: 0,
    averageSize: 0
  };
  
  for (const project of projects) {
    // Подсчет по типам
    stats.byType[project.type] = (stats.byType[project.type] || 0) + 1;
    
    // Подсчет по категориям
    stats.byCategory[project.category] = (stats.byCategory[project.category] || 0) + 1;
    
    // Подсчет размера (если есть)
    stats.totalSize += project.size || 0;
  }
  
  stats.averageSize = projects.length > 0 ? Math.round(stats.totalSize / projects.length) : 0;

  return {
    projects: projects,
    categories: categories,
    total: projects.length,
    optProjects: projects.filter(p => p.category === 'opt-projects').length,
    systemComponents: projects.filter(p => p.category === 'usr-local').length,
    stats: stats
  };
}

export { analyzeProjects, };
