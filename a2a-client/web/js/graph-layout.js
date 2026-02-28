/**
 * Graph Layout - Автоматическая компоновка узлов графа
 * Использует алгоритмы Dagre для автоматического расположения узлов
 */

class GraphLayout {
  constructor() {
    this.layoutSettings = {
      rankdir: 'TB', // TB, BT, LR, RL
      ranksep: 50,
      nodesep: 30,
      marginx: 20,
      marginy: 20
    };
  }

  /**
   * Применить компоновку Dagre
   */
  applyDagreLayout(flowManager) {
    if (!flowManager?.currentFlow) return;

    const nodes = flowManager.currentFlow.nodes;
    const edges = flowManager.currentFlow.edges;

    if (nodes.length === 0) return;

    // Построить граф
    const g = this.buildGraph(nodes, edges);

    // Вычислить позиции
    const layout = this.computeDagreLayout(g);

    // Применить позиции к узлам
    nodes.forEach(node => {
      const pos = layout.nodes[node.id];
      if (pos) {
        node.position = {
          x: pos.x - pos.width / 2,
          y: pos.y - pos.height / 2
        };
      }
    });

    // Перерисовать граф
    flowManager.render();

    console.log('[GraphLayout] Dagre layout applied');
  }

  /**
   * Построить граф для Dagre
   */
  buildGraph(nodes, edges) {
    const g = {
      nodes: {},
      edges: []
    };

    // Добавить узлы
    nodes.forEach(node => {
      g.nodes[node.id] = {
        id: node.id,
        width: node.data?.width || 180,
        height: node.data?.height || 80
      };
    });

    // Добавить ребра
    edges.forEach(edge => {
      g.edges.push({
        source: edge.source,
        target: edge.target
      });
    });

    return g;
  }

  /**
   * Вычислить компоновку (упрощенная реализация Dagre)
   */
  computeDagreLayout(g) {
    // Топологическая сортировка
    const sorted = this.topologicalSort(g);
    
    // Вычислить позиции
    const positions = {};
    let currentY = this.layoutSettings.marginy;
    
    // Группировка по уровням
    const levels = this.assignLevels(g, sorted);
    
    // Позиционирование
    levels.forEach((levelNodes, level) => {
      let currentX = this.layoutSettings.marginx;
      const maxHeight = Math.max(...levelNodes.map(n => g.nodes[n.id]?.height || 80));
      
      levelNodes.forEach(node => {
        const nodeData = g.nodes[node.id];
        positions[node.id] = {
          x: currentX + (nodeData?.width || 180) / 2,
          y: currentY + maxHeight / 2,
          width: nodeData?.width || 180,
          height: nodeData?.height || 80
        };
        currentX += (nodeData?.width || 180) + this.layoutSettings.nodesep;
      });
      
      currentY += maxHeight + this.layoutSettings.ranksep;
    });

    return positions;
  }

  /**
   * Топологическая сортировка
   */
  topologicalSort(g) {
    const visited = new Set();
    const result = [];
    const nodes = Object.keys(g.nodes);

    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Посетить зависимости
      g.edges.forEach(edge => {
        if (edge.source === nodeId) {
          visit(edge.target);
        }
      });

      result.push(nodeId);
    };

    nodes.forEach(visit);
    return result;
  }

  /**
   * Назначить уровни узлам
   */
  assignLevels(g, sorted) {
    const levels = [];
    const nodeLevels = {};
    const inDegree = {};

    // Инициализировать in-degree
    Object.keys(g.nodes).forEach(id => {
      inDegree[id] = 0;
    });

    // Подсчитать in-degree
    g.edges.forEach(edge => {
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });

    // Назначить уровни
    sorted.forEach(nodeId => {
      let level = 0;
      
      // Найти максимальный уровень предшественников
      g.edges.forEach(edge => {
        if (edge.target === nodeId && nodeLevels[edge.source] !== undefined) {
          level = Math.max(level, nodeLevels[edge.source] + 1);
        }
      });
      
      nodeLevels[nodeId] = level;
      
      if (!levels[level]) levels[level] = [];
      levels[level].push({ id: nodeId });
    });

    return levels.filter(l => l);
  }

  /**
   * Применить древовидную компоновку
   */
  applyTreeLayout(flowManager) {
    if (!flowManager?.currentFlow) return;

    const nodes = flowManager.currentFlow.nodes;
    const edges = flowManager.currentFlow.edges;

    if (nodes.length === 0) return;

    // Найти корневой узел (нет входящих ребер)
    const hasIncoming = new Set(edges.map(e => e.target));
    const rootNode = nodes.find(n => !hasIncoming.has(n.id));

    if (!rootNode) {
      // Если нет корневого, используем первый узел
      this.applyDagreLayout(flowManager);
      return;
    }

    // Построить дерево
    const tree = this.buildTree(rootNode, nodes, edges);
    
    // Вычислить позиции
    const positions = {};
    this.computeTreePositions(tree, 0, 0, positions);

    // Применить позиции
    nodes.forEach(node => {
      if (positions[node.id]) {
        node.position = positions[node.id];
      }
    });

    flowManager.render();
    console.log('[GraphLayout] Tree layout applied');
  }

  /**
   * Построить дерево из графа
   */
  buildTree(root, nodes, edges) {
    const children = [];
    const childEdges = edges.filter(e => e.source === root.id);
    
    childEdges.forEach(edge => {
      const childNode = nodes.find(n => n.id === edge.target);
      if (childNode) {
        children.push(this.buildTree(childNode, nodes, edges));
      }
    });

    return {
      id: root.id,
      children
    };
  }

  /**
   * Вычислить позиции в дереве
   */
  computeTreePositions(node, x, y, positions, level = 0) {
    const levelHeight = 100;
    const nodeWidth = 180;
    const nodeHeight = 80;

    positions[node.id] = {
      x: x + nodeWidth / 2,
      y: y + nodeHeight / 2,
      width: nodeWidth,
      height: nodeHeight
    };

    if (node.children.length === 0) return;

    // Вычислить общую ширину дочерних элементов
    const totalWidth = node.children.reduce((sum, child) => {
      return sum + (this.getSubtreeWidth(child) || 180);
    }, 0) + (node.children.length - 1) * 30;

    let currentX = x - totalWidth / 2 + nodeWidth / 2;

    node.children.forEach(child => {
      const childWidth = this.getSubtreeWidth(child) || 180;
      this.computeTreePositions(
        child,
        currentX,
        y + levelHeight,
        positions,
        level + 1
      );
      currentX += childWidth + 30;
    });
  }

  /**
   * Получить ширину поддерева
   */
  getSubtreeWidth(node) {
    if (!node.children || node.children.length === 0) {
      return 180;
    }
    return node.children.reduce((sum, child) => {
      return sum + (this.getSubtreeWidth(child) || 180);
    }, 0) + (node.children.length - 1) * 30;
  }

  /**
   * Применить force-directed layout
   */
  applyForceLayout(flowManager, iterations = 100) {
    if (!flowManager?.currentFlow) return;

    const nodes = flowManager.currentFlow.nodes;
    const edges = flowManager.currentFlow.edges;

    if (nodes.length === 0) return;

    // Инициализация случайных позиций
    nodes.forEach(node => {
      if (!node.position) {
        node.position = {
          x: Math.random() * 500,
          y: Math.random() * 500
        };
      }
      node.velocity = { x: 0, y: 0 };
    });

    const repulsion = 5000;
    const attraction = 0.05;
    const damping = 0.9;

    // Итерации force-directed
    for (let i = 0; i < iterations; i++) {
      // Отталкивание между узлами
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const dx = nodes[j].position.x - nodes[k].position.x;
          const dy = nodes[j].position.y - nodes[k].position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          nodes[j].velocity.x += fx;
          nodes[j].velocity.y += fy;
          nodes[k].velocity.x -= fx;
          nodes[k].velocity.y -= fy;
        }
      }

      // Притяжение по ребрам
      edges.forEach(edge => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        
        if (source && target) {
          const dx = target.position.x - source.position.x;
          const dy = target.position.y - source.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * attraction;
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          source.velocity.x += fx;
          source.velocity.y += fy;
          target.velocity.x -= fx;
          target.velocity.y -= fy;
        }
      });

      // Применение скоростей
      nodes.forEach(node => {
        node.velocity.x *= damping;
        node.velocity.y *= damping;
        node.position.x += node.velocity.x;
        node.position.y += node.velocity.y;
      });
    }

    // Очистить velocity
    nodes.forEach(node => {
      delete node.velocity;
    });

    flowManager.render();
    console.log('[GraphLayout] Force layout applied');
  }

  /**
   * Настроить параметры компоновки
   */
  configure(settings) {
    this.layoutSettings = { ...this.layoutSettings, ...settings };
  }
}

// Создать экземпляр
const graphLayout = new GraphLayout();

// Сделать глобальным
if (typeof window !== 'undefined') {
  window.GraphLayout = GraphLayout;
  window.graphLayout = graphLayout;
}
