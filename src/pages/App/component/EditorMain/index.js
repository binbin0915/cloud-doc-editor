import React, {useCallback, useEffect, useRef, useState} from 'react'
import {useSelector} from 'react-redux'
import Editor from 'for-editor'
import {Col, List as AntList, message, Tabs} from 'antd'
import List from '../List'
import './editorMain.css'
import BottomButton from '../BottomButton'
import {obj2Array} from '@/utils/helper'
import useAction from '../../hooks/useAction'
import * as actions from '../../store/action'
import events from '@/utils/eventBus'
import {readFile, copyFile, writeFile, deleteFile} from '@/utils/fileHelper'
import uuidv4 from "uuid/v4";
import {getParentNode} from "@/utils/helper";

const nodePath = window.require('path');
const fs = window.require('fs');

const {ipcRenderer} = window.require('electron');

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

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    const activeKey = useSelector(state => state.getIn(['App', 'activeFileId']));
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    const contextMenuInfo = useSelector(state => state.getIn(['App', 'contextMenuInfo'])).toJS();
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const {changeActiveKey, setFileLoaded, changeOpenedFiles, deleteFile, saveFile, addFile, addFiles, handleContextMenu} = useAction(actions);
    const openedFiles = filesArr.filter(file => openedFileIds.findIndex(id => id === file.id) !== -1);

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

    const ContextMenu = useCallback(({position, file}) => {
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
                title: '在文件中打开',
                onClick: function () {

                }
            },
            {
                id: '3',
                title: '在列表中移除',
                onClick: function () {

                }
            },
            {
                id: '4',
                title: '删除',
                onClick: function () {

                }
            },
            {
                id: '5',
                title: '重命名',
                onClick: function () {
                    events.emit('rename', file);
                    hideContextMenu();
                }
            }
        ];
        return (
            <AntList
                style={{left: position.left, top: position.top}}
                className={'file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item onClick={dataItem.onClick} className={'file-context-menu-item'}
                                      key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [openedFileIds, activeKey, files]);

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

    const remove = useCallback(targetKey => {
        // let lastIndex = 0;
        const newOpenedFileIds = openedFileIds.filter(fileId => fileId !== targetKey);
        changeOpenedFiles(newOpenedFileIds);
        if (newOpenedFileIds.length === 0) {
            changeActiveKey('');
            return
        }
        let curFileIndex = openedFileIds.findIndex(fileId => targetKey === fileId);
        let index;
        if (newOpenedFileIds.length === 1) {
            index = openedFileIds[0];
        }
        // 关闭的是已激活的tab
        if (targetKey === activeKey) {
            if (curFileIndex === 0) { // 当前激活的tab在第一个的位置，则正在编辑第二个
                index = openedFileIds[0];
            } else { // 当前激活的tab在其他的位置，则正在编辑前一个
                index = openedFileIds[curFileIndex - 1];
            }
        } else {
            index = openedFileIds[curFileIndex - 1];
        }
        changeActiveKey(index);
        handleTabChange(index);
    }, [openedFileIds]);

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

    const hideContextMenu = () => {
        let parentNode = getParentNode(event.target, 'list-item');
        if (parentNode) {

        } else {
            handleContextMenu({showContextMenu: false, position: {left: 0, top: 0}})
        }
    };

    return (
        <React.Fragment>
            <Col className={'editor-list'} span={4}>
                <div
                    onContextMenu={hideContextMenu}
                    onClick={hideContextMenu}
                    className={'context-menu'}>
                    <List handleClick={handleClick} files={filesArr}/>
                </div>
                <BottomButton/>
            </Col>
            <Col className={'editor'} span={20}>
                <div
                    onContextMenu={hideContextMenu}
                    onClick={hideContextMenu}
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
                            >
                                {openedFiles.map(pane => {
                                    return <Tabs.TabPane closable={true} key={pane.id} tab={pane.title}>
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
                    <ContextMenu file={contextMenuInfo.file} position={contextMenuInfo.position}/> : ''
            }
        </React.Fragment>
    )
}
