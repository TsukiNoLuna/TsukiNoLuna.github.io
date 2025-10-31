import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import { PageText } from './PageText';
import star from '../images/sp2.png';

function wait(milliseconds) {
  //simple sleep function
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}
export class LinkText
{
    constructor(main, text, pos, link, image = undefined, angle = 0)
    {
        this.textString = text;
        this.link = link;
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
        this.onScreenAngle = Math.PI/4;
        this.clicked = false;
        this.loaded = true;
        this.abortController = new AbortController();
        this.main = main;
        this.illuminated = false;
        this.pageTexts = [];
        this.ind = 0;
        this.ready = false;
        if(image != undefined)
        {
            this.image = new Image();
            this.image.src = image;
            this.hasImage = true;
        }
        else{
            this.hasImage = false;
        }
        if(this.hasImage)
        {
            //this._sample_coordinatesImage();
            this.image.onload = () =>
            {
                this._sample_coordinatesImage();
            };
        }
        else{
            this._sample_coordinates();
        }
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

    _sample_coordinatesImage()
    {
        this.textCanvas.width = 200;
        this.textCanvas.height = 200;
        this.textCtx.drawImage(this.image, 0, 0, this.textCanvas.width, this.textCanvas.height);
        let textPoints = [];
        const samplingStep = 8;
        if (this.textCanvas.width > 0) {
            const imageData = this.textCtx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
            const pixels = imageData.data;
            for (let i = 0; i < pixels.length; i += 4) {
                const lightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; // Average method
                pixels[i] = lightness;     // Red
                pixels[i + 1] = lightness; // Green
                pixels[i + 2] = lightness; // Blue
            }
            this.textCtx.putImageData(imageData, 0, 0);
            for (let i = 0; i < this.textCanvas.height; i += samplingStep) {
                for (let j = 0; j < this.textCanvas.width; j += samplingStep) {
                    // Checking if R-channel is not zero since the background RGBA is (0,0,0,0)
                    if (imageData.data[(j + i * this.textCanvas.width) * 4] > 230) {
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
        let Size = 12 * (2-this.main.zoomFactor);
        let material = new THREE.PointsMaterial({
                color: 'white',
                vertexColors: true,
                size: Size,
                sizeAttenuation: false,
                map: this.main.starTexture,
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
        this.ready = true;
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
        if(this.ready)
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
                    if(this.link.length == 0 || this.main.currentSection == undefined || this.main.currentSection == this)
                    {
                        for(let i = 0; i < this.textLen; i++)
                        {
                            this._startTween(i, this.abortController.signal);
                        }
                        this.onScreen = true;
                    }
                }
            }
            else if(this.onScreen && this.link.length != 0)
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
    }
    _onInitClick(event)
    {
        if(!this.illuminated || this.clicked || !this.loaded)
        {
            return;
        }
        if(this.link.length != 0)
        {
            window.open(this.link, '_blank');
        }

    }
    _onResize()
    {
    }
}