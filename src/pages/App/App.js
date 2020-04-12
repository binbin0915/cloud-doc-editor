import React from "react";
import {Route, Switch, Redirect} from 'react-router-dom'
import {Row} from 'antd'
import EditorMain from './component/EditorMain'
import UploadFile from './component/UploadFile'
import DownloadFile from './component/DownloadFile'
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
                <Switch>
                    <Route path={'/editor'} component={EditorMain}/>
                    <Route path={'/uploadFile'} component={UploadFile}/>
                    <Route path={'/downloadFile'} component={DownloadFile}/>
                    <Redirect from={"*"} to={'/editor'}/>
                </Switch>
            </Row>
        </React.Fragment>
    )
}
