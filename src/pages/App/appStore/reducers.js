import {combineReducers} from 'redux-immutable'

import AppReducer from '../store/reducer'


export default combineReducers({
    App: AppReducer,
})
