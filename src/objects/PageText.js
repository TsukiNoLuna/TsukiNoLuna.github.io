import * as THREE from 'three';
import TWEEN, { update } from 'three/examples/jsm/libs/tween.module.js';
import star from '../images/sp2.png';


export class PageText
{
    constructor(main, text, tL, bR, rot)
    {
        this.camera = main.camera;
        this.scene = main.scene;
        this.textString = text;
        this.fontName = 'Courier New';
        this.fontSize = 40;
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.style.textAlign = 'center';
        this.textCtx = this.textCanvas.getContext('2d');
        const depth = 0.9999;
        this.tL = new THREE.Vector3(tL.x, tL.y, depth);
        this.tL.unproject(this.camera);
        this.bR = new THREE.Vector3(bR.x, bR.y, depth);
        this.bR.unproject(this.camera);
        //console.log(this.tL);
        //console.log(this.bR);
        this.W = Math.abs(this.bR.clone().sub(this.tL).x);
        this.H = Math.abs(this.bR.clone().sub(this.tL).y);
        //console.log(this.W);
        //console.log(this.H);
        this.rot = rot;

        //this._sample_coordinates();
        this._splitWords();
    }
    _splitWords()
    {
        this.words = this.textString.split(' ');
        //this.lim = 46;
        //const linesNumber = this.textString.length % (this.lim);
        //this.fontSize = this.H/(this.textString.length % this.lim);
        this.textCanvas.width = this.W;
        this.textCanvas.height = this.H;
        this.textCtx.font = '100 ' + this.fontSize + 'px ' + this.fontName;
        this.textCtx.fillStyle = '#2a9d8f';
        const text = 'Y';
        const metrics = this.textCtx.measureText(text);
        this.lim = this.W / metrics.width;
        //console.log(this.lim);
        let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        height *= 2;
        //console.log(height);
        let chars = 0;
        let line = '    ';
        let lineInd = 0;
        this.words.forEach((word, index) => {
            if(line.length + word.length >= this.lim)
            {
                this.textCtx.fillText(line, 0, (lineInd + .8) * height, this.W);
                lineInd++;
                line = '';
            }
            if(line){
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
        console.log(textPoints);
        this._generateText(textPoints);
    }
    _sample_coordinates()
    {
        let textPoints = [];
        const samplingStep = 2;
        if (this.W > 0) {
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
                size: 8,
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
        this.pos = new THREE.Vector3(this.tL.x, this.tL.y, 0.5);
        this.pos.unproject(this.camera);
        this.textCloud.rotateZ(Math.PI);
        if(this.tL.z < 0)
        {
            this.textCloud.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
            //this.offset = new THREE.Vector3(-this.pos.x, this.pos.y, this.pos.z);
            this.offset = new THREE.Vector3(-(this.textCanvas.width/2 + this.tL.x), this.textCanvas.height/2 + this.tL.y, this.tL.z);
            
        }
        else{
            //this.offset = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
            this.offset = new THREE.Vector3(this.textCanvas.width/2 + this.tL.x, this.textCanvas.height/2 + this.tL.y, this.tL.z);
        }
        this.textCloud.position.copy(this.tL);

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
        /*this.textCloud.rotation.x = cube.rotation.x;
        this.textCloud.rotation.z = cube.rotation.z;
        this.textCloud.rotation.y = cube.rotation.y;*/
        this.textCloud.rotation.x = this.rot.x;
        this.textCloud.rotation.z = this.rot.z;
        this.textCloud.rotation.y = this.rot.y;

        let v = new THREE.Vector3(1, 0, 0);
        //v.applyQuaternion(this.textCloud.quaternion);
        //this.textCloud.rotateOnAxis(v, Math.PI);
        this.textCloud.updateMatrixWorld();
        this.boundingBox.setFromObject(this.textCloud);
        this.boundingBox.getCenter(this.center);
        cube.position.copy(this.textCloud.position);

        //this.textCloud.rotateY(Math.PI);


        this.scene.add(this.textCloud);
        //for(let i = 0; i < len; i++)
        //{   
        //    this._textTwinkle(i);
        //}
        console.log(this.textCloud);
        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromObject(this.textCloud);
        this.onScreen = false;
        this.textReady = true;
        this.textLen = len;
        this._tweenIn();
    }
    _tweenIn()
    {
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
        .start();
    }

}