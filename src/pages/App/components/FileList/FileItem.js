/**
 * 文件列表项目
 * @author ainuo5213
 * @date 2020-02-15
 */

import React, {useEffect, useState, useRef} from 'react'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faMarkdown} from "@fortawesome/free-brands-svg-icons";
import {faTimes, faEdit, faCheck} from "@fortawesome/free-solid-svg-icons";
import PropTypes from 'prop-types';
import useKeyPress from "../../hooks/useKeyPress";
import {getParentNode} from "../../../../utils/helper";

const {remote} = window.require('electron');
const {Menu, MenuItem} = remote;

const errorClass = 'error-input';

const FileItem = ({file, onFileClick, onSaveEdit, onFileDelete, onFileRemove, showInExplorer}) => {
    const enterPress = useKeyPress(13);
    const escPress = useKeyPress(27);
    const [display, setDisplay] = useState(false);
    const [editStatus, setEditStatus] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef(null);
    const [errorClassName, setErrorClassName] = useState('');

    // 关闭编辑
    const closeEdit = (deleteOrNot) => {
        setEditStatus(false);
        setValue('');
        if (deleteOrNot && file.isNewlyCreate) {
            onFileDelete(file.id);
        }
    };

    // 处理文件删除
    const handleFileDelete = () => {
        onFileDelete(file.id);
    };

    // 改变标题
    const changeTitle = e => {
        let trimmedValue = e.target.value.trim();
        if (trimmedValue === '') {
            setErrorClassName(errorClass)
        } else {
            setErrorClassName('')
        }
        setValue(trimmedValue)
    };

    // 处理保存时的异常情况
    const handleSave = (id, value) => {
        let trimmedValue = value.trim();
        if (trimmedValue === '') {
            setErrorClassName(errorClass);
        } else {
            onSaveEdit(id, value, file.isNewlyCreate);
            closeEdit(false);
        }
    };

    // ESC和enter的事件
    useEffect(() => {
        if (enterPress && editStatus) {
            // 新建文件且没名字
            handleSave(file.id, value);
        } else if (escPress && editStatus) {
            closeEdit(true);
        }
    });

    // 自动聚焦
    useEffect(() => {
        if (editStatus) {
            inputRef.current.focus()
        }
    }, [editStatus]);

    // 新建文件时的自动聚焦
    useEffect(() => {
        if (file.isNewlyCreate) {
            setEditStatus(file.id);
            setValue(file.title)
        }
    }, [file]);

    const clickedElement = useRef(null);

    // 右键contextmenu
    const handleContextMenu = e => {
        const itemArr = [
            {
                label: '打开',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'file-item');
                    if (parentElement) {
                        onFileClick(parentElement.dataset['id'])
                            .then(() => console.log('文件已打开'))
                    }
                }
            },
            {
                label: '在文件夹中展示',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'file-item');
                    showInExplorer(parentElement.dataset.id);
                }
            },
            {
                label: '重命名',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'file-item');
                    setEditStatus(parentElement.dataset.id);
                }
            },
            {
                label: '移除',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'file-item');
                    onFileRemove(parentElement.dataset.id);
                }
            },
            {
                label: '删除',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'file-item');
                    onFileDelete(parentElement.dataset.id)
                        .then(() => console.log('文件已删除'));
                }
            },
        ];
        const menu = new Menu();
        itemArr.forEach(item => {
            menu.append(new MenuItem(item))
        });
        if (document.querySelector('.file-list').contains(e.target)) {
            menu.popup({window: remote.getCurrentWindow()});
            clickedElement.current = e.target
        }
    };

    return (
        <li
            data-id={file.id}
            data-title={file.title}
            style={{height: 54}}
            onMouseLeave={() => setDisplay(false)}
            onMouseOver={() => setDisplay(true)}
            onContextMenu={handleContextMenu}
            className="list-group-item bg-light row d-flex align-items-center file-item mx-0">
            {
                (file.id !== editStatus && !file.isNewlyCreate) &&
                <React.Fragment>
                    <span className={'col-2'}>
                        <FontAwesomeIcon icon={faMarkdown}/>
                    </span>
                    <span
                        className="col-6 c-link"
                        onClick={() => onFileClick(file.id)}
                    >
                        {file.title}
                    </span>
                    {
                        display ?
                            <React.Fragment>
                                <button
                                    type={'button'}
                                    className={'icon-button col-1'}
                                    onClick={() => {
                                        // 启用重命名
                                        setEditStatus(file.id);
                                        setValue(file.title);
                                        setDisplay(false);
                                    }}
                                >
                                    <FontAwesomeIcon size={'xs'} title={'编辑'} icon={faEdit}/>
                                </button>
                                <button
                                    type={'button'}
                                    className={'icon-button col-1'}
                                    onClick={handleFileDelete}>
                                    <FontAwesomeIcon size={'xs'} title={'删除'} icon={faTimes}/>
                                </button>
                            </React.Fragment>
                            :
                            null
                    }
                </React.Fragment>
            }
            {
                (file.id === editStatus || file.isNewlyCreate) &&
                <React.Fragment>
                    <input
                        ref={inputRef}
                        type="text"
                        className={'form-control col-8 ' + errorClassName}
                        value={value}
                        placeholder={'请输入文件名称'}
                        onChange={e => changeTitle(e)}/>
                    <button
                        type={'button'}
                        className={'icon-button col-2'}
                        onClick={() => handleSave(file.id, value)}>
                        <FontAwesomeIcon icon={faCheck} size={'xs'}/>
                    </button>
                    <button
                        type={'button'}
                        className={'icon-button col-2'}
                        onClick={() => closeEdit(true)}>
                        <FontAwesomeIcon icon={faTimes} size={'xs'}/>
                    </button>
                </React.Fragment>
            }
        </li>
    )

};

FileItem.propTypes = {
    file: PropTypes.object,
    onFileClick: PropTypes.func,
    onSaveEdit: PropTypes.func,
    onFileDelete: PropTypes.func,
    onSaveFileName: PropTypes.func,
    onFileRemove: PropTypes.func,
    showInExplorer: PropTypes.func
};

export default FileItem
