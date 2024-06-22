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

let gamepad = 0;
let buttonInterval = 300;
let selectedOption = 0;
let history = 1;
let enterTo = 0;
let undoTo = 0;

window.addEventListener('gamepadconnected', (e) => {
    gamepad = e.gamepad;
    console.log(gamepad);
});

loop();

function loop() {
    requestAnimationFrame(loop);

    if (gamepad && buttonInterval < 0 && content.length !== 0 && gamepad !== undefined) {
        if (gamepad.buttons[0].pressed && selectedOption > 0) {
            selectedOption--;
        } else if (gamepad.buttons[3].pressed && selectedOption < content.length-1) {
            selectedOption++;
        }
        
        buttonInterval = 300;
    }
    
    if (gamepad !== 0) {
        if (gamepad.buttons[2].pressed && !enterTo) {
            enterTo = 1;
            setTimeout(()=>{document.querySelector(`p#Id${selectedOption}`).childNodes[1].onclick(); enterTo = 0},500);
        } else if (gamepad.buttons[1].pressed && !undoTo) {
            undoTo = 1;
            setTimeout(()=>{undo(); undoTo = 0},500);
        }
    }
    buttonInterval -= 16;
    
    if (history !== selectedOption && content.length !== 0) {
        console.log(selectedOption);
        document.querySelector(`p#Id${history}`).style.border = 'none';
        history = selectedOption;
        console.log('Selected:', selectedOption);
        document.querySelector(`p#Id${selectedOption}`).style.border = '1px solid red';
    }
}

let contextMenuTarget;

socket.on('recieve-data', (data)=>{
    console.log(data);
    actualPathHtml.innerHTML = 'Path:\\\\'+data.path;
    actualPath = data.path;
    let res = '<table>';
    content.length = data.list.length;
    selectedOption = 1;
    history = 1;
    
    data.list.forEach((el,id)=>{
        if (el.type === 0) {
            res += `<p id=Id${id}><img src='ui/folder.png'><button onclick="enter('${el.name}',0)" class="unit">${el.name}</button></p>`;
        } else {
            const t = el.name.split('.');
            res += `<p id=Id${id}><img src='ui/file.png'><button onclick="enter('${el.name}',1)" class="unit">${el.name}</button>${el.size}</p>`;
        }
    });
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

document.body.addEventListener('mousedown', ()=>{
    if (contextMenuHtml.style.display === 'block') {
        setTimeout(()=>{contextMenuHtml.style.display = 'none'},500);
    }
})

socket.on('set-url',(e)=>{
    window.location.href = e;
});

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

function enter(name, type, html=false) {
    console.log(name, type, actualPath, name);
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

function sendRequest(path) {
    socket.emit('request', path);
}