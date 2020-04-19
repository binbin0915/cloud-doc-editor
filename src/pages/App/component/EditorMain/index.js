import React, {useCallback, useEffect, useRef} from 'react'
import {useSelector} from 'react-redux'
import Editor from 'for-editor'
import {Col, List as AntList, message, Modal, Tabs} from 'antd'
import List from '../List'
import './editorMain.css'
import BottomButton from '../BottomButton'
import {obj2Array} from '../../utils/helper'
import useAction from '../../hooks/useAction'
import * as actions from '../../store/action'
import events from '../../utils/eventBus'
import {readFile, writeFile, deleteFile as deleteSysFile} from '../../utils/fileHelper'
import uuidv4 from "uuid/v4";
import {getParentNode, timeStampToString} from "../../utils/helper";
import {ExclamationCircleOutlined, CloseOutlined} from "@ant-design/icons";

const nodePath = window.require('path');
const fs = window.require('fs');

const {ipcRenderer, shell} = window.require('electron');

const {manager} = require('../../utils/aliOssManager');
const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});

const {confirm} = Modal;

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const searchFiles = useSelector(state => state.getIn(['App', 'searchFiles'])).toJS();
    const filesArr = obj2Array(files);
    const activeKey = useSelector(state => state.getIn(['App', 'activeFileId']));
    const activeFile = files[activeKey];
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    const contextMenuInfo = useSelector(state => state.getIn(['App', 'contextMenuInfo'])).toJS();
    const tabContextMenuInfo = useSelector(state => state.getIn(['App', 'tabContextMenuInfo'])).toJS();
    const fileListContextMenuInfo = useSelector(state => state.getIn(['App', 'fileListContextMenuInfo'])).toJS();
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const {
        handleFileListContextMenu,
        removeFile,
        changeActiveKey,
        setFileLoaded,
        changeOpenedFiles,
        deleteFile,
        saveFile,
        addFile,
        addFiles,
        handleContextMenu,
        handleTabContextMenu,
        setSearchValue
    } = useAction(actions);
    const openedFiles = filesArr.filter(file => openedFileIds.includes(file.id));

    const handleDeleteFile = useCallback(file => {
        const handleDelete = ({title, content, successCallback}) => {
            confirm({
                title,
                content,
                icon: <ExclamationCircleOutlined/>,
                okText: '确定',
                okType: 'danger',
                cancelText: '取消',
                onOk: successCallback,
                onCancel() {
                    // do nothing
                },
            });
        };
        if (autoSync) {
            handleDelete({
                title: '要删除文件吗',
                content: `已开启云同步，删除本地文件会删除云端文件，确定要删除${file.title}.md吗？`,
                successCallback() {
                    manager.deleteFile(`${loginInfo.user.id}/${file.title}:${file.id}`)
                        .then(() => {
                            deleteSysFile(file.filePath)
                                .then(() => {
                                    deleteFile(file);
                                    message.success('删除成功');
                                })
                                .catch((err) => {
                                    message.error('该文件已被删除');
                                    deleteFile(file);
                                })
                        });
                }
            });
        } else {
            handleDelete({
                title: '要删除文件吗',
                content: `确定要删除${file.title}.md吗？`,
                successCallback() {
                    deleteSysFile(file.filePath)
                        .then(() => {
                            deleteFile(file);
                            message.success('删除成功');
                        })
                        .catch((err) => {
                            message.error('该文件已被删除');
                            deleteFile(file);
                        })
                }
            });
        }
    }, [autoSync]);

    const handleClick = useCallback((e, file) => {
        if (!file.isNewlyCreate) {
            const newOpenedFileIds = [...openedFileIds.filter(id => file.id !== id), file.id];
            changeOpenedFiles(newOpenedFileIds);
            if (!file.loaded) {
                readFile(file.filePath)
                    .then(data => {
                        changeActiveKey(file.id);
                        setFileLoaded(file.id, data);
                    })
                    .catch(err => {
                        // 文件已被删除
                        message.error('文件已被删除');
                        deleteFile(file);
                    });
            } else {
                changeActiveKey(file.id);
            }
        }
        hideContextMenu(e);
    }, [openedFileIds, files, activeKey]);

    const FileContextMenu = useCallback(({position, file}) => {
        const contextMenuData = [
            {
                id: '1',
                title: '打开',
                onClick: function (e) {
                    handleClick(e, file);
                }
            },
            {
                id: '2',
                title: '在文件夹中打开',
                onClick: function () {
                    shell.showItemInFolder(file.filePath);
                }
            },
            {
                id: '3',
                title: '在列表中移除',
                onClick: function () {
                    removeFile(file);
                    if (openedFileIds.includes(file.id)) {
                        remove(file.id);
                    }
                }
            },
            {
                id: '4',
                title: '删除',
                onClick: function () {
                    handleDeleteFile(file)
                }
            },
            {
                id: '5',
                title: '重命名',
                onClick: function () {
                    events.emit('rename', file);
                }
            }
        ];
        return (
            <AntList
                style={{
                    left: position.left,
                    top: position.top
                }}
                className={'file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item onClick={e => {
                            hideContextMenu(e);
                            dataItem.onClick(e);
                        }} className={'file-context-menu-item'}
                                      key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [openedFileIds, activeKey, files]);

    const FileListContextMenu = useCallback(({position, file}) => {
        const contextMenuData = [
            {
                id: '1',
                title: '新建文件',
                onClick: function () {
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
                    addFile(newFile);
                }
            },
            {
                id: '2',
                title: '导入文件',
                onClick: function () {
                    events.emit('import-files');
                }
            },
            {
                id: '3',
                title: '在文件夹中打开',
                onClick: function () {
                    shell.showItemInFolder(settingsStore.get('savedFileLocation'));
                }
            },
            {
                id: '4',
                title: '搜索文件',
                onClick: function () {
                    setSearchValue('');
                    events.emit('focus-search');
                }
            },
        ];
        return (
            <AntList
                style={{
                    left: position.left,
                    top: position.top
                }}
                className={'file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item onClick={e => {
                            hideFileListContextMenu(e);
                            dataItem.onClick(e);
                        }} className={'file-context-menu-item'}
                                      key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [openedFileIds, activeKey, files]);

    const TabContextMenu = useCallback(({position, file}) => {
        const contextMenuData = [
            {
                id: '1',
                title: '关闭',
                onClick() {
                    remove(file.id)
                }
            },
            {
                id: '2',
                title: '关闭所有',
                onClick() {
                    changeActiveKey('');
                    changeOpenedFiles([]);
                }
            },
            {
                id: '3',
                title: '关闭左侧',
                onClick() {
                    const curIndex = openedFiles.findIndex(curFile => curFile.id === file.id);
                    const newOpenedFiles = openedFiles.filter((curFile, index) => index >= curIndex);
                    const newOpenedFileIds = newOpenedFiles.map(file => file.id);
                    changeOpenedFiles(newOpenedFileIds);
                }
            },
            {
                id: '4',
                title: '关闭右侧',
                onClick() {
                    const curIndex = openedFiles.findIndex(curFile => curFile.id === file.id);
                    const newOpenedFiles = openedFiles.filter((curFile, index) => index <= curIndex);
                    const newOpenedFileIds = newOpenedFiles.map(file => file.id);
                    changeOpenedFiles(newOpenedFileIds);
                }
            },
            {
                id: '5',
                title: '关闭其他',
                onClick() {
                    changeOpenedFiles([file.id]);
                    changeActiveKey(file.id);
                }
            }
        ];
        return (
            <AntList
                style={{
                    left: position.left,
                    top: position.top
                }}
                className={'file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item
                            onClick={dataItem.onClick}
                            className={'file-context-menu-item'}
                            key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [openedFileIds, files, activeKey]);

    useEffect(() => {
        const handler = targetKey => {
            remove(targetKey)
        };
        events.on('delete-file', handler);
        return () => {
            events.off('delete-file', handler);
        }
    }, []);

    const uploadFile = async (record) => {
        let content = '';
        if (record.isLoaded) {
            content = record.body;
        } else {
            content = await readFile(record.filePath)
        }
        // 匹配本地路径的图片
        const pattern = /!\[(.*?)\]\((file:\/\/\/.*?)\)/mg;
        const result = [];
        // 提取出本地路径的图片进行上传
        let matcher;

        while ((matcher = pattern.exec(content)) !== null) {
            if (!/https?:\/\//mg.test(matcher[2])) {
                result.push({
                    alt: matcher[1],
                    url: matcher[2]
                });
            }
        }
        if (loginInfo && loginInfo.user && loginInfo.user.id) {
            const userId = loginInfo.user.id;
            let uploadFile = {...record};
            if (result.length) {
                let newContent = '';
                for (let imgItem of result) {
                    let url = imgItem.url;
                    let extname = nodePath.extname(url);
                    let imgName = nodePath.basename(url, extname);
                    let protocol = 'file:///';
                    let realPath = nodePath.resolve(protocol, url.slice(protocol.length));
                    // TODO 文件不存在时的处理
                    if (!fs.existsSync(realPath)) {
                        message.error(`${url}文件不存在`);
                        return;
                    } else {
                        try {
                            await manager.uploadFile(`${userId}/img/${imgName}`, realPath, {type: extname});
                            let url = await manager.getImgUrl(`${userId}/img/${imgName}${extname}`);
                            console.log(url);
                            newContent = content.replace(pattern, `![${imgItem.alt}](${url})`);
                        } catch (e) {
                            // do nothing
                        }
                    }
                }
                uploadFile.body = newContent;
            }
            // 上传文件
            manager.uploadFile(`${userId}/${uploadFile.title}:${uploadFile.id}`, uploadFile.filePath)
                .then(({code}) => {
                    if (code === 0) {
                        record.serverUpdatedAt = +new Date();
                        record.isSynced = true;
                        // 这里会存在一种情况就是，本地文件名改变之后上传到云时，file id会重复
                        addFile(record);
                        // 保存到本地
                        message.success('文件已保存，上传成功');
                    } else {
                        message.error('文件已保存，上传失败');
                    }
                });
        }
    };

    useEffect(() => {
        let activeFile = files[activeKey];
        if (activeFile && !activeFile.loaded) {
            // 读取文件
            try {
                readFile(activeFile.filePath).then(data => {
                    setFileLoaded(activeKey, data, addFile);
                })
            } catch (err) {
                // 文件已被删除
                message.error('文件已被删除');
                deleteFile(activeFile);
            }
        }
    }, [activeKey, files]);

    const handleContentOnEdit = useCallback((targetKey, action) => {
        eval(action)(targetKey)
    }, [openedFileIds]);

    useEffect(() => {
        const handler = id => {
            remove(id)
        };
        events.on('remove', handler);
        return () => {
            events.off('remove', handler);
        }
    }, [openedFileIds, activeKey]);

    const remove = useCallback(targetKey => {
        const newOpenedFiles = openedFiles.filter(file => file.id !== targetKey);
        const newOpenedFileIds = openedFileIds.filter(id => id !== targetKey);
        let curFileIndex = openedFiles.findIndex(file => targetKey === file.id);
        if (newOpenedFiles.length === 0) {
            changeActiveKey('');
            changeOpenedFiles([]);
            return
        }
        if (targetKey === activeKey) {
            if (curFileIndex === 0) { // 当前激活的tab在第一个的位置，则正在编辑第二个
                changeActiveKey(newOpenedFiles[0].id);
            } else { // 当前激活的tab在其他的位置，则正在编辑前一个
                changeActiveKey(newOpenedFiles[curFileIndex - 1].id);
            }
        }
        changeOpenedFiles(newOpenedFileIds);
    }, [openedFileIds, activeKey]);

    const handleTabChange = useCallback(activeKey => {
        changeActiveKey(activeKey);
        let activeFile = files[activeKey];
        if (activeFile && !activeFile.loaded) {
            readFile(activeFile.filePath)
                .then(data => {
                    setFileLoaded(activeKey, data);
                })
                .catch(() => {
                    message.error('文件已被删除');
                    deleteFile(activeFile);
                })
        }
    }, [activeKey, files, remove]);

    const handleAddImg = useCallback(file => {
        const path = '![' + file.name + '](file:///' + file.path.replace(/\\/g, '/') + ')';
        let activeFile = files[activeKey];
        activeFile.body += path;
        saveFile(activeFile);
        writeFile(activeFile.filePath, activeFile.body)
            .then(() => {
                if (autoSync) {
                } else {
                    message.success("上传图片成功");
                }
            })
            .catch(() => {
                // do nothing
                message.error("上传图片失败")
            });
    }, [files, activeKey, autoSync]);

    const timer = useRef(null);

    const handleValueChange = value => {
        const file = files[activeKey];
        file.body = value;
        saveFile(file);

        if (timer.current) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
            writeFile(file.filePath, value)
                .then(() => {
                })
                .catch(() => {
                    // do nothing
                })
        }, 2000);
    };

    const handleSave = useCallback(value => {
        writeFile(files[activeKey].filePath, value)
            .then(() => {
                if (autoSync) {
                    // TODO 执行上传文件的操作
                    uploadFile(files[activeKey])
                        .then(() => {
                        });
                } else {
                    message.success("保存文件成功");
                }
            })
            .catch(() => {
                // do nothing
                message.error("保存文件失败")
            })
    }, [files, activeKey, autoSync]);

    const handleDrag = e => {
        e.preventDefault()
    };

    const handleDrop = async e => {
        let importedFiles = e.dataTransfer.files;

        // 如果编辑器已打开，那么可上传图片
        if (importedFiles.length === 1) {
            let importedFile = importedFiles[0];
            let path = importedFile.path;
            // 导入的是图片，查看是否又打开的文件
            if (/image\/.+?/mg.test(importedFile.type)) {
                if (openedFileIds.length) {
                    handleAddImg({path, name: nodePath.basename(path)})
                } else {
                    message.error("导入的文件不是md")
                }
            }
            // 导入的是md
            else if (nodePath.extname(path) !== '.md') {
                message.error("导入的文件不是md")
            } else {
                let samePathFile = filesArr.find(file => file.filePath === path);
                if (samePathFile) {
                    message.error('文件已导入');
                    return;
                }
                readFile(path)
                    .then(data => {
                        const title = nodePath.basename(path, nodePath.extname(path));
                        message.success(`成功导入文件${title}`);
                        const id = uuidv4();
                        const file = {
                            id,
                            title,
                            body: data,
                            isNewlyCreate: false,
                            filePath: path
                        };
                        changeActiveKey(file.id);
                        const newOpenedFileIds = [...openedFileIds, file.id];
                        changeOpenedFiles(newOpenedFileIds);
                        addFile(file);
                    });
            }
        } else {
            const filteredFiles = Array.from(importedFiles).filter(file => {
                const isAlreadyAdded = filesArr.find(ramFile => {
                    return ramFile.filePath === file.path
                });
                return nodePath.extname(file.path) === '.md' && !isAlreadyAdded
            });
            let imPortedFilesArr = filteredFiles.map(file => {
                const title = nodePath.basename(file.path, nodePath.extname(file.path));
                const id = uuidv4();
                return {
                    id,
                    title,
                    isNewlyCreate: false,
                    filePath: file.path,
                    loaded: false
                };
            });
            addFiles(imPortedFilesArr);
            if (imPortedFilesArr.length) {
                message.success(`成功导入${imPortedFilesArr.length}个文件`);
            }
        }
    };

    const hideContextMenu = event => {
        let parentNode = getParentNode(event.target, 'list-item');
        if (parentNode) {

        } else {
            handleContextMenu({
                showContextMenu: false,
                position: {
                    left: 0,
                    top: 0
                },
                file: {}
            });
            // 打开上下文菜单
        }
    };

    const hideTabContextMenu = event => {
        let parentNode = getParentNode(event.target, 'inner');
        if (parentNode) {

        } else {
            handleTabContextMenu({
                showContextMenu: false,
                position: {
                    left: 0,
                    top: 0
                },
                file: {}
            })
        }
    };

    useEffect(() => {
        const handler = e => {
            hideTabContextMenu(e);
            hideContextMenu(e);
            hideFileListContextMenu(e);
        };
        const contextMenuHandler = e => {
            hideTabContextMenu(e);
            hideContextMenu(e);
            if (e.target.className !== 'context-menu') {
                hideFileListContextMenu(e);
            }
        };
        document.addEventListener('click', handler);
        document.addEventListener('contextmenu', contextMenuHandler);

        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('contextmenu', contextMenuHandler);
        }
    }, []);

    const onTabContextMenu = (e, file) => {
        let {clientX: left, clientY: top} = event;
        handleTabContextMenu({
            showContextMenu: true,
            position: {
                left,
                top
            },
            file
        })
    };

    const hideFileListContextMenu = e => {
        handleFileListContextMenu({
            showContextMenu: false,
            position: {
                left: 0,
                top: 0
            }
        })
    };

    const onFileListContextMenu = e => {
        if (e.target.className === 'context-menu') {
            let {clientX: left, clientY: top} = event;
            handleFileListContextMenu({
                showContextMenu: true,
                position: {
                    left,
                    top
                }
            })
        }
    };


    const filteredFiles = searchFiles.length ? searchFiles : filesArr;

    const renderTabBar = (props, DefaultTabBar) => {
        return (
            <div className={'outer'}>
                {
                    openedFiles.map(pane => {
                        return (
                            <div
                                onClick={() => {
                                    handleTabContextMenu({
                                        showContextMenu: false,
                                        position: {
                                            left: 0,
                                            top: 0
                                        }
                                    });
                                    handleTabChange(pane.id)
                                }}
                                className={'inner'}
                                onContextMenu={e => onTabContextMenu(e, pane)}
                                key={pane.id}>
                                <CloseOutlined className={'delete-icon'} onClick={e => {
                                    e.stopPropagation();
                                    remove(pane.id)
                                }}/>
                                <div className={props.activeKey === pane.id ? 'activeTab normalTab' : 'normalTab'}
                                     style={{textAlign: 'center'}}>{pane.title}</div>
                            </div>
                        )
                    })
                }
            </div>
        )
    };

    return (
        <React.Fragment>
            <Col className={'editor-list'} span={4}>
                <div
                    onClick={hideFileListContextMenu}
                    onContextMenu={onFileListContextMenu}
                    className={'context-menu'}>
                    <List handleDeleteFile={handleDeleteFile} handleClick={handleClick} files={filteredFiles}/>
                </div>
                <BottomButton/>
            </Col>
            <Col className={'editor'} span={20}>
                <div
                    className="drag"
                    onDrag={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}>
                    {
                        activeKey ? (
                            <Tabs
                                animated={{
                                    inkBar: true,
                                    tabPane: true
                                }}
                                activeKey={activeKey}
                                onChange={handleTabChange}
                                type={'editable-card'}
                                hideAdd={true}
                                className={'main-pane'}
                                onEdit={handleContentOnEdit}
                                renderTabBar={renderTabBar}
                            >
                                {openedFiles.map(pane => {
                                    return <Tabs.TabPane
                                        key={pane.id}
                                        closable={true}
                                        tab={pane.title}>
                                        <Editor
                                            subfield={true}
                                            preview={true}
                                            onSave={handleSave}
                                            value={pane.body}
                                            onChange={handleValueChange}
                                            addImg={handleAddImg}
                                        />
                                    </Tabs.TabPane>
                                })}
                            </Tabs>
                        ) : (
                            <div className={'start-page'}>
                                <span>选择或创建新的 markdown 文档</span>
                            </div>
                        )
                    }
                </div>
                {
                    activeFile && activeFile.isSynced && activeFile.serverUpdatedAt ?
                        <div className={'sync'}>已同步，上次同步{timeStampToString(activeFile.serverUpdatedAt)}</div> : ''
                }
            </Col>
            {
                contextMenuInfo.showContextMenu ?
                    <FileContextMenu file={contextMenuInfo.file} position={contextMenuInfo.position}/> : ''
            }
            {
                tabContextMenuInfo.showContextMenu ?
                    <TabContextMenu file={tabContextMenuInfo.file} position={tabContextMenuInfo.position}/> : ''
            }
            {
                fileListContextMenuInfo.showContextMenu ?
                    <FileListContextMenu position={fileListContextMenuInfo.position}/> : ''
            }
        </React.Fragment>
    )
}
