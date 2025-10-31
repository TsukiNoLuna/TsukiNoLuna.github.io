import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import { PageText } from './PageText';
import star from '../images/sp2.png';
import aboutMe from '../Text/AboutMe.txt';
import aboutMeTest from '../Text/AboutMeTest.txt';
import lunaGary from '../Text/LunaGary.txt';
import gameDev from '../Text/GameDev.txt';
import gameDevImg from '../Text/GameDev.png';
import aWU6S from '../Text/AWU6S.txt';
import aWU6SImg from '../Text/AWU6S.png';
import numbra from '../Text/Numbra.txt';
import numbraImg from '../Text/Numbra.png';
import { BackText } from './BackText';
import { NextText } from './NextText';
import { PrevText } from './PrevText';


const gameDevLink = 'https://tsuki376.itch.io/whats-wrong-with-me';
const numbraLink = 'https://artemisiaexists.itch.io/numbra';
const aWU6SLink = 'https://magicalmirai.com/2025/procon/entry.html#entry_no10';
const Sections = {
  "Luna Gary": [[lunaGary, undefined]],
  "About Me": [[aboutMe, undefined]],
  "Projects": [[gameDev, gameDevImg, gameDevLink], [aWU6S, aWU6SImg, aWU6SLink], [numbra, numbraImg, numbraLink]]
};

function wait(milliseconds) {
  //simple sleep function
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export class SectionText
{
    constructor(main, text, pos, angle = 0)
    {
        this.textString = text;
        this.fontName = 'Courier New';
        this.fontSize = 100;
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.style.textAlign = 'center';
        this.textCtx = this.textCanvas.getContext('2d');
        this.offset = new THREE.Vector3;
        this.scene = main.scene;
        this.camera = main.camera;
        this.pos = pos;
        const up = new THREE.Vector3(0, 1, 0);
        this.pos.applyAxisAngle(up, angle);
        //this.onScreenAngle = Math.PI/4;
        this.onScreenAngle = Math.PI/8;
        this.clicked = false;
        this.loaded = true;
        this.abortController = new AbortController();
        this.main = main;
        this.illuminated = false;
        this.zoomInTime = 1200;
        this.pageTexts = [];
        this.ind = 0;
        this._sample_coordinates();
        Sections[text].forEach(currentValue =>
        {
            this.pageTexts.push(new PageText(this.main, currentValue[0], this.textCloud.rotation, currentValue[1]));
        }
        );
        this.hasMultiple = false;
        if(this.pageTexts.length > 1)
        {
            this.nextButton = new NextText(this.main, this.textCloud.rotation);
            this.prevButton = new PrevText(this.main, this.textCloud.rotation);
            this.hasMultiple = true;
        }
        this.backButton = new BackText(this.main, this.textCloud.rotation);
        
    }
    _sample_coordinates()
    {
        const lines = this.textString.split(`\n`);
        const linesMaxLength = [...lines].sort((a, b) => b.length - a.length)[0].length;
        const wTexture = this.fontSize * .7 * linesMaxLength;
        const hTexture = lines.length * this.fontSize;
        const linesNumber = lines.length;
        this.textCanvas.width = wTexture;
        this.textCanvas.height = hTexture;
        this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
        this.textCtx.fillStyle = '#2a9d8f';
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        for (let i = 0; i < linesNumber; i++) {
            //this.textCtx.fillText(lines[i], 0, (i + .8) * hTexture / linesNumber);
            this.textCtx.fillText(lines[i], 0, (i + .8) * hTexture / linesNumber, wTexture);
        }
        let textPoints = [];
        const samplingStep = 4;
        if (wTexture > 0) {
            const imageData = this.textCtx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
            for (let i = 0; i < this.textCanvas.height; i += samplingStep) {
                for (let j = 0; j < this.textCanvas.width; j += samplingStep) {
                    // Checking if R-channel is not zero since the background RGBA is (0,0,0,0)
                    if (imageData.data[(j + i * this.textCanvas.width) * 4] > 0) {
                        //this.textureCoordinates.push({x: j, y: i})
                        textPoints.push(new THREE.Vector3(j, i, 0));
                    }
                }
            }
        }
        this._generateText(textPoints);
    }

    _generateText(textPoints)
    {
        const len = textPoints.length;
        this.textTwinkleTweens = Array(len).fill(undefined);
        this.textTwinkleTweensDur = Array(len).fill(undefined);
        let position = new THREE.BufferAttribute( new Float32Array(len*3), 3),
        color = new THREE.BufferAttribute( new Float32Array(len*4), 4);
        for(let i = 0; i < len; i++)
        {
            position.setXYZ( i, textPoints[i].x, textPoints[i].y, textPoints[i].z );
            color.setXYZW( i, 1, 1, 1, 0);
        }
        let textGeo = new THREE.BufferGeometry();
        textGeo.setAttribute('position', position);
        textGeo.setAttribute('color', color);
        textGeo.center();
        textGeo.computeBoundingBox();
        let sprite = this.main.textureLoader.load(star);
        let Size = 12 * (2-this.main.zoomFactor);
        let material = new THREE.PointsMaterial({
                color: 'white',
                vertexColors: true,
                size: Size,
                sizeAttenuation: false,
                map: sprite,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
        this.textCloud = new THREE.Points(textGeo, material);
        this._positionText(len);
    }

    _positionText(len)
    {
        this.textCloud.rotateZ(Math.PI);
        if(this.pos.z < 0)
        {
            this.textCloud.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
            this.offset = new THREE.Vector3(-this.pos.x, this.pos.y, this.pos.z);
            
        }
        else{
            this.offset = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
        }
        this.textCloud.position.copy(this.offset);

        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
        this.center = new THREE.Vector3();
        this.boundingBox.getCenter(this.center);
        const boxMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const boxGeo = new THREE.BoxGeometry(10, 10, 10);
        const cube = new THREE.Mesh(boxGeo, boxMat);
        cube.position.copy(this.textCloud.position);
        cube.lookAt(this.camera.position);
        //this.scene.add(cube);
        this.textCloud.setRotationFromQuaternion(cube.quaternion);
        this.textCloud.rotateX(Math.PI);
        this.textCloud.updateMatrixWorld();
        this.boundingBox.setFromObject(this.textCloud);
        this.boundingBox.getCenter(this.center);
        this.cube = cube;
        this.tempCamera = new THREE.PerspectiveCamera();
        this.tempCamera.position.copy(this.camera.position);
        this.tempCamera.lookAt(this.center);
        this.scene.add(this.textCloud);
        for(let i = 0; i < len; i++)
        {   
            this._textTwinkle(i);
        }
        this.onScreen = false;
        this.textReady = true;
        this.textLen = len;
    }

    _textTwinkle(idx)
    {
        if(this.textCloud.geometry.getAttribute('color')[idx * 3 + 2] > 0) return;
        const dur = this.main.textMinTwinkleTime + Math.random() * this.main.textTwinkleTimeRange;
        this.textTwinkleTweensDur[idx] = dur;
        let v = new THREE.Vector2(0, 0);
        this.textTwinkleTweens[idx] = new TWEEN
        .Tween(v)
        .to({x: dur}, dur)
        .onUpdate(() => {
        const abs = this.textTwinkleTweens[idx]._object.x/this.textTwinkleTweensDur[idx];
        this.textCloud.geometry.getAttribute('color').setXYZW(idx, 1, 1, 1, abs);
        this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        })
        //await (wait(Math.random() * this.twinkleDelayRange));
        //this.textTwinkleTweens[idx].start();
    }

    _reverseTween(idx)
    {
        this.illuminated = false;
        this.textTwinkleTweens[idx].stop();
        const start = this.textTwinkleTweens[idx]._object.x;
        //const end = this.textTwinkleTweens[idx]._valuesEnd.x;
        let v = new THREE.Vector3(start, 0);
        this.textTwinkleTweens[idx] = new TWEEN
        .Tween(v)
        .to({x: 0}, start)
        .onUpdate(() => {
        const abs = this.textTwinkleTweens[idx]._object.x/this.textTwinkleTweensDur[idx];
        this.textCloud.geometry.getAttribute('color').setXYZW(idx, 1, 1, 1, abs);
        this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        if(abs < 0.8 && this.illuminated)
        {
            this.illuminated = false;
        }
        })
        .start();
    }

    async _startTween(idx, signal)
    {
        this.textTwinkleTweens[idx].stop();
        await (wait(Math.random() * this.main.twinkleDelayRange));
        if(signal.aborted)
        {
        return;
        }
        const start = this.textTwinkleTweens[idx]._object.x;
        const end = this.textTwinkleTweensDur[idx];
        let v = new THREE.Vector3(start, 0);
        this.textTwinkleTweens[idx] = new TWEEN
        .Tween(v)
        .to({x: end}, end-start)
        .onUpdate(() => {
        const abs = this.textTwinkleTweens[idx]._object.x/this.textTwinkleTweensDur[idx];
        this.textCloud.geometry.getAttribute('color').setXYZW(idx, 1, 1, 1, abs);
        this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        if(abs >= 0.8 && !this.illuminated)
        {
            this.illuminated = true;
        }
        })
        .start();
    }
    _onUpdate(delta)
    {
        //console.log(this.textCloud.position.clone().project(this.camera));
        let v = new THREE.Vector3();
        let w = new THREE.Vector3();
        //this.boundingBox.getCenter(v);
        //v.copy(this.textCloud.position);
        v.copy(this.center);
        this.camera.getWorldDirection(w);
        w.normalize();
        //if(!this.clicked)
        //{
            if(this.onScreen && (this.main.currentSection != undefined && this.main.currentSection != this))
            {
                this.onScreen = false;
                this.abortController.abort();
                this.abortController = new AbortController();
                for(let i = 0; i < this.textLen; i++)
                {
                    this._reverseTween(i);
                }
            }
            if(w.angleTo(v) < this.onScreenAngle)
            {
                //console.log("on screen");
                if(!this.onScreen)
                {
                    if(this.main.currentSection == undefined || this.main.currentSection == this)
                    {
                        for(let i = 0; i < this.textLen; i++)
                        {
                            this._startTween(i, this.abortController.signal);
                        }
                        this.onScreen = true;
                    }
                }
            }
            else if(this.onScreen)
            {
                this.onScreen = false;
                this.abortController.abort();
                this.abortController = new AbortController();
                for(let i = 0; i < this.textLen; i++)
                {
                    this._reverseTween(i);
                }
            }
        //}
        let z = new THREE.Vector3();
        this.camera.getWorldDirection(z);
        //console.log(z);
    }
    _onInitClick(event)
    {
        if(!this.illuminated || this.clicked || !this.loaded)
        {
            return;
        }
        this.main.currentSection = this;
        this.clicked = true;
        this.loaded = false;
        this.illuminated = false;
        this.main.controls.enabled = false;
        let v = new THREE.Vector3();
        this.camera.getWorldDirection(v);
        v.add(this.camera.position);
        let w = new THREE.Vector3();
        this.boundingBox.getCenter(w);
        //this.camPrevVector = v.clone();
        //this.camDirVector = w.clone().sub(v);
        //const tempCamera = new THREE.PerspectiveCamera();
        //tempCamera.position.copy(this.camera.position);
        this.targetQuat = this.tempCamera.quaternion.clone();
        this.origQuat = this.camera.quaternion.clone();
        let z = new THREE.Vector3(0, 0, 0);
        this.cameraTween = new TWEEN.Tween(z)
        .to({x: 1}, this.zoomInTime)
        .onUpdate(() => {
         //this.camera.lookAt(this.camPrevVector.clone().add(this.camDirVector.clone().multiplyScalar(this.cameraTween._object.x)));
         this.camera.quaternion.copy(this.origQuat);
         this.camera.quaternion.slerp(this.targetQuat, this.cameraTween._object.x);
         this.camera.zoom = this.main.initialZoom + (this.cameraTween._object.x * this.main.zoomFactor);
         this.textCloud.material.opacity = 1 - this.cameraTween._object.x; 
         this.camera.updateProjectionMatrix();
        })
        .onComplete(() => {
         this.pageTexts[this.ind]._tweenIn();
         this.backButton._tweenIn();
         if(this.hasMultiple)
         {
            this.nextButton._tweenIn();
            this.prevButton._tweenIn();
         }
         this.cameraTween = null;
        })
        .start();
    }

    _onPageClick(event, raycaster)
    {
        if(!this.loaded)
        {
            return;
        }
        if(raycaster.ray.intersectsBox(this.backButton.boundingBox))
        {
            this._zoomOut();
            return;
        }
        if(this.hasMultiple)
        {
            if(raycaster.ray.intersectsBox(this.nextButton.boundingBox))
            {
                this._nextPage();
                return;
            }
            if(raycaster.ray.intersectsBox(this.prevButton.boundingBox))
            {
                this._prevPage();
                return;
            }
        }
        if(this.pageTexts[this.ind].hasImage)
        {
            if(raycaster.ray.intersectsBox(this.pageTexts[this.ind].planeBB))
            {
                //console.log('here');
                //console.log(Sections[this.textString][this.ind][2]);
                window.open(Sections[this.textString][this.ind][2], '_blank');
            }
        }
    }
    _zoomOut()
    {
        this.loaded = false;

        this.pageTexts[this.ind]._tweenOut();
        this.backButton._tweenOut();
        if(this.hasMultiple)
        {
            this.nextButton._tweenOut();
            this.prevButton._tweenOut();
        }
        let z = new THREE.Vector3(1, 0, 0);
        this.cameraTween = new TWEEN.Tween(z)
        .to({x: 0}, this.zoomInTime)
        .onUpdate(() => {
         this.camera.zoom = this.main.initialZoom + (this.cameraTween._object.x * this.main.zoomFactor);
         this.textCloud.material.opacity = 1 - this.cameraTween._object.x; 
         this.camera.updateProjectionMatrix();
        })
        .onComplete(() => {
         this.clicked = false;
         this.illuminated = true;
         this.cameraTween = null;
         this.main.controls.enabled = true;
         this.main.currentSection = undefined;
         this.loaded = true;
        })
        .start();
    }

    _nextPage()
    {
        this.loaded = false;
        this.nextButton._twinkle();
        if(this.pageTexts.length == 1)
        {
            return;
        }
        this.pageTexts[this.ind]._tweenOut();
        this.ind++;
        this.ind %= this.pageTexts.length;
        this.pageTexts[this.ind]._tweenIn();
    }
    _prevPage()
    {
        this.loaded = false;
        this.prevButton._twinkle();
        if(this.pageTexts.length == 1)
        {
            return;
        }
        this.pageTexts[this.ind]._tweenOut();
        this.ind--;
        if(this.ind < 0)
        {
            this.ind = this.pageTexts.length - 1;
        }
        this.pageTexts[this.ind]._tweenIn();
    }
    _onResize()
    {
        this.pageTexts.forEach(currentValue =>
        {
            currentValue._onResize();
        })
        this.backButton._onResize();
        if(this.hasMultiple)
        {
            this.nextButton._onResize();
            this.prevButton._onResize();
        }
    }
}