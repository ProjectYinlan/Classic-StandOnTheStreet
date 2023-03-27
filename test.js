// 站街（洇岚版）开发测试单元

const main = require('./index');

const fs = require('fs');

const text = process.argv.indexOf('-t') == -1 ? "站街 --force" : process.argv[process.argv.indexOf('-t') + 1];

console.log("输入", text);

const message = {
    type: 'GroupMessage',
    messageChain: [
      { type: 'Plain', text },
    ],
    sender: {
      id: 1285419578,
      memberName: '玖叁',
      specialTitle: '',
      permission: 'MEMBER',
      joinTimestamp: 1657947329,
      lastSpeakTimestamp: 1665906810,
      muteTimeRemaining: 0,
      group: { id: 259565487, name: '洇岚窝', permission: 'OWNER' }
    },
    reply(messageChain) {
        console.log('replyFunction', messageChain);
        if (messageChain instanceof Array) {
          messageChain.forEach(e => {
            if (e.type == 'Image') fs.writeFileSync('temp.png', Buffer.from(e.base64, 'base64'));
          });
        } else if (messageChain.type == 'Image') fs.writeFileSync('temp.png', Buffer.from(messageChain.base64, 'base64'));
    },
    quoteReply(messageChain) {
        console.log('quoteReplyFunction', messageChain);
    },
    recall() {
        console.log('recallFunction')
    }
}

main(message);