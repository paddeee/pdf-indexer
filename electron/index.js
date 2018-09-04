const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { injectCapacitor } = require('@capacitor/electron');
const fs = require ('fs');
const path = require ('path');
const pdfjsLib = require('pdfjs-dist');

// Place holders for our windows so they don't get garbage collected.
let mainWindow = null;
let quitWindow = null;

let quitting = false;
let windowsClosedByQuit  = false;

// Placeholder for splashWindow ref
let splashWindow = null;

// Directory tree structure
let directoryTree;

async function createWindow () {
  // Define our main window size
  mainWindow = new BrowserWindow({
    height: 768,
    width: 1024,
    show: false,
  });

  // Create and show Splash Screen
  splashWindow = new BrowserWindow({
    backgroundColor: '#47545f',
    width: 800,
    height: 600,
    frame: false,
    transparent: true
  });

  mainWindow.loadURL(await injectCapacitor(`file://${__dirname}/app/index.html`), {baseURLForDataURL: `file://${__dirname}/app/`});

  splashWindow.loadURL(`file://${__dirname}/splash_assets/splash.html`);
  splashWindow.show();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some Electron APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  mainWindow = null;

  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (!windowsClosedByQuit) {
    app.quit();
  }
});

// When app is attempting to quit, hijack quit event, show quit window and quit after 8 seconds
app.on('before-quit', function(event) {

  if (!quitting) {

    event.preventDefault();

    // Create Quit Screen
    quitWindow = new BrowserWindow({
      backgroundColor: '#fff',
      width: 800,
      height: 600,
      frame: false,
      transparent: true,
      show: false
    });

    quitWindow.loadURL(`file://${__dirname}/quit_assets/quit-window.html`);

    if (mainWindow) {
      windowsClosedByQuit = true;
      mainWindow.destroy();
      mainWindow = null;
    }

    quitWindow.show();

    setTimeout(function() {
      quitting = true;
      quitWindow.destroy();
      quitWindow = null;
      app.quit();
    }, 8000);
  }
});

// Define any IPC or other custom functionality below here

// Read the PDF file into a typed array so PDF.js can load it.
function getPDFScreenShotTypedArray(pdfURL) {
    return new Uint8Array(fs.readFileSync(pdfURL));
}

function directoryTreeToObj(dir, done) {
  const results = [];

  fs.readdir(dir, (err, list) => {
    if (err)
      return done(err);

    let pending = list.length;

    if (!pending)
      return done(null, {
        text: path.basename(dir),
        type: 'directory',
        items: results,
        path: dir
      });

    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          directoryTreeToObj(file, (err, res) => {
            results.push({
              name: path.basename(file),
              type: 'directory',
              items: res,
              path: file
            });
            if (!--pending)
              done(null, results);
          });
        }
        else {
          if (path.extname(file).toLowerCase() === '.pdf') {

            results.push({
              type: 'file',
              name: path.basename(file),
              items: [],
              path: file
            });
          }
          if (!--pending)
            done(null, results);
        }
      });
    });
  });
}

const rootDirectory = path.join(app.getPath('documents'), '/OpCircus');

directoryTreeToObj(rootDirectory, function(err, res){
  if (err) {
    console.error(err);
  }
  directoryTree = res;
});

// When app is loaded, swap splashwindow for controller window.
ipcMain.on('app-ready', function() {
  splashWindow.destroy();
  splashWindow = null;
  mainWindow.webContents.openDevTools();
  mainWindow.show();
});

ipcMain.on('renderer-ready', function() {

  if (!directoryTree) {
    dialog.showMessageBox({
      type: 'error',
      buttons: ['Close Application'],
      message: `Please ensure the directory exists at this location "${path.join(app.getPath('documents'), '/OpCircus')}" and then restart Application.`
    }, response => {
      if (response === 0) {
        app.quit();
      }
    });
  } else {
    mainWindow.webContents.send('directory-tree-created', directoryTree);
  }
});

ipcMain.on('open-file', function(event, path) {
  shell.openItem(path);
});

ipcMain.on('get-preview', function(event, path) {
  const pdfTypedArray = getPDFScreenShotTypedArray(path);
  mainWindow.webContents.send('preview-generated', pdfTypedArray);
});


