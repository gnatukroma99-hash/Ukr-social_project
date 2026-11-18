const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

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
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
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
  window.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  return window;
}

if (require.main === module) {
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

module.exports = { createWindow };
