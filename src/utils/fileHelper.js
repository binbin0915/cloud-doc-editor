/**
 * 文件操作
 * @author ainuo5213
 * @date 2020-02-21
 */
const fs = window.require('fs');
const fsPromise = fs.promises;
const nodePath = window.require('path');

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
    return Promise.resolve(await fsPromise.rename(path, newPath))
};

const deleteFile = path => {
    return fsPromise.unlink(path)
};

module.exports = {
    readFile,
    writeFile,
    renameFile,
    deleteFile,
    isExistSameFile,
    fileStatus
};
