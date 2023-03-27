// 站街（洇岚版
const moduleName = "StandOnTheStreet";
const env = process.env.ENV || 'prod';

const $ = env == 'dev' ? require('./emulators/base') : require('../../base');

const path = require('path');
const fs = require('fs');
const s2t = require('chinese-s2t');
const minimist = require('minimist');

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
        if ((msg == 'T' || msg == 'TD') && origin) {

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

    // console.log(messageChain);


    // 处理群消息

    if (message.type != 'GroupMessage') return;

    let msg = '';
    messageChain.forEach(e => {
        if (e.type == 'Plain') {
            msg += e.text
        }
    })

    // msg = msg.replace(/ /g, '');
    if (!msg.includes("站街") && msg != "炒" && msg != "超" && msg != "操") return;

    msg = s2t.t2s(msg);

    if (msg == "关闭站街") {
        $.setModuleStatus(message, moduleName, 0);
    }
    if (msg == "开启站街") {
        $.setModuleStatus(message, moduleName, 1);
    }
    if (msg == "站街帮助") {
        const helpB64 = fs.readFileSync(path.resolve(__dirname, `assets/help.png`)).toString('base64');
        message.reply([{
            type: 'Image',
            base64: helpB64
        }])
    }

    const status = await $.getModuleStatus(message, moduleName);
    if (!status) return;

    const msgAry = msg.split(" ");
    const msgArgv = minimist(msgAry);
    const msgCmd = msgArgv._;

    const timestamp = new Date();
    const ts = timestamp.getTime();
    const filePath = path.resolve(__dirname, `temp/${ts}.png`);

    if (msgCmd.includes("站街")) {
        let force = (msgArgv.force || msgArgv.f) ? true : false;
        stand(message, timestamp, filePath, 'random', force);
    }

    if (msgCmd.includes("站街摇人") || msgCmd.includes("炒") || msgCmd.includes("超") || msgCmd.includes("操")) {
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
        message.quoteReply("该方法未来将被废弃，请使用 “站街钱包” 代替")
        info(message, timestamp, filePath);
    }
    if (msg == "站街钱包") {
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