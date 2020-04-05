/**
 * 自定义hook用来处理键盘响应事件
 * @author ainuo5213
 * @date 2020-02-16
 */

import {useState, useEffect} from 'react'

const useKeyPress = targetCode => {
    const [keyPressed, setKeyPressed] = useState(false);
    // 键盘按下的处理事件
    const keyDownHandler = ({keyCode}) => {
        if (keyCode === targetCode) {
            setKeyPressed(true)
        }
    };
    // 键盘抬起的处理事件
    const keyUpHandler = ({keyCode}) => {
        if (keyCode === targetCode) {
            setKeyPressed(false)
        }
    };
    useEffect(() => {
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        return () => {
            document.removeEventListener('keydown', keyDownHandler);
            document.removeEventListener('keyup', keyUpHandler);
        }
    }, []);
    return keyPressed
};

export default useKeyPress
