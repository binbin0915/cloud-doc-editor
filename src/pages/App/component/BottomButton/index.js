import React, {useCallback, useEffect} from 'react'
import {Button, message} from 'antd'
import {ImportOutlined, FileAddOutlined} from '@ant-design/icons'
import './btn.css'
import {useSelector} from "react-redux";
import uuidv4 from "uuid/v4";

import {obj2Array, array2Obj} from '@/utils/helper'
import {fileStatus, readFile} from '@/utils/fileHelper'
import useAction from "../../hooks/useAction";
import * as actions from "../../store/action";
import events from '@/utils/eventBus'

const nodePath = window.require('path');

const remote = window.require('electron').remote;

export default function BottomButton() {
    const files = useSelector(state => state.getIn(['App', 'files'])).toJS();
    const {changeActiveKey, setFileLoaded, changeOpenedFiles, addFile, addFiles} = useAction(actions);
    const openedFileIds = useSelector(state => state.getIn(['App', 'openedFileIds'])).toJS();

    useEffect(() => {
        events.on('import-files', importFile);
        return () => {
            events.off('import-files', importFile);
        }
    }, [files]);

    const handleCreateNewFile = () => {
        const id = uuidv4();
        const time = +new Date();
        const newFile = {
            id,
            title: '',
            body: '## 请输入Markdown',
            createdAt: time,
            isNewlyCreate: true,
            localUpdatedAt: time,
        };
        addFile(newFile);
    };

    const importFile = useCallback(async () => {
        let status = await remote.dialog.showOpenDialog({
            title: '选择导入的markdown文件',
            properties: ['openFile', 'multiSelections'],
            filters: [
                {name: 'Markdown files', extensions: ['md']}
            ]
        });
        if (!status.canceled) {
            const filesArray = obj2Array(files);
            // 过滤掉我们已经打开过的文件
            const filteredPath = status.filePaths.filter(path => {
                const isAlreadyAdded = filesArray.find(file => {
                    return file.filePath === path
                });
                return !isAlreadyAdded
            });
            // 统一格式
            const importFilesArr = filteredPath.map(path => {
                return {
                    id: uuidv4(),
                    title: nodePath.basename(path, nodePath.extname(path)),
                    filePath: path,
                    isNewlyCreate: false,
                    localUpdatedAt: +new Date()
                }
            });
            if (importFilesArr.length === 1) {
                let file = importFilesArr[0];
                readFile(file.filePath)
                    .then(data => {
                        message.success(`成功导入文件${file.title}.md`);
                        addFile(file);
                        const newOpenedFileIds = [...openedFileIds, file.id];
                        changeOpenedFiles(newOpenedFileIds);
                        setFileLoaded(file.id, data);
                        changeActiveKey(file.id);
                    })
                    .catch(() => {
                        message.error('文件已被删除');
                    })
            } else {
                message.success(`成功导入${importFilesArr.length}个文件`);
                addFiles(importFilesArr);
            }
        }
    }, [files]);
    return (
        <Button.Group className={'btn-group'}>
            <Button onClick={handleCreateNewFile} type={'primary'} icon={<FileAddOutlined/>}>新建</Button>
            <Button onClick={importFile} icon={<ImportOutlined/>}>导入</Button>
        </Button.Group>
    )
}
