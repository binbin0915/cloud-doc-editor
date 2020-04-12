import React, {useCallback, useEffect, useRef, useState} from 'react'
import {useSelector} from 'react-redux'
import Editor from 'for-editor'
import {Col, message, Tabs} from 'antd'
import List from '../List'
import './editorMain.css'
import BottomButton from '../BottomButton'
import {obj2Array} from '@/utils/helper'
import useAction from '../../hooks/useAction'
import * as actions from '../../store/action'
import {readFile, copyFile, writeFile} from '@/utils/fileHelper'
import events from '@/utils/eventBus'

const {ipcRenderer} = window.require('electron');

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    const activeKey = useSelector(state => state.getIn(['App', 'activeFileId']));
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const {changeActiveKey, setFileLoaded, changeOpenedFiles, deleteFile, saveFile} = useAction(actions);
    const openedFiles = filesArr.filter(file => openedFileIds.findIndex(id => id === file.id) !== -1);

    events.on('delete-file', targetKey => {
        remove(targetKey)
    });

    useEffect(() => {
        let activeFile = files[activeKey];
        if (activeFile) {
            if (!activeFile.loaded) {
                // 读取文件
                try {
                    readFile(activeFile.filePath).then(data => {
                        setFileLoaded(activeKey, data);
                    })
                } catch (err) {
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
        // 关闭的是已激活的tab
        if (targetKey === activeKey) {
            let curFileIndex = openedFileIds.findIndex(fileId => targetKey === fileId);
            if (curFileIndex === 0) { // 当前激活的tab在第一个的位置，则正在编辑第二个
                changeActiveKey(openedFileIds[0]);
                handleTabChange(openedFileIds[0]);
            } else { // 当前激活的tab在其他的位置，则正在编辑前一个
                changeActiveKey(openedFileIds[curFileIndex - 1]);
                handleTabChange(openedFileIds[curFileIndex - 1]);
            }
        }
    }, [openedFileIds]);

    const handleTabChange = useCallback(activeKey => {
        changeActiveKey(activeKey);
        let activeFile = files[activeKey];
        console.log(activeFile);
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

    return (
        <React.Fragment>
            <Col className={'editor-list'} span={4}>
                <List files={filesArr}/>
                <BottomButton/>
            </Col>
            <Col className={'editor'} span={20}>
                {
                    activeKey ? (
                        <Tabs
                            animated={{inkBar: true, tabPane: true}}
                            activeKey={activeKey}
                            onChange={handleTabChange}
                            type={'editable-card'}
                            hideAdd={true}
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
            </Col>
        </React.Fragment>
    )
}
