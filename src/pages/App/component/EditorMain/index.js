import React, {useCallback, useEffect, useRef} from 'react'
import {useSelector} from 'react-redux'
import Editor from 'for-editor'
import {Col, message, Tabs} from 'antd'
import List from '../List'
import './editorMain.css'
import BottomButton from '../BottomButton'
import {obj2Array} from '@/utils/helper'
import useAction from '../../hooks/useAction'
import * as actions from '../../store/action'
import {copyFile, readFile, writeFile} from '@/utils/fileHelper'
import events from '@/utils/eventBus'
import uuidv4 from "uuid/v4";

const nodePath = window.require('path');

const {ipcRenderer} = window.require('electron');

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    const activeKey = useSelector(state => state.getIn(['App', 'activeFileId']));
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const {changeActiveKey, setFileLoaded, changeOpenedFiles, deleteFile, saveFile, addFile, addFiles} = useAction(actions);
    const openedFiles = filesArr.filter(file => openedFileIds.findIndex(id => id === file.id) !== -1);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    
    console.log(loginInfo);
    useEffect(() => {
        events.on('delete-file', targetKey => {
            remove(targetKey)
        });
    }, []);
    
    useEffect(() => {
        let activeFile = files[activeKey];
        if (activeFile) {
            if (!activeFile.loaded) {
                // 读取文件
                try {
                    readFile(activeFile.filePath).then(data => {
                        setFileLoaded(activeKey, data);
                    })
                }
                catch (err) {
                    // 文件已被删除
                    message.error('文件已被删除');
                    deleteFile(activeKey);
                }
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
            }
            else { // 当前激活的tab在其他的位置，则正在编辑前一个
                index = openedFileIds[curFileIndex - 1];
            }
        }
        else {
            index = openedFileIds[curFileIndex - 1];
        }
        changeActiveKey(index);
        handleTabChange(index);
    }, [openedFileIds]);
    
    const handleTabChange = useCallback(activeKey => {
        changeActiveKey(activeKey);
        let activeFile = files[activeKey];
        if (!activeFile.loaded) {
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
        console.log(activeFile);
        activeFile.body += `![alt](/static/${fileName})`;
        saveFile(activeFile);
        handleSave(activeFile.body);
    });
    
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
                    console.log('保存文件成功')
                })
                .catch(() => {
                    // do nothing
                })
        }, 2000);
    };
    
    const handleSave = useCallback(value => {
        writeFile(files[activeKey].filePath, value)
            .then(() => {
                message.success("保存文件成功")
            })
            .catch(() => {
                // do nothing
                message.success("保存文件失败")
            })
    }, [files, activeKey]);
    
    const handleDrag = e => {
        e.preventDefault()
    };
    
    const handleDrop = async e => {
        let importedFiles = e.dataTransfer.files;
        
        if (importedFiles.length === 1) {
            let path = importedFiles[0].path;
            if (nodePath.extname(path) !== '.md') {
                message.error("导入的文件不是md")
            }
            else {
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
        }
        else {
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
    
    return (
        <React.Fragment>
            <Col className={'editor-list'} span={4}>
                <List files={filesArr}/>
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
        </React.Fragment>
    )
}
