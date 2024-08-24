let gamepad = null;
let gamepadButtonReload = false;

let gamepadCursor = 0;
let lastGamepadCursor = -1;
let cursorButton = 0;
let extraSpeedCounter = 0;
let extraInterval = 0;
let opendedPdf = false;

const gamepadButtons = {
    groupA: [0, 0, 0, 0],
    groupB: [0, 0]
};

window.addEventListener('gamepadconnected', (e) => {
    gamepad = e.gamepad;
    gamepadHelp.innerHTML = 'Gamepad status: detected';
    setInterval(loop, 25);
});

setInterval(() => {
    if (cursorButton) {
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
        enter(obj.path, obj.type, obj.name);
    }
}

function gamepadButton(id) {
    if (!gamepadButtonReload && gamepad.buttons[id].pressed) {
        gamepadButtonReload = true;
        return true;
    }
    return false;
}

function loop() {
    gamepad = navigator.getGamepads()[0];
    if (gamepad !== undefined && gamepad !== null && content.length !== undefined) {
        const {buttons} = gamepad;
        let text = '';
        
        if (gamepadButton(0)) {
            gamepadButtons.groupA[0] = 1;
            const obj = content[gamepadCursor];
            enter(obj.path, obj.type, obj.name);
            gamepadCursor = 0;
            lastGamepadCursor = -1;
        } else if (gamepadButton(1)) {
            gamepadButtons.groupA[1] = 1;
            undo();
        } else if (gamepadButton(2)) {
            gamepadButtons.groupA[2] = 1;
            clearTemp();
        } else if (gamepadButton(3)) {
            gamepadButtons.groupA[3] = 1;
            window.location.reload();
        } else if (gamepadButton(13)) {
            if (gamepadCursor < content.length-1) {
                cursorButton = true;
                gamepadCursor++;
            } else {
                gamepadButtonReload = false;
            }
        } else if (gamepadButton(12)) {
            if (gamepadCursor > 0) {
                cursorButton = true;
                gamepadCursor--;
            } else {
                gamepadButtonReload = false;
            }
        } else if (!gamepadButtonReload) {
            gamepadButtonReload = false;
        }
        
        if (videoPlayerHtml.currentSrc !== "") {
            if (gamepadButton(11)) {
                if (window.fullScreen) {
                    document.exitFullscreen()
                } else {
                    videoPlayerHtml.requestFullscreen();
                }
            } else if (gamepadButton(4)) {
                changeVideo(-1, actualVideoName);
            } else if (gamepadButton(5)) {
                changeVideo(1, actualVideoName);
            } else if (buttons[6].value > 0.15) {
                videoPlayerHtml.currentTime -= buttons[6].value * 8;
            } else if (buttons[7].value > 0.15) {
                videoPlayerHtml.currentTime += buttons[7].value * 8;
            } else if (buttons[10].pressed) {
                if (videoPlayerHtml.paused) {
                    videoPlayerHtml.play();
                } else {
                    videoPlayerHtml.pause();
                }
            } else if (buttons[9].pressed) {
                document.querySelector('div#video').style.display = 'none';
                document.querySelector('video').src = "";
            } else {
                gamepadButtonReload = false;
            }
        }        
        
        if (buttons[6].value > 0.1) {
            if (!gamepadButtonReload) {
                if (document.activeElement === searchInput) {
                    searchInput.blur();
                } else {
                    searchInput.focus();
                }
            }
        } else if (buttons[7].value > 0.1) {
            if (!gamepadButtonReload) {
                searchInput.blur();
                socket.emit('search', {text:searchInput.value, path: actualPath});
            }
        }
        
        if (buttons.every(e=>!e.pressed)){
            gamepadButtonReload = false;
            cursorButton = false;
            clearInterval(extraInterval);
            extraInterval = 0;
            extraSpeedCounter = 0;
            gamepadButtons.groupA.fill(0, 0, 4);
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
            const htmlButtons = document.querySelectorAll('span.unit');
            htmlButtons.forEach((e,id)=>{
                const name = e.attributes[0].nodeValue;
                if (name.substring(name.indexOf("'")+1, name.indexOf("',")) === content[gamepadCursor].path.replace(/\\/g,'\\\\')) {
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