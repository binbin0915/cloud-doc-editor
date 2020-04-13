import React, {useCallback, useEffect, useRef, useState} from 'react'
import {
    EditOutlined,
    CloseOutlined,
    FileMarkdownOutlined,
    ExclamationCircleOutlined,
    CheckOutlined
} from "@ant-design/icons";
import {List as AntList, Modal, Input} from "antd";
import useAction from "../../hooks/useAction";
import * as actions from '../../store/action'
import {useSelector} from "react-redux";
import {readFile, deleteFile as deleteSysFile, isExistSameFile, renameFile, writeFile} from '@/utils/fileHelper';
import events from '@/utils/eventBus'
import {message} from 'antd'
import {obj2Array} from '@/utils/helper'

const nodePath = window.require('path');
const Store = window.require('electron-store');

const settingsStore = new Store({
    name: 'Settings'
});
const {confirm} = Modal;

export default function ListItem({file}) {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const activeFileId = useSelector(state => state.getIn(['App', 'activeFileId']));
    const [editId, setEditId] = useState('');
    const inputRef = useRef(null);

    const [mouseEnter, setMouseEnter] = useState(false);
    const {changeOpenedFiles, changeActiveKey, setFileLoaded, deleteFile, addFile, renameRamFile} = useAction(actions);
    const [title, setTitle] = useState(file.title);

    const handleMouseEnter = useCallback(() => {
        setMouseEnter(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setMouseEnter(false);
    }, []);

    const handleOpenFile = useCallback(e => {
        if (!file.isNewlyCreate) {
            const newOpenedFileIds = [...openedFileIds, file.id];
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
    }, [openedFileIds, file, activeFileId]);

    useEffect(() => {
        if (editId) {
            inputRef.current.focus()
        }
    }, [editId]);

    useEffect(() => {
        if (file.isNewlyCreate) {
            setEditId(file.id)
        }
    }, [file.isNewlyCreate]);

    const handleFileDelete = useCallback(e => {
        e.stopPropagation();
        handleConfirm({
            title: '要删除文件吗',
            content: `确定要删除${file.title}.md吗？`,
            successCallback() {
                // 删除文件
                deleteSysFile(file.filePath)
                    .then(() => {
                        if (openedFileIds.includes(file.id)) {
                            // 兄弟组件通信
                            events.emit('delete-file', file.id);
                        }
                        deleteFile(file.id);
                        message.success('删除成功');
                    })
                    .catch((err) => {
                        message.error('该文件已被删除');
                        deleteFile(file.id);
                    })
            }
        });
    }, []);

    const handleInputChange = useCallback(e => {
        e.stopPropagation();
        setTitle(e.target.value);
    }, []);

    const doEdit = useCallback(e => {
        e.stopPropagation();
        setEditId(file.id);
        setTitle(file.title);
    }, []);

    const handleConfirm = ({title, content, successCallback}) => {
        confirm({
            title: title || '文件已存在，确定覆盖？',
            icon: <ExclamationCircleOutlined/>,
            content: content || `要覆盖${title}.md吗？`,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: successCallback,
            onCancel() {
                // do nothing
            },
        });
    };

    const handleFileNameChange = useCallback(e => {
        e.stopPropagation();
        let newName = `${title}.md`;
        // 新建的文件没有路径
        if (file.isNewlyCreate) {
            file.filePath = nodePath.join(settingsStore.get('savedFileLocation'), newName)
        }
        let filePath = file.filePath;
        let newPath = nodePath.join(nodePath.dirname(filePath), newName);
        if (file.title === title) {
            __handleClose();
            return;
        }
        // 去对应路径查找有无同路径的文件，再在内存中查找是否有同路径的文件
        isExistSameFile(nodePath.dirname(filePath), newName)
            .then(len => {
                if (len) {
                    // 提示
                    handleConfirm({
                        title: '文件已存在，确定覆盖？',
                        content: `要覆盖${title}.md吗？`,
                        successCallback() {
                            // 找到内存中的相同文件名的文件
                            const ramSameFiles = filesArr.filter(file => file.filePath === newPath);
                            // 除去自己
                            const sameNameFile = ramSameFiles && ramSameFiles.find(ramFile => ramFile.id !== file.id);
                            console.log(sameNameFile);
                            file.filePath = newPath;
                            file.title = title;
                            let isNew = file.isNewlyCreate;
                            // 磁盘上删去
                            renameFile(filePath, newName)
                                .then(() => {
                                    message.success(isNew ? "新建文件成功" : "重命名文件成功");
                                    file.title = title;
                                    file.filePath = newPath;
                                    if (isNew) {
                                        file.isNewlyCreate = false;
                                    }
                                    // 内存中删去
                                    renameRamFile(sameNameFile, file);
                                })
                                .catch(() => {
                                    message.error(isNew ? "新建文件失败" : "重命名文件失败");
                                });
                            __handleClose()
                        }
                    });
                } else {
                    let isNew = file.isNewlyCreate;
                    file.title = title;
                    if (isNew) {
                        file.filePath = newPath;
                        file.isNewlyCreate = false;
                        // 写内容到对应的路径
                        writeFile(newPath, file.body)
                            .then(() => {
                                addFile(file);
                                message.success("新建文件成功");
                            })
                            .catch(err => {
                                message.error("新建文件失败");
                            })
                    } else {
                        console.log(file.filePath);
                        // 直接覆盖
                        renameFile(file.filePath, newName)
                            .then(() => {
                                file.filePath = newPath;
                                addFile(file);
                                message.success("重命名文件成功");
                            })
                            .catch(err => {
                                console.log(err);
                                message.error("重命名文件失败");
                            })
                    }
                    __handleClose()
                }
            })
    }, [title, files]);

    const __handleClose = useCallback(() => {
        setEditId('');
        setTitle('');
    }, []);

    const handleInputClose = useCallback(e => {
        e.stopPropagation();
        if (file.isNewlyCreate) {
            deleteFile(file.id);
        } else {
            __handleClose();
        }
    }, []);

    return (
        <AntList.Item
            onClick={handleOpenFile}
            className={'list-item'}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {
                (file.id !== editId && !file.isNewlyCreate) && (
                    <React.Fragment>
                        <FileMarkdownOutlined/>
                        <span className={'title'}>{file.title}</span>
                        <div className="check-close">
                            {
                                mouseEnter ? (
                                    <React.Fragment>
                                        <EditOutlined onClick={doEdit} className={'item-icon'}/>
                                        <CloseOutlined className={'item-icon'} onClick={handleFileDelete}/>
                                    </React.Fragment>
                                ) : ''
                            }
                        </div>
                    </React.Fragment>
                )
            }
            {
                (file.id === editId || file.isNewlyCreate) && (
                    <React.Fragment>
                        <Input className={'rename-input'}
                               placeholder={'请输入文件名字'}
                               value={title}
                               ref={inputRef}
                               onChange={handleInputChange}/>

                        <div className="check-close">
                            <CheckOutlined onClick={handleFileNameChange} className={'item-icon'}/>
                            <CloseOutlined onClick={handleInputClose} className={'item-icon'}/>
                        </div>
                    </React.Fragment>
                )
            }
        </AntList.Item>
    )
}
