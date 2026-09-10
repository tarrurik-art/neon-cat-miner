import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

let scene;
let camera;
let renderer;
let controls;

let selectedBlock = 1;

const blocks = [];

const blockTypes = {
    1: 0x32cd32, // grass
    2: 0x8b4513, // dirt
    3: 0xd9d9d9, // stone
    4: 0x00aaff, // neon blue
    5: 0xaa00ff  // neon purple
};

const worldSize = 24;
const worldHeight = 6;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};

const player = {
    height: 1.7,
    speed: 7
};

init();

function init() {

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x07111f);

    scene.fog = new THREE.Fog(0x07111f, 25, 80);

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

    document.body.appendChild(renderer.domElement);

    setupLighting();
    setupControls();
    createWorld();
    setupEvents();

    animate();
}

function setupLighting() {

    const ambient = new THREE.HemisphereLight(
        0xffffff,
        0x222233,
        2
    );

    scene.add(ambient);

    const sun = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    sun.position.set(20, 40, 20);

    scene.add(sun);
}

function setupControls() {

    controls = new PointerLockControls(
        camera,
        document.body
    );

    document
        .getElementById("playButton")
        .addEventListener("click", () => {

            controls.lock();

        });

    controls.addEventListener("lock", () => {

        document.getElementById("menu").style.display = "none";
        document.getElementById("hud").style.display = "block";
        document.getElementById("crosshair").style.display = "block";

    });

    controls.addEventListener("unlock", () => {

        document.getElementById("menu").style.display = "flex";
        document.getElementById("hud").style.display = "none";
        document.getElementById("crosshair").style.display = "none";

    });
}

function createWorld() {

    const geometry = new THREE.BoxGeometry(
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
                } else if (y > height - 2) {
                    type = 2;
                } else {
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

    const material = new THREE.MeshStandardMaterial({
        color: blockTypes[type],
        roughness: 0.8
    });

    const cube = new THREE.Mesh(
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

function removeBlock(block) {

    scene.remove(block);

    const index = blocks.indexOf(block);

    if (index !== -1) {
        blocks.splice(index, 1);
    }

    block.geometry.dispose();
    block.material.dispose();
}

function placeBlock() {

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const hits = raycaster.intersectObjects(
        blocks
    );

    if (hits.length === 0) {
        return;
    }

    const hit = hits[0];

    const normal = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld);

    const position =
        hit.object.position.clone().add(normal);

    // Don't place a block inside the player.

    const distance =
        position.distanceTo(camera.position);

    if (distance < 1.5) {
        return;
    }

    const geometry = new THREE.BoxGeometry(
        1,
        1,
        1
    );

    createBlock(
        Math.round(position.x),
        Math.round(position.y),
        Math.round(position.z),
        selectedBlock,
        geometry
    );
}

function breakBlock() {

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const hits = raycaster.intersectObjects(
        blocks
    );

    if (hits.length === 0) {
        return;
    }

    const block = hits[0].object;

    // Don't destroy blocks too far away.

    if (
        block.position.distanceTo(
            camera.position
        ) > 8
    ) {
        return;
    }

    removeBlock(block);
}

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

function updateMovement(delta) {

    if (!controls.isLocked) {
        return;
    }

    direction.set(0, 0, 0);

    if (keys.w) {
        direction.z -= 1;
    }

    if (keys.s) {
        direction.z += 1;
    }

    if (keys.a) {
        direction.x -= 1;
    }

    if (keys.d) {
        direction.x += 1;
    }

    if (direction.length() > 0) {
        direction.normalize();
    }

    const speed = player.speed;

    velocity.x =
        direction.x *
        speed *
        delta;

    velocity.z =
        direction.z *
        speed *
        delta;

    controls.moveRight(
        velocity.x
    );

    controls.moveForward(
        -velocity.z
    );

    // Simple gravity

    velocity.y -=
        20 * delta;

    camera.position.y +=
        velocity.y * delta;

    // Ground

    if (camera.position.y < 4) {

        camera.position.y = 4;

        velocity.y = 0;

    }

    // Jump

    if (
        keys.space &&
        camera.position.y <= 4.01
    ) {

        velocity.y = 8;

        keys.space = false;

    }
}

let lastTime = performance.now();

function animate() {

    requestAnimationFrame(
        animate
    );

    const now = performance.now();

    const delta =
        Math.min(
            (now - lastTime) / 1000,
            0.05
        );

    lastTime = now;

    updateMovement(delta);

    renderer.render(
        scene,
        camera
    );
}

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
