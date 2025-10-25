import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import { PageText } from './PageText';
import star from '../images/sp2.png';
import fileUrl from '../Text/AboutMe.txt'


function wait(milliseconds) {
  //simple sleep function
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export class SectionText
{
    constructor(main, text, pos)
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
        this.onScreenAngle = Math.PI/4;
        this.clicked = false;
        const up = new THREE.Vector3(0, 1, 0);
        //this.pos.applyAxisAngle(up, angle);
        this.abortController = new AbortController();
        this.main = main;
        this.illuminated = false;
        this._sample_coordinates();
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
        textGeo.computeBoundingBox();
        let sprite = new THREE.TextureLoader().load(star);
        let material = new THREE.PointsMaterial({
                color: 'white',
                vertexColors: true,
                size: 12,
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
            //this.offset = new THREE.Vector3(-this.pos.x, this.pos.y, this.pos.z);
            this.offset = new THREE.Vector3(-(this.textCanvas.width/2 + this.pos.x), this.textCanvas.height/2 + this.pos.y, this.pos.z);
            
        }
        else{
            //this.offset = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
            this.offset = new THREE.Vector3(this.textCanvas.width/2 + this.pos.x, this.textCanvas.height/2 + this.pos.y, this.pos.z);
        }
        this.textCloud.position.copy(this.offset);

        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
        this.center = new THREE.Vector3();
        this.boundingBox.getCenter(this.center);
        const boxMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const boxGeo = new THREE.BoxGeometry(50, 50, 50);
        const cube = new THREE.Mesh(boxGeo, boxMat);
        //cube.position.copy(this.offset);
        cube.position.copy(this.center);
        //this.scene.add(cube);
        cube.lookAt(this.camera.position);
        //console.log(this.cube.rotation);
        this.textCloud.rotation.x = cube.rotation.x;
        this.textCloud.rotation.z = cube.rotation.z;
        this.textCloud.rotation.y = cube.rotation.y;
        let v = new THREE.Vector3(1, 0, 0);
        this.textCloud.rotateOnAxis(v, Math.PI);
        this.textCloud.updateMatrixWorld();
        this.boundingBox.setFromObject(this.textCloud);
        this.boundingBox.getCenter(this.center);
        cube.position.copy(this.textCloud.position);

        //this.textCloud.rotateY(Math.PI);


        this.scene.add(this.textCloud);
        for(let i = 0; i < len; i++)
        {   
            this._textTwinkle(i);
        }
        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
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
            if(w.angleTo(v) < this.onScreenAngle)
            {
                //console.log("on screen");
                if(!this.onScreen)
                {
                    for(let i = 0; i < this.textLen; i++)
                    {
                    this._startTween(i, this.abortController.signal);
                    }
                    this.onScreen = true;
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
    _onClick(event)
    {
        if(!this.illuminated || this.clicked)
        {
            return;
        }
        this.clicked = true;
        this.illuminated = false;
        this.main.controls.enabled = false;
        let v = new THREE.Vector3();
        this.camera.getWorldDirection(v);
        v.add(this.camera.position);
        let w = new THREE.Vector3();
        this.boundingBox.getCenter(w);
        //this.camPrevVector = v.clone();
        //this.camDirVector = w.clone().sub(v);
        const tempCamera = new THREE.PerspectiveCamera();
        tempCamera.position.copy(this.camera.position);
        tempCamera.lookAt(w);
        this.targetQuat = tempCamera.quaternion.clone();
        this.origQuat = this.camera.quaternion.clone();
        let z = new THREE.Vector3(0, 0, 0);
        this.cameraTween = new TWEEN.Tween(z)
        .to({x: 1}, 1500)
        .onUpdate(() => {
         //this.camera.lookAt(this.camPrevVector.clone().add(this.camDirVector.clone().multiplyScalar(this.cameraTween._object.x)));
         this.camera.quaternion.copy(this.origQuat);
         this.camera.quaternion.slerp(this.targetQuat, this.cameraTween._object.x);
         this.camera.zoom = 1 + this.cameraTween._object.x;
         this.camera.updateProjectionMatrix();
        })
        .onComplete(() => {
         this.scene.remove(this.textCloud);
         //new PageText(this.main, 'prob not gonna work wait were so close omg this needs to be wrapped indefinitely because hey thats how it is you know anyways how is your day?', new THREE.Vector2(-0.8, 0.8), new THREE.Vector2(0.8, -0.8), this.textCloud.rotation);
         new PageText(this.main, fileUrl, new THREE.Vector2(-0.8, 0.8), new THREE.Vector2(0.8, -0.8), this.textCloud.rotation);
         this.cameraTween = null;
        })
        .start();
    }
}