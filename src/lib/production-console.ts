/**
 * PRODUCTION CONSOLE LOGGER
 * 
 * Automatically removes all console statements in production builds
 */

const isDevelopment = import.meta.env.DEV;

export const console = {
  log: isDevelopment ? window.console.log.bind(window.console) : () => {},
  error: isDevelopment ? window.console.error.bind(window.console) : () => {},
  warn: isDevelopment ? window.console.warn.bind(window.console) : () => {},
  info: isDevelopment ? window.console.info.bind(window.console) : () => {},
  debug: isDevelopment ? window.console.debug.bind(window.console) : () => {},
  trace: isDevelopment ? window.console.trace.bind(window.console) : () => {},
  group: isDevelopment ? window.console.group.bind(window.console) : () => {},
  groupEnd: isDevelopment ? window.console.groupEnd.bind(window.console) : () => {},
  table: isDevelopment ? window.console.table.bind(window.console) : () => {},
  time: isDevelopment ? window.console.time.bind(window.console) : () => {},
  timeEnd: isDevelopment ? window.console.timeEnd.bind(window.console) : () => {},
};

// Re-export for easy import
export default console;