const {app,BrowserWindow} = require('electron')

const createWindow = () =>{
    const win = new BrowserWindow({
        width:600,
        height:200
    })
}

app.whenReady().then(()=>{
    createWindow();
})