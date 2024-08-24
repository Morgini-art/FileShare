const socket = io({transports: ['websocket']});

let actualPath = '_main\\';
const cookies = getCookies();

if (cookies.lastpath !== undefined) {
    actualPath = cookies.lastpath;
}

let content = [];
const settings = {
    video: {
        autoplay: true
    }
}


if (cookies.lastpath !== undefined) {
    actualPath = cookies.lastpath;
}
if (cookies.videoAutoplay !== undefined && cookies.videoAutoplay.length > 0) {
    settings.video.autoplay = (cookies.videoAutoplay === 'true') ? true : false;
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
const audioTitle = document.querySelector('span#audio-title');

const progressDiv = document.querySelector('div#progress');
const tempHtml = document.querySelector('p#temp-help');

const searchButton = document.querySelector('button#submit');
const searchInput = document.querySelector('input#search');

const settingsAutoplay = document.querySelector('.toggle-checkbox');
const settingWindow = document.querySelector('div#settings-window');

settingsAutoplay.addEventListener('change', e=>{
    document.cookie = `videoAutoplay=${!settingsAutoplay.checked};max-age=31536000;path=/;SameSite=Lax`;
    settings.video.autoplay = !settingsAutoplay.checked;
});

let contextMenuTarget;

//Video
let actualVideoName;
let previewTime = 0;
const videoTitle = document.querySelector('p#video-title');

document.body.addEventListener('mousedown', ()=>{
    if (contextMenuHtml.style.display === 'block') {
        setTimeout(()=>{contextMenuHtml.style.display = 'none'}, 250);
    }
});

searchButton.onclick = () => {
    socket.emit('search', {text:searchInput.value, path: actualPath});
};

socket.on('temp-size', data=>{
    tempHtml.innerHTML = `Temporary memory usage: ${data.size}/${data.free} GB`;
});

socket.on('connect', ()=>{
    console.info('Connected to server.');
    sendRequest(actualPath);
});

socket.on('reset-cookies', ()=>{
    document.cookie = `lastpath=;max-age=7200;path=/;SameSite=Lax`;
});

socket.on('recieve-data', (data)=>{
    const paths = data.path.split('\\');
    let mem = '';
    actualPathHtml.innerHTML = data.path;
    actualPath = data.path;
    content = data.list;
    document.cookie = `lastpath=${actualPath.replace(/\\/g, '\\\\')};max-age=7200;path=/;SameSite=Lax`;
    let res = '';
    
    const files = [];
    const folders = content.filter((e)=>{
        if (e.type === 0) {
            return true;
        } else {
            files.push(e);
        }
    });
    
    for (const folder of folders) {
        res += `<p class="content" onclick="enter('${folder.path.replace(/\\/g, '\\\\')}',0,'${folder.name}')"><img src='ui/folder.png'><span class="unit">${folder.name}</span></p>`;
    }
    for (const file of files) {
        const percent = (file.points/data.list[0].points*100).toFixed(1);
        res += `<p class="content" onclick="enter('${file.path.replace(/\\/g, '\\\\')}',1,'${file.name}')"><img src='ui/file.png'><span class="unit">${file.name}</span>${file.size}`;
        if (file.points!==undefined) {
            res+=` ${percent}%</p>`;
        } else {
            res+='</p>';
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

socket.on('processing-progress', progress=>{
    progressDiv.style.width = (470*progress)+'px';
});

socket.on('file-sent',(data)=>{
    const {path, name} = data;
    
    const split = name.split('.');
    const extension = split[split.length - 1].toLowerCase();
    console.info('Recieved new file. File name: ', name);
    progressDiv.style.width = 0;
    
    if (database.fileFormats.video.includes(extension)) {
        if (videoPlayerHtml.currentSrc.includes('_preview')) {
            previewTime = videoPlayerHtml.currentTime;
        } else {
            previewTime = 0;
        }
        builtInVideoPlayer(data);
    } else if (database.fileFormats.audio.includes(extension)) {
        builtInAudioPlayer(data);
    } else if (database.fileFormats.image.includes(extension)) {
        builtInImagePlayer(data);
    } else if (extension === 'pdf') {
        const embedHtml = document.querySelector('div#embed');
        embedHtml.innerHTML = `<iframe width="${window.innerWidth-70}" height="10000px" src="${path}"></iframe>`;
        embedHtml.style.display = 'block';
        embedHtml.style.position = 'absolute';
        embedHtml.style.top = 100+'px';
        embedHtml.style.left = 0;
        embedHtml.width = window.innerWidth;
    } else {
        window.location.href = path;
    }
});

function changeVideo(delta, name) {//TODO: When delta < 0 it doesn't takes nearest video file.
    const actual = content.findIndex((e)=>e.name === name && e.type === 1);
    const firstSimilar = content.findIndex((e, index) => {
        let direction = false;
        if (delta > 0 && index - actual > 0 || delta < 0 && index - actual < 0) {
            direction = true;
        }
        return database.fileFormats.video.includes(e.name.split('.')[e.name.split('.').length-1]) && e.name !== name && direction;
    });
    if (firstSimilar < content.length && firstSimilar !== -1) {
        document.cookie = `lastpath=${actualPath.replace(/\\/g, '\\\\')};max-age=7200;path=/;SameSite=Lax`;
        socket.emit('request-file', {
            path: content[firstSimilar].path,
            name: content[firstSimilar].name
        });
    } else {
        document.querySelector('div#video').style.display = 'none';
        document.querySelector('video').src = "";
    }
}

function enter(path, type, name) {
    if (type === 0) {
        sendRequest(path);
    } else {
        document.cookie = `lastpath=${actualPath.replace(/\\/g, '\\\\')};max-age=7200;path=/;SameSite=Lax`;
        socket.emit('request-file', {path:path, name:name});
    }
}

function builtInVideoPlayer(data) {
    const {path, name} = data;
    
    document.body.requestFullscreen();
    
    const d = name.split('.');
    d.pop();
    videoTitle.innerHTML = d.join('.');
    videoDivHtml.style.display = 'block';
    videoPlayerHtml.src = path;
    videoDivHtml.style.left = '0px';
    videoDivHtml.style.top = '0px';
    videoPlayerHtml.style.width = window.innerWidth+'px';
    videoPlayerHtml.style.height = window.innerHeight+'px';
    
    videoPlayerHtml.currentTime = previewTime;
    videoPlayerHtml.play();
    actualVideoName = name;
    
    if (settings.video.autoplay) {
        videoPlayerHtml.onended = () => {
            console.info('Autoplay on.');
            changeVideo(1, actualVideoName);
        }
    }
}

function builtInAudioPlayer(data) {
    const {path, name} = data;
    
    audioPlayerHtml.src = path;
    audioDivHtml.style.margin = '0 auto';
    audioDivHtml.style.width = 'fit-content';
    audioDivHtml.style.top = '210px';
    audioDivHtml.style.position = 'absolute';
    audioDivHtml.style.display = 'block';
    audioTitle.innerHTML = name;
    audioDivHtml.style.left = `${(window.innerWidth-audioDivHtml.offsetWidth)/2}px`;
}

function builtInImagePlayer(data) {
    const {path, name} = data;
    
    imageDivHtml.style.display = 'block';
    imageDivHtml.style.top = '210px';
    imagePlayerHtml.src = path;
    
    imagePlayerHtml.onload = () => {
        const imageW = imagePlayerHtml.naturalWidth;
        const imageH = imagePlayerHtml.naturalHeight;
        if (imageW+250 > window.innerWidth) {
            const scaleX = (imageW+250)/window.innerWidth;
            imagePlayerHtml.width = imageW/scaleX;
            imagePlayerHtml.height = imageH/scaleX;
        } else {
            imagePlayerHtml.width = imageW;
            imagePlayerHtml.height = imageH;
        }
        
        imageDivHtml.style.left = (window.innerWidth-imagePlayerHtml.width)/2+'px';
    };
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

function settingsWindow() {
    settingWindow.style.display = 'block';
    settingsAutoplay.checked = !settings.video.autoplay;
    settingWindow.style.top = '210px';
    settingWindow.style.position = 'absolute';
    settingWindow.style.left = `${(window.innerWidth-settingWindow.offsetWidth)/2}px`;
}

function getCookies() {
    const obj = {};
    console.info('Get cookies function');
    if (document.cookie.length > 0) {
        document.cookie.split(';').forEach(cookie => {
            const arr = cookie.split('=');
            eval(`obj.${arr[0]} = "${arr[1]}"`); //TODO: Security
        });
    }
    return obj;
}