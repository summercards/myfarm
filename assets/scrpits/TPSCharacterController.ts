/*  Assets/scripts/TPSCharacterController.ts
 *  针对 Cocos Creator 3.8.6
 *  - 用 getLinearVelocity / setLinearVelocity / applyImpulse
 *  - 物理射线检测用 geometry.Ray + 旧版位置参数
 */
import {
    _decorator, Component, Node, Vec3, Quat,
    input, Input, EventKeyboard, KeyCode, find,
    animation, Collider, ITriggerEvent,
    RigidBody, PhysicsSystem, geometry, Prefab, instantiate
} from 'cc';
import { ItemPickup } from './ItemPickup';
const { ccclass, property } = _decorator;

/* === 复用常量 === */
const VEC3_FWD = new Vec3(0, 0, -1);
const VEC3_RIGHT = new Vec3(1, 0, 0);
const CAM_FWD = new Vec3();
const CAM_RIGHT = new Vec3();
const TMP = new Vec3();
const Q_TMP = new Quat();
const Q_OUT = new Quat();
const RAY = new geometry.Ray();

@ccclass('TPSCharacterController')
export class TPSCharacterController extends Component {

    /* ---------- Inspector ---------- */
    @property({ type: Node }) camera: Node | null = null;
    @property({ type: animation.AnimationController }) animCtrl: animation.AnimationController | null = null;
    @property({ type: Node }) hand: Node | null = null;

    @property moveSpeed = 5;
    @property turnSmoothTime = 0.15;
    @property faceMovement = true;

    @property jumpSpeed = 10;
    @property enableJump = true;

    @property dropDistance = 1.0;

    /* ---------- 内部状态 ---------- */
    private _press = { w: false, s: false, a: false, d: false };
    private _moveDir = new Vec3();
    private _candidate: ItemPickup | null = null;
    private _held: ItemPickup | null = null;
    private _rb: RigidBody | null = null;

    /* ---------- 生命周期 ---------- */
    onLoad() {
        if (!this.camera) {
            this.camera =
                find('Main Camera') as Node | null ||
                find('Canvas/Main Camera') as Node | null ||
                null;
        }
        this._rb = this.getComponent(RigidBody);
        if (!this._rb) console.warn('需要给角色节点挂 RigidBody (Dynamic)');
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        const col = this.getComponent(Collider);
        col?.on('onTriggerEnter', this.onTriggerEnter, this);
        col?.on('onTriggerExit', this.onTriggerExit, this);
    }
    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);

        const col = this.getComponent(Collider);
        col?.off('onTriggerEnter', this.onTriggerEnter, this);
        col?.off('onTriggerExit', this.onTriggerExit, this);
    }

    /* ---------- 触发器 ---------- */
    private onTriggerEnter(e: ITriggerEvent) {
        const item = e.otherCollider?.getComponent(ItemPickup);
        if (item && !item.picked) this._candidate = item;
    }
    private onTriggerExit(e: ITriggerEvent) {
        const item = e.otherCollider?.getComponent(ItemPickup);
        if (item && this._candidate === item) this._candidate = null;
    }

    /* ---------- 输入 ---------- */
    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this._press.w = true; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this._press.s = true; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this._press.a = true; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this._press.d = true; break;

            case KeyCode.KEY_E:       // 拾取
                if (this._candidate) { this.pickItem(this._candidate); this._candidate = null; }
                break;
            case KeyCode.KEY_Q:       // 丢弃
                this.dropItem();
                break;
            case KeyCode.SPACE:       // 跳跃
                if (this.enableJump && this.isGrounded() && this._rb) {
                    const impulse = new Vec3(0, this.jumpSpeed * this._rb.mass, 0);
                    this._rb.applyImpulse(impulse);
                    this.animCtrl?.setValue('isJump', true);
                }
                break;
            case KeyCode.BRACKET_LEFT:   // [  向左切换一种物品
                this.cycleHeld(-1);
                break;
            case KeyCode.BRACKET_RIGHT:  // ]  向右切换一种物品
                this.cycleHeld(1);
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
        if (!this.camera || !this._rb) return;

        /* 相机平面基向量 */
        Vec3.transformQuat(CAM_FWD, VEC3_FWD, this.camera.worldRotation);
        CAM_FWD.y = 0; CAM_FWD.normalize();
        Vec3.transformQuat(CAM_RIGHT, VEC3_RIGHT, this.camera.worldRotation);
        CAM_RIGHT.y = 0; CAM_RIGHT.normalize();

        /* 输入方向 */
        let h = +this._press.d - +this._press.a;
        let v = +this._press.w - +this._press.s;
        const moving = h !== 0 || v !== 0;
        this.animCtrl?.setValue('speed', moving ? 1 : 0);

        /* 当前速度 */
        this._rb.getLinearVelocity(TMP);
        const curY = TMP.y;

        /* 目标水平速度 */
        if (moving) {
            const inv = 1 / Math.hypot(h, v);
            h *= inv; v *= inv;
            this._moveDir.set(
                CAM_FWD.x * v + CAM_RIGHT.x * h,
                0,
                CAM_FWD.z * v + CAM_RIGHT.z * h
            ).normalize();

            TMP.set(
                this._moveDir.x * this.moveSpeed,
                curY,
                this._moveDir.z * this.moveSpeed
            );
        } else {
            TMP.set(0, curY, 0);      // 交给 Linear Damping 让人物停下
        }
        this._rb.setLinearVelocity(TMP);

        /* 落地检测 → 复位跳跃动画 */
        if (this.isGrounded() && curY <= 0.1) {
            this.animCtrl?.setValue('isJump', false);
        }

        /* 朝向 */
        if (this.faceMovement && moving) {
            const yaw = Math.atan2(this._moveDir.x, this._moveDir.z) * 180 / Math.PI + 180;
            Quat.fromEuler(Q_TMP, 0, yaw, 0);
            const t = this.turnSmoothTime <= 0 ? 1 : (1 - Math.exp(-dt / this.turnSmoothTime));
            Quat.slerp(Q_OUT, this.node.worldRotation, Q_TMP, t);
            this.node.setWorldRotation(Q_OUT);
        }
    }

    /* ---------- 落地检测 ---------- */
    private isGrounded(): boolean {
        if (!this._rb) return false;

        this.node.getWorldPosition(RAY.o);
        RAY.o.y += 0.05;          // 起点抬高 5 cm
        RAY.d.set(0, -1, 0);      // 向下

        // 旧版位置参数 API：ray, mask, maxDistance, queryTrigger
        return PhysicsSystem.instance.raycastClosest(
            RAY,
            0xffffffff,
            0.15,
            true
        );
    }

    /** 在“背包里当前拥有的物品类型”之间循环切换（delta=±1） */
    private cycleHeld(delta: number) {
        const bridgeComp: any = this.node.getComponent('PickupToInventory');
        if (!bridgeComp || !bridgeComp['inventory']) return;

        const inv = bridgeComp['inventory'];
        const ids: string[] = [];

        // 1) 收集背包里 count>0 的物品 id（去重）
        if (Array.isArray(inv['slots'])) {
            for (const s of inv['slots']) {
                if (s && s.count > 0 && ids.indexOf(s.id) === -1) ids.push(s.id);
            }
        } else if (typeof inv['getAllItems'] === 'function') {
            const all = inv['getAllItems'](); // 预期 [{id, count}, ...]
            if (Array.isArray(all)) {
                for (const it of all) {
                    if (it && it.count > 0 && ids.indexOf(it.id) === -1) ids.push(it.id);
                }
            }
        } else if (typeof inv['getItemCount'] === 'function' && typeof bridgeComp['itemDB']?.['allIds'] === 'function') {
            // 少见：如果有全量 id 列表
            for (const id of bridgeComp['itemDB']['allIds']()) {
                if (inv['getItemCount'](id) > 0) ids.push(id);
            }
        }

        if (ids.length === 0) {
            // 背包空了 → 清空手上
            if (this.hand) for (const c of this.hand.children) c.active = false;
            this._held = null;
            return;
        }

        // 2) 当前 id 的下一个/上一个
        const curId = this._held ? this._held.itemId : null;
        let idx = curId ? ids.indexOf(curId) : -1;
        idx = (idx + delta + ids.length) % ids.length;

        // 3) 装备该 id 到手上（不改背包数量）
        this.equipFromInventoryById(ids[idx]);
    }


    /** 按物品 id 从背包“显示在手上”（不改背包数量） */
    private equipFromInventoryById(id: string): boolean {
        if (!id || !this.hand) return false;

        // 1) 取背包引用
        const bridgeComp: any = this.node.getComponent('PickupToInventory');
        if (!bridgeComp || !bridgeComp['inventory']) return false;
        const inv = bridgeComp['inventory'];

        // 2) 背包里是否还有该 id？
        let count = 0;
        if (typeof inv['getItemCount'] === 'function') {
            count = inv['getItemCount'](id);
        } else if (typeof inv['countOf'] === 'function') {
            count = inv['countOf'](id);
        } else if (Array.isArray(inv['slots'])) {
            // 兜底：从 slots 统计
            for (const s of inv['slots']) if (s && s.id === id) count += s.count;
        }
        if (count <= 0) return false;

        // 3) 优先复用 hand 里已有的同 id 节点，否则实例化一个
        let target: Node | null = null;
        for (const c of this.hand.children) {
            const p = c.getComponent(ItemPickup);
            if (p && p.itemId === id) { target = c; break; }
        }



        if (!target) {
            // 需要实例化展示体
            const db = bridgeComp['itemDB'];
            if (!(db && typeof db['get'] === 'function')) return false;
            const data = db['get'](id);
            const prefab: Prefab | null = data && data['worldModel'] ? data['worldModel'] : null;
            if (!prefab) return false;

            target = instantiate(prefab);
            const p = target.getComponent(ItemPickup) || target.addComponent(ItemPickup);
            p.itemId = id;
            p.picked = true;

            target.setParent(this.hand);
            target.setPosition(Vec3.ZERO);
            target.setRotationFromEuler(0, 0, 0);
            target.active = true;
        }

        // 4) 只显示它一个
        for (const c of this.hand.children) c.active = (c === target);
        const held = target.getComponent(ItemPickup);
        if (held) this._held = held;

        return true;
    }


    /* ---------- 拾取 / 丢弃 ---------- */
    private pickItem(item: ItemPickup) {
        if (!this.hand) return;
        item.picked = true;

        // 先把 hand 下面除了这次拾取的节点以外的所有孩子都隐藏（不销毁）
        for (const c of this.hand.children) {
            if (c !== item.node) c.active = false;
        }

        // 再把当前拾取的物体挂到 hand，并确保它“唯一可见”
        item.node.setParent(this.hand);
        item.node.setPosition(Vec3.ZERO);
        item.node.setRotationFromEuler(0, 0, 0);
        item.node.active = true;

        // 最后记录当前手持
        this._held = item;

        console.log('[pick->bag]', item.itemId);

// 写入背包（JS 友好写法）
const bridgeComp = this.node.getComponent('PickupToInventory');
if (bridgeComp && typeof bridgeComp['push'] === 'function') {
  bridgeComp['push'](item.itemId, 1);
}
    }
    private dropItem() {
        if (!this._held || !this.hand) return;

        const fwd = new Vec3(0, 0, -1);
        Vec3.transformQuat(fwd, fwd, this.node.worldRotation);
        fwd.y = 0; fwd.normalize();

        this.hand.getWorldPosition(TMP);
        TMP.add3f(fwd.x * this.dropDistance, 0, fwd.z * this.dropDistance);

        this._held.node.setParent(this.node.parent);
        this._held.node.setWorldPosition(TMP);
        this._held.node.setRotationFromEuler(0, 0, 0);
        this._held.picked = false;

        const droppedId = this._held.itemId;   // ← 新增：先记住丢弃的物品 id
            // ★ 新增：同步扣背包
// 丢弃后从背包扣 1（JS 友好写法）
const bridgeComp = this.node.getComponent('PickupToInventory');
if (bridgeComp && bridgeComp['inventory'] && typeof bridgeComp['inventory']['removeItem'] === 'function') {
    bridgeComp['inventory']['removeItem'](droppedId, 1);
}

        this._held = null;

        // === 自动补位：如果背包里还有同样的物品，手上补一个同款 ===
        if (bridgeComp && bridgeComp['inventory']) {
            const id = droppedId;
            // 注意：上面刚把 this._held 置空了，所以先取个局部 id
            const inv = bridgeComp['inventory'];

            // 统计剩余数量（有些项目里是 getItemCount，也可能是 countOf；这里做兼容）
            let remain = 0;
            if (typeof inv['getItemCount'] === 'function') {
                remain = inv['getItemCount'](id);
            } else if (typeof inv['countOf'] === 'function') {
                remain = inv['countOf'](id);
            }

            if (id && remain > 0 && this.hand) {
                // ① 先尝试：hand 里是否有同 id 的隐藏节点？有就直接激活复用
                let reused: Node | null = null;
                for (const c of this.hand.children) {
                    const p = c.getComponent(ItemPickup);
                    if (p && p.itemId === id && c.active === false) {
                        reused = c;
                        break;
                    }
                }
                if (reused) {
                    // 只显示它一个
                    for (const c of this.hand.children) {
                        c.active = (c === reused);
                    }
                    const p = reused.getComponent(ItemPickup);
                    if (p) { p.picked = true; }
                    this._held = p || null;
                } else {
                    // ② 没有可复用节点：尝试从 ItemDatabase 实例化一个
                    const db = bridgeComp['itemDB'];              // 你的 PickupToInventory 通常有 itemDB 引用
                    if (db && typeof db['get'] === 'function') {
                        const data = db['get'](id);
                        const prefab: Prefab | null = data && data['worldModel'] ? data['worldModel'] : null;
                        if (prefab) {
                            const node = instantiate(prefab);
                            // 填好 ItemPickup 属性，确保一致
                            const p = node.getComponent(ItemPickup) || node.addComponent(ItemPickup);
                            p.itemId = id;
                            p.picked = true;

                            node.setParent(this.hand);
                            node.setPosition(Vec3.ZERO);
                            node.setRotationFromEuler(0, 0, 0);
                            node.active = true;

                            // 只显示它一个
                            for (const c of this.hand.children) {
                                if (c !== node) c.active = false;
                            }
                            this._held = p;
                        }
                    }
                }
            }
        }

    }
}
