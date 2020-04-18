import React, {useState, useCallback} from 'react'
import {Button, Input, Form, message} from "antd";
import {SaveOutlined, DownloadOutlined} from "@ant-design/icons";

const {remote} = window.require('electron');
const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});


export default function () {
    const saveFile = settingsStore.get('savedFileLocation');
    const downloadFile = settingsStore.get('fileDownloadPath');
    const [savedFileLocation, setSavedFileLocation] = useState(saveFile);
    const [fileDownloadPath, setFileDownloadPath] = useState(downloadFile);
    const handleSelect = useCallback(async message => {
        let title = message === 'save' ? '选择保存位置' : '选择下载位置';
        let pathStatus = await remote.dialog.showOpenDialog({
            title,
            properties: ['openDirectory', 'createDirectory']
        });
        if (!pathStatus.canceled) {
            let filePath = pathStatus.filePaths[0];
            if (message === 'save') {
                setSavedFileLocation(filePath);
            } else {
                setFileDownloadPath(filePath);
            }
        }
    }, []);
    const handleSubmit = useCallback(() => {
        settingsStore.set('savedFileLocation', savedFileLocation);
        settingsStore.set('fileDownloadPath', fileDownloadPath);
        message.success("保存文件位置成功")
    }, [savedFileLocation, fileDownloadPath]);
    return (
        <Form
            onFinish={handleSubmit}
            id="login"
            className="login-area">
            <Form.Item
                type={'text'}
                name="verifyCode">
                <div className={"verify"}>
                    <Input value={savedFileLocation} readOnly={true} prefix={
                        <SaveOutlined className={'upload-icon'}/>}/>
                    <Button onClick={() => handleSelect('save')} type="primary" className="verify">保存位置</Button>
                </div>
            </Form.Item>
            <Form.Item
                type={'text'}
                name="verifyCode">
                <div className={"verify"}>
                    <Input value={fileDownloadPath} readOnly={true} prefix={
                        <DownloadOutlined className={'download-icon'}/>}/>
                    <Button onClick={() => handleSelect('download')} type="primary" className="verify">下载位置</Button>
                </div>
            </Form.Item>
            <Button block htmlType="submit" type={'primary'}>保存</Button>
        </Form>
    )
}
