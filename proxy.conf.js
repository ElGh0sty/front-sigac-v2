const net = require('net');

let isBackendRunning = null;
let lastCheckTime = 0;

function checkBackend(host, port) {
  const now = Date.now();
  if (isBackendRunning !== null && now - lastCheckTime < 10000) {
    return Promise.resolve(isBackendRunning);
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.on('connect', () => {
      isBackendRunning = true;
      lastCheckTime = Date.now();
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      isBackendRunning = false;
      lastCheckTime = Date.now();
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      isBackendRunning = false;
      lastCheckTime = Date.now();
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

const PROXY_CONFIG = {
  '/api': {
    target: 'http://127.0.0.1:5001',
    secure: false,
    bypass: async (req, res) => {
      const isUp = await checkBackend('127.0.0.1', 5001);
      if (!isUp) {
        // Backend no está en ejecución en 127.0.0.1:5001.
        // Respondemos 503 limpio en formato JSON para que los servicios de Angular
        // ejecuten su fallback local sin emitir errores de conexión ECONNREFUSED.
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 503,
          message: 'Backend local no disponible en 127.0.0.1:5001. Modo local activo.',
          offline: true
        }));
        return false;
      }
      return null;
    }
  }
};

module.exports = PROXY_CONFIG;
