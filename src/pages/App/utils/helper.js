/**
 * 工具方法
 * @author ainuo5213
 * @date 2020-02-21
 */
/**
 * 扁平化数组，将数组里的obj作为键，其他数据作为值
 * @param array
 * @return {{}}
 */
export function array2Obj(array) {
    return array.reduce((prevRes, curItem) => {
        prevRes[curItem.id] = curItem;
        return prevRes;
    }, {})
}

/**
 * 将对象转换成数组
 * @param obj
 * @return {*[]}
 */
export function obj2Array(obj) {
    return Object.keys(obj).map(key => obj[key])
}

/**
 * 取得指定类名的父节点
 * @param node 当前节点
 * @param parentClassName 父节点的类名
 * @return {*}
 */
export function getParentNode(node, parentClassName) {
    let current = node;
    while (current !== null) {
        if (current && current.classList && current.classList.contains(parentClassName)) {
            return current
        }
        current = current.parentNode;
    }
    return false;
}

/**
 * 时间戳格式化
 * @param timeStamp 时间戳
 * @return {string} 格式化后的事件
 */
export function timeStampToString(timeStamp) {
    const date = new Date(timeStamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

export function isEmail(email) {
    let regExp = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
    return regExp.test(email)
}

export function formatSize(size) {
    let mb = 1024 * 1024;
    let kb = 1024;
    if (size > mb) {
        return Math.floor(((size / mb) * 100)) / 100 + 'MB'
    }
    if (size > kb) {
        return Math.floor(((size / kb) * 100)) / 100 + 'KB'
    } else {
        return Math.floor(size * 100) / 100 + 'B'
    }
}

let imageExtNames = ['jpg', 'jpeg', 'png', 'swf', 'JPG', 'JPEG', 'PNG', 'SWF'];

export function isImage(extname) {
    return imageExtNames.indexOf(extname) !== -1;
}
