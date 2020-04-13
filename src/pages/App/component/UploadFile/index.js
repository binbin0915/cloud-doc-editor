import React from 'react'
import {Table} from 'antd'
import {UploadOutlined} from '@ant-design/icons'
import NotLogin from '../commonComponent/NotLogin'
import useAction from "@/pages/App/hooks/useAction";
import {useSelector} from "react-redux";
import {obj2Array} from "@/utils/helper";
import './upload.css'
import {readFile, copyFile, writeFile, deleteFile} from '@/utils/fileHelper'
import * as action from "../../store/action";
import uploadFile from "@/utils/uploadFileWithImg";


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
    return (
        <UploadOutlined onClick={() => uploadFile(record, loginInfo.user ,addFile)} className={'upload-icon'}/>
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
