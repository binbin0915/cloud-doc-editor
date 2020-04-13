import {
    CHANGE_ACTIVE_KEY,
    SET_FILE_LOADED,
    CHANGE_OPENED_FILE,
    DELETE_FILE,
    ADD_FILE,
    ADD_FILES,
    SAVE_FILE_TO_RAM,
    RENAME_RAM_FILE,
    SET_LOGIN_INFO
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