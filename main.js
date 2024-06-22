const fs = require('fs');
const config = require('./config.json');
const { createServer } = require('node:http');
const express = require('express');
const {Server} = require('socket.io');
const {loadDir, readAll, request} = require('./file');
const path = require('path');

const PORT = 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {transports:['websocket']});

io.on('connection', (socket) => {
    socket.emit('recieve-data', {list:request('_main'),path:'_main'});
    
    socket.on('request', (path)=>{
        socket.emit('recieve-data', {list:request(path.replace('_main\\','')),path:path});
    });
    
    socket.on('request-file', (data)=>{
        fs.copyFile(data.path.replace('_main',config.mount),'public\\temp\\'+data.name, (e)=>{
            console.log(e);
            
            if (data.openHelpFile) {
                const nName = data.name.split('.').slice(0,-1);
                nName.push('html');
                const helpName = nName.join('.');
                
                fs.writeFileSync('public\\temp\\'+helpName,`<video src="${data.name}" controls></video>`);
                socket.emit('set-url', '\\temp\\'+helpName);
            } else {
                socket.emit('set-url', '\\temp\\'+data.name);
            }
        });
    });
    
    socket.on('clear-temp', () => {
        const f = fs.readdirSync('public\\temp');
        for (const el of f) {
            fs.unlinkSync('public\\temp\\'+el);
        }
    });
});

server.listen(3000, /*'192.168.0.5',*/() => {
  console.log('Server running at 3000');
});

app.use(express.static(path.join(__dirname, 'public')))
 
app.get('/', function (req, res, next) {
    res.render('index.html');
});

console.log('Mounted at: '+config.mount);