// 站街提醒

const env = process.env.ENV || 'prod';

const { StandOnTheStreet } = env == 'dev' ? require('./connect') : require('../../../db').schemas;

/**
 * 设置站街提醒状态
 * @param {Number} qq
 * @param {Number} group
 * @param {Boolean} status
 * @return {Number} return
 */
async function setStatus(qq, group, status) {

    let r;

    r = await StandOnTheStreet.findOne({ qq, group });

    if (!r) return {
        code: 404,
        msg: [
            {
                type: 'At',
                target: qq
            },
            {
                type: 'Plain',
                text: "您还没有站过街"
            }
        ]
    };

    r = await StandOnTheStreet.findOneAndUpdate({
        qq,
        group
    }, {
        $set: {
            notify: status
        }
    }, {
        new: true
    });

    return {
        code: 200,
        msg: [
            {
                type: 'At',
                target: qq
            },
            {
                type: 'Plain',
                text: `操作成功\n已更改为 ${r.notify ? "开启" : "关闭"}`
            }
        ]
    }

}

/**
 * 获取站街提醒状态
 * @param {Number} qq
 * @param {Number} group
 * @return {Number} status
 */
async function getStatus(qq, group) {

    let r;

    let result = 0;

    r = await StandOnTheStreet.findOne({ qq, group });

    if (typeof(r.notify) == 'undefined') {
        result = -1;
        await StandOnTheStreet.findOneAndUpdate({ qq, group }, { $set: { notify: true } });
    } else if (r.notify) {
        result = 1;
    }
    
    return result;

}

module.exports = {
    setStatus,
    getStatus
}