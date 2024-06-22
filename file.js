const config = require('./config.json');
const fs = require('fs');

function readAll(path) {
    const files = [];
    const base = fs.readdirSync(path);
    
    for (const unit of base) {
        const desPath = path+'\\'+unit;
        if (fs.lstatSync(desPath).isDirectory()) {
            readAll(desPath);
        } else {
            files.push(desPath);
        }
    }
    return files;
}

function request(path) {
    if (path === '_main') {
        return loadDir(config.mount);
    } else {
        return loadDir(config.mount+'\\'+path);
    }
}

function loadDir(path) {
    const result = [];
    const base = fs.readdirSync(path);
    
    for (const unit of base) {
        const desPath = path+'\\'+unit;
        const stat = fs.lstatSync(desPath);
        if (stat.isDirectory()) {
            result.push({path:desPath,type:0, name:unit});
        } else {
            if (stat.size/1024 < 1024) {
                result.push({path:desPath,type:1, name:unit, size:(stat.size/1024).toFixed(2) + ' KB'});
            } else {
                result.push({path:desPath,type:1, name:unit, size:(stat.size/1024/1024).toFixed(2) + ' MB'});
            }
        }
    }
    return result;
}

module.exports = {readAll, request, loadDir};