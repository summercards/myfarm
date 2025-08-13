import { IItemAction, IItemActionContext } from '../IItemAction';
import { ItemData } from '../ItemData';

export class EatAction implements IItemAction {
  canUse(data: ItemData): boolean {
    return data.eatRecoverStamina > 0;
  }
  use(data: ItemData, ctx: IItemActionContext): void {
    // 这里调用你的角色体力系统（示例）：
    // const stats = ctx.actor.getComponent('PlayerStats') as any;
    // stats?.addStamina?.(data.eatRecoverStamina);
    // 真实项目中请在外层从背包扣除1个物品
    console.log(`[EatAction] 恢复体力: ${data.eatRecoverStamina}`);
  }
}
