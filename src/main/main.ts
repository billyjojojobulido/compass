/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  BrowserWindowConstructorOptions,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import i18nInit from '../renderer/services/i18nInit';
import windowStateKeeper from 'electron-window-state';
import fs from 'fs/promises';
import { LegacyWeekItem } from '@/domain/legacy/api';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

/* legacy weekly log related */

const LEGACY_DIR = path.join(app.getPath('userData'), 'legacy-weekly');

/* so users won't have to create dir themselves */
async function ensureDir() {
  await fs.mkdir(LEGACY_DIR, { recursive: true });
}

function parseMetaFromTitle(title: string): {
  weekNo?: number;
  weekStart?: string;
} {
  // title example: "Week 72 (2026-01-19)"
  const m = /^Week\s+(\d+)\s+\((\d{4}-\d{2}-\d{2})\)/.exec(title.trim());
  if (!m) return {};
  return { weekNo: Number(m[1]), weekStart: m[2] };
}

ipcMain.handle('list-legacy-weekly', async (): Promise<LegacyWeekItem[]> => {
  await ensureDir();
  const names = await fs.readdir(LEGACY_DIR);

  const items: LegacyWeekItem[] = [];
  for (const fileName of names) {
    // can only recognize .md/txt
    if (!/\.(md|txt)$/i.test(fileName)) continue;

    const full = path.join(LEGACY_DIR, fileName);
    const content = await fs.readFile(full, 'utf-8');

    const firstLine = content.split(/\r?\n/)[0]?.trim() ?? '';
    const title = firstLine || fileName.replace(/\.(md|txt)$/i, '');
    const meta = parseMetaFromTitle(title);

    items.push({ fileName, title, ...meta });
  }

  // sorting: weekNo desc (last in, first out)
  items.sort((a, b) => (b.weekNo ?? -1) - (a.weekNo ?? -1));
  return items;
});

ipcMain.handle(
  'read-legacy-weekly',
  async (
    _e,
    fileName: string,
  ): Promise<{ fileName: string; content: string }> => {
    await ensureDir();
    const safeName = path.basename(fileName); // just in case ../
    const full = path.join(LEGACY_DIR, safeName);
    const content = await fs.readFile(full, 'utf-8');
    return { fileName: safeName, content };
  },
);

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

//#region APP CONSTANTS
const DEFAULT_APP_SIZE = {
  defaultWidth: 1280,
  defaultHeight: 800,
};

const browserWindowOptions: BrowserWindowConstructorOptions = {
  show: false,
  center: true,
  autoHideMenuBar: true,
  titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
  webPreferences: {
    spellcheck: true,
    preload:
      app.isPackaged || !isDebug
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
  },
};

const SUPPORTED_EXTS = new Set(['.md', '.mmd', '.txt', '.html', '.glb']);
//#endregion

// -- MAIN WINDOW CREATOR --
const createWindow = async (i18n: any) => {
  if (isDebug) {
    await installExtensions();
  }

  const mainWindowState = windowStateKeeper(DEFAULT_APP_SIZE);

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

//#region DEFINE EVENT CALLBACK
function showApp() {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win, i) => {
    if (win && i < 1) {
      if (win.isMinimized()) win.restore();
      else win.show();
    }
  });
}

function reloadApp() {
  BrowserWindow.getFocusedWindow()?.loadURL(resolveHtmlPath('index.html'));
}

function createNewWindowInstance(url?: string) {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(appI18N);
    return;
  }
  const mainWindowState = windowStateKeeper(DEFAULT_APP_SIZE);
  const newWindowInstance = new BrowserWindow({
    ...browserWindowOptions,
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: mainWindowState.x,
    y: mainWindowState.y,
    show: true,
    center: true,
  });
  if (mainWindow) {
    // @ts-ignore
    mainWindow.fileChanged = false;
    // @ts-ignore
    mainWindow.descriptionChanged = false;
  }
  newWindowInstance.setMenuBarVisibility(false);
  if (url) newWindowInstance.loadURL(url);
  else newWindowInstance.loadURL(resolveHtmlPath('index.html'));
}
//#endregion

//#region --- Add Electron App Events Listeners ---

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.on('open-file', (event, filePath) => {
  event.preventDefault(); // important — prevents default macOS behavior
  const startupFilePath = filePath;
  if (app.isReady()) {
    const startupParameter = '?cmdopen=' + encodeURIComponent(startupFilePath);
    const url = resolveHtmlPath('index.html') + startupParameter;
    createNewWindowInstance(url);
  } else {
  }
});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', (event, hasVisibleWindows) => {
  const windows = BrowserWindow.getAllWindows();
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.length === 0) {
    createWindow(appI18N);
  } else {
    showApp();
  }
  event.preventDefault();
});

if (!isDebug) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    // Windows and Linux solution for opening files
    app.on('second-instance', (event, argv) => {
      const fileArg = argv.find((arg) =>
        SUPPORTED_EXTS.has(path.extname(arg).toLowerCase()),
      );
      const startupParameter = '?cmdopen=' + encodeURIComponent(fileArg);
      const url = resolveHtmlPath('index.html') + startupParameter;
      createNewWindowInstance(url);
    });
  }
}

//#endregion

// START APP

let appI18N: any;

app
  .whenReady()
  .then(() => {
    return i18nInit().then((i18n) => {
      appI18N = i18n;

      createWindow(i18n);

      i18n.on('languageChanged', (lng) => {
        try {
          console.log('[Localisation] LanguageChanged: ' + lng);
          // TODO how to change languages
        } catch (ex) {
          console.log('[Localisation] LanguageChanged - Error:', ex);
        }
      });

      //#region --- IPC Main Handlers ---
      ipcMain.on('show-main-window', showApp);
      ipcMain.on('relaunch-app', reloadApp);

      //#endregion

      //#region --- Process Event Handler
      process.removeAllListeners('uncaughtException');
      process.on('uncaughtException', (error) => {
        console.error(
          'UNCAUGHT EXCEPTION in main:',
          error && error.stack ? error.stack : error,
        );
        const msg = error && error.message ? error.message : '';
        //@ts-ignore
        const code = error && error.code ? error.code : '';
        const isAbort = error && error.name === 'AbortError';
        const isSocketHangUp =
          msg.includes('socket hang up') ||
          code === 'ECONNRESET' ||
          code === 'ECONNABORTED';

        if (isAbort || isSocketHangUp) {
          console.warn(
            'Known non-fatal error (ignored):',
            msg || code || error,
          );
          return;
        }
        try {
          reloadApp();
        } catch (reloadErr) {
          console.error(
            'reloadApp() failed, exiting process:',
            reloadErr && reloadErr.stack ? reloadErr.stack : reloadErr,
          );
          process.exit(1);
        }
      });
      //#endregion
    });
  })
  .catch(console.log);
