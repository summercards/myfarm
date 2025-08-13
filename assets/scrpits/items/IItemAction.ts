import { Node } from 'cc';
import { ItemData } from './ItemData';

export interface IItemActionContext {
  actor: Node;            // 使用物品的主体（玩家）
  worldRoot: Node;        // 世界根节点（用于生成物体）
}

export interface IItemAction {
  canUse(data: ItemData, ctx: IItemActionContext): boolean;
  use(data: ItemData, ctx: IItemActionContext): void;
}
