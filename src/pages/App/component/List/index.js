import React from 'react'
import {List as AntList} from 'antd'
import ListItem from './ListItem'
import './list.css'

export default function List({files}) {
    return (
        <React.Fragment>
            <AntList locale={{emptyText: '暂无数据呢(゜-゜)つロ '}} dataSource={files} renderItem={(file) => {
                return (
                    <ListItem key={file.id} file={file}/>
                )
            }}/>
        </React.Fragment>
    )
}
