import React, {useCallback} from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {Col, Button, Checkbox, Dropdown, Menu, Input, Modal} from "antd";
import {
    UserOutlined,
    EditOutlined,
    CloudUploadOutlined,
    CloudDownloadOutlined,
    MenuOutlined,
    LineOutlined,
    FullscreenOutlined,
    CloseOutlined,
    QuestionCircleFilled
} from '@ant-design/icons'
import './header.css'
import {useSelector} from "react-redux";
import useAction from "../../hooks/useAction";
import * as action from "../../store/action";

const Store = window.require('electron-store');

const settingsStore = new Store({
    name: 'Settings'
});

export default function Header() {
    const history = useHistory();
    const location = useLocation();
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    const {setLoginInfo, changeAutoSync} = useAction(action);
    const handleEditorClick = useCallback(e => {
        history.push(e.key);
    }, []);

    const SettingDropItem = () => {
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
    };

    const UserDropItem = function () {
        const handleClick = ({item, key, keyPath, domEvent}) => {
            history.push(key);
        };
        const handleLogout = () => {
            Modal.confirm({
                cancelText: '取消',
                okText: '注销',
                title: `确认注销${loginInfo.user.username}吗？`,
                content: '注销用户之后无法云同步文件？确认注销吗',
                onOk() {
                    setLoginInfo({});
                    settingsStore.set('token', '');
                    settingsStore.set('user', '');
                },
                icon: <QuestionCircleFilled />
            })
        };
        return (
            <Menu>
                <Menu.Item onClick={handleClick} key={'/user/editPwd'} className={'header-drop-menu'}>
                    修改密码
                </Menu.Item>
                <Menu.Item onClick={handleLogout} key={'/user/logout'} className={'header-drop-menu'}>
                    注销
                </Menu.Item>
            </Menu>
        )
    };

        const handleChange = useCallback(e => {
            changeAutoSync(!autoSync)
        }, [autoSync]);


    return (
        <React.Fragment>
            <Col className={'header-left'} span={4}>
                {
                    loginInfo && loginInfo.user && loginInfo.user.id && (
                        <Dropdown trigger={'click'} overlay={UserDropItem}>
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
                <div className={'setting-icon-group'}>
                    <Dropdown trigger={'click'} overlay={SettingDropItem}>
                        <MenuOutlined className={'header-right-icon'}/>
                    </Dropdown>
                    <LineOutlined className={'header-right-icon'}/>
                    <FullscreenOutlined className={'header-right-icon'}/>
                    <CloseOutlined/>
                </div>
                {loginInfo && loginInfo.user && loginInfo.user.id && <Checkbox onChange={handleChange} checked={autoSync} className={'header-right-icon'}>自动云同步</Checkbox>}
            </Col>
        </React.Fragment>
    )
}
