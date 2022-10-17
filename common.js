// 常用方法

const axios = require('axios');
const sharp = require('sharp');

module.exports = {

    /**
     * 生成头像
     * @param {Number} qq QQ
     * @param {Number} size resize
     * @returns {Buffer}
     */
    async genAvatar(qq, size) {

        if (!size) {
            size = 64
        }

        // 获取头像
        const input = await axios.get(`https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`, {
            responseType: 'arraybuffer'
        }).then(response => Buffer.from(response.data, 'binary'));

        // const metadata = await sharp(input).metadata();

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
    },

    /**
     * 生成圆角矩形
     * @param {Number} width 
     * @param {Number} height 
     * @param {Number} rx 
     * @param {String} colour 
     * @param {Number} weight
     * @return {Buffer}
     */
    async genRoundedRect(width, height, rx, colour, weight) {

        if (!rx) rx = 10;
        if (!colour) colour = "#BDBDBD";

        return Buffer.from(`<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${colour}" stroke-width="${weight}" rx="${rx}"></rect></svg>`);

    },

    /**
     * 生成横向分割线
     * @param {Number} length
     * @param {String} colour 
     * @param {Number} weight
     * @return {Buffer}
     */
    async genHr(length, colour, weight) {

        if (!colour) colour = "#BDBDBD";
        if (!weight) weight = 1;

        return Buffer.from(`<svg width="${length}" height="${weight}"><line x1="0" y1="0" x2="${length}" y2="0" stroke="${colour}" stroke-width="${weight}"/></svg>`);

    },

    /**
     * 随机数
     * @param {Number} min 
     * @param {Number} max 
     * @returns {Number}
     */
    randomRange(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    },

    /**
     * 格式化日期时间
     * @param {Date} dat 
     * @returns {String}
     */
    formatTs(dat) {
        var year = dat.getFullYear();
        var mon = (dat.getMonth() + 1) < 10 ? "0" + (dat.getMonth() + 1) : dat.getMonth() + 1;
        var data = dat.getDate() < 10 ? "0" + (dat.getDate()) : dat.getDate();
        var hour = dat.getHours() < 10 ? "0" + (dat.getHours()) : dat.getHours();
        var min = dat.getMinutes() < 10 ? "0" + (dat.getMinutes()) : dat.getMinutes();
        var seon = dat.getSeconds() < 10 ? "0" + (dat.getSeconds()) : dat.getSeconds();

        var newDate = year + "-" + mon + "-" + data + " " + hour + ":" + min + ":" + seon;
        return newDate;
    }

}