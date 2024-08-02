const fs = require('fs');

function getTempFolderStats() {
    const f = fs.readdirSync('public\\temp');
    if (f.length !== 0 && f.length > 1) {
        const sizeOfAll = f.reduce((a, b) => {
            if (typeof (a) === 'string') {
                return (fs.lstatSync('public\\temp\\' + a).size / 1024 / 1024 / 1024) + fs.lstatSync('public\\temp\\' + b).size / 1024 / 1024 / 1024;
            } else {
                return a + (fs.lstatSync('public\\temp\\' + b).size / 1024 / 1024/ 1024);
            }
        });
        return {
            size: sizeOfAll.toFixed(2),
            free: getDiscFreeSpace('H:\\')
        };
    } else if (f.length === 1) {
        return {size: (fs.lstatSync('public\\temp\\'+f[0]).size/1024/1024/1024).toFixed(2), free:getDiscFreeSpace('H:\\')};
    }
    return {size: 0, free:getDiscFreeSpace('H:\\')};
}

//Result in GB
function getDiscFreeSpace(path) {
    const s = fs.statfsSync('P:\\');
    return ((s.bsize*s.bfree)/1024/1024/1024).toFixed(2);
}

module.exports = {getTempFolderStats, getDiscFreeSpace};