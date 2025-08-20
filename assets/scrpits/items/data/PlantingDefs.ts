/*  Assets/scripts/items/data/PlantingDefs.ts
 *  Cocos Creator 3.8.6
 *  - 物品的种植配置（在物品属性面板可直接编辑）
 */
import { _decorator, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlantStageDef')
export class PlantStageDef {
    @property({ type: Prefab, tooltip: '该阶段的展示预制体（留空则沿用上一阶段/世界模型）' })
    prefab: Prefab | null = null;

    @property({ tooltip: '该阶段持续秒数' })
    duration: number = 5;

    @property({ tooltip: '统一缩放（XYZ 同比）' })
    scale: number = 1;

    @property({ tooltip: 'Y 方向抬高（对齐地面时用）' })
    offsetY: number = 0;
}

@ccclass('PlantingDef')
export class PlantingDef {
    @property({ tooltip: '此物品是否可种植' })
    plantable: boolean = false;

    @property({ type: [PlantStageDef], tooltip: '生长阶段（按顺序）' })
    stages: PlantStageDef[] = [];

    @property({ tooltip: '成熟后产出物品 id（留空则 = 本物品 id）' })
    yieldItemId: string = '';

    @property({ tooltip: '每次成熟产出数量' })
    yieldCount: number = 1;

    @property({ tooltip: '产出抬高高度（避免穿地）' })
    dropHeight: number = 0.1;
}
