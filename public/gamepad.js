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
        enter(obj.path, obj.type, obj.name);
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
                enter(obj.path, obj.type, obj.name);
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
        } else if (buttons[6].value > 0.1) {
            if (!gamepadButtonReload) {
                if (document.activeElement === searchInput) {
                    searchInput.blur();
                } else {
                    searchInput.focus();
                }
                gamepadButtonReload = true;
            }
        } else if (buttons[7].value > 0.1) {
            if (!gamepadButtonReload) {
                searchInput.blur();
                gamepadButtonReload = true;
                socket.emit('search', {text:searchInput.value, path: actualPath});
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
                console.log(name.substring(name.indexOf("'")+1, name.indexOf("',")));
                console.log(content[gamepadCursor].path);
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