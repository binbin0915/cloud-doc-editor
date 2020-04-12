import React, {useCallback, useEffect} from 'react'
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
import './header.css'

const UserDropItem = function () {
    return (
        <Menu>
            <Menu.Item key={'/editPwd'}  className={'header-drop-menu'}>
                修改密码
            </Menu.Item>
            <Menu.Item key={'/logout'} className={'header-drop-menu'}>
                注销
            </Menu.Item>
        </Menu>
    )
};

const SettingDropItem = function () {
    return (
        <Menu>
            <Menu.Item key={'/settings'} className={'header-drop-menu'}>
                设置
            </Menu.Item>
            <Menu.Item key={'/login'}  className={'header-drop-menu'}>
                登录
            </Menu.Item>
            <Menu.Item key={'/register'}  className={'header-drop-menu'}>
                注册
            </Menu.Item>
        </Menu>
    )
};

export default function Header() {
    const history = useHistory();
    const location = useLocation();
    const handleClick = useCallback(e => {
        history.push(e.key)
    }, []);

    return (
        <React.Fragment>
            <Col className={'header-left'} span={4}>
                <Dropdown overlay={UserDropItem}>
                    <Button size={'large'} className={'user-icon'} icon={<UserOutlined/>}/>
                </Dropdown>
                <Input.Search className={'header-search'}/>
            </Col>
            <Col span={16}>
                <Menu
                    onClick={handleClick}
                    defaultSelectedKeys={location.pathname}
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
                <Dropdown overlay={SettingDropItem}>
                    <MenuOutlined className={'header-right-icon'}/>
                </Dropdown>
                <LineOutlined className={'header-right-icon'}/>
                <FullscreenOutlined className={'header-right-icon'}/>
                <CloseOutlined/>
            </Col>
        </React.Fragment>
    )
}
