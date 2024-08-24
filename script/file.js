const { isHiddenFile } = require('@freik/is-hidden-file');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', {encoding: 'utf-8'}));

const fsP = require('fs').promises;
const path = require('path');

async function readAll(dir) {
    try {
        const entries = await fsP.readdir(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (!isHiddenFile(fullPath)) {
                if (entry.isDirectory()) {
                    files.push({ path: fullPath, type: 0, name: entry.name });
                    const subFiles = await readAll(fullPath);
                    files.push(...subFiles);
                } else {
                    const stat = await fsP.lstat(fullPath);
                    const size = stat.size < 1024 * 1024 ? `${(stat.size / 1024).toFixed(2)} KB` 
                                                             : `${(stat.size / (1024 * 1024)).toFixed(2)} MB`;
                    files.push({ path: fullPath, type: 1, name: entry.name, size });
                }
            }
        }
        return files;
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return [];
    }
}

function loadDir(path) {
    const result = [];
    if (!fs.existsSync(path) || !path.startsWith(config.mount)) {
        return 0;
    }
    const base = fs.readdirSync(path);
    
    for (const unit of base) {
        const desPath = path+'\\'+unit;
        if (!isHiddenFile(desPath)) {
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
    }
    return result;
}

module.exports = {readAll, loadDir};