/**
 * 文件搜索组件
 * @author ainuo5213
 * @date 2020-02-15
 */
import React, {useState, useEffect, useCallback, useRef} from 'react'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faSearch, faTimes} from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../../hooks/useKeyPress'

const fontSize = {fontSize: 25.5};
const FileSearch = ({title, onFileSearch, onCloseSearch, openSearch}) => {
    const enterPress = useKeyPress(13);
    const escPress = useKeyPress(27);
    const [inputActive, setInputActive] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef(null);
    // 关闭搜索
    const closeSearch = useCallback(() => {
        setInputActive(false);
        setValue('');
        onCloseSearch();
    }, []);
    // 副作用
    useEffect(() => {
        if (enterPress && inputActive) {
            onFileSearch(value);
            closeSearch();
        } else if (escPress && inputActive) {
            closeSearch();
        }
    }, [enterPress, escPress]);
    useEffect(() => {
        if (inputActive || openSearch) {
            inputRef.current.focus()
        }
    }, [inputActive, openSearch]);

    // 搜索文件
    const handleFileSearch = e => {
        let trimmedValue = e.target.value.trim();
        setValue(trimmedValue);
        onFileSearch(trimmedValue);
    };

    return (
        <div className={'alert alert-primary d-flex justify-content-between align-items-center mb-0'}>
            {
                (!inputActive && !openSearch) &&
                <React.Fragment>
                    <span style={fontSize}>{title}</span>
                    <button type={'button'} className={'icon-button'} onClick={() => setInputActive(true)}>
                        <FontAwesomeIcon title={'搜索'} icon={faSearch}/>
                    </button>
                </React.Fragment>
            }
            {
                (inputActive || openSearch) &&
                <React.Fragment>
                    <input
                        type="text"
                        className={'form-control'}
                        value={value}
                        ref={inputRef}
                        onChange={handleFileSearch}/>
                    <button
                        type={'button'}
                        className={'icon-button'}
                        onClick={closeSearch}>
                        <FontAwesomeIcon title={'搜索'} icon={faTimes}/>
                    </button>
                </React.Fragment>
            }
        </div>
    )
};
FileSearch.propTypes = {
    title: PropTypes.string,
    onFileSearch: PropTypes.func,
    onCloseSearch: PropTypes.func,
    openSearch: PropTypes.bool
};
FileSearch.defaultProps = {
    title: '我的云文档',
};
export default FileSearch
