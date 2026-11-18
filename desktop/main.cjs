const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const localPage = path.join(__dirname, '..', 'app', 'index.html');
const clubPort = 4387;
let club, starting;
function clubStatus() {
  const addresses = Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).map(n => `http://${n.address}:${clubPort}`);
  return { running: !!club?.listening, addresses: [...new Set(addresses)], local: `http://127.0.0.1:${clubPort}` };
}

async function startClub() {
  if (club?.listening) return clubStatus();
  if (starting) return starting;
  starting = (async () => {
    const { makeService } = await import('../server/service.mjs');
    const service = makeService({ database: path.join(app.getPath('userData'), 'club', 'svoie.sqlite') });
    await new Promise((resolve, reject) => {
      service.once('error', reject);
      service.listen(clubPort, '0.0.0.0', () => { service.removeListener('error', reject); resolve(); });
    });
    club = service;
    return clubStatus();
  })();
  try { return await starting; } finally { starting = null; }
}

function registerClub() {
  const handlers = {
    status: clubStatus, start: startClub,
    stop: async () => {
      if (club?.listening) await new Promise(resolve => { club.close(resolve); club.closeAllConnections(); });
      club = null; return clubStatus();
    },
    queue: () => club?.listening ? club.moderation.list() : [],
    review: (id, approved) => club?.listening && typeof id === 'string' && typeof approved === 'boolean' && club.moderation.decide(id, approved),
  };
  for (const [name, action] of Object.entries(handlers)) ipcMain.handle(`club:${name}`, (event, ...args) => {
    const page = new URL(event.senderFrame.url); page.hash = '';
    if (page.href !== pathToFileURL(localPage).href || event.senderFrame.parent) throw Error('Local app only');
    return action(...args);
  });
}
app.on('will-quit', () => { if (club?.listening) { club.close(); club.closeAllConnections(); } });

app.setName('Поважайте своє');
if (process.platform === 'win32') app.setAppUserModelId('ua.povazhaite.svoie');

function openExternal(url) {
  try {
    const target = new URL(url);
    if (target.protocol === 'https:' && !target.username && !target.password) {
      void shell.openExternal(target.href).catch(console.error);
    }
  } catch { /* Only valid external HTTPS links are opened. */ }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1350, height: 920, minWidth: 370, minHeight: 560,
    backgroundColor: '#13121a', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    openExternal(url);
  });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.loadFile(localPage);
  return window;
}

if (require.main === module) {
  app.whenReady().then(() => {
    registerClub();
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

module.exports = { createWindow, registerClub };
