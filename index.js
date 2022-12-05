// 站街（洇岚版
const moduleName = "StandOnTheStreet";
const env = process.env.ENV || 'prod';

const $ = env == 'dev' ? require('./emulators/base') : require('../base');

const path = require('path');
const s2t = require('chinese-s2t');

const stand = require('./stand');
const info = require('./info');
const rank = require('./rank');
const notify = require('./notify');

/**
 * 入口
 */
async function index(message) {

    let r;

    const { messageChain } = message;

    // 处理私聊消息
    if (message.type == 'FriendMessage' || message.type == 'TempMessage') {

        let msg = '';
        let origin;
        messageChain.forEach(e => {
            if (e.type == 'Plain') {
                msg += e.text;
            }
            if (e.type == 'Quote') {
                origin = e.origin;
            }
        })

        // 退订提醒
        if ( (msg == 'T' || msg == 'TD') && origin ) {
            
            let originMsg = '';
            origin.forEach(e => {
                if (e.type == 'Plain') {
                    originMsg += e.text;
                }
            })

            let ary = /^\[站街提醒\].*\((\d+)\)/.exec(originMsg);

            if (!ary) return;

            let group = parseInt(ary[1]);

            r = await notify.setStatus(message.sender.id, group, false);

            let reply = r.msg;

            reply.shift();

            await message.reply(reply);

            return;

        }

    }


    // 处理群消息

    if (message.type != 'GroupMessage') return;

    let msg = '';
    messageChain.forEach(e => {
        if (e.type == 'Plain') {
            msg += e.text
        }
    })

    if (!msg.includes("站街")) return;

    msg = s2t.t2s(msg);

    if (msg == "关闭站街") {
        $.setModuleStatus(message, moduleName, 0);
    }
    if (msg == "开启站街") {
        $.setModuleStatus(message, moduleName, 1);
    }

    const status = await $.getModuleStatus(message, moduleName);
    if (!status) return;

    const timestamp = new Date();
    const ts = timestamp.getTime();
    const filePath = path.resolve(__dirname, `temp/${ts}.png`);

    if (msg == "站街") {
        stand(message, timestamp, filePath, 'random');
    }

    if (msg == "站街摇人") {
        stand(message, timestamp, filePath, 'call');
    }

    if (msg == "开启站街提醒") {
        r = await notify.setStatus(message.sender.id, message.sender.group.id, true);
        message.reply(r.msg);
    }

    if (msg == "关闭站街提醒") {
        r = await notify.setStatus(message.sender.id, message.sender.group.id, false);
        message.reply(r.msg);
    }

    if (msg == "我的站街工资") {
        info(message, timestamp, filePath);
    }

    if (msg == "站街人气榜") {
        rank(message, timestamp, filePath, 'count');
    }
    if (msg == "站街富豪榜") {
        rank(message, timestamp, filePath, 'score');
    }
    if (msg == "站街赚钱榜") {
        rank(message, timestamp, filePath, 'make_score');
    }
    if (msg == "站街赔钱榜") {
        rank(message, timestamp, filePath, 'lose_score');
    }
    if (msg == "站街乖宝宝榜") {
        rank(message, timestamp, filePath, 'good_boi');
    }
    if (msg == "站街坏宝宝榜") {
        rank(message, timestamp, filePath, 'bad_boi');
    }

}

module.exports = index;