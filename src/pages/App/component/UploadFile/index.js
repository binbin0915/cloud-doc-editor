import React, {useEffect, useState} from 'react'
import {message, Table} from 'antd'
import {UploadOutlined} from '@ant-design/icons'
import axios from '@/utils/http'
import NotLogin from '../commonComponent/NotLogin'
import useAction from "@/pages/App/hooks/useAction";
import {useSelector} from "react-redux";
import {obj2Array} from "@/utils/helper";
import './upload.css'
import {readFile, copyFile, writeFile, deleteFile} from '@/utils/fileHelper'
import * as action from "../../store/action";

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

const dataSource = [
    {
        key: '1',
        name: '胡彦斌',
        age: 32,
        address: '西湖区湖底公园1号',
    },
    {
        key: '2',
        name: '胡彦祖',
        age: 42,
        address: '西湖区湖底公园1号',
    },
];

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


const manager = new AliOSS({
    accessKeyId: access,
    region: region,
    accessKeySecret: secret,
    bucket: bucket
});

const uploadDir = settingsStore.get('upload-dir');

const Action = ({record}) => {
    const {addFile} = useAction(action);
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
        const userId = settingsStore.get('user').id;
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
    };
    return (
        <UploadOutlined onClick={() => uploadFile(record)} className={'upload-icon'}/>
    )
};

export default function () {
    const [user, setUser] = useState(settingsStore.get('user'));
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const filesArr = obj2Array(files);
    useEffect(() => {
        // 查看登录与否
        let token = settingsStore.get('token');
        axios.post('/user/isLogin', {token})
            .then(({code, data}) => {
                // 用户已登陆
                if (code === 0) {
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

    return (
        <React.Fragment>
            {
                user && user.id ? (
                    <Table pagination={
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
                    <NotLogin/>
                )
            }
        </React.Fragment>
    )

}
