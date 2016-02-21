/**
 * @author mrdoob / http://mrdoob.com/
 * @author schteppe / https://github.com/schteppe
 */
 var PointerLockControls = function ( camera, cannonBody ) {

    var eyeYPos = 2; // eyes are 2 meters above the ground
    var velocityFactor = 0.9;
    var jumpVelocity = 4;
    var scope = this;

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 2;
    yawObject.add( pitchObject );

    var quat = new THREE.Quaternion();

    var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
    var upAxis = new CANNON.Vec3(0,1,0);
    cannonBody.addEventListener("collide",function(e){
        var contact = e.contact;

        // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
        // We do not yet know which one is which! Let's check.
        if(contact.bi.id == cannonBody.id)  // bi is the player body, flip the contact normal
            contact.ni.negate(contactNormal);
        else
            contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is

        // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
        if(contactNormal.dot(upAxis) > 0.5) // Use a "good" threshold value between 0 and 1 here!
            canJump = true;
    });

    var velocity = cannonBody.velocity;

    var PI_2 = Math.PI / 2;

    var onMouseMove = function ( event ) {

        if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );
    };

    var binds = {};
    var commands = {
        forward: 'forward',
        back: 'back',
        left: 'left',
        right: 'right',
        fly: 'fly',
        look: 'look'
    };
    
    binds[keyboard.keyCodes.up] =    commands.forward;
    binds[keyboard.keyCodes.w] =     commands.forward;
    binds[keyboard.keyCodes.left] =  commands.left;
    binds[keyboard.keyCodes.a] =     commands.left;
    binds[keyboard.keyCodes.down] =  commands.back;
    binds[keyboard.keyCodes.s] =     commands.back;
    binds[keyboard.keyCodes.right] = commands.right;
    binds[keyboard.keyCodes.d] =     commands.right;
    binds[keyboard.keyCodes.space] = commands.fly;

    var updateCommands = function() {
        var commandsCalled = {};
        Object.keys(keyboard.keysDown).forEach(function(keyCode,index) {
            var bound = binds[keyCode];
            if(bound !== undefined)
                commandsCalled[bound] = true;
        });
        return commandsCalled;
    };


    document.addEventListener( 'mousemove', onMouseMove, false );

    this.enabled = false;

    this.getObject = function () {
        return yawObject;
    };

    this.getDirection = function(targetVec){
        targetVec.set(0,0,-1);
        quat.multiplyVector3(targetVec);
    }

    // Moves the camera to the Cannon.js object position and adds velocity to the object if the run key is down
    var inputVelocity = new THREE.Vector3();
    var euler = new THREE.Euler();
    this.update = function ( delta ) {

        if ( scope.enabled === false ) return;

        delta *= 0.1;

        inputVelocity.set(0,0,0);

        var commandsCalled = updateCommands();
        if ( commandsCalled[commands.forward] ){
            inputVelocity.z = -velocityFactor * delta;
        }
        if ( commandsCalled[commands.back] ){
            inputVelocity.z = velocityFactor * delta;
        }

        if ( commandsCalled[commands.left] ){
            inputVelocity.x = -velocityFactor * delta;
        }
        if ( commandsCalled[commands.right] ){
            inputVelocity.x = velocityFactor * delta;
        }
        if (commandsCalled[commands.fly]) {
            cannonBody.force.y = 300 * delta;
            //velocity.y = jumpVelocity;
        }

        // Convert velocity to world coordinates
        euler.x = pitchObject.rotation.x;
        euler.y = yawObject.rotation.y;
        euler.order = "XYZ";
        quat.setFromEuler(euler);
        inputVelocity.applyQuaternion(quat);
        //quat.multiplyVector3(inputVelocity);

        // Add to the object
        velocity.x += inputVelocity.x;
        velocity.z += inputVelocity.z;

        yawObject.position.copy(cannonBody.position);
        //cannonBody.force.x = 0;
        //cannonBody.force.y = 20;
        //cannonBody.force.z = 0;
    };
};
