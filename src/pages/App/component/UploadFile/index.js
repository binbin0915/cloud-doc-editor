import React, {useCallback, useEffect, useState, useRef} from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {Breadcrumb, Card, Input, List as AntList, message, Modal} from 'antd'
import {LeftOutlined, PlusOutlined, RedoOutlined, ExclamationCircleOutlined} from '@ant-design/icons'
import {useSelector} from "react-redux";
import useAction from "../../hooks/useAction";
import * as action from "../../store/action";
import './upload.css'
import {array2Obj, formatSize, obj2Array, timeStampToString} from '../../utils/helper'
import Folder from '../../static/folder.png'
import File from '../../static/file.png'
import Pic from '../../static/jpg.png'
import {getParentNode, isImage} from "../../utils/helper";

const fs = window.require('fs');
const querystring = window.require('querystring');
const {extraManager} = require('../../utils/manager');
const {manager, staticManager} = require('../../utils/aliOssManager');
const Meta = Card.Meta;

const nodePath = window.require('path');
const {remote} = window.require('electron');
const {confirm, info, success} = Modal;

const Store = window.require('electron-store');

const settingsStore = new Store({
    name: 'Settings'
});

const downloadPath = settingsStore.get('fileDownloadPath');

export default function () {
    const history = useHistory();
    const location = useLocation();

    const searchObj = querystring.parse(location.search.slice(1));
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const cloudContextMenuInfo = useSelector(state => state.getIn(['App', 'cloudContextMenuInfo'])).toJS();
    const objectsObj = useSelector(state => state.getIn(['App', 'objects'])).toJS();
    const copyFile = useSelector(state => state.getIn(['App', 'copyFile'])).toJS();
    const dirsObj = useSelector(state => state.getIn(['App', 'dirs'])).toJS();
    const loading = useSelector(state => state.getIn(['App', 'loading']));
    const active = useSelector(state => state.getIn(['App', 'active']));
    const objects = obj2Array(objectsObj);
    const dirs = obj2Array(dirsObj);
    const {setCloudDir, setCloudFileContextMenuInfo, setCloudObjects, setCopyFile} = useAction(action);
    let page = '/uploadFile';
    const [value, setValue] = useState('');
    const [inputStat, setInputStat] = useState(false);

    const handleDbClick = useCallback(dir => {
        let url = page + '?prefix=' + dir.dir;
        history.push(url);
    }, [location]);

    const handleDelete = useCallback(file => {
        confirm({
            title: '删除文件',
            icon: <ExclamationCircleOutlined/>,
            content: '删除该文件无法恢复，确定要删除吗？',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                if (file.dir) {
                    delete dirsObj[file.id];
                    setCloudDir({...dirsObj});
                    extraManager.deleteDir(file.id)
                        .then(() => message.success("删除文件夹成功"))
                } else {
                    delete objectsObj[file.id];
                    setCloudObjects({...objectsObj});
                    extraManager.deleteDir(file.id)
                        .then(() => message.success("删除文件成功"))

                }
            },
        });
    }, [location, dirs]);

    const filterFile = (prefix, data) => {
        let filteredDirs = data.prefixes && data.prefixes.map(dir => {
            return {dirname: dir.slice(prefix.length, -1), dir: dir.replace(/\/$/g, ''), id: dir, isNew: false}
        });
        let filteredObjects = data.objects && data.objects.map(object => {
            let {lastModified, url, name, size} = object;
            let extname = nodePath.extname(name);
            if (extname !== '') {
                let filename = name.slice(prefix.length);
                return {
                    filename,
                    id: name,
                    serverUpdatedAt: +new Date(lastModified),
                    url,
                    extname: extname.slice(extname.indexOf('.') + 1),
                    size
                }
            }
        }).filter(item => item);
        return {
            dirs: filteredDirs ? array2Obj(filteredDirs) : {},
            objects: filteredObjects ? array2Obj(filteredObjects) : {}
        }
    };

    const getData = useCallback(() => {
        if (loginInfo && loginInfo.user) {
            let prefix = searchObj.prefix + '/';
            manager.getObjectsFromOss(prefix, '/')
                .then(data => {
                    // 去掉前缀
                    let {objects, dirs} = filterFile(prefix, data);
                    setCloudObjects(objects || []);
                    setCloudDir(dirs || []);
                });
        }
    }, [searchObj]);

    async function renameDir(from, to, value) {
        let data = await extraManager.listDir(from);
        // 拷贝文件到to
        await Promise.all(data.map(async (item) => {
            let name = item.name.replace(from, to + '/');
            await manager.copyFile(item.name, name);
        }));
        // 删除原文件
        await extraManager.deleteDir(from);
        // 重新设置
        let index = dirs.findIndex(dir => dir.dir === from.slice(0, -1));
        dirs[index] = {
            dirname: value,
            dir: to,
            isNew: false
        };
        setCloudDir([...dirs])

    }

    const handleDirBlur = (e, file) => {
        // 创建文件夹
        if (file.isNew) {
            manager.createDir(file.id)
                .then(() => {
                    message.success('创建文件夹成功');
                    if (file.dirname === value) {
                    } else {
                        let newDir = {
                            isNew: false,
                            dirname: value,
                            dir: searchObj.prefix + '/' + value,
                            id: searchObj.prefix + '/' + value + '/',
                        };
                        setCloudDir({...dirsObj, [newDir.id]: newDir})
                    }
                });
        } else {
            // 先copy
            let from = file.dir + '/';
            let to = searchObj.prefix + '/' + value;
            // 这里做出提示，重名提示
            let existDir = dirs.find(dir => {
                return dir.dirname === value
            });
            if (existDir) {
                success({
                    title: '文件夹已存在',
                    content: `${value}文件夹已存在，不可重命名`,
                    icon: <ExclamationCircleOutlined/>,
                })
            } else {
                renameDir(from, to, value)
                    .then(() => message.success("重命名文件夹成功"));
            }
        }
        setInputStat(false);
        hideCloudContextMenu(e);
    };

    const renameObject = async (from, to, file, value) => {
        await manager.copyFile(from, to);
        await extraManager.deleteDir(from);
        // // 重新设置
        delete objectsObj[from];
        objectsObj[to] = {
            extname: file.extname,
            size: file.size,
            filename: value,
            id: to,
            serverUpdatedAt: +new Date(),
            url: file.url.slice(0, -file.filename.length) + value
        };
        setCloudObjects(objectsObj)
    };

    const handleFileBlur = (e, file) => {
        let from = file.id;
        let to = searchObj.prefix + '/' + value;
        if (objectsObj[to]) {
            success({
                title: '文件已存在',
                content: `${value}文件已存在，不可重命名`,
                icon: <ExclamationCircleOutlined/>,
            })
        } else {
            renameObject(from, to, file, value)
                .then(() => message.success("重命名文件夹成功"));
        }
        setInputStat(false);
        hideCloudContextMenu(e);
    };

    const onDirBlur = (e, item) => {
        if (item.isNew || item.dirname !== value) {
            handleDirBlur(e, item)
        } else {
            setInputStat(false);
            hideCloudContextMenu(e)
        }
    };

    const handleTitleChange = e => {
        setValue(e.target.value);
    };

    const onObjectsBlur = (e, item) => {
        if (item.filename !== value) {
            handleFileBlur(e, item)
        } else {
            setInputStat(false);
            hideCloudContextMenu(e)
        }
    };

    const hideCloudContextMenu = (e) => {
        setCloudFileContextMenuInfo({
            showContextMenu: false,
            position: {
                left: 0,
                top: 0
            },
            file: {},
            type: '',
        })
    };

    useEffect(() => {
        const handler = e => {
            if (e.target.classList.contains('upload-main') || e.target.classList.contains('main-content')) {

            }
            hideCloudContextMenu(e);
        };
        const contextMenuHandler = e => {
            if (e.target.classList.contains('upload-main') || e.target.classList.contains('main-content') || getParentNode(e.target, 'cloud-item')) {
                return;
            }
            hideCloudContextMenu(e);
        };

        document.addEventListener('click', handler);
        document.addEventListener('contextmenu', contextMenuHandler);

        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('contextmenu', contextMenuHandler);
        }
    }, []);

    const handleCreateDir = () => {
        // 先向内存中添加，将其置为修改状态
        let title = 'new_folder';
        // 找到内存中同名的文件夹
        let sameNameDirs = dirs.filter(dir => {
            return dir.dirname.includes(title) && !Number.isNaN(+dir.dirname.slice(title.length))
        });
        let maxSuffixDir = sameNameDirs[sameNameDirs.length - 1];
        if (maxSuffixDir) {
            title = title + (+maxSuffixDir.dirname.slice(title.length) + 1);
        }
        let newDir = {
            dirname: title,
            dir: searchObj.prefix + '/' + title,
            id: searchObj.prefix + '/' + title + '/',
            isNew: true
        };
        setCloudDir({...dirsObj, newDir});
        setInputStat(newDir.dirname);
        setValue(newDir.dirname)
    };

    const handleFileContextMenu = (event, type, item) => {
        setCloudFileContextMenuInfo({
            showContextMenu: true,
            position: {
                left: event.clientX,
                top: event.clientY
            },
            type,
            file: item
        })
    };

    const downloadFile = useCallback((file) => {
        const key = file.id;
        let filePath = downloadPath + '/' + +new Date() + '_' + file.filename;
        manager.downloadFile_v2(key, filePath)
            .then(data => {
                if (data.code === 0) {
                    message.success("下载成功")
                } else {
                    message.error("下载失败")
                }
            })
            .catch(() => message.error("服务器异常"))
    }, [searchObj]);

    const FileContextMenu = useCallback(({position, type, file}) => {
        let contextMenuData;
        if (type === 'file') {
            contextMenuData = [
                {
                    id: '1',
                    title: '下载文件',
                    onClick: function () {
                        downloadFile(file)
                    }
                },
                {
                    id: '2',
                    title: '复制',
                    onClick: function () {
                        copyFileToRam(file)
                    }
                },
                {
                    id: '3',
                    title: '重命名',
                    onClick: function () {
                        setInputStat(file.filename);
                        setValue(file.filename);
                    }
                },
                {
                    id: '4',
                    title: '删除',
                    onClick: function () {
                        handleDelete(file)
                    }
                },
                {
                    id: '5',
                    title: '属性',
                    onClick: function () {
                        openInfoModal(file)
                    }
                },
            ]
        } else if (type === 'dir') {
            contextMenuData = [
                {
                    id: '1',
                    title: '打开',
                    onClick: function () {
                        let url = page + '?prefix=' + file.dir;
                        history.push(url)
                    }
                },
                {
                    id: '2',
                    title: '复制',
                    onClick: function () {
                        copyFileToRam(file)
                    }
                },
                {
                    id: '3',
                    title: '删除',
                    onClick: function () {
                        handleDelete(file)
                    }
                },
                {
                    id: '4',
                    title: '重命名',
                    onClick: function () {
                        setInputStat(file.dirname);
                        setValue(file.dirname);
                        // 先copy再删除
                    }
                },
            ]
        } else if (type === 'menu') {
            contextMenuData = [
                {
                    id: '1',
                    title: '新建文件夹',
                    onClick: function () {
                        handleCreateDir();
                    }
                },
                {
                    id: '2',
                    title: '刷新',
                    onClick: function () {
                        handleRefresh();
                    }
                },
                {
                    id: '3',
                    title: '上传markdown文件',
                    onClick: function () {
                        uploadFile()
                    }
                },
            ];
            if (copyFile && copyFile.file) {
                contextMenuData.push({
                    id: '4',
                    title: '粘贴',
                    onClick: function () {
                        handlePaste(copyFile.file, copyFile.curPrefix);
                    }
                })
            }
        }
        return (
            <AntList
                style={{
                    left: position.left,
                    top: position.top
                }}
                className={'upload-file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item onClick={e => {
                            hideCloudContextMenu(e);
                            dataItem.onClick(e);
                        }} className={'upload-file-context-menu-item'}
                                      key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [location, objects, dirs]);

    const handlePaste = async (file, curPrefix) => {
        if (file.extname) {
            let exist = objectsObj[file.id];
            if (exist) {
                message.error(`已存在${file.filename}文件，无法粘贴`);
                return
            }
        } else {
            let exist = dirsObj[file.id];
            if (exist) {
                message.error(`已存在${file.dirname}文件夹，无法粘贴`);
                return
            }
        }
        let from = file.id;
        let to = searchObj.prefix;
        let data = await extraManager.listDir(from);
        // 拷贝文件到to
        await Promise.all(data.map(async (item) => {
            let name = item.name.replace(curPrefix, to);
            await manager.copyFile(item.name, name);
        }));
        // 新增内存文件
        if (file.extname) {
            // 文件
            setCloudObjects({...objectsObj, [file.id]: file})
        } else {
            // 文件夹
            setCloudDir({...dirs, [file.id]: file})
        }
    };

    const openInfoModal = useCallback(file => {
        let url = isImage(file.extname) ? Pic : File;
        info({
            mask: false,
            title: file.filename,
            icon: <span className="anticon property-icon"><img src={url} alt=""/></span>,
            content: (
                <div className={"property-content"}>
                    <p><span>大小:</span>{formatSize(file.size)}</p>
                    <p><span>修改时间:</span>{timeStampToString(file.serverUpdatedAt)}</p>
                </div>
            ),
            onOk() {
            },
        })
    }, []);

    const breadNavs = searchObj && searchObj.prefix ? searchObj.prefix.split('/').slice(1) : [];

    useEffect(() => {
        getData();
    }, [location]);

    const handleGoBack = () => {
        if (searchObj.prefix.indexOf('/') !== -1) {
            let prefix = searchObj.prefix.slice(0, searchObj.prefix.lastIndexOf('/'));
            let url = page + '?prefix=' + prefix;
            history.push(url);
        }
    };

    const handleRefresh = () => {
        history.replace(page + '?prefix=' + searchObj.prefix);
    };

    // 点击上传文件
    const uploadFile = useCallback(async (files) => {
        let uploadFiles;
        if (!files) {
            let status = await remote.dialog.showOpenDialog({
                title: '选择上传的markdown文件',
                properties: ['openFile', 'multiSelections'],
                filters: [
                    {name: 'Markdown files', extensions: ['md']}
                ]
            });
            if (!status.canceled) {
                let files = status.filePaths;
                uploadFiles = files.map(file => {
                    let fileName = nodePath.basename(file);
                    let {size} = fs.statSync(file);
                    return {
                        src: file,
                        dst: searchObj.prefix + '/' + fileName,
                        size,
                    }
                });
            }
        } else {
            uploadFiles = files
        }
        if (uploadFiles && uploadFiles.length) {
            extraManager.putList(uploadFiles, {thread: 10})
                .then(data => {
                    if (uploadFiles.length === 1) {
                        message.success(`成功上传了${nodePath.basename(uploadFiles[0].src)}`);
                    } else {
                        message.success(`成功上传了${uploadFiles.length}个文件`);
                    }
                    getData();
                })
                .catch((err) => {
                    message.error("上传失败")
                });
        }
    }, [searchObj]);

    const handleDrag = e => {
        e.preventDefault()
    };

    const handleDrop = async e => {
        let importedFiles = e.dataTransfer.files;
        let filteredFiles = Array.from(importedFiles).filter(file => file.name.slice(-3) === '.md');
        let normalizedFiles = filteredFiles.map(file => {
            return {
                src: file.path,
                dst: searchObj.prefix + '/' + file.name,
                size: file.size,
            }
        });
        uploadFile(normalizedFiles)
    };

    const handleUploadContextMenu = e => {
        if (e.target.classList.contains('upload-main') || e.target.classList.contains('main-content')) {
            setCloudFileContextMenuInfo({
                showContextMenu: true,
                position: {
                    left: e.clientX,
                    top: e.clientY
                },
                type: 'menu',
            })
        }
    };

    const copyFileToRam = file => {
        setCopyFile({file, curPrefix: searchObj.prefix});
        message.success((file.extname ? '文件' : '文件夹') + "已复制")
    };

    return (
        <React.Fragment>
            <div className="container"
                 onDrag={handleDrag}
                 onDragOver={handleDrag}
                 onContextMenu={handleUploadContextMenu}
                 onDrop={handleDrop}>
                <div className="main">
                    <div className="upload-header">
                        <div className="op">
                            <LeftOutlined onClick={handleGoBack}/>
                            <RedoOutlined onClick={handleRefresh}/>
                        </div>
                        <div className="nav">
                            <Breadcrumb>
                                {
                                    breadNavs.length ? breadNavs.map((item, index) => (
                                        <Breadcrumb.Item key={index}>{item}</Breadcrumb.Item>
                                    )) : ''
                                }
                            </Breadcrumb>
                        </div>
                    </div>
                    <div
                        className="upload-main">
                        <div
                            className="main-content">
                            {
                                dirs && dirs.length ? (
                                    dirs.map((item, index) => (
                                        <Card
                                            key={index}
                                            hoverable
                                            onClick={hideCloudContextMenu}
                                            onDoubleClick={() => handleDbClick(item)}
                                            onContextMenu={e => handleFileContextMenu(e, 'dir', item)}
                                            className={"item cloud-item " + (active === item.id ? 'cloud-item-active' : '')}
                                            cover={<img alt="文件夹" src={Folder}/>}>
                                            {
                                                inputStat === item.dirname ?
                                                    <Input autoFocus onBlur={e => onDirBlur(e, item)} value={value}
                                                           onChange={handleTitleChange}/> :
                                                    <Meta title={item.dirname}/>
                                            }
                                        </Card>
                                    ))
                                ) : ''
                            }
                            {
                                objects && objects.length ? (
                                    objects.map((item, index) => {
                                            let url = isImage(item.extname) ? item.url : File;
                                            let additionClassName = isImage(item.extname) ? 'pic' : '';
                                            return (
                                                <Card
                                                    key={index}
                                                    hoverable
                                                    onDoubleClick={() => downloadFile(item)}
                                                    onContextMenu={e => handleFileContextMenu(e, 'file', item)}
                                                    className={"item cloud-item " + (active === item.id ? 'cloud-item-active' : '')}
                                                    cover={<img className={additionClassName} alt="文件" src={url}/>}>
                                                    {
                                                        inputStat === item.filename ?
                                                            <Input autoFocus onBlur={(e) => onObjectsBlur(e, item)}
                                                                   value={value}
                                                                   onChange={handleTitleChange}/> :
                                                            <Meta title={item.filename}/>
                                                    }
                                                </Card>)
                                        }
                                    )) : ''
                            }
                            {
                                (dirs && dirs.length) || (objects && objects.length || loading) ?
                                    <Card
                                        onClick={() => uploadFile()}
                                        key={'plus'}
                                        hoverable
                                        className="item plus"
                                        cover={<PlusOutlined className={'plus-folder'}/>}>
                                    </Card> : ''
                            }
                        </div>
                    </div>
                </div>
            </div>
            {
                cloudContextMenuInfo.showContextMenu ?
                    <FileContextMenu {...cloudContextMenuInfo}/> : ''
            }
        </React.Fragment>
    )

}
