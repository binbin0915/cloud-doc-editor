/**
 * 阿里云OSS控制类
 * @author ainuo5213
 * @data 2020-02-27
 */
const Store = window.require('electron-store');
const OSS = window.require('ali-oss-extra');

const settingsStore = new Store({
    name: 'Settings'
});
const endpoint = settingsStore.get('endpoint');
const access = settingsStore.get('accessKey');
const secret = settingsStore.get('secretKey');
const bucket = settingsStore.get('bucketName');
const manager = new OSS.default({
    accessKeyId: access,
    endpoint: endpoint,
    accessKeySecret: secret,
    bucket: bucket,
});

module.exports = {extraManager: manager};
