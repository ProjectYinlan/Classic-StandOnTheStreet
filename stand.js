// 站街主方法

const { bot } = process.env.ENV == 'dev' ? require('./emulators/a') : require('../../a');
const { StandOnTheStreet } = process.env.ENV == 'dev' ? require('./connect') : require('../../connect');

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Text2svg = require('text2svg');
const text2svg = new Text2svg(path.resolve(__dirname, 'fonts/HarmonyOS_Sans_SC_Medium.ttf'));

const { genAvatar, randomRange, formatTs } = require('./common');

const avatarWidth = 64;
const avatarLineHeight = 24;
const cardWidth = 400;
const cardPadding = 18;
const avatarInlineCount = 5;
const cardAvatarMargin = parseInt((cardWidth - avatarWidth * avatarInlineCount - cardPadding * 2) / (avatarInlineCount - 1));
const cardLineHeight = avatarWidth + avatarLineHeight;

/**
 * 站街主方法
 * @param {Message} message 
 * @param {Date} timestamp 
 * @param {String} filePath
 */
module.exports = async function (message, timestamp, filePath) {

    const ts = timestamp.getTime();

    let messageChain = [];

    // 先判断是否有记录
    result = await StandOnTheStreet.findOne({ qq: message.sender.id, group: message.sender.group.id });
    if (!result) {

        await StandOnTheStreet.create({
            group: message.sender.group.id,
            qq: message.sender.id,
            score: 0,
            count: {
                friends: 0,
                others: 0
            },
            into: [],
            out: []
        });

        message.reply({
            type: 'Plain',
            text: "恭喜您加入本群站街行列"
        });

    }

    // 获取群员列表
    const memberList = await bot.getGroupMemberList(message.sender.group.id).then(m => m.map(e => e.id));
    console.log(memberList.length);

    // 总共最多抽多少人
    let totalCountMax = randomRange(0, 30);

    // 最多抽20人，小于20最多群员列表
    const friendsCountMax = memberList.length >= 20 ? 19 : memberList.length - 1;

    // 抽多少人（真随机
    let friendsCount = randomRange(0, friendsCountMax);
    console.log('friendsCount 1', friendsCount);

    // 最多抽多少路人，总和最多30人
    const othersCountMax = friendsCount > totalCountMax ? 0 : totalCountMax - friendsCount;

    // 抽多少路人
    const othersCount = randomRange(0, othersCountMax);
    console.log('othersCount', othersCount);
    const others = {
        count: othersCount,
        score: randomRange(0, 5) * othersCount * 50
    };

    // 接下来抽幸运群友
    let friends = [];
    let friendList = [];
    let outList = [];
    let friendsScore = 0;

    // 首先要确定我们只能抽有钱的，而且不是自己
    const candidateList = await StandOnTheStreet.find({
        qq: { $ne: message.sender.id },
        group: message.sender.group.id,
        score: { $gt: 0 }
    }).then(r => r.map(e => e.qq));

    // 还要判断能抽的是否大于了本身人数
    friendsCount = candidateList.length < friendsCount ? candidateList.length : friendsCount;

    console.log('friendsCount 2', friendsCount);

    if (friendsCount) {

        let j = 0;

        function pickFriend() {

            if (j >= 3) {
                j = 0;
                return;
            }

            const selected = candidateList[randomRange(0, candidateList.length - 1)];
            j++;
            if (friendList.indexOf(selected) == -1) {
                const score = randomRange(0, 10) * 50;
                return {
                    // into 是针对站街人的 into 生成的
                    into: {
                        qq: selected,
                        score
                    },
                    // out 是针对逛街人的 out 生成的
                    out: {
                        qq: message.sender.id,
                        score,
                        ts
                    }
                };
            } else {
                pickFriend();
            }
        }
        for (let i = 0; i < friendsCount; i++) {
            const selected = pickFriend();
            if (!selected) break;
            // 加入 friends 用于组装 into
            friends.push(selected.into);
            friendList.push(selected.into.qq);
            friendsScore += selected.into.score;
            // 加入 outList 用于组装 out
            outList.push({
                qq: selected.into.qq,
                data: selected.out
            })
        }

    }

    // 组装！
    let intoDetail = {
        ts,
        score: friendsScore + others.score,
        others
    }
    if (friendsCount) {
        intoDetail.friends = friends;
    }

    // 操作数据库
    const newResult = await StandOnTheStreet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
        $inc: {
            score: intoDetail.score,
            "count.friends": friendsCount,
            "count.others": others.count
        },
        $addToSet: {
            into: intoDetail
        }
    }, { upsert: true, new: true })

    if (friendsCount) {

        for (let [index, item] of Object.entries(outList)) {
            const { qq, data } = item;
            console.log('outList', item);
            result = await StandOnTheStreet.findOneAndUpdate({ qq, group: message.sender.group.id }, {
                $inc: {
                    score: - data.score
                },
                $addToSet: {
                    out: {
                        qq: data.qq,
                        score: data.score,
                        ts
                    }
                }
            }, { upsert: true })
        }

    }

    messageChain.push({
        type: 'At',
        target: message.sender.id
    })

    let msg = '';
    msg += `卖铺成功！\n`
    msg += `本次开张共获得 ${intoDetail.score} 硬币\n`;

    if (intoDetail.score == 0) {
        msg += `啧啧啧，好惨啊\n`
    }

    msg += `有 ${othersCount} 个路人，从路人获得工资 ${others.score} 硬币\n`;
    if (friendsCount) {
        msg += `有 ${intoDetail.friends.length} 个群友\n`;
    }
    messageChain.push({
        type: 'Plain',
        text: msg
    })

    // 生成整图
    if (friendsCount) {

        console.log('friends', intoDetail.friends);

        const imgBuffer = await genStandCard(intoDetail.friends);

        fs.writeFileSync(filePath, imgBuffer);

        messageChain.push({
            type: 'Image',
            path: filePath
        })

    }

    msg = '';
    msg += `卖铺时间：${formatTs(timestamp)}\n`;
    msg += `现共接客：${newResult.count.friends + newResult.count.others} 人（路人${newResult.count.others} 群友${newResult.count.friends}）\n`;
    msg += `现有工资：${newResult.score} 硬币`;
    messageChain.push({
        type: 'Plain',
        text: msg
    })

    message.reply(messageChain);

}


/**
 * 生成整图
 * @param {Array} dataObj
 * @return {Buffer}
 */
 async function genStandCard(dataObj) {

    const avatarTotalCount = dataObj.length;
    const cardLineCount = Math.ceil(avatarTotalCount / avatarInlineCount);
    const cardHeight = cardLineCount * cardLineHeight + cardPadding * 2 + 64;

    let compositeList = [];

    // 绘制标题
    const title = text2svg.toSVG("来自群友的光临", {
        fontSize: 32
    });
    compositeList.push({
        input: Buffer.from(title.svg),
        top: cardPadding + 16,
        left: cardPadding
    })

    // 绘制头像
    for (let [index, item] of Object.entries(dataObj)) {
        const { qq, score } = item;
        console.log(score);
        const avatarItem = await genStandAvatarItem(qq, score);
        compositeList.push({
            input: avatarItem,
            top: Math.floor(index / avatarInlineCount) * cardLineHeight + cardPadding + 64,
            left: parseInt(cardPadding + (index % avatarInlineCount) * (cardAvatarMargin + avatarWidth))
        })
    }

    // 创建画布
    const card = await sharp({
        create: {
            width: cardWidth,
            height: cardHeight,
            channels: 4,
            background: {
                r: 255,
                g: 255,
                b: 255,
                alpha: 1
            }
        }
    })
        .composite(compositeList)
        .png()
        // .toFile(outputPath)
        .toBuffer()

    return card;

}



/**
 * 生成头像元素
 * @param {Number} qq QQ
 * @param {Number} score 扣钱！
 * @returns {Buffer} 返回生成的图像
 */
 async function genStandAvatarItem(qq, score) {

    score = parseInt(score);

    const avatar = await genAvatar(qq, avatarWidth);

    // 生成文本
    const scoreText = text2svg.toSVG(score.toString(), {
        fontSize: avatarLineHeight - 8
    });

    // 生成一个人的这个那个这个 item
    const avatarItem = await sharp({
        create: {
            width: avatarWidth,
            height: avatarWidth + avatarLineHeight,
            channels: 4,
            background: {
                r: 255,
                g: 255,
                b: 255,
                alpha: 0
            }
        }
    })
        .composite([
            {
                input: avatar,
                top: 0,
                left: 0
            },
            {
                input: Buffer.from(scoreText.svg),
                top: avatarWidth + 4,
                left: Math.ceil((avatarWidth - scoreText.width) / 2)
            }
        ])
        .png()
        .toBuffer()
    // .toFile(outputPath)

    return avatarItem;
}