import { _decorator, Component, Node, Vec3, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
  @property(Node) target: Node | null = null;

  @property({ tooltip: '相对目标的偏移（以世界坐标计）' })
  offset: Vec3 = new Vec3(0, 3, 6);   // 第三人称默认

  @property({ tooltip: '是否按目标的朝向旋转偏移（围绕Y轴）' })
  alignWithTargetYaw: boolean = false;

  @property({ tooltip: '是否始终看向目标' })
  lookAtTarget: boolean = true;

  @property({ tooltip: '平滑时间(秒)，0=无平滑' })
  smoothTime: number = 0.08;

  private _tmpTargetPos = new Vec3();
  private _current = new Vec3();
  private _euler = new Vec3();

  start() {
    this.node.getWorldPosition(this._current);
  }

  lateUpdate(dt: number) {
    if (!this.target) return;

    this.target.getWorldPosition(this._tmpTargetPos);

    // 计算期望位置
    let ox = this.offset.x, oy = this.offset.y, oz = this.offset.z;
    if (this.alignWithTargetYaw) {
      const rot = this.target.worldRotation;
      Quat.toEuler(this._euler, rot);
      const yaw = this._euler.y * Math.PI / 180;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const rx = ox * cos - oz * sin;
      const rz = ox * sin + oz * cos;
      ox = rx; oz = rz;
    }
    const desired = new Vec3(
      this._tmpTargetPos.x + ox,
      this._tmpTargetPos.y + oy,
      this._tmpTargetPos.z + oz
    );

    // 平滑移动
    if (this.smoothTime <= 0) {
      this.node.setWorldPosition(desired);
    } else {
      const t = 1 - Math.exp(-dt / this.smoothTime);
      this.node.getWorldPosition(this._current);
      this._current.lerp(desired, t);
      this.node.setWorldPosition(this._current);
    }

    if (this.lookAtTarget) {
      this.node.lookAt(this._tmpTargetPos);
    }
  }
}
