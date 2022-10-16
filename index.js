// 站街（洇岚版
const moduleName = "StandOnTheStreet";

const $ = process.env.ENV == 'dev' ? require('./emulators/base') : require('../base');

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const stand = require('./stand');
const info = require('./info');

/**
 * 入口
 */
async function index(message) {
    
    if (message.type != 'GroupMessage') return;

    const { messageChain } = message;

    let msg = '';
    messageChain.forEach(e => {
        if (e.type == 'Plain') {
            msg += e.text
        }
    })
    
    if (!msg.includes("站街")) return;
    
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
        stand(message, timestamp, filePath);
    }

    if (msg == "我的站街工资") {
        info(message, timestamp, filePath);
    }

}

module.exports = index;