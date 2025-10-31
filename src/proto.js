import * as THREE from 'three';
//import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import SpriteText from 'three-spritetext';
//import { Player } from "textalive-app-api";
//import { Tween } from 'three/examples/jsm/libs/tween.module.js';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
//import { getScreenPosition, pass, renderOutput, uniform } from 'three/tsl';
//import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
//import { PostProcessing, Vector2, Vector3 } from 'three/webgpu';
import { MeshLineGeometry, MeshLineMaterial} from 'meshline'
//import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { ChromaticAberrationEffect } from 'postprocessing';
import { ParticleEmitter, BatchedRenderer, ParticleSystem} from 'three.quarks';
///import { PointEmitter, ConeEmitter } from 'three.quarks';
//import { IntervalValue, ConstantValue, ConstantColor } from 'three.quarks';
//import { ColorOverLife, SizeOverLife, FrameOverLife, SpeedOverLife} from 'three.quarks';
//import { ColorRange, PiecewiseBezier, Bezier, RenderMode, ApplyForce } from 'three.quarks';
//import { clamp } from 'three/src/math/MathUtils.js';
//import { buffer, sign } from 'three/tsl';
import { ShootingStar } from './objects/ShootingStar';
import { SectionText } from './objects/SectionText';
import { PageText } from './objects/PageText';
import star from './images/sp2.png';
import skyTopTex from './images/nothingness.png';
import skyBotTex from './images/nothingness.png';
import skySideTex1 from './images/Skybox_DRAFT_FGLayer.png';
import skySideTex2 from './images/Skybox_DRAFT_BGLayer.png';
import skyTopBotTexStr from './images/Skycylinder/MikuProCon_skycylinder_TOP.png';
import skySideTexStr from './images/Skycylinder/MikuProCon_skycylinder_SIDESv07.png';
import { LinkText } from './objects/LinkText';
import githubImg from './images/logos/Github.png';
import linkedInImg from './images/logos/Linkedin.png';
import lunaImg from './images/logos/Luna.png';




function wait(milliseconds) {
  //simple sleep function
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function getScreenDistance(position1, position2, camera) {
  // Input World Positions
  const out = [];
  // Project to screen
  const screenPosition1 = position1.clone().project(camera);
  const screenPosition2 = position2.clone().project(camera);

  // Convert to Vector2
  const screenVector1 = new THREE.Vector2(screenPosition1.x, screenPosition1.y);
  const screenVector2 = new THREE.Vector2(screenPosition2.x, screenPosition2.y);

  // Calculate 2D distance
  const screenDistance = screenVector1.distanceTo(screenVector2);
  //horizontal and vertical distance in normalized device coordinates
  const ndcX = Math.abs(screenVector1.x - screenVector2.x);
  const ndcY = Math.abs(screenVector1.y - screenVector2.y);
  let w = document.documentElement.clientWidth;
  let h = document.documentElement.clientHeight;
  //convert to pixels
  const pixelX = (ndcX * 0.5 + 0.5) * w;
  const pixelY = (ndcY * 0.5 + 0.5) * h;
  out.push(pixelX);
  out.push(pixelY);
  //returns vector of horizontal and vertical distance
  return out;
}
function getAnimationFrames(path, numFrames) {
  //grab frames from folder
  const fileType = ".png";
  const frames = [];
  for(let i = 1; i <= numFrames; i++)
  {
    frames.push(`${i}`);
  }
  const frameStrings = frames.map(frame => {
      return path + frame + fileType;
  });
  return frameStrings;
}



const loadingManager = new THREE.LoadingManager();
let rendererO;
let loadingInd = 0;
let doneLoading = false;
const progressBar = document.getElementById('progress-bar');
const label = document.getElementById('bar-label');
loadingManager.onProgress = function(url, loaded, total){
  progressBar.value = (loaded/total) * 100;
}

loadingManager.onLoad = async function(url, item, total){
    console.log('Batch loaded');
    label.textContent = 'Almost there...';
    await wait(1000);
    loadingInd++;
    label.textContent = 'Click to start!\nLook around by clicking and dragging, and click on anything you see to learn more about me!';
    doneLoading = true;
}


const songInfo = ["https://piapro.jp/t/ULcJ/20250205120202", 4694275, 2830730, 2946478, 67810, 20654, "ストリートライト / 加賀(ネギシャワーP)"];
class Main
{
  constructor()
  {
    this.position = 0;
    this.active = false;
    this.distRange = 20;
    this.rotRange = Math.PI/6;
    this.vertRotRange = Math.PI/14;
    this.minDist = 20;
    this.collisionRadius = 6;
    this.starAmount = 600;
    this.starMinDist = 10;
    this.starDistRange = 50;
    this.twinkleTweens = Array(this.starAmount).fill(undefined);
    this.minTwinkleTime = 1000;
    this.textMinTwinkleTime = 2000;
    this.twinkleTimeRange = 3000;
    //this.textTwinkleTimeRange = 4000;
    this.textTwinkleTimeRange = 3000;
    //this.twinkleDelayRange = 1500;
    this.twinkleDelayRange = 1200;
    this.shootingStars = [];
    this.animatedStars = [];
    this.sectionTexts = [];
    this.comets = [];
    this.shootingStarSpawnTime = 8;
    this.shootingStarSpawnChance = 0.8;
    this.starTimer = 0;
    //this.minPolarAngle = 2.15;
    this.minPolarAngle = 2;
    //this.minPolarAngle = 0;
    this.startingPolarAngle = 2.4;
    this.polarAngleCutoff = 0.4;
    this.initialZoom = 1;
    this.initialZoom = 1.3;
    this.maxZoom = 2;
    this.zoomFactor = this.maxZoom - this.initialZoom;
    this.camDist = 5;
    this.erasingSprite = undefined;
    this.sprites = [];
    this.spriteCollision = [];
    this.lines = [];
    this.drawingLine = false;
    this.animations = [];
    this.ready = false;
    this.loadButtonFPS = 2;
    this.loadFrameTime = 1 / this.loadButtonFPS;
    this.loadTimer = 0.5;
    this.currentSection = undefined;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
    this.hasInit = false;
    this._initScene();
    this._update();

  }

  _onResize()
  {
    //change width and height on necessary elements
    let w = Math.round(window.innerWidth);
    let h = Math.round(window.innerHeight);
    this.screenW = w;
    this.screenH = h;
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcess.setSize(w, h);
    this.shootingStars.forEach(currentValue => {
      currentValue._onResize();
    })
    this.sectionTexts.forEach(currentValue => {
      currentValue._onResize();
    })
    console.log("resize");
  }

  _onClick(event)
  {
    if(doneLoading && !this.hasInit)
    {
      this.hasInit = true;
      document.getElementById("view").appendChild(this.renderer.domElement);
      //this._onResize();
    }
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, this.camera);
    const textobjects = this.sectionTexts.map((element) => {
      return element.boundingBox;
    });
    if(this.currentSection != undefined)
    {
      //this.currentSection._nextPage();
      this.currentSection._onPageClick(event, raycaster);
    }
    for(let i = 0; i < this.sectionTexts.length; i++)
    {
      if(raycaster.ray.intersectsBox(textobjects[i]) && this.currentSection == undefined)
      {
        this.sectionTexts[i]._onInitClick(event);
      }
    }

    
     
  }

  _initScene()
  {
    //Init scene, camera, controls, and renderer
    //let w = document.documentElement.clientWidth;
    //let h = document.documentElement.clientHeight;
    let w = Math.round(window.innerWidth);
    let h = Math.round(window.innerHeight);
    this.screenW = w;
    this.screenH = h;
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera( 60, w / h, 0.1, 35000 );
    let renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      alpha: false
    });
    //let renderer = new THREE.WebGPURenderer({"antialias": true, alpha: false});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize( w, h );
    //renderer.toneMapping = THREE.NoToneMapping;
    //document.getElementById("view").appendChild(renderer.domElement);
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = this.minPolarAngle;
    camera.position.set(0.0, 0.0, -this.camDist);
    camera.zoom = this.initialZoom;
    camera.updateProjectionMatrix();

    const amb_light = new THREE.AmbientLight(0x909090);
    //scene.add(amb_light);
    const hemi_light = new THREE.HemisphereLight(0x21266e, 0x080820, 0.2);
    //scene.add(hemi_light);

    
    let sky_group = new THREE.Group();
    let textureLoader = new THREE.TextureLoader(loadingManager);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    rendererO = renderer;
    this.controls = controls;
    this.skyGroup = sky_group;
    this.textureLoader = textureLoader;
    this.clock = new THREE.Clock();
    this.batchSystem = new BatchedRenderer();
    scene.add(this.batchSystem);
    //initialize environment elements
    this._load_skybox();
    scene.add(this.skyGroup);
    this._initPostProcess();
    this._generateStarField();
    this._initText();
    this.shootingStars.push(new ShootingStar(this));
    window.addEventListener("resize", () => this._onResize());
    let touchEvent = 'onclick' in window ? 'click' : 'touchstart';
    window.addEventListener(touchEvent, (event) => this._onClick(event));
    //renderer.domElement.addEventListener('click'. )
    let spherical = new THREE.Spherical(this.camDist, this.startingPolarAngle, Math.PI);
    spherical.makeSafe();
    this.camera.position.setFromSpherical(spherical);
    console.log("init");
  }
  _initPostProcess()
  {
    //initiate post processing effects
    const postProcess = new EffectComposer(this.renderer);
    postProcess.setSize(this.screenW, this.screenH);
    postProcess.addPass(new RenderPass(this.scene, this.camera));
    postProcess.addPass(new EffectPass(this.camera, new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.001, 0.001),
      radialModulation: true,
      modulationOffset: 0
    })));
    postProcess.addPass(new EffectPass(this.camera, new BloomEffect({
      luminanceThreshold: 0.1,
      intensity: 1
    })));
    this.postProcess = postProcess;
  }

  _generateStarField()
  {
    //generate random star positions
    let position = new THREE.BufferAttribute( new Float32Array(this.starAmount*3), 3),
    color = new THREE.BufferAttribute( new Float32Array(this.starAmount*4), 4);
    let v = new THREE.Vector3();
    for( let i=0; i<this.starAmount; i++ )
    {
      v.randomDirection().setLength(this.starMinDist + Math.random() * this.starDistRange);
      position.setXYZ( i, v.x, v.y, v.z );
      color.setXYZW( i, 1, 1, 1, 1);
    }
    let	geo = new THREE.BufferGeometry( );
    geo.setAttribute( 'position', position );
    geo.setAttribute( 'color', color );
    //add texture
    let sprite = this.textureLoader.load(star);
    let material = new THREE.PointsMaterial({
      color: 'white',
      vertexColors: true,
      size: 1,
      sizeAttenuation: true,
      map: sprite,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    let starField = new THREE.Points(geo, material);
    this.scene.add(starField);
    this.starField = starField;
    for( let i=0; i<this.starAmount; i++ )
    {
      this._twinkle(i);
    }
  }

  async _twinkle(idx)
  {
    //have generated stars blink at random intervals and for a random duration
    await (wait(Math.random() * this.twinkleDelayRange));
    const dur = this.minTwinkleTime + Math.random() * this.twinkleTimeRange;
    let v = new THREE.Vector2(1, 0);
    this.twinkleTweens[idx] = new TWEEN
    .Tween(v)
    .to({x: -1}, dur)
    .onUpdate(() => {
      const abs = Math.abs(this.twinkleTweens[idx]._object.x);
      this.starField.geometry.getAttribute('color').setXYZW(idx, 1, 1, 1, abs);
      this.starField.geometry.getAttribute('color').needsUpdate = true;
    })
    .onComplete(() => {
      this._twinkle(idx);
    })
    .start();
  }


  _load_skybox()
  {
    //load skybox textures
    const skyTopBotTex = this.textureLoader.load(skyTopBotTexStr);
    const skySideTex = this.textureLoader.load(skySideTexStr);
    skyTopBotTex.colorSpace = THREE.SRGBColorSpace;
    skySideTex.colorSpace = THREE.SRGBColorSpace;
    //create material for each face of skybox (cylinder)
    const skyTopMat = new THREE.MeshBasicMaterial({ map : skyTopBotTex, side:THREE.BackSide, transparent: true});
    const skySideMat = new THREE.MeshBasicMaterial({ map : skySideTex, side:THREE.BackSide, transparent: true});
    const skyBotMat = skyTopMat.clone();
    const skyMats = [
      skySideMat,
      skyTopMat,
      skyBotMat,
    ];
    //calculate radius based on width (circumference) to height ratio of texture
    const skyCircum2height = 3;
    const skyFactor = skyCircum2height / (2 * Math.PI);
    const skyHeight = 14000;
    const skyGeo = new THREE.CylinderGeometry(skyHeight * skyFactor, skyHeight * skyFactor, skyHeight, 10000);
    const skyCylinder = new THREE.Mesh(skyGeo, skyMats);
    skyCylinder.position.y += 6000;
    skyCylinder.rotateY(Math.PI);
    this.skyGroup.add(skyCylinder);
    
    //similar process for city skyline
    const topTex = this.textureLoader.load(skyTopTex);
    const botTex = this.textureLoader.load(skyBotTex);
    const sideTex = this.textureLoader.load(skySideTex1);
    const sideTex2 = this.textureLoader.load(skySideTex2);
    sideTex.colorSpace = THREE.SRGBColorSpace;
    sideTex2.colorSpace = THREE.SRGBColorSpace;
    const topMat = new THREE.MeshBasicMaterial({
      map: topTex,
      transparent: true,
      side: THREE.BackSide
    });
    const botMat = new THREE.MeshBasicMaterial({
      map: botTex,
      transparent: true,
      side: THREE.BackSide
    });
    const sideMat = new THREE.MeshBasicMaterial({
      map: sideTex,
      transparent: true,
      side: THREE.BackSide
    });
    const sideMat2 = new THREE.MeshBasicMaterial({
      map: sideTex2,
      transparent: true,
      side: THREE.BackSide
    });
    const materials = [
      sideMat,
      topMat,
      botMat
    ];
    const materials2 = [
      sideMat2,
      topMat,
      botMat
    ];
    const circum2height = 4;
    const factor = circum2height / (2 * Math.PI);
    const height = 50;
    //ratio of distance from foreground to background
    const distratio = 200;
    const geo = new THREE.CylinderGeometry(height * factor, height * factor, height, 1000);
    const geo2 = new THREE.CylinderGeometry(height * factor * distratio, height * factor * distratio, height * distratio, 1000);
    const cylinder = new THREE.Mesh(geo, materials);
    const cylinder2 = new THREE.Mesh(geo2, materials2);
    cylinder.renderOrder = 3;
    cylinder2.renderOrder = 2;
    cylinder.position.y += height/6;
    cylinder2.position.y += (height * distratio/6) + 200;

    this.skyGroup.add(cylinder);
    this.skyGroup.add(cylinder2);

  }

  _initText()
  {
    const github = 'https://github.com/TsukiNoLuna';
    const linkedin = 'https://www.linkedin.com/in/luna-gary-09398835a';
    const resume = 'https://drive.google.com/uc?export=download&id=1_ySCw0lObSI0zwVVqhwa3QXlx636hK86';
    this.sectionTexts.push(new SectionText(this, 'Luna Gary', new THREE.Vector3(0, 600, 500)));
    this.sectionTexts.push(new SectionText(this, 'About Me', new THREE.Vector3(800, 600, 500)));
    this.sectionTexts.push(new SectionText(this, 'Projects', new THREE.Vector3(500, 500, -500)));
    this.sectionTexts.push(new LinkText(this, 'Github', new THREE.Vector3(0, 900, 1500), github, githubImg, -Math.PI/3));
    this.sectionTexts.push(new LinkText(this, 'LinkedIn', new THREE.Vector3(0, 1200, 1000), linkedin, linkedInImg, Math.PI));
    this.sectionTexts.push(new LinkText(this, 'Resume', new THREE.Vector3(0, 300, 1000), resume, undefined, Math.PI + 1));
    this.sectionTexts.push(new LinkText(this, 'Luna', new THREE.Vector3(0, 2500, 1000), '', lunaImg));
    
  }


  _textFX()
  {

  }


  _update() {
    requestAnimationFrame(this._update.bind(this));
    if(this.controls.enabled)
    {
      this.controls.update();
    }
    const delta = this.clock.getDelta();
    this.starTimer += delta;
    TWEEN.update();
    this.batchSystem.update(this.clock.getDelta());
    //chance to spawn shooting stars at interval
    if(this.starTimer >= this.shootingStarSpawnTime)
    {
      this.starTimer = 0;
      if(Math.random() <= this.shootingStarSpawnChance) this.shootingStars.push(new ShootingStar(this));
    }
    //update objects
    this.shootingStars.forEach(currentValue => {
      currentValue._update(delta);
    })
    
    if(this.hasInit)
    {
      this.sectionTexts.forEach(currentValue => {
        currentValue._onUpdate();
      })
    }

    this.postProcess.render();
    //this.renderer.render(this.scene, this.camera);
    //console.log(this.camera.position);
  }

}







new Main()