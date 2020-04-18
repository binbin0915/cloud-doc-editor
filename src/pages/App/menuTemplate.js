const {app, shell, ipcMain, webContents} = require('electron');
const Store = require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});
const aliConfigArray = [
    'regionId',
    'accessKey',
    'secretKey',
    'bucketName'
];
const isAliConfig = aliConfigArray.every(key => !!settingsStore.get(key));
const enableAutoSync = settingsStore.get('enableAutoSync');
let template = [
    {
        label: '文件',
        submenu: [
            {
                label: '新建',
                accelerator: 'CmdOrCtrl+N',
                click: (menuItem, browserWindow, event) => {
                    browserWindow.webContents.send('create-new-file')
                }
            },
            {
                label: '保存',
                accelerator: 'CmdOrCtrl+S',
                click: (menuItem, browserWindow, event) => {
                    browserWindow.webContents.send('save-edit-file')
                }
            },
            {
                label: '搜索',
                accelerator: 'CmdOrCtrl+F',
                click: (menuItem, browserWindow, event) => {
                    browserWindow.webContents.send('search-file')
                }
            },
            {
                label: '导入',
                accelerator: 'CmdOrCtrl+O',
                click: (menuItem, browserWindow, event) => {
                    browserWindow.webContents.send('import-file')
                }
            }
        ]
    },
    {
        label: '云同步',
        submenu: [
            {
                label: '自动同步',
                type: 'checkbox',
                enabled: isAliConfig,
                checked: enableAutoSync,
                click: () => {
                    const enableAutoSync = settingsStore.get('enableAutoSync');
                    settingsStore.set('enableAutoSync', !enableAutoSync);
                }
            },
            {
                label: '全部同步到云端',
                enabled: isAliConfig,
                click: () => {
                    ipcMain.emit('upload-all-to-aliyun')
                }
            },
            {
                label: '从云端下载到本地',
                enabled: isAliConfig,
                click: () => {
                    ipcMain.emit('download-all-to-aliyun')
                }
            },
            {
                label: '搜索云端文件',
                enabled: isAliConfig,
                click: () => {
                    ipcMain.emit('open-search-aliyun')
                }
            },
        ]
    },
    {
        label: '视图',
        submenu: [
            {
                label: '刷新当前页面',
                accelerator: 'CmdOrCtrl+R',
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.reload();
                    }
                }
            },
            {
                label: '切换全屏幕',
                accelerator: (() => {
                    if (process.platform === 'darwin') {
                        return 'Ctrl+Command+F';
                    } else {
                        return 'F11';
                    }
                })(),
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                    }
                }
            },
            {
                label: '切换开发者工具',
                accelerator: (function () {
                    if (process.platform === 'darwin') {
                        return 'Alt+Command+I';
                    } else {
                        return 'Ctrl+Shift+I';
                    }
                })(),
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.toggleDevTools();
                    }
                }
            },
        ]
    },
    {
        label: '用户',
        submenu: [
            {
                label: '登录',
                click: () => {
                    ipcMain.emit('open-user-window', 'login');
                }
            },
            {
                label: '注册',
                click: () => {
                    ipcMain.emit('open-user-window', 'register');
                }
            },
            {
                label: '修改密码',
                click: () => {
                    ipcMain.emit('open-user-window', 'editPwd');
                }
            },
            {
                label: '注销',
                click: () => {
                    ipcMain.emit('open-user-window', 'logout');
                }
            },
        ]
    },
    {
        label: '窗口',
        role: 'window',
        submenu: [
            {
                label: '最小化',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            },
            {
                label: '关闭',
                accelerator: 'CmdOrCtrl+W',
                role: 'close'
            }
        ]
    },
    {
        label: '帮助',
        role: 'help',
        submenu: [
            {
                label: '学习更多',
                click: () => {
                    shell.openExternal('http://electron.atom.io')
                }
            },
        ]
    },
];

if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
        label: name,
        submenu: [
            {
                label: `关于 ${name}`,
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                label: '设置',
                accelerator: 'Command+,',
                click: () => {
                    ipcMain.emit('open-settings-window');
                }
            },
            {
                label: '服务',
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: `隐藏 ${name}`,
                accelerator: 'Command+H',
                role: 'hide'
            },
            {
                label: '隐藏其它',
                accelerator: 'Command+Alt+H',
                role: 'hideothers'
            },
            {
                label: '显示全部',
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                label: '退出',
                accelerator: 'Command+Q',
                click: () => {
                    app.quit()
                }
            }
        ]
    })
} else {
    template[0].submenu.push({
        label: '设置',
        accelerator: 'Ctrl+,',
        click: () => {
            ipcMain.emit('open-settings-window');
        }
    })
}

module.exports = template;
