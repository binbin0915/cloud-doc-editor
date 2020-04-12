import React, {useCallback, useRef, useState} from "react";
import {Button, Form, Input, message} from "antd";
import {LockOutlined, MailOutlined, VerifiedOutlined} from "@ant-design/icons";
import axios from '@/utils/http'
import {isEmail} from "@/utils/helper";

const Store = window.require('electron-store');
const {handleClose} = require('@/utils/store');
const {ipcRenderer} = window.require('electron');

const settingsStore = new Store({
    name: 'Settings'
});

const EditPwd = (props) => {
    const [loading, setLoading] = useState(false);
    const [codeText, setCodeText] = useState('发送验证码');
    const [disabled, setDisabled] = useState(false);
    const [emailStatus, setEmailStatus] = useState("");
    const [email, setEmail] = useState("");
    const [codeStatus, setCodeStatus] = useState("");
    const timer = useRef(null);

    const handleEmailChange = useCallback(e => {
        setEmail(e.target.value);
    }, [email]);

    const handleSubmit = ({email, password, verifyCode: verificationCode}) => {
        setLoading(true);
        axios.post('/user/editPwd', {
            password,
            email,
            verificationCode,
            type: "editPwd"
        }).then(({code, msg}) => {
            setLoading(false);
            if (code === 0) {
                // 修改密码之后未登录
                message.success("修改密码成功，前往登录");
                settingsStore.set('user', null);
                settingsStore.set('token', null);
                ipcRenderer.send('user-offline');
                props.history.push('/login');
            } else {
                message.error(msg);
                if (code === 6) {
                    setEmailStatus('error');
                } else if (code === 5) {
                    setCodeStatus('error');
                }
            }
        }).catch(() => {
            message.error("网络连接异常");
            setLoading(false);
        })
    };

    const getVerify = useCallback(() => {
        if (email === "") {
            message.error("请输入邮箱");
            setEmailStatus('error');
        } else if (isEmail(email)) {
            setDisabled(true);
            let restTime = 60;
            timer.current = setInterval(() => {
                if (restTime <= 0) {
                    setCodeText('发送验证码');
                    setDisabled(false);
                    clearInterval(timer.current);
                    return;
                }
                setCodeText(`${restTime}s`);
                restTime--;
            }, 1000);
            axios.post('/mail/verification', {
                email,
                type: 'editPwd'
            })
                .then(({code, msg}) => {
                    if (code === 0) {
                        message.success("验证码已发送");
                    } else {
                        message.error(msg);
                    }
                })
                .catch(() => {
                    message.error("网络连接异常");
                    setCodeText('发送验证码');
                    setDisabled(false);
                    clearInterval(timer.current);
                })
        } else {
            setEmailStatus('error');
            message.error("邮箱格式不正确")
        }
        return () => {
            clearInterval(timer.current)
        }
    }, [email]);

    return (
        <div id="editPwd" className="edit-pwd-area mt-4">
            <Form
                onFinish={handleSubmit}
                name="normal_login"
                className="login-form">
                <Form.Item
                    hasFeedback
                    name="email"
                    validateStatus={emailStatus}
                    rules={[
                        {
                            required: true,
                            message: '请输入邮箱',
                        },
                        {
                            type: 'email',
                            message: '邮箱格式异常',
                        },
                        ({getFieldValue}) => ({
                            validator(rule, value) {
                                if (!value || isEmail(getFieldValue('email'))) {
                                    setEmailStatus("success");
                                    return Promise.resolve();
                                }
                                setEmailStatus("error");
                                return Promise.reject('');
                            },
                        }),
                    ]}>
                    <Input
                        value={email}
                        onChange={handleEmailChange}
                        type={'text'}
                        prefix={<MailOutlined className="site-form-item-icon"/>}
                        placeholder="邮箱"
                        id="success"/>
                </Form.Item>
                <Form.Item
                    hasFeedback name="password"
                    rules={[
                        {
                            required: true,
                            message: '请输入新密码',
                        },
                    ]}>
                    <Input
                        type={'password'}
                        prefix={<LockOutlined className="site-form-item-icon"/>}
                        placeholder="新密码"
                        id="success"/>
                </Form.Item>
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: '请输入确认密码',

                        },
                        ({getFieldValue}) => ({
                            validator(rule, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject('确认密码和新密码不一致');
                            },
                        }),
                    ]}

                    name="confirmPassword"
                    hasFeedback>
                    <Input
                        type={'password'}
                        prefix={<LockOutlined className="site-form-item-icon"/>}
                        placeholder="确认密码"/>
                </Form.Item>
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: '请输入验证码',
                        },
                        ({getFieldValue}) => ({
                            validator(rule, value) {
                                if (!value || isEmail(getFieldValue('email'))) {
                                    setCodeStatus("success");
                                    return Promise.resolve();
                                }
                                setCodeStatus("error");
                                return Promise.reject('');
                            },
                        }),
                    ]}
                    type={'text'}
                    validateStatus={codeStatus}
                    name="verifyCode">
                    <div className={"verify"}>
                        <Input prefix={<VerifiedOutlined className="site-form-item-icon"/>} placeholder="验证码"/>
                        <Button onClick={getVerify} disabled={disabled} type="primary"
                                className="verify">{codeText}</Button>
                    </div>
                </Form.Item>

                <Form.Item>
                    <Button loading={loading} htmlType={"submit"} type="primary"
                            className="login-form-button">
                        修改
                    </Button>
                    <Button onClick={handleClose} className="login-form-button">
                        取消
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
};

export default EditPwd
