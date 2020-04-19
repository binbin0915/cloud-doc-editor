import React, {useEffect} from 'react'
import {Table, message} from 'antd'
import {UploadOutlined} from '@ant-design/icons'
import NotLogin from '../commonComponent/NotLogin'
import useAction from "../../hooks/useAction";
import {useSelector} from "react-redux";
import {obj2Array} from "../../utils/helper";
import './upload.css'
import {readFile} from '../../utils/fileHelper'
import * as action from "../../store/action";

const {manager} = require('../../utils/aliOssManager');
const nodePath = window.require('path');
const fs = window.require('fs');

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
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const {addFile} = useAction(action);
    const uploadFile = async () => {
        let content = '';
        if (record.isLoaded) {
            content = record.body;
        } else {
            content = await readFile(record.filePath)
        }
        // 匹配本地路径的图片
        const pattern = /!\[(.*?)\]\((file:\/\/\/.*?)\)/mg;
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
            let uploadFile = {...record};
            if (result.length) {
                let newContent = '';
                for (let imgItem of result) {
                    let url = imgItem.url;
                    let extname = nodePath.extname(url);
                    let imgName = nodePath.basename(url, extname);
                    let protocol = 'file:///';
                    let realPath = nodePath.resolve(protocol, url.slice(protocol.length));
                    // TODO 文件不存在时的处理
                    if (!fs.existsSync(realPath)) {
                        message.error(`${url}文件不存在`);
                        return;
                    } else {
                        try {
                            await manager.uploadFile(`${userId}/img/${imgName}`, realPath, {type: extname});
                            let url = await manager.getImgUrl(`${userId}/img/${imgName}${extname}`);
                            console.log(url);
                            newContent = content.replace(pattern, `![${imgItem.alt}](${url})`);
                        } catch (e) {
                            // do nothing
                        }
                    }
                }
                uploadFile.body = newContent;
            }
            // 上传文件
            manager.uploadFile(`${userId}/${uploadFile.title}:${uploadFile.id}`, uploadFile.filePath)
                .then(({code}) => {
                    record.serverUpdatedAt = +new Date();
                    record.isSynced = true;
                    addFile(record);
                    if (code === 0) {
                        // 保存到本地
                        message.success('文件已保存，上传成功');
                    } else {
                        message.error('文件已保存，上传失败');
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
    const searchFiles = useSelector(state => state.getIn(['App', 'searchFiles'])).toJS();
    const filesArr = obj2Array(files);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const {setSearchType, setSearchValue} = useAction(action);
    useEffect(() => {
        setSearchType('local');
        setSearchValue('');
    }, []);
    console.log(searchFiles);
    const filteredFiles = searchFiles.length ? searchFiles : filesArr;
    return (
        <React.Fragment>
            {
                loginInfo && loginInfo.user && loginInfo.user.id ? (
                    <Table pagination={
                        {
                            total: filteredFiles.length,
                            pageSize: 5
                        }
                    }
                           className={'local-file-list'}
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
