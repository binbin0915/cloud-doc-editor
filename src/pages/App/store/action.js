import {
    CHANGE_ACTIVE_KEY,
    SET_FILE_LOADED,
    CHANGE_OPENED_FILE,
    DELETE_FILE,
    ADD_FILE,
    ADD_FILES,
    SAVE_FILE_TO_RAM,
    RENAME_RAM_FILE,
    SET_LOGIN_INFO,
    CHANGE_AUTO_SYNC,
    FILELIST_CONTEXT_MENU,
    REMOVE_FILE,
    REMEMBER_HIDE,
    SET_SEARCH_TYPE,
    SET_SEARCH_FILES,
    SET_CLOUD_FILES,
    SET_SEARCH_VALUE
} from './constants'

export const changeActiveKey = id => ({type: CHANGE_ACTIVE_KEY, payload: {id}});

export const setFileLoaded = (id, data) => ({type: SET_FILE_LOADED, payload: {id, data}});

export const changeOpenedFiles = ids => ({type: CHANGE_OPENED_FILE, payload: {ids}});

export const deleteFile = id => ({type: DELETE_FILE, payload: {id}});

export const addFile = file => ({type: ADD_FILE, payload: {file}});

export const addFiles = files => ({type: ADD_FILES, payload: {files}});

export const saveFile = file => ({type: SAVE_FILE_TO_RAM, payload: {file}});

export const renameRamFile = (willRemoveFile, willAddedFile) => ({
    type: RENAME_RAM_FILE,
    payload: {willRemoveFile, willAddedFile}
});

export const setLoginInfo = loginInfo => ({type: SET_LOGIN_INFO, payload: {loginInfo}});

export const changeAutoSync = autoSync => ({type: CHANGE_AUTO_SYNC, payload: {autoSync}});

export const handleContextMenu = contextMenuInfo => ({type: FILELIST_CONTEXT_MENU, payload: {contextMenuInfo}});

export const removeFile = file => ({type: REMOVE_FILE, payload: {file}});

export const rememberHideToTray = ({hideInfo, isHide}) => ({type: REMEMBER_HIDE, payload: {hideInfo, isHide}});

export const setSearchType = searchType => ({type: SET_SEARCH_TYPE, payload: {searchType}});

export const setSearchFiles = searchFiles => ({type: SET_SEARCH_FILES, payload: {searchFiles}});

export const setCloudFiles = cloudFiles => ({type: SET_CLOUD_FILES, payload: {cloudFiles}});

export const setSearchValue = searchValue => ({type: SET_SEARCH_VALUE, payload: {searchValue}});