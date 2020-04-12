import React, {useState, useCallback} from 'react';
import ReactDom from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css'
import './Setting.css'
import Header from './components/Header'
import Location from './components/Location'

const Store = window.require('electron-store');
const {remote} = window.require('electron');

const settingsStore = new Store({
    name: 'Settings'
});


function Form() {
    const [fileSaveLocation, setFileSaveLocation] = useState(settingsStore.get('savedFileLocation'));
    const [fileDownloadLocation, setFileDownloadLocation] = useState(settingsStore.get('fileDownloadPath'));
    const openSaveFolder = useCallback(() => {
        openFolder(true)
    }, [fileSaveLocation]);

    const openFolder = useCallback(async flag => {
        let paths = await remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            message: '选择文件路径',
            defaultPath: flag ? fileSaveLocation : fileDownloadLocation
        });
        if (!paths.canceled) {
            if (flag) {
                setFileSaveLocation(paths.filePaths[0]);
            } else {
                setFileDownloadLocation(paths.filePaths[0]);
            }
        }
    }, [fileSaveLocation, fileDownloadLocation]);

    const openDownloadFolder = useCallback(() => {
        openFolder(false)
    }, [fileDownloadLocation]);

    const saveFileLocation = useCallback(() => {
        settingsStore.set('savedFileLocation', fileSaveLocation);
        settingsStore.set('fileDownloadPath', fileDownloadLocation);
        closeWindow();
    }, [fileSaveLocation, fileDownloadLocation]);

    const closeWindow = useCallback(() => {
        remote.getCurrentWindow().close();
    }, []);
    return (
        <div className="container">
            <form id="settings-form">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <a className="nav-link active" href="#">文件存储位置</a>
                    </li>
                </ul>
                <div id="config-file-location" className="config-area mt-4">
                    <Location title={'选择新文件保存路径'} onClick={openSaveFolder} location={fileSaveLocation}
                              placeholder={'当前存储地址'}/>
                    <Location title={'选择下载文件路径'} onClick={openDownloadFolder} location={fileDownloadLocation}
                              placeholder={'当前下载地址'}/>
                </div>
                <div className="btn-group setting-btn">
                    <button onClick={saveFileLocation} type="submit" className="btn btn-primary">保存</button>
                    <button onClick={closeWindow} id="close" type="button" className="btn btn-outline-secondary">取消
                    </button>
                </div>
            </form>
        </div>
    )
}

function Container() {
    return (
        <React.Fragment>
            <Header className={'settings'} text={'设置'}/>
            <Form/>
        </React.Fragment>
    )
}

ReactDom.render(<Container/>, document.getElementById('root'));
