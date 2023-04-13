// 站街主方法

const env = process.env.ENV || 'prod';

const { bot } = env == 'dev' ? require('./emulators/a') : global;
const { StandOnTheStreet, Wallet } = env == 'dev' ? require('./connect') : require('../../../db').schemas;

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Text2svg = require('text2svg');
// const text2svg = new Text2svg(path.resolve(__dirname, 'fonts/HarmonyOS_Sans_SC_Medium.ttf'));
const text2svg = new Text2svg(path.resolve(__dirname, 'fonts/SourceHanSerifSC-Heavy.ttf'));

const { genAvatar, genRoundedRect, genHr, formatTs, randomRange, randomArrayElem, getDayDate } = require('./common');
const contents = require('./content.json').stand;
const { version } = require('./package.json');

const scoreIcon = fs.readFileSync(path.resolve(__dirname, 'assets/stand_booked.png'));
const countIcon = fs.readFileSync(path.resolve(__dirname, 'assets/stand_person.png'));

const footer = "Designed by null, modified by 93.";
let content = '';
let msgContent = '';

const contentFontSize = 18;
const secondaryFontSize = 16;
const iconSize = 24;
const contentLineHeight = contentFontSize + 10;
const secondaryLineHeight = secondaryFontSize + 5;
const cardWidth = 400;
const cardPadding = 30;
const cardChildrenMargin = 20;
const avatarSize = 36;
const innerCardWidth = cardWidth - cardPadding * 2;
const innerCardPadding = 20;
const innerCardChildrenMargin = 12;
const innerCardChildrenWidth = cardWidth - cardPadding * 2 - innerCardPadding * 2;

const avatarInlineCount = 5;
const avatarItemMargin = 4;

const avatarMargin = 8;
const avatarItemWidth = avatarSize + avatarMargin * 2;
const avatarItemHeight = avatarSize + secondaryLineHeight;

let avatarItemLineCount;
let avatarGroupHeight;

let innerCardHeight;

/**
 * 站街主方法
 * @param {Message} message 
 * @param {Date} timestamp 
 * @param {String} filePath
 * @param {String} type random | call
 * @param {Boolean} force
 */
module.exports = async function (message, timestamp, filePath, type, force) {

    msgContent = '';

    const ts = timestamp.getTime();

    // 获取今日零时的ts
    const dayTs = getDayDate(timestamp).getTime();

    let messageChain = [];

    let notifyList = [];

    // 判断是否有记录以及时限
    result = await StandOnTheStreet.findOne({ qq: message.sender.id, group: message.sender.group.id });
    if (!result) {

        // 第一次

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

        message.reply([
            {
                type: 'At',
                target: message.sender.id
            },
            {
                type: 'Plain',
                text: "恭喜您加入本群站街行列"
            }
        ]);

    } else if (result.nextTime > ts && env != 'dev') {

        // 非开发环境 时间不够

        // 判断是否使用 force

        if (!force) {

            content = randomArrayElem(contents.many) + '\n';

            content += `下次时间为：${formatTs(new Date(result.nextTime))}`;

            message.reply([
                {
                    type: 'At',
                    target: message.sender.id
                },
                {
                    type: 'Plain',
                    text: content
                }
            ]);

            return;

        } else if (result.force) {

            content = randomArrayElem(contents.too_many) + '\n';

            content += "请在下次时间到达后使用普通站街\n"

            content += `下次时间为：${formatTs(new Date(result.nextTime))}`;

            message.reply([
                {
                    type: 'At',
                    target: message.sender.id
                },
                {
                    type: 'Plain',
                    text: content
                }
            ]);

            return;

        }

    }

    // 判断是否真的需要 force
    if (!result || (result.nextTime < ts && env != 'dev')) force = false;

    let intoDetail = {};
    let outList = [];
    let canForce = false;

    // 获取钱包
    let walletResult = await Wallet.findOne({ qq: message.sender.id, group: message.sender.group.id });

    // 富豪手续费
    if (walletResult && walletResult.balance > 20000) {

        // 获取最近五次数据
        const recent = result.into.slice(-5).map(e => e.score);

        // 平均值
        const avg = recent.reduce((acc, curr) => acc + curr) / recent.length;

        // 手续费
        const commission = Math.round(avg * 0.2);

        // 扣费
        // const newResult = await StandOnTheStreet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
        //     $inc: {
        //         score: 0 - commission
        //     }
        // }, { new: true })
        const newResult = await Wallet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
            $inc: {
                balance: 0 - commission
            }
        }, { new: true })

        msgContent += `\n已扣除富豪手续费 ${commission}，余额为 ${newResult.balance}`;

    }

    // force 手续费
    if (force) {

        // 获取最近五次数据
        const recent = result.into.slice(-5).map(e => e.score);

        // 平均值
        const avg = recent.reduce((acc, curr) => acc + curr) / recent.length;

        // 手续费
        const commission = Math.round(avg * 0.5);

        // 扣费
        // const newResult = await StandOnTheStreet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
        //     $inc: {
        //         score: 0 - commission
        //     }
        // }, { new: true })
        const newResult = await Wallet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
            $inc: {
                balance: 0 - commission
            }
        }, { new: true })

        // 抽一下 杨威 buff
        canForce = Math.random() < 0.3 ? true : false;

        msgContent += `\n已扣除强制站街手续费 ${commission}，余额为 ${newResult.balance}`;

        if (canForce) msgContent += '\n恭喜您，获得杨威Buff，站街CD增加18小时';

    }

    // 如果是随机
    switch (type) {

        case 'random':

            // 获取群员列表
            const memberList = await bot.getGroupMemberList(message.sender.group.id).then(m => m.map(e => e.id));
            if (env == 'dev') console.log(memberList.length);

            // 总共最多抽多少人
            let totalCountMax = randomRange(0, 30);

            // 最多抽20人，小于20最多群员列表
            const friendsCountMax = memberList.length >= 20 ? 19 : memberList.length - 1;

            // 抽多少人（真随机
            let friendsCount = randomRange(0, friendsCountMax);
            if (env == 'dev') console.log('friendsCount 1', friendsCount);

            // 最多抽多少路人，总和最多30人
            const othersCountMax = friendsCount > totalCountMax ? 0 : totalCountMax - friendsCount;

            // 抽多少路人
            const othersCount = randomRange(0, othersCountMax);
            if (env == 'dev') console.log('othersCount', othersCount);
            const others = {
                score: randomRange(0, 5) * othersCount * 50,
                count: othersCount
            };

            // 接下来抽幸运群友
            let friends = [];
            let friendList = [];
            let friendsScore = 0;

            // 首先要确定我们只能抽有钱的，而且不是自己
            // 而且是今天造访他人小于2次的

            const candidateList = await StandOnTheStreet.aggregate(
                [
                    {
                        "$match": {
                            "group": message.sender.group.id,
                            "qq": {
                                "$ne": message.sender.id
                            }
                        }
                    },
                    {
                        "$lookup": {
                            "from": "wallets",
                            "let": {
                                "qq": "$qq",
                                "group": "$group"
                            },
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {
                                                    "$eq": [
                                                        "$qq",
                                                        "$$qq"
                                                    ]
                                                },
                                                {
                                                    "$eq": [
                                                        "$group",
                                                        "$$group"
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            ],
                            "as": "wallets"
                        }
                    },
                    {
                        "$project": {
                            "qq": 1.0,
                            "group": 1.0,
                            "force": 1.0,
                            "out": 1.0,
                            "nextTs": 1.0,
                            "balance": {
                                "$arrayElemAt": [
                                    "$wallets.balance",
                                    0.0
                                ]
                            }
                        }
                    },
                    {
                        "$match": {
                            "balance": {
                                "$gt": 0
                            }
                        }
                    }
                ]
            ).then(r => {

                // const candidateList = await StandOnTheStreet.find({
                //     qq: { $ne: message.sender.id },
                //     group: message.sender.group.id,
                //     score: { $gt: 0 }
                // }).then(r => {

                let result = [];

                // 遍历结果
                r.forEach(e => {

                    // 获取造访记录
                    const { out } = e;

                    // 日造访计数
                    let dayOut = 0;

                    out.forEach(e1 => {

                        if (e1.ts && e1.ts >= dayTs) dayOut++;

                    })

                    if (dayOut < 2) result.push(e.qq);

                })

                return result;

            });

            // 还要判断能抽的是否大于了本身人数
            friendsCount = candidateList.length < friendsCount ? candidateList.length : friendsCount;

            if (env == 'dev') console.log('friendsCount 2', friendsCount);

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
                        const score = randomRange(0, 6) * 50;
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
            intoDetail = {
                ts,
                score: friendsScore + others.score,
                others
            }
            if (friendsCount) {
                intoDetail.friends = friends;
            }

            break;

        // 摇人
        case 'call':

            let at = -1;
            let atCount = 0;

            message.messageChain.forEach(chain => {
                if (chain.type == 'At') {
                    at = chain.target;
                    atCount++;
                };
            })

            // 如果没at
            if (at == -1) {
                message.quoteReply("您没有选择摇人对象。");
                return;
            }

            // 如果at太多
            if (atCount > 1) {
                message.quoteReply("一次只能光临一人哦。");
                return;
            }

            // 先确定此人是否站过街 或 没钱了
            // result = await StandOnTheStreet.findOne({ qq: at, group: message.sender.group.id, score: { $gt: 0 } });
            result = await StandOnTheStreet.aggregate(
                [
                    {
                        "$match": {
                            "group": message.sender.group.id,
                            "qq": at
                        }
                    },
                    {
                        "$lookup": {
                            "from": "wallets",
                            "let": {
                                "qq": "$qq",
                                "group": "$group"
                            },
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {
                                                    "$eq": [
                                                        "$qq",
                                                        "$$qq"
                                                    ]
                                                },
                                                {
                                                    "$eq": [
                                                        "$group",
                                                        "$$group"
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            ],
                            "as": "wallets"
                        }
                    },
                    {
                        "$project": {
                            "qq": 1.0,
                            "group": 1.0,
                            "force": 1.0,
                            "out": 1.0,
                            "nextTs": 1.0,
                            "balance": {
                                "$arrayElemAt": [
                                    "$wallets.balance",
                                    0.0
                                ]
                            }
                        }
                    }
                ]
            )

            if (!result) {
                message.quoteReply("他还没站过街。");
                return;
            }

            if (!result.balance || result.balance <= 0) {
                message.quoteReply("他已经没钱了。");
                return;
            }

            // 再判断此人今日是否造访过他人两次及以上
            if (result.out) {

                let dayOut = 0;

                result.out.forEach(e => {

                    if (e.ts && e.ts >= dayTs) dayOut++;

                })

                if (dayOut >= 2) {

                    message.quoteReply(`他今天已经被榨${dayOut}次了，牛牛已经累了`);
                    return;

                }

            }

            // 配置输出
            const score = randomRange(0, 12) * 50;

            // 加入 outList 用于组装 out
            outList.push({
                qq: at,
                data: {
                    qq: message.sender.id,
                    score,
                    ts
                }
            })

            intoDetail = {
                ts,
                score,
                friends: [{
                    qq: at,
                    score
                }],
                others: {
                    count: 0,
                    score: 0
                }
            }

            break;

        default:
            return;
    }


    // 操作数据库
    const newResult = await StandOnTheStreet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
        $inc: {
            score: intoDetail.score,
            "count.friends": typeof (intoDetail.friends) == 'object' ? intoDetail.friends.length : 0,
            "count.others": intoDetail.others.count,
            "stats.into": intoDetail.score
        },
        $addToSet: {
            into: intoDetail
        },
        $set: {
            nextTime: ts + (12 * 60 * 60 * 1000) + (canForce ? (18 * 60 * 60 * 1000) : 0),
            force: canForce
        }
    }, { upsert: true, new: true })
    const newWalletResult = await Wallet.findOneAndUpdate({ qq: message.sender.id, group: message.sender.group.id }, {
        $inc: {
            balance: intoDetail.score
        },
        $addToSet: {
            bill: {
                change: intoDetail.score,
                desc: "站街 - 收入",
                timestamp: ts
            }
        }
    }, { upsert: true, new: true });

    // 这里是操作光临的人的数据库
    if (outList.length != 0) {

        for (let [index, item] of Object.entries(outList)) {
            const { qq, data } = item;
            result = await Wallet.findOneAndUpdate({ qq, group: message.sender.group.id }, {
                $inc: {
                    balance: 0 - data.score
                },
                $addToSet: {
                    bill: {
                        change: 0 - data.score,
                        desc: "站街 - 支出",
                        timestamp: ts
                    }
                }
            }, { upsert: true, new: true });
            result = await StandOnTheStreet.findOneAndUpdate({ qq, group: message.sender.group.id }, {
                $inc: {
                    score: 0 - data.score,
                    "stats.out": data.score
                },
                $addToSet: {
                    out: {
                        qq: data.qq,
                        score: data.score,
                        ts
                    }
                }
            }, { upsert: true, new: true });

            // 这里是用于通知对方的

            let notifyStatus = 0;

            if (typeof (result.notify) == 'undefined') {
                notifyStatus = -1;
                await StandOnTheStreet.findOneAndUpdate({ qq, group: message.sender.group.id }, { $set: { notify: true } });
            } else if (result.notify) {
                notifyStatus = 1;
            }

            notifyList.push({
                qq,
                out: data.qq,
                detail: data.score,
                score: result.score,
                status: notifyStatus
            });
        }

    }

    const cardDataObj = {
        qq: message.sender.id,
        nick: message.sender.memberName,
        data: {
            total: {
                score: intoDetail.score,
                count: intoDetail.others.count + outList.length
            },
            others: intoDetail.others,
            friends: {
                score: intoDetail.score - intoDetail.others.score,
                list: intoDetail.friends
            },
        },
        score: newWalletResult.balance,
        count: newResult.count.friends + newResult.count.others,
        timestamp
    }

    // 判断人均
    const per = Math.ceil(cardDataObj.data.total.score / cardDataObj.data.total.count);
    content = (per == 0 || isNaN(per)) ? randomArrayElem(contents.succeed.none) : randomArrayElem(contents.succeed.normal);

    if (env == 'dev') console.log('cardDataObj', cardDataObj);

    messageChain.push({
        type: 'At',
        target: message.sender.id
    })

    let msg = '';
    msg += content + msgContent + "\n";
    messageChain.push({
        type: 'Plain',
        text: msg
    })

    // 生成整图

    const imgBuffer = await genCard(cardDataObj);

    // fs.writeFileSync(filePath, imgBuffer);

    const imgB64 = imgBuffer.toString('base64');

    messageChain.push({
        type: 'Image',
        // path: filePath
        base64: imgB64
    })

    let r = await message.reply(messageChain);

    console.log("信息发送");

    // 发送提醒消息
    if (outList.length != 0) {
        for (const [index, item] of Object.entries(notifyList)) {

            const { qq, detail, score, status } = item;

            if (status == 0) continue;

            let msg = '';
            msg += `[站街提醒] 群 ${message.sender.group.name} (${message.sender.group.id})\n`;
            msg += `您光临了 ${message.sender.memberName} (${message.sender.id})\n`;
            msg += `共计消费 ${detail}，余额 ${score}`;

            if (status == -1) msg += "\n这是您在该群第一次收到该通知，提醒功能默认开启，可在群内发送“关闭站街提醒”或回复该消息“T”或“TD”退订";

            r = await bot.sendTempMessage(msg, qq, message.sender.group.id);

            console.log("通知信息发送");
        }
    }

    // 删除文件捏
    // if (env != 'dev') fs.unlinkSync(filePath);

}


/**
 * 生成详情的条目
 * @param {String} title 
 * @param {Number} score 
 * @param {Number} count 
 * @return {Buffer}
 */
async function genDetailItem(title, score, count) {

    const scoreIconLeft = 58;
    const countIconLeft = 193;

    const iconTop = (contentLineHeight - 24) / 2 + 2;

    const titleText = text2svg.toSVG(title, {
        fontSize: contentFontSize
    });
    const scoreText = text2svg.toSVG(`${score} 硬币`, {
        fontSize: contentFontSize
    });
    const countText = text2svg.toSVG(`${count} 人次`, {
        fontSize: contentFontSize
    });

    const detailItem = await sharp({
        create: {
            width: innerCardChildrenWidth,
            height: contentLineHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
    })
        .composite([
            {
                input: Buffer.from(titleText.svg),
                top: 0,
                left: 0
            },
            {
                input: scoreIcon,
                top: iconTop,
                left: scoreIconLeft
            },
            {
                input: Buffer.from(scoreText.svg),
                top: 0,
                left: scoreIconLeft + iconSize + 6
            },
            {
                input: countIcon,
                top: iconTop,
                left: countIconLeft
            },
            {
                input: Buffer.from(countText.svg),
                top: 0,
                left: countIconLeft + iconSize + 6
            }
        ])
        .png()
        .toBuffer()

    return detailItem;

}

/**
 * 生成头像组卡片
 * @param {Array} friendsList 
 */
async function genAvatarGroup(friendsList) {

    avatarItemLineCount = Math.ceil(friendsList.length / avatarInlineCount);
    avatarGroupHeight = avatarItemLineCount * avatarItemHeight + (avatarItemLineCount - 1) * avatarMargin;

    let avatarItemList = [];

    for (const [index, item] of Object.entries(friendsList)) {

        const { qq, score } = item;

        const avatarItem = await genAvatarItem(qq, score);

        avatarItemList.push({
            input: avatarItem,
            top: Math.floor(index / avatarInlineCount) * (avatarItemHeight + avatarMargin),
            left: Math.ceil((index % avatarInlineCount) * (avatarItemMargin + avatarItemWidth))
        })

    }

    const avatarGroup = await sharp({
        create: {
            width: innerCardChildrenWidth,
            height: avatarGroupHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
    })
        .composite(avatarItemList)
        .png()
        .toBuffer()

    return avatarGroup;

}

/**
 * 生成头像元素
 * @param {Number} qq 
 * @param {Number} score 
 * @return {Buffer}
 */
async function genAvatarItem(qq, score) {

    const avatar = await genAvatar(qq, avatarSize);

    const scoreText = text2svg.toSVG((score == 0 || score == '0') ? "白嫖" : score.toString(), {
        fontSize: secondaryFontSize
    });

    const avatarItem = await sharp({
        create: {
            width: avatarItemWidth,
            height: avatarItemHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
    })
        .composite([
            {
                input: avatar,
                top: 0,
                left: avatarMargin
            },
            {
                input: Buffer.from(scoreText.svg),
                top: avatarSize,
                left: Math.ceil((avatarItemWidth - scoreText.width) / 2)
            }
        ])
        .png()
        .toBuffer()

    return avatarItem;

}

/**
 * 生成 inner 卡片
 * @param {Object} dataObj 
 * @return {Buffer}
 */
async function genInnerCard(dataObj) {

    let compositeList = [];

    // 按照顺序走的一个变量
    let currentTop = innerCardPadding;

    const { total, others, friends } = dataObj;

    // 生成分割线
    const hrItem = await genHr(innerCardChildrenWidth, "#bdbdbd", 2);

    // 数据

    // 总计
    const totalItem = await genDetailItem("总计", total.score, total.count);
    compositeList.push({
        input: totalItem,
        top: currentTop,
        left: innerCardPadding
    })
    currentTop += contentLineHeight + innerCardChildrenMargin;


    // 路人
    if (others.count != 0) {

        // 分割线
        compositeList.push({
            input: hrItem,
            top: currentTop,
            left: innerCardPadding
        })
        currentTop += innerCardChildrenMargin;

        const othersItem = await genDetailItem("路人", others.score, others.count);
        compositeList.push({
            input: othersItem,
            top: currentTop,
            left: innerCardPadding
        })
        currentTop += contentLineHeight + innerCardChildrenMargin;

    }

    // 群友
    if (friends.list) {

        // 分割线
        compositeList.push({
            input: hrItem,
            top: currentTop,
            left: innerCardPadding
        })
        currentTop += innerCardChildrenMargin;

        if (friends.list) {

            const friendsItem = await genDetailItem("群友", friends.score, friends.list.length);
            compositeList.push({
                input: friendsItem,
                top: currentTop,
                left: innerCardPadding
            })
            currentTop += contentLineHeight + innerCardChildrenMargin;

            // 头像组
            const avatarGroupItem = await genAvatarGroup(friends.list);
            compositeList.push({
                input: avatarGroupItem,
                top: currentTop,
                left: innerCardPadding
            })
            currentTop += avatarGroupHeight + innerCardChildrenMargin;

        }

    }

    // 使用 currentTop 计算 height
    innerCardHeight = currentTop - innerCardChildrenMargin + innerCardPadding;

    // 圆角矩形
    const roundedRect = await genRoundedRect(innerCardWidth, innerCardHeight, 15, "#bdbdbd", 2);
    compositeList.push({
        input: roundedRect,
        top: 0,
        left: 0
    })

    const innerCard = await sharp({
        create: {
            width: innerCardWidth,
            height: innerCardHeight,
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
        .toBuffer()

    return innerCard;

}

/**
 * 生成数据信息条目
 * @param {Number} score 
 * @param {Number} count 
 */
async function genDataItem(score, count) {

    const scoreIcon = await sharp(path.resolve(__dirname, 'assets/stand_wallet.png')).toBuffer();
    const countIcon = await sharp(path.resolve(__dirname, 'assets/stand_person_total.png')).toBuffer();

    const iconTop = (contentLineHeight - 20) / 2;

    const scoreText = text2svg.toSVG(`${score} 硬币`, {
        fontSize: contentFontSize
    });

    const scoreIconLeft = Math.ceil((innerCardWidth / 2 - (iconSize + 2 + scoreText.width)) / 2);
    const scoreTextLeft = scoreIconLeft + iconSize + 2;

    const countText = text2svg.toSVG(`${count} 人次`, {
        fontSize: contentFontSize
    });

    const countIconLeft = Math.ceil(innerCardWidth / 2 + (innerCardWidth / 2 - (iconSize + 2 + countText.width)) / 2);
    const countTextLeft = countIconLeft + iconSize + 2;

    const dataItem = await sharp({
        create: {
            width: innerCardWidth,
            height: contentLineHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
    })
        .composite([
            {
                input: scoreIcon,
                top: iconTop,
                left: scoreIconLeft
            },
            {
                input: Buffer.from(scoreText.svg),
                top: 0,
                left: scoreTextLeft
            },
            {
                input: countIcon,
                top: iconTop,
                left: countIconLeft
            },
            {
                input: Buffer.from(countText.svg),
                top: 0,
                left: countTextLeft
            }
        ])
        .png()
        .toBuffer()

    return dataItem;

}

/**
 * 生成整张卡片
 * @param {Object} dataObj
 */
async function genCard(dataObj) {

    let compositeList = [];
    let currentTop = cardPadding;

    const { qq, nick, data, score, count, timestamp } = dataObj;

    // 生成头像
    const avatar = await genAvatar(qq, avatarSize);
    compositeList.push({
        input: avatar,
        top: currentTop,
        left: cardPadding
    })
    currentTop += avatarSize + cardChildrenMargin;

    // 生成昵称
    const nickTextTemp = text2svg.toSVG(nick, {
        fontSize: contentFontSize
    });

    // 判断昵称宽度
    const nickTextMaxWidth = cardWidth - cardPadding * 2 - avatarSize - 12;

    let nickText;

    if (nickTextTemp.width > nickTextMaxWidth) {
        nickText = await sharp(Buffer.from(nickTextTemp.svg)).resize(nickTextMaxWidth).png().toBuffer();
    } else {
        nickText = Buffer.from(nickTextTemp.svg);
    }

    const nickTextHeight = (await sharp(nickText).metadata()).height;

    const nickTop = Math.ceil(cardPadding + (avatarSize - nickTextHeight) / 2)
    const nickLeft = cardPadding + avatarSize + 12;

    compositeList.push({
        input: nickText,
        top: nickTop,
        left: nickLeft
    })

    // 生成文案
    const contentText = text2svg.toSVG(content, {
        fontSize: contentFontSize
    });
    const contentTop = cardPadding + avatarSize + cardChildrenMargin;
    compositeList.push({
        input: Buffer.from(contentText.svg),
        top: currentTop,
        left: cardPadding
    })
    currentTop += contentLineHeight + cardChildrenMargin;

    // 生成 inner 卡片
    const innerCard = await genInnerCard(data);
    compositeList.push({
        input: innerCard,
        top: currentTop,
        left: cardPadding
    })
    currentTop += (await sharp(innerCard).metadata()).height + cardChildrenMargin;

    // 生成数据元素
    const dataItem = await genDataItem(score, count);
    compositeList.push({
        input: dataItem,
        top: currentTop,
        left: cardPadding
    })
    currentTop += contentLineHeight + cardChildrenMargin;

    // 生成页脚
    const footerText = text2svg.toSVG(footer, {
        fontSize: secondaryFontSize
    })
    compositeList.push({
        input: Buffer.from(footerText.svg),
        top: currentTop,
        left: Math.ceil((cardWidth - footerText.width) / 2)
    })
    currentTop += secondaryLineHeight + 2;

    const tsText = text2svg.toSVG(formatTs(timestamp), {
        fontSize: secondaryFontSize
    })
    compositeList.push({
        input: Buffer.from(tsText.svg),
        top: currentTop,
        left: Math.ceil((cardWidth - tsText.width) / 2)
    })
    currentTop += secondaryLineHeight + 2;

    const versionText = text2svg.toSVG(version, {
        fontSize: secondaryFontSize
    })
    compositeList.push({
        input: Buffer.from(versionText.svg),
        top: currentTop,
        left: Math.ceil((cardWidth - versionText.width) / 2)
    })
    currentTop += secondaryLineHeight + cardChildrenMargin;

    const cardHeight = currentTop;

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
        .toBuffer()

    return card;

}