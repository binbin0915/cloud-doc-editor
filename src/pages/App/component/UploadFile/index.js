import React from 'react'
import {Table, message} from 'antd'
import {UploadOutlined} from '@ant-design/icons'
import NotLogin from '../commonComponent/NotLogin'
import useAction from "@/pages/App/hooks/useAction";
import {useSelector} from "react-redux";
import {obj2Array} from "@/utils/helper";
import './upload.css'
import {readFile, copyFile, writeFile, deleteFile} from '@/utils/fileHelper'
import * as action from "../../store/action";

const {AliOSS} = require('@/utils/aliOssManager');
const nodePath = window.require('path');
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
        title: '文件地址',
        dataIndex: 'filePath',
        key: 'filePath',
    },
    {
        title: '操作',
        key: 'action',
        render: (text, record) => {
            return <Action record={record}/>
        },
    },
];

const Action = ({record}) => {
    const {addFile} = useAction(action);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const uploadFile = async () => {
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
                    try {
                        await manager.uploadFile(`${userId}/img/${imgName}`, nodePath.join(uploadDir, tempName), {type: extname});
                        let url = await manager.getImgUrl(`${userId}/img/${imgName}${extname}`);
                        newContent = content.replace(pattern, `![${imgItem.alt}](${url})`);
                    } catch (e) {
                        // do nothing
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
                                message.success('上传成功');
                                // 删去本地图片
                                result.map(async imgItem => {
                                    let urlArr = imgItem.url.split('/');
                                    let tempName = urlArr[urlArr.length - 1];
                                    let filePath = nodePath.join(uploadDir, tempName);
                                    await deleteFile(filePath)
                                });
                            })
                            .catch(() => {
                                message.error('上传失败');
                            });
                    } else {
                        message.error('上传失败');
                    }
                });
        }
    };
    return (
        <UploadOutlined onClick={uploadFile} className={'upload-icon'}/>
    )
};

export default function () {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    return (
        <React.Fragment>
            {
                loginInfo && loginInfo.user && loginInfo.user.id ? (
                    <Table locale={{emptyText: '暂无文件需要上传'}} pagination={
                        {
                            total: filesArr.length,
                            pageSize: 5
                        }
                    }
                           className={'local-file-list'}
                           rowKey={record => record.id}
                           dataSource={filesArr}
                           columns={columns}/>
                ) : (
                    <NotLogin text={'你还未登录'}/>
                )
            }
        </React.Fragment>
    )

}
