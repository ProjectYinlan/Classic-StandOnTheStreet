// 连数据库用的
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const { mongoURI } = require('./config.json');

const connectDb = new Promise((resolve,reject)=>{
    mongoose.connect(mongoURI, {
		useNewUrlParser:true,
		useUnifiedTopology: true
	})
    
    mongoose.connection.once('open',(err)=>{ 
        if(!err){
            console.log('数据库连接成功')
            resolve()
        }else{
            reject('数据库连接失败'+ err)   
        }
    })
})

const StandOnTheStreetSchema = new Schema({
    group: Number,
    qq: Number,
    notify: Boolean,
    force: Boolean,
    score: {
        type: Number,
        default: 0
    },
    count: {
        friends: {
            type: Number,
            default: 0
        },
        others: {
            type: Number,
            default: 0
        }
    },
    into: [{
        ts: Number,
        score: Number,
        others: {
            count: Number,
            score: Number
        },
        friends: [{
            qq: Number,
            score: Number
        }]
    }],
    out: [{
        qq: Number,
        score: Number,
        ts: Number
    }],
    stats: {
        into: Number,
        out: Number
    },
    nextTime: Number
});
const StandOnTheStreet = mongoose.model('StandOnTheStreet', StandOnTheStreetSchema);

// 导出模块
module.exports = {
	StandOnTheStreet,
	connectDb
}
