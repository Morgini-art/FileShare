const socket = io({transports: ['websocket']});
let actualPath = '_main\\';
let content = [];
let settings = {
    video: {
        openByHtml: ['mkv']
    }
};

const actualPathHtml = document.querySelector('p#actual-path');
const contentHtml = document.querySelector('div#content');
const contextMenuHtml = document.querySelector('div#context-menu');

let contextMenuTarget;

document.body.addEventListener('mousedown', ()=>{
    if (contextMenuHtml.style.display === 'block') {
        setTimeout(()=>{contextMenuHtml.style.display = 'none'},500);
    }
});

socket.on('recieve-data', (data)=>{
    console.log(data);
    actualPathHtml.innerHTML = 'Path:\\\\'+data.path;
    actualPath = data.path;
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

socket.on('set-url',(e)=>{
    window.location.href = e;
});

function enter(name, type, html=false) {
    browser.cookies.set('last-path', actualPath);
    if (type === 0) {
        sendRequest(actualPath+'\\'+name);
    } else {
        const split = name.split('.');
        console.log(split[split.length-1]);
        if (settings.video.openByHtml.includes(split[split.length-1]) || html) {
            console.log('Open using html');
            socket.emit('request-file', {path:actualPath+'\\'+name, name:name, openHelpFile:true});
        } else {
            socket.emit('request-file', {path:actualPath+'\\'+name, name:name, openHelpFile:false});
        }
    }
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