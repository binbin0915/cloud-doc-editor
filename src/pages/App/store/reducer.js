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
    SET_LOGIN_INFO,
    CHANGE_AUTO_SYNC,
    FILE_ITEM_CONTEXT_MENU,
    REMOVE_FILE,
    REMEMBER_HIDE,
    SET_SEARCH_TYPE,
    SET_CLOUD_FILES,
    SET_SEARCH_FILES,
    SET_SEARCH_VALUE,
    DELETE_CLOUD_FILE,
    TAB_CONTEXT_MENU,
    FILE_LIST_CONTEXT_MENU,
    SET_CLOUD_DIRS,
    SET_CLOUD_CONTEXT_MENU,
    SET_CLOUD_OBJECTS,
    SET_ACTIVE,
    SET_COPY_FILE
} from './constants'
import {array2Obj, obj2Array} from "../utils/helper";

const {fileStore, settingsStore} = require('../utils/store');

const defaultState = fromJS({
    files: getFiles() || {},
    searchFiles: [],
    cloudFiles: [],
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
    tabContextMenuInfo: {
        showContextMenu: false,
        position: {
            left: 0,
            right: 0
        },
        file: {}
    },
    fileListContextMenuInfo: {
        showContextMenu: false,
        position: {
            left: 0,
            right: 0
        }
    },
    hideInfo: getHideInfo() || false,
    isHide: getIsHide() || false,
    searchType: 'local',
    searchValue: '',
    dirs: {},
    objects: {},
    cloudContextMenuInfo: {
        showContextMenu: false,
        position: {
            left: 0,
            right: 0
        },
        file: {}
    },
    loading: false,
    copyFile: {},
    active: ''
});

function setIsHide(isHide) {
    return settingsStore.set('isHide', isHide)
}

function getIsHide() {
    return settingsStore.get('isHide')
}

function setHideInfo(hideInfo) {
    return settingsStore.set('hideInfo', hideInfo)
}

function getHideInfo() {
    return settingsStore.get('hideInfo')
}

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
        case SET_ACTIVE:
            return state.merge({
                active: fromJS(action.payload.active)
            });
        case SET_COPY_FILE:
            return state.merge({
                copyFile: fromJS(action.payload.file)
            });
        case SET_CLOUD_OBJECTS:
            return state.merge({
                loading: true,
                objects: fromJS(action.payload.objects)
            });
        case SET_CLOUD_DIRS:
            return state.merge({
                loading: true,
                dirs: fromJS(action.payload.dirs)
            });
        case SET_CLOUD_CONTEXT_MENU:
            return state.merge({
                cloudContextMenuInfo: fromJS(action.payload.cloudContextMenuInfo)
            });
        case FILE_LIST_CONTEXT_MENU:
            return state.merge({
                fileListContextMenuInfo: fromJS(action.payload.fileListContextMenuInfo)
            });
        case TAB_CONTEXT_MENU:
            return state.merge({
                tabContextMenuInfo: fromJS(action.payload.tabContextMenuInfo)
            });
        case DELETE_CLOUD_FILE:
            let newCloudFiles = state.get('cloudFiles').toJS().filter(file => file.id !== action.payload.cloudFile.id && file.title !== action.payload.cloudFile.title);
            return state.merge({
                cloudFiles: fromJS(newCloudFiles),
            });
        case SET_SEARCH_VALUE:
            return state.merge({
                searchValue: action.payload.searchValue,
            });
        case SET_SEARCH_FILES:
            return state.merge({
                searchFiles: fromJS(action.payload.searchFiles),
            });
        case SET_CLOUD_FILES:
            return state.merge({
                cloudFiles: fromJS(action.payload.cloudFiles),
            });
        case SET_SEARCH_TYPE:
            return state.merge({
                searchType: action.payload.searchType,
            });
        case REMEMBER_HIDE:
            setHideInfo(action.payload.hideInfo);
            setIsHide(action.payload.isHide);
            return state.merge({
                hideInfo: action.payload.hideInfo,
                isHide: action.payload.isHide
            });
        case REMOVE_FILE:
            let {[action.payload.file.id]: willRemovedFile, ...removedFile} = state.get('files').toJS();
            setFiles(removedFile);
            return state.merge({
                files: fromJS(removedFile)
            });
        case FILE_ITEM_CONTEXT_MENU:
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
            let {[willRemoveFileId]: willRemoveFile, ...willAddedFiles} = state.get('files').toJS();
            // 删去setting的
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
            let deletedFilesArr = obj2Array(state.get('files').toJS()).filter(file => file.id !== action.payload.file.id && file.title !== action.payload.file.title);
            let deletedFilesObj = array2Obj(deletedFilesArr);
            if (!action.payload.file.isNewlyCreate) {
                setFiles(deletedFilesObj);
            }
            return state.merge({
                files: fromJS(deletedFilesObj)
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
