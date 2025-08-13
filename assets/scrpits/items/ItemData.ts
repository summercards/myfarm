import { _decorator, Component, SpriteFrame, Prefab, Enum } from 'cc';
import { ItemCategory } from './ItemCategory';
import { ItemActionType } from './ItemActionType';
const { ccclass, property } = _decorator;

/**
 * 注意：Cocos 3.8 的枚举在 @property 里需要使用 Enum(...)，
 * 且字段类型建议用 number（不要写 ItemCategory 类型），否则可能序列化报错。
 */
@ccclass('ItemData')
export class ItemData extends Component {
  @property
  id: string = 'apple';

  @property
  displayName: string = '苹果';

  @property({ type: SpriteFrame })
  icon: SpriteFrame | null = null;

  @property({ type: Prefab })
  worldModel: Prefab | null = null;

  // ✅ 用 number + Enum(...)（非常关键）
  @property({ type: Enum(ItemCategory) })
  category: number = ItemCategory.Resource;

  @property
  maxStack: number = 99;

  @property
  description: string = '';

  @property({ type: Enum(ItemActionType) })
  actionType: number = ItemActionType.None;

  @property
  eatRecoverStamina: number = 0;

  @property
  placePrefabYawSnap: number = 90;

  @property
  toolPower: number = 0;
}
