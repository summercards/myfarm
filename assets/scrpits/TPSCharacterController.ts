import {
    _decorator, Component, Node, Vec3, Quat,
    input, Input, EventKeyboard, KeyCode, find, animation
} from 'cc';
const { ccclass, property } = _decorator;

/* ---------- 固定常量 ---------- */
const VEC3_FWD = new Vec3(0, 0, -1);   // 模型朝 +Z
const VEC3_RIGHT = new Vec3(1, 0, 0);
const CAM_FWD = new Vec3();
const CAM_RIGHT = new Vec3();
const TMP_POS = new Vec3();
const Q_TMP = new Quat();
const Q_OUT = new Quat();
const GROUND_Y = 0;                     // 地面高度(示例固定 0)

@ccclass('TPSCharacterController')
export class TPSCharacterController extends Component {

    /* ===== 在检查器可调的参数 ===== */
    @property({ type: Node, displayName: '主相机' })
    camera: Node | null = null;

    @property({ type: animation.AnimationController, displayName: '动画控制器' })
    animCtrl: animation.AnimationController | null = null;

    @property({ displayName: '移动速度(米/秒)' }) moveSpeed = 5;
    @property({ displayName: '转身平滑时间(秒)' }) turnSmoothTime = 0.08;
    @property({ displayName: '始终朝向移动方向' }) faceMovement = true;

    /* —— 跳跃相关可调 —— */
    @property({ displayName: '跳跃初速度', tooltip: '数值↑→跳得更高' })
    jumpSpeed = 7;

    @property({ displayName: '重力加速度', tooltip: '数值↑→下落更快' })
    gravity = 30;

    @property({ displayName: '允许跳跃(空格)' }) enableJump = true;

    /* ===== 内部状态 ===== */
    private _press = { w: false, s: false, a: false, d: false };
    private _moveDir = new Vec3();
    private _vy = 0;                // 垂直速度
    private _isJumping = false;     // 空中标记

    /* ===== 生命周期 ===== */
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

    /* ===== 输入 ===== */
    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = true; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = true; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = true; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;
            case KeyCode.SPACE:
                if (this.enableJump && !this._isJumping) {
                    this._vy = this.jumpSpeed;              // 用 Inspector 中的数值
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

    /* ===== 每帧逻辑 ===== */
    update(dt: number) {
        if (!this.camera) return;

        /* 1. 取相机前/右 (XZ) */
        const camRot = this.camera.worldRotation;
        Vec3.transformQuat(CAM_FWD, VEC3_FWD, camRot); CAM_FWD.y = 0; CAM_FWD.normalize();
        Vec3.transformQuat(CAM_RIGHT, VEC3_RIGHT, camRot); CAM_RIGHT.y = 0; CAM_RIGHT.normalize();

        /* 2. 平面输入 */
        let h = 0, v = 0;
        if (this._press.a) h -= 1;
        if (this._press.d) h += 1;
        if (this._press.w) v += 1;
        if (this._press.s) v -= 1;
        const moving = h || v;

        /* 3. 写 speed 参数 */
        this.animCtrl?.setValue('speed', moving ? 1 : 0);

        /* 4. XZ 移动 */
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
            this.node.getWorldPosition(TMP_POS);           // 只需要 Y
        }

        /* 5. 垂直运动 */
        if (this._isJumping) {
            this._vy -= this.gravity * dt;                 // 用可调重力
            TMP_POS.y += this._vy * dt;
            if (TMP_POS.y <= GROUND_Y) {                   // 落地
                TMP_POS.y = GROUND_Y;
                this._vy = 0;
                this._isJumping = false;
                this.animCtrl?.setValue('isJump', false);
            }
        }

        this.node.setWorldPosition(TMP_POS);

        /* 6. 朝向 */
        if (this.faceMovement && moving && !this._isJumping) {
            const yaw = Math.atan2(this._moveDir.x, this._moveDir.z) * 180 / Math.PI + 180;
            Quat.fromEuler(Q_TMP, 0, yaw, 0);
            const t = this.turnSmoothTime <= 0 ? 1 : (1 - Math.exp(-dt / this.turnSmoothTime));
            Quat.slerp(Q_OUT, this.node.worldRotation, Q_TMP, t);
            this.node.setWorldRotation(Q_OUT);
        }
    }
}
