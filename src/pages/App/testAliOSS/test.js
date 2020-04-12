let fs = require('fs');
let path = require('path');
const oss = require('ali-oss');
// let rs = fs.createWriteStream(path.join(__dirname, '../../../1.md'));
// console.log(rs);
// const {AliOSS} = require('../../../utils/aliOssManager');
//
//
let client = oss({
    region: 'oss-cn-beijing',
    accessKeyId: 'LTAI4FtdgeNDbHtktD2VegEb',
    accessKeySecret: 'R3JuK67lEFhB9lH5UJljoCbYJ8NpBI',
    bucket: 'cloud-doc-editor'
});
let url = client.generateObjectUrl('/625815f7-7193-4867-82d3-b2c0c5c61ed8/img/20200412111710.jpg')
// client.list({prefix: '625815f7-7193-4867-82d3-b2c0c5c61ed8/'})
//     .then(data => console.log(data));
// const filePath = path.join(__dirname, '../../../1.md');
// const key = '1';
// client.uploadFile(key, filePath)
//     .then(data => {
//         console.log(data)
//     });

// client.isExistObject('test')
//     .then(data => console.log(data));
// client.getBucketInfo('cloud-doc-editor').then(data => console.log(data));
// client.deleteFile('test2.md')
//     .then(data => {
//         console.log(data)
//     });

// client.downloadFile('69f65fed-446c-476f-8170-c41f7474c51c/sss:50a7d32d-7735-4d5c-8106-aa3ffa61cc8c', path.join(__dirname, './test2.md'))
//     .then(data => console.log(data));
// AliOSS.getObjectList({
//     prefix: 'markdown/',
//     delimiter: '/'
// }).then(data => console.log(data));
