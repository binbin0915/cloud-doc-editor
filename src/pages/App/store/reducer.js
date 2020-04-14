import {fromJS} from 'immutable'
import {
    CHANGE_ACTIVE_KEY,
    SET_FILE_LOADED,
    CHANGE_OPENED_FILE,
    DELETE_FILE,
    ADD_FILE,
    ADD_FILES,
    SAVE_FILE_TO_RAM,
    RENAME_RAM_FILE,
    SET_LOGIN_INFO, CHANGE_AUTO_SYNC, FILELIST_CONTEXT_MENU
} from './constants'
import {array2Obj, obj2Array} from "@/utils/helper";

const {fileStore, settingsStore} = require('@/utils/store');

const defaultState = fromJS({
    files: getFiles() || {},
    searchFiles: [],
    activeFileId: getActiveFileId() || '',
    openedFileIds: getOpenedFileIds() || [],
    unSavedFileIds: getUnSavedFileIds() || [],
    loginInfo: {},
    autoSync: getAutoSync() || false,
    contextMenuInfo: {
        showContextMenu: false,
        position: {
            left: 0,
            right: 0
        },
        file: {}
    },
});

function setAutoSync(autoSync) {
    return settingsStore.set('autoSync', autoSync)
}

function getAutoSync() {
    return settingsStore.get('autoSync')
}

function getActiveFileId() {
    return settingsStore.get('activeFileId')
}

function setActiveFileId(value) {
    settingsStore.set('activeFileId', value)
}

function getOpenedFileIds() {
    return settingsStore.get('openedFileIds')
}

function setOpenedFileIds(ids) {
    settingsStore.set('openedFileIds', ids)
}

function getUnSavedFileIds() {
    return settingsStore.get('unSavedFileIds')
}

function setUnSavedFileIds(ids) {
    settingsStore.set('unSavedFileIds', ids)
}

function getFiles() {
    return fileStore.get('files')
}

function setFiles(files) {
    fileStore.set('files', files)
}

export default function (state = defaultState, action) {
    switch (action.type) {
        case FILELIST_CONTEXT_MENU:
            return state.merge({
                contextMenuInfo: fromJS(action.payload.contextMenuInfo)
            });
        case CHANGE_AUTO_SYNC:
            setAutoSync(action.payload.autoSync);
            return state.merge({
                autoSync: action.payload.autoSync
            });
        case SET_LOGIN_INFO:
            return state.merge({
                loginInfo: fromJS(action.payload.loginInfo)
            });
        case RENAME_RAM_FILE:
            // 删去willRemoveFiles
            let willRemoveFileId = action.payload.willRemoveFile.id;
            let willAddedFile = action.payload.willAddedFile;
            // 删去setting的

            let {[willRemoveFileId]: willRemoveFile, ...willAddedFiles} = state.get('files').toJS();

            let hasAddedFiles = {
                ...willAddedFiles,
                [willAddedFile.id]: willAddedFile
            };
            setFiles(hasAddedFiles);
            return state.merge({
                files: fromJS(hasAddedFiles)
            });
        case SAVE_FILE_TO_RAM:
            return state.merge({
                files: fromJS({
                    ...state.get('files').toJS(),
                    [action.payload.file.id]: action.payload.file
                })
            });
        case ADD_FILES:
            // 传过来的是file arr
            const stateFiles = obj2Array(state.get('files').toJS());
            const addedFiles = array2Obj([...stateFiles, ...action.payload.files]);
            setFiles(addedFiles);
            return state.merge({
                files: fromJS(addedFiles)
            });
        case ADD_FILE:
            const addedFile = {
                ...state.get('files').toJS(),
                [action.payload.file.id]: action.payload.file
            };
            if (!action.payload.file.isNewlyCreate) {
                setFiles(addedFile);
            }
            return state.merge({
                files: fromJS(addedFile)
            });
        case CHANGE_ACTIVE_KEY:
            setActiveFileId(action.payload.id);
            return state.merge({
                activeFileId: action.payload.id
            });
        case SET_FILE_LOADED:
            const file = state.get('files').toJS()[action.payload.id];
            file.loaded = true;
            file.body = action.payload.data;
            const newFiles = {
                ...state.get('files').toJS(),
                [action.payload.id]: file
            };
            return state.merge({
                files: fromJS(newFiles)
            });
        case DELETE_FILE:
            const {[action.payload.id]: deletedFile, ...restFiles} = state.get('files').toJS();
            if (!!getFiles()[action.payload.id]) {
                setFiles(restFiles);
            }
            return state.merge({
                files: fromJS(restFiles)
            });
        case CHANGE_OPENED_FILE:
            setOpenedFileIds(action.payload.ids);
            return state.merge({
                openedFileIds: fromJS(action.payload.ids)
            });
        default:
            return state;
    }
}
