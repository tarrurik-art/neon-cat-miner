import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

let scene;
let camera;
let renderer;
let controls;

let selectedBlock = 1;

const blocks = [];

const blockTypes = {
    1: 0x32cd32,
    2: 0x8b4513,
    3: 0xd9d9d9,
    4: 0x00aaff,
    5: 0xaa00ff
};

const worldSize = 24;

const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = PLAYER_WIDTH / 2;

const GRAVITY = 25;
const JUMP_SPEED = 9;
const MOVE_SPEED = 6;

const velocity = new THREE.Vector3();

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

let onGround = false;

init();

function init() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x07111f);

    scene.fog = new THREE.Fog(
        0x07111f,
        25,
        80
    );

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    camera.position.set(0, 5, 8);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    document.body.appendChild(
        renderer.domElement
    );

    setupLighting();
    setupControls();
    createWorld();
    setupEvents();

    animate();
}

function setupLighting() {

    const ambient =
        new THREE.HemisphereLight(
            0xffffff,
            0x222233,
            2
        );

    scene.add(ambient);

    const sun =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    sun.position.set(
        20,
        40,
        20
    );

    scene.add(sun);
}

function setupControls() {

    controls =
        new PointerLockControls(
            camera,
            document.body
        );

    document
        .getElementById("playButton")
        .addEventListener(
            "click",
            () => controls.lock()
        );

    controls.addEventListener(
        "lock",
        () => {

            document.getElementById(
                "menu"
            ).style.display = "none";

            document.getElementById(
                "hud"
            ).style.display = "block";

            document.getElementById(
                "crosshair"
            ).style.display = "block";
        }
    );

    controls.addEventListener(
        "unlock",
        () => {

            document.getElementById(
                "menu"
            ).style.display = "flex";

            document.getElementById(
                "hud"
            ).style.display = "none";

            document.getElementById(
                "crosshair"
            ).style.display = "none";
        }
    );
}

function createWorld() {

    const geometry =
        new THREE.BoxGeometry(
            1,
            1,
            1
        );

    for (
        let x = -worldSize / 2;
        x < worldSize / 2;
        x++
    ) {

        for (
            let z = -worldSize / 2;
            z < worldSize / 2;
            z++
        ) {

            const height =
                2 +
                Math.floor(
                    Math.sin(x * 0.4) *
                    Math.cos(z * 0.4) *
                    1.5
                );

            for (
                let y = 0;
                y <= height;
                y++
            ) {

                let type;

                if (y === height) {
                    type = 1;
                }
                else if (y > height - 2) {
                    type = 2;
                }
                else {
                    type = 3;
                }

                createBlock(
                    x,
                    y,
                    z,
                    type,
                    geometry
                );
            }
        }
    }
}

function createBlock(
    x,
    y,
    z,
    type,
    geometry
) {

    const material =
        new THREE.MeshStandardMaterial({
            color: blockTypes[type],
            roughness: 0.8
        });

    const cube =
        new THREE.Mesh(
            geometry,
            material
        );

    cube.position.set(
        x,
        y,
        z
    );

    cube.userData.type = type;

    scene.add(cube);

    blocks.push(cube);

    return cube;
}

/*
========================================
COLLISION SYSTEM
========================================
*/

function playerBox(position) {

    return new THREE.Box3(
        new THREE.Vector3(
            position.x - PLAYER_RADIUS,
            position.y - PLAYER_HEIGHT / 2,
            position.z - PLAYER_RADIUS
        ),

        new THREE.Vector3(
            position.x + PLAYER_RADIUS,
            position.y + PLAYER_HEIGHT / 2,
            position.z + PLAYER_RADIUS
        )
    );
}

function blockBox(block) {

    return new THREE.Box3(
        new THREE.Vector3(
            block.position.x - 0.5,
            block.position.y - 0.5,
            block.position.z - 0.5
        ),

        new THREE.Vector3(
            block.position.x + 0.5,
            block.position.y + 0.5,
            block.position.z + 0.5
        )
    );
}

function collides(position) {

    const player = playerBox(position);

    for (const block of blocks) {

        const box = blockBox(block);

        if (player.intersectsBox(box)) {
            return true;
        }
    }

    return false;
}

/*
========================================
MOVEMENT
========================================
*/

function movePlayer(delta) {

    if (!controls.isLocked) {
        return;
    }

    let moveX = 0;
    let moveZ = 0;

    if (keys.w) moveZ -= 1;
    if (keys.s) moveZ += 1;
    if (keys.a) moveX -= 1;
    if (keys.d) moveX += 1;

    const length =
        Math.sqrt(
            moveX * moveX +
            moveZ * moveZ
        );

    if (length > 0) {

        moveX /= length;
        moveZ /= length;

    }

    /*
    Convert movement from camera direction
    into world coordinates.
    */

    const forward =
        new THREE.Vector3();

    camera.getWorldDirection(
        forward
    );

    forward.y = 0;
    forward.normalize();

    const right =
        new THREE.Vector3();

    right.crossVectors(
        forward,
        camera.up
    );

    right.normalize();

    const movement =
        new THREE.Vector3();

    movement.addScaledVector(
        forward,
        -moveZ
    );

    movement.addScaledVector(
        right,
        moveX
    );

    movement.normalize();

    movement.multiplyScalar(
        MOVE_SPEED * delta
    );

    /*
    ====================================
    X COLLISION
    ====================================
    */

    const nextX =
        camera.position.clone();

    nextX.x += movement.x;

    if (!collides(nextX)) {

        camera.position.x =
            nextX.x;

    }

    /*
    ====================================
    Z COLLISION
    ====================================
    */

    const nextZ =
        camera.position.clone();

    nextZ.z += movement.z;

    if (!collides(nextZ)) {

        camera.position.z =
            nextZ.z;

    }

    /*
    ====================================
    GRAVITY
    ====================================
    */

    velocity.y -=
        GRAVITY * delta;

    const nextY =
        camera.position.clone();

    nextY.y +=
        velocity.y * delta;

    if (!collides(nextY)) {

        camera.position.y =
            nextY.y;

        onGround = false;

    }
    else {

        if (velocity.y < 0) {

            /*
            Falling onto a block.
            */

            camera.position.y =
                Math.floor(
                    camera.position.y -
                    PLAYER_HEIGHT / 2
                ) + 0.5 +
                PLAYER_HEIGHT / 2;

            onGround = true;

        }

        velocity.y = 0;
    }

    /*
    ====================================
    JUMP
    ====================================
    */

    if (
        keys.space &&
        onGround
    ) {

        velocity.y =
            JUMP_SPEED;

        onGround = false;

        keys.space = false;
    }
}

/*
========================================
BREAK BLOCK
========================================
*/

function breakBlock() {

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const hits =
        raycaster.intersectObjects(
            blocks
        );

    if (hits.length === 0) {
        return;
    }

    const block =
        hits[0].object;

    if (
        block.position.distanceTo(
            camera.position
        ) > 8
    ) {
        return;
    }

    /*
    Don't allow removing a block if
    it would trap the player inside
    another block.
    */

    removeBlock(block);
}

/*
========================================
REMOVE BLOCK
========================================
*/

function removeBlock(block) {

    scene.remove(block);

    const index =
        blocks.indexOf(block);

    if (index !== -1) {

        blocks.splice(
            index,
            1
        );

    }

    block.material.dispose();
}

/*
========================================
PLACE BLOCK
========================================
*/

function placeBlock() {

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const hits =
        raycaster.intersectObjects(
            blocks
        );

    if (hits.length === 0) {
        return;
    }

    const hit = hits[0];

    const normal =
        hit.face.normal
            .clone()
            .transformDirection(
                hit.object.matrixWorld
            );

    const position =
        hit.object.position
            .clone()
            .add(normal);

    position.x =
        Math.round(position.x);

    position.y =
        Math.round(position.y);

    position.z =
        Math.round(position.z);

    /*
    Don't place inside player.
    */

    if (
        collides(position)
    ) {
        return;
    }

    /*
    Don't place too far away.
    */

    if (
        position.distanceTo(
            camera.position
        ) > 8
    ) {
        return;
    }

    const geometry =
        new THREE.BoxGeometry(
            1,
            1,
            1
        );

    createBlock(
        position.x,
        position.y,
        position.z,
        selectedBlock,
        geometry
    );
}

/*
========================================
EVENTS
========================================
*/

function setupEvents() {

    window.addEventListener(
        "resize",
        onResize
    );

    window.addEventListener(
        "keydown",
        event => {

            const key =
                event.key.toLowerCase();

            if (key === " ") {
                keys.space = true;
            }

            if (key in keys) {
                keys[key] = true;
            }

            if (
                ["1", "2", "3", "4", "5"]
                .includes(event.key)
            ) {

                selectedBlock =
                    Number(event.key);

                updateHotbar();
            }
        }
    );

    window.addEventListener(
        "keyup",
        event => {

            const key =
                event.key.toLowerCase();

            if (key === " ") {
                keys.space = false;
            }

            if (key in keys) {
                keys[key] = false;
            }
        }
    );

    window.addEventListener(
        "mousedown",
        event => {

            if (!controls.isLocked) {
                return;
            }

            if (event.button === 0) {
                breakBlock();
            }

            if (event.button === 2) {
                placeBlock();
            }
        }
    );

    window.addEventListener(
        "contextmenu",
        event => {
            event.preventDefault();
        }
    );
}

/*
========================================
HOTBAR
========================================
*/

function updateHotbar() {

    document
        .querySelectorAll(".slot")
        .forEach(slot => {

            slot.classList.remove(
                "selected"
            );

            if (
                Number(
                    slot.dataset.block
                ) === selectedBlock
            ) {

                slot.classList.add(
                    "selected"
                );

            }
        });
}

/*
========================================
ANIMATION
========================================
*/

let lastTime =
    performance.now();

function animate() {

    requestAnimationFrame(
        animate
    );

    const now =
        performance.now();

    const delta =
        Math.min(
            (now - lastTime) / 1000,
            0.05
        );

    lastTime = now;

    movePlayer(delta);

    renderer.render(
        scene,
        camera
    );
}

/*
========================================
RESIZE
========================================
*/

function onResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}
