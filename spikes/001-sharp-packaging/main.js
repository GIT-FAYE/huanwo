const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const resultFile = path.join(os.tmpdir(), 'huanwo-spike-result.txt');
const results = [];

function log(msg) {
  results.push(msg);
  console.log(msg);
}

app.whenReady().then(async () => {
  // ====== Spike #1: sharp ======
  try {
    const sharp = require('sharp');
    const buf = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#f00' } }).jpeg().toBuffer();
    log('[PASS] #1 sharp: ok, buf=' + buf.length);
  } catch (e) { log('[FAIL] #1 sharp: ' + e.message); }

  // ====== Spike #2: globalShortcut ======
  try {
    const ok = globalShortcut.register('Alt+Space', () => {
      log('[INFO] Alt+Space pressed');
    });
    log(ok ? '[PASS] #2 globalShortcut: Alt+Space registered' : '[WARN] #2 globalShortcut: conflict (key taken)');
  } catch (e) { log('[FAIL] #2 globalShortcut: ' + e.message); }

  // ====== Spike #3: Tray ======
  try {
    // Create simple 1x1 ico in memory as fallback
    const tray = new Tray(path.join(__dirname, 'tray.ico'));
    tray.setToolTip('HuanWo Spike');
    const menu = Menu.buildFromTemplate([
      { label: 'Open', click: () => log('[INFO] tray menu: Open') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(menu);
    log('[PASS] #3 Tray: created');
  } catch (e) { log('[WARN] #3 Tray: ' + e.message + ' (may need .ico file)'); }

  // ====== Spike #4: nativeTheme ======
  try {
    const isDark = nativeTheme.shouldUseDarkColors;
    log('[PASS] #4 nativeTheme: detected, dark=' + isDark);
  } catch (e) { log('[FAIL] #4 nativeTheme: ' + e.message); }

  // Write results
  fs.writeFileSync(resultFile, results.join('\n'));
  
  // Show window briefly then quit
  const win = new BrowserWindow({ width: 500, height: 300 });
  win.loadURL('data:text/html,<pre>' + results.join('<br>') + '</pre>');
  
  setTimeout(() => { app.quit(); }, 3000);
});

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
