/**
 * 右侧顶部展开文件列表组件
 * @author ainuo5213
 * @date 2020-02-17
 */
import React, {useRef, useState} from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faTimes} from '@fortawesome/free-solid-svg-icons'
import './index.css'
import Modal from "../Modal";
import {getParentNode} from "../../../../utils/helper";

const {remote} = window.require('electron');
const {Menu, MenuItem} = remote;
const label = {
    label1: '保存',
    label2: '不保存',
    label3: '取消'
};
const TabList = ({
                     files,
                     activeId,
                     unSavedIds,
                     onTabClick,
                     onCloseTab,
                     handleSave,
                     handleUnSave,
                     onFileSave,
                     closeOther,
                     closeAll,
                     closeLeft,
                     closeRight,
                     openedFileIds,
                     onFileRemove,
                     showInExplorer
                 }) => {
    const [active, setActive] = useState(false);
    const [closeId, setCloseId] = useState('');

    // 点击li的处理事件
    const handleClick = (e, id) => {
        e.stopPropagation();
        e.preventDefault();
        onTabClick(id)
    };

    // 点击关闭的处理事件
    const handleClose = (e, id) => {
        e.preventDefault();
        const withUnsavedMark = unSavedIds.includes(id);
        if (withUnsavedMark) {
            setActive(true);
            setCloseId(id);
        } else {
            onCloseTab(id)
        }
    };

    const clickedElement = useRef(null);
    const closeRef = useRef(null);

    // 右键上下文菜单
    const handleContextMenu = e => {
        e.preventDefault();
        const itemArr = [
            {
                label: '保存',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        onFileSave(files.find(file => file.id === parentElement.dataset['id']))
                            .then(() => console.log('文件已保存'))
                    }
                }
            },
            {
                label: '移除',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        onFileRemove(parentElement.dataset['id'])
                            .then(() => console.log('文件已保存'))
                    }
                }
            },
            {
                label: '关闭',
                click: () => {
                    closeRef.current.click()
                }
            },
            {
                label: '关闭其他',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        closeOther(parentElement.dataset['id'])
                    }
                }
            },
            {
                label: '关闭所有',
                click: () => {
                    closeAll()
                }
            },
            {
                label: '关闭左边所有',
                visible: (function () {
                    const parentElement = getParentNode(e.target, 'tab-item');
                    const id = parentElement.dataset['id'];
                    return id !== openedFileIds[0];
                })(),
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        closeLeft(parentElement.dataset['id'])
                    }
                }
            },
            {
                label: '关闭右边所有',
                visible: (function () {
                    const parentElement = getParentNode(e.target, 'tab-item');
                    const id = parentElement.dataset['id'];
                    return id !== openedFileIds[openedFileIds.length - 1];
                })(),
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        closeRight(parentElement.dataset['id'])
                    }
                }
            },
            {
                label: '在文件夹打开',
                click: () => {
                    const parentElement = getParentNode(clickedElement.current, 'tab-item');
                    if (parentElement) {
                        showInExplorer(parentElement.dataset['id'])
                    }
                }
            },
        ];
        const menu = new Menu();
        itemArr.forEach(item => {
            menu.append(new MenuItem(item))
        });
        if (document.querySelector('.tab-list').contains(e.target)) {
            menu.popup({window: remote.getCurrentWindow()});
            clickedElement.current = e.target
        }
    };
    return (
        <React.Fragment>
            <ul className={'nav nav-pills tablist-component tab-list'}>
                {
                    files.map(file => {
                        const withUnsavedMark = unSavedIds.includes(file.id);
                        const finalClassName = classNames({
                            'nav-link': true,
                            active: file.id === activeId,
                            'with-unsaved': withUnsavedMark // 没有保存的标记
                        });
                        return (
                            <li
                                data-id={file.id}
                                onContextMenu={handleContextMenu}
                                className={'nav-item tab-item'} key={file.id}>
                                <a href="#" className={finalClassName}
                                   onClick={e => handleClick(e, file.id)}>
                                    {file.title}
                                    <span ref={closeRef} className={'ml-2 close-icon'}
                                          onClick={e => handleClose(e, file.id)}>
                                        <FontAwesomeIcon icon={faTimes}/>
                                    </span>
                                    {
                                        withUnsavedMark &&
                                        <span className={'ml-2 rounded-circle unsaved-icon'}/>
                                    }
                                </a>
                            </li>
                        )
                    })
                }
            </ul>
            <Modal
                onLabel1Click={() => {
                    handleSave(closeId);
                    setActive(false);
                    onCloseTab(closeId);
                }}
                onLabel2Click={() => {
                    onCloseTab(closeId);
                    // 将file.editorValue赋值成file.body
                    handleUnSave(closeId)
                }}
                onLabel3Click={() => {
                    setActive(false);
                }}
                active={active}
                message={'该文件还未保存，是否关闭'} title={'保存文件'}
                label={label}
            />
        </React.Fragment>
    )
};

TabList.propTypes = {
    files: PropTypes.array,
    activeId: PropTypes.string,
    unSavedIds: PropTypes.array,
    onTabClick: PropTypes.func,
    onCloseTab: PropTypes.func,
    handleSave: PropTypes.func,
    handleUnSave: PropTypes.func,
    onFileSave: PropTypes.func,
    closeOther: PropTypes.func,
    closeAll: PropTypes.func,
    closeLeft: PropTypes.func,
    closeRight: PropTypes.func,
    openedFileIds: PropTypes.array,
    onFileRemove: PropTypes.func,
    showInExplorer: PropTypes.func
};

TabList.defaultProps = {
    unSavedIds: []
};

export default TabList

