import React, {useEffect, useState, useCallback} from 'react'
import {message, Table, Modal} from 'antd'
import {DownloadOutlined} from '@ant-design/icons'
import axios from '@/utils/http'
import NotLogin from '../commonComponent/NotLogin'
import useAction from "@/pages/App/hooks/useAction";
import {useSelector} from "react-redux";
import Oss from 'ali-oss'
import {obj2Array} from "@/utils/helper";
import './download.css'
import {readFile, copyFile, writeFile, deleteFile, isExistSameFile} from '@/utils/fileHelper'
import * as action from "../../store/action";
import {timeStampToString} from '@/utils/helper'

const nodePath = window.require('path');
const {AliOSS} = require('@/utils/aliOssManager');

const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});

const region = settingsStore.get('regionId');
const access = settingsStore.get('accessKey');
const secret = settingsStore.get('secretKey');
const bucket = settingsStore.get('bucketName');

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
    region: region,
    accessKeySecret: secret,
    bucket: bucket
});

const manager = new AliOSS({
    accessKeyId: access,
    region: region,
    accessKeySecret: secret,
    bucket: bucket
});

const Action = ({record}) => {
    const {addFile} = useAction(action);
    const userId = settingsStore.get('user').id;
    record.isNewlyCreate = false;
    // 查看默认下载路径是否有同名文件，若有则提示是否覆盖
    let handleDownload = useCallback(() => {
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
    return (
        <DownloadOutlined className={'download-icon'} onClick={handleDownload}/>
    )
};
export default function () {
    const [user, setUser] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // 查看登录与否
        let token = settingsStore.get('token');
        axios.post('/user/isLogin', {token})
            .then(({code, data}) => {
                // 用户已登陆
                if (code === 0) {
                    setUser(data);
                    settingsStore.set('user', data);
                } else {
                    setUser(null);
                    settingsStore.set('user', null);
                    settingsStore.set('token', null);
                }
            })
            .catch((err) => {
                message.error('连接服务器失败')
            })
    }, []);

    useEffect(() => {
        if (user) {
            const userId = settingsStore.get('user').id;
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
                                serverUpdatedAt
                            });
                        }
                    });
                    setFiles(mdArr);
                    setLoading(false);
                })
        }
    }, [user]);

    return (
        <React.Fragment>
            {
                user && user.id ? (
                    <Table
                        loading={loading}
                        pagination={
                            {
                                total: files.length,
                                pageSize: 5
                            }
                        }
                        className={'cloud-file-list'}
                        rowKey={record => record.id}
                        dataSource={files}
                        columns={columns}/>
                ) : (
                    <NotLogin text={'你还未登录'}/>
                )
            }
        </React.Fragment>
    )

}
