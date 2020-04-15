import React, {Suspense, useEffect} from "react";
import {Route, Switch, Redirect} from 'react-router-dom'
import {Row, Spin, message} from 'antd'
import {UploadFile, DownloadFile, EditorMain, Setting, EditPwd} from './component'
import Header from './component/Header'
import './App.css'
import axios from '@/utils/http'
import useAction from "./hooks/useAction";
import * as action from "./store/action";

const {ipcRenderer, remote} = window.require('electron');
const path = window.require('path');
const Store = window.require('electron-store');

const settingsStore = new Store({
    name: 'Settings'
});
const token =  settingsStore.get('token');
export default function App() {
    const defaultSavedFileLocation = path.join(remote.app.getPath('documents'), 'markdown');
    const fileDownloadPath = remote.app.getPath('downloads');
    const {setLoginInfo, changeAutoSync, setSearchType} = useAction(action);
    if (!settingsStore.get('savedFileLocation')) {
        settingsStore.set('savedFileLocation', defaultSavedFileLocation);
    }
    if (!settingsStore.get('fileDownloadPath')) {
        settingsStore.set('fileDownloadPath', fileDownloadPath);
    }
    useEffect(() => {
        axios.post('/user/isLogin', {token})
            .then(({code, data}) => {
                if (code === 0) {
                    setLoginInfo(data);
                    message.success("登录成功");
                } else {
                    changeAutoSync(false);
                }
            })
            .catch(() => message.error('连接服务器失败'));
        setSearchType('local');
    }, []);
    return (
        <React.Fragment>
            <div onContextMenu={e => false}>
                <Row className={'editor-header'}>
                    <Header />
                </Row>
            </div>
            <Row className={'editor-main'}>
                <Suspense fallback={<Spin className={'router-spin'} size={'large'}/>}>
                    <Switch>
                        <Route path={'/editor'} render={props => <EditorMain {...props}/>}/>
                        <Route path={'/uploadFile'} render={props => <UploadFile {...props}/>}/>
                        <Route path={'/downloadFile'} render={props => <DownloadFile {...props}/>}/>
                        <Route path={'/setting'} render={props => <Setting {...props}/>}/>
                        <Route path={'/user'} render={props => <EditPwd {...props}/>}/>
                        <Redirect from={"*"} to={'/editor'}/>
                    </Switch>
                </Suspense>
            </Row>
        </React.Fragment>
    )
}
