import React from 'react'
import {Button, Input, Form} from "antd";
import {UploadOutlined, DownloadOutlined} from "@ant-design/icons";

export default function () {
    return (
        <Form id="login" className="login-area">
            <Form.Item
                type={'text'}
                name="verifyCode">
                <div className={"verify"}>
                    <Input  readOnly={true} prefix={<UploadOutlined className={'upload-icon'}/>}/>
                    <Button type="primary" className="verify">上传位置</Button>
                </div>
            </Form.Item>
            <Form.Item
                type={'text'}
                name="verifyCode">
                <div className={"verify"}>
                    <Input readOnly={true} prefix={<DownloadOutlined className={'download-icon'}/>}/>
                    <Button type="primary" className="verify">下载位置</Button>
                </div>
            </Form.Item>
            <Button block htmlType="submit" type={'primary'}>保存</Button>
        </Form>
    )
}
