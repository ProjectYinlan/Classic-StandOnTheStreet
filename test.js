// 站街（洇岚版）开发测试单元

const main = require('./index');

const text = process.argv.indexOf('-t') == -1 ? "站街" : process.argv[process.argv.indexOf('-t') + 1];

console.log("输入", text);

const message = {
    type: 'GroupMessage',
    messageChain: [
      { type: 'Source', id: 169387, time: 1665906810 },
      { type: 'Plain', text }
    ],
    sender: {
      id: 1285419578,
      memberName: '玖叁',
      specialTitle: '',
      permission: 'MEMBER',
      joinTimestamp: 1657947329,
      lastSpeakTimestamp: 1665906810,
      muteTimeRemaining: 0,
      group: { id: 662595092, name: '大寄天下', permission: 'MEMBER' }
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