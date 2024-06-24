const socket = io({transports: ['websocket']});

let actualPath = '_main\\';
if (document.cookie.split('=')[0] === 'last-path') {
    actualPath = document.cookie.split('=')[1];
}

let content = [];
const settings = {
    video: {
        autoplay: true
    }
}
const database = {
    fileFormats: {
        video: ['mp4', 'mkv', 'avi'],
        image: ['png', 'jpg', 'jpeg', 'bmp'],
        audio: ['wav', 'mp3']
    }
};

const actualPathHtml = document.querySelector('p#actual-path');
const contentHtml = document.querySelector('div#content');
const contextMenuHtml = document.querySelector('div#context-menu');

const videoPlayerHtml = document.querySelector('video');
const audioPlayerHtml = document.querySelector('audio');
const imagePlayerHtml = document.querySelector('img#player');

const videoDivHtml = document.querySelector('div#video');
const audioDivHtml = document.querySelector('div#audio');
const imageDivHtml = document.querySelector('div#image');

imagePlayerHtml.width = 1000;

let contextMenuTarget;

const tempHtml = document.querySelector('p#temp-help');
socket.on('temp-size', data=>{
    tempHtml.innerHTML = `Temporary memory usage: ${data.size}/${data.free} GB`;
});

function changeVideo(delta, name) {//TODO: When delta < 0 it doesn't takes nearest video file.
    const actual = content.findIndex((e)=>e.name === name && e.type === 1);
    const firstSimilar = content.findIndex((e, index) => {
        console.log(e, index);
        let direction = false;
        if (delta > 0 && index - actual > 0 || delta < 0 && index - actual < 0) {
            direction = true;
        }
        console.log(e.name.split('.')[e.name.split('.').length-1]);
        console.log(database.fileFormats.video.includes(e.name.split('.')[e.name.split('.').length-1]), direction);
        return database.fileFormats.video.includes(e.name.split('.')[e.name.split('.').length-1]) && e.name !== name && direction;
    });
    console.warn('Choice:', content[firstSimilar]);
    if (firstSimilar < content.length && firstSimilar !== -1) {
        console.log('Loading:', content[firstSimilar]);
        document.cookie = `last-path=${actualPath};max-age=7200;path=/;SameSite=Lax`;
        socket.emit('request-file', {
            path: content[firstSimilar].path,
            name: content[firstSimilar].name
        });
    } else {
        document.querySelector('div#video').style.display = 'none';
        document.querySelector('video').src = "";
    }
}

document.body.addEventListener('mousedown', ()=>{
    if (contextMenuHtml.style.display === 'block') {
        setTimeout(()=>{contextMenuHtml.style.display = 'none'},500);
    }
});

socket.on('connect', ()=>{
    console.log('Connected to server.');
    sendRequest(actualPath);
});

socket.on('reset-cookies', ()=>{
    document.cookie = `last-path=_main\\;max-age=7200;path=/;SameSite=Lax`;
});

socket.on('recieve-data', (data)=>{
    console.log(data);
    actualPathHtml.innerHTML = 'Path:\\\\'+data.path;
    actualPath = data.path;
    content = data.list;
    document.cookie = `last-path=${actualPath};max-age=7200;path=/;SameSite=Lax`;
    let res = '<table>';
    
    for (const el of data.list) {
        if (el.type === 0) {
            res += `<p><img src='ui/folder.png'><button onclick="enter('${el.name}',0)" class="unit">${el.name}</button></p>`;
        } else {
            const t = el.name.split('.');
            res += `<p><img src='ui/file.png'><button onclick="enter('${el.name}',1)" class="unit">${el.name}</button>${el.size}</p>`;
        }
    }
    contentHtml.innerHTML = res;
    
    document.querySelectorAll('button.unit').forEach(button => {
        button.oncontextmenu = (e) => {
            contextMenuTarget = e.target;
            e.preventDefault();
            contextMenuHtml.style.display = 'block';
            contextMenuHtml.style.position = 'absolute';
            contextMenuHtml.style.left = e.layerX+'px';
            contextMenuHtml.style.top = e.layerY+'px';
        };
    });
});

let actualVideoName;
let previewTime = 0;
socket.on('file-sent',(data)=>{
    /*window.location.href = e;*/
    //New concept: Built in video, music, image player.
    const {path, name} = data;
    
    const split = name.split('.');
    console.log(path, name);
    
    if (database.fileFormats.video.includes(split[split.length-1].toLowerCase())) {
        if (videoPlayerHtml.currentSrc.includes('_preview')) {
            previewTime = videoPlayerHtml.currentTime;
        } else {
            previewTime = 0;
        }
        builtInVideoPlayer(data);
    } else if (database.fileFormats.audio.includes(split[split.length-1].toLowerCase())) {
        builtInAudioPlayer(data);
    } else if (database.fileFormats.image.includes(split[split.length-1].toLowerCase())) {
        builtInImagePlayer(data);
    } else {
        window.location.href = path;
    }
});

function enter(name, type, html=false) {
    if (type === 0) {
        sendRequest(actualPath+'\\'+name);
    } else {
        const split = name.split('.');
        document.cookie = `last-path=${actualPath};max-age=7200;path=/;SameSite=Lax`;
        socket.emit('request-file', {path:actualPath+'\\'+name, name:name});
    }
}

function builtInVideoPlayer(data) {
    const {path, name} = data;
    
    videoPlayerHtml.src = path;
    videoDivHtml.style.left = (window.innerWidth - 640) / 2+'px';
    videoDivHtml.style.top = '50px';
    videoDivHtml.style.display = 'block';
    videoPlayerHtml.currentTime = previewTime;
    videoPlayerHtml.play();
    actualVideoName = name;
    
    if (settings.video.autoplay) {
        videoPlayerHtml.onended = () => {
            console.log('Autoplay on.');
            console.log(content);
            console.log(name);
            changeVideo(1, actualVideoName);
        }
    }
}

function builtInAudioPlayer(data) {
    const {path, name} = data;
    
    audioPlayerHtml.src = path;
    audioDivHtml.style.left = (window.innerWidth - 300) / 2 +'px';
    audioDivHtml.style.top = '50px';
    audioDivHtml.style.display = 'block';
}

function builtInImagePlayer(data) {
    const {path, name} = data;
    
    imagePlayerHtml.src = path;
    console.log(data, imagePlayerHtml);
    imageDivHtml.style.left = '0px';
    imageDivHtml.style.top = '0px';
    imageDivHtml.style.display = 'block';
}

function openByHtml() {
    const arg = contextMenuTarget.attributes.onclick.value;
    enter(arg.substring(arg.indexOf("'")+1,arg.lastIndexOf("'")), arg.substr(arg.indexOf(',')+1,1), true);
}

function undo() {
    const last = actualPath.split('\\');
    actualPath = actualPath.replace('\\'+last[last.length-1],'');
    sendRequest(actualPath);
}

function clearTemp() {
    socket.emit('clear-temp');
}

function sendRequest(path) {
    socket.emit('request', path);
}