---
title: 'Three.js 入门指南：从零开始绘制3D动画'
published: 2026-05-04
description: '详细介绍如何使用 Three.js 创建3D动画，涵盖场景搭建、几何体创建、材质光照、动画循环等核心概念，配合完整可运行的示例代码，带你从零开始掌握 Three.js 3D 开发。'
image: ''
tags: ['Three.js', '3D动画', 'WebGL', '前端开发', 'JavaScript', '图形学']
category: '技术教程'
draft: false
lang: 'zh-CN'
excerpt: 'Three.js 是 Web 端最流行的 3D 渲染库之一。本文将用最通俗易懂的方式，带你从场景搭建到动画实现，完整掌握 Three.js 3D 动画的开发流程。'
keywords: ['Three.js教程', '3D动画', 'WebGL', '前端3D', 'JavaScript 3D', 'Three.js入门']
readingTime: 18
series: '前端图形学'
seriesOrder: 1
---

直接在浏览器里手写原生 WebGL 代码非常繁琐，画一个旋转的立方体往往就要上百行着色器和缓冲区样板代码。**Three.js** 把底层的 WebGL 接口封装成了场景（Scene）、相机（Camera）、网格（Mesh）等直观对象，几十行代码就能搭起一个可交互的 3D 场景。

这篇笔记从最基础的几何体与光照讲起，最后用粒子系统和轨道控制器做出一个可交互的 3D 彩色星系动画。

## Three.js 是什么

**Three.js** 是一个基于 JavaScript 的 3D 图形库，它：

- **简化 WebGL**：封装了复杂的 WebGL 底层 API
- **跨平台**：在所有支持 WebGL 的浏览器上运行
- **功能丰富**：提供场景、相机、光照、材质、几何体等完整 3D 开发能力
- **社区活跃**：拥有大量插件、示例和丰富的生态资源

### 核心概念

在开始之前，需要理解 Three.js 的四个核心组件：

| 组件 | 说明 |
|---|---|
| **Scene（场景）** | 一个容器，存放所有 3D 对象、灯光和相机 |
| **Camera（相机）** | 决定观察视角，常见有透视相机和正交相机 |
| **Renderer（渲染器）** | 负责将场景渲染到 HTML 画布上 |
| **Mesh（网格）** | 由几何体 + 材质组成，是场景中的可见物体 |

它们的关系可以理解为：**相机**对着**场景**拍照，**渲染器**把照片显示在屏幕上。

## 准备工作

### 环境要求

- 现代浏览器（Chrome、Firefox、Edge 均可）
- 基础 JavaScript 知识
- 代码编辑器（推荐 VS Code）

### 引入 Three.js

Three.js 可以通过 CDN、npm 或 ES Module 方式引入。本文使用 ES Module 方式，在 HTML 文件中直接引用：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Three.js 3D 动画</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
        }
    }
    </script>
    <script type="module" src="main.js"></script>
</body>
</html>
```

> `importmap` 是浏览器原生支持的模块映射机制，可以让我们在浏览器中直接使用 `import` 语法加载 Three.js。

## 创建第一个3D场景

创建一个 `main.js` 文件，从最基础的场景搭建开始：

```javascript
import * as THREE from 'three';

// 1. 创建场景
const scene = new THREE.Scene();

// 2. 创建透视相机
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;

// 3. 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
```

### 添加一个立方体

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);

const material = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    metalness: 0.5,
    roughness: 0.4,
});

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
```

### 渲染循环

```javascript
function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}

animate();
```

此时打开 HTML 文件，你就能看到一个自动旋转的蓝色立方体了！

## 更多几何体

Three.js 内置了丰富的几何体类型：

```javascript
// 球体
const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
const sphereMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
sphere.position.x = -3;
scene.add(sphere);

// 圆环（甜甜圈）
const torusGeo = new THREE.TorusGeometry(1, 0.3, 16, 100);
const torusMat = new THREE.MeshStandardMaterial({ color: 0x44ff44 });
const torus = new THREE.Mesh(torusGeo, torusMat);
torus.position.x = 3;
scene.add(torus);

// 圆柱体
const cylinderGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 32);
const cylinderMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
cylinder.position.y = -2;
scene.add(cylinder);
```

### 常用几何体一览

| 几何体 | 构造函数 | 说明 |
|---|---|---|
| 立方体 | BoxGeometry(w, h, d) | 最基本的六面体 |
| 球体 | SphereGeometry(r, wSeg, hSeg) | 分段数越高越光滑 |
| 圆柱体 | CylinderGeometry(rTop, rBot, h) | 顶部和底部半径可不同 |
| 圆环 | TorusGeometry(r, tube, rSeg, tSeg) | 类似甜甜圈形状 |
| 平面 | PlaneGeometry(w, h) | 平面，默认单面可见 |
| 圆锥体 | ConeGeometry(r, h, seg) | 底部圆形，顶部尖 |

## 材质与光照

### 常见材质类型

```javascript
// 基本材质 - 不受光照影响
const basicMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

// 标准材质 - 配合光照使用
const standardMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    metalness: 0.3,
    roughness: 0.5,
});

// 物理材质 - 更真实的物理渲染
const physicalMat = new THREE.MeshPhysicalMaterial({
    color: 0x00aaff,
    metalness: 0.0,
    roughness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
});
```

### 光照类型

```javascript
// 环境光 - 均匀照亮所有面
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

// 平行光 - 模拟太阳光
const directional = new THREE.DirectionalLight(0xffffff, 1);
directional.position.set(5, 10, 7);
scene.add(directional);

// 点光源 - 从一个点向四周发射
const pointLight = new THREE.PointLight(0xff4400, 1, 10);
pointLight.position.set(2, 2, 2);
scene.add(pointLight);

// 聚光灯 - 类似手电筒
const spotLight = new THREE.SpotLight(0xffffff, 1, 20, Math.PI / 4);
spotLight.position.set(0, 5, 0);
scene.add(spotLight);
```

## 创建炫酷动画

### 组合动画效果

```javascript
function animate() {
    requestAnimationFrame(animate);

    // 旋转
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.015;

    // 上下浮动
    cube.position.y = Math.sin(Date.now() * 0.002) * 0.5;

    // 缩放脉冲
    const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
    cube.scale.set(scale, scale, scale);

    renderer.render(scene, camera);
}
```

### 粒子系统

```javascript
const particlesGeo = new THREE.BufferGeometry();
const count = 5000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100;
    colors[i] = Math.random() * 0.5 + 0.5;
}

particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particlesMat = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

function animate() {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.0005;
    renderer.render(scene, camera);
}
```

### 轨道控制 - 交互式观察

在 HTML 的 importmap 中添加：

```html
<script type="importmap">
{
    "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
}
</script>
```

在 JavaScript 中引入：

```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 2;

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
```

## 完整示例：旋转的彩色星系

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// === 场景 ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// === 相机 ===
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 3, 8);

// === 渲染器 ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === 轨道控制 ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// === 光照 ===
const ambient = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// === 中心行星 ===
const planetGeo = new THREE.SphereGeometry(1.2, 64, 64);
const planetMat = new THREE.MeshPhysicalMaterial({
    color: 0x4488ff,
    metalness: 0.1,
    roughness: 0.3,
    emissive: 0x2244aa,
    emissiveIntensity: 0.2,
});
const planet = new THREE.Mesh(planetGeo, planetMat);
scene.add(planet);

// === 环绕环 ===
const ringGeo = new THREE.TorusGeometry(1.8, 0.05, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({
    color: 0x66aaff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 3;
scene.add(ring);

// === 环绕小行星 ===
const asteroids = [];
for (let i = 0; i < 8; i++) {
    const size = 0.1 + Math.random() * 0.15;
    const astGeo = new THREE.SphereGeometry(size, 8, 8);
    const astMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / 8, 0.8, 0.5),
        emissive: new THREE.Color().setHSL(i / 8, 0.8, 0.2),
    });
    const asteroid = new THREE.Mesh(astGeo, astMat);
    const angle = (i / 8) * Math.PI * 2;
    asteroid.position.set(
        Math.cos(angle) * 2.5,
        Math.sin(angle * 2) * 0.5,
        Math.sin(angle) * 2.5
    );
    asteroid.userData = { angle, speed: 0.5 + Math.random() * 0.5 };
    scene.add(asteroid);
    asteroids.push(asteroid);
}

// === 粒子星空 ===
const starCount = 3000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 200;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    blending: THREE.AdditiveBlending,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// === 动画循环 ===
function animate() {
    requestAnimationFrame(animate);

    planet.rotation.y += 0.005;
    ring.rotation.z += 0.003;

    asteroids.forEach((a) => {
        a.userData.angle += 0.01 * a.userData.speed;
        const angle = a.userData.angle;
        a.position.x = Math.cos(angle) * 2.5;
        a.position.z = Math.sin(angle) * 2.5;
        a.position.y = Math.sin(angle * 2) * 0.5;
        a.rotation.x += 0.02;
        a.rotation.y += 0.03;
    });

    stars.rotation.y += 0.0002;
    controls.update();
    renderer.render(scene, camera);
}

animate();

// === 窗口自适应 ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## 响应式与性能优化

### 窗口自适应

```javascript
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### 帧率无关动画

```javascript
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    cube.rotation.y += delta * 0.5;
    renderer.render(scene, camera);
}
```

### 性能优化技巧

1. **控制几何体精度**：球体的分段数 32x32 通常已足够
2. **合并几何体**：大量相同物体使用 `BufferGeometryUtils.mergeGeometries`
3. **关闭阴影**：不需要阴影时设置 `renderer.shadowMap.enabled = false`
4. **降低像素比**：`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
5. **使用 LOD**：根据距离切换不同精度的模型

## 常见问题与解决方案

### 物体不显示

1. 检查是否添加了光照（使用 `MeshBasicMaterial` 不需要光照）
2. 检查相机位置是否正对着物体
3. 检查物体是否在相机的视锥范围内
4. 检查渲染器是否被添加到了 DOM 中

### 性能卡顿

1. 减少几何体分段数
2. 降低像素比：`renderer.setPixelRatio(1)`
3. 关闭阴影：`renderer.shadowMap.enabled = false`
4. 减少光源数量

### 纹理加载失败

```javascript
import { TextureLoader } from 'three';

const loader = new TextureLoader();
const texture = loader.load(
    '/path/to/texture.jpg',
    () => console.log('加载成功'),
    undefined,
    (err) => console.error('加载失败', err)
);
```

## 小结

只要先把 `Scene`、`Camera`、`Renderer` 和 `requestAnimationFrame` 渲染循环这四块主干跑通，往场景里加几何体、灯光、粒子或者控制器其实就是不断往 `scene.add()` 里塞对象的过程。

如果接下来想往项目里塞外部 3D 资产，可以继续看 `GLTFLoader`（导入 Blender 导出的 `.glb/.gltf` 模型）以及 `EffectComposer`（后期辉光、景深等通道），或者直接翻阅 [Three.js 官方示例](https://threejs.org/examples/) 找现成的实现参考。