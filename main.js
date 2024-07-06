const fs = require('fs');
const express = require('express');
const path = require('path');
const {createServer} = require('node:http');
const {Server} = require('socket.io');
const {statfsSync} = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const config = require('./config.json');
const {loadDir, readAll} = require('./file');

const app = express();
const server = createServer(app);
const io = new Server(server, {transports:['websocket']});

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
    
    socket.on('request-file', (data) => {
        const videoFile = requestVideoFile(data, socket);

        videoFile.then(e => {
            if (e === 0) {
                fs.copyFile(data.path.replace('_main', config.mount), 'public\\temp\\' + data.name, (e) => {
                    socket.emit('temp-size', getTempFolderStats());
                    socket.emit('file-sent', {
                        path: '\\temp\\' + data.name,
                        name: data.name
                    });
                    console.info('Copying file has been completed');
                });
            }
        });
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

//Result in GB
function getDiscFreeSpace(path) {
    const s = statfsSync('H:\\');
    return ((s.bsize*s.bfree)/1024/1024/1024).toFixed(2);
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

app.use(express.static(path.join(__dirname, 'public')))
 
app.get('/', function (req, res, next) {
    res.render('index.html');
});

const database = {
    fileFormats: {
        video: ['mp4', 'mkv', 'avi'],
        image: ['png', 'jpg', 'jpeg', 'bmp'],
        audio: ['wav', 'mp3']
    },
    codecs: {
        audio: ['flac', 'mp3', 'opus']
    }
};

async function requestVideoFile(data, socket) {
    const path = data.path.replace('_main', config.mount);
    const split = path.split('.');
    const extension = split[split.length - 1].toLowerCase();
    
    if (!database.fileFormats.video.includes(extension)) {
        return 0;
    }
    
    const codecs = await getCodecs(path);
    const fileSize = fs.lstatSync(path).size;
    console.log(`File path: ${path}\nFile extension: ${extension}\nVideo codec:${codecs.video}\nAudio codec:${codecs.audio}`);
    
    if (extension === 'mkv' && !database.codecs.audio.includes(codecs.audio)) {
        console.log('Mkv file with incompatible audio codec.');
        ffmpeg()
            .input(path)
            .videoCodec('copy')
            .withAudioCodec('libmp3lame')
            .on('progress', progress => {
                socket.emit('processing-progress', (progress.targetSize * 1000 / fileSize).toFixed(2));
            })
            .on('end', function () {
                socket.emit('file-sent', {
                    path: `\\temp\\${data.name}`,
                    name: data.name
                });
            })
            .save(`public\\temp\\${data.name}`);
    } else if (extension === 'avi') {
        console.log('Incomatible avi format.');
        const extension = split[split.length - 1];
        const newName = data.name.replace(extension, 'mp4');
        
        ffmpeg()
            .input(path)
            .duration(300)
            .withAudioCodec('libmp3lame')
            .on('progress', progress => {
                socket.emit('processing-progress', (progress.targetSize * 1000 / fileSize).toFixed(2));
            })
            .on('end', function () {
                socket.emit('file-sent', {
                    path: `\\temp\\_preview${newName}`,
                    name: newName
                });
            })
            .save(`public\\temp\\_preview${newName}`);
        
        ffmpeg()
            .input(path)
            .withAudioCodec('libmp3lame')
            .on('progress', progress => {
                console.log((progress.targetSize * 100000 / fileSize).toFixed(2));
                socket.emit('processing-progress', (progress.targetSize * 1000 / fileSize).toFixed(2));
            })
            .on('end', function () {
                socket.emit('file-sent', {
                    path: `\\temp\\${newName}`,
                    name: newName
                });
            })
            .save(`public\\temp\\${newName}`);
    } else {
        if (fs.lstatSync(path).size / 1024 / 1024 > 512) {
            console.info('Huge file. Spawning ffmpeg process.');
            ffmpeg()
                .input(path)
                .duration(45)
                .withAudioCodec('copy')
                .withVideoCodec('copy')
                .on('end', () => {
                    socket.emit('file-sent', {path: `\\temp\\_preview${data.name}`,name: data.name});
                })
                .save(`public\\temp\\_preview${data.name}`);

            console.info('Copying file');
            fs.copyFile(data.path.replace('_main', config.mount), 'public\\temp\\' + data.name, (e) => {
                socket.emit('temp-size', getTempFolderStats());
                socket.emit('file-sent', {
                    path: '\\temp\\' + data.name,
                    name: data.name
                });
                console.info('Copying file has been completed');
            });
        } else {
            console.info('Copying file');
            fs.copyFile(data.path.replace('_main', config.mount), 'public\\temp\\' + data.name, (e) => {
                socket.emit('temp-size', getTempFolderStats());
                socket.emit('file-sent', {
                    path: '\\temp\\' + data.name,
                    name: data.name
                });
                console.info('Copying file has been completed');
            });
        }
    }
}

function getCodecs(path) {
    const res = {
        audio: 0,
        video: 0
    };
    
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, metadata) => {
            metadata.streams.forEach(function (stream) {
                if (stream.codec_type === 'video') {
                    res.video = stream.codec_name;
                } else if (stream.codec_type === 'audio') {
                    res.audio = stream.codec_name;
                }
            });
            resolve(res);
        });
    });
}

const PORT = 3000;
server.listen(PORT, '192.168.0.3',() => {
    console.info(`Server running at ${PORT}`);
    console.info(`Mounted at: ${config.mount}`);
});