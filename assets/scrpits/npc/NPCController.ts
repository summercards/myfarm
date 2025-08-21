/*  NPCController.ts
 *  功能：NPC 的基础移动（站桩 / 巡逻）+ 面朝方向调整 + 与对话时的暂停
 *  适用：Cocos Creator 3.8.6
 */
import { _decorator, Component, Node, Vec3, Quat, math } from 'cc';
const { ccclass, property } = _decorator;

const V_UP = new Vec3(0, 1, 0);
const V_TMP = new Vec3();
const Q_TMP = new Quat();

@ccclass('NPCController')
export class NPCController extends Component {
    /** 显示名（对话框标题用） */
    @property
    public npcName: string = '村民';

    /** 移动速度（米/秒） */
    @property
    public moveSpeed: number = 1.8;

    /** 是否巡逻（true：按路点循环；false：站桩） */
    @property
    public patrol: boolean = false;

    /** 路点（把场景中空节点拖进来，或挂在本节点的子节点里） */
    @property({ type: [Node] })
    public waypoints: Node[] = [];

    /** 到达每个路点后等待秒数区间（最小、最大） */
    @property
    public waitMin: number = 0.5;
    @property
    public waitMax: number = 2.0;

    /** 到路点判定距离（米） */
    @property
    public arriveDistance: number = 0.1;

    private _curIndex = 0;
    private _waitTimer = 0;
    private _isWaiting = false;
    private _talking = false; // 对话中时暂停移动

    onEnable() {
        // 若未手动指定路点，而把路点作为子节点“Waypoints/xxx”，这里可自动收集
        if (this.waypoints.length === 0) {
            const wpRoot = this.node.getChildByName('Waypoints');
            if (wpRoot) {
                this.waypoints = wpRoot.children.slice();
            }
        }
        // 防御：巡逻但没有路点 -> 自动改为站桩
        if (this.patrol && this.waypoints.length === 0) {
            this.patrol = false;
        }
    }

    /** 对话开始/结束时由外部调用，暂停或恢复移动 */
    public setTalking(talking: boolean) {
        this._talking = talking;
    }

    update(dt: number) {
        if (this._talking) return;         // 对话中不移动
        if (!this.patrol) return;          // 站桩则不移动
        if (this.waypoints.length === 0) return;

        if (this._isWaiting) {
            this._waitTimer -= dt;
            if (this._waitTimer <= 0) {
                this._isWaiting = false;
            }
            return;
        }

        const target = this.waypoints[this._curIndex];
        if (!target) return;

        // 朝目标移动
        const curPos = this.node.worldPosition;
        const tarPos = target.worldPosition;

        Vec3.subtract(V_TMP, tarPos, curPos);
        const dist = V_TMP.length();

        if (dist <= this.arriveDistance) {
            // 到达：切下一个 + 随机等待
            this._curIndex = (this._curIndex + 1) % this.waypoints.length;
            this._isWaiting = true;
            this._waitTimer = math.randomRange(this.waitMin, this.waitMax);
            return;
        }

        // 单位方向
        V_TMP.normalize();

        // 移动
        const step = this.moveSpeed * dt;
        this.node.setWorldPosition(
            curPos.x + V_TMP.x * step,
            curPos.y + V_TMP.y * step,
            curPos.z + V_TMP.z * step,
        );

        // 朝向调整（绕 Y 朝向移动方向）
        Quat.fromViewUp(Q_TMP, V_TMP, V_UP);
        this.node.setWorldRotation(Q_TMP);
    }
}
