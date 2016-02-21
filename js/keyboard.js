
var keyboard = {};
keyboard.keysDown = {};
keyboard.keyUpCallbacks = {};

keyboard.keyCodes = {
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    a: 65,
    d: 68,
    s: 83,
    w: 87,
}

keyboard.onKeyDown = function ( event ) {
    keyboard.keysDown[event.keyCode] = true;
}

keyboard.onKeyUp = function ( event ) {
    delete keyboard.keysDown[event.keyCode];
    if(keyboard.keyUpCallbacks[event.keyCode]) {
        keyboard.keyUpCallbacks[event.keyCode](event.keyCode);
    }
}

keyboard.init = function() {
    document.addEventListener( 'keydown', keyboard.onKeyDown, false );
    document.addEventListener( 'keyup', keyboard.onKeyUp, false );
}
