/**
 * ESLint правило: no-invalid-classes
 *
 * Обнаруживает неактуальные классы в Vue файлах:
 * - Классы, которых нет в Tailwind теме
 * - Классы, которых нет в подключенных CSS файлах
 */

const fs = require('fs')
const path = require('path')

// Кэш для извлеченных классов
let extractedData = null

function loadExtractedClasses() {
  if (extractedData) return extractedData
  
  const extractedPath = path.join(__dirname, 'extracted-classes.json')
  if (fs.existsSync(extractedPath)) {
    try {
      extractedData = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'))
      return extractedData
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Обнаруживает неактуальные классы, которых нет в Tailwind теме или CSS файлах',
      category: 'Best Practices',
      recommended: true
    },
    schema: [],
    messages: {
      invalidClass: 'Класс "{{className}}" не найден ни в Tailwind теме, ни в подключенных CSS файлах'
    }
  },
  create(context) {
    const filename = context.getFilename()
    if (!filename.endsWith('.vue')) return {}

    const sourceCode = context.sourceCode || context.getSourceCode()
    const extracted = loadExtractedClasses()
    const tailwindClasses = getTailwindClasses(extracted)
    const cssClasses = getCssClasses(filename)
    const allValidClasses = new Set([...tailwindClasses, ...cssClasses])

    return {
      Program() {
        const text = sourceCode.getText()
        const classRegex = /class="([^"]+)"/g
        let match
        
        while ((match = classRegex.exec(text)) !== null) {
          const classValue = match[1]
          
          // Пропускаем динамические классы (computed, variables, expressions)
          if (/^[a-z][a-zA-Z0-9]*$/.test(classValue.trim())) continue
          if (classValue.includes('{') || classValue.includes('[') || classValue.includes('`')) continue
          if (classValue.includes('?') || classValue.includes(':') && !classValue.match(/^[a-z-]+:[a-z-]/)) continue
          
          const classes = classValue.split(/\s+/).filter(Boolean)
          
          classes.forEach(cls => {
            // Пропускаем переменные и выражения
            if (/^[a-z][a-zA-Z0-9]*$/.test(cls)) return
            if (cls.includes('(') || cls.includes(')')) return
            if (cls.includes('?') || cls.includes('===') || cls.includes('!')) return
            if (cls.length < 2) return
            
            const baseClass = cls.replace(/^(sm|md|lg|xl|2xl|hover|focus|active|dark|disabled|first|last|odd|even|group-hover|peer-checked):/, '')
            
            if (!isValidClass(baseClass, allValidClasses)) {
              const start = match.index + match[0].indexOf(cls)
              const loc = sourceCode.getLocFromIndex(start)
              
              context.report({
                loc: {
                  start: loc,
                  end: sourceCode.getLocFromIndex(start + cls.length)
                },
                messageId: 'invalidClass',
                data: { className: cls }
              })
            }
          })
        }
      }
    }
  }
}

function isValidClass(className, validClasses) {
  if (validClasses.has(className)) return true
  
  // CSS переменные (var(--*))
  if (/\[var\(--/.test(className)) {
    // Проверяем, существует ли переменная
    const extracted = loadExtractedClasses()
    if (extracted && extracted.cssVariables) {
      const varMatch = className.match(/\[var\(--([-\w]+)\)\]/)
      if (varMatch) {
        const varName = varMatch[1]
        return extracted.cssVariables.includes(varName)
      }
    }
    return true // Если нет данных, пропускаем
  }
  
  // Tailwind паттерны с динамическими значениями
  const patterns = [
    /^(m|p)[xytblr]?-(\d+|auto|px)$/,
    /^-?(m|p)[xytblr]?-\d+$/,
    /^(w|h)-(\d+|auto|full|screen|min|max|fit)$/,
    /^(min|max)-(w|h)-(\d+|full|screen|min|max|fit)$/,
    /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
    /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current)(-\d+|-50|-100|-200|-300|-400|-500|-600|-700|-800|-900|-950)?$/,
    /^rounded(-[a-z]+)?(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
    /^border(-[0-8]|-[xytblr]|-t-transparent|-b-transparent|-l-transparent|-r-transparent)?$/,
    /^shadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?$/,
    /^opacity-(\d+)$/,
    /^z-(\d+|auto)$/,
    /^(top|right|bottom|left|inset)-(\d+|auto|1\/2|full)$/,
    /^-?(top|right|bottom|left|inset)-(\d+|1\/2)$/,
    /^gap-(\d+)$/,
    /^space-(x|y)-(\d+)$/,
    /^divide-(x|y)(-\d+)?$/,
    /^grid-cols-(\d+|none)$/,
    /^col-span-(\d+|full)$/,
    /^flex-(\d+|auto|initial|none)$/,
    /^order-(\d+|first|last|none)$/,
    /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)$/,
    /^leading-(\d+|none|tight|snug|normal|relaxed|loose)$/,
    /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
    /^duration-(\d+)$/,
    /^delay-(\d+)$/,
    /^scale-(\d+)$/,
    /^rotate-(\d+)$/,
    /^translate-(x|y)-(\d+|1\/2)$/,
    /^-translate-(x|y)-(\d+|1\/2)$/,
    /^(flex|grid|block|inline|inline-block|hidden|table|table-row|table-cell)$/,
    /^(static|fixed|absolute|relative|sticky)$/,
    /^(justify|items|self|content)-(start|end|center|between|around|evenly|stretch|baseline)$/,
    /^overflow-(auto|hidden|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|x-scroll|y-scroll)$/,
    /^cursor-(auto|default|pointer|wait|text|move|not-allowed|help)$/,
    /^transition(-all|-colors|-opacity|-shadow|-transform|-\w+)?$/,
    /^duration-\d+$/,
    /^ease-(linear|in|out|in-out)$/,
    /^items-(start|end|center|baseline|stretch)$/,
    /^justify-(start|end|center|between|around|evenly)$/,
    /^space-(x|y)-(\d+|reverse)$/,
    /^text-(left|center|right|justify|start|end)$/,
    /^align-(baseline|top|middle|bottom|text-top|text-bottom)$/,
    /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap)$/,
    /^break-(normal|words|all)$/,
    /^select-(none|text|all|auto)$/,
    /^object-(contain|cover|fill|none|scale-down)$/,
    /^(min|max)-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|min|max|fit|prose|screen-sm|screen-md|screen-lg|screen-xl|screen-2xl)$/,
    /^(min|max)-h-(\d+|full|screen)$/,
    /^h-(\d+|1\.5|2\.5|auto|full|screen|min|max|fit)$/,
    /^w-(\d+|1\.5|2\.5|auto|full|screen|min|max|fit)$/,
    /^ring(-\d+)?$/,
    /^ring-(offset-)?\d+$/,
    /^focus:(ring|outline-none|ring-\d+|ring-offset-\d+)$/,
    /^focus-within:ring(-\d+|-offset-\d+)?$/,
    /^backdrop-blur(-sm|-md|-lg|-xl)?$/,
    /^bg-(opacity|center|surface)-\d+$/,
    /^border-(dashed|dotted|double|none)$/,
    /^(has-\[:[a-z]+\]|peer-checked|group-hover):.*$/,
    /^left-full$/,
    /^px-2\.5$/,
    /^mr-1\.5$/
  ]
  
  return patterns.some(pattern => pattern.test(className))
}

function getClassValue(node) {
  if (node.value?.value) return node.value.value
  if (node.value?.expression?.value) return node.value.expression.value
  return null
}

function getClassValue(node) {
  if (node.value?.value) return node.value.value
  if (node.value?.expression?.value) return node.value.expression.value
  return null
}

function getTailwindClasses(extracted) {
  const classes = new Set()
  
  // Если есть извлеченные данные, используем их
  if (extracted && extracted.tailwindClasses) {
    extracted.tailwindClasses.forEach(cls => classes.add(cls))
  }
  
  // Базовые Tailwind классы
  const baseClasses = [
    'container', 'flex', 'grid', 'block', 'inline', 'inline-block', 'hidden',
    'static', 'fixed', 'absolute', 'relative', 'sticky', 'flex-1',
    'transition', 'transform', 'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce',
    'sr-only', 'not-sr-only', 'pointer-events-none', 'pointer-events-auto',
    'cursor-pointer', 'select-none', 'w-full', 'h-full'
  ]
  
  baseClasses.forEach(cls => classes.add(cls))
  return classes
}

function getCssClasses(vueFilePath) {
  const classes = new Set()
  const projectRoot = findProjectRoot(vueFilePath)
  if (!projectRoot) return classes

  // Поиск CSS файлов в features
  const featuresPath = path.join(projectRoot, 'features')
  if (fs.existsSync(featuresPath)) {
    findCssFiles(featuresPath, classes)
  }

  return classes
}

function findCssFiles(dir, classes) {
  try {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        findCssFiles(fullPath, classes)
      } else if (file.endsWith('.css')) {
        extractCssClasses(fullPath, classes)
      }
    })
  } catch (e) {
    // Игнорируем ошибки доступа
  }
}

function extractCssClasses(cssFile, classes) {
  try {
    const content = fs.readFileSync(cssFile, 'utf-8')
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g
    let match
    while ((match = classRegex.exec(content)) !== null) {
      classes.add(match[1])
    }
  } catch (e) {
    // Игнорируем ошибки чтения
  }
}

function findProjectRoot(filePath) {
  let dir = path.dirname(filePath)
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'tailwind.config.js'))) {
      return dir
    }
    dir = path.dirname(dir)
  }
  return null
}
