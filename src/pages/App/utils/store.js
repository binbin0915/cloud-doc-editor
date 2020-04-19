/**
 * electron store
 * @author ainuo5213
 * @date 2020-02-22
 */
const Store = window.require('electron-store');
const {remote} = window.require('electron');

function handleClose() {
    remote.getCurrentWindow().close();
}

const {obj2Array} = require('./helper');
const fileStore = new Store({
    name: 'File Data'
});
const settingsStore = new Store({
    name: 'Settings'
});

const saveFilesToStore = async files => {
    // 将文件信息存储到文件系统，不包括状态信息，例如：isNewlyCreate等
    const filesStoreObj = obj2Array(files).reduce((result, file) => {
        const {id, filePath, title, createdAt, isSynced, localUpdatedAt, serverUpdatedAt} = file;
        result[id] = {
            id,
            filePath,
            title,
            createdAt,
            isNewlyCreate: false,
            isSynced,
            localUpdatedAt,
            serverUpdatedAt
        };
        return result;
    }, {});
    await fileStore.set('files', filesStoreObj);
};

module.exports = {
    saveFilesToStore,
    fileStore,
    settingsStore,
    handleClose
};
