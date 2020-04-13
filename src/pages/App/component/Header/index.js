import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {Col, Button, Checkbox, Dropdown, Menu, Input} from "antd";
import {
    UserOutlined,
    EditOutlined,
    CloudUploadOutlined,
    CloudDownloadOutlined,
    MenuOutlined,
    LineOutlined,
    FullscreenOutlined,
    CloseOutlined
    
} from '@ant-design/icons'
import axios from '@/utils/http'
import './header.css'
import {useSelector} from "react-redux";

const Store = window.require('electron-store');


const settingsStore = new Store({
    name: 'Settings'
});


const UserDropItem = function () {
    return (
        <Menu>
            <Menu.Item key={'/editPwd'} className={'header-drop-menu'}>
                修改密码
            </Menu.Item>
            <Menu.Item key={'/logout'} className={'header-drop-menu'}>
                注销
            </Menu.Item>
        </Menu>
    )
};

export default function Header() {
    const history = useHistory();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const handleEditorClick = useCallback(e => {
        history.push(e.key);
    }, []);
    
    useEffect(() => {
        axios.post('/user/isLogin', {token: settingsStore.get('token')})
            .then(({code, data}) => {
                if (code === 0) {
                    setUser(data);
                    settingsStore.set('user', data);
                }
                else {
                    settingsStore.set('user', null);
                    settingsStore.set('token', null);
                }
            });
    }, []);
    
    const SettingDropItem = useMemo(() => {
        const handleClick = ({item, key, keyPath, domEvent}) => {
            history.push(key);
        };
        return (
            <Menu onClick={handleClick}>
                <Menu.Item key={'/setting/settings'} className={'header-drop-menu'}>
                    设置
                </Menu.Item>
                <Menu.Item key={'/setting/login'} className={'header-drop-menu'}>
                    登录
                </Menu.Item>
                <Menu.Item key={'/setting/register'} className={'header-drop-menu'}>
                    注册
                </Menu.Item>
            </Menu>
        )
    }, []);
    
    
    return (
        <React.Fragment>
            <Col className={'header-left'} span={4}>
                {
                    loginInfo && loginInfo.user && loginInfo.user.id && (
                        <Dropdown overlay={UserDropItem}>
                            <Button size={'large'} className={'user-icon'} icon={<UserOutlined/>}/>
                        </Dropdown>
                    )
                }
                <Input.Search className={'header-search'}/>
            </Col>
            <Col span={16}>
                <Menu
                    onClick={handleEditorClick}
                    selectedKeys={[location.pathname]}
                    className={'header-menu'}
                    mode={'horizontal'}>
                    <Menu.Item key={'/editor'}>
                        <EditOutlined/>
                    </Menu.Item>
                    <Menu.Item key={'/uploadFile'}>
                        <CloudUploadOutlined/>
                    </Menu.Item>
                    <Menu.Item key={'/downloadFile'}>
                        <CloudDownloadOutlined/>
                    </Menu.Item>
                </Menu>
            </Col>
            <Col className={'header-right'} span={4}>
                <Checkbox className={'header-right-icon'} checked={false}>自动云同步</Checkbox>
                <Dropdown trigger={'click'} overlay={SettingDropItem}>
                    <MenuOutlined className={'header-right-icon'}/>
                </Dropdown>
                <LineOutlined className={'header-right-icon'}/>
                <FullscreenOutlined className={'header-right-icon'}/>
                <CloseOutlined/>
            </Col>
        </React.Fragment>
    )
}
