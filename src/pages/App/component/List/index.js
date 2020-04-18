import React from 'react'
import {List as AntList} from 'antd'
import ListItem from './ListItem'
import './list.css'
export default function List({files, handleClick, handleDeleteFile}) {
    return (
        <React.Fragment>
            <AntList className={'file-list'} locale={{emptyText: '暂无数据呢(゜-゜)つロ '}} dataSource={files} renderItem={(file) => {
                return (
                    <ListItem handleDeleteFile={handleDeleteFile} handleClick={handleClick} key={file.id} file={file}/>
                )
            }}/>
        </React.Fragment>
    )
}
