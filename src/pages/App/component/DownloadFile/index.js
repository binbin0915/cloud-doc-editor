import React, {useEffect, useState, useCallback} from 'react'
import {message, Table, Modal} from 'antd'
import {DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined} from '@ant-design/icons'
import NotLogin from '../commonComponent/NotLogin'
import {useSelector} from "react-redux";
import Oss from 'ali-oss'
import {obj2Array} from "@/utils/helper";
import './download.css'
import {readFile, copyFile, writeFile, deleteFile, isExistSameFile} from '@/utils/fileHelper'
import {timeStampToString} from '@/utils/helper'
import useAction from "../../hooks/useAction";
import * as action from '../../store/action'

const nodePath = window.require('path');
const {AliOSS} = require('@/utils/aliOssManager');

const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});
const {confirm} = Modal;

const access = settingsStore.get('accessKey');
const secret = settingsStore.get('secretKey');
const bucket = settingsStore.get('bucketName');
const endpoint = settingsStore.get('endpoint');

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

const staticManager = new Oss({
    accessKeyId: access,
    endpoint: endpoint,
    accessKeySecret: secret,
    bucket: bucket,
});

const manager = new AliOSS({
    accessKeyId: access,
    endpoint: endpoint,
    accessKeySecret: secret,
    bucket: bucket,
});

const Action = ({record}) => {
    const {addFile, deleteCloudFile} = useAction(action);
    const userId = settingsStore.get('user').id;
    record.isNewlyCreate = false;
    // 查看默认下载路径是否有同名文件，若有则提示是否覆盖
    const handleDownload = useCallback(() => {
        if (downloadLocation) {
            record.filePath = nodePath.join(downloadLocation, `${record.title}.md`);
            isExistSameFile(nodePath.dirname(record.filePath), `${record.title}.md`)
                .then(len => {
                    if (len) {
                        Modal.confirm({
                            title: `下载路径已存在${record.title}md文件`,
                            content: '是否覆盖原有文件',
                            onOk() {
                                manager.downloadFile(`${userId}/${record.title}:${record.id}`, record.filePath)
                                    .then(({code}) => {
                                        if (code === 0) {
                                            message.success("下载成功");
                                            addFile(record);
                                        } else {
                                            message.error("下载失败");
                                        }
                                    })
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
                    }
                })
                .catch(() => {
                    // 不存在该下载路径
                })
        }
    }, []);

    const handleFileDelete = useCallback(() => {
        confirm({
            title: '确定要删除云端文件吗？',
            icon: <ExclamationCircleOutlined/>,
            content: '删除之后无法恢复，请谨慎操作',
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk(){
                manager.deleteFile(`${userId}/${record.title}:${record.id}`)
                    .then(() => {
                        deleteCloudFile(record);
                        message.success("删除成功");
                    })
                    .catch(() => {
                        message.error("服务器连接失败")
                    })
            },
            onCancel() {
                // do nothing
            },
        });
    }, []);
    return (
        <React.Fragment>
            <DownloadOutlined className={'download-icon'} onClick={handleDownload}/>
            <DeleteOutlined onClick={handleFileDelete} className={'download-icon'}/>
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
