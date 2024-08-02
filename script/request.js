const fs = require('fs');
const {loadDir} = require('./file');
const config = JSON.parse(fs.readFileSync('./config.json', {encoding: 'utf-8'}));
const ffmpeg = require('fluent-ffmpeg');
const {getDiscFreeSpace, getTempFolderStats} = require('./disk');

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

function request(path) {
    const v = loadDir(path);
    if (v === 0) {
        return {default:loadDir(config.mount)};
    }
    return v;
}

async function requestVideoFile(data, socket) {
    const {path} = data;
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

module.exports = {requestVideoFile, request};