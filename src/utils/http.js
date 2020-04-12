import axios from 'axios'

const instance = axios.create({
    timeout: 3000,
    baseURL: process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8059/api': 'dummy'
});

instance.interceptors.response.use(res => {
    return res.data;
}, error => {
    return Promise.reject(error)
});

export default instance;
