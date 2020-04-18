import React from 'react'
import './index.css'
export default function ({text}) {
    return (
        <div className="login-tip">
            <div className={'not-login-info'}>{text}</div>
        </div>
    )
}
