/* assets/scripts/items/ItemData.ts */
import { _decorator, Component, SpriteFrame, Prefab, Enum } from 'cc';
import { ItemCategory } from './ItemCategory';
import { ItemActionType } from './ItemActionType';
import { PlantingDef } from './data/PlantingDefs';

const { ccclass, property } = _decorator;

@ccclass('ItemData')
export class ItemData extends Component {
    @property
    id: string = 'apple';

    @property
    displayName: string = '苹果';

    /** 作物种植配置（嵌套数据；不是组件） */
    @property({ type: PlantingDef, tooltip: '（可选）种植配置' })
    plant: PlantingDef = new PlantingDef();

    /** 物品图标（可为空） */
    @property({ type: SpriteFrame })
    icon: SpriteFrame | null = null;

    /** 掉在地上的世界模型（Prefab，可为空） */
    @property({ type: Prefab })
    worldModel: Prefab | null = null;

    /** 分类（用 Enum 包一层，才能在 3.8 面板显示枚举下拉） */
    @property({ type: Enum(ItemCategory) })
    category: number = ItemCategory.Resource;

    @property
    maxStack: number = 99;

    @property
    description: string = '';

    /** 行为类型（同上用 Enum） */
    @property({ type: Enum(ItemActionType) })
    actionType: number = ItemActionType.None;

    @property
    eatRecoverStamina: number = 0;

    @property
    placePrefabYawSnap: number = 90;

    @property
    toolPower: number = 0;
}
