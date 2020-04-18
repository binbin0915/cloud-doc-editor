/**
 * 渲染进程绑定事件
 * @author ainuo5213
 * @date 2020-02-27
 */
import {useEffect} from 'react'

const {ipcRenderer} = window.require('electron');

const useIpcRenderer = (keyCallbackMap) => {
    useEffect(() => {
        Object.keys(keyCallbackMap).forEach(key => {
            ipcRenderer.on(key, keyCallbackMap[key])
        });
        return () => {
            Object.keys(keyCallbackMap).forEach(key => {
                ipcRenderer.removeListener(key, keyCallbackMap[key])
            })
        }
    })
};

export default useIpcRenderer
