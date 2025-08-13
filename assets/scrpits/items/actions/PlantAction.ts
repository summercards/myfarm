import { IItemAction, IItemActionContext } from '../IItemAction';
import { ItemData } from '../ItemData';

export class PlantAction implements IItemAction {
  canUse(data: ItemData): boolean {
    return true; // 可在此限制类别为种子
  }
  use(data: ItemData, ctx: IItemActionContext): void {
    // 交给你的播种/农作系统去处理（此处只给出调用位）
    console.log('[PlantAction] TODO: 调用种植系统，种下: ', data.id);
  }
}
