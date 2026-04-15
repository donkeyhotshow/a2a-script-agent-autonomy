import { useState, useEffect } from 'react';
import { Heart, Snowflake, Rose, ArrowRight, Sparkles, Star, Map, Crown } from 'lucide-react';

// Интерфейс узла ментальной карты
interface MindMapNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: MindMapNode[];
  description?: string;
  color?: string;
}

// Данные ментальной карты
const mindMapData: MindMapNode = {
  id: 'root',
  label: 'Снежная Королева',
  icon: <Snowflake className="w-8 h-8" />,
  description: 'Г. Х. Андерсен • 7 глав',
  color: 'from-cyan-500 via-blue-600 to-indigo-800',
  children: [
    {
      id: 'characters',
      label: 'Персонажи',
      icon: <Heart className="w-6 h-6" />,
      color: 'from-rose-400 to-red-600',
      children: [
        { id: 'kai', label: 'Кай', description: 'Холодный умник', icon: <Snowflake className="w-4 h-4" />, color: 'from-blue-300 to-blue-500' },
        { id: 'gerda', label: 'Герда', description: 'Тёплая любовь', icon: <Heart className="w-4 h-4" />, color: 'from-rose-300 to-rose-500' },
        { id: 'queen', label: 'Снежная Королева', description: 'Манипулятор', icon: <Snowflake className="w-4 h-4" />, color: 'from-cyan-300 to-cyan-600' },
        { id: 'robber', label: 'Разбойница', description: 'Свобода', icon: <Star className="w-4 h-4" />, color: 'from-amber-400 to-orange-500' },
        { id: 'finland', label: 'Финка/Лапландка', description: 'Мудрость', icon: <Sparkles className="w-4 h-4" />, color: 'from-emerald-400 to-teal-600' },
      ],
    },
    {
      id: 'plot',
      label: 'Сюжетные линии',
      icon: <ArrowRight className="w-6 h-6" />,
      color: 'from-violet-500 to-purple-700',
      children: [
        { id: 'mirror', label: 'Осколки зеркала', description: 'Искажение мира', icon: <Map className="w-4 h-4" />, color: 'from-gray-400 to-slate-600' },
        { id: 'abduction', label: 'Похищение', description: 'КАй увезён', icon: <Crown className="w-4 h-4" />, color: 'from-blue-400 to-blue-700' },
        { id: 'meetings', label: '5 встреч Герды', description: 'Путь к истине', icon: <Heart className="w-4 h-4" />, color: 'from-pink-400 to-rose-600' },
        { id: 'rescue', label: 'Спасение', description: 'Любовь побеждает', icon: <Sparkles className="w-4 h-4" />, color: 'from-yellow-400 to-amber-500' },
      ],
    },
    {
      id: 'themes',
      label: 'Темы',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-emerald-500 to-green-700',
      children: [
        { id: 'cold-warm', label: 'Холод разума vs\nТепло сердца', icon: <Snowflake className="w-4 h-4" />, color: 'from-cyan-300 to-blue-500' },
        { id: 'road', label: 'Дорога как рост', icon: <ArrowRight className="w-4 h-4" />, color: 'from-orange-400 to-amber-600' },
      ],
    },
    {
      id: 'symbols',
      label: 'Символы',
      icon: <Star className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-700',
      children: [
        { id: 'troll-mirror', label: 'Зеркало тролля', description: 'Искажение', icon: <Map className="w-4 h-4" />, color: 'from-slate-400 to-slate-600' },
        { id: 'roses', label: 'Розы', description: 'Чистота', icon: <Rose className="w-4 h-4" />, color: 'from-rose-400 to-rose-600' },
        { id: 'sleigh', label: 'Сани', description: 'Соблазн', icon: <Crown className="w-4 h-4" />, color: 'from-blue-300 to-blue-600' },
      ],
    },
  ],
};

// Компонент узла
function NodeComponent({ 
  node, 
  level = 0, 
  angle, 
  radius,
  isRoot = false,
  onNodeClick
}: { 
  node: MindMapNode; 
  level?: number; 
  angle: number; 
  radius: number;
  isRoot?: boolean;
  onNodeClick?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(level <= 1);
  const [hovered, setHovered] = useState(false);
  
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.children && node.children.length > 0) {
      setExpanded(!expanded);
    }
    onNodeClick?.(node.id);
  };

  return (
    <div
      className="absolute transition-all duration-500"
      style={{
        left: `calc(50% + ${x}px - 60px)`,
        top: `calc(50% + ${y}px - 30px)`,
        transform: isRoot ? 'translate(-50%, -50%)' : 'none',
        zIndex: level + 1,
      }}
    >
      <div
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          cursor-pointer rounded-2xl p-3 min-w-[120px] text-center
          transition-all duration-300 shadow-xl backdrop-blur-sm
          ${isRoot 
            ? 'p-6 min-w-[200px] scale-110' 
            : 'hover:scale-105'
          }
          ${hovered ? 'shadow-2xl ring-2 ring-white/50' : ''}
        `}
        style={{
          background: node.color 
            ? `linear-gradient(135deg, ${node.color.includes('from-') ? '' : ''}${node.color})`
            : 'linear-gradient(from-cyan-500 to-blue-700)',
          backgroundColor: '#1e3a5f',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {node.icon && (
            <div className="text-white/90">
              {node.icon}
            </div>
          )}
          <span className={`font-bold text-white ${isRoot ? 'text-xl' : 'text-sm'} leading-tight`}>
            {node.label}
          </span>
          {node.description && !isRoot && (
            <span className="text-xs text-white/70 mt-1">
              {node.description}
            </span>
          )}
        </div>
      </div>
      
      {/* Линии к дочерним узлам */}
      {expanded && node.children && node.children.map((child, index) => {
        const childAngle = angle + (index - (node.children.length - 1) / 2) * 0.4;
        const childRadius = radius - (isRoot ? 180 : 120);
        const childX = Math.cos(childAngle) * childRadius;
        const childY = Math.sin(childAngle) * childRadius;
        
        return (
          <svg
            key={child.id}
            className="absolute pointer-events-none"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              width: Math.abs(childX) + 60,
              height: Math.abs(childY) + 60,
              overflow: 'visible',
            }}
          >
            <defs>
              <linearGradient id={`gradient-${node.id}-${child.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d={`M 60 30 Q ${60 + childX/2} 30, ${60 + childX} ${30 + childY}`}
              stroke={`url(#gradient-${node.id}-${child.id})`}
              strokeWidth="2"
              fill="none"
              className="opacity-60"
            />
          </svg>
        );
      })}
      
      {/* Рекурсивный рендеринг дочерних узлов */}
      {expanded && node.children && node.children.map((child, index) => (
        <NodeComponent
          key={child.id}
          node={child}
          level={level + 1}
          angle={angle + (index - (node.children.length - 1) / 2) * 0.4}
          radius={isRoot ? 180 : 120}
          onNodeClick={onNodeClick}
        />
      ))}
    </div>
  );
}

// Фоновые узоры
function IcePattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Снежинки */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`snowflake-${i}`}
          className="absolute text-white/10 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 30 + 10}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 2}s`,
          }}
        >
          ❄
        </div>
      ))}
      
      {/* Ледяные узоры */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <pattern id="ice-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M0 30 Q15 20 30 30 T60 30" stroke="#60a5fa" strokeWidth="1" fill="none" />
            <path d="M30 0 Q20 15 30 30 T30 60" stroke="#60a5fa" strokeWidth="1" fill="none" />
            <circle cx="30" cy="30" r="2" fill="#93c5fd" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ice-pattern)" />
      </svg>
    </div>
  );
}

function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
      if (e.key === 'l') setShowLegend(!showLegend);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLegend]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 relative overflow-hidden">
      <IcePattern />
      
      {/* Заголовок */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 text-center">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-3">
          <Snowflake className="w-8 h-8 animate-spin-slow" />
          Ментальная карта
        </h1>
        <p className="text-white/70 text-sm mt-1">«Снежная королева» Г. Х. Андерсен</p>
      </div>
      
      {/* Кнопка переключения легенды */}
      <button
        onClick={() => setShowLegend(!showLegend)}
        className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
      >
        {showLegend ? 'Скрыть' : 'Показать'} легенду (L)
      </button>
      
      {/* Основная ментальная карта */}
      <div className="w-full h-screen flex items-center justify-center">
        <div className="relative w-[900px] h-[700px]">
          <NodeComponent
            node={mindMapData}
            level={0}
            angle={-Math.PI / 2}
            radius={0}
            isRoot={true}
            onNodeClick={setSelectedNode}
          />
        </div>
      </div>
      
      {/* Легенда */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md rounded-xl p-4 text-white z-50">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Star className="w-4 h-4" /> Легенда
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400"></div>
              <span>Холод (синий)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-rose-400"></div>
              <span>Тепло (красный)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400"></div>
              <span>Свобода/Мудрость</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/20 text-xs text-white/60">
            Клик по узлу - развернуть/свернуть<br/>
            Клавиша L - скрыть легенду
          </div>
        </div>
      )}
      
      {/* Выбранный узел - детали */}
      {selectedNode && (
        <div className="absolute top-20 right-4 w-64 bg-black/50 backdrop-blur-md rounded-xl p-4 text-white z-50">
          <h3 className="font-bold text-lg mb-2">Детали</h3>
          <p className="text-sm text-white/80">
            Выбран узел: {selectedNode}
          </p>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm transition-all"
          >
            Закрыть (Esc)
          </button>
        </div>
      )}
      
      {/* Инструкция */}
      <div className="absolute bottom-4 right-4 text-white/40 text-xs text-right">
        <p>Кликните по центральному узлу</p>
        <p>для анимации появления ветвей</p>
      </div>
    </div>
  );
}

export default App;
