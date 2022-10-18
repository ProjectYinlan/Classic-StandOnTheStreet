// 更新统计信息用的

const { StandOnTheStreet } = require('./connect');

main();

async function main () {

    const list = await StandOnTheStreet.find();

    for (const [index, item] of Object.entries(list)) {
        
        const { _id, into, out } = item;

        let intoTotal = 0;
        let outTotal = 0;

        into.forEach(e => {  intoTotal += e.score; });
        out.forEach(e => {  outTotal += e.score; });

        await StandOnTheStreet.findByIdAndUpdate(_id, {
            $set: {
                stats: {
                    into: intoTotal,
                    out: outTotal
                }
            }
        })

        console.log(index);

    }

}