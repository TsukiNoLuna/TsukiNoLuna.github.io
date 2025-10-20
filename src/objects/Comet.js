import * as THREE from 'three';
import { MeshLineGeometry, MeshLineMaterial} from 'meshline';
import { clamp } from 'three/src/math/MathUtils.js';
import { calcBSplineDerivatives } from 'three/examples/jsm/curves/NURBSUtils.js';

const vocaloidColors = {
  "Miku": [0xffffff, 0xa8fae2, 0x44ffd2, 0x17e9c5, 0x00debf],
  "Luka": [0xffffff, 0xffc0cf, 0xff809e, 0xff519a, 0xff0094],
  "Rin": [0xffffff, 0xfeffb1, 0xffe82a, 0xffbe11, 0xffae00],
  "Len": [0xffffff, 0xfaf9da, 0xfeffb1, 0xfef578, 0xffe82a],
  "Meiko": [0xffffff, 0xffc8b0, 0xff743c, 0xff3e32, 0xe80305],
  "Kaito": [0xffffff, 0xaae9ed, 0x00ccea, 0x0086e0, 0x0c15ff],
  "Miku2": [0xffffff, 0xff93a7, 0xff547b, 0xff3076, 0xff006e]
}
const vocaloidOffsets = {
  "Miku": [0, 0, 0.11],
  "Luka": [-70, -Math.PI/9, 0.06],
  "Rin": [25, Math.PI/31.5, 0],
  "Len": [35, Math.PI/31.5, 0.06],
  "Meiko": [-35, -Math.PI/18, 0.08],
  "Kaito": [70, Math.PI/9, 0.04],
  "Miku2": [0, 0]
}

export class Comet{
  constructor(main, vocaloid)
  {
    this.main = main;
    this.scene = this.main.scene;
    this.vocaloid = vocaloid;
    this.rotationOffset = Math.PI/1.74;
    this.positionOffset = -40;
    this.orbitX = 0;
    this.orbitY = -20;
    this.radiusX = 150;
    this.radiusY = 120;
    this.cometScale = 10;
    if(this.vocaloid == 'Miku')
    {
      this.cometScale = 20;
    }
    this.startT = 0.65 + vocaloidOffsets[this.vocaloid][2];
    this.T = 0.01;
    this.particleUpdateInterval = 0.02;
    this.lastT = this.T;
    this.charRotation = Math.PI/1.69;
    this.Vel = 0.0012;
    this.trailLength = 0.6;
    this.scale = new THREE.Vector3(3, 3, 3);
    this.phases = 5;
    this.phaseEnds = [0.03, 0.05, 0.1, 0.25, 1];
    this.numPoints = 500;
    let last = 0;
    this.numPhasePoints = this.phaseEnds.map(end => {
      const out = this.numPoints * (end - last);
      last = end;
      return Math.floor(out);
    })
    const cumulativeSum = (sum => value => sum += value)(0);
    this.phasePointsCumulative = this.numPhasePoints.map(cumulativeSum);
    this.color1 = new THREE.Color().setHex(vocaloidColors[this.vocaloid][0], THREE.SRGBColorSpace);
    this.color2 = new THREE.Color().setHex(vocaloidColors[this.vocaloid][1], THREE.SRGBColorSpace);
    this.color3 = new THREE.Color().setHex(vocaloidColors[this.vocaloid][2], THREE.SRGBColorSpace);
    this.color4 = new THREE.Color().setHex(vocaloidColors[this.vocaloid][3], THREE.SRGBColorSpace);
    this.color5 = new THREE.Color().setHex(vocaloidColors[this.vocaloid][4], THREE.SRGBColorSpace);
    this.colors = [this.color1, this.color2, this.color3, this.color4, this.color5];
    this.trails = [];
    this.trailBuffer = 0.001;
    this.trailScale = 1.3;

    if(this.vocaloid == "Miku")
    {
      this.trailScale = 2;
    }
    this.particleN = 1785;
    this.particleFPS = 6;
    this.particleRefreshTime = 1 / this.particleFPS;
    this.particleRadius = 2;
    this.particleRadiusRange = 5;
    this.particleIncrements = 50;
    this.parcticleAlpha = 2;
    this.particleM = this.particleN / (this.particleIncrements + 1);
    this.timer = 0;

    this._initPath();
    this._initComet();
    this._initTrail();
    this._updateComet();
    this._initParticles();
  }
  _initPath()
  {
    //create elliptical path for movement
    let curve = new THREE.EllipseCurve(this.orbitX, this.orbitY, this.radiusX, this.radiusY, Math.PI/5, Math.PI);
    let points = curve.getPoints(500);
    const bufferGeo = new THREE.BufferGeometry().setFromPoints(points);
    //rotation to face Miku
    bufferGeo.rotateY(Math.PI/2);
    bufferGeo.rotateY(this.rotationOffset);
    let bufferVerts = [];
    for(let i = 0; i < 500; i++)
    {
      let v = new THREE.Vector3();
      v.fromBufferAttribute(bufferGeo.attributes.position, i);
      const right = new THREE.Vector3(1, 0, 0);
      const up = new THREE.Vector3(0, 1, 0);
      bufferVerts.push(v);
    }
    this.path = new THREE.CatmullRomCurve3(bufferVerts);
  }
    _initComet()
  {
    const texture = this.main.textureLoader.load('./images/Comet.png');
    const material = new THREE.SpriteMaterial({
      transparent: true,
      depthWrite: false,
      map: texture
    })
    material.rotation += Math.random() * Math.PI;
    const comet = new THREE.Sprite(material);
    const pos = this.path.getPointAt(this.T);
    comet.position.set(pos.x, pos.y, pos.z);
    comet.scale.set(this.cometScale, this.cometScale, this.cometScale);
    this.comet = comet;
    this.scene.add(this.comet);
  }
  _getSegment(start, end)
  {
    //use parametric value to get segment of curve
    const divisions = 50;
    const segmentPoints = [];
    for (let i = 0; i <= divisions; i++) {
      const t = start + (end - start) * (i / divisions);
      const point = this.path.getPointAt(t);
      segmentPoints.push(point);
    }
    const segmentCurve = new THREE.CatmullRomCurve3(segmentPoints);
    return segmentCurve;
  }

  _initTrail()
  {
    let tL = this.trailLength;
    if (tL > this.T) tL = this.T;
    const begin = this.T - tL;
    const end = this.T;
    let lastPhase = end;
    for(let i = 0; i < this.phases; i++)
    {
      const phase = end - this.phaseEnds[i] * tL;
      let segEnd = phase - this.trailBuffer;
      if(i == this.phases-1) segEnd = phase;
      const curve = this._getSegment(segEnd, lastPhase);
      const points = curve.getPoints(this.numPhasePoints[i]);
      const geo = new MeshLineGeometry();
      const lastPhaseEnd = (i == 0) ? 0 : this.phaseEnds[i-1];
      geo.setPoints(points, p => (p/(1/(this.phaseEnds[i] - lastPhaseEnd)) + (1-this.phaseEnds[i])) * this.trailScale);
      let material = new MeshLineMaterial({
        transparent: true,
        useMap: 0,
        opacity: 1,
        color: this.colors[i],
        sizeAttenuation: true,
        resolution: new THREE.Vector2(this.main.screenW, this.main.screenH)
      });
      const trail = new THREE.Mesh(geo, material);
      this.scene.add(trail);
      this.trails.push(trail);
      lastPhase = phase;
    }
    this._rotateTrails();
  }
  _rotateTrails()
  {
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    //rotating to face Miku
    right.applyAxisAngle(up, this.rotationOffset);
    right.setLength(this.positionOffset);
    //adding offset and rotation to create diagonal path through Miku
    this.trails.forEach(trail => {
      trail.position.add(right);
      trail.rotateOnAxis(up, Math.PI/4);
    })

    //once again transform right vector
    right.applyAxisAngle(up, Math.PI/4);
    right.setLength(vocaloidOffsets[this.vocaloid][0]);
    //place trail by offset relation to Miku comet
    //rotate to create image of similar ending point
    this.trails.forEach(trail => {
      trail.position.add(right);
      trail.rotateOnAxis(up, vocaloidOffsets[this.vocaloid][1]);
    })
  }

  _initParticles()
  {
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new THREE.BufferAttribute(new Float32Array(this.particleN * 3), 3);
    const particleColors = new THREE.BufferAttribute(new Float32Array(this.particleN * 4), 4);
    const v = new THREE.Vector3();
    for (let i = 0; i < this.particleN; i++) {
      v.randomDirection().setLength(Math.random() * this.particleRadius);
      v.add(this.comet.position);
      particlePositions.setXYZ(i, v.x, v.y, v.z);
      particleColors.setXYZW(i, this.color3.r, this.color3.g, this.color3.b, 1);
    }
    let	geo = new THREE.BufferGeometry();
    geo.setAttribute( 'position', particlePositions);
    geo.setAttribute( 'color', particleColors);
    let material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points( geo, material );
    this.scene.add(this.particles);
    this.particleGeo = geo;

  }
  _getTrailIndex(ind)
  {
    ind++;
    ind = clamp(ind, 1, this.numPoints);
    Math.floor(ind);
    let i = 0;
    let trailInd = -1;
    let found = false;
    this.phasePointsCumulative.forEach(num =>
    {
      if(ind <= num && !found)
      {
        trailInd = i;
        found = true;
      }
      i++;
    })
    return trailInd;
  }
  _getTrailPoint(ind)
  {
    //get point on trail by index
    ind++;
    ind = clamp(ind, 1, this.numPoints);
    Math.floor(ind);
    let i = 0;
    let trailInd = -1;
    let found = false;
    this.phasePointsCumulative.forEach(num =>
    {
      if(ind <= num && !found)
      {
        trailInd = i;
        found = true;
      }
      i++;
    }
    )
    if(trailInd != 0) ind -= this.phasePointsCumulative[trailInd-1];

    const positionArray = this.trails[trailInd].geometry.attributes.position.array;
    const pointsInd = this.numPhasePoints[trailInd] - ind;
    const lastInd = (pointsInd * 2 + 1) * 3;
    const pos = new THREE.Vector3(positionArray[lastInd], positionArray[lastInd+1], positionArray[lastInd+2]);
    pos.applyQuaternion(this.trails[trailInd].quaternion);
    pos.add(this.trails[trailInd].position);
    return pos;
  }

  _onResize()
  {
    this.trails.forEach(trail => {
      trail.material.resolution.set(this.main.screenW, this.main.screenH);
      trail.material.needsUpdate = true;
    })
  }
  _update(deltaTime, active)
  {
    this.timer += deltaTime;
    if(this.T < this.startT)
    {
      this.T += deltaTime;
      this.T = clamp(this.T, 0, this.startT);
    }
    else if (active){
      this.T += this.Vel * deltaTime;
      this.T = clamp(this.T, 0, 1);
    }
    this._updateTrails();
    this._updateComet();
    if(this.timer >= this.particleRefreshTime)
    {
      this.timer = 0;
      this._updateParticles();
    }
  }
    _updateComet()
  {
    //get first point of trail
    const point = this._getTrailPoint(0);
    //place comet at front of trail
    this.comet.position.set(point.x, point.y, point.z);
  }
  _updateTrails()
  {
    //same process as in _initTrails
    let tL = this.trailLength;
    if (tL > this.T) tL = this.T;
    const begin = this.T - tL;
    const end = this.T;
    let lastPhase = end;
    for(let i = 0; i < this.phases; i++)
    {
      const phase = end - this.phaseEnds[i] * tL;
      let segEnd = phase - this.trailBuffer;
      if(i == this.phases-1) segEnd = phase;
      clamp(segEnd, end - tL, end);
      const curve = this._getSegment(segEnd, lastPhase);
      const points = curve.getPoints(this.numPhasePoints[i]);
      const lastPhaseEnd = (i == 0) ? 0 : this.phaseEnds[i-1];
      this.trails[i].geometry.setPoints(points, p => (p/(1/(this.phaseEnds[i] - lastPhaseEnd)) + (1-this.phaseEnds[i])) * this.trailScale);
      this.trails[i].geometry.needsUpdate = true;
      lastPhase = phase;
    }
  }
  _updateParticles()
  {
    let point = 0;
    let radius = this.particleRadius;
    let particleInd = 0;
    let alpha = 0;
    for(let i = 0; i <= this.particleIncrements; i++)
    {

      const pos = this._getTrailPoint(point);
      const v = new THREE.Vector3();
      const end = particleInd + this.particleM;
      let opac = 0;
      let dist = 0;
      let color = this.colors[this._getTrailIndex(point)];
      color = (color == this.color1) ? color : this.color3;
      for (let i = particleInd; i < end; i++) {
        dist = Math.random() * radius;
        opac = 1 - (dist/(this.particleRadius + this.particleRadiusRange));
        opac = opac ** 5;
        opac -= alpha;
        opac = clamp(opac, 0, 1);

        v.randomDirection().setLength(Math.random() * radius);
        v.add(pos);
        this.particles.geometry.getAttribute('position').setXYZ(i, v.x, v.y, v.z);
        this.particles.geometry.getAttribute('color').setXYZW(i, color.r, color.g, color.b, opac);
        
      }
      point += this.numPoints/this.particleIncrements;
      radius += this.particleRadiusRange/this.particleIncrements;
      particleInd += this.particleM;
      alpha += this.parcticleAlpha/this.particleIncrements;
    }
    this.particles.geometry.getAttribute('position').needsUpdate = true;
    this.particles.geometry.getAttribute('color').needsUpdate = true;
    this.particles.geometry.computeBoundingSphere();
    
  }
  _delete()
  {
    this.scene.remove(this.comet);
    this.comet.material.dispose();
    this.trails.forEach(trail => {
      this.scene.remove(trail);
      trail.material.dispose();
      trail.geometry.dispose();
    }
    )
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }




}