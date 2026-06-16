let logQueue = [];
let isSending = false;

const sendLogs = async () => {
  if (isSending || logQueue.length === 0) return;
  isSending = true;
  const logsToSend = [...logQueue];
  logQueue = [];
  
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: logsToSend })
    });
  } catch (e) {
    // If it fails, put them back at the beginning of the queue
    logQueue = [...logsToSend, ...logQueue];
  } finally {
    isSending = false;
    if (logQueue.length > 0) {
      setTimeout(sendLogs, 2000); // Retry later
    }
  }
};

const queueLog = (level, args) => {
  const message = args.map(a => {
    if (a instanceof Error) return a.stack || a.toString();
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch (e) { return '[Object]'; }
    }
    return String(a);
  }).join(' ');

  logQueue.push({
    level,
    message,
    timestamp: new Date().toISOString()
  });

  if (logQueue.length >= 5) {
    sendLogs();
  } else {
    setTimeout(sendLogs, 1000);
  }
};

export const initLogger = () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    queueLog('INFO', args);
    originalLog(...args);
  };

  console.warn = (...args) => {
    queueLog('WARN', args);
    originalWarn(...args);
  };

  console.error = (...args) => {
    queueLog('ERROR', args);
    originalError(...args);
  };
  
  window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
  });
  
  console.log("Global logger initialized");
};
