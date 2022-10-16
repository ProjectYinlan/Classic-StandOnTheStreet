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