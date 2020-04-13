import React, {useCallback, useEffect} from 'react'
import ReactDom from 'react-dom'
import {Route, Switch, withRouter, Redirect, HashRouter} from 'react-router-dom'
import Header from '../Settings/components/Header'
import Login from './components/Login'
import 'bootstrap/dist/css/bootstrap.min.css'
import './User.css'
import {Menu} from 'antd'
import Register from "./components/Register";
import EditPwd from "./components/EditPwd";
import Logout from "./components/Logout";
import store from '../../store/store'
import {Provider} from 'react-redux'

import {message} from 'antd'

message.config({
    top: 75,
    duration: 1.5,
    maxCount: 3,
    rtl: true,
});

const {ipcRenderer} = window.require('electron');


const links = [
    {
        title: '登录',
        to: '/login',
    }, {
        title: '注册',
        to: '/register',
    }, {
        title: '修改密码',
        to: '/editPwd'
    },
    {
        title: '注销',
        to: '/logout'
    }];

function Container(props) {
    useEffect(() => {
        ipcRenderer.on('display-route', (event, message) => {
            if (message) {
                props.history.push(message.route);
            }
        });
    }, []);

    const handleClick = useCallback((e) => {
        props.history.push(e.key);
    }, []);

    return (
        <React.Fragment>
            <Header className={'user'} text={'用户'}/>
            <Menu mode="horizontal" onClick={handleClick} selectedKeys={[props.location.pathname]}>
                {
                    links.map(item => <Menu.Item key={item.to}>
                        {item.title}
                    </Menu.Item>)
                }
            </Menu>
            <Switch>
                <Route path={'/login'} component={Login}/>
                <Route path={'/register'} component={Register}/>
                <Route path={'/editPwd'} component={EditPwd}/>
                <Route path={'/logout'} component={Logout}/>
                <Redirect to={'/login'}/>
            </Switch>
        </React.Fragment>
    )
}

const UserSetting = withRouter(Container);
ReactDom.render(
    <Provider store={store}>
        <HashRouter>
            <UserSetting/>
        </HashRouter>
    </Provider>
    , document.getElementById('root'));
