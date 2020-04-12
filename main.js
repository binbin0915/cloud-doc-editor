/**
 * 入口文件，主进程
 * @author ainuo5213
 * @date 2020-02-14
 */
const {app, Menu, ipcMain, dialog} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
// const oss = require('ali-oss');
// const isOnline = require('is-online');
const AppWindow = require('./AppWindow');
const template = require('./menuTemplate');
// const {AliOSS} = require('./src/utils/aliOssManager');
const iconv = require('iconv-lite');
const dotenv = require('dotenv');
dotenv.config('./env');
const regionId = process.env.AREA;
const accessKey = process.env.AK;
const secretKey = process.env.SK;
const bucketName = process.env.BUCKET;
// const createAliOss = () => {
//     const region = settingStore.get('regionId');
//     const access = settingStore.get('accessKey');
//     const secret = settingStore.get('secretKey');
//     const bucket = settingStore.get('bucketName');
//     return new AliOSS({
//         region: region,
//         accessKeyId: access,
//         accessKeySecret: secret,
//         bucket: bucket
//     })
// };

// const createStaticAliOss = () => {
//     const region = settingStore.get('regionId');
//     const access = settingStore.get('accessKey');
//     const secret = settingStore.get('secretKey');
//     const bucket = settingStore.get('bucketName');
//     return oss({
//         region: region,
//         accessKeyId: access,
//         accessKeySecret: secret,
//         bucket: bucket
//     })
// };

const Store = require('electron-store');
const settingStore = new Store({
    name: 'Settings'
});

const __generateFileName = () => {
    let curDate = new Date();
    let year = curDate.getFullYear();
    let month = curDate.getMonth() + 1;
    let day = curDate.getDate();
    let hour = curDate.getHours();
    let minutes = curDate.getMinutes();
    let seconds = curDate.getSeconds();
    return year + ("0" + month).slice(-2) + ("0" + day).slice(-2) + ("0" + hour).slice(-2) + ("0" + minutes).slice(-2) + ("0" + seconds).slice(-2)
};

const copyFile = imgPath => {
    const ext = path.extname(imgPath);
    const fileName = __generateFileName();
    const filePath = path.join(__dirname, './src/static', fileName + ext);
    const file = fs.createReadStream(imgPath);
    const out = fs.createWriteStream(filePath);
    file.pipe(out);
    return fileName + ext
};

const fileStore = new Store({
    name: 'File Data'
});

let mainWindow, settingsWindow, userWindow;

settingStore.set('upload-dir', path.resolve(__dirname, './src/static'));


app.on('ready', () => {
    // APP运行起来之后将alioss设置到setting store
    settingStore.set('regionId', regionId);
    settingStore.set('accessKey', accessKey);
    settingStore.set('secretKey', secretKey);
    settingStore.set('bucketName', bucketName);

    const mainWindowConfig = {
        width: 1366,
        height: 768,
    };
    // 判断生成环境还是线上环境
    const urlLocation = isDev ? 'http://localhost:3000/App.html' : `file://${path.join(__dirname, './dist/App.html')}`;
    mainWindow = new AppWindow(mainWindowConfig, urlLocation);
    mainWindow.maximize();

    // 垃圾回收
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (settingsWindow) {
            settingsWindow = null;
        }
        if (userWindow) {
            userWindow = null;
        }
    });

    // 绑定事件
    ipcMain.on('open-settings-window', () => {
        const settingsWindowConfig = {
            width: 560,
            height: 480,
            parent: mainWindow,
            autoHideMenuBar: true,
            frame: false
        };
        const settingsFileLocation = isDev ? 'http://localhost:3000/Settings.html' : 'file://' + path.join(__dirname, './dist/Settings.html');
        settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation);
        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
    });

    ipcMain.on('open-user-window', message => {
        const userWindowConfig = {
            width: 640,
            height: 640,
            parent: mainWindow,
            // autoHideMenuBar: true,
            // frame: false
        };
        const userFileLocation = isDev ? 'http://localhost:3000/User.html' : 'file://' + path.join(__dirname, './dist/User.html');
        userWindow = new AppWindow(userWindowConfig, userFileLocation);
        userWindow.on('show', async () => {
            userWindow.webContents.send('display-route', {route: message});
        });
        userWindow.on('closed', () => {
            userWindow = null;
        });
    });

    ipcMain.on('upload-img', (e, filePath) => {
        filePath = iconv.decode(filePath, 'utf-8');
        let fileName = copyFile(filePath);
        mainWindow.webContents.send('uploaded-img', fileName)
    });

    // 设置菜单
    let menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    ipcMain.on('open-search-aliyun', event => {
        const fileWindowConfig = {
            width: 640,
            height: 640,
            parent: mainWindow,
            // autoHideMenuBar: true,
            // frame: false
        };
        const fileFileLocation = isDev ? 'http://localhost:3000/Search.html' : 'file://' + path.join(__dirname, './dist/Search.html');

        settingsWindow = new AppWindow(fileWindowConfig, fileFileLocation);
        // let aliFiles = [];
        // settingsWindow.on('show', async () => {
        //     if (await isOnline()) {
        //         if (!aliFiles.length) {
        //             const manager = createAliOss();
        //             const userId = settingStore.get('user').id;
        //             const prefix = `${userId}/`;
        //             // 选择保存位置
        //             const oss = createStaticAliOss();
        //             const list = await oss.list({prefix});
        //             console.log(list.objects);
        //             const files = list.objects || [];
        //             const cloudFiles = [];
        //             for (let i = 0; i < files.length; i++) {
        //                 const file = files[i];
        //                 const key = file.name.slice(file.name.indexOf(':') + 1, -3);
        //                 const title = file.name.slice(prefix.length, file.name.indexOf(':'));
        //                 const lastUpdatedAt = +new Date(file.lastModified);
        //                 cloudFiles.push({
        //                     key,
        //                     title,
        //                     lastUpdatedAt
        //                 })
        //             }
        //             aliFiles = cloudFiles;
        //         }
        //         settingsWindow.send('file-list', {
        //             files: aliFiles.slice(0, 5),
        //             totalFileCount: aliFiles.length,
        //             page: 0,
        //         });
        //     } else {
        //         dialog.showErrorBox('网络异常', '请检查网络连接');
        //         settingsWindow.webContents.send('loading-status', false);
        //     }
        // });
        // 下载文件
        // ipcMain.on('download-file', async (event, data) => {
        //     settingsWindow.webContents.send('loading-status', true);
        //     const manager = createAliOss();
        //     const userId = settingStore.get('user').id;
        //     const {filePath, id, fileName} = data;
        //     manager.isExistObject(`/${userId}/${fileName}:${id}`)
        //         .then(resp => {
        //             // 成功
        //             if (resp.code === 0) {
        //                 const serverUpdatedTime = Math.round(resp.data.lastModified);
        //                 console.log(`${userId}/${fileName}:${id}`, filePath);
        //                 try {
        //                     manager.downloadFile(`${userId}/${fileName}:${id}`, filePath)
        //                         .then(() => {
        //                             mainWindow.webContents.send('file-downloaded', {
        //                                 status: 'download-success',
        //                                 file: {
        //                                     id,
        //                                     filePath,
        //                                     title: fileName,
        //                                     serverUpdatedTime,
        //                                 }
        //                             });
        //                             settingsWindow.webContents.send('loading-status', false);
        //                         })
        //                 } catch (e) {
        //                     settingsWindow.webContents.send('loading-status', false);
        //                 }
        //             } else {
        //                 settingsWindow.webContents.send('loading-status', false);
        //                 // 失败，远端不存在该文件
        //                 mainWindow.webContents.send('file-downloaded', {status: 'no-file', id});
        //             }
        //         })
        // });
        // 默认第二页开始
        // ipcMain.on('change-page', async (event, message) => {
        //     const {page} = message;
        //     const start = (page - 1) * 5; // 5
        //     const end = page * 5; // 10
        //     settingsWindow.send('file-list', {
        //         files: aliFiles.slice(start, end),
        //         totalFileCount: aliFiles.length,
        //         page: page - 1
        //     });
        // });

        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
    });

    ipcMain.on('user-online', event => {
        // 注意windows和mac的index是不一样二点，mac多了一项
        let aliCloudMenu = process.platform === 'darwin' ? menu.items[2] : menu.items[1];
        // 用户登录以后，将云同步功能开启
        [0, 1, 2, 3].forEach(index => {
            aliCloudMenu.submenu.items[index].enabled = true
        });
    });

    ipcMain.on('user-offline', event => {
        // 注意windows和mac的index是不一样二点，mac多了一项
        let aliCloudMenu = process.platform === 'darwin' ? menu.items[2] : menu.items[1];
        // 用户token过期或用户未登录，将其云同步功能关闭
        [0, 1, 2, 3].forEach(index => {
            aliCloudMenu.submenu.items[index].enabled = false
        });
    });

    ipcMain.on('delete-file', async (event, message) => {
        // if (await isOnline()) {
        //     const manager = createAliOss();
        //     const userId = settingStore.get('user').id;
        //     manager.deleteFile(`${userId}/${message.key}`)
        //         .then(data => {
        //             if (data.code === 0) {
        //                 console.log('删除成功')
        //             } else {
        //                 console.log('删除失败')
        //             }
        //         })
        // } else {
        //     dialog.showErrorBox('网络异常', '请检查网络连接')
        // }

    });

    ipcMain.on('upload-file', async (event, message) => {
        // const manager = createAliOss();
        // // message.key和filePath均有值且正确，但是上传文件成功之后文件无数据
        // const userId = settingStore.get('user').id;
        // manager.uploadFile(`${userId}/${message.filename}:${message.key}`, message.filePath)
        //     .then(data => {
        //         if (data.code === 0) {
        //             // 云同步之后向渲染进程发起信号
        //             mainWindow.webContents.send('active-file-uploaded');
        //         } else if (data.code === 1) {
        //             console.log('upload file failed')
        //         } else if (data.code === 2) {
        //             dialog.showErrorBox('同步失败', '请检查OSS参数是否正确')
        //         }
        //     })
    });

    ipcMain.on('upload-all-to-aliyun', async event => {
        // mainWindow.webContents.send('loading-status', true);
        // // 全部同步到aliyun时，需要将本地的文件进行保存；
        // mainWindow.webContents.send('save-all-file');
        // if (await isOnline()) {
        //     const fileObj = fileStore.get('files') || {};
        //     const manager = createAliOss();
        //     const userId = settingStore.get('user').id;
        //     const uploadPromiseArray = Object.keys(fileObj).map(key => {
        //         const file = fileObj[key];
        //         return manager.uploadFile(`/${userId}/${file.title}:${file.id}`, file.filePath)
        //     });
        //     Promise.all(uploadPromiseArray)
        //         .then(data => {
        //             dialog.showMessageBox({
        //                 type: 'info',
        //                 title: `成功上传了个${data.length}文件`,
        //                 message: `成功上传了个${data.length}文件`
        //             });
        //             mainWindow.webContents.send('files-uploaded');
        //         })
        //         .catch(() => dialog.showErrorBox('同步失败', '请检查阿里云OSS参数是否正确'))
        //         .finally(() => mainWindow.webContents.send('loading-status', false));
        // } else {
        //     dialog.showErrorBox('网络异常', '请检查网络连接');
        //     mainWindow.webContents.send('loading-status', false);
        // }
    });

    ipcMain.on('download-all-to-aliyun', async event => {
        // const fileObj = fileStore.get('files') || {};
        // const length = Object.keys(fileObj).length;
        // // store没有文件
        // if (length.length === 0) {
        //     mainWindow.webContents.send('files-downloaded');
        // } else {
        //     mainWindow.webContents.send('loading-status', true);
        //     if (await isOnline()) {
        //         const OSS = createStaticAliOss();
        //         const manager = createAliOss();
        //         const userId = settingStore.get('user').id;
        //         const prefix = `${userId}/`;
        //         const res = await OSS.list(prefix);
        //         const downloadInfoObj = {};
        //         const data = res.objects && res.objects.slice(0);
        //         // 转换data位key-value
        //         const cloudFilesObj = data.reduce((res, file) => {
        //             const key = file.name.slice(file.name.indexOf(':') + 1, -3);
        //             const filename = file.name.slice(prefix.length, file.name.indexOf(':'));
        //             res[key] = {
        //                 file,
        //                 filename: filename
        //             };
        //             return res
        //         }, {});
        //         // 找到在云端且在本地都存在的文件
        //         let keys = Object.keys(fileObj).filter(key => {
        //             const curFile = fileObj[key];
        //             return cloudFilesObj[curFile.id] !== undefined
        //         });
        //
        //         const needDownloadFileKeys = keys.filter(key => {
        //             const cloudFile = cloudFilesObj[key];
        //             const localFile = fileObj[key];
        //             const serverUpdatedAt = Math.round(+new Date(cloudFile.lastModified));
        //             const localUpdatedAt = Math.round(localFile.localUpdatedAt);
        //             if (serverUpdatedAt > localUpdatedAt) {
        //                 downloadInfoObj[key] = serverUpdatedAt;
        //                 return true
        //             }
        //         });
        //         // 找到需要下载的文件
        //         const uploadPromiseArray = needDownloadFileKeys.map(key => {
        //             return manager.downloadFile(`${prefix}/${cloudFilesObj[key].filename}:${key}.md`, fileObj[key].filePath)
        //         });
        //         // 下载文件
        //         Promise.all(uploadPromiseArray)
        //             .then(data => {
        //                 dialog.showMessageBox({
        //                     type: 'info',
        //                     title: `成功下载了个${data.length}文件`,
        //                     message: `成功下载了个${data.length}文件`
        //                 });
        //                 mainWindow.webContents.send('files-downloaded', {downloadInfoObj: downloadInfoObj});
        //             })
        //             .catch(e => {
        //                 dialog.showErrorBox('同步失败', '请检查阿里云OSS参数是否正确')
        //             })
        //             .finally(() => mainWindow.webContents.send('loading-status', false));
        //     } else {
        //         mainWindow.webContents.send('loading-status', false);
        //         dialog.showErrorBox('网络异常', '请检查网络连接')
        //     }
        // }
    })
});

