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

let gamepad = null;
let gamepadButtonReload = false;

let gamepadCursor = 0;
let lastGamepadCursor = -1;
let cursorButton = 0;
let extraSpeedCounter = 0;
let extraInterval = 0;
let opendedPdf = false;
let actualVideoName;

const gamepadButtons = {
    groupA: [0, 0, 0, 0],
    groupB: [0, 0]
};

window.addEventListener('gamepadconnected', (e) => {
    gamepad = e.gamepad;
    gamepadHelp.innerHTML = 'Gamepad status: detected';
});

setInterval(loop, 25);

setInterval(() => {
    if (cursorButton) {
        gamepadButtonReload = false;
        extraSpeedCounter += 200;
    }
    if (extraSpeedCounter > 2000 && extraInterval === 0) {
        extraInterval = setInterval(extraSpeed, 75);
    }
}, 200);

function extraSpeed () {
    if (cursorButton) {
        gamepadButtonReload = false;
    }
}

function enterByButton() {
    if (gamepad !== undefined && gamepad !== null && content.length !== undefined) {
        const obj = content[gamepadCursor];
        enter(obj.name, obj.type);
    }
}

const tempHtml = document.querySelector('p#temp-help');
socket.on('temp-size', data=>{
    tempHtml.innerHTML = `Temporary memory usage: ${data.size}/${data.free} GB`;
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

function loop() {
    gamepad = navigator.getGamepads()[0];
    if (gamepad !== undefined && gamepad !== null && content.length !== undefined) {
        const {buttons} = gamepad;
        let text = '';
        
        if (buttons[0].pressed) {
            if (!gamepadButtonReload) {
                gamepadButtonReload = true;
                gamepadButtons.groupA[0] = 1;
                const obj = content[gamepadCursor];
                enter(obj.name, obj.type);
                gamepadCursor = 0;
                lastGamepadCursor = -1;
            }
        } else if (buttons[1].pressed) {
            if (!gamepadButtonReload) {
                gamepadButtonReload = true;
                gamepadButtons.groupA[1] = 1;
                undo();
            }
        } else if (buttons[2].pressed) {
            if (!gamepadButtonReload) {
                gamepadButtonReload = true;
                gamepadButtons.groupA[2] = 1;
                clearTemp();
            }
        } else if (buttons[3].pressed) {
            if (!gamepadButtonReload) {
                gamepadButtonReload = true;
                gamepadButtons.groupA[3] = 1;
                window.location.reload()
            }
        } else if (buttons[13].pressed) {
            if (!gamepadButtonReload && gamepadCursor < content.length-1) {
                gamepadButtonReload = true;
                cursorButton = true;
                gamepadCursor++;
            }
        } else if (buttons[12].pressed) {
            if (!gamepadButtonReload && gamepadCursor > 0) {
                gamepadButtonReload = true;
                cursorButton = true;
                gamepadCursor--;
            }
        } else if (buttons[11].pressed && videoPlayerHtml.currentSrc !== "") {
            if (!gamepadButtonReload) {
                if (window.fullScreen) {
                    document.exitFullscreen()
                } else {
                    videoPlayerHtml.requestFullscreen();
                }
                gamepadButtonReload = true;
            }
        } else if (buttons[4].pressed) {
            if (!gamepadButtonReload) {
                changeVideo(-1, actualVideoName);
                gamepadButtonReload = true;
            }
        } else if (buttons[5].pressed) {
            if (!gamepadButtonReload) {
                changeVideo(1, actualVideoName);
                gamepadButtonReload = true;
            }
        } else if (buttons[6].value > 0.15 && videoPlayerHtml.currentSrc !== "") {
            videoPlayerHtml.currentTime -= buttons[6].value * 8;
        } else if (buttons[7].value > 0.15 && videoPlayerHtml.currentSrc !== "") {
            videoPlayerHtml.currentTime += buttons[7].value * 8;
        } else if (buttons[10].pressed && videoPlayerHtml.currentSrc !== "") {
            if (!gamepadButtonReload) {
                if (videoPlayerHtml.paused) {
                    videoPlayerHtml.play();
                } else {
                    videoPlayerHtml.pause();
                }
                gamepadButtonReload = true;
            }
        } else if (buttons[9].pressed && videoPlayerHtml.currentSrc !== "") {
            if (!gamepadButtonReload) {
                document.querySelector('div#video').style.display = 'none';
                document.querySelector('video').src = "";
                gamepadButtonReload = true;
            }
        } else {
            gamepadButtonReload = false;
            cursorButton = false;
            clearInterval(extraInterval);
            extraInterval = 0;
            extraSpeedCounter = 0;
            gamepadButtons.groupA.fill(0,0,4);
        }
        
        if (opendedPdf) {
            if (buttons[6].value > 0.15) {
                window.scrollBy({top:-buttons[6].value*100, left:0, behavior:"smooth"});
            } else if (buttons[7].value > 0.15) {
                window.scrollBy({top:buttons[7].value*100, left:0, behavior:"smooth"});
            }
            
            if (buttons[4].pressed) {
                window.scrollBy({top:-(window.innerHeight/2-100), left:0, behavior:"smooth"});
            } else if (buttons[5].pressed) {
                window.scrollBy({top:window.innerHeight/2-100, left:0, behavior:"smooth"});
            }
        }
        
        if (lastGamepadCursor !== gamepadCursor) {
            lastGamepadCursor = gamepadCursor;
            const htmlButtons = document.querySelectorAll('button.unit');
            htmlButtons.forEach((e,id)=>{
                const name = e.attributes[0].nodeValue;
                if (name.substring(name.indexOf("'")+1, name.lastIndexOf("'")) === content[gamepadCursor].name) {
                    htmlButtons[id].style.border = '1px solid blue';
                    if (window.scrollY+window.innerHeight < htmlButtons[id].offsetTop) {
                        window.scrollBy(0,window.innerHeight);
                    } else if (htmlButtons[id].offsetTop < window.scrollY) {
                        window.scrollBy(0,-window.innerHeight);
                    }
                } else {
                    htmlButtons[id].style.border = 'none';
                }
            });
        }
    }
}

const gamepadHelp = document.querySelector('p#gamepad-help');
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

document.body.addEventListener('mousedown', ()=>{
    if (contextMenuHtml.style.display === 'block') {
        setTimeout(()=>{contextMenuHtml.style.display = 'none'},500);
    }
});

socket.on('connect', ()=>{
    console.info('Connected to server.');
    sendRequest(actualPath);
});

socket.on('reset-cookies', ()=>{
    document.cookie = `last-path=_main\\;max-age=7200;path=/;SameSite=Lax`;
});

socket.on('recieve-data', (data)=>{
    console.info('Recieved list of files. Path:', data.path, ' Array:', data.list);
    actualPathHtml.innerHTML = 'Path:\\\\'+data.path;
    actualPath = data.path;
    content = data.list;
    document.cookie = `last-path=${actualPath};max-age=7200;path=/;SameSite=Lax`;
    let res = '<table>';
    lastGamepadCursor = -1;
    
    const files = [];
    const folders = content.filter((e)=>{
        if (e.type === 0) {
            return true;
        } else {
            files.push(e);
        }
    });
    
    for (const folder of folders) {
        res += `<p><img src='ui/folder.png'><button onclick="enter('${folder.name}',0)" class="unit">${folder.name}</button></p>`;
    }
    for (const file of files) {
        res += `<p><img src='ui/file.png'><button onclick="enter('${file.name}',1)" class="unit">${file.name}</button>${file.size}</p>`;
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

socket.on('file-sent',(data)=>{
    /*window.location.href = e;*/
    //New concept: Built in video, music, image player.
    const {path, name} = data;
    
    const split = name.split('.');
    const extension = split[split.length - 1].toLowerCase();
    console.info('Recieved new file. File name: ', name);
    opendedPdf = false;
    
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
        opendedPdf = true;
    } else {
        window.location.href = path;
    }
});

function enter(name, type) {
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
    videoPlayerHtml.play();
    videoPlayerHtml.requestFullscreen();
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
    audioDivHtml.style.left = (window.innerWidth - 300) / 2 +'px';
    audioDivHtml.style.top = '50px';
    audioDivHtml.style.display = 'block';
}

function builtInImagePlayer(data) {
    const {path, name} = data;
    
    imagePlayerHtml.src = path;
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