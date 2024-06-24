const fs = require('fs');
const crossSpawn = require('cross-spawn');
const config = require('./config.json');
const { createServer } = require('node:http');
const express = require('express');
const {Server} = require('socket.io');
const {loadDir, readAll} = require('./file');
const path = require('path');

const PORT = 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {transports:['websocket']});

const {statfsSync} = require('fs');

function getDiscFreeSpace(path) {//Result in GB
    const s = statfsSync('H:\\');
    return ((s.bsize*s.bfree)/1024/1024/1024).toFixed(2);
}

io.on('connection', (socket) => {
    socket.emit('temp-size', getTempFolderStats());
    
    socket.on('request', (path)=>{
        const req = request(path.replace('_main\\',''));
        if (req.default !== undefined) {
            socket.emit('recieve-data', {list:req.default,path:path});
            socket.emit('reset-cookies');
        } else {
            socket.emit('recieve-data', {list:req,path:path});
        }
    });
    
    socket.on('request-file', (data)=>{
        const path = data.path.replace('_main', config.mount);
        if (fs.lstatSync(path).size/1024/1024 > 500) {
            console.log('Big file.')
            console.log('Spawn ffmpeg process.')
            const spawn = crossSpawn.spawn(`ffmpeg -i "${path}" -t 45 -acodec copy -vcodec copy "public\\temp\\_preview${data.name}"`);
            spawn._handle.onexit = () => {
                socket.emit('file-sent', {path:'\\temp\\_preview'+data.name, name:'_preview'+data.name});
                
                console.log('Copying file');
                fs.copyFile(data.path.replace('_main',config.mount),'public\\temp\\'+data.name, (e)=>{
                    socket.emit('temp-size', getTempFolderStats());
                    socket.emit('file-sent', {path:'\\temp\\'+data.name, name:data.name});
                    console.log('Copying file has been ended');
                });
            }
        } else {
            console.log('Copying file');
            fs.copyFile(data.path.replace('_main', config.mount), 'public\\temp\\' + data.name, (e) => {
                socket.emit('temp-size', getTempFolderStats());
                socket.emit('file-sent', {path: '\\temp\\' + data.name,name: data.name});
                console.log('Copying file has been ended');
            });
        }
    });
    
    socket.on('clear-temp', () => {
        const f = fs.readdirSync('public\\temp');
        for (const el of f) {
            fs.unlinkSync('public\\temp\\'+el);
        }
        socket.emit('temp-size', getTempFolderStats());
    });
});

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

function request(path) {
    if (path === '_main') {
        return loadDir(config.mount);
    } else {
        const v = loadDir(config.mount+'\\'+path);
        if (v === 0) {
            return {default:loadDir(config.mount)};
        }
        return v;
    }
}

server.listen(3000, /*'192.168.0.3',*/() => {
  console.log('Server running at 3000');
});

app.use(express.static(path.join(__dirname, 'public')))
 
app.get('/', function (req, res, next) {
    res.render('index.html');
});

console.log('Mounted at: '+config.mount);