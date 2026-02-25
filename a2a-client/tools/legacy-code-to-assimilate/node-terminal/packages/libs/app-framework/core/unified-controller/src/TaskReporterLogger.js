/**
 * Дебаг функция с меткой [critical] для TaskReporter
 */
const debugCritical = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[critical] ${timestamp} - TaskReporter: ${message}`;
  
  if (data) {
    console.error(logMessage, data);
  } else {
    console.error(logMessage);
  }
};

export { debugCritical };
