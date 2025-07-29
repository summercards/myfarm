import {
  _decorator, Component, Node, Vec3, Quat,
  input, Input, EventMouse, math, sys, game
} from 'cc';
const { ccclass, property } = _decorator;

const TMP_POS = new Vec3();
const TMP_LOOK = new Vec3();
const TMP_EULER = new Vec3();

@ccclass('TPSCameraOrbit')
export class TPSCameraOrbit extends Component {

  @property({ displayName: '反转水平旋转' })
invertYaw = false;

@property({ displayName: '反转垂直旋转' })
invertPitch = true; // 设为 true 表示“往上抬头”

  @property({ type: Node, displayName: '目标', tooltip: '要围绕/跟随的目标节点' })
  target: Node | null = null;

  @property({ displayName: '观察点偏移', tooltip: '相对目标的位置偏移（通常把Y设为头顶/视线高度）' })
  targetOffset: Vec3 = new Vec3(0, 1.5, 0);

  @property({ displayName: '距离', tooltip: '相机到观察点的当前距离（滚轮缩放）' })
  distance = 6;

  @property({ displayName: '最小距离' }) minDistance = 2;
  @property({ displayName: '最大距离' }) maxDistance = 12;

  @property({ displayName: '鼠标灵敏度', tooltip: '度/像素，越大转得越快' })
  sensitivity = 0.15;

  @property({ displayName: '按右键才旋转' })
  requireRightMouse = true;

  @property({ displayName: '俯仰下限(°)' }) pitchMin = -60;
  @property({ displayName: '俯仰上限(°)' }) pitchMax = 80;

  @property({ displayName: '始终看向目标' })
  lookAtTarget = true;

  @property({ displayName: '开场对准目标', tooltip: '开始时将相机自动摆到合适位置并对准目标' })
  forceSnapOnStart = true;

  private _yaw = 0;    // 度
  private _pitch = 15; // 度
  private _rotating = false;

  onEnable() {
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
  }
  onDisable() {
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
  }

  start() {
    if (this.forceSnapOnStart && this.target) {
      this._yaw = 0;
      this._pitch = math.clamp(15, this.pitchMin, this.pitchMax);
      this.snapToTarget();
    } else {
      Quat.toEuler(TMP_EULER, this.node.worldRotation);
      this._yaw = TMP_EULER.y;
      this._pitch = math.clamp(TMP_EULER.x, this.pitchMin, this.pitchMax);
    }
  }

  private onMouseDown(e: EventMouse) {
    if (e.getButton() === EventMouse.BUTTON_RIGHT) {
      this._rotating = true;
      if (sys.isBrowser) {
        const canvas: any = (game as any).canvas;
        if (canvas && canvas.requestPointerLock) canvas.requestPointerLock();
      }
    }
  }
  private onMouseUp(e: EventMouse) {
    if (e.getButton() === EventMouse.BUTTON_RIGHT) {
      this._rotating = false;
      if (sys.isBrowser) {
        const d: any = (globalThis as any).document;
        if (d && d.exitPointerLock) d.exitPointerLock();
      }
    }
  }
  private onMouseWheel(e: EventMouse) {
    const step = e.getScrollY() * 0.01;
    this.distance = math.clamp(this.distance + step, this.minDistance, this.maxDistance);
  }
private onMouseMove(e: EventMouse) {
  if (this.requireRightMouse && !this._rotating) return;
  this._yaw   += (this.invertYaw ? -1 : 1) * e.getDeltaX() * this.sensitivity;
  this._pitch  = math.clamp(
    this._pitch + (this.invertPitch ? 1 : -1) * e.getDeltaY() * this.sensitivity,
    this.pitchMin, this.pitchMax
  );
}

  private snapToTarget() {
    if (!this.target) return;

    const yawRad = math.toRadian(this._yaw);
    const pitchRad = math.toRadian(this._pitch);
    TMP_LOOK.set(
      Math.sin(yawRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      -Math.cos(yawRad) * Math.cos(pitchRad)
    );

    this.target.getWorldPosition(TMP_POS);
    TMP_POS.add(this.targetOffset);

    const desired = new Vec3(
      TMP_POS.x - TMP_LOOK.x * this.distance,
      TMP_POS.y - TMP_LOOK.y * this.distance,
      TMP_POS.z - TMP_LOOK.z * this.distance
    );

    this.node.setWorldPosition(desired);
    if (this.lookAtTarget) this.node.lookAt(TMP_POS, Vec3.UP);
  }

  lateUpdate() {
    if (!this.target) return;
    this.snapToTarget();
  }
}
