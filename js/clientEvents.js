define([], function() {
    var exports = {
        
    };
    
    exports.names = {
        pause: 'pause',
        unpause: 'unpause'
    }
    
    return exports;
})

/*var events = {};


events.events = {};
events.events[events.names.pause] = new Event(events.pause);
events.events[events.names.unpause] = new Event(events.unpause);

events.elem = document;

// Listen for the event.
events.subscribe = function(eventName, func) {
    events.elem.addEventListener(eventName, func, false);
}

events.fire = function(event) {
    // Dispatch the event.
    events.elem.dispatchEvent(event);
}
*/