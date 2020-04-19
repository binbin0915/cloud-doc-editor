import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter} from 'react-router-dom'
import {Provider} from 'react-redux'
import App from './App';
import store from './appStore/store'
import {message} from 'antd'

message.config({
    top: 75,
    duration: 1.5,
    maxCount: 3,
    rtl: true,
});

ReactDOM.render(
    <Provider store={store}>
        <HashRouter>
            <App/>
        </HashRouter>
    </Provider>
    , document.getElementById('root'));
