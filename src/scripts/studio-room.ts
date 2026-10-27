import * as THREE from "three/webgpu";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export interface StudioContent {
  name: string;
  role: string;
  project: string;
  modules: string[];
  figures: { value: string; label: string }[];
  books: string[];
  experience: string[];
  about: string[];
  calendar: number[];
}

export interface StudioRoom {
  setView(progress: number, paused: boolean): void;
  setTheme(): void;
  dispose(): void;
}

const poses = [
  { position: [10.8, 8.2, 11.8], target: [0, 1.4, 0], shift: 0 },
  { position: [3.5, 3.8, 5.4], target: [-1.6, 1.45, -1.9], shift: -1 },
  { position: [2.2, 3.8, 5.2], target: [-3, 1.5, -0.5], shift: 0 },
  { position: [5.5, 4.6, 6.8], target: [-0.8, 1.2, 0.3], shift: -1 },
  { position: [4.6, 3.5, 2.8], target: [1.8, 2.1, -3.3], shift: 0 },
  { position: [10.2, 7.5, 12.5], target: [0, 1.3, 0], shift: 0 },
];

export async function createStudioRoom(
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  content: StudioContent,
): Promise<StudioRoom> {
  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  try {
    await renderer.init();
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const look = new THREE.Vector3(...poses[0].target);
  const goalPosition = new THREE.Vector3(...poses[0].position);
  const goalLook = look.clone();
  camera.position.copy(goalPosition);
  camera.lookAt(look);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries = new Map<string, THREE.BufferGeometry>();
  const textures: THREE.Texture[] = [];
  const painted: {
    texture: THREE.CanvasTexture;
    paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  }[] = [];
  const pickables: THREE.Object3D[] = [];
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  const colors: Record<string, string> = {};
  let frame = 0;
  let previousTime = 0;
  let shift = 0;
  let goalShift = 0;
  let lastProgress = 0;
  let paused = false;
  let disposed = false;
  let initialized = false;
  let renderedFrames = 0;
  const keys = [
    "wall",
    "floor",
    "trim",
    "wood",
    "dark",
    "sage",
    "rug",
    "clay",
    "paper",
    "window",
    "light",
    "metal",
  ];
  function readColors() {
    const probe = document.createElement("span");
    probe.hidden = true;
    document.body.appendChild(probe);
    for (const key of keys) {
      probe.style.color = "var(--studio-room-" + key + ")";
      colors[key] = getComputedStyle(probe).color;
    }
    probe.remove();
  }
  readColors();
  function material(key: string, roughness = 0.8) {
    const existing = materials.get(key);
    if (existing) return existing;
    const result = new THREE.MeshStandardMaterial({
      color: colors[key],
      roughness,
    });
    materials.set(key, result);
    return result;
  }
  function geometry(key: string, create: () => THREE.BufferGeometry) {
    let result = geometries.get(key);
    if (!result) {
      result = create();
      geometries.set(key, result);
    }
    return result;
  }
  function mesh(
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
    chapter?: string,
  ) {
    const item = new THREE.Mesh(shape, surface);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    scene.add(item);
    if (chapter) {
      item.userData.chapter = chapter;
      pickables.push(item);
    }
    return item;
  }
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    key: string,
    chapter?: string,
    radius = 0.025,
  ) {
    const shape = geometry(
      [w, h, d, radius].join(":"),
      () =>
        new RoundedBoxGeometry(
          w,
          h,
          d,
          2,
          Math.min(radius, w / 3, h / 3, d / 3),
        ),
    );
    return mesh(shape, material(key), x, y, z, chapter);
  }
  function cylinder(
    top: number,
    bottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    key: string,
    chapter?: string,
  ) {
    return mesh(
      geometry(
        ["cylinder", top, bottom, height].join(":"),
        () => new THREE.CylinderGeometry(top, bottom, height, 24),
      ),
      material(key),
      x,
      y,
      z,
      chapter,
    );
  }
  function texture(
    w: number,
    h: number,
    paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ) {
    const surface = document.createElement("canvas");
    surface.width = w;
    surface.height = h;
    const ctx = surface.getContext("2d")!;
    paint(ctx, w, h);
    const image = new THREE.CanvasTexture(surface);
    image.colorSpace = THREE.SRGBColorSpace;
    image.anisotropy = 4;
    textures.push(image);
    painted.push({ texture: image, paint });
    return image;
  }
  const font = getComputedStyle(document.body).fontFamily;
  function text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    size: number,
    color = colors.dark,
    weight = 400,
  ) {
    ctx.fillStyle = color;
    ctx.font = weight + " " + size + "px " + font;
    ctx.fillText(value, x, y);
  }
  function art(
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    image: THREE.Texture,
    chapter: string,
  ) {
    box(w + 0.13, h + 0.13, 0.07, x, y, z - 0.03, "wood", chapter, 0.015);
    const surface = new THREE.MeshBasicMaterial({
      map: image,
      toneMapped: false,
    });
    const item = mesh(
      geometry("plane:" + w + ":" + h, () => new THREE.PlaneGeometry(w, h)),
      surface,
      x,
      y,
      z + 0.014,
      chapter,
    );
    item.castShadow = false;
    return item;
  }
  const grain = texture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#e9e1d2";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = "rgba(76,54,30," + (0.025 + (i % 5) * 0.009) + ")";
      ctx.lineWidth = 0.5 + (i % 3) * 0.4;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const y = i * 5 + Math.sin(x * 0.018 + i * 0.5) * 2.4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(2, 3);
  material("floor").map = grain;
  box(8.2, 0.2, 7.25, 0, -0.12, 0, "floor", undefined, 0.06);
  for (let i = -3; i <= 3; i++)
    box(0.012, 0.006, 7.1, i, 0.005, 0, "wood", undefined, 0.001);
  const back = box(8.15, 4.2, 0.16, 0, 2.05, -3.58, "wall", undefined, 0.015);
  back.castShadow = false;
  const left = box(0.16, 4.2, 7.2, -4.04, 2.05, 0, "wall", undefined, 0.015);
  left.castShadow = false;
  box(8.1, 0.14, 0.05, 0, 0.08, -3.46, "trim");
  box(0.05, 0.14, 7.1, -3.94, 0.08, 0, "trim");
  box(8.15, 0.05, 0.2, 0, 4.16, -3.58, "trim");
  box(0.2, 0.05, 7.2, -4.04, 4.16, 0, "trim");
  const rug = box(4, 0.025, 2.65, 0.55, 0.015, 1.1, "rug", undefined, 0.08);
  rug.rotation.y = -0.12;
  for (const z of [-0.15, 2.3]) {
    const edge = box(
      3.9,
      0.005,
      0.025,
      0.55,
      0.032,
      z,
      "paper",
      undefined,
      0.002,
    );
    edge.rotation.y = -0.12;
  }
  box(0.045, 2.25, 2.05, -3.93, 2.5, 1.4, "trim");
  const glass = box(
    0.025,
    2.05,
    1.85,
    -3.9,
    2.5,
    1.4,
    "window",
    undefined,
    0.005,
  );
  glass.castShadow = false;
  material("window").emissive.set(colors.window);
  material("window").emissiveIntensity = 0.16;
  box(0.07, 2.12, 0.045, -3.86, 2.5, 1.4, "trim");
  box(0.07, 0.045, 1.95, -3.86, 2.5, 1.4, "trim");
  for (let i = 0; i < 7; i++)
    cylinder(0.035, 0.035, 2.55, -3.78, 2.2, 2.45 + i * 0.042, "paper");
  box(2.9, 0.13, 1.35, -1.6, 1.23, -2.22, "wood", "work", 0.045);
  for (const x of [-2.85, -0.36])
    for (const z of [-2.75, -1.72])
      box(0.09, 1.16, 0.09, x, 0.58, z, "dark", "work");
  box(0.65, 1.08, 1.13, -2.55, 0.6, -2.2, "wood", "work");
  for (const y of [0.36, 0.75, 1.04])
    box(0.15, 0.024, 0.05, -2.55, y, -1.62, "dark", "work", 0.008);
  box(0.65, 0.065, 0.4, -1.45, 1.33, -2.5, "metal", "work");
  box(0.08, 0.4, 0.08, -1.45, 1.54, -2.56, "metal", "work");
  box(1.4, 0.94, 0.08, -1.45, 1.97, -2.56, "dark", "work", 0.04);
  const screen = texture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = colors.dark;
    ctx.fillRect(0, 0, w, h);
    text(ctx, content.project, 54, 85, 52, colors.paper, 600);
    text(ctx, "Software behind the classroom.", 54, 135, 25, colors.paper);
    content.modules.forEach((name, i) => {
      const x = 54 + (i % 2) * 460,
        y = 197 + Math.floor(i / 2) * 178;
      ctx.strokeStyle = colors.metal;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 410, 136);
      text(ctx, "0" + (i + 1), x + 22, y + 38, 20, colors.sage);
      text(ctx, name, x + 22, y + 94, 30, colors.paper, 500);
    });
  });
  art(1.31, 0.82, -1.45, 1.97, -2.505, screen, "work");
  box(0.9, 0.035, 0.33, -1.45, 1.32, -1.92, "dark", "work", 0.025);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 12; col++)
      box(
        0.052,
        0.01,
        0.06,
        -1.83 + col * 0.068,
        1.344,
        -2.02 + row * 0.085,
        "metal",
        "work",
        0.006,
      );
  box(0.14, 0.07, 0.22, -0.72, 1.35, -1.95, "dark", "work", 0.06);
  const notebook = box(
    0.42,
    0.025,
    0.55,
    -2.55,
    1.32,
    -1.92,
    "paper",
    "about",
    0.006,
  );
  notebook.rotation.y = -0.13;
  box(0.014, 0.012, 0.43, -2.67, 1.34, -1.92, "clay", "about", 0.003);
  cylinder(0.1, 0.085, 0.18, -0.4, 1.4, -2.5, "paper", "about");
  cylinder(0.086, 0.086, 0.005, -0.4, 1.493, -2.5, "dark");
  const handle = mesh(
    geometry("mug-handle", () => new THREE.TorusGeometry(0.065, 0.016, 8, 20)),
    material("paper"),
    -0.28,
    1.41,
    -2.5,
  );
  handle.rotation.y = Math.PI / 2;
  cylinder(0.11, 0.11, 0.035, -2.75, 1.33, -2.55, "dark");
  cylinder(0.015, 0.015, 0.65, -2.75, 1.65, -2.55, "dark");
  cylinder(0.12, 0.24, 0.22, -2.75, 2.02, -2.55, "clay");
  const lamp = new THREE.PointLight(colors.light, 5, 3, 2);
  lamp.position.set(-2.75, 1.93, -2.55);
  scene.add(lamp);
  box(0.86, 0.16, 0.8, -1.55, 0.66, -0.75, "sage", "about", 0.12);
  box(0.86, 0.72, 0.16, -1.55, 1.06, -0.38, "sage", "about", 0.12);
  cylinder(0.035, 0.035, 0.51, -1.55, 0.32, -0.75, "dark");
  for (const angle of [0, Math.PI / 2]) {
    const foot = box(0.82, 0.045, 0.08, -1.55, 0.07, -0.75, "dark");
    foot.rotation.y = angle;
  }
  for (const y of [0.22, 1.1, 2, 2.9])
    box(0.58, 0.1, 2.2, -3.63, y, -1.55, "wood", "experience");
  for (const z of [-2.65, -0.45])
    box(0.58, 2.8, 0.065, -3.63, 1.6, z, "wood", "experience");
  for (let shelf = 0; shelf < 3; shelf++)
    for (let i = 0; i < 8; i++) {
      const height = 0.44 + ((i * 7 + shelf * 3) % 5) * 0.065;
      const book = box(
        0.37,
        height,
        0.12,
        -3.57,
        0.31 + shelf * 0.9 + height / 2,
        -2.45 + i * 0.23,
        ["paper", "sage", "clay", "dark"][(i + shelf) % 4],
        "experience",
        0.008,
      );
      if (i === 7) book.rotation.x = 0.13;
    }
  cylinder(0.15, 0.12, 0.23, -3.55, 3.07, -1, "paper", "experience");
  const print = texture(768, 960, (ctx, w, h) => {
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, h);
    text(ctx, content.about[0], 75, 200, 72, colors.dark, 500);
    text(ctx, content.about[1], 75, 300, 64, colors.dark, 500);
    ctx.strokeStyle = colors.clay;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(75, 380);
    ctx.lineTo(690, 380);
    ctx.stroke();
    content.figures.forEach((figure, i) => {
      text(ctx, figure.value, 80, 495 + i * 145, 66, colors.dark, 500);
      text(ctx, figure.label, 315, 485 + i * 145, 28, colors.dark);
    });
  });
  art(1.5, 1.85, 1.25, 2.65, -3.46, print, "work");
  const calendar = texture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = colors.dark;
    ctx.fillRect(0, 0, w, h);
    text(ctx, "A year of small steps.", 55, 95, 42, colors.paper, 500);
    const palette = [
      colors.metal,
      colors.sage,
      colors.rug,
      colors.paper,
      colors.clay,
    ];
    content.calendar.forEach((level, i) => {
      ctx.fillStyle = palette[level] ?? palette[0];
      ctx.fillRect(55 + Math.floor(i / 7) * 17, 160 + (i % 7) * 30, 12, 23);
    });
    text(
      ctx,
      "GitHub contributions · saved snapshot",
      55,
      500,
      27,
      colors.paper,
    );
    text(ctx, content.name, 55, 560, 30, colors.paper, 500);
  });
  art(1.55, 1.05, 2.9, 1.1, -3.46, calendar, "github");
  box(2.3, 0.48, 1.1, -2.6, 0.38, 1.8, "wood", "about", 0.07);
  box(2.15, 0.2, 1.03, -2.6, 0.72, 1.8, "paper", "about", 0.14);
  box(0.17, 0.54, 1.13, -3.7, 0.74, 1.8, "wood", "about", 0.06);
  box(0.17, 0.54, 1.13, -1.5, 0.74, 1.8, "wood", "about", 0.06);
  const pillow = box(0.6, 0.18, 0.63, -3.18, 0.92, 1.8, "clay", "about", 0.1);
  pillow.rotation.z = -0.1;
  cylinder(0.53, 0.51, 0.09, 0.8, 0.66, 0.8, "wood", "about");
  cylinder(0.055, 0.075, 0.59, 0.8, 0.32, 0.8, "dark");
  cylinder(0.3, 0.33, 0.045, 0.8, 0.035, 0.8, "dark");
  const book = box(0.38, 0.07, 0.52, 0.8, 0.75, 0.8, "sage", "about", 0.008);
  book.rotation.y = 0.2;
  box(0.32, 0.025, 0.44, 0.87, 0.8, 0.77, "paper", "about", 0.004);
  cylinder(0.32, 0.25, 0.52, 3.2, 0.28, -2.45, "clay");
  cylinder(0.27, 0.27, 0.01, 3.2, 0.55, -2.45, "dark");
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.399,
      height = 0.75 + (i % 4) * 0.22;
    const end = new THREE.Vector3(
      3.2 + Math.cos(angle) * 0.46,
      0.5 + height,
      -2.45 + Math.sin(angle) * 0.46,
    );
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.2, 0.53, -2.45),
      new THREE.Vector3(
        3.2 + Math.cos(angle) * 0.14,
        0.5 + height * 0.6,
        -2.45 + Math.sin(angle) * 0.14,
      ),
      end,
    ]);
    mesh(
      geometry(
        "stem:" + i,
        () => new THREE.TubeGeometry(curve, 8, 0.012, 5, false),
      ),
      material("sage"),
      0,
      0,
      0,
    );
    const leaf = mesh(
      geometry("leaf", () => new THREE.SphereGeometry(1, 12, 8)),
      material(i % 2 ? "sage" : "dark"),
      end.x,
      end.y,
      end.z,
    );
    leaf.scale.set(0.13, 0.31, 0.045);
    leaf.rotation.set(0.4, angle, Math.cos(angle) * 0.6);
  }
  const sky = new THREE.HemisphereLight(colors.paper, colors.wood, 2.5);
  scene.add(sky);
  const sun = new THREE.DirectionalLight(colors.light, 3.6);
  sun.position.set(-2, 8, 6);
  sun.castShadow = true;
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 25;
  sun.shadow.mapSize.set(
    innerWidth < 700 ? 512 : 1024,
    innerWidth < 700 ? 512 : 1024,
  );
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(colors.window, 1.3);
  fill.position.set(4, 4, 1);
  scene.add(fill);
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const hit = (event: PointerEvent | MouseEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickables, false)[0]?.object.userData
      .chapter as string | undefined;
  };
  canvas.addEventListener(
    "pointermove",
    (event) => {
      canvas.style.cursor = hit(event) ? "pointer" : "default";
    },
    { passive: true, signal },
  );
  canvas.addEventListener(
    "click",
    (event) => {
      const chapter = hit(event);
      if (chapter)
        document.getElementById(chapter)?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
    },
    { signal },
  );
  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const elapsed = previousTime
      ? Math.min((time - previousTime) / 1000, 0.05)
      : 0.016;
    previousTime = time;
    const amount = 1 - Math.exp(-elapsed * 8);
    camera.position.lerp(goalPosition, amount);
    look.lerp(goalLook, amount);
    shift += (goalShift - shift) * amount;
    const settled =
      camera.position.distanceToSquared(goalPosition) +
        look.distanceToSquared(goalLook) +
        Math.abs(goalShift - shift) <
      0.00001;
    if (settled) {
      camera.position.copy(goalPosition);
      look.copy(goalLook);
      shift = goalShift;
    }
    camera.lookAt(look);
    document.documentElement.style.setProperty("--studio-shift", String(shift));
    renderer.render(scene, camera);
    root.dataset.studioFrames = String(++renderedFrames);
    root.dataset.studioPose = [...camera.position.toArray(), ...look.toArray()]
      .map((v) => v.toFixed(3))
      .join(",");
    root.dataset.studioSettled = String(settled);
    if (!settled) requestDraw();
  }
  function requestDraw() {
    if (initialized && !frame && !disposed && !document.hidden) {
      root.dataset.studioSettled = "false";
      frame = requestAnimationFrame(draw);
    }
  }
  function setView(progress: number, stop: boolean) {
    lastProgress = progress;
    paused = stop;
    const at = stop ? 0 : Math.min(progress, poses.length - 1);
    const i = Math.floor(at),
      next = Math.min(i + 1, poses.length - 1);
    const t = at - i,
      mix = t * t * (3 - 2 * t);
    goalPosition
      .fromArray(poses[i].position)
      .lerp(new THREE.Vector3(...poses[next].position), mix);
    goalLook
      .fromArray(poses[i].target)
      .lerp(new THREE.Vector3(...poses[next].target), mix);
    if (innerWidth < 700)
      goalPosition.sub(goalLook).multiplyScalar(1.12).add(goalLook);
    goalShift = poses[i].shift + (poses[next].shift - poses[i].shift) * mix;
    if (stop) {
      camera.position.copy(goalPosition);
      look.copy(goalLook);
      shift = goalShift;
    }
    requestDraw();
  }
  function resize() {
    const bounds = root.getBoundingClientRect();
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.6),
    );
    renderer.setSize(
      Math.max(1, bounds.width),
      Math.max(1, bounds.height),
      false,
    );
    camera.aspect = bounds.width / Math.max(1, bounds.height);
    camera.fov = innerWidth < 700 ? 39 : 36;
    camera.updateProjectionMatrix();
    setView(lastProgress, paused);
  }
  function setTheme() {
    readColors();
    for (const [key, surface] of materials) surface.color.set(colors[key]);
    material("window").emissive.set(colors.window);
    const dark = document.documentElement.dataset.theme === "dark";
    sky.color.set(colors.paper);
    sky.groundColor.set(colors.wood);
    sky.intensity = dark ? 1.35 : 2.5;
    sun.color.set(colors.light);
    sun.intensity = dark ? 1.8 : 3.6;
    fill.color.set(colors.window);
    fill.intensity = dark ? 0.75 : 1.3;
    lamp.intensity = dark ? 11 : 5;
    for (const { texture: image, paint } of painted) {
      const surface = image.image as HTMLCanvasElement;
      paint(surface.getContext("2d")!, surface.width, surface.height);
      image.needsUpdate = true;
    }
    sun.shadow.needsUpdate = true;
    requestDraw();
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(root);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        previousTime = 0;
        requestDraw();
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      root.dataset.studioState = "fallback";
      root.querySelector("[data-studio-renderer-label]")!.textContent =
        "Illustrated view";
    },
    { signal },
  );
  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    lifecycle.abort();
    sizeObserver.disconnect();
    for (const shape of geometries.values()) shape.dispose();
    const surfaces = new Set<THREE.Material>();
    scene.traverse((item) => {
      if (item instanceof THREE.Mesh) {
        const surface = item.material;
        if (Array.isArray(surface)) surface.forEach((s) => surfaces.add(s));
        else surfaces.add(surface);
      }
    });
    surfaces.forEach((surface) => surface.dispose());
    textures.forEach((image) => image.dispose());
    renderer.dispose();
  }
  resize();
  setTheme();
  try {
    await renderer.compileAsync(scene, camera);
  } catch (error) {
    dispose();
    throw error;
  }
  initialized = true;
  root.querySelector("[data-studio-renderer-label]")!.textContent =
    "isWebGPUBackend" in renderer.backend && renderer.backend.isWebGPUBackend
      ? "WebGPU"
      : "WebGL2";
  requestDraw();
  return {
    setView,
    setTheme,
    dispose,
  };
}
