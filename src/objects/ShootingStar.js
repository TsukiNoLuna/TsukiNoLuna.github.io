import * as THREE from 'three';
import { MeshLineGeometry, MeshLineMaterial} from 'meshline'
import star from '../images/sp2.png';


function getStarPos2(minDist, distRange)
{
  //spawn point in general direction of comets
  const start = new THREE.Vector3(0, minDist * Math.sqrt(2), -minDist * Math.sqrt(2));
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3(1, 0, 0);
  const rotOffset = Math.PI/1.74;
  start.applyAxisAngle(up, rotOffset);
  right.applyAxisAngle(up, rotOffset);
  const distx = (Math.random() - 1) * distRange * 2;
  const disty = (Math.random() - 1) * distRange;
  const distz = (Math.random() - 1) * distRange * 2;
  const displacement = new THREE.Vector3(distx, 0, distz);
  start.applyAxisAngle(up, Math.PI/8);
  right.applyAxisAngle(up, Math.PI/8);
  right.setLength(-70);
  start.add(right);
  start.add(displacement);
  right.set(1, 0, 0);
  right.applyAxisAngle(up, 2.32);
  right.setLength((Math.random() - 0.5) * 100);
  start.add(right);
  return start;
}

function getStarVel2(minVel, velRange)
{
  //velocity in general direction of comets
  const dist = minVel + Math.random() * velRange;
  const out = new THREE.Vector3(0, -dist, 0);
  const rot = Math.PI/3 + Math.random() * Math.PI/12;
  const right = new THREE.Vector3(1, 0, 0);
  out.applyAxisAngle(right, -rot);
  const up = new THREE.Vector3(0, 1, 0);
  const rotOffset = Math.PI/1.74;
  out.applyAxisAngle(up, rotOffset);
  out.applyAxisAngle(up, Math.PI/4);
  out.applyAxisAngle(up, -Math.PI/16);
  out.applyAxisAngle(up, Math.random() * Math.PI/8);
  //out.add(right);

  return out;
  //if angle between velocity and down vector
}

export class ShootingStar
{
  constructor(main)
  {
    this.main = main;
    this.scene = this.main.scene;
    this.minDist = 100;
    this.distRange = 20;
    this.minVel = 4;
    this.velRange = 6;
    this.trailLength = 30;
    this.color = new THREE.Color(1, 1, 1);
    this.scale = new THREE.Vector3(1, 1, 1);
    this.startPos = getStarPos2(this.minDist, this.distRange);
    this.velocity = getStarVel2(this.minVel, this.velRange);
    this.rotationSpeed = 0.15 + Math.random() * Math.PI/4;
    this._initStar();
    this._initTrail();


  }
  _initStar()
  {
    const map = new THREE.TextureLoader().load(star);
    const spriteMat = new THREE.SpriteMaterial({map});
    spriteMat.transparent = true;
    spriteMat.depthWrite = false;
    let sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(this.scale.x, this.scale.y, this.scale.z);
    sprite.position.set(this.startPos.x, this.startPos.y, this.startPos.z);
    this.sprite = sprite;
    this.scene.add(this.sprite);
  }
  _initTrail()
  {
    const pos = this.startPos.clone();
    const vel = this.velocity.clone();
    vel.multiplyScalar(-1);
    vel.setLength(this.trailLength);
    pos.add(vel);
    const curve = new THREE.CatmullRomCurve3([this.startPos, vel]);
    const points = curve.getPoints(50);
    const geo = new MeshLineGeometry();
    geo.setFromPoints(points, (p) => 1 - p);
    let material = new MeshLineMaterial({
      transparent: true,
      useMap: 0,
      opacity: 1,
      color: this.color,
      sizeAttenuation: true,
      resolution: new THREE.Vector2(this.main.screenW, this.main.screenH)
    });
    this.trail = new THREE.Mesh(geo, material);
    this.scene.add(this.trail);
  }
  _onResize()
  {
    this.trail.material.resolution.set(this.main.screenW, this.main.screenH);
    this.trail.material.needsUpdate = true;
  }
  _update(deltaTime)
  {
    const pos = this.sprite.position.clone();
    const vel = this.velocity.clone();
    vel.multiplyScalar(deltaTime);
    pos.add(vel);
    this.sprite.position.set(pos.x, pos.y, pos.z);
    this.sprite.material.rotation += this.rotationSpeed * deltaTime;
    const back = vel.multiplyScalar(-1).setLength(this.trailLength);
    back.add(this.sprite.position);
    const curve = new THREE.CatmullRomCurve3([pos, back]);
    const points = curve.getPoints(50);
    this.trail.geometry.setPoints(points, (p) => 1 - p);
    this.trail.geometry.needsUpdate = true;
    //delete when out of view
    if(pos.y < -this.trailLength * Math.cos(Math.PI/3))
    {
      this._delete();
    }
  }
  _delete()
  {
    this.main.shootingStars = this.main.shootingStars.filter(item => item !== this);
    this.scene.remove(this);
    this.sprite.geometry.dispose();
    this.sprite.material.dispose();
    this.trail.geometry.dispose();
    this.trail.material.dispose();
  }
}