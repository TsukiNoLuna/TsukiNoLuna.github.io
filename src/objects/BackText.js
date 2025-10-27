import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import star from '../images/sp2.png';
import { clamp } from 'three/src/math/MathUtils.js';

export class BackText
{
    constructor(main, rot)
    {
        this.main = main;
        this.camera = main.camera;
        this.scene = main.scene;
        this.boundingBox = new THREE.Box3();
        this.center = new THREE.Vector3();
        this.textString = '';
        this.fontName = 'Courier New';
        this.fontSize = 60;
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.style.textAlign = 'center';
        this.textCtx = this.textCanvas.getContext('2d', { willReadFrequently: true });
        this._setScreenPos();
        this.rot = rot;
        this.textString = 'Back';
        this._splitWords();
        this._generateText();
    }

    _setScreenPos()
    {
        const depth = 0.9999;
        this.tL = new THREE.Vector3(-0.9, 0.9, depth);
        this.bR = new THREE.Vector3(-0.8, 0.8, depth);
        this.tL.unproject(this.camera);
        this.bR.unproject(this.camera);
        let right = new THREE.Vector3(1, 0, 0);
        let up = new THREE.Vector3(0, 1, 0);
        right.applyQuaternion(this.camera.quaternion);
        up.applyQuaternion(this.camera.quaternion);
        let dist = this.bR.clone();
        dist.sub(this.tL);
        this.W = Math.abs(dist.dot(right));
        this.H = Math.abs(dist.dot(up));
    }
    _splitWords()
    {
        const len = this.textString.length;
        this.words = this.textString.split(' ');
        this.textCanvas.width = this.W;
        this.textCanvas.height = this.H;
        this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
        this.textCtx.fillStyle = '#2a9d8f';
        let metrics = this.textCtx.measureText(this.textString);
        this.lim = this.W / metrics.width;
        let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        height *= 2;
        while((metrics.width > this.W || height > this.H) && this.fontSize != 1)
        {
            this.fontSize -= 1;
            this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
            metrics = this.textCtx.measureText(this.textString);
            height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            height *= 2;
            this.lim = this.W / metrics.width;
        }
        this.textCtx.fillText(this.textString, 0, .8 * height, this.W);
        this._sample_coordinates();
    }
    _sample_coordinates()
    {
        this.textPoints = [];
        const samplingStep = 2;
        if (this.W > 0) {
            const imageData = this.textCtx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
            for (let i = 0; i < this.textCanvas.height; i += samplingStep) {
                for (let j = 0; j < this.textCanvas.width; j += samplingStep) {
                    // Checking if R-channel is not zero since the background RGBA is (0,0,0,0)
                    if (imageData.data[(j + i * this.textCanvas.width) * 4] > 0) {
                        this.textPoints.push(new THREE.Vector3(j, i, 0));
                    }
                }
            }
        }
    }

    _generateText()
    {
        const len = this.textPoints.length;
        this.textTwinkleTweens = Array(len).fill(undefined);
        this.textTwinkleTweensDur = Array(len).fill(undefined);
        let position = new THREE.BufferAttribute( new Float32Array(len*3), 3),
        color = new THREE.BufferAttribute( new Float32Array(len*4), 4);
        for(let i = 0; i < len; i++)
        {
            position.setXYZ( i, this.textPoints[i].x, this.textPoints[i].y, this.textPoints[i].z );
            color.setXYZW( i, 1, 1, 1, 0);
        }
        let textGeo = new THREE.BufferGeometry();
        textGeo.setAttribute('position', position);
        textGeo.setAttribute('color', color);
        textGeo.computeBoundingBox();
        let sprite = this.main.textureLoader.load(star);
        let material = new THREE.PointsMaterial({
                color: 'white',
                vertexColors: true,
                size: 30,
                sizeAttenuation: true,
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
        this.pos = new THREE.Vector3(this.tL.x, this.tL.y, 0.5);
        this.pos.unproject(this.camera);
        this.textCloud.rotateZ(Math.PI);
        if(this.tL.z < 0)
        {
            this.textCloud.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
            this.offset = new THREE.Vector3(-(this.textCanvas.width/2 + this.tL.x), this.textCanvas.height/2 + this.tL.y, this.tL.z);
            
        }
        else{
            this.offset = new THREE.Vector3(this.textCanvas.width/2 + this.tL.x, this.textCanvas.height/2 + this.tL.y, this.tL.z);
        }
        this.textCloud.position.copy(this.tL);

        this.textCloud.rotation.x = this.rot.x;
        this.textCloud.rotation.z = this.rot.z;
        this.textCloud.rotation.y = this.rot.y;
        this.textCloud.updateMatrixWorld();
        this.boundingBox.setFromObject(this.textCloud);
        this.boundingBox.getCenter(this.center);
        this.boundingBox.expandByScalar(0.5);
        //this.scene.add(this.textCloud);
        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
        this.textLen = len;
    }
    _onResize()
    {
        this._setScreenPos();
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        this._splitWords();
        const len = this.textPoints.length;
        for(let i = 0; i < len; i++)
        {
            this.textCloud.geometry.getAttribute('position').setXYZ( i, this.textPoints[i].x, this.textPoints[i].y, this.textPoints[i].z );
        }
        this.textCloud.geometry.getAttribute('position').needsUpdate = true;
        this._positionText(len);


    }


    _tweenIn()
    {
        this.scene.add(this.textCloud);
        this._onResize();
        let z = new THREE.Vector3(0, 0, 0);
        this.fadeInTween = new TWEEN.Tween(z)
        .to({x: 1}, 3000)
        .onUpdate(() => {
            for(let i = 0; i < this.textLen; i++)
            {
                this.textCloud.geometry.getAttribute('color').setXYZW(i, 1, 1, 1, this.fadeInTween._object.x);
            }
            this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        })
        .onComplete(() =>
        {
            this.fadeInTween = null;
        })
        .start();
    }

    _tweenOut()
    {
        let z = new THREE.Vector3(1, 0, 0);
        this.fadeOutTween = new TWEEN.Tween(z)
        .to({x: 0}, 1000)
        .onUpdate(() => {
            for(let i = 0; i < this.textLen; i++)
            {
                this.textCloud.geometry.getAttribute('color').setXYZW(i, 1, 1, 1, this.fadeOutTween._object.x);
            }
            this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        })
        .onComplete(() =>
        {
            this.scene.remove(this.textCloud);
            this.fadeOutTween = null;
        })
        .start();
    }


    _remove()
    {
        this.scene.remove(this.textCloud);
        this.textCloud.geometry.dispose();
        this.textCloud.material.dispose();
    }

}