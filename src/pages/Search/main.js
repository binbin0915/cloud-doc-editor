import React, {useEffect, useState} from 'react'
import ReactDom from 'react-dom'
import Header from '../Settings/components/Header'
import axios from '@/utils/http'
import 'bootstrap/dist/css/bootstrap.min.css'
import './Search.css'

const {AliOSS} = require('@/utils/aliOssManager');
import {Button, message} from "antd";

const oss = require('ali-oss');
const {ipcRenderer} = window.require('electron');
const Store = window.require('electron-store');
const {handleClose} = require('@/utils/store');

const settingsStore = new Store({
    name: 'Settings'
});

const region = settingsStore.get('regionId');
const access = settingsStore.get('accessKey');
const secret = settingsStore.get('secretKey');
const bucket = settingsStore.get('bucketName');

const createStaticAliOss = () => {
    console.log(region, access, secret, bucket)
    return oss({
        region: region,
        accessKeyId: access,
        accessKeySecret: secret,
        bucket: bucket
    })
};

const createAliOss = () => {
    return new AliOSS({
        region: region,
        accessKeyId: access,
        accessKeySecret: secret,
        bucket: bucket
    })
};
function SearchFile() {
    const [user, setUser] = useState(settingsStore.get('user'));

    useEffect(() => {
        // 查看登录与否
        if (navigator.onLine) {
            let token = settingsStore.get('token');
            axios.post('/user/isLogin', {token})
                .then(({code, data}) => {
                    if (code === 0) {
                        setUser(data);
                        settingsStore.set('user', data);
                    } else {
                        settingsStore.set('user', null);
                        settingsStore.set('token', null);
                    }
                })
        }
    }, []);

    useEffect(() => {
        // 请求阿里云，得到云端文件
        if (navigator.onLine) {
            const userId = user ? user.id : null;
            if (userId) {
                const oss = createStaticAliOss();
                const prefix = `${userId}/`;
                oss.list({prefix})
                    .then(list => {
                        const files = list.objects || [];
                        // render
                    });
                // const manager = createAliOss();
                // const prefix = `${userId}/`;
            }
        }
    }, []);

    console.log(user);

    return (
        <React.Fragment>
            <Header className={'search'} text={'云文件下载'}/>
            {
                user && user.id ? (
                        <span>已登录, {navigator.onLine.toString()}</span>
                    ) :
                    <div className="login-form">
                        <span className={'not-login-info'}>您还未登录</span>
                        <Button onClick={handleClose} block>取消</Button>
                    </div>
            }
        </React.Fragment>
    )
}

ReactDom.render(
    <SearchFile/>
    , document.getElementById('root'));
