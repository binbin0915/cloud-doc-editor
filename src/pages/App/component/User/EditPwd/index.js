import React, {useState, useRef, useCallback} from "react";
import axios from '../../../utils/http'
import {Button, Form, Input, message} from "antd";
import {LockOutlined, MailOutlined, VerifiedOutlined} from "@ant-design/icons";
import {isEmail} from "../../../utils/helper";
import './editPwd.css'
import * as action from "../../../store/action";
import useAction from "../../../hooks/useAction";

function EditPwd(props) {
    const [loading, setLoading] = useState(false);
    const [codeText, setCodeText] = useState('发送验证码');
    const [disabled, setDisabled] = useState(false);
    const [email, setEmail] = useState("");
    const [emailStatus, setEmailStatus] = useState("");
    const [codeStatus, setCodeStatus] = useState("");
    const {setLoginInfo} = useAction(action);
    const timer = useRef(null);

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
                    setCodeText('发送验证码');
                    setDisabled(false);
                    clearInterval(timer.current);
                    message.error("网络连接异常")
                })
        } else {
            setEmailStatus('error');
            message.error("邮箱格式不正确")
        }
        return () => {
            clearInterval(timer.current)
        }
    }, [email]);

    const handleEmailChange = useCallback(e => {
        setEmail(e.target.value);
    }, [email]);

    const handleSubmit = ({password, email, verifyCode: verificationCode}) => {
        setLoading(true);
        axios.post('/user/editPwd', {
            password,
            email,
            verificationCode,
            type: "editPwd"
        })
            .then(({code, msg}) => {
                setLoading(false);
                if (code === 0) {
                    setLoginInfo({});
                    message.success("修改密码成功，前往登录");
                    props.history.push('/setting/login');
                } else {
                    message.error(msg);
                    if (code === 5) {
                        setCodeStatus('error');
                    } else if (code === 4) {
                        message.error("邮箱格式不正确");
                        setEmailStatus('error');
                    } else if (code === 6) {
                        message.error("不存在该用户");
                        setEmailStatus('error');
                    }
                }
            })
            .catch(() => {
                message.error("网络连接异常");
                setLoading(false);
            })
    };

    return (
        <div id="login" className="user-login-area">
            <Form
                onFinish={handleSubmit}
                name="normal_login"
                className="user-login-form">
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: '请输入确认邮箱',
                        },
                        {
                            type: 'email',
                            message: '邮箱格式不正确'
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
                    ]}
                    name="email"
                    hasFeedback
                    validateStatus={emailStatus}
                >
                    <Input
                        value={email}
                        onChange={handleEmailChange}
                        type={'text'}
                        prefix={<MailOutlined className="site-form-item-icon"/>}
                        placeholder="邮箱"/>
                </Form.Item>
                <Form.Item
                    rules={[
                        {
                            required: true,
                            message: '请输入密码',
                        }
                    ]}
                    name="password"
                    hasFeedback>
                    <Input
                        type={'password'}
                        prefix={<LockOutlined className="site-form-item-icon"/>}
                        placeholder="密码"/>
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
                                return Promise.reject('确认密码和密码不一致');
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
                    ]}
                    validateStatus={codeStatus}
                    type={'text'}
                    name="verifyCode">
                    <div className={"verify"}>
                        <Input prefix={<VerifiedOutlined className="site-form-item-icon"/>} placeholder="验证码"/>
                        <Button disabled={disabled} onClick={getVerify} type="primary"
                                className="verify">{codeText}</Button>
                    </div>
                </Form.Item>
                <Form.Item>
                    <Button block loading={loading} type="primary" htmlType="submit"
                            className="login-form-button">
                        修改密码
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

export default EditPwd
