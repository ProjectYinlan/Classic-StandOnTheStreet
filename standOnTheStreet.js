// 站街（洇岚版

let timestamp;
let ts;

const { StandOnTheStreet } = require('./connect');

const sharp = require('sharp');
const fs = require('fs');
const Text2svg = require('text2svg');
const axios = require('axios');
const path = require('path');

const text2svg = new Text2svg(path.resolve(__dirname, 'StandOnTheStreet/fonts/HarmonyOS_Sans_SC_Medium.ttf'));

const filePath = path.resolve(__dirname, `StandOnTheStreet/temp/${ts}.png`);

const avatarWidth = 64;
const avatarLineHeight = 24;
const cardWidth = 400;
const cardPadding = 18;
const avatarInlineCount = 5;
const cardAvatarMargin = parseInt((cardWidth - avatarWidth * avatarInlineCount - cardPadding * 2) / (avatarInlineCount - 1));
const cardLineHeight = avatarWidth + avatarLineHeight;

main();

async function main() {

    const message = {
        messageChain: [
            {
                type: 'Plain',
                text: "我的站街工资"
            }
        ],
        sender: {
            group: {
                id: 583102898
            },
            memberName: "玖叁",
            id: 1285419578
        },
        reply(chain) {
            console.log(chain)
        }
    }

    index(message);

}

/**
 * 入口
 */
async function index(message) {

    timestamp = new Date();
    ts = timestamp.getTime();

    const { messageChain } = message;

    let msg = '';
    messageChain.forEach(e => {
        if (e.type == 'Plain') {
            msg += e.text
        }
    })

    if (msg == "站街") {
        await stand(message);
        // message.reply(__dirname);
        // console.log(message);
    }

    if (msg == "我的站街工资") {
        await getSalary(message);
    }

}

/**
 * 主方法
 */
async function stand(message) {

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
    // const memberList = await bot.getGroupMemberList(message.sender.group.id).then(m => m.map(e => e.id));
    const memberList = [
        435907629, 468403876, 746515005,
        918222714, 1138600832, 1158735317,
        1285419578, 1306542338, 1417324298,
        1439881410, 1581647952, 1622912909,
        1649157526, 1660398619, 1660466270,
        1914644780, 1977477207, 2275203821,
        2534917958, 2544704967, 2637037990,
        2840936218, 2908807760, 2970290021,
        3056256780, 3219065882, 2954819930,
        2944993270, 1804385478, 3376149059,
        3387660196, 3191632795, 3210515730,
        553380690
    ]
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

/**
 * 生成头像
 * @param {Number} qq QQ
 * @param {Number} size resize
 * @returns {Buffer}
 */
async function genAvatar(qq, size) {

    if (!size) {
        size = 64
    }

    // 获取头像
    const input = await axios.get(`https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`, {
        responseType: 'arraybuffer'
    }).then(response => Buffer.from(response.data, 'binary'));

    const metadata = await sharp(input).metadata();

    // 制作圆形遮罩
    const circleShape = Buffer.from(`<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`);

    // 缩放以及圆形裁切
    const avatar = await sharp(input)
        .resize(size, size)
        .composite([{
            input: circleShape,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer()

    return avatar;
}

/**
 * 获取工资
 */
async function getSalary(message) {

    result = await StandOnTheStreet.aggregate([
        { $match: { qq: message.sender.id, group: message.sender.group.id } },
        { $unwind: "$into" },
        { $project: { into: 1, count: 1 } },
        { $sort: { "into.ts": -1 } },
        { $limit: 1 }
    ]);
    if (result.length == 0) {
        message.reply([
            {
                type: 'At',
                target: message.sender.id
            },
            {
                type: 'Plain',
                text: "您还没有站过街"
            }
        ]);
        return;
    }

    const { count, into } = result[0];
    const { score } = into;

    const totalCount = count.friends + count.others;
    const friendsCount = count.friends;
    const per = Math.ceil( score / totalCount );

    const card = await genSalaryCard({
        qq: message.sender.id,
        nick: message.sender.memberName,
        per,
        score,
        totalCount,
        friendsCount
    });

    fs.writeFileSync(filePath, card);
    message.reply([
        {
            type: 'Image',
            path: filePath
        }
    ])

    return;

}

/**
 * 生成工资卡片
 * @param {Object} dataObj 
 * @return {Buffer}
 */
async function genSalaryCard(dataObj) {

    const cardWidth = 400;
    const cardHeight = 300;

    const avatarSize = 96;
    const nickFontSize = 36;
    const introFontSize = 20;
    const dataIntroIconSize = 36;
    const dataIntroFontSize = 18;
    const tsTextFontSize = 16;

    const dataScoreIcon = await sharp(path.resolve(__dirname, 'StandOnTheStreet/assets/wallet.png')).toBuffer();
    const dataTotalCountIcon = await sharp(path.resolve(__dirname, 'StandOnTheStreet/assets/person_total.png')).toBuffer();
    const dataFriendsCountIcon = await sharp(path.resolve(__dirname, 'StandOnTheStreet/assets/person_friends.png')).toBuffer();

    const cardPadding = 30;
    const avatarTop = cardPadding;
    const avatarLeft = cardPadding;
    const introLeft = avatarLeft + avatarSize + 18;
    const nickTextMaxWidth = cardWidth - introLeft - cardPadding;
    const nickTop = Math.ceil(avatarTop + (avatarSize / 2 - (nickFontSize + 4 + introFontSize) / 2));
    const introTop = Math.ceil(nickTop + nickFontSize + 4);
    const dataIntroTop = avatarTop + avatarSize + 24;
    const dataScoreIconLeft = Math.ceil((cardWidth - dataIntroIconSize * 3) / 4);
    const dataTotalCountIconLeft = dataScoreIconLeft * 2 + dataIntroIconSize;
    const dataFriendsCountIconLeft = dataScoreIconLeft * 3 + dataIntroIconSize * 2;
    const dataIntroTextTop = dataIntroTop + dataIntroIconSize + 5;
    const tsTextTop = cardHeight - tsTextFontSize - cardPadding;

    const { qq, nick, per, score, totalCount, friendsCount } = dataObj;

    // 生成头像
    const avatar = await genAvatar(qq, avatarSize);

    // 生成文本

    // 昵称
    const tempNickText = text2svg.toSVG(nick, {
        fontSize: nickFontSize
    });
    // 昵称这里需要判断会不会过大
    let nickText;
    if (tempNickText.width > nickTextMaxWidth) {
        nickText = await sharp(Buffer.from(tempNickText.svg)).resize(nickTextMaxWidth).toBuffer();
    } else {
        nickText = Buffer.from(tempNickText.svg);
    }

    // 昵称下 intro
    const introText = text2svg.toSVG(`人均 ${per} 硬币`, {
        fontSize: introFontSize
    });

    // 数据
    const dataScoreText = text2svg.toSVG(`${score} 硬币`, {
        fontSize: dataIntroFontSize
    });
    const dataTotalCountText = text2svg.toSVG(`${totalCount} 人次`, {
        fontSize: dataIntroFontSize
    });
    const dataFriendsCountText = text2svg.toSVG(`${friendsCount} 次群友`, {
        fontSize: dataIntroFontSize
    });

    // 时间戳
    const tsText = text2svg.toSVG(formatTs(timestamp), {
        fontSize: tsTextFontSize
    })

    // 生成卡片画布
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
        .composite([
            {
                // 头像
                input: avatar,
                top: avatarTop,
                left: avatarLeft
            },
            {
                // 昵称
                input: nickText,
                top: nickTop,
                left: introLeft
            },
            {
                // 简介
                input: Buffer.from(introText.svg),
                top: introTop,
                left: introLeft
            },
            {
                // score icon
                input: dataScoreIcon,
                top: dataIntroTop,
                left: dataScoreIconLeft
            },
            {
                // score text
                input: Buffer.from(dataScoreText.svg),
                top: dataIntroTextTop,
                left: Math.ceil(dataScoreIconLeft + dataIntroIconSize / 2 - dataScoreText.width / 2)
            },
            {
                // count icon
                input: dataTotalCountIcon,
                top: dataIntroTop,
                left: dataTotalCountIconLeft
            },
            {
                // count text
                input: Buffer.from(dataTotalCountText.svg),
                top: dataIntroTextTop,
                left: Math.ceil(dataTotalCountIconLeft + dataIntroIconSize / 2 - dataTotalCountText.width / 2)
            },
            {
                // friendsCount icongenAvatarItem
                input: dataFriendsCountIcon,
                top: dataIntroTop,
                left: dataFriendsCountIconLeft
            },
            {
                // friendsCount text
                input: Buffer.from(dataFriendsCountText.svg),
                top: dataIntroTextTop,
                left: Math.ceil(dataFriendsCountIconLeft + dataIntroIconSize / 2 - dataFriendsCountText.width / 2)
            },
            {
                // ts text
                input: Buffer.from(tsText.svg),
                top: tsTextTop,
                left: Math.ceil((cardWidth - tsText.width) / 2)
            }
        ])
        .png()
        .toBuffer()

    return card;

}

/**
 * 随机数
 * @param {Number} min 
 * @param {Number} max 
 * @returns {Number}
 */
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 格式化日期时间
 * @param {Date} dat 
 * @returns {String}
 */
function formatTs(dat) {
    var year = dat.getFullYear();
    var mon = (dat.getMonth() + 1) < 10 ? "0" + (dat.getMonth() + 1) : dat.getMonth() + 1;
    var data = dat.getDate() < 10 ? "0" + (dat.getDate()) : dat.getDate();
    var hour = dat.getHours() < 10 ? "0" + (dat.getHours()) : dat.getHours();
    var min = dat.getMinutes() < 10 ? "0" + (dat.getMinutes()) : dat.getMinutes();
    var seon = dat.getSeconds() < 10 ? "0" + (dat.getSeconds()) : dat.getSeconds();

    var newDate = year + "-" + mon + "-" + data + " " + hour + ":" + min + ":" + seon;
    return newDate;
}