

var sphereShape;
var sphereBody;
var world;
var physicsMaterial;
var cannonBallMat;
var balls;
var ballMeshes;
var boxes;
var boxMeshes;
var light;

var camera, scene, renderer;
var planeGeometry, material, mesh;
var controls;
var lastFrameTime = Date.now();

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
    keyboard.keyUpCallbacks[keyboard.keyCodes.r] = function() {
        resetGame();
    };

    controls = new PointerLockControls( camera , sphereBody );
    scene.add( controls.getObject() );
}

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

    world.gravity.set(0, -20, 0);
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

}

var rendererId = "renderer";
var initScene = function() {
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( colors.skyBlue, 0, 500 );

    var ambient = new THREE.AmbientLight( 0x555555 );
    scene.add( ambient );

    light = new THREE.SpotLight( 0xffffff );
    light.position.set( 10, 60, 20 );
    light.target.position.set( 0, 0, 0 );
    if(true){
        light.castShadow = true;

        light.shadow.camera.near = 20;
        light.shadow.camera.far = 50;
        light.shadow.camera.fov = 40;

        light.shadowMapBias = 0.1;
        light.shadowMapDarkness = 0.7;
        light.shadow.mapSize.Width = 2*512;
        light.shadow.mapSize.Height = 2*512;

        //light.shadowCameraVisible = true;
    }
    scene.add( light );

    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( scene.fog.color, 1 );

    renderer.domElement.id = rendererId;
    document.body.appendChild( renderer.domElement );
}

var game = {}

var initPlane = function() {
    game.createPlane = function() {
        var groundShape = new CANNON.Plane();
        var groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
        world.add(groundBody);
        game.createPlaneDone(groundBody);
    };
    
    game.createPlaneDone = function() {
        // floor
        planeGeometry = new THREE.PlaneGeometry( 300, 300, 50, 50 );
        planeGeometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

        material = new THREE.MeshLambertMaterial( { color: colors.green } );

        mesh = new THREE.Mesh( planeGeometry, material );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add( mesh );
    };
    
    game.createPlane();
}

var isBoxFallen = function(boxBody) {
    return Math.abs(boxBody.quaternion.x) > 0.5 || Math.abs(boxBody.quaternion.z) > 0.5;
}

function init() {
    initPlane();
    balls = [];
    ballMeshes = [];
    boxes = [];
    boxMeshes = [];

    var halfExtents = new CANNON.Vec3(1, 3, 1);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);

    // Add boxes
    var boxShape = new CANNON.Box(halfExtents);
    game.createBoxDone = function (boxBody) {
        var boxMesh = new THREE.Mesh( boxGeometry, redMaterial );
        scene.add(boxMesh);
        boxMesh.position.set(boxBody.x, boxBody.y, boxBody.z);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxMeshes.push(boxMesh);
        boxes.push(boxBody);
    };
    game.createBox = function () {
        var x = (Math.random()-0.5) * 60;
        var y = halfExtents.y + 10;
        var z = (Math.random()-0.5) * 60;
        var boxBody = new CANNON.Body({ mass: 5 });
        boxBody.addShape(boxShape);
        world.add(boxBody);
        boxBody.position.set(x,y,z);
        game.createBoxDone(boxBody);
    };
    for(var i = 0; i < 40; i++){
        game.createBox();
    }
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
    game.tick();
    game.tickGraphics();
    lastFrameTime = Date.now();
    stats.end();
}

game.tick = function() {
    if(controls.enabled){
        world.step(dt);
    }

    controls.update( Date.now() - lastFrameTime );
    if(controls.enabled && isMouseDown){
        shootBall();
    }
    
    for(var i = 0; i < boxes.length; i++){
        if(isBoxFallen(boxes[i])) {
            boxes[i].fallen = true;
        }
    }
    var everFallen = 0;
    for(var i = 0; i < boxes.length; i++) {
        if(boxes[i].fallen)
            everFallen += 1;
    }
    game.boxesLeft = boxes.length - everFallen;
}

game.tickGraphics = function() {
    // Update ball positions
    for(var i=0; i < balls.length; i++){
        ballMeshes[i].position.copy(balls[i].position);
        ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }

    // Update box positions
    for(var i=0; i < boxes.length; i++){
        boxMeshes[i].position.copy(boxes[i].position);
        boxMeshes[i].quaternion.copy(boxes[i].quaternion);
        if(boxes[i].fallen) {
            boxMeshes[i].material = blueMaterial;
        }
    }
    
    document.getElementById("blocksRemaining").innerHTML = game.boxesLeft;
    renderer.render( scene, camera );
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

var clearScene = function(scene) {
    var renderer = document.getElementById(rendererId);
    renderer.parentNode.removeChild(renderer);
    var i;
    for(i=0; i < scene.children.length; i++){
        var obj = scene.children[i];
        scene.remove(obj);
    }
}

var initOnce = function() {
    initStats();
    keyboard.init();
    initScene();
    initCannon();
    init();
    initControls();
    requirePointerLock();
    window.addEventListener( 'resize', onWindowResize, false );
}

var resetGame = function() {
    clearScene(scene);
    initScene();
    initCannon();
    init();
    initControls();
}

initOnce();
animate();

