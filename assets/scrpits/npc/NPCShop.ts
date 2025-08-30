import { _decorator, Component, CCString } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ShopGoodDef')
export class ShopGoodDef {
  @property({ type: CCString, tooltip: '物品 id（与 ItemDatabase 一致）' })
  id: string = '';
  @property({ tooltip: '购买单价（玩家从 NPC 购买）' })
  buyPrice: number = 10;
  @property({ tooltip: '库存（-1 = 无限）' })
  stock: number = -1;
}

@ccclass('NPCShop')
export class NPCShop extends Component {
  @property({ type: [ShopGoodDef], tooltip: '该 NPC 的在售清单' })
  goods: ShopGoodDef[] = [];
}
