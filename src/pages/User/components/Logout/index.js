import React, {useEffect, useState, useCallback} from "react";
import {Button, Form, Input, message} from 'antd'
import {UserOutlined} from "@ant-design/icons";
import axios from '@/utils/http'
import './index.css'
import event from '@/utils/eventBus'



const Store = window.require('electron-store');

const {handleClose} = require('@/utils/store');
const {ipcRenderer} = window.require('electron');
const settingsStore = new Store({
    name: 'Settings'
});


const Logout = () => {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(settingsStore.get('user'));
    const {setLoginInfo} = useAction(action);
    useEffect(() => {
        axios.post('/user/isLogin', {token: settingsStore.get('token')})
            .then(({code, data}) => {
                if (code === 0) {
                    setUser(data);
                    settingsStore.set('user', data);
                    setLoginInfo(data);
                    event.emit('loginInfo-change', data)
                } else {
                    settingsStore.set('user', null);
                    settingsStore.set('token', null);
                }
            })
    }, []);

    const handleLogout = useCallback(() => {
        setLoading(true);
        axios.post('/user/logout', {id: user.id})
            .then(({code, msg}) => {
                setLoading(false);
                if (code === 0) {
                    setLoginInfo({});
                    setUser(null);
                    settingsStore.set('user', null);
                    settingsStore.set('token', null);
                    message.success(msg);
                    ipcRenderer.send('user-offline');
                } else {
                    message.error(msg)
                }
            })
            .catch(() => setLoading(false))
    }, [user]);

    return (
        <div id="logout" className="logout-area mt-4">
            {
                user && user.email ? (
                        <Form
                            onFinish={handleLogout}
                            name="normal_login"
                            className="login-form">
                            <Form.Item name="username">
                                <Input
                                    readOnly={true}
                                    defaultValue={user && user.email}
                                    type={'text'}
                                    prefix={<UserOutlined className="site-form-item-icon"/>}/>
                            </Form.Item>
                            <Form.Item>
                                <Button loading={loading} type="primary" htmlType="submit"
                                        className="login-form-button">
                                    注销
                                </Button>
                                <Button onClick={handleClose} className="login-form-button">
                                    取消
                                </Button>
                            </Form.Item>
                        </Form>
                    ) :
                    <div className="login-form">
                        <span className={'not-login-info'}>您还未登录</span>
                        <Button onClick={handleClose} block>取消</Button>
                    </div>
            }
        </div>
    )
};
export default Logout
