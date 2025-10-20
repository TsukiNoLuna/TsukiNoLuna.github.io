import * as THREE from 'three';
import { Vector2 } from 'three.quarks';

const up = new THREE.Vector3(0, 1, 0);
const vocaloidAxis = {
  "Miku": [-1.0352, 3.5, Math.PI/5],
  "Luka": [2.4252, 3.5, Math.PI/5],
  "Rin": [1.1045, 10, Math.PI/5.5],
  "Len": [0.4072, 5, Math.PI/4.5],
  "Kagamine": [0.2878, 4, Math.PI/5],
  "Meiko": [-2.4013, 4, Math.PI/4],
  "Kaito": [1.6729, 4, Math.PI/5]
}

function getAnimationFrames(vocaloid: string, numFrames: number) {
  const fileType = ".png";
  const path = './animation/' + vocaloid + '/' + vocaloid.toUpperCase() + '_000';
  const frames: string[] = [];
  for(let i = 1; i <= numFrames; i++)
  {
    frames.push(`${i}`);
  }
  const frameStrings = frames.map(frame => {
      //return path + "_" + frame + fileType;
      return path + frame + fileType;
  });
  const loader = new THREE.TextureLoader();
  const textures = frameStrings.map(frameString => {
    return loader.load(frameString);
  });
  textures.forEach(element => {
    element.colorSpace = THREE.SRGBColorSpace;
  });
  return textures;
}

function getStarAnimationFrames(vocaloid: string, numFrames: number) {
  const fileType = ".png";
  const path = './animation/' + vocaloid + 'Star' + '/';
  const frames: string[] = [];
  for(let i = 1; i <= numFrames; i++)
  {
    frames.push(`${i}`);
  }
  const frameStrings = frames.map(frame => {
      //return path + "_" + frame + fileType;
      return path + frame + fileType;
  });
  const loader = new THREE.TextureLoader();
  const textures = frameStrings.map(frameString => {
    return loader.load(frameString);
  });
  textures.forEach(element => {
    element.colorSpace = THREE.SRGBColorSpace;
  });
  return textures;
}

export class AnimatedMesh {
    private map: THREE.Texture;
    private cylinder: THREE.Mesh;
    private textures: THREE.Texture[];
    private materials: THREE.MeshBasicMaterial[];
    private textureLoader: THREE.TextureLoader;
    private frameIndex = 0;
    private frameTime = 0;
    private timer = 0;
    constructor(vocaloid: string, height: number, numFrames: number, FPS: number, scene: THREE.Scene)
    {
        this.textureLoader = new THREE.TextureLoader();
        this.textures = getAnimationFrames(vocaloid, numFrames);
        this.map = this.textures[this.frameIndex];
        const topTex = this.textureLoader.load('./images/nothingness.png');
        const botTex = this.textureLoader.load('./images/nothingness.png');
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
        const material = new THREE.MeshBasicMaterial({ 
            map: this.map,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false
        });
        this.materials = [
            material,
            topMat,
            botMat
        ];
        const circum2height = 3;
        const factor = circum2height / (2 * Math.PI);
        const geo = new THREE.CylinderGeometry(height * factor, height * factor, height, 1000);
        this.cylinder = new THREE.Mesh(geo, this.materials);
        this.cylinder.renderOrder = 2;
        this.cylinder.position.y += height/vocaloidAxis[vocaloid][1];
        this.frameTime = 1 / FPS;
        const axis = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        axis.applyAxisAngle(up, vocaloidAxis[vocaloid][0]);
        this.cylinder.rotateOnAxis(axis, vocaloidAxis[vocaloid][2]);
        if(vocaloid == "Kaito")
        {
            const forw = new THREE.Vector3(0, 0, 1);
            forw.applyAxisAngle(up, vocaloidAxis[vocaloid][0]);
            this.cylinder.rotateOnAxis(up, -Math.PI/12);
            //this.cylinder.rotateOnAxis(forw, Math.PI/12)
        }
        scene.add(this.cylinder);
    }
    public setPosition (x: number, y: number, z: number) {
        this.cylinder.position.x = x;
        this.cylinder.position.y = y;
        this.cylinder.position.z = z;
    }
    public getPosition (): THREE.Vector3 {
        return this.cylinder.position;
    }
    public setScale (x: number, y: number, z: number) {
        this.cylinder.scale.x = x;
        this.cylinder.scale.y = y;
        this.cylinder.scale.z = z;
    }
    public getScale (): THREE.Vector3
    {
        return this.cylinder.scale;
    }
    public update(deltaTime: number) {
        this.timer += deltaTime;
        if(this.frameTime > 0 && this.timer >= this.frameTime)
        {
            this.timer = 0;
            this.frameIndex++;
            this.frameIndex %= this.textures.length;
            this.map = this.textures[this.frameIndex];
            this.cylinder.material[0].map = this.map;
            this.cylinder.material[0].needsUpdate = true;
        }
    }

}

export class AnimatedStarMesh
{
    private map: THREE.Texture;
    private plane: THREE.Mesh;
    private textures: THREE.Texture[];
    private material: THREE.MeshBasicMaterial;
    private textureLoader: THREE.TextureLoader;
    private main;
    private scene: THREE.Scene;
    private frameIndex = 0;
    private frameTime = 0;
    private timer = 0;
    private timer2 = 0;
    private dist = 70;
    private overallTime = 30;
    private vertRot = 0;
    private horzRot = 0;
    private speed = Math.PI/12;
    constructor(vocaloid: string, height: number, numFrames: number, FPS: number, main)
    {
        this.main = main;
        this.textureLoader = new THREE.TextureLoader();
        this.textures = getStarAnimationFrames(vocaloid, numFrames);
        this.map = this.textures[this.frameIndex];
        this.material = new THREE.MeshBasicMaterial({ 
            map: this.map,
            transparent: true,
            depthWrite: false
        });
        const geo = new THREE.PlaneGeometry(height, height);
        this.plane = new THREE.Mesh(geo, this.material);
        this.plane.renderOrder = 2;
        const start = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        this.vertRot = Math.PI/3 + Math.random() * Math.PI/12;
        this.horzRot = Math.random() * Math.PI * 2;
        start.applyAxisAngle(up, this.horzRot);
        start.applyAxisAngle(right, this.vertRot);
        start.setLength(this.dist);
        this.plane.position.set(start.x, start.y, start.z);
        
        
        this.frameTime = 1 / FPS;
        this.plane.lookAt(0, 0, -0.1);
        this.main.scene.add(this.plane);
    }
    public update(deltaTime: number) {
        this.timer += deltaTime;
        this.timer2+= deltaTime;
        if(this.frameTime > 0 && this.timer >= this.frameTime)
        {
            this.timer = 0;
            this.frameIndex++;
            this.frameIndex %= this.textures.length;
            this.map = this.textures[this.frameIndex];
            this.plane.material[0].map = this.map;
            this.plane.material[0].needsUpdate = true;
        }
        if(this.timer2 >= this.overallTime)
        {
            this.scene.remove(this.plane);
            this.plane.material[0].dispose();
            this.plane.geometry[0].dispose();
            this.main.animatedStars.filter(item => item !== this);
        }
        this.horzRot += this.speed * deltaTime;
        const start = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        start.applyAxisAngle(up, this.horzRot);
        start.applyAxisAngle(right, this.vertRot);
        start.setLength(this.dist);
        this.plane.position.set(start.x, start.y, start.z);
        this.plane.lookAt(0, 0, -0.1);

    }
}