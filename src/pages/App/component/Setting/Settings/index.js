import React, {useState, useCallback} from 'react'
import {Button, Input, Form} from "antd";
import {SaveOutlined, DownloadOutlined} from "@ant-design/icons";

const {remote} = window.require('electron');
const Store = window.require('electron-store');
const settingsStore = new Store({
    name: 'Settings'
});


const saveFile = settingsStore.get('savedFileLocation');
const downloadFile = settingsStore.get('fileDownloadPath');
export default function () {
    const [savedFileLocation, setSavedFileLocation] = useState(saveFile);
    const [fileDownloadPath, setFileDownloadPath] = useState(downloadFile);
    const handleSelect = useCallback(async message => {
        let title = message === 'save' ? '选择保存位置' : '选择下载位置';
        let path = await remote.dialog.showOpenDialog({
            title,
            properties: ['openDirectory', 'createDirectory']
        });
    }, []);
    return (
        <Form id="login" className="login-area">
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
