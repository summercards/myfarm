import {
    _decorator, Component, Node, Vec3, Quat,
    input, Input, EventKeyboard, KeyCode, find, animation
} from 'cc';
const { ccclass, property } = _decorator;

/* ---------- 常量 ---------- */
const VEC3_FWD = new Vec3(0, 0, -1);   // 模型面朝 +Z
const VEC3_RIGHT = new Vec3(1, 0, 0);
const CAM_FWD = new Vec3();
const CAM_RIGHT = new Vec3();
const TMP_POS = new Vec3();
const Q_TMP = new Quat();
const Q_OUT = new Quat();

/* ---------- 跳跃物理 ---------- */
const GRAVITY = 30;   // m/s²
const JUMP_SPEED = 7;    // m/s
const GROUND_Y = 0;    // 地面高度 (示例固定 0)

@ccclass('TPSCharacterController')
export class TPSCharacterController extends Component {

    /* ====== Inspector 参数 ====== */
    @property({ type: Node, displayName: '主相机' })
    camera: Node | null = null;

    @property({ type: animation.AnimationController, displayName: '动画控制器' })
    animCtrl: animation.AnimationController | null = null;

    @property({ displayName: '移动速度(米/秒)' }) moveSpeed = 5;
    @property({ displayName: '转身平滑时间(秒)' }) turnSmoothTime = 0.08;
    @property({ displayName: '始终朝向移动方向' }) faceMovement = true;
    @property({ displayName: '允许跳跃(空格)' }) enableJump = true;

    /* ====== 内部状态 ====== */
    private _press = { w: false, s: false, a: false, d: false };
    private _moveDir = new Vec3();
    private _vy = 0;              // 垂直速度
    private _isJumping = false;   // 是否在空中

    /* ====== 生命周期 ====== */
    onLoad() {
        if (!this.camera) {
            this.camera = find('Main Camera') as Node | null
                || find('Canvas/Main Camera') as Node | null
                || null;
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

    /* ====== 输入处理 ====== */
    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = true; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = true; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = true; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;
            case KeyCode.SPACE:
                if (this.enableJump && !this._isJumping) {
                    this._vy = JUMP_SPEED;
                    this._isJumping = true;
                    this.animCtrl?.setValue('isJump', true);
                }
                break;
        }
    }
    private onKeyUp(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = false; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = false; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = false; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = false; break;
        }
    }

    /* ====== 主循环 ====== */
    update(dt: number) {
        if (!this.camera) return;

        /* 1. 相机前/右 (XZ) */
        const camRot = this.camera.worldRotation;
        Vec3.transformQuat(CAM_FWD, VEC3_FWD, camRot); CAM_FWD.y = 0; CAM_FWD.normalize();
        Vec3.transformQuat(CAM_RIGHT, VEC3_RIGHT, camRot); CAM_RIGHT.y = 0; CAM_RIGHT.normalize();

        /* 2. 平面输入方向 */
        let h = 0, v = 0;
        if (this._press.a) h -= 1;
        if (this._press.d) h += 1;
        if (this._press.w) v += 1;
        if (this._press.s) v -= 1;

        const moving = h !== 0 || v !== 0;

        /* 3. 写 speed 参数 (0/1) */
        this.animCtrl?.setValue('speed', moving ? 1 : 0);

        /* 4. 如果有平面运动，计算方向并移动 XZ */
        if (moving) {
            const inv = 1 / Math.hypot(h, v);
            h *= inv; v *= inv;

            this._moveDir.set(
                CAM_FWD.x * v + CAM_RIGHT.x * h,
                0,
                CAM_FWD.z * v + CAM_RIGHT.z * h
            ).normalize();

            this.node.getWorldPosition(TMP_POS);
            TMP_POS.x += this._moveDir.x * this.moveSpeed * dt;
            TMP_POS.z += this._moveDir.z * this.moveSpeed * dt;
        } else {
            this.node.getWorldPosition(TMP_POS); // 先取当前 Y 便于后面写回
        }

        /* 5. 垂直运动 (Jump / Gravity) */
        if (this._isJumping) {
            this._vy -= GRAVITY * dt;                 // 重力
            TMP_POS.y += this._vy * dt;               // 垂直位移

            if (TMP_POS.y <= GROUND_Y) {              // 落地
                TMP_POS.y = GROUND_Y;
                this._vy = 0;
                this._isJumping = false;
                this.animCtrl?.setValue('isJump', false);
            }
        }

        this.node.setWorldPosition(TMP_POS);

        /* 6. 朝向移动方向 (仅在地面时) */
        if (this.faceMovement && moving && !this._isJumping) {
            const yaw = Math.atan2(this._moveDir.x, this._moveDir.z) * 180 / Math.PI + 180;
            Quat.fromEuler(Q_TMP, 0, yaw, 0);

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
