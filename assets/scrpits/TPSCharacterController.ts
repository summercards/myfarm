/*  Assets/scripts/TPSCharacterController.ts  */

import {
    _decorator, Component, Node, Vec3, Quat,
    input, Input, EventKeyboard, KeyCode, find,
    animation, PhysicsSystem, Collider, ITriggerEvent   // ← 加回
} from 'cc';
import { ItemPickup } from './ItemPickup';
const { ccclass, property } = _decorator;

/* ---------- 常量 ---------- */
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

    /* === Inspector 字段 === */
    @property({ type: Node }) camera: Node | null = null;
    @property({ type: animation.AnimationController }) animCtrl: animation.AnimationController | null = null;
    @property({ type: Node }) hand: Node | null = null;

    @property moveSpeed = 5;
    @property turnSmoothTime = 0.08;
    @property faceMovement = true;

    @property jumpSpeed = 7;
    @property gravity = 30;
    @property enableJump = true;

    /* ----- 内部状态 ----- */
    private _press = { w: false, s: false, a: false, d: false };
    private _moveDir = new Vec3();
    private _vy = 0;
    private _isJumping = false;
    private _candidate: ItemPickup | null = null;

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

    /* ---------- 触发器 ---------- */
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


    /* ---------- 输入 ---------- */
    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = true; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = true; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = true; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;
            case KeyCode.KEY_E:
                if (this._candidate) { this.pickItem(this._candidate); this._candidate = null; }
                break;
            case KeyCode.SPACE:
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

        /* 相机方向 */
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
            this._moveDir.set(CAM_FWD.x * v + CAM_RIGHT.x * h, 0, CAM_FWD.z * v + CAM_RIGHT.z * h).normalize();
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
        item.node.setParent(this.hand);
        item.node.setPosition(Vec3.ZERO);
        item.node.setRotationFromEuler(0, 0, 0);
    }
}
