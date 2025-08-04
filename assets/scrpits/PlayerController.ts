// Assets/scripts/PlayerController.ts
import { _decorator, Component, input, Input, EventKeyboard, KeyCode, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

  @property({ tooltip: '移动速度（单位/秒）' })
  moveSpeed: number = 5;

  @property({ tooltip: '勾选=在 XZ 平面移动(3D)，不勾=在 XY 平面移动(2D)' })
  moveOnXZ: boolean = true;

  private _press = { up: false, down: false, left: false, right: false };
  private _tmpPos: Vec3 = new Vec3();

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
      case KeyCode.KEY_W:
      case KeyCode.ARROW_UP:
        this._press.up = true; break;
      case KeyCode.KEY_S:
      case KeyCode.ARROW_DOWN:
        this._press.down = true; break;
      case KeyCode.KEY_A:
      case KeyCode.ARROW_LEFT:
        this._press.left = true; break;
      case KeyCode.KEY_D:
      case KeyCode.ARROW_RIGHT:
        this._press.right = true; break;
    }
  }

  private onKeyUp(e: EventKeyboard) {
    switch (e.keyCode) {
      case KeyCode.KEY_W:
      case KeyCode.ARROW_UP:
        this._press.up = false; break;
      case KeyCode.KEY_S:
      case KeyCode.ARROW_DOWN:
        this._press.down = false; break;
      case KeyCode.KEY_A:
      case KeyCode.ARROW_LEFT:
        this._press.left = false; break;
      case KeyCode.KEY_D:
      case KeyCode.ARROW_RIGHT:
        this._press.right = false; break;
    }
  }

  update(dt: number) {
    // 计算输入方向
    let x = 0, y = 0, z = 0;
    if (this.moveOnXZ) {
      // 3D：在 XZ 平面移动（W=向前，减少Z）
      if (this._press.up) z -= 1;
      if (this._press.down) z += 1;
      if (this._press.left) x -= 1;
      if (this._press.right) x += 1;
    } else {
      // 2D：在 XY 平面移动（W/↑=向上，增加Y）
      if (this._press.up) y += 1;
      if (this._press.down) y -= 1;
      if (this._press.left) x -= 1;
      if (this._press.right) x += 1;
    }

    // 归一化并按速度移动
    const len = Math.hypot(x, y, z);
    if (len > 0) {
      x = (x / len) * this.moveSpeed * dt;
      y = (y / len) * this.moveSpeed * dt;
      z = (z / len) * this.moveSpeed * dt;

      this.node.getPosition(this._tmpPos);
      this._tmpPos.set(this._tmpPos.x + x, this._tmpPos.y + y, this._tmpPos.z + z);
      this.node.setPosition(this._tmpPos);
    }
  }
}
