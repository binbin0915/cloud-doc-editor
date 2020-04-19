import React, {useEffect, useState, useCallback} from 'react'
import {message, Table, Modal} from 'antd'
import {DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined} from '@ant-design/icons'
import NotLogin from '../commonComponent/NotLogin'
import {useSelector} from "react-redux";
import {obj2Array} from "../../utils/helper";
import {readFile, deleteFile as deleteSysFile} from '../../utils/fileHelper'
import {timeStampToString} from '../../utils/helper'
import useAction from "../../hooks/useAction";
import * as action from '../../store/action'
import events from '../../utils/eventBus'
import './download.css'

const nodePath = window.require('path');
const fs = window.require('fs');
const {manager, staticManager} = require('../../utils/aliOssManager');

const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});
const {confirm} = Modal;

const columns = [
    {
        title: '#',
        dataIndex: 'id',
        key: 'id',
    },
    {
        title: '文件名',
        dataIndex: 'title',
        key: 'title',
    },
    {
        title: '最后一次上传',
        dataIndex: 'serverUpdatedAt',
        key: 'serverUpdatedAt',
        render(text, record) {
            return <span>{timeStampToString(record.serverUpdatedAt)}</span>
        }
    },
    {
        title: '操作',
        key: 'action',
        render: (text, record) => {
            return <Action record={record}/>
        },
    },
];
const downloadLocation = settingsStore.get('savedFileLocation');

const Action = ({record}) => {
    const {addFile, deleteCloudFile, deleteFile, renameRamFile} = useAction(action);
    const userId = settingsStore.get('user').id;
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    record.isNewlyCreate = false;
    // 查看内存中是否有该文件
    // 查看默认下载路径是否有同名文件，若有则提示是否覆盖
    const handleDownload = useCallback(() => {
        if (downloadLocation) {
            let newPath = nodePath.join(downloadLocation, `${record.title}.md`);
            let exist = fs.existsSync(newPath);
            // 本地存在该文件，若内存中也存在该文件的时候
            let localFile = files[record.id];
            let samePathFile = obj2Array(files).find(file => file.filePath === newPath);
            // 如果这个内存中的这个文件已经被loaded了，我们需要更新其内容为云端文件的内容
            if (localFile) {
                record.filePath = localFile.filePath;
                record.isLoaded = localFile.isLoaded;
            } else {
                record.isLoaded = false;
                record.filePath = nodePath.join(downloadLocation, `${record.title}.md`);
            }
            if (exist) {
                handleConfirm({
                    title: `下载路径已存在${record.title}.md文件`,
                    content: '是否覆盖原有文件',
                    successCallback() {
                        manager.downloadFile(`${userId}/${record.title}:${record.id}`, record.filePath)
                            .then(({code}) => {
                                if (code === 0) {
                                    message.success("下载成功");
                                    // 如果内存中有该文件，
                                    // 相当于重新命名内存中的文件
                                    if (localFile) {
                                        if (record.isLoaded) {
                                            readFile(record.filePath)
                                                .then(data => {
                                                    record.body = data;
                                                })
                                        }
                                        addFile(record);
                                    }
                                    if (samePathFile) {
                                        if (renameRamFile.isLoaded) {
                                            readFile(record.filePath)
                                                .then(data => {
                                                    record.body = data;
                                                })
                                        }
                                        renameRamFile(samePathFile, record)
                                    }

                                } else {
                                    message.error("下载失败");
                                }
                            })
                            .catch(err => console.log(err))
                    }
                })
            } else {
                manager.downloadFile(`${userId}/${record.title}:${record.id}`, record.filePath)
                    .then(({code}) => {
                        if (code === 0) {
                            message.success("下载成功");
                            addFile(record);
                        } else {
                            message.error("下载失败");
                        }
                    })
                    .catch(err => console.log(err))
            }
        }
    }, [files]);

    const handleConfirm = ({title, content, successCallback}) => {
        confirm({
            title: title,
            icon: <ExclamationCircleOutlined/>,
            content: content,
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: successCallback,
            onCancel() {
                // do nothing
            },
        });
    };

    const handleFileDelete = useCallback(() => {
        const handleDeleteOnlyCloud = () => {
            handleConfirm({
                title: '确定要删除云端文件吗？',
                content: '删除之后无法恢复，请谨慎操作',
                successCallback() {
                    manager.deleteFile(`${userId}/${record.title}:${record.id}`)
                        .then(() => {
                            deleteCloudFile(record);
                            message.success("删除成功");
                        })
                        .catch(() => {
                            message.error("服务器连接失败")
                        })
                }
            })
        };
        // 如果开启了云同步，进行提示
        if (autoSync) {
            // 查找在内存中有没有该文件，若有进行提示
            let localFile = files[record.id];
            if (localFile) {
                record.filePath = localFile.filePath;
                handleConfirm({
                    title: '确定要删除云端文件吗？',
                    content: '已开启云同步，删除云端文件会删除本地文件，确定要删除吗',
                    successCallback() {
                        manager.deleteFile(`${userId}/${record.title}:${record.id}`)
                            .then(() => {
                                deleteCloudFile(record);
                                deleteFile(record);
                                // 调整openFileIds和activeFileId
                                if (openedFileIds.includes(record.id)) {
                                    events.emit('delete-file', record.id);
                                }
                                // 如果存在该文件则删除
                                if (fs.existsSync(record.filePath)) {
                                    deleteSysFile(record.filePath);
                                }
                                message.success("删除成功");
                            })
                            .catch((error) => {
                                console.log(error);
                                message.error("服务器连接失败")
                            })
                    }
                });
            } else {
                handleDeleteOnlyCloud()
            }
        } else {
            handleDeleteOnlyCloud()
        }
    }, [autoSync]);
    return (
        <React.Fragment>
            <DownloadOutlined style={{fontSize: 16, cursor: 'pointer'}} className={'download-icon'} onClick={handleDownload}/>
            <DeleteOutlined style={{fontSize: 16, cursor: 'pointer'}} onClick={handleFileDelete} className={'download-icon'}/>
        </React.Fragment>
    )
};
export default function () {
    const [loading, setLoading] = useState(true);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const searchFiles = useSelector(state => state.getIn(['App', 'searchFiles'])).toJS();
    const cloudFiles = useSelector(state => state.getIn(['App', 'cloudFiles'])).toJS();
    const {setSearchType, setCloudFiles, setSearchValue} = useAction(action);
    useEffect(() => {
        setSearchType('cloud');
        setSearchValue('');
        if (loginInfo.user) {
            const userId = loginInfo.user.id;
            const prefix = `${userId}/`;
            staticManager.list({prefix})
                .then(({objects}) => {
                    // 这里img资源和md资源会排在一起，所以要将他们分开
                    let mdArr = [];
                    objects.map(object => {
                        if (nodePath.extname(object.name) === '.md') {
                            let {name, lastModified} = object;
                            let title = name.slice(prefix.length, name.indexOf(':'));
                            let id = name.slice(name.indexOf(':') + 1, name.indexOf('.md'));
                            let serverUpdatedAt = +new Date(lastModified);
                            mdArr.push({
                                id,
                                title,
                                serverUpdatedAt,
                                isSynced: true,
                                isNewlyCreate: false
                            });
                        }
                    });
                    setCloudFiles(mdArr);
                    setLoading(false);
                })
        }
    }, []);

    const filteredFiles = searchFiles.length ? searchFiles : cloudFiles;

    return (
        <React.Fragment>
            {
                loginInfo && loginInfo.user && loginInfo.user.id ? (
                    <Table
                        loading={loading}
                        pagination={
                            {
                                total: filteredFiles.length,
                                pageSize: 5
                            }
                        }
                        className={'cloud-file-list'}
                        rowKey={record => record.id}
                        dataSource={filteredFiles}
                        columns={columns}/>
                ) : (
                    <NotLogin text={'你还未登录'}/>
                )
            }
        </React.Fragment>
    )

}
