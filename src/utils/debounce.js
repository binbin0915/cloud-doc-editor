/**
 * 节流
 * @author ainuo5213
 * @date 2020-02-17
 */

export function debounce(fn, delay) {
    let  timeout = null;
    return function () {
        if (!timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(fn, delay)
    }
}
