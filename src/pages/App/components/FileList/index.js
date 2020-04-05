/**
 * 文件列表
 * @author ainuo5213
 * @date 2020-02-15
 */

import React from 'react'
import PropTypes from 'prop-types'
import FileItem from './FileItem'

const FileList = ({files, onFileClick, onSaveEdit, onFileDelete, onFileRemove, showInExplorer}) => {
    return (
        <ul className={'list-group list-group-flush file-list'}>
            {
                files.map(file => (
                    <FileItem
                        key={file.id}
                        file={file}
                        showInExplorer={showInExplorer}
                        onFileClick={onFileClick}
                        onSaveEdit={onSaveEdit}
                        onFileDelete={onFileDelete}
                        onFileRemove={onFileRemove}
                    />
                ))
            }
        </ul>
    )
};


FileList.propTypes = {
    files: PropTypes.array,
    onFileClick: PropTypes.func,
    onSaveEdit: PropTypes.func,
    onFileDelete: PropTypes.func,
    onFileRemove: PropTypes.func,
    showInExplorer: PropTypes.func
};

export default FileList
