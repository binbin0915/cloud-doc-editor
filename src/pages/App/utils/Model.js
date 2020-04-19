/**
 * 状态信息模型
 * @author ainuo5213
 * @date 2020-02-27
 */

class Model {
    constructor({code, msg, data}) {
        this.code = code;
        this.msg = msg;
        if (data) {
            this.data = data
        }
    }
}

class SuccessModel extends Model{
    constructor({msg, data}) {
        super({code: 0, msg});
        this.code = 0;
        this.msg = msg;
        if (data) {
            this.data = data
        }
    }
}

class FailedModel extends Model{
    constructor({msg, data}) {
        super({code: 1, msg});
        this.code = 1;
        this.msg = msg;
        if (data) {
            this.data = data
        }
    }
}


class ErrorModel extends Model{
    constructor({msg, data}) {
        super({code: 2, msg});
        this.code = 2;
        this.msg = msg;
        if (data) {
            this.data = data
        }
    }
}

module.exports = {
    SuccessModel,
    ErrorModel,
    FailedModel
};
