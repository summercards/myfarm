import { IItemAction, IItemActionContext } from '../IItemAction';
import { ItemData } from '../ItemData';
import { instantiate } from 'cc';

export class PlaceAction implements IItemAction {
  canUse(data: ItemData): boolean {
    return !!data.worldModel;
  }
  use(data: ItemData, ctx: IItemActionContext): void {
    if (!data.worldModel) return;
    const go = instantiate(data.worldModel);
    // 实际项目中应由放置系统决定位置/朝向，这里仅先生成到 worldRoot 以验证流程
    ctx.worldRoot.addChild(go);
    console.log('[PlaceAction] 放置了世界物体: ', data.id);
  }
}
