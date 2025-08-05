/*  Assets/scripts/TPSCharacterController.ts
 *  功能：
 *    – WASD / SPACE / 跑跳
 *    – E：拾取最近候选道具到 hand 节点
 *    – Q：把手中道具放到角色前方 dropDistance 处
 * --------------------------------------------------------- */

import {
    _decorator, Component, Node, Vec3, Quat,
    input, Input, EventKeyboard, KeyCode, find,
    animation, Collider, ITriggerEvent
} from 'cc';
import { ItemPickup } from './ItemPickup';
const { ccclass, property } = _decorator;

/* === 常量缓存 === */
const VEC3_FWD = new Vec3(0, 0, -1);
const VEC3_RIGHT = new Vec3(1, 0, 0);
const CAM_FWD = new Vec3();
const CAM_RIGHT = new Vec3();
const TMP_POS = new Vec3();
const Q_TMP = new Quat();
const Q_OUT = new Quat();
const GROUND_Y = 0;

@ccclass('TPSCharacterController')
export class TPSCharacterController extends Component {

    /* -------- Inspector 字段 -------- */
    @property({ type: Node }) camera: Node | null = null;
    @property({ type: animation.AnimationController }) animCtrl: animation.AnimationController | null = null;
    @property({ type: Node }) hand: Node | null = null;

    @property moveSpeed = 5;
    @property turnSmoothTime = 0.15;
    @property faceMovement = true;

    @property jumpSpeed = 10;
    @property gravity = 30;
    @property enableJump = true;

    @property({ tooltip: 'Q 键丢弃到前方距离' })
    dropDistance = 1.0;

    /* -------- 内部状态 -------- */
    private _press = { w: false, s: false, a: false, d: false };
    private _moveDir = new Vec3();
    private _vy = 0;
    private _isJumping = false;

    private _candidate: ItemPickup | null = null;   // 近处可拾取
    private _held: ItemPickup | null = null;   // 当前持有

    /* ---------- 生命周期 ---------- */
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

        this.getComponent(Collider)?.on('onTriggerEnter', this.onTriggerEnter, this);
        this.getComponent(Collider)?.on('onTriggerExit', this.onTriggerExit, this);
    }
    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);

        this.getComponent(Collider)?.off('onTriggerEnter', this.onTriggerEnter, this);
        this.getComponent(Collider)?.off('onTriggerExit', this.onTriggerExit, this);
    }

    /* ---------- 触发器回调 ---------- */
    private onTriggerEnter(event: ITriggerEvent) {
        const other = event.otherCollider;
        const item = other?.getComponent(ItemPickup);
        if (item && !item.picked) this._candidate = item;
    }
    private onTriggerExit(event: ITriggerEvent) {
        const other = event.otherCollider;
        const item = other?.getComponent(ItemPickup);
        if (item && this._candidate === item) this._candidate = null;
    }

    /* ---------- 输入处理 ---------- */
    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = true; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = true; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = true; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;

            case KeyCode.KEY_E:          // 拾取
                if (this._candidate) {
                    this.pickItem(this._candidate);
                    this._candidate = null;
                }
                break;

            case KeyCode.KEY_Q:          // 丢弃
                this.dropItem();
                break;

            case KeyCode.SPACE:          // 跳
                if (this.enableJump && !this._isJumping) {
                    this._vy = this.jumpSpeed;
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

    /* ---------- 主循环 ---------- */
    update(dt: number) {
        if (!this.camera) return;

        /* 相机平面方向 */
        Vec3.transformQuat(CAM_FWD, VEC3_FWD, this.camera.worldRotation); CAM_FWD.y = 0; CAM_FWD.normalize();
        Vec3.transformQuat(CAM_RIGHT, VEC3_RIGHT, this.camera.worldRotation); CAM_RIGHT.y = 0; CAM_RIGHT.normalize();

        /* 输入方向 */
        let h = 0, v = 0;
        if (this._press.a) h -= 1;
        if (this._press.d) h += 1;
        if (this._press.w) v += 1;
        if (this._press.s) v -= 1;
        const moving = h || v;
        this.animCtrl?.setValue('speed', moving ? 1 : 0);

        /* 平面移动 */
        if (moving) {
            const inv = 1 / Math.hypot(h, v); h *= inv; v *= inv;
            this._moveDir.set(
                CAM_FWD.x * v + CAM_RIGHT.x * h,
                0,
                CAM_FWD.z * v + CAM_RIGHT.z * h,
            ).normalize();
            this.node.getWorldPosition(TMP_POS);
            TMP_POS.x += this._moveDir.x * this.moveSpeed * dt;
            TMP_POS.z += this._moveDir.z * this.moveSpeed * dt;
        } else {
            this.node.getWorldPosition(TMP_POS);
        }

        /* 垂直运动 */
        if (this._isJumping) {
            this._vy -= this.gravity * dt;
            TMP_POS.y += this._vy * dt;
            if (TMP_POS.y <= GROUND_Y) {
                TMP_POS.y = GROUND_Y;
                this._vy = 0;
                this._isJumping = false;
                this.animCtrl?.setValue('isJump', false);
            }
        }
        this.node.setWorldPosition(TMP_POS);

        /* 朝向 */
        if (this.faceMovement && moving && !this._isJumping) {
            const yaw = Math.atan2(this._moveDir.x, this._moveDir.z) * 180 / Math.PI + 180;
            Quat.fromEuler(Q_TMP, 0, yaw, 0);
            const t = this.turnSmoothTime <= 0 ? 1 : (1 - Math.exp(-dt / this.turnSmoothTime));
            Quat.slerp(Q_OUT, this.node.worldRotation, Q_TMP, t);
            this.node.setWorldRotation(Q_OUT);
        }
    }

    /* ---------- 拾取 ---------- */
    private pickItem(item: ItemPickup) {
        if (!this.hand) return;
        item.picked = true;
        this._held = item;

        item.node.setParent(this.hand);
        item.node.setPosition(Vec3.ZERO);
        item.node.setRotationFromEuler(0, 0, 0);
    }

    /* ---------- 丢弃 ---------- */
    private dropItem() {
        if (!this._held) return;
        if (!this.hand) return;

        /* ① 计算角色“世界前向” */
        const forward = new Vec3(0, 0, -1);              // 引擎默认前向 (0,0,-1)
        Vec3.transformQuat(forward, forward, this.node.worldRotation);
        forward.y = 0;
        forward.normalize();

        /* ② 目标位置 = 手部世界位置 + 前向 * 距离 */
        const dropPos = new Vec3();
        this.hand.getWorldPosition(dropPos);
        dropPos.x += forward.x * this.dropDistance;
        dropPos.y = GROUND_Y;                           // 放到地面
        dropPos.z += forward.z * this.dropDistance;

        /* ③ 脱手复位 */
        this._held.node.setParent(this.node.parent);
        this._held.node.setWorldPosition(dropPos);
        this._held.node.setRotationFromEuler(0, 0, 0);
        this._held.picked = false;

        this._held = null;
    }

}
