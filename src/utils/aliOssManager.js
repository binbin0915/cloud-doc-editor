/**
 * 阿里云OSS控制类
 * @author ainuo5213
 * @data 2020-02-27
 */
const OSS = require('ali-oss');
const fs = require('fs');
const {SuccessModel, ErrorModel, FailedModel} = require('./Model');

class AliOSS {
    constructor({region, accessKeyId, accessKeySecret, bucket}) {
        this.accessKeyId = accessKeyId;
        this.region = region;
        this.accessKeySecret = accessKeySecret;
        this.bucket = bucket;
        this.store = OSS({region, accessKeyId, accessKeySecret, bucket});
        this.client = new OSS({region, accessKeyId, accessKeySecret, bucket});
    }

    signatureUrl(objectName) {
        return this.client.signatureUrl(`${objectName}`)
    }

    /**
     * 是否存在该bucket
     * @param bucketName bucket名字
     * @return {Promise<*>}
     */
    async isExistBucket(bucketName) {
        try {
            await this.store.getBucketInfo(bucketName);
            return new SuccessModel({
                msg: '存在该bucket'
            })
        } catch (e) {
            return new FailedModel({msg: '不存在该bucket'})
        }
    }


    /**
     * 上传文件
     * @param key 云空间的名字
     * @param localPath 本地文件路径
     */
    async uploadFile(key, localPath) {
        try {
            // object表示上传到OSS的Object名称，localPath表示本地文件或者文件路径
            let {res} = await this.client.put(`${key}.md`, localPath);
            if (res.status === 200) {
                return new SuccessModel({
                    msg: '上传成功'
                })
            } else {
                return new FailedModel({
                    msg: '上传失败'
                })
            }
        } catch (e) {
            console.log(e);
            return new ErrorModel({
                msg: '阿里云OSS服务器异常'
            })
        }
    }

    /**
     * 删除文件
     * @param key 文件在OSS的位置
     * @return {Promise<{msg: string, code: number}>}
     */
    async deleteFile(key) {
        let {res} = await this.client.delete(`${key}.md`);
        // 删除成功时ali返回的状态码是204
        if (res.status === 204 || res.status === 200) {
            return new SuccessModel({
                msg: '删除成功'
            })
        } else {
            return new FailedModel({
                msg: '删除失败'
            })
        }
    }

    /**
     * 判断文件是否存在于云端
     * @param key 文件名（不带后缀）
     * @return {Promise<*>}
     */
    async isExistObject(key) {
        try {
            let {res} = await this.client.getObjectMeta(`${key}.md`);
            return new SuccessModel({
                msg: '文件存在于云端',
                data: {
                    lastModified: +new Date(res.headers['last-modified'])
                }
            })
        } catch (e) {
            return new FailedModel({
                msg: '文件不存在于云端'
            })
        }
    }

    async downloadFile(key, filePath) {
        try {
            let {res, stream} = await this.client.getStream(`${key}.md`);
            if (res.status === 200) {
                let writeStream = fs.createWriteStream(filePath);
                stream.pipe(writeStream);
                return new SuccessModel({
                    msg: '下载成功'
                });
            } else {
                return new FailedModel({
                    msg: '下载失败'
                })
            }
        } catch (e) {
            return new ErrorModel({
                msg: '阿里云OSS服务器异常'
            })
        }
    }
}

module.exports = {
    AliOSS
};
