// 排行榜

const { bot } = process.env.ENV == 'dev' ? require('./emulators/a') : require('../../a');
const { StandOnTheStreet } = process.env.ENV == 'dev' ? require('./connect') : require('../../connect');

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Text2svg = require('text2svg');
const text2svg = new Text2svg(path.resolve(__dirname, 'fonts/HarmonyOS_Sans_SC_Medium.ttf'));

const { genAvatar, genHr, formatTs } = require('./common');

const contents = require('./content.json').rank;

const cardWidth = 400;
const cardPadding = 30;
const cardChildrenMargin = 20;
const cardContentMaxWidth = cardWidth - cardPadding * 2;

const groupAvatarSize = 64;
const groupNameFontSize = 22;
const rankNameFontSize = 18;

const memberAvatarSize = 56;
const memberNickFontSize = 20;
const memberTitleFontSize = 16;

const itemMarin = 15;
const itemPadding = 6;
const itemWidth = cardWidth - cardPadding * 2 - itemPadding * 2;
const itemHeight = memberAvatarSize;

const unitWidth = 96;
const unitIconSize = 24;
const unitNumberFontSize = 18;
const unitNumberLineHeight = unitNumberFontSize + 4;

const itemTextMaxWidth = itemWidth - memberAvatarSize - 16 * 2 - unitWidth;

const tsFontSize = 16;

/**
 * 排行榜
 * @param {Message} message 
 * @param {Date} timestamp 
 * @param {String} filePath 
 * @param {String} type 
 */
module.exports = async function (message, timestamp, filePath, type) {

    // 判断type是否符合
    if (Object.keys(contents).indexOf(type) == -1) return;

    const ts = timestamp.getTime();

    const { group } = message.sender;

    const name = contents[type]['name'];
    const title = contents[type]['title'];
    const unitIcon = fs.readFileSync(path.resolve(__dirname, 'assets', contents[type]['unitIcon']));

    const limit = 5;

    let data = [];

    let result = [];

    switch (type) {

        // 站街人气榜
        case 'count':

            result = await StandOnTheStreet.aggregate([
                {
                    $match: {
                        group: group.id
                    }
                },
                {
                    $addFields: {
                        "stats.count": {
                            $add: ["$count.friends", "$count.others"]
                        }
                    }
                },
                {
                    $sort: {
                        "stats.count": -1
                    }
                },
                {
                    $limit: limit
                },
                {
                    $addFields: {
                        number: "$stats.count"
                    }
                }
            ])
            
            break;
            
        // 站街富豪榜
        case 'score':

            result = await StandOnTheStreet.aggregate([
                {
                    $match: {
                        group: group.id
                    }
                },
                {
                    $sort: {
                        "score": -1
                    }
                },
                {
                    $limit: limit
                },
                {
                    $addFields: {
                        number: "$score"
                    }
                }
            ])
            
            break;
            
        // 站街赚钱榜
        case 'make_score':
            
            result = await StandOnTheStreet.aggregate([
                {
                    $addFields: {
                        "stats.count": {
                            $add: ["$count.friends", "$count.others"]
                        }
                    }
                },
                {
                    $match: {
                        group: group.id,
                        "stats.count": {
                            $ne: 0
                        }
                    }
                },
                {
                    $addFields: {
                        "stats.per": {
                            $ceil: {
                                $divide: ["$stats.into", "$stats.count"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        "stats.per": -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $addFields: {
                        number: "$stats.per"
                    }
                }
            ])

            break;

        // 站街赔钱榜
        case 'lose_score':

            result = await StandOnTheStreet.aggregate([
                {
                    $addFields: {
                        "stats.count": {
                            $add: ["$count.friends", "$count.others"]
                        }
                    }
                },
                {
                    $match: {
                        group: group.id,
                        "stats.count": {
                            $ne: 0
                        }
                    }
                },
                {
                    $addFields: {
                        "stats.per": {
                            $ceil: {
                                $divide: ["$stats.into", "$stats.count"]
                            }
                        }
                    }
                },
                {
                    $sort: {
                        "stats.per": 1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $addFields: {
                        number: "$stats.per"
                    }
                }
            ])

            break;

        default:
            return;
    }

    for (const [index, item] of Object.entries(result)) {
        const { qq, group, number } = item;
        const nick = (await bot.getGroupMemberInfo(group, qq)).memberName
        data.push({
            nick,
            title: title[index],
            id: qq,
            number
        })
    }

    // 生成图片
    const card = await genCard({
        name,
        unitIcon,
        group,
        data,
        timestamp
    });

    fs.writeFileSync(filePath, card);

    message.reply([{
        type: 'Image',
        path: filePath
    }])

}

/**
 * 生成排行榜卡片
 * @param {Object} dataObj 
 * @return {Buffer}
 */
async function genCard(dataObj) {

    let compositeList = [];

    let currentTop = cardPadding;

    const { name, unitIcon, group, data, timestamp } = dataObj;

    // 群头像区域
    const avatar = await genAvatar(group.id, groupAvatarSize, 'group');
    compositeList.push({
        input: avatar,
        top: currentTop,
        left: cardPadding
    })

    const infoItem = await genText([
        {
            text: group.name,
            fontSize: groupNameFontSize
        },
        {
            text: name,
            fontSize: rankNameFontSize
        }
    ], cardContentMaxWidth - groupAvatarSize - 18);
    compositeList.push({
        input: infoItem.buffer,
        top: currentTop + Math.ceil((groupAvatarSize - infoItem.height) / 2),
        left: cardPadding + groupAvatarSize + 18
    })

    currentTop += groupAvatarSize + cardChildrenMargin;

    // 分割线
    const hrItem = await genHr(cardContentMaxWidth);
    compositeList.push({
        input: hrItem,
        top: currentTop,
        left: cardPadding
    })

    currentTop += cardChildrenMargin;

    // 列表区域
    for (const [index, item] of Object.entries(data)) {

        const { nick, id, number, title } = item;

        const listItem = await genItem(id, nick, unitIcon, number, title);

        compositeList.push({
            input: listItem.buffer,
            top: currentTop,
            left: cardPadding + itemPadding
        })

        currentTop += listItem.height + itemMarin;

    }

    currentTop = currentTop - itemMarin + cardChildrenMargin;

    // 时间戳
    const tsText = text2svg.toSVG(formatTs(timestamp), {
        fontSize: tsFontSize
    })
    compositeList.push({
        input: Buffer.from(tsText.svg),
        top: currentTop,
        left: Math.ceil((cardWidth - tsText.width) / 2)
    })

    currentTop += tsText.height;

    currentTop += cardPadding;

    // 生成卡片
    const card = await sharp({
        create: {
            width: cardWidth,
            height: currentTop,
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

/**
 * 生成单独项
 * @param {Number} qq 
 * @param {String} nick 
 * @param {Buffer} unitIcon 
 * @param {Number} number 
 * @param {String} title 称号，可选
 * @return {Buffer}
 */
async function genItem(qq, nick, unitIcon, number, title) {

    const avatar = await genAvatar(qq, memberAvatarSize);

    let textList = [{
        text: nick,
        fontSize: memberNickFontSize
    }]

    if (title) {
        textList.push({
            text: title,
            fontSize: memberTitleFontSize
        })
    }

    const textItem = await genText(textList, itemTextMaxWidth);

    const unit = await genItemUnit(unitIcon, number);

    const item = await sharp({
        create: {
            width: itemWidth,
            height: itemHeight,
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
                left: itemPadding
            },
            {
                input: textItem.buffer,
                top: Math.ceil((itemHeight - textItem.height) / 2),
                left: memberAvatarSize + 16
            },
            {
                input: unit,
                top: Math.ceil((itemHeight - unitIconSize) / 2),
                left: itemWidth - unitWidth
            }
        ])
        .png()
        .toBuffer()

    return {
        width: itemWidth,
        height: itemHeight,
        buffer: item
    };

}

/**
 * 生成项目中的数据项
 * @param {Buffer} unitIcon 
 * @param {Number} number 
 * @return {Buffer}
 */
async function genItemUnit(unitIcon, number) {

    const unitNumber = text2svg.toSVG(number.toString(), {
        fontSize: unitNumberFontSize
    })

    const unit = await sharp({
        create: {
            width: unitWidth,
            height: unitIconSize,
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
                input: unitIcon,
                top: 0,
                left: 0
            },
            {
                input: Buffer.from(unitNumber.svg),
                top: Math.ceil((unitIconSize - unitNumberLineHeight) / 2),
                left: unitIconSize + 6
            }
        ])
        .png()
        .toBuffer()

    return unit;

}

/**
 * 生成文本项
 * @param {Array} textAry 
 * @param {Number} maxWidth
 * @return {Object} { height, buffer }
 */
async function genText(textAry, maxWidth) {

    let compositeList = [];

    let textHeight = 0;

    // 遍历生成每一行
    for (const [index, item] of Object.entries(textAry)) {

        const { text, fontSize } = item;

        let textItem, textItemHeight;

        const textTemp = text2svg.toSVG(text, { fontSize });

        if (textTemp.width > maxWidth) {
            textItem = await sharp(Buffer.from(textTemp.svg)).resize(maxWidth).png().toBuffer();
            textItemHeight = (await sharp(textItem).metadata()).height;
        } else {
            textItem = Buffer.from(textTemp.svg);
            textItemHeight = textTemp.height;
        }

        compositeList.push({
            input: textItem,
            top: textHeight,
            left: 0
        })

        textHeight += textItemHeight

    }

    const itemText = await sharp({
        create: {
            width: maxWidth,
            height: textHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
    })
        .composite(compositeList)
        .png()
        .toBuffer()

    return {
        width: maxWidth,
        height: textHeight,
        buffer: itemText
    };

}
