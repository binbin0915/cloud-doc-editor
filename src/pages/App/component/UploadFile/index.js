import React, {useEffect, useCallback, useState} from 'react'
import {useLocation, useHistory} from 'react-router-dom'
import {Card, Breadcrumb, List as AntList, Input} from 'antd'
import {PlusOutlined, LeftOutlined, RightOutlined, RedoOutlined} from '@ant-design/icons'
import {useSelector} from "react-redux";
import useAction from "../../hooks/useAction";
import * as action from "../../store/action";
import './upload.css'

const fs = window.require('fs');
const querystring = window.require('querystring');
const {extraManager} = require('../../utils/manager');
const {manager} = require('../../utils/aliOssManager');
const Meta = Card.Meta;
import Folder from '../../static/folder.png'
import File from '../../static/file.png'
import {getParentNode} from "../../utils/helper";

const nodePath = window.require('path');
const {remote} = window.require('electron');

export default function () {
    const history = useHistory();
    const location = useLocation();
    const searchObj = querystring.parse(location.search.slice(1));
    const loginInfo = useSelector(state => state.getIn(['App', 'loginInfo'])).toJS();
    const cloudContextMenuInfo = useSelector(state => state.getIn(['App', 'cloudContextMenuInfo'])).toJS();
    const objects = useSelector(state => state.getIn(['App', 'objects'])).toJS();
    const dirs = useSelector(state => state.getIn(['App', 'dirs'])).toJS();
    const {setCloudDir, setCloudFileContextMenuInfo, setCloudObjects} = useAction(action);
    let page = '/uploadFile';
    const [value, setValue] = useState('');
    const [inputStat, setInputStat] = useState(false);

    const handleDbClick = useCallback(dir => {
        let url = page + '?prefix=' + dir.dir;
        history.push(url);
    }, [location]);

    const handleDelete = useCallback(file => {
        if (file.dir) {
            extraManager.deleteDir(file.dir)
                .then(data => {
                    const newCloudDirs = dirs.filter(dir => dir.dir !== file.dir);
                    setCloudDir(newCloudDirs);
                })
        } else {
            let extname = file.extname;
            extraManager.deleteDir(file.id + '.' + extname)
                .then(data => {
                    const newObjects = objects.filter(object => object.id !== file.id);
                    setCloudObjects(newObjects);
                });
        }
    }, [location, dirs]);

    const getData = useCallback(() => {
        if (loginInfo && loginInfo.user) {
            let prefix = searchObj.prefix + '/';
            manager.getObjectsFromOss(prefix, '/')
                .then(data => {
                    // 去掉前缀
                    let dirs = data.prefixes && data.prefixes.map(dir => {
                        return {dirname: dir.slice(prefix.length, -1), dir: dir.replace(/\/$/g, '')}
                    });
                    // 625815f7-7193-4867-82d3-b2c0c5c61ed8/sss:d1e1e325-7aff-40a7-a98d-83cd96b59091.md
                    let objects = data.objects && data.objects.map(object => {
                        let {lastModified, url, name} = object;
                        let extname = nodePath.extname(name);
                        if (extname !== '') {
                            let filename = name.slice(prefix.length);
                            let id = name.slice(name.indexOf(':') + 1, name.indexOf(extname));
                            return {
                                filename,
                                id,
                                serverUpdatedAt: +new Date(lastModified),
                                url: url,
                                extname: extname.slice(extname.indexOf('.') + 1)
                            }
                        }
                    }).filter(item => item);
                    setCloudObjects(objects || []);
                    setCloudDir(dirs || []);
                });
        }
    }, [searchObj]);

    const handleBlur = useCallback(e => {
        setInputStat(false);
        hideCloudContextMenu(e);
    }, []);

    const DirItem = useCallback(({item, value}) => {
        return (
            <Card
                hoverable
                onClick={hideCloudContextMenu}
                onDoubleClick={() => handleDbClick(item)}
                onContextMenu={e => handleFileContextMenu(e, 'dir', item)}
                className="item cloud-item"
                cover={<img alt="文件夹" src={Folder}/>}>
                {
                    inputStat === item.dirname ? <Input autoFocus onBlur={handleBlur} value={value}
                                                        onChange={event => setValue(event.target.value)}/> :
                        <Meta title={item.dirname}/>
                }
            </Card>
        )
    }, [location, inputStat, value, dirs]);

    const FileItem = useCallback(({className, item, url, value}) => {
        return (
            <Card
                hoverable
                onContextMenu={e => handleFileContextMenu(e, 'file', item)}
                className={"item cloud-item " + className}
                cover={<img alt="文件" src={url}/>}>
                {
                    inputStat === item.filename ? <Input autoFocus onBlur={handleBlur} value={value}
                                                         onChange={event => setValue(event.target.value)}/> :
                        <Meta title={item.filename}/>
                }
            </Card>)
    }, [location, inputStat, value, dirs]);

    const hideCloudContextMenu = (e) => {
        let parentNode = getParentNode(e.target, 'cloud-item');
        if (!parentNode) {
            setCloudFileContextMenuInfo({
                showContextMenu: false,
                position: {
                    left: 0,
                    top: 0
                },
                file: {},
                type: '',
            })
        }
    };

    useEffect(() => {
        const handler = e => {
            hideCloudContextMenu(e);
        };
        const contextMenuHandler = e => {
            hideCloudContextMenu(e);
        };
        document.addEventListener('click', handler);
        document.addEventListener('contextmenu', contextMenuHandler);

        return () => {
            document.removeEventListener('click', handler);
            document.removeEventListener('contextmenu', contextMenuHandler);
        }
    }, []);

    const handleFileContextMenu = (event, type, item) => {
        console.log(event, type, item);
        setCloudFileContextMenuInfo({
            showContextMenu: true,
            position: {
                left: event.clientX,
                top: event.clientY
            },
            type,
            file: item
        })
    };

    const FileContextMenu = useCallback(({position, type, file}) => {
        let contextMenuData;
        if (type === 'file') {
            contextMenuData = [
                {
                    id: '1',
                    title: '下载文件',
                    onClick: function () {
                    }
                },
                {
                    id: '2',
                    title: '重命名',
                    onClick: function () {
                    }
                },
                {
                    id: '3',
                    title: '删除',
                    onClick: function () {
                        handleDelete(file)
                    }
                },
                {
                    id: '4',
                    title: '属性',
                    onClick: function () {
                    }
                },
            ]
        } else {
            contextMenuData = [
                {
                    id: '1',
                    title: '打开',
                    onClick: function () {
                        let url = page + '?prefix=' + file.dir;
                        history.push(url)
                    }
                },
                {
                    id: '2',
                    title: '删除',
                    onClick: function () {
                        handleDelete(file)
                    }
                },
                {
                    id: '3',
                    title: '重命名',
                    onClick: function () {
                        setInputStat(file.dirname);
                        setValue(file.dirname);
                        // 先copy再删除
                    }
                },
            ]
        }
        return (
            <AntList
                style={{
                    left: position.left,
                    top: position.top
                }}
                className={'upload-file-context-menu'}
                dataSource={contextMenuData}
                bordered
                renderItem={(dataItem) => {
                    return (
                        <AntList.Item onClick={e => {
                            hideCloudContextMenu(e);
                            dataItem.onClick(e);
                        }} className={'upload-file-context-menu-item'}
                                      key={dataItem.id}>{dataItem.title}</AntList.Item>
                    )
                }}/>
        )
    }, [location, objects, dirs]);

    const breadNavs = searchObj && searchObj.prefix ? searchObj.prefix.split('/').slice(1) : [];

    useEffect(() => {
        getData();
    }, [location]);

    const handleGoBack = () => {
        if (searchObj.prefix.indexOf('/') !== -1) {
            let prefix = searchObj.prefix.slice(0, searchObj.prefix.lastIndexOf('/'));
            let url = page + '?prefix=' + prefix;
            history.push(url);
        }
    };

    const handleRefresh = () => {
        history.push(page + '?prefix=' + searchObj.prefix);
    };

    const uploadFile = useCallback(async () => {
        // 上传文件
        let status = await remote.dialog.showOpenDialog({
            title: '选择上传的markdown文件',
            properties: ['openFile', 'multiSelections'],
            filters: [
                {name: 'Markdown files', extensions: ['md']}
            ]
        });
        if (!status.canceled) {
            console.log(status);
            let files = status.filePaths;
            let filteredFiles = files.map(file => {
                let fileName = nodePath.basename(file);
                let {size} = fs.statSync(file);
                return {
                    src: file,
                    dst: searchObj.prefix + '/' + fileName,
                    size,
                }
            });
            extraManager.putList(filteredFiles, {thread: 10})
                .then(data => {
                    getData();
                });
        }
    }, [searchObj]);

    return (
        <React.Fragment>
            <div className="container">
                <div className="main">
                    <div className="upload-header">
                        <div className="op">
                            <LeftOutlined onClick={handleGoBack}/>
                            <RedoOutlined onClick={handleRefresh}/>
                        </div>
                        <div className="nav">
                            <Breadcrumb>
                                {
                                    breadNavs.length ? breadNavs.map((item, index) => (
                                        <Breadcrumb.Item key={index}>{item}</Breadcrumb.Item>
                                    )) : ''
                                }
                            </Breadcrumb>
                        </div>
                    </div>
                    <div className="main-content">
                        {
                            dirs && dirs.length ? (
                                dirs.map((item, index) => (
                                    <DirItem value={value} item={item} key={index}/>
                                ))
                            ) : ''
                        }
                        {
                            objects && objects.length ? (
                                objects.map((item, index) => {
                                        let url = item.extname === 'jpg' ? item.url : File;
                                        let additionClassName = item.extname === 'jpg' ? 'pic' : '';
                                        return (
                                            <FileItem value={value} key={index} url={url}
                                                      className={additionClassName} item={item}/>)
                                    }
                                )) : ''
                        }
                        <Card
                            onClick={uploadFile}
                            key={'plus'}
                            hoverable
                            className="item plus"
                            cover={<PlusOutlined className={'plus-folder'}/>}>
                        </Card>
                    </div>
                </div>
            </div>
            {
                cloudContextMenuInfo.showContextMenu ?
                    <FileContextMenu {...cloudContextMenuInfo}/> : ''
            }
        </React.Fragment>
    )

}
