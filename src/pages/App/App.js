import React, {Suspense, useCallback} from "react";
import {Route, Switch, Redirect} from 'react-router-dom'
import {Row, Spin, Menu} from 'antd'
import {UploadFile, DownloadFile, EditorMain, Setting} from './component'
import Header from './component/Header'
import './App.css'

const {ipcRenderer, remote} = window.require('electron');
const path = window.require('path');
const Store = window.require('electron-store');

const settingsStore = new Store({
    name: 'Settings'
});

export default function App() {
    const defaultSavedFileLocation = path.join(remote.app.getPath('documents'), 'markdown');
    const fileDownloadPath = remote.app.getPath('downloads');
    if (!settingsStore.get('savedFileLocation')) {
        settingsStore.set('savedFileLocation', defaultSavedFileLocation);
    }
    if (!settingsStore.get('fileDownloadPath')) {
        settingsStore.set('fileDownloadPath', fileDownloadPath);
    }
    return (
        <React.Fragment>
            <Row className={'editor-header'}>
                <Header/>
            </Row>
            <Row className={'editor-main'}>
                <Suspense fallback={<Spin className={'router-spin'} size={'large'}/>}>
                    <Switch>
                        <Route path={'/editor'} render={props => <EditorMain {...props}/>}/>
                        <Route path={'/uploadFile'} render={props => <UploadFile {...props}/>}/>
                        <Route path={'/downloadFile'} render={props => <DownloadFile {...props}/>}/>
                        <Route path={'/setting'} render={props => <Setting {...props}/>}/>
                        <Redirect from={"*"} to={'/editor'}/>
                    </Switch>
                </Suspense>
            </Row>
        </React.Fragment>
    )
}
