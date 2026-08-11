/**
 * AgriFlow Cross-Platform Desktop App Launcher
 * Launches AgriFlow natively as a Desktop Software on Windows & macOS 
 * with direct hardware Bluetooth & Serial port privileges.
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'AgriFlow Native Smart Agriculture Platform',
    icon: path.join(__dirname, '../apps/frontend/public/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableBlinkFeatures: 'WebBluetooth, WebUSB, Serial',
    },
    autoHideMenuBar: true,
    backgroundColor: '#090d16',
  });

  // Grant Bluetooth & Serial hardware permissions automatically
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'bluetooth' || permission === 'serial') {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return true;
  });

  const appUrl = process.env.AGRIFLOW_URL || 'https://agriculture-automation.vercel.app';
  console.log(`🚀 Launching AgriFlow Native Desktop App -> ${appUrl}`);
  mainWindow.loadURL(appUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
