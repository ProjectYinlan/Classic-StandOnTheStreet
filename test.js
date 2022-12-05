// 站街（洇岚版）开发测试单元

const main = require('./index');

const text = process.argv.indexOf('-t') == -1 ? "站街摇人" : process.argv[process.argv.indexOf('-t') + 1];

console.log("输入", text);

const message = {
    type: 'GroupMessage',
    messageChain: [
      { type: 'Source', id: 169387, time: 1665906810 },
      { type: 'Plain', text },
      { type: 'At', target: 1285419578}
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
    },
    quoteReply(messageChain) {
        console.log('quoteReplyFunction', messageChain);
    },
    recall() {
        console.log('recallFunction')
    }
}

main(message);