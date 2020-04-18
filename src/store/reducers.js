import {combineReducers} from 'redux-immutable'

import AppReducer from '../pages/App/store/reducer'


export default combineReducers({
    App: AppReducer,
})
