const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: (html) => ipcRenderer.invoke("print-receipt", { html }),
});
