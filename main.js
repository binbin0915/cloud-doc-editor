/**
 * 入口文件，主进程
 * @author ainuo5213
 * @date 2020-02-14
 */
const {app, Menu} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const AppWindow = require('./AppWindow');
const template = require('./menuTemplate');
const dotenv = require('dotenv');
dotenv.config('./env');
const regionId = process.env.AREA;
const accessKey = process.env.AK;
const endpoint = process.env.ENDPOINT;
const secretKey = process.env.SK;
const bucketName = process.env.BUCKET;

const Store = require('electron-store');
const settingStore = new Store({
    name: 'Settings'
});

let mainWindow, settingsWindow, userWindow;

settingStore.set('upload-dir', path.resolve(__dirname, './src/static'));

app.on('ready', () => {
    // APP运行起来之后将alioss设置到setting store
    settingStore.set('endpoint', endpoint);
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

    // 设置菜单
    let menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

});

