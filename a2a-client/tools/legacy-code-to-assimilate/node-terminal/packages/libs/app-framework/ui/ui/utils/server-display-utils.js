/**
 * Server Display Utils
 * Utility functions for displaying server-related information
 */

// Get CSS class for app type
export const getAppTypeClass = (type) => {
  const typeClasses = {
    'backend': 'app-type-backend',
    'frontend': 'app-type-frontend',
    'mobile': 'app-type-mobile',
    'database': 'app-type-database',
    'api': 'app-type-api'
  };
  return typeClasses[type] || 'app-type-default';
};

// Get status icon for server/app status
export const getAppStatusIcon = (status) => {
  const statusIcons = {
    'running': 'pi pi-play-circle',
    'stopped': 'pi pi-stop-circle',
    'error': 'pi pi-exclamation-triangle',
    'warning': 'pi pi-exclamation-circle',
    'loading': 'pi pi-spin pi-spinner'
  };
  return statusIcons[status] || 'pi pi-question-circle';
};

// Get status color for server/app status
export const getAppStatusColor = (status) => {
  const statusColors = {
    'running': '#51cf66',
    'stopped': '#868e96',
    'error': '#ff6b6b',
    'warning': '#ffd54f',
    'loading': '#4ecdc4'
  };
  return statusColors[status] || '#868e96';
};

// Get status text for server/app status
export const getAppStatusText = (status) => {
  const statusTexts = {
    'running': 'Выполняется',
    'stopped': 'Остановлен',
    'error': 'Ошибка',
    'warning': 'Предупреждение',
    'loading': 'Загрузка'
  };
  return statusTexts[status] || status;
};

// Format uptime duration
export const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  if (minutes > 0) {
    return `${minutes}м ${secs}с`;
  }
  return `${secs}с`;
};

// Format bytes to human readable format
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Б';

  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Server-specific functions (aliases for compatibility)
export const getStatusIcon = getAppStatusIcon;
export const getStatusColor = getAppStatusColor;
export const getStatusText = getAppStatusText;

// Platform-specific functions
export const getPlatformIcon = (platform) => {
  const platformIcons = {
    'windows': 'pi pi-microsoft',
    'linux': 'pi pi-linux',
    'macos': 'pi pi-apple',
    'ubuntu': 'pi pi-linux',
    'centos': 'pi pi-linux',
    'debian': 'pi pi-linux'
  };
  return platformIcons[platform] || 'pi pi-server';
};

export const getPlatformColor = (platform) => {
  const platformColors = {
    'windows': '#0078d4',
    'linux': '#fcc624',
    'macos': '#000000',
    'ubuntu': '#e95420',
    'centos': '#262577',
    'debian': '#a81d3a'
  };
  return platformColors[platform] || '#868e96';
};

export const getPlatformText = (platform) => {
  const platformTexts = {
    'windows': 'Windows',
    'linux': 'Linux',
    'macos': 'macOS',
    'ubuntu': 'Ubuntu',
    'centos': 'CentOS',
    'debian': 'Debian'
  };
  return platformTexts[platform] || platform;
};

// Type-specific functions
export const getTypeText = (type) => {
  const typeTexts = {
    'web': 'Веб-сервер',
    'api': 'API сервер',
    'database': 'База данных',
    'cache': 'Кэш',
    'proxy': 'Прокси',
    'monitoring': 'Мониторинг'
  };
  return typeTexts[type] || type;
};

export const getTypeChipClass = (type) => {
  const typeClasses = {
    'web': 'type-chip-web',
    'api': 'type-chip-api',
    'database': 'type-chip-database',
    'cache': 'type-chip-cache',
    'proxy': 'type-chip-proxy',
    'monitoring': 'type-chip-monitoring'
  };
  return typeClasses[type] || 'type-chip-default';
};

// App status class function
export const getAppStatusClass = (status) => {
  const statusClasses = {
    'running': 'status-running',
    'stopped': 'status-stopped',
    'error': 'status-error',
    'warning': 'status-warning',
    'loading': 'status-loading'
  };
  return statusClasses[status] || 'status-unknown';
};