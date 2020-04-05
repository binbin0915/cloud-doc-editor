/**
 * 加载效果组件
 * @author ainuo5213
 * @date 2020-03-01
 */

import React from 'react'
import './index.css'

const Loading = ({text = '处理中'}) => {
    return (
        <div className="loading-component text-center">
            <div className="spinner-grow text-primary" role={'status'}>
                <span className="sr-only">{text}</span>
            </div>
            <h5 className="text-primary">{text}</h5>
        </div>
    )
};

export default Loading
