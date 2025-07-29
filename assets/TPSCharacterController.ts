import {
  _decorator, Component, Node, Vec3, Quat,
  input, Input, EventKeyboard, KeyCode, find
} from 'cc';
const { ccclass, property } = _decorator;

const VEC3_FWD = new Vec3(0, 0, -1);
const VEC3_RIGHT = new Vec3(1, 0, 0);
const CAM_FWD = new Vec3();
const CAM_RIGHT = new Vec3();
const TMP_POS = new Vec3();
const Q_TMP = new Quat();
const Q_OUT = new Quat();

@ccclass('TPSCharacterController')
export class TPSCharacterController extends Component {
  @property({ type: Node, displayName: '主相机', tooltip: '用于计算WASD的参考方向' })
  camera: Node | null = null;

  @property({ displayName: '移动速度(单位/秒)' }) moveSpeed = 5;
  @property({ displayName: '转身平滑时间(秒)', tooltip: '0表示立即对准' }) turnSmoothTime = 0.08;
  @property({ displayName: '始终朝向移动方向' }) faceMovement = true;

  private _press = { w:false, s:false, a:false, d:false };
  private _moveDir = new Vec3();

  onLoad() {
    if (!this.camera) {
      this.camera =
        (find('Main Camera') as Node | null) ||
        (find('Canvas/Main Camera') as Node | null) ||
        null;
    }
  }

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }
  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  private onKeyDown(e: EventKeyboard) {
    switch (e.keyCode) {
      case KeyCode.KEY_W: case KeyCode.ARROW_UP:    this._press.w = true; break;
      case KeyCode.KEY_S: case KeyCode.ARROW_DOWN:  this._press.s = true; break;
      case KeyCode.KEY_A: case KeyCode.ARROW_LEFT:  this._press.a = true; break;
      case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;
    }
  }
  private onKeyUp(e: EventKeyboard) {
    switch (e.keyCode) {
      case KeyCode.KEY_W: case KeyCode.ARROW_UP:    this._press.w = false; break;
      case KeyCode.KEY_S: case KeyCode.ARROW_DOWN:  this._press.s = false; break;
      case KeyCode.KEY_A: case KeyCode.ARROW_LEFT:  this._press.a = false; break;
      case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = false; break;
    }
  }

  update(dt: number) {
    if (!this.camera) return;

    // 相机前/右（投影到XZ）
    const camRot = this.camera.worldRotation;
    Vec3.transformQuat(CAM_FWD, VEC3_FWD, camRot);
    CAM_FWD.y = 0; CAM_FWD.normalize();
    Vec3.transformQuat(CAM_RIGHT, VEC3_RIGHT, camRot);
    CAM_RIGHT.y = 0; CAM_RIGHT.normalize();

    // 输入
    let h = 0, v = 0;
    if (this._press.a) h -= 1;
    if (this._press.d) h += 1;
    if (this._press.w) v += 1;
    if (this._press.s) v -= 1;

    if (h === 0 && v === 0) return;

    // 归一化 & 方向
    const inv = 1 / Math.hypot(h, v); h *= inv; v *= inv;
    this._moveDir.set(
      CAM_FWD.x * v + CAM_RIGHT.x * h, 0,
      CAM_FWD.z * v + CAM_RIGHT.z * h
    ).normalize();

    // 平移
    this.node.getWorldPosition(TMP_POS);
    TMP_POS.x += this._moveDir.x * this.moveSpeed * dt;
    TMP_POS.z += this._moveDir.z * this.moveSpeed * dt;
    this.node.setWorldPosition(TMP_POS);

    // 朝向
    if (this.faceMovement) {
      const yawDeg = Math.atan2(this._moveDir.x, -this._moveDir.z) * 180 / Math.PI;
      Quat.fromEuler(Q_TMP, 0, yawDeg, 0);
      if (this.turnSmoothTime <= 0) {
        this.node.setWorldRotation(Q_TMP);
      } else {
        const t = 1 - Math.exp(-dt / this.turnSmoothTime);
        Quat.slerp(Q_OUT, this.node.worldRotation, Q_TMP, t);
        this.node.setWorldRotation(Q_OUT);
      }
    }
  }
}
