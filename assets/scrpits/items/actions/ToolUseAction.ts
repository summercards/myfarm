import { IItemAction, IItemActionContext } from '../IItemAction';
import { ItemData } from '../ItemData';

export class ToolUseAction implements IItemAction {
  canUse(data: ItemData): boolean {
    return true;
  }
  use(data: ItemData, ctx: IItemActionContext): void {
    // 在这里调用你的工具系统，根据 data.toolPower 对命中的对象进行处理
    console.log('[ToolUseAction] 使用工具, power=', data.toolPower);
  }
}
