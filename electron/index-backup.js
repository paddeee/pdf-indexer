const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { injectCapacitor } = require('@capacitor/electron');
const fs = require ('fs');
const path = require ('path');
const Canvas = require('canvas');
const assert = require('assert');
const pdfjsLib = require('./pdf.js');
// const pdfjsLib = require('pdfjs-dist'); Can use generic build once it has been updated to August 2018 version

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

function NodeCanvasFactory() {}
NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width, height) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    const canvas = new Canvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas: canvas,
      context: context,
    };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

function getPDFScreenShotBlob(pdfURL) {

  return new Promise(function (resolve, reject) {

    // Read the PDF file into a typed array so PDF.js can load it.
    const rawData = new Uint8Array(fs.readFileSync(pdfURL));

    // Load the PDF file.
    pdfjsLib.getDocument({
      data: rawData,
      nativeImageDecoderSupport: 'none',
      disableFontFace: true,
      ignoreErrors: true
    }).then(function (pdfDocument) {
      console.log('# PDF document loaded.');

      // Get the first page.
      pdfDocument.getPage(1).then(function (page) {
        // Render the page on a Node canvas with 100% scale.
        const viewport = page.getViewport(300 / page.getViewport(1.0).width);
        const canvasFactory = new NodeCanvasFactory();
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
        const renderContext = {
          canvasContext: canvasAndContext.context,
          viewport: viewport,
          canvasFactory: canvasFactory
        };

        page.render(renderContext).then(function () {
          canvasAndContext.canvas.toDataURL('image/png', (err, png) => {
            if (err) {
              reject(err);
            } else {
              resolve(png);
            }
          });
        }).catch(function (reason) {
          console.log(`Render Error ${reason}`);
          reject(reason);
        });
      }).catch(function (reason) {
        console.log(`Get Page Error ${reason}`);
        reject(reason);
      });
    }).catch(function (reason) {
      console.log(`Get Document Error ${reason}`);
      reject(reason);
    });
  });
}

function directoryTreeToObj(dir, done) {
  const results = [];

  fs.readdir(dir, function(err, list) {
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

    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          directoryTreeToObj(file, function(err, res) {
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
  //mainWindow.webContents.openDevTools();
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
  getPDFScreenShotBlob(path).then((png) => {
    mainWindow.webContents.send('preview-generated', png);
  }).catch((error) => {
    //console.log(error);
  });
});


