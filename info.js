// 个人信息方法

const env = process.env.ENV || 'prod';

const { StandOnTheStreet } = env == 'dev' ? require('./connect') : require('../../../db').schemas;

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Text2svg = require('text2svg');
const text2svg = new Text2svg(path.resolve(__dirname, 'fonts/HarmonyOS_Sans_SC_Medium.ttf'));

const { genAvatar, formatTs } = require('./common');

/**
 * 获取工资
 * @param {Message} message
 * @param {Date} timestamp
 * @param {String} filePath
 */
module.exports = async function (message, timestamp, filePath) {

    result = await StandOnTheStreet.aggregate([
        { $match: { qq: message.sender.id, group: message.sender.group.id } },
        { $unwind: "$into" },
        { $project: { into: 1, count: 1, stats: 1, score: 1 } },
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

    const { count, score, stats } = result[0];

    const totalCount = count.friends + count.others;
    const friendsCount = count.friends;
    const per = Math.ceil(stats.into / totalCount);

    const card = await genSalaryCard({
        qq: message.sender.id,
        nick: message.sender.memberName,
        per,
        score,
        totalCount,
        friendsCount,
        timestamp
    });

    // fs.writeFileSync(filePath, card);

    const imgB64 = card.toString('base64');

    message.reply([
        {
            type: 'Image',
            // path: filePath
            base64: imgB64
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

    const dataScoreIcon = await sharp(path.resolve(__dirname, 'assets/info_wallet.png')).toBuffer();
    const dataTotalCountIcon = await sharp(path.resolve(__dirname, 'assets/info_person_total.png')).toBuffer();
    const dataFriendsCountIcon = await sharp(path.resolve(__dirname, 'assets/info_person_friends.png')).toBuffer();

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

    const { qq, nick, per, score, totalCount, friendsCount, timestamp } = dataObj;

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
    const dataTotalCountText = text2svg.toSVG(`${totalCount} 次`, {
        fontSize: dataIntroFontSize
    });
    const dataFriendsCountText = text2svg.toSVG(`${friendsCount} 群友`, {
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