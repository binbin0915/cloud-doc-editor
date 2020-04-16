import React, {useCallback, useEffect, useRef} from 'react'
import {useSelector} from 'react-redux'
import Editor from 'for-editor'
import {Col, List as AntList, message, Modal, Tabs} from 'antd'
import List from '../List'
import './editorMain.css'
import BottomButton from '../BottomButton'
import {obj2Array} from '@/utils/helper'
import useAction from '../../hooks/useAction'
import * as actions from '../../store/action'
import events from '@/utils/eventBus'
import {readFile, copyFile, writeFile, deleteFile as deleteSysFile} from '@/utils/fileHelper'
import uuidv4 from "uuid/v4";
import {getParentNode} from "@/utils/helper";
import {ExclamationCircleOutlined, CloseOutlined} from "@ant-design/icons";

const nodePath = window.require('path');
const fs = window.require('fs');

const {ipcRenderer, shell} = window.require('electron');

const {AliOSS} = require('@/utils/aliOssManager');
const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});
const endpoint = settingsStore.get('endpoint');
const access = settingsStore.get('accessKey');
const secret = settingsStore.get('secretKey');
const bucket = settingsStore.get('bucketName');

const manager = new AliOSS({
    accessKeyId: access,
    endpoint: endpoint,
    accessKeySecret: secret,
    bucket: bucket,
});
const uploadDir = settingsStore.get('upload-dir');

const {confirm} = Modal;

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const searchFiles = useSelector(state => state.getIn(['App', 'searchFiles'])).toJS();
    const filesArr = obj2Array(files);
    const activeKey = useSelector(state => state.getIn(['App', 'activeFileId']));
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    const contextMenuInfo = useSelector(state => state.getIn(['App', 'contextMenuInfo'])).toJS();
    const tabContextMenuInfo = useSelector(state => state.getIn(['App', 'tabContextMenuInfo'])).toJS();
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const {removeFile, changeActiveKey, setFileLoaded, changeOpenedFiles, deleteFile, saveFile, addFile, addFiles, handleContextMenu, handleTabContextMenu} = useAction(actions);
    const openedFiles = filesArr.filter(file => openedFileIds.findIndex(id => id === file.id) !== -1);

    const handleDeleteFile = useCallback(file => {
        confirm({
            title: '要删除文件吗',
            content: `确定要删除${file.title}.md吗？`,
            icon: <ExclamationCircleOutlined/>,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                deleteSysFile(file.filePath)
                    .then(() => {
                        deleteFile(file.id);
                        message.success('删除成功');
                    })
                    .catch((err) => {
                        message.error('该文件已被删除');
                        deleteFile(file.id);
                    })
            },
            onCancel() {
                // do nothing
            },
        });
    }, []);

    const handleClick = useCallback(file => {
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
                        deleteFile(file.id);
                    });
            } else {
                changeActiveKey(file.id);
            }
        }
    }, [openedFileIds, files, activeKey]);

    const FileContextMenu = useCallback(({position, file}) => {
        const contextMenuData = [
            {
                id: '1',
                title: '打开',
                onClick: function () {
                    handleClick(file);
                    hideContextMenu();
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
                        <AntList.Item onClick={() => {
                            hideContextMenu();
                            dataItem.onClick(file);
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
            },
            {
                id: '2',
                title: '关闭所有',
            },
            {
                id: '3',
                title: '关闭左侧',
            },
            {
                id: '4',
                title: '关闭右侧',
            },
            {
                id: '5',
                title: '关闭其他',
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
                            className={'file-context-menu-item'}
                            key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [openedFileIds, files, activeKey]);

    useEffect(() => {
        events.on('delete-file', targetKey => {
            remove(targetKey)
        });
    }, []);

    const uploadFile = async (record) => {
        let content = '';
        if (record.isLoaded) {
            content = record.body;
        } else {
            content = await readFile(record.filePath)
        }
        const pattern = /!\[(.*?)\]\((.*?)\)/mg;
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
            if (result.length) {
                let newContent = '';
                for (let imgItem of result) {
                    let urlArr = imgItem.url.split('/');
                    let tempName = urlArr[urlArr.length - 1];
                    let extname = nodePath.extname(tempName);
                    let imgName = nodePath.basename(tempName, extname);
                    // TODO 文件不存在时的处理
                    if (!fs.existsSync(nodePath.join(uploadDir, tempName))) {
                        message.error(`${tempName}${extname}文件不存在`);
                        return;
                    } else {
                        try {
                            await manager.uploadFile(`${userId}/img/${imgName}`, nodePath.join(uploadDir, tempName), {type: extname});
                            let url = await manager.getImgUrl(`${userId}/img/${imgName}${extname}`);
                            newContent = content.replace(pattern, `![${imgItem.alt}](${url})`);
                        } catch (e) {
                            // do nothing
                        }
                    }
                }
                record.body = newContent;
            }
            // 上传文件
            manager.uploadFile(`${userId}/${record.title}:${record.id}`, record.filePath)
                .then(({code}) => {
                    if (code === 0) {
                        // 保存到本地
                        writeFile(record.filePath, record.body)
                            .then(() => {
                                addFile(record);
                                message.success('文件已保存，上传成功');
                                // 删去本地图片
                                result.map(async imgItem => {
                                    let urlArr = imgItem.url.split('/');
                                    let tempName = urlArr[urlArr.length - 1];
                                    let filePath = nodePath.join(uploadDir, tempName);
                                    await deleteFile(filePath)
                                });
                            })
                            .catch(() => {
                                message.error('文件已保存，上传失败');
                            });
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
                deleteFile(activeKey);
            }
        }
    }, [activeKey, files]);

    const handleContentOnEdit = useCallback((targetKey, action) => {
        eval(action)(targetKey)
    }, [openedFileIds]);

    // TODO remove有问题
    const remove = useCallback(targetKey => {
        // let lastIndex = 0;
        const newOpenedFileIds = openedFileIds.filter(fileId => fileId !== targetKey);
        console.log(newOpenedFileIds);
        let curFileIndex = openedFileIds.findIndex(fileId => targetKey === fileId);
        changeOpenedFiles(newOpenedFileIds);
        if (newOpenedFileIds.length === 0) {
            changeActiveKey('');
            return
        }
        let key;
        if (newOpenedFileIds.length === 1) {
            key = newOpenedFileIds[0];
        }
        // 关闭的是已激活的tab
        if (targetKey === activeKey) {
            if (curFileIndex === 0) { // 当前激活的tab在第一个的位置，则正在编辑第二个
                key = newOpenedFileIds[0];
            } else { // 当前激活的tab在其他的位置，则正在编辑前一个
                key = newOpenedFileIds[curFileIndex - 1];
            }
        }
        // console.log(newOpenedFileIds, key);
        // changeActiveKey(key);
        handleTabChange(key);
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
                    deleteFile(activeKey);
                })
        }
    }, [activeKey, files, remove]);

    const handleAddImg = useCallback(file => {
        // 上传图片到本地 static文件夹
        let fileName = copyFile(file.path);
        let activeFile = files[activeKey];
        activeFile.body += `![alt](/static/${fileName})`;
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

        if (importedFiles.length === 1) {
            let path = importedFiles[0].path;
            if (nodePath.extname(path) !== '.md') {
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
                }
            })
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
                }
            })
        }
    };

    useEffect(() => {
        const handler = e => {
            hideTabContextMenu(e);
            hideContextMenu(e);
        };
        document.addEventListener('click', handler);
        document.addEventListener('contextmenu', handler);

        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('contextmenu', handler);
        }
    }, []);

    const onContextMenu = (e, file) => {
        if (document.querySelector('.drag').contains(e.target)) {
            let {clientX: left, clientY: top} = event;
            handleTabContextMenu({
                showContextMenu: true,
                position: {
                    left,
                    top
                },
                file
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
                                onContextMenu={e => onContextMenu(e, pane)}
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
            </Col>
            {
                contextMenuInfo.showContextMenu ?
                    <FileContextMenu file={contextMenuInfo.file} position={contextMenuInfo.position}/> : ''
            }
            {
                tabContextMenuInfo.showContextMenu ?
                    <TabContextMenu file={tabContextMenuInfo.file} position={tabContextMenuInfo.position}/> : ''
            }
        </React.Fragment>
    )
}
