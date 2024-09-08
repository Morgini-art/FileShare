const fs = require('fs');
const express = require('express');
const path = require('path');
const {createServer} = require('node:http');
const {Server} = require('socket.io');

const config = JSON.parse(fs.readFileSync('./config.json', {encoding: 'utf-8'}));
const {loadDir, readAll} = require('./script/file');
const {search} = require('./script/search');
const {getDiscFreeSpace, getTempFolderStats} = require('./script/disk');
const {requestVideoFile, request} = require('./script/request');


let history;

function loadHistory() {
    history = JSON.parse(fs.readFileSync(path.join(__dirname,'history.json'), {encoding: 'utf-8'})).history;

    history.forEach(obj=>{
        obj.date = new Date(obj.date);
    })
}

function clearHistory() {
    console.log('clear')
    saveHistory([]);
}

function saveHistory(array) {
    console.log(array);
    fs.writeFileSync(path.join(__dirname,'history.json'), JSON.stringify({history:array}));
}

loadHistory();
console.log('History', history);


const app = express();
const server = createServer(app);
const io = new Server(server, {transports:['websocket'], maxHttpBufferSize: 8 * 1024 * 1024});

io.on('connection', (socket) => {
    socket.emit('temp-size', getTempFolderStats());
    
    socket.on('request', (path)=>{
        const req = request(path);
        if (req.default !== undefined) {
            socket.emit('recieve-data', {list:req.default, path: config.mount});
            socket.emit('reset-cookies');
            history.push({path: config.mount, date:new Date(), type:0});
        } else {
            socket.emit('recieve-data', {list:req, path: path});
            history.push({path: path, name: path.split('\\')[path.split('\\').length-1],type:0, date:new Date()});
        }
        saveHistory(history);
    });
    
    socket.on('search', data=>{
        const list = search(data, socket);
    });
    
    socket.on('error', (err) => {
        console.error('Socket Error:', err);
    });
    
    socket.on('clear-history', ()=>{
        clearHistory();
    });
    
    socket.on('request-file', (data) => {
        const videoFile = requestVideoFile(data, socket);

        videoFile.then(e => {
            if (e === 0) {
                fs.copyFile(data.path, 'public\\temp\\' + data.name, (e) => {
                    socket.emit('temp-size', getTempFolderStats());
                    socket.emit('file-sent', {
                        path: '\\temp\\' + data.name,
                        name: data.name
                    });
                    console.info('Copying file has been completed');
                });
            }
            history.push({path:data.path, type:1, name:data.name, date: new Date()});
            saveHistory(history);
        });
    });
    
    socket.on('clear-temp', () => {
        const f = fs.readdirSync('public\\temp');
        for (const el of f) {
            fs.unlinkSync('public\\temp\\'+el);
        }
        socket.emit('temp-size', getTempFolderStats());
    });
    
    socket.on('get-history', ()=> {
        loadHistory();
        socket.emit('history-data', history);
    })
});

app.use(express.static(path.join(__dirname, 'public')))
 
app.get('/', function (req, res, next) {
    res.render('index.html');
});

server.listen(config.port, config.ip, () => {
    console.info(`Server running at ${config.ip}:${config.port}`);
    console.info(`Mounted at: ${config.mount}`);
});