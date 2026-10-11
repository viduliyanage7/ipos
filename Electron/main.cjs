const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let backendProcess;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    icon: path.join(__dirname, "..", "public", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "dist/index.html"));

  mainWindow.on("closed", () => {
    stopBackend();
    app.quit();
  });
}

/* ---------- Printing ---------- */

ipcMain.handle("get-printers", async (event) => {
  const printers = await event.sender.getPrintersAsync();
  return printers.map((p) => ({
    name: p.name,
    displayName: p.displayName,
    isDefault: p.isDefault,
  }));
});

ipcMain.handle("print-receipt", async (_event, { html }) => {
  const win = new BrowserWindow({
    show: false,
    parent: mainWindow, // keeps the print dialog in front of the app
    webPreferences: { sandbox: true },
  });

  try {
    await win.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );

    return await new Promise((resolve) => {
      win.webContents.print(
        {
          silent: false, // show the Windows print dialog
          printBackground: false,
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          if (success) {
            resolve({ success: true });
          } else if (/cancel/i.test(failureReason || "")) {
            resolve({ success: false, cancelled: true });
          } else {
            resolve({ success: false, error: failureReason });
          }
        },
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (!win.isDestroyed()) win.close();
  }
});

/* ---------- Backend ---------- */

function startBackend() {
  const isDev = !app.isPackaged;
  const backendPath = isDev
    ? path.join(__dirname, "../Backend/index.js")
    : path.join(process.resourcesPath, "../Backend/index.js");

  backendProcess = spawn(process.execPath, [backendPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
  });

  backendProcess.stdout.on("data", (d) => console.log(`Backend: ${d}`));
  backendProcess.stderr.on("data", (d) => console.error(`Backend Error: ${d}`));
  backendProcess.on("close", (code) => console.log(`Backend exited: ${code}`));
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

app.whenReady().then(() => {
  createWindow();
  startBackend();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
