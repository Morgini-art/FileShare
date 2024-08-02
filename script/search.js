const {readAll} = require('./file');

function search(data, socket) {
    const {text, path} = data;
    const start = performance.now();
    const read = readAll(path);
    
    read.then((indexes)=>{
        console.log(indexes);
        console.log('Function: readAll took:', performance.now()-start);
        
            console.log('Search request.');
        console.log('Search for: ', text);
            console.log('Indexes count: ', indexes.length);
    
        const textArr = text.toLowerCase().split(' ');
    
        const s2 = performance.now();
        const results = indexes.filter(file => {
            const d = file.name.lastIndexOf('.');
            const name = (d !== -1) ? file.name.substring(d, -1) : file.name;
            const arr = name.toLowerCase().split(' ');
            const good = [];
            return arr.some((e, index)=>{
                const includes = textArr.some(f => e.includes(f));
                if (includes) {
                    textArr.some(f => {
                        if (e.includes(f)) {
                            searchPoints(file, f.length/e.length);
                        }
                    });
                    good.push(file.path);
                }
                return good.some((m)=>m === file.path) && index === arr.length - 1;
            });
        });
        console.log('Function: filtering took:', performance.now()-s2);
        results.sort((a, b)=>{
            if (a.points < b.points) {
                return 1;
            } else if (a.points > b.points) {
                return -1;
            }
            return 0;
        });
        const withoutTrash = results.filter((file)=>{//Wywalaj wyniki poniżej 40% z najlepszego wyniku
            return file.points >= results[0].points*0.4;
        });
        console.log('Results:', results.length);
        console.log('Results after 40% cut:', withoutTrash.length);
        socket.emit('recieve-data', {list:withoutTrash, path:path});
    });
}

function searchPoints(file, points) {
    file.points = (file.points === undefined) ? points : (file.points + points);
}

module.exports = {search};