import React, {useCallback} from "react";
import {Menu, Row, Col} from "antd";
import {Switch, Route, Redirect, useLocation, useHistory} from 'react-router-dom'
import Login from "./Login";
import './setting.css'
import Setting from "./Settings";
import Register from './Register'

const links = [
    {
        title: '登录',
        to: '/setting/login',
    },
    {
        title: '注册',
        to: '/setting/register',
    },
    {
        title: '设置',
        to: '/setting/settings'
    },
];

export default function () {
    const history = useHistory();
    const location = useLocation();
    const handleClick = useCallback((e) => {
        history.push(e.key);
    }, []);
    console.log(location);
    return (
        <React.Fragment>
            <div className={'setting-main'}>
                <Menu className={'setting-menu'} mode="horizontal" onClick={handleClick} selectedKeys={[location.pathname]}>
                    {
                        links.map(item => <Menu.Item key={item.to}>
                            {item.title}
                        </Menu.Item>)
                    }
                </Menu>
                <Switch>
                    <Route path={'/setting/login'} component={Login}/>
                    <Route path={'/setting/settings'} component={Setting}/>
                    <Route path={'/setting/register'} component={Register}/>
                    <Redirect to={'/setting/login'}/>
                </Switch>
            </div>
        </React.Fragment>
    )
}
