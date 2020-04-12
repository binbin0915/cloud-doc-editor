/**
 * 文件操作
 * @author ainuo5213
 * @date 2020-02-21
 */
const fs = window.require('fs');
const fsPromise = fs.promises;
const nodePath = window.require('path');

const Store = window.require('electron-store');
const settingStore = new Store({
    name: 'Settings'
});
const uploadDir = settingStore.get('upload-dir');

const readFile = (path, encoding = 'utf8') => {
    return fsPromise.readFile(path, {encoding})
};

const writeFile = async (path, data, encoding = 'utf8') => {
    let dirPath = nodePath.dirname(path);
    // 如果不存在该路径则创建默认文件夹
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
    }
    return Promise.resolve(await fsPromise.writeFile(path, data, {encoding}))
};
const isExistSameFile = async (dirPath, fileName) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
    }
    let files = await fsPromise.readdir(dirPath);
    let length = files.filter(file => file === fileName).length;
    return length >= 1
};

const fileStatus = path => {
    return fs.statSync(path)
};

const renameFile = async (path, newName) => {
    const dir = nodePath.dirname(path);
    const newPath = nodePath.join(dir, newName);
    return await fsPromise.rename(path, newPath)
};

const deleteFile = path => {
    return fsPromise.unlink(path)
};

const copyFile = path => {
    const ext = nodePath.extname(path);
    const fileName = __generateFileName();
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
    const filePath = nodePath.join(uploadDir, fileName + ext);
    fs.copyFileSync(path, filePath);
    return fileName + ext
};

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

module.exports = {
    readFile,
    writeFile,
    renameFile,
    deleteFile,
    isExistSameFile,
    fileStatus,
    copyFile
};
