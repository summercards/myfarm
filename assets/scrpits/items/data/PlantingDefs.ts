/* assets/scripts/items/data/PlantingDefs.ts */
import { _decorator, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlantStageDef')
export class PlantStageDef {
    @property({ type: Prefab, tooltip: '该阶段显示的 Prefab（可留空）' })
    prefab: Prefab | null = null;

    @property({ tooltip: '该阶段持续时间（秒）' })
    duration = 5;

    @property({ tooltip: '该阶段缩放' })
    scale = 1;

    @property({ tooltip: '该阶段 Y 轴偏移' })
    offsetY = 0;
}

/** 作物（按物品配置）的种植参数 —— 注意：不是组件，不继承 Component */
@ccclass('PlantingDef')
export class PlantingDef {
    @property({ tooltip: '是否允许种植' })
    plantable = true;

    // === 每个物品可独立配置的“果树外观 + 生长参数” ===
    @property({ type: Prefab, tooltip: '果树/作物外观 prefab（种下后显示并生长）' })
    treePrefab: Prefab | null = null;

    @property({ tooltip: '生长总时长（秒）' })
    growSeconds = 6;

    @property({ tooltip: '初始缩放' })
    startScale = 0.4;

    @property({ tooltip: '目标缩放（长到即停止）' })
    targetScale = 1.0;

    @property({ tooltip: '玩家交互半径（米）' })
    interactRadius = 1.0;

    @property({ tooltip: '采集时掉落的水果数量' })
    yieldCount = 3;

    // === 可选：阶段表现（不用可留空） ===
    @property({ type: [PlantStageDef] })
    stages: PlantStageDef[] = [];
}
