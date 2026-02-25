# VueFlow Debug - Problem & Solution

## Проблема
VueFlow на странице debug.html не отображал узлы при загрузке JSON данных.

## Симптомы
- Canvas (фон) отображался
- Узлы не добавлялись на граф
- Ошибка: "onMounted is not defined"

## Root Cause
1. Использование `onMounted` вне Vue компонента
2. Проблема с reactivity: `reactive()` не работал правильно с VueFlow
3. Событие `onVueflowMounted` не вызывалось
4. `__vueFlow__` не экспортировался на DOM элементе

## Решение

### 1. Использовать ref() вместо reactive()
```
javascript
const nodes = ref([]);
const edges = ref([]);
```

### 2. Передавать ref напрямую в setup()
```
javascript
setup() {
  return { 
    nodes: nodes,  // не reactive объект
    edges: edges 
  };
}
```

### 3. Использовать toRaw() для VueFlow
```
javascript
return h(VueFlow, { 
  nodes: toRaw(nodes.value), 
  edges: toRaw(edges.value),
  fitViewOnInit: true
}, () => [...]);
```

### 4. НЕ добавлять узлы в ответ на изменение state (бесконечный цикл)
- VueFlow watching вызывает re-render
- Re-render вызывает изменение nodes
- Бесконечный цикл "Maximum recursive updates exceeded"

## Работающий код
См. `a2a-client/web/debug.html`

## Ключевые выводы
1. VueFlow для Vue 3 работает через props, не через reactive state
2. Нужно использовать `toRaw()` чтобы избежать реактивного цикла
3. Получение `vueFlowRef` из DOM сложнее чем ожидалось
4. Debug узлы вызывают бесконечный цикл - использовать console.log
