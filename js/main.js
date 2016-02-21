

var sphereShape;
var sphereBody;
var world;
var physicsMaterial;
var cannonBallMat;
var balls = [];
var ballMeshes = [];
var boxes = [];
var boxMeshes = [];

var camera, scene, renderer;
var geometry, material, mesh;
var controls;
var time = Date.now();

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

var stats;
var initStats = function() {

    stats = new Stats();
    stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb

    // align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );
};

var colors = {};
colors.green = 0x99ff99;
colors.red =   0xff9999;
colors.blue =  0x9999ff;
colors.skyBlue = 0xddddff;
var redMaterial = new THREE.MeshLambertMaterial( { color: colors.red } );
var blueMaterial = new THREE.MeshLambertMaterial( { color: colors.blue } );

var initControls = function() {
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    if ( havePointerLock ) {
        var element = document.body;
        var pointerlockchange = function ( event ) {
            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

                controls.enabled = true;

                blocker.style.display = 'none';

            } else {

                controls.enabled = false;

                blocker.style.display = '-webkit-box';
                blocker.style.display = '-moz-box';
                blocker.style.display = 'box';

                instructions.style.display = '';

            }

        };

        var pointerlockerror = function ( event ) {
            instructions.style.display = '';
        };

        // Hook pointer lock state change events
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

        instructions.addEventListener( 'click', function ( event ) {
            instructions.style.display = 'none';

            // Ask the browser to lock the pointer
            element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

            if ( /Firefox/i.test( navigator.userAgent ) ) {

                var fullscreenchange = function ( event ) {

                    if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

                        document.removeEventListener( 'fullscreenchange', fullscreenchange );
                        document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

                        element.requestPointerLock();
                    }

                }

                document.addEventListener( 'fullscreenchange', fullscreenchange, false );
                document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

                element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

                element.requestFullscreen();

            } else {

                element.requestPointerLock();

            }

        }, false );

    } else {
        instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
    }
};


function initCannon() {
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split)
        world.solver = new CANNON.SplitSolver(solver);
    else
        world.solver = solver;

    world.gravity.set(0,-20,0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
                                                            physicsMaterial,
                                                            0.0, // friction coefficient
                                                            0.3  // restitution
                                                            );
    
    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);
    cannonBallMat = new CANNON.Material();
    var cannonBallMatContact = new CANNON.ContactMaterial(physicsMaterial, cannonBallMat, { friction: 0.0, restitution: 0.8 });
    world.addContactMaterial(cannonBallMatContact);

    // Create a sphere
    var mass = 5, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({ mass: mass });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0,5,0);
    sphereBody.linearDamping = 0.9;
    world.add(sphereBody);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.add(groundBody);

    world.addEventListener("preStep", function(e) {
        if(controls.enabled && isMouseDown){
            shootBall();
        }
    });
}

function init() {

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( colors.skyBlue, 0, 500 );

    var ambient = new THREE.AmbientLight( 0x555555 );
    scene.add( ambient );

    light = new THREE.SpotLight( 0xffffff );
    light.position.set( 10, 30, 20 );
    light.target.position.set( 0, 0, 0 );
    if(true){
        light.castShadow = true;

        light.shadowCameraNear = 20;
        light.shadowCameraFar = 50;//camera.far;
        light.shadowCameraFov = 40;

        light.shadowMapBias = 0.1;
        light.shadowMapDarkness = 0.7;
        light.shadowMapWidth = 2*512;
        light.shadowMapHeight = 2*512;

        //light.shadowCameraVisible = true;
    }
    scene.add( light );



    controls = new PointerLockControls( camera , sphereBody );
    scene.add( controls.getObject() );

    // floor
    geometry = new THREE.PlaneGeometry( 300, 300, 50, 50 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

        
    material = new THREE.MeshLambertMaterial( { color: colors.green } );

    mesh = new THREE.Mesh( geometry, material );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( scene.fog.color, 1 );

    document.body.appendChild( renderer.domElement );

    // Add boxes
    var halfExtents = new CANNON.Vec3(1, 3, 1);
    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
    for(var i = 0; i < 40; i++){
        var x = (Math.random()-0.5) * 60;
        var y = halfExtents.y;
        var z = (Math.random()-0.5) * 60;
        var boxBody = new CANNON.Body({ mass: 5 });
        boxBody.addShape(boxShape);
        var boxMesh = new THREE.Mesh( boxGeometry, redMaterial );
        world.add(boxBody);
        scene.add(boxMesh);
        boxBody.position.set(x,y,z);
        boxMesh.position.set(x,y,z);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxes.push(boxBody);
        boxMeshes.push(boxMesh);
    }


    // Add linked boxes
    var addLinkedBoxes = function() {
        var size = 0.5;
        var he = new CANNON.Vec3(size,size,size*0.1);
        var boxShape = new CANNON.Box(he);
        var mass = 0;
        var space = 0.1 * size;
        var N = 5, last;
        var boxGeometry = new THREE.BoxGeometry(he.x*2,he.y*2,he.z*2);
        for(var i=0; i<N; i++){
            var boxbody = new CANNON.Body({ mass: mass });
            boxbody.addShape(boxShape);
            var boxMesh = new THREE.Mesh(boxGeometry, material);
            boxbody.position.set(5,(N-i)*(size*2+2*space) + size*2+space,0);
            boxbody.linearDamping = 0.01;
            boxbody.angularDamping = 0.01;
            // boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;
            world.add(boxbody);
            scene.add(boxMesh);
            boxes.push(boxbody);
            boxMeshes.push(boxMesh);

            if(i!=0){
                // Connect this body to the last one
                var c1 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(-size,size+space,0),last,new CANNON.Vec3(-size,-size-space,0));
                var c2 = new CANNON.PointToPointConstraint(boxbody,new CANNON.Vec3(size,size+space,0),last,new CANNON.Vec3(size,-size-space,0));
                world.addConstraint(c1);
                world.addConstraint(c2);
            } else {
                mass=0.3;
            }
            last = boxbody;
        }
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

var dt = 1/60;
function animate() {
    stats.begin();
    requestAnimationFrame( animate );
    if(controls.enabled){
        world.step(dt);

        // Update ball positions
        for(var i=0; i < balls.length; i++){
            ballMeshes[i].position.copy(balls[i].position);
            ballMeshes[i].quaternion.copy(balls[i].quaternion);
        }

        // Update box positions
        for(var i=0; i < boxes.length; i++){
            boxMeshes[i].position.copy(boxes[i].position);
            boxMeshes[i].quaternion.copy(boxes[i].quaternion);
        }
    }

    controls.update( Date.now() - time );
    renderer.render( scene, camera );
    time = Date.now();
    stats.end();
}

var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 15;
//var projector = new THREE.Projector();
function getShootDir(targetVec) {
    var vector = targetVec;
    targetVec.set(0,0,1);
    //projector.unprojectVector(vector, camera);
    vector.unproject(camera);
    var ray = new THREE.Ray(sphereBody.position, vector.sub(sphereBody.position).normalize() );
    targetVec.copy(ray.direction);
}

var isMouseDown = false;
window.addEventListener("mousedown",function(e) {
    isMouseDown = true;
});
window.addEventListener("mouseup",function(e) {
    isMouseDown = false;
});

var maxBalls = 100;

var shootBall = function() {
    if(balls.length >= maxBalls) {
        var bbody = balls.shift();
        world.remove(bbody);
        var bmesh = ballMeshes.shift();
        scene.remove(bmesh);
    }
    var x = sphereBody.position.x;
    var y = sphereBody.position.y;
    var z = sphereBody.position.z;
    var ballBody = new CANNON.Body({ mass: 3, material: cannonBallMat });
    ballBody.addShape(ballShape);
    ballBody.linearDamping = 0.01;
    var ballMesh = new THREE.Mesh( ballGeometry, blueMaterial );
    world.add(ballBody);
    scene.add(ballMesh);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    balls.push(ballBody);
    ballMeshes.push(ballMesh);
    getShootDir(shootDirection);
    ballBody.velocity.set(  shootDirection.x * shootVelo,
                            shootDirection.y * shootVelo,
                            shootDirection.z * shootVelo);

    // Move the ball outside the player sphere
    x += shootDirection.x * (sphereShape.radius*1.02 + ballShape.radius);
    y += shootDirection.y * (sphereShape.radius*1.02 + ballShape.radius);
    z += shootDirection.z * (sphereShape.radius*1.02 + ballShape.radius);
    ballBody.position.set(x,y,z);
    ballMesh.position.set(x,y,z);
};

var initOnce = function() {
    initStats();
    keyboard.init();
    initControls();
    window.addEventListener( 'resize', onWindowResize, false );
}

var resetGame = function() {
    initCannon();
    init();
}

initOnce();
resetGame();
animate();

