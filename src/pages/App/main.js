import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter} from 'react-router-dom'
import {Provider} from 'react-redux'
import './index.css';
import App_markup from './App';
import store from '../../store/store'
import * as serviceWorker from './serviceWorker';
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
            <App_markup/>
        </HashRouter>
    </Provider>
    , document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
