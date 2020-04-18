/**
 * Created by 16609 on 2020-02-25
 *
 */
const {BrowserWindow} = require('electron');
class AppWindow extends BrowserWindow{
    constructor(config, urlLocation) {
        const basicConfig = {
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: true
            },
            backgroundColor: '#efefef'
        };
        const finalConfig = {...basicConfig, ...config};
        super(finalConfig);
        // 判断生成环境还是线上环境
        this.loadURL(urlLocation);
        this.once('ready-to-show', () => {
            this.show()
        })
    }
}

module.exports = AppWindow;
