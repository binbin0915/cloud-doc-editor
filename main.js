/**
 * 入口文件，主进程
 * @author ainuo5213
 * @date 2020-02-14
 */
const {app, Menu, Tray} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const AppWindow = require('./AppWindow');
const dotenv = require('dotenv');
dotenv.config('./env');
const accessKey = process.env.AK || 'LTAI4FtdgeNDbHtktD2VegEb';
const endpoint = process.env.ENDPOINT || 'oss-cn-beijing.aliyuncs.com';
const secretKey = process.env.SK || 'R3JuK67lEFhB9lH5UJljoCbYJ8NpBI';
const bucketName = process.env.BUCKET || 'cloud-doc-editor';
const area = process.env.AREA || 'oss-cn-beijing.aliyuncs.com';

const Store = require('electron-store');
const settingStore = new Store({
    name: 'Settings'
});

let mainWindow;

let appTray = null;   // 引用放外部，防止被当垃圾回收

// 隐藏主窗口，并创建托盘，绑定关闭事件
function setTray() {
    let trayMenuTemplate = [{
        label: '退出',
        click: function () {
            app.quit();
        }
    }];
    let iconPath = '';
    if (isDev) {
        // 测试环境
        iconPath = path.join(__dirname, './icon/icon.png');
    } else {
        // 正式环境
        iconPath = path.join(path.dirname(app.getPath('exe')), './resources/icon/icon.png');
    }
    appTray = new Tray(iconPath);
    // 图标的上下文菜单
    const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);
    // 隐藏主窗口
    mainWindow.hide();
    // 设置托盘悬浮提示
    appTray.setToolTip('never forget');
    // 设置托盘菜单
    appTray.setContextMenu(contextMenu);
    // 单击托盘小图标显示应用
    appTray.on('click', function () {
        // 显示主程序
        mainWindow.show();
    });
}

app.on('ready', () => {
    // APP运行起来之后将alioss设置到setting store
    settingStore.set('endpoint', endpoint);
    settingStore.set('accessKey', accessKey);
    settingStore.set('secretKey', secretKey);
    settingStore.set('bucketName', bucketName);
    settingStore.set('area', area);

    const mainWindowConfig = {
        width: 1366,
        height: 768,
        // transparent: true,
        // frame: false
    };
    // 判断生成环境还是线上环境，开发环境无法访问绝对路径的文件，打包之后可访问
    const urlLocation = isDev ? 'http://localhost:3000/App.html' : `file://${path.join(__dirname, './dist/App.html')}`;
    mainWindow = new AppWindow(mainWindowConfig, urlLocation);
    mainWindow.center();
    setTray();

    // 垃圾回收
    mainWindow.on('closed', e => {
        mainWindow = null;
    });
});

