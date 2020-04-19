import React, {useCallback, useState, useEffect, useRef} from 'react'
import {useHistory, useLocation} from 'react-router-dom'
import {Col, Button, Checkbox, Dropdown, Menu, Input, Modal, message} from "antd";
import {
    UserOutlined,
    EditOutlined,
    CloudUploadOutlined,
    CloudDownloadOutlined,
    MenuOutlined,
    LineOutlined,
    FullscreenOutlined,
    CloseOutlined,
    QuestionCircleFilled,
    FullscreenExitOutlined
} from '@ant-design/icons'
import './header.css'
import {useSelector} from "react-redux";
import useAction from "../../hooks/useAction";
import * as action from "../../store/action";
import {obj2Array} from "../../utils/helper";
import events from '../../utils/eventBus'

const Store = window.require('electron-store');
const {remote} = window.require('electron');

const settingsStore = new Store({
    name: 'Settings'
});

export default function Header() {
    const history = useHistory();
    const location = useLocation();
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const cloudFiles = useSelector(state => state.getIn(['App', 'cloudFiles'])).toJS();
    const filesArr = obj2Array(files);
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const autoSync = useSelector(state => state.getIn(['App', 'autoSync']));
    const searchValue = useSelector(state => state.getIn(['App', 'searchValue']));
    const searchType = useSelector(state => state.getIn(['App', 'searchType']));
    const {rememberHideToTray, setLoginInfo, changeAutoSync, setSearchFiles, setSearchValue} = useAction(action);
    const [isFullScreen, setFullScreen] = useState(false);
    const curWindow = remote.getCurrentWindow();
    const hideInfo = useSelector(state => state.getIn(['App', 'hideInfo']));
    const isHide = useSelector(state => state.getIn(['App', 'isHide']));
    const [visible, setVisible] = useState(false);
    const [remember, setRemember] = useState(false);
    const handleEditorClick = useCallback(e => {
        let prefix = loginInfo && loginInfo.user && loginInfo.user.id;
        history.push(`${e.key}?prefix=${prefix}`);
    }, [loginInfo]);
    const searchRef = useRef(null);
    useEffect(() => {
        const handler = () => {
            searchRef.current.focus()
        };
        events.on('focus-search', handler);
        return () => {
            events.off('focus-search', handler);
        }
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

    const handleMinimize = useCallback(() => {
        curWindow.minimize()
    }, []);
    const handleMaximize = useCallback(() => {
        curWindow.maximize();
        setFullScreen(true);
    }, []);
    const handleExitFullScreen = useCallback(() => {
        curWindow.setSize(1366, 768);
        setFullScreen(false);
        curWindow.center();
    }, [isFullScreen]);

    const handleSearch = (value, event) => {
        if (value.trim() === '') {
            setSearchFiles([]);
        } else {
            let searchFiles = [];
            if (searchType === 'local') {
                searchFiles = filesArr.filter(file => file.title.includes(value));
            }
            // 云文件搜索
            if (searchType === 'cloud') {
                searchFiles = cloudFiles.filter(file => file.title.includes(value));
            }
            // console.log(searchFiles);
            // 本地文件搜索
            setSearchFiles(searchFiles);
        }
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
                    changeAutoSync(false);
                    message.success("注销成功")
                },
                icon: <QuestionCircleFilled/>
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

    const hideToTray = useCallback(() => {
        curWindow.hide();
    }, [hideInfo]);

    const handleModalOpen = useCallback(() => {
        // 没有记住隐藏到托盘，打开modal
        if (!hideInfo) {
            setVisible(true);
        }
        // 记住了去看一下上一次记住的操作是什么
        else {
            if (isHide) {
                // 上次记住了隐藏托盘，直接隐藏
                hideToTray();
            } else {
                curWindow.destroy();
            }
        }
    }, [hideInfo, isHide]);

    const exitApp = useCallback(() => {
        setVisible(false);
        rememberHideToTray({
            hideInfo: remember,
            isHide: false
        });
        setTimeout(() => {
            curWindow.destroy();
        }, 200)
    }, [remember]);

    const hideTray = useCallback(() => {
        setVisible(false);
        rememberHideToTray({
            hideInfo: remember,
            isHide: true
        });
        setTimeout(() => {
            hideToTray();
        }, 250)
    }, [remember]);

    const onChange = useCallback((e) => {
        setRemember(e.target.checked)
    }, []);

    const handleSearchValueChange = e => {
        setSearchValue(e.target.value);
    };

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
                <Input.Search ref={searchRef} value={searchValue} onChange={handleSearchValueChange}
                              onSearch={handleSearch}
                              className={'header-search'}/>
            </Col>
            <Col span={loginInfo && loginInfo.user ? 15 : 17}>
                <Menu
                    onClick={handleEditorClick}
                    selectedKeys={[location.pathname]}
                    className={'header-menu'}
                    mode={'horizontal'}>
                    <Menu.Item className={'no-drag'} key={'/editor'}>
                        <EditOutlined/>
                    </Menu.Item>
                    <Menu.Item className={'no-drag'}
                               key={`/uploadFile`}>
                        <CloudUploadOutlined/>
                    </Menu.Item>
                    <Menu.Item className={'no-drag'} key={'/downloadFile'}>
                        <CloudDownloadOutlined/>
                    </Menu.Item>
                </Menu>
            </Col>
            {loginInfo && loginInfo.user && loginInfo.user.id &&
            <Col span={2}>
                <Checkbox onChange={handleChange} checked={autoSync} className={'header-right-icon'}>自动云同步</Checkbox>
            </Col>}
            <Col className={'header-right'} span={2}>
                <Dropdown trigger={'click'} overlay={SettingDropItem}>
                    <MenuOutlined className={'header-right-icon'}/>
                </Dropdown>
                <LineOutlined onClick={handleMinimize} className={'header-right-icon'}/>
                {
                    isFullScreen ?
                        <FullscreenExitOutlined onClick={handleExitFullScreen} className={'header-right-icon'}/> :
                        <FullscreenOutlined onClick={handleMaximize} className={'header-right-icon'}/>
                }
                <CloseOutlined onClick={handleModalOpen} className={'header-right-icon'}/>
            </Col>
            <Modal
                title={'隐藏到托盘吗'}
                okText={'隐藏到托盘'}
                cancelText={'直接关闭'}
                closable={false}
                onOk={hideTray}
                onCancel={exitApp}
                visible={visible}
            >
                <Checkbox checked={remember} onChange={onChange}>记住此次操作</Checkbox>
            </Modal>
        </React.Fragment>
    )
}
