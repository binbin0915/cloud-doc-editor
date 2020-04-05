/**
 * 页面入口文件
 * @author ainuo5213
 * @date 2020-02-15
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import uuidv4 from 'uuid/v4'
import {faFileImport, faPlus} from '@fortawesome/free-solid-svg-icons'
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import FileSearch from './components/FileSearch'
import './App.css';
import FileList from './components/FileList'
import BottomBtn from './components/BottomBtn'
import TabList from './components/TabList'
import Modal from './components/Modal'
import Loading from './components/Loading'
import {array2Obj, obj2Array, timeStampToString} from '../../utils/helper'
import fileHelper from '../../utils/fileHelper'
import useIpcRenderer from "./hooks/useIpcRenderer";
import axios from 'axios'

const {remote, ipcRenderer, shell} = window.require('electron');
const {join, dirname, basename, extname} = window.require('path');
const Store = window.require('electron-store');
const fileStore = new Store({
    name: 'File Data'
});
const settingsStore = new Store({
    name: 'Settings'
});

const saveFilesToStore = async (files, flag) => {
    // 将文件信息存储到文件系统，不包括状态信息，例如：isNewlyCreate等
    const filesStoreObj = obj2Array(files).reduce((result, file) => {
        const {id, filePath, title, createdAt, isSynced, localUpdatedAt, serverUpdatedTime, editorValue, body} = file;
        result[id] = {
            id,
            filePath,
            title,
            createdAt,
            isNewlyCreate: false,
            isSynced,
            localUpdatedAt,
            serverUpdatedTime,
        };
        if (flag) {
            result[id].editorValue = editorValue;
            result[id].body = body
        }
        return result;
    }, {});
    await fileStore.set('files', filesStoreObj);
};
const deleteLabel = {
    label1: '删除',
    label2: '取消'
};
const renameLabel = {
    label1: '确定',
    label2: '取消'
};

function fetchData(url, data) {
    return new Promise((resolve, reject) => {
        const baseUrl = 'http://127.0.0.1:8059/api';
        axios.post(baseUrl + url, {...data})
            .then(res => resolve(res))
            .catch(err => reject(err))
    })
}

function App() {
    const [files, setFiles] = useState(fileStore.get('files') || []);
    const [activeFileId, setActiveFileId] = useState(settingsStore.get('activeFileId') || null);
    const [openedFileIds, setOpenedFileIds] = useState(settingsStore.get('openedFileIds') || []);
    const [unSavedFileIds, setUnsavedFileIds] = useState(settingsStore.get('unSavedFileIds') || []);
    const [showModal, setShowModal] = useState(false);
    const [deleteFileId, setDeleteFileId] = useState('');
    const [searchedFiles, setSearchedFiles] = useState([]);
    const [editorValue, setEditorValue] = useState('');
    const [isExistSameFile, setIsExistSameFile] = useState(false);
    const [renameFile, setRenameFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
    const [user, setUser] = useState(null);

    const getAutoSync = useCallback(() => {
        const aliConfigArray = [
            'token',
            'enableAutoSync'
        ];
        return aliConfigArray.every(key => !!settingsStore.get(key));
    }, [settingsStore.get('enableAutoSync')]);

    useEffect(() => {
        // 第一次进页面的时候像后端发出请求，看用户登录没有
        fetchData('/user/isLogin', {token: settingsStore.get('token')})
            .then(res => {
                const {msg, code, data} = res.data;
                // code = 0,已登录，可以设置自动同步
                if (code === 0) {
                    ipcRenderer.send('user-online');
                    setUser(data);
                    settingsStore.set('user', data);
                } else {
                    // 其他，未登录
                    ipcRenderer.send('user-offline');
                    setUser(null);
                    settingsStore.set('user', null);
                }
            });
    }, []);

    // 默认文件保存路径
    const defaultSavedFileLocation = join(remote.app.getPath('documents'), 'markdown');
    const fileDownloadPath = remote.app.getPath('downloads');

    // 如果没有文件保存的路径则设置默认的路径为文件保存的路径
    if (!settingsStore.get('savedFileLocation')) {
        settingsStore.set('savedFileLocation', defaultSavedFileLocation);
    }
    if (!settingsStore.get('fileDownloadPath')) {
        settingsStore.set('fileDownloadPath', fileDownloadPath);
    }
    // 取文件的保存路径为默认路径
    const defaultPath = settingsStore.get('savedFileLocation');
    const filesArray = obj2Array(files);
    // 从已打开文件id得到已打开的文件
    const openedFiles = openedFileIds.map(openedFileId => {
        return files[openedFileId]
    });

    // 正在编辑的文件（正在编辑的文件必然已打开）
    const activeFile = files[activeFileId];

    // 点击文件进行展示
    const handleFileClick = async id => {
        if (id === activeFileId) {
            return;
        }
        // 文件不存在时，会报异常
        try {
            const curFile = files[id];
            // 标记为正在编辑
            if (!curFile.isLoaded) {
                // 如果开启了自动同步，则在文件打开的时候从云端下载到本地
                // 存在
                let data = await fileHelper.readFile(curFile.filePath);
                const newFile = {...files[id], body: data, isLoaded: true, editorValue: data};
                const newFiles = {...files, [id]: newFile};
                setFiles(newFiles);
            }
            setActiveFileId(id);
            settingsStore.set('activeFileId', id);
            // 已打开的文件不再次打开
            if (!openedFileIds.includes(id)) {
                // 标记为已打开
                setOpenedFileIds([...openedFileIds, id]);
                settingsStore.set('openedFileIds', [...openedFileIds, id])
            }
            // 如果文件是搜索出来的，点击之后回到搜索之前的状态
            if (searchedFiles.length > 0) {
                setSearchedFiles([]);
            }
        } catch (e) {
            // TODO 提示信息
            remote.dialog.showErrorBox('文件已被删除', `${files[id].title}.md已被删除`);
            // 删除内存中的数据
            const {[id]: value, ...newFiles} = {...files};
            setFiles(newFiles);
            await saveFilesToStore(newFiles)
        }
    };

    // 处理点击tab
    const handleTabClick = id => {
        if (id === activeFileId) {
            return;
        }
        setActiveFileId(id);
        settingsStore.set('activeFileId', id)
    };
    // 处理tab关闭
    const handleTabClose = id => {
        // 关闭之后的tabList
        const newTabFileIds = openedFileIds.filter(fileId => fileId !== id);
        setOpenedFileIds(newTabFileIds);
        settingsStore.set('openedFileIds', newTabFileIds);
        if (newTabFileIds.length === 0) {
            setActiveFileId(null);
            settingsStore.set('activeFileId', null);
            return
        }
        // 关闭的是已激活的tab
        if (id === activeFileId) {
            let curFileIndex = openedFileIds.findIndex(fileId => id === fileId);
            if (curFileIndex === 0) { // 当前激活的tab在第一个的位置，则正在编辑第二个
                setActiveFileId(newTabFileIds[0]);
                settingsStore.set('activeFileId', newTabFileIds[0])
            } else { // 当前激活的tab在其他的位置，则正在编辑前一个
                setActiveFileId(newTabFileIds[curFileIndex - 1]);
                settingsStore.set('activeFileId', newTabFileIds[curFileIndex - 1])
            }
        }
    };

    const timer = useRef(null);

    // 处理md内容变化
    const handleFileChange = async (id, value) => {
        setEditorValue(value);
        activeFile.editorValue = value;
        if (activeFile.firstShow) {
            // 如果activefile没保存并且是第一次显示
            if (activeFile.originBody === value) {
                const newUnSaveFileIds = unSavedFileIds.filter(unSavedFileId => id !== unSavedFileId);
                setUnsavedFileIds(newUnSaveFileIds);
                settingsStore.set('unSavedFileIds', newUnSaveFileIds);
                activeFile.firstShow = false;
            } else {
                const newUnSavedFileIds = [...unSavedFileIds, id];
                setUnsavedFileIds(newUnSavedFileIds);
                settingsStore.set('unSavedFileIds', newUnSavedFileIds);
                activeFile.firstShow = false;
            }
        } else if (activeFile.body === value) {
            const newUnSaveFileIds = unSavedFileIds.filter(unSavedFileId => id !== unSavedFileId);
            setUnsavedFileIds(newUnSaveFileIds);
            settingsStore.set('unSavedFileIds', newUnSaveFileIds);
        } else {
            if (!unSavedFileIds.includes(id)) {
                const newUnSavedFileIds = [...unSavedFileIds, id];
                setUnsavedFileIds(newUnSavedFileIds);
                settingsStore.set('unSavedFileIds', newUnSavedFileIds);
            }
        }
        // 每当文件改变就重新保存文件
        // TODO 当APP被关闭时进行设置
        if (timer.current) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(async () => {
            let file;
            let newFiles, flag;
            if (activeFile.body !== value) {
                file = {...activeFile, body: activeFile.body, editorValue: activeFile.editorValue};
                flag = true;
            } else {
                file = activeFile;
                flag = false;
            }
            newFiles = {...files, [id]: file};
            await saveFilesToStore(newFiles, flag)
        }, 1000)
    };

    // 创建文件
    const createNewFile = () => {
        const id = uuidv4();
        const time = +new Date();
        const newFile = {
            id,
            title: '',
            body: '## 请输入Markdown',
            createdAt: time,
            isNewlyCreate: true,
            localUpdatedAt: time,
        };
        setFiles({...files, [id]: newFile})
    };

    // 打开模态框
    const openModal = async id => {
        const willDeleteFile = files[id];
        if (!willDeleteFile.isNewlyCreate) {
            let isExist = await fileHelper.isExistSameFile(dirname(files[id].filePath), `${files[id].title}.md`);
            if (isExist) {
                setShowModal(true);
                setDeleteFileId(id);
            } else {
                remote.dialog.showErrorBox('文件已被删除', `${willDeleteFile.title}.md已被删除`)
                // 删除内存中的数据
                const {[id]: value, ...newFiles} = {...files};
                setFiles(newFiles);
                await saveFilesToStore(newFiles)
            }
        } else {
            await handleDeleteFile(id)
        }
    };

    // 删除文件
    const handleDeleteFile = async id => {
        let isNew = files[id].isNewlyCreate;
        if (isNew) {
            // 在内存上面删除
            delete files[id];
            setFiles({...files});
        } else {
            if (openedFileIds.includes(id)) {
                handleTabClose(id);
            }
            // 删除的时候，如果此时处于自动同步状态且有网时，删除远端的
            if (getAutoSync()) {
                await syncFileOnline(() => {
                    ipcRenderer.send('delete-file', {
                        key: id,
                    });
                }, async () => {
                    // 在磁盘上面删除
                    await fileHelper.deleteFile(files[id].filePath);
                    // 在内存上面删除
                    const {[id]: value, ...newFiles} = {...files};
                    setFiles({...newFiles});
                    // 如果他正在被编辑的话，还需要将其从activeIds和openedFileIds中删除
                    // 持久化数据
                    await saveFilesToStore(newFiles);
                    closeModal();
                    // 如果删除文件已打开，则关闭它
                    handleTabClose(id)
                })
            }
            // 在磁盘上面删除
            await fileHelper.deleteFile(files[id].filePath);
            // 在内存上面删除
            const {[id]: value, ...newFiles} = {...files};
            setFiles({...newFiles});
            // 如果他正在被编辑的话，还需要将其从activeIds和openedFileIds中删除
            // 持久化数据
            await saveFilesToStore(newFiles);
            closeModal();
            // 如果删除文件已打开，则关闭它
            handleTabClose(id)
        }
    };

    // 关闭模态框
    const closeModal = () => {
        setShowModal(false);
        setDeleteFileId('');
    };

    // 更新文件名
    const updateFileName = async (id, title, isNewlyCreate) => {
        const modifiedFile = {...files[id], title, isNewlyCreate: false};
        if (isNewlyCreate) { // 先创建的文件，命名成功后需要写入磁盘
            // 如果该路径下存在同样的文件名的文件
            let isExist = await fileHelper.isExistSameFile(defaultPath, `${title}.md`);
            const filePath = join(defaultPath, `${title}.md`);
            if (isExist) {
                setIsExistSameFile(true);
                modifiedFile.isNewlyCreate = true;
                modifiedFile.filePath = filePath;
                setRenameFile(modifiedFile);
            } else {
                if (!modifiedFile.filePath) {
                    modifiedFile.filePath = filePath;
                }
                await fileHelper.writeFile(filePath, files[id].body);
                const newFiles = {...files, [id]: modifiedFile};
                await saveFilesToStore(newFiles);
                // TODO 新建文件未重名时，默认打开
                setActiveFileId(id);
                settingsStore.set('activeFileId', id);
                setOpenedFileIds([...openedFileIds, id]);
                settingsStore.set('openedFileIds', [...openedFileIds, id]);

                setFiles(newFiles);
            }
            // 不是新创建的文件
        } else { // 自己读取的文件，命名成功后重命名原来路径的文件
            const sameNameFiles = filesArray.filter(file => {
                return join(dirname(modifiedFile.filePath), `${title}.md`) === file.filePath
            });
            const sameNameFile = sameNameFiles && sameNameFiles.find(file => file.id !== id);
            if (sameNameFile) {
                setIsExistSameFile(true);
                setRenameFile(modifiedFile);
            } else {
                // 没有重名的
                // 得到原来文件的路径
                const originFilePath = join(dirname(modifiedFile.filePath), `${files[id].title}.md`);
                modifiedFile.filePath = join(dirname(files[id].filePath), `${title}.md`);
                await fileHelper.renameFile(originFilePath, `${title}.md`);
                const newFiles = {...files, [id]: modifiedFile};
                await saveFilesToStore(newFiles);
                setFiles(newFiles);
            }
        }
    };

    // 当同一目录下有重复的文件名时的处理，点击确定之后，直接覆盖(这里已经判断了该路径下存在同名文件)
    const handleFileRename = async renameFile => {
        if (renameFile.isNewlyCreate) {
            // 查看内存中是否存在该路径的文件
            let samePathFiles = filesArray.filter(file => file.filePath === renameFile.filePath);
            // 如果存在同名的文件且在内存中不存在该文件信息，则直接覆盖
            if (samePathFiles.length) {
                const sameNameFile = samePathFiles.find(file => file.id !== renameFile.id);
                // 在内存中删去这个文件的信息
                if (openedFileIds.includes(sameNameFile.id)) {
                    handleTabClose(sameNameFile.id);
                }
                delete files[sameNameFile.id]
            }
            const newFiles = {...files, [renameFile.id]: renameFile};
            // 写入新文件操作
            await fileHelper.writeFile(renameFile.filePath, renameFile.body);
            // // 更新内存中的文件信息
            renameFile.isNewlyCreate = false;
            await setFiles(newFiles);
            await saveFilesToStore(newFiles);
            // 隐藏模态框
            setRenameFile(null);
            setIsExistSameFile(false);
        } else {
            // 如果同目录下存在同名文件，查找内存中是否有同路径的文件
            const sameNameFiles = filesArray.filter(file => join(dirname(renameFile.filePath), `${renameFile.title}.md`) === file.filePath);
            if (sameNameFiles.length > 0) {
                // 若内存中没有这个文件，则直接重命名
                const sameNameFile = sameNameFiles.find(file => file.id !== renameFile.id);
                if (openedFileIds.includes(sameNameFile.id)) {
                    handleTabClose(sameNameFile.id);
                }
                delete files[sameNameFile.id];
            }
            await fileHelper.renameFile(renameFile.filePath, `${renameFile.title}.md`);
            renameFile.filePath = join(dirname(renameFile.filePath), `${renameFile.title}.md`);
            const newFiles = {...files, [renameFile.id]: renameFile};
            setFiles(newFiles);
            await saveFilesToStore(newFiles);
            setRenameFile(null);
            setIsExistSameFile(false);
        }
    };

    // 文件搜索
    const handleFileSearch = keyword => {
        const newFiles = filesArray.filter(file => file.title.includes(keyword));
        setSearchedFiles(newFiles);
    };

    // 关闭文件搜索
    const handleCloseFileSearch = () => {
        setSearchedFiles([]);
        setOpenSearch(false);
    };

    // 快捷键保存
    const handleKeyDown = async (e, id) => {
        if (e.keyCode === 83 && (/Win32/.test(navigator.platform) ? e.ctrlKey : e.metaKey)) {
            e.preventDefault();
            if (unSavedFileIds.includes(id)) {
                // 1. 更新localUpdatedAt
                const file = files[id];
                file.localUpdatedAt = +new Date();

                // 2. 更新content
                file.body = editorValue;
                file.originBody = '';
                file.editorValue = editorValue;
                file.firstShow = false;
                file.isNewlyCreate = false;
                // 3. 更新磁盘
                await fileHelper.writeFile(file.filePath, editorValue);
                console.log(file);
                // 4. 如果设置了自动同步的话，上传文件，更新serverUpdatedTime
                if (getAutoSync()) {
                    syncFileOnline(() => {
                        ipcRenderer.send('upload-file', {
                            key: file.id,
                            filename: file.title,
                            filePath: file.filePath
                        });
                        file.serverUpdatedTime = +new Date();
                    }, async () => {
                        setFiles({...files, [id]: file});
                        await saveFilesToStore(files)
                    });
                } else {
                    // 若没有设置自动同步，直接更新内存中的信息
                    setFiles({...files, [id]: file});
                    await saveFilesToStore(files)
                }
                // 5. 更新tablist
                const newUnSaveFileIds = unSavedFileIds.filter(unSavedFileId => id !== unSavedFileId);
                setUnsavedFileIds(newUnSaveFileIds);
                settingsStore.set('unSavedFileIds', newUnSaveFileIds)
            }
        }
    };

    // 更新文件内容
    const updateFileContent = id => {
        handleModalSave(id, true)
    };

    // 在模态框回调出发时文件的保存与否
    const handleModalSave = (id, saveOrNot) => {
        const unSaveFile = files[id];
        // 将file.editorValue赋值给body
        if (unSavedFileIds.includes(id)) {
            if (saveOrNot) {
                unSaveFile.body = unSaveFile.editorValue;
                fileHelper.writeFile(unSaveFile.filePath, unSaveFile.body)
                    .then(() => {
                        if (getAutoSync()) {
                            syncFileOnline(() => {
                                ipcRenderer.send('upload-file', {
                                    key: unSaveFile.id,
                                    filename: unSaveFile.title,
                                    filePath: unSaveFile.filePath
                                });
                                unSaveFile.serverUpdatedTime = +new Date();
                            })
                        }
                    });

            } else {
                unSaveFile.editorValue = unSaveFile.body;
            }
            const newUnSaveFileIds = unSavedFileIds.filter(unSavedFileId => id !== unSavedFileId);
            setUnsavedFileIds(newUnSaveFileIds);
            settingsStore.set('unSavedFileIds', newUnSaveFileIds)
        }
        setFiles({...files, [id]: unSaveFile});
    };

    // 点击tab时，若文件未保存，则不保存文件
    const handleUnSave = id => {
        handleModalSave(id, false)
    };

    // 导入文件
    const importFiles = async () => {
        let status = await remote.dialog.showOpenDialog({
            title: '选择导入的markdown文件',
            properties: ['openFile', 'multiSelections'],
            filters: [
                {name: 'Markdown files', extensions: ['md']}
            ]
        });
        if (!status.canceled) {
            // 过滤掉我们已经打开过的文件
            const filteredPath = status.filePaths.filter(path => {
                const isAlreadyAdded = filesArray.find(file => {
                    return file.filePath === path
                });
                return !isAlreadyAdded
            });
            // 将过滤后的文件转换成[{}, {}]
            const importFilesArr = filteredPath.map(path => {
                return {
                    id: uuidv4(),
                    title: basename(path, extname(path)),
                    filePath: path,
                    isNewlyCreate: false,
                    createdAt: fileHelper.fileStatus(path).birthtimeMs,
                    localUpdatedAt: +new Date()
                }
            });
            // 展开arr =》 obj
            const newFiles = {...files, ...array2Obj(importFilesArr)};
            setFiles(newFiles);
            if (importFilesArr.length === 1) {
                setActiveFileId(importFilesArr[0].id);
                let value = await fileHelper.readFile(importFilesArr[0].filePath);
                importFilesArr[0].body = value;
                importFilesArr[0].loaded = true;
                settingsStore.set('activeFileId', importFilesArr[0].id);
                setOpenedFileIds([...openedFileIds, importFilesArr[0].id]);
                settingsStore.set('openedFileIds', [...openedFileIds, importFilesArr[0].id]);
            }
            // setState and update electron store
            saveFilesToStore(newFiles)
                .then(() => {
                    if (importFilesArr.length > 0) {
                        remote.dialog.showMessageBox({
                            type: 'info',
                            title: `成功导入了${importFilesArr.length}个文件`,
                            message: `成功导入了${importFilesArr.length}个文件`

                        })
                    }
                });
        }
    };

    // 移除文件
    const onFileRemove = async id => {
        const {[id]: file, ...newFiles} = files;
        if (unSavedFileIds.includes(id)) {
            let {response} = await remote.dialog.showMessageBox({
                type: 'question',
                buttons: ['保存', '不保存', '取消'],
                defaultId: 0,
                title: '是否保存文件',
                message: '文件还未保存，是否移除'
            });

            // 0 1 2
            if (response === 0) {
                await saveFile(files[id])
            } else if (response === 2) {
                return;
            }
        }
        if (openedFileIds.includes(id) || activeFileId === id) {
            handleTabClose(id);
        }
        setFiles(newFiles);
        saveFilesToStore(newFiles)
            .then(() => console.log('文件已移除'));
    };

    // 保存某个文件
    const saveFile = async file => {
        if (file) {
            // 保存修改内容
            file.body = file.editorValue;
            if (unSavedFileIds.includes(file.id)) {
                const newUnSavedFileIds = unSavedFileIds.filter(fileId => file.id !== fileId);
                setUnsavedFileIds(newUnSavedFileIds);
                settingsStore.set('unSavedFileIds', newUnSavedFileIds)
            }
            await fileHelper.writeFile(file.filePath, file.body);
            // 同步到内存和store
            const newFiles = {...files, [file.id]: file};
            setFiles(newFiles);
            await saveFilesToStore(newFiles);
            // 如果设置了云同步，则同步到云端
            if (getAutoSync()) {
                syncFileOnline(() => {
                    ipcRenderer.send('upload-file', {
                        key: file.id,
                        filename: file.title,
                        filePath: file.filePath
                    });
                    file.serverUpdatedTime = +new Date();
                })
            }
        }
    };

    // 有网的情况才能同步文件
    const syncFileOnline = (syncFn, offLineCallback) => {
        // 有网才能同步
        if (navigator.onLine) {
            syncFn()
        } else {
            offLineCallback && offLineCallback();
            handleOffLine()
        }
    };

    // 同步的文件同步完成之后，更新内存和store中的信息
    const activeFileUploaded = async () => {
        const updatedTime = +new Date();
        const modifiedFile = {
            ...files[activeFileId],
            isSynced: true,
            localUpdatedAt: updatedTime,
            serverUpdatedTime: updatedTime
        };
        const newFiles = {...files, [activeFileId]: modifiedFile};
        setFiles(newFiles);
        await saveFilesToStore(newFiles);
    };

    const downloadFileSuccess = async (event, message) => {
        if (message.status === 'download-success') {
            const {filePath, title, serverUpdatedTime} = message.file;
            try {
                let value = await fileHelper.readFile(filePath);
                let newFile;
                let file = filesArray.find(file => file.filePath === filePath);
                if (file) {
                    if (openedFileIds.includes(file.id)) {
                        handleTabClose(file.id)
                    }
                    delete files[file.id];
                }
                newFile = {
                    id: uuidv4(),
                    title,
                    body: value,
                    isLoaded: true,
                    isSynced: true,
                    localUpdatedAt: +new Date(),
                    serverUpdatedTime,
                    filePath
                };
                const newFiles = {...files, [newFile.id]: newFile};
                setFiles(newFiles);
                await saveFilesToStore(newFiles);
            } catch (e) {

            }
        }
    };

    // 批量上传云端文件
    const filesUploaded = async () => {
        // 更新files的serverUpdatedTime
        const newFiles = obj2Array(files).reduce((res, file) => {
            const curTime = +new Date();
            res[file.id] = {...files[file.id], isSynced: true, serverUpdatedTime: curTime};
            return res
        }, {});
        setFiles(newFiles);
        await saveFilesToStore(newFiles);
    };

    // 批量下载云端文件
    const filesDownloaded = async (event, message) => {
        const downloadInfoObj = message.downloadInfoObj;
        // 批量更新files和store
        Object.keys(downloadInfoObj).map(async key => {
            // 更新所有file的body
            const file = files[key];
            file.body = await fileHelper.readFile(file.filePath);
            file.localUpdatedAt = downloadInfoObj[key];
            file.serverUpdatedTime = downloadInfoObj[key];
            const newFiles = {...files, [key]: file};
            setFiles(newFiles);
            await saveFilesToStore(newFiles)
        })
    };

    // 关闭其他
    const closeOther = async id => {
        // 关闭其他
        const newOpenFileIds = openedFileIds.filter(fileId => fileId === id);
        setOpenedFileIds(newOpenFileIds);
        settingsStore.set('openedFileIds', newOpenFileIds);
        // 如果他不是被激活的，则设置他为激活的文件
        if (id !== activeFileId) {
            setActiveFileId(id);
            settingsStore.set('activeFileId', id);
        }
    };

    // 关闭所有
    const closeAll = () => {
        setOpenedFileIds([]);
        settingsStore.set('openedFileIds', []);
        setActiveFileId(null);
        settingsStore.set('activeFileId', null);
    };

    // 关闭左边所有
    const closeLeft = async id => {
        // 找到openedFileIds中在id后面的
        const newOpenFileIds = openedFileIds.slice(openedFileIds.findIndex(fileId => fileId === id));
        // 将激活的文件设置为点击关闭左边所有的tab
        setActiveFileId(id);
        settingsStore.set('activeFileId', id);
        setOpenedFileIds(newOpenFileIds);
        settingsStore.set('openedFileIds', newOpenFileIds);
    };

    // 关闭右边所有
    const closeRight = async id => {
        // 找到openedFileIds中在id后面的
        const newOpenFileIds = openedFileIds.slice(0, openedFileIds.findIndex(fileId => fileId === id) + 1);
        // 将激活的文件设置为点击关闭左边所有的tab
        setActiveFileId(id);
        settingsStore.set('activeFileId', id);
        setOpenedFileIds(newOpenFileIds);
        settingsStore.set('openedFileIds', newOpenFileIds);
    };

    const handleOffLine = () => {
        remote.dialog.showErrorBox('无网络', '请检查网络是否连接')
    };

    const handleOpenSearch = () => {
        if (!openSearch) {
            setOpenSearch(true)
        }
    };

    const saveAllFile = () => {
        // 保存全部文件（文件列表的不用保存，只有打开的文件才需要保存）
        openedFileIds.forEach(async fileId => {
            if (unSavedFileIds.includes(fileId)) {
                const file = files[fileId];
                // 将编辑器内容写入body
                file.body = file.editorValue;
                // 保存文件到本地
                await fileHelper.writeFile(file.filePath, file.body);
                // 保存状态改变
                setUnsavedFileIds([]);
                settingsStore.set('unSavedFileIds', [])
            }
        })
    };

    // 渲染进程绑定事件和处理函数
    useIpcRenderer({
        'create-new-file': createNewFile,
        'import-file': importFiles,
        'save-edit-file': () => saveFile(activeFile),
        'active-file-uploaded': activeFileUploaded,
        'file-downloaded': downloadFileSuccess,
        'loading-status': (event, status) => setIsLoading(status),
        'files-uploaded': filesUploaded,
        'files-downloaded': filesDownloaded,
        'search-file': handleOpenSearch,
        'save-all-file': saveAllFile
    });

    // 在资源管理器中打开
    const showInExplorer = async id => {
        shell.showItemInFolder(files[id].filePath)
    };

    const handleExtError = () => {
        remote.dialog.showMessageBox({
            type: 'warn',
            title: '格式异常',
            message: '软件只支持md',
            buttons: ['cancel']
        });
    };

    // 多文件拖拽引入
    const handleDrop = async e => {
        let importedFiles = e.dataTransfer.files;

        if (importedFiles.length === 1) {
            let path = importedFiles[0].path;
            if (extname(path) !== '.md') {
                handleExtError();
            } else {
                let samePathFile = filesArray.find(file => file.filePath === path);
                if (samePathFile) {
                    await remote.dialog.showMessageBox({
                        type: 'info',
                        title: '文件已存在',
                        message: '文件已导入',
                        buttons: ['cancel']
                    });
                    await handleFileClick(samePathFile.id);
                    return;
                }
                const title = basename(path, extname(path));
                const body = await fileHelper.readFile(path);
                const createdAt = fileHelper.fileStatus(path).birthtimeMs;
                const id = uuidv4();
                const file = {
                    id,
                    title,
                    body,
                    createdAt,
                    isNewlyCreate: false,
                    filePath: path
                };
                const newFiles = {...files, [id]: file};
                setFiles(newFiles);
                setActiveFileId(id);
                settingsStore.set('activeFileId', id);
                setOpenedFileIds([...openedFileIds, id]);
                settingsStore.set('openedFileIds', [...openedFileIds, id]);
                await saveFilesToStore(newFiles);
            }
        } else {
            const filteredFiles = Array.from(importedFiles).filter(file => {
                const isAlreadyAdded = filesArray.find(ramFile => {
                    return ramFile.filePath === file.path
                });
                return extname(file.path) === '.md' && !isAlreadyAdded
            });
            let fileObj = filteredFiles.reduce((res, file) => {
                const title = basename(file.path, extname(file.path));
                const createdAt = file.lastModified;
                const id = uuidv4();
                res[id] = {
                    id,
                    title,
                    createdAt,
                    isNewlyCreate: false,
                    filePath: file.path
                };
                return res;
            }, {});
            const newFiles = {...files, ...fileObj};
            setFiles(newFiles);
            // 存储进入store
            await saveFilesToStore(newFiles)
        }
    };

    const handleDrag = e => {
        e.preventDefault()
    };

    useEffect(() => {
        if (openedFileIds.length > 0) {
            openedFileIds.forEach(async id => {
                let file = files[id];
                if (unSavedFileIds.includes(id)) {
                    file.firstShow = true;
                    file.originBody = file.body;
                    file.body = file.editorValue || await fileHelper.readFile(file.filePath);
                } else {
                    file.body = await fileHelper.readFile(file.filePath);
                }
                file.isLoaded = true;
                const newFiles = {...files, [id]: file};
                setFiles(newFiles);
            })
        }
    }, []);

    const fileList = (searchedFiles.length > 0) ? searchedFiles : filesArray;
    return (
        <div className="container-fluid px-0"
             onDrag={handleDrag}
             onDragOver={handleDrag}
             onDrop={handleDrop}>
            {isLoading && <Loading/>}
            <div className="row no-gutters">
                <div className="col-3 bg-light left-panel">
                    <FileSearch
                        openSearch={openSearch}
                        title={'我的云文档'}
                        onCloseSearch={handleCloseFileSearch}
                        onFileSearch={handleFileSearch}/>
                    <FileList
                        files={fileList}
                        onFileClick={handleFileClick}
                        onFileRemove={onFileRemove}
                        onSaveEdit={updateFileName}
                        showInExplorer={showInExplorer}
                        onFileDelete={openModal}/>
                    <div className="row no-gutters button-group">
                        <div className="col">
                            <BottomBtn color={'btn-primary'} text={'新建'} icon={faPlus} onClick={createNewFile}/>
                        </div>
                        <div className="col">
                            <BottomBtn color={'btn-success'} text={'导入'} icon={faFileImport} onClick={importFiles}/>
                        </div>
                    </div>
                </div>
                <div className="col-9 right-panel h-100p">
                    {
                        activeFile ?
                            <React.Fragment>
                                <TabList
                                    files={openedFiles}
                                    onFileSave={saveFile}
                                    onTabClick={handleTabClick}
                                    activeId={activeFileId}
                                    onCloseTab={handleTabClose}
                                    unSavedIds={unSavedFileIds}
                                    handleSave={updateFileContent}
                                    handleUnSave={handleUnSave}
                                    closeOther={closeOther}
                                    closeAll={closeAll}
                                    showInExplorer={showInExplorer}
                                    closeLeft={closeLeft}
                                    closeRight={closeRight}
                                    onFileRemove={onFileRemove}
                                    openedFileIds={openedFileIds}
                                />
                                <SimpleMDE
                                    key={activeFileId} /* 设置key用于区分 */
                                    value={activeFile && activeFile.body}
                                    onKeyUp={e => handleKeyDown(e, activeFileId)}
                                    onChange={value => handleFileChange(activeFileId, value)}
                                    options={{
                                        minHeight: '515px'
                                    }}
                                />
                                {
                                    activeFile.isSynced && (
                                        <span
                                            className={'sync-status'}>已同步,上次同步{timeStampToString(activeFile.serverUpdatedTime)}</span>
                                    )
                                }
                            </React.Fragment>
                            :
                            <div className={'start-page'}>
                                选择或创建新的 markdown 文档
                            </div>
                    }
                </div>
            </div>
            <Modal
                onLabel1Click={id => handleDeleteFile(id)}
                onLabel2Click={() => setShowModal(false)}
                active={showModal} title={'提示消息'}
                id={deleteFileId}
                message={'确定删除该文件吗?'}
                label={deleteLabel}
            />
            <Modal
                onLabel1Click={() => handleFileRename(renameFile)}
                onLabel2Click={() => setIsExistSameFile(false)}
                active={isExistSameFile} title={'提示消息'}
                id={renameFile && renameFile.id}
                message={'文件已存在，是否需要覆盖?'}
                label={renameLabel}
            />
        </div>
    );
}

export default App;
