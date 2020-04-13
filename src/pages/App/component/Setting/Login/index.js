import React, {useState} from 'react'
import {useHistory} from 'react-router-dom'
import {Form, Input, Button, message} from 'antd';
import {UserOutlined, LockOutlined} from '@ant-design/icons';
import axios from '@/utils/http'
import {isEmail} from '@/utils/helper'
import useAction from "../../../hooks/useAction";
import * as action from '../../../store/action'

const {settingsStore} = require('@/utils/store');

const Login = () => {
    const [loading, setLoading] = useState(false);
    const history = useHistory();
    const {setLoginInfo} = useAction(action);
    const handleSubmit = ({username, password}) => {
        let data = {};
        data.password = password;
        setLoading(true);
        !isEmail(username) ? (data.username = username) : (data.email = username);
        // 发送数据
        axios.post('/user/login', data)
            .then(({code, data}) => {
                setLoading(false);
                if (code === 0) {
                    settingsStore.set('token', data.token);
                    settingsStore.set('user', data.user);
                    setLoginInfo({token: data.token, user: data.user});
                    setLoading(false);
                    history.push('/editor')
                } else {
                    setLoading(false);
                    message.error('用户名或密码错误');
                }
            })
            .catch(() => {
                setLoading(false);
                message.error('网络连接异常');
            })
    };

    return (
        <div id="login" className="login-area">
            <Form
                onFinish={handleSubmit}
                name="normal_login">
                <Form.Item hasFeedback name="username" rules={[
                    {
                        required: true,
                        message: '请输入用户名',
                    },
                ]}>
                    <Input
                        type={'text'}
                        prefix={<UserOutlined className="site-form-item-icon"/>}
                        placeholder="用户名或邮箱"
                        id="success"/>
                </Form.Item>
                <Form.Item
                    hasFeedback
                    name="password"
                    rules={[
                        {
                            required: true,
                            message: '请输入密码',
                        },
                    ]}>
                    <Input
                        type={'password'}
                        prefix={<LockOutlined className="site-form-item-icon"/>}
                        placeholder="密码"
                        id="success"/>
                </Form.Item>

                <Form.Item>
                    <Button block loading={loading} htmlType={"submit"} type="primary"
                            className="login-form-button">
                        登录
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
};

export default Login
