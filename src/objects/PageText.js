import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import star from '../images/sp2.png';
import { clamp } from 'three/src/math/MathUtils.js';


export class PageText
{
    constructor(main, textFile, rot, image = undefined)
    {
        this.main = main;
        this.camera = main.camera;
        this.scene = main.scene;
        this.boundingBox = new THREE.Box3();
        this.planeBB = new THREE.Box3();
        this.center = new THREE.Vector3();
        this.textString = '';
        this.fontName = 'Courier New';
        this.fontSize = 40;
        this.maxFontSize = 40;
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.style.textAlign = 'center';
        this.textCtx = this.textCanvas.getContext('2d', { willReadFrequently: true });
        this.image = image;
        this.textureSize = 23;
        this.opacFactor = 0.4;
        if(image == undefined)
        {
            this.hasImage = false;
        }
        else{
            this.hasImage = true;
        }
        this._setScreenPos();
        this.rot = rot;

        fetch(textFile)
        .then(r=>r.text())
        .then(text =>
        {
            this.textString = text;
            this._splitWords();
            this._generateText();
            if(this.hasImage)
            {
                this._generateImage();
            }
            //this._tweenIn();
        })

    }

    _setScreenPos()
    {
        const depth = 0.9999;
        if(!this.hasImage)
        {
            this.tL = new THREE.Vector3(-0.8, 0.8, depth);
            this.bR = new THREE.Vector3(0.8, -0.8, depth);
        }
        else
        {
            this.tL = new THREE.Vector3(-0.8, 0.8, depth);
            this.bR = new THREE.Vector3(-0.1, -0.8, depth);

            this.imgTL = new THREE.Vector3(0.1, 0.8, depth);
            this.imgBR = new THREE.Vector3(0.8, -0.8, depth);
            this.imgTL.unproject(this.camera);
            this.imgBR.unproject(this.camera);

        }
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
        if(this.hasImage)
        {
            dist = this.imgBR.clone();
            dist.sub(this.imgTL);
            this.imgW = Math.abs(dist.dot(right));
            this.imgH = Math.abs(dist.dot(up));
            this.imgH = 9 * this.imgW /16;
            this.imgPos = this.imgTL.clone();
            this.imgPos.add(right.clone().multiplyScalar(dist.dot(right)/2));
            this.imgPos.add(up.clone().multiplyScalar(dist.dot(up)/2));
        } 
    }
    _splitWords()
    {
        const len = this.textString.length;
        this.words = this.textString.split(' ');
        this.textCanvas.width = this.W;
        this.textCanvas.height = this.H;
        this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
        this.textCtx.fillStyle = '#2a9d8f';
        const text = 'Y';
        let metrics = this.textCtx.measureText(text);
        this.lim = this.W / metrics.width;
        let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        height *= 2;
        while(this.W * this.H / (metrics.width * (1.1 * height)) < len && this.fontSize != 1)
        {
            this.fontSize -= 1;
            this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
            metrics = this.textCtx.measureText(text);
            height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            height *= 2;
            this.lim = this.W / metrics.width;
        }
        let line = '    ';
        let lineInd = 0;
        this.words.forEach((word, index) => {
            if(line.length + word.length >= this.lim)
            {
                this.textCtx.fillText(line, 0, (lineInd + .8) * height, this.W);
                lineInd++;
                line = '';
            }
            if(word == 'newline')
            {
                this.textCtx.fillText(line, 0, (lineInd + .8) * height, this.W);
                lineInd += 1.5;
                line = '    ';
                return;
            }
            if(line && line != '    '){
                line += ' ';
            }
            line += word;
        });
        this.textCtx.fillText(line, 0, (lineInd + .8) * height, this.W);
        this._sample_coordinates();
    }

    _sample_coordinatesOLD()
    {
        const lines = this.textString.split(`\n`);
        const linesMaxLength = [...lines].sort((a, b) => b.length - a.length)[0].length;
        const wTexture = this.fontSize * .7 * linesMaxLength;
        const hTexture = lines.length * this.fontSize;
        console.log(wTexture);
        console.log(hTexture);
        const linesNumber = lines.length;
        this.textCanvas.width = wTexture;
        this.textCanvas.height = hTexture;
        console.log(hTexture);
        this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
        this.textCtx.fillStyle = '#2a9d8f';
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        for (let i = 0; i < linesNumber; i++) {
            this.textCtx.fillText(lines[i], 0, (i + .8) * hTexture / linesNumber, wTexture);
        }
        let textPoints = [];
        const samplingStep = 2;
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
        //console.log(textPoints);
        this._generateText(textPoints);
    }
    _sample_coordinates()
    {
        this.textPoints = [];
        const samplingStep = 1;
        if (this.W > 0) {
            const imageData = this.textCtx.getImageData(0, 0, this.textCanvas.width, this.textCanvas.height);
            for (let i = 0; i < this.textCanvas.height; i += samplingStep) {
                for (let j = 0; j < this.textCanvas.width; j += samplingStep) {
                    // Checking if R-channel is not zero since the background RGBA is (0,0,0,0)
                    if (imageData.data[(j + i * this.textCanvas.width) * 4] > 0) {
                        //this.textureCoordinates.push({x: j, y: i})
                        this.textPoints.push(new THREE.Vector3(j, i, 0));
                    }
                }
            }
        }
        //console.log(textPoints);
        //this._generateText();
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
        let material = new THREE.PointsMaterial({
                color: 'white',
                vertexColors: true,
                size: this.textureSize,
                sizeAttenuation: true,
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
        //this.scene.add(this.textCloud);
        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
        this.textLen = len;
    }

    _generateImage()
    {
        const geo = new THREE.PlaneGeometry(1, 1);
        geo.center();
        const texture = this.main.textureLoader.load(this.image);
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false
        });
        mat.opacity = 0;
        this.plane = new THREE.Mesh(geo, mat);
        //this.scene.add(this.plane);
        this._positionImage();
    }
    _positionImage()
    {
        this.plane.scale.set(this.imgW, this.imgH, 1);
        this.plane.geometry.needsUpdate = true;
        this.plane.position.copy(this.imgPos);
        this.plane.rotation.x = this.rot.x;
        this.plane.rotation.z = this.rot.z;
        this.plane.rotation.y = this.rot.y;
        this.plane.rotateX(Math.PI);
        this.plane.updateMatrixWorld();
        this.planeBB.setFromObject(this.plane);
    }

    _onResize()
    {
        this.fontSize = this.maxFontSize;
        const opac = this.textCloud.geometry.getAttribute('color').getW(0);
        this._setScreenPos();
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        this._splitWords();
        const len = this.textPoints.length;
        if(len != this.textLen)
        {
            let position = new THREE.BufferAttribute( new Float32Array(len*3), 3);
            let color = new THREE.BufferAttribute( new Float32Array(len*4), 4);
            for(let i = 0; i < len; i++)
            {
                position.setXYZ( i, this.textPoints[i].x, this.textPoints[i].y, this.textPoints[i].z );
                color.setXYZW( i, 1, 1, 1, opac);
            }
            this.textCloud.geometry.setAttribute('position', position);
            this.textCloud.geometry.setAttribute('color', color);
            this.textCloud.geometry.getAttribute('color').needsUpdate = true;
        }
        else{
            for(let i = 0; i < len; i++)
            {
                this.textCloud.geometry.getAttribute('position').setXYZ( i, this.textPoints[i].x, this.textPoints[i].y, this.textPoints[i].z );
            }
        }
        this.textCloud.geometry.getAttribute('position').needsUpdate = true;
        this._positionText(len);
        if(this.hasImage)
        {
            this._positionImage();
        }


    }


    _tweenIn()
    {
        this.scene.add(this.textCloud);
        if(this.hasImage)
        {
            this.scene.add(this.plane);
        }
        this._onResize();
        let z = new THREE.Vector3(0, 0, 0);
        this.fadeInTween = new TWEEN.Tween(z)
        .to({x: 1}, 1500)
        .onUpdate(() => {
            for(let i = 0; i < this.textLen; i++)
            {
                this.textCloud.geometry.getAttribute('color').setXYZW(i, 1, 1, 1, this.fadeInTween._object.x * this.opacFactor);
            }
            this.textCloud.geometry.getAttribute('color').needsUpdate = true;
            if(this.hasImage)
            {
                this.plane.material.opacity = this.fadeInTween._object.x * 0.8;
                this.plane.material.needsUpdate = true;
            }
        })
        .onComplete(() =>
        {
            this.fadeInTween = null;
            this.main.currentSection.loaded = true;
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
                this.textCloud.geometry.getAttribute('color').setXYZW(i, 1, 1, 1, this.fadeOutTween._object.x * this.opacFactor);
            }
            this.textCloud.geometry.getAttribute('color').needsUpdate = true;
            if(this.hasImage)
            {
                this.plane.material.opacity = this.fadeOutTween._object.x * 0.8;
                this.plane.material.needsUpdate = true;
            }
        })
        .onComplete(() =>
        {
            this.scene.remove(this.textCloud);
            if(this.hasImage)
            {
                this.scene.remove(this.plane);
            }
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