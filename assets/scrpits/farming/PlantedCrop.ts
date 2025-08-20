/*  scrpits/farming/PlantedCrop.ts
 *  树外观生长 + 交互采集掉落水果（简单稳定版）
 */
import {
    _decorator, Component, Node, Prefab, instantiate, Vec3,
    input, Input, KeyCode, Collider, ITriggerEvent, SphereCollider
} from 'cc';
import { ItemPickup } from '../ItemPickup';
const { ccclass, property } = _decorator;

type SetupArgs = {
    treePrefab: Prefab | null;          // 树外观 prefab（种下后显示/成长）
    itemId: string;                     // 掉落的水果 id（种下的就是它）
    itemDBNode: Node | null;            // 可选：从 DB 取 worldModel
    fallbackDropTemplate: Node | null;  // 可选：兜底用“手上水果节点”
};

@ccclass('PlantedCrop')
export class PlantedCrop extends Component {

    // —— 状态标记 ——
    private _canHarvest = false;        // 已经长成，允许采集
    private _col: Collider | null = null; // 交互触发器引用

    // —— 生长参数 ——
    @property({ tooltip: '刚种下时的缩放' })
    startScale = 0.4;

    @property({ tooltip: '最终缩放（达到即停止）' })
    targetScale = 1.0;

    @property({ tooltip: '生长总时长（秒），到达 targetScale 后停止' })
    growSeconds = 6;

    // —— 交互&掉落 ——
    @property({ tooltip: '玩家进入该半径内可按 E 采集（若树外观 prefab 没带触发器，会自动加）' })
    interactRadius = 1.0;

    @property({ tooltip: '成熟/采集时生成的水果数量' })
    yieldCount = 3;

    @property({ tooltip: '掉落抬高（米）' })
    dropHeight = 0.15;

    @property({ tooltip: '掉落散布半径（米）' })
    dropScatter = 0.2;

    // 运行时
    private _tree: Node | null = null;
    private _timer = 0;
    private _growing = true;
    private _playerIn = false;
    private _setup: SetupArgs | null = null;

    /** 由 PlantingSystem 调用 */
    public setup(args: SetupArgs) {
        this._setup = args;
        this._spawnTree(args.treePrefab);
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }
    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    private _onKeyDown(e: any) {
        if (e.keyCode !== KeyCode.KEY_E) return;
        if (!this._playerIn) return;
        if (!this._canHarvest) {
            // console.log('[PlantedCrop] 尚未成熟，无法采集');
            return;
        }
        this._harvest();
    }

    private _spawnTree(prefab: Prefab | null) {
        if (!prefab) {
            console.warn('[PlantedCrop] treePrefab is null');
            return;
        }
        const n = instantiate(prefab);
        this.node.addChild(n);
        n.setPosition(0, 0, 0);
        n.setRotationFromEuler(0, 0, 0);
        n.setScale(this.startScale, this.startScale, this.startScale);

        // 作物外观不应该能被拾取
        const pick = n.getComponent(ItemPickup);
        if (pick) n.removeComponent(ItemPickup);

        // 交互触发器（如果树 prefab 自己没带）
        let col = n.getComponent(Collider) as Collider | null;
        if (!col) {
            const sc = n.addComponent(SphereCollider);
            sc.isTrigger = true;
            sc.radius = this.interactRadius;
            col = sc as unknown as Collider;
        } else {
            col.isTrigger = true;
        }
        col.on('onTriggerEnter', this._onEnter, this);
        col.on('onTriggerExit', this._onExit, this);
        col.enabled = false;            // ★ 未成熟前禁用交互
        this._col = col;

        this._tree = n;
        this._growing = true;
        this._timer = 0;
        this._canHarvest = false;
    }

    private _onEnter(e: ITriggerEvent) { this._playerIn = true; }
    private _onExit(e: ITriggerEvent) { this._playerIn = false; }

    update(dt: number) {
        if (!this._tree || !this._growing) return;

        this._timer += dt;
        const t = Math.min(1, this._timer / Math.max(0.0001, this.growSeconds));
        const s = this.startScale + (this.targetScale - this.startScale) * t;
        this._tree.setScale(s, s, s);

        if (t >= 1) {
            // 到达目标大小后停止生长，并允许采集
            this._growing = false;
            this._canHarvest = true;
            if (this._col) this._col.enabled = true;  // ★ 成熟后才允许触发器工作
        }
    }

    /** 采集 → 掉落水果 → 树消失 */
    private _harvest() {
        if (!this._setup) return;
        this._canHarvest = false;            // ★ 防抖：采集中立刻关掉
        if (this._col) this._col.enabled = false;

        const id = this._setup.itemId;
        const dbNode = this._setup.itemDBNode;
        const fallback = this._setup.fallbackDropTemplate;

        // 计算掉落基点
        const base = new Vec3();
        this.node.getWorldPosition(base);
        base.y += this.dropHeight;

        // 优先从 DB 拿世界模型
        let worldPrefab: Prefab | null = null;
        if (dbNode && id) {
            const db: any = dbNode.getComponent('ItemDatabase');
            try {
                const data = db?.get ? db.get(id) :
                    (db?.byId ? db.byId[id] : (db?.map ? db.map[id] : null));
                worldPrefab = data?.worldModel ?? null;
            } catch { }
        }

        for (let i = 0; i < Math.max(1, this.yieldCount); i++) {
            let dropNode: Node | null = null;
            if (worldPrefab) {
                dropNode = instantiate(worldPrefab);
            } else if (fallback) {
                dropNode = instantiate(fallback);
            }
            if (!dropNode) continue;

            // 确保可拾取
            const p = dropNode.getComponent(ItemPickup) || dropNode.addComponent(ItemPickup);
            if (id) p.itemId = id;
            p.picked = false;

            this.node.parent?.addChild(dropNode);
            const pos = base.clone();
            // 轻微散布
            pos.x += (Math.random() * 2 - 1) * this.dropScatter;
            pos.z += (Math.random() * 2 - 1) * this.dropScatter;
            pos.y += i * 0.02;
            dropNode.setWorldPosition(pos);
            dropNode.setRotationFromEuler(0, 0, 0);
        }

        // 树消失
        this.node.destroy();
    }
}
