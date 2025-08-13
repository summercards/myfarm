import { ItemActionType } from './ItemActionType';
import { IItemAction } from './IItemAction';

export class ItemActionRegistry {
  private static _map = new Map<ItemActionType, IItemAction>();
  static register(type: ItemActionType, impl: IItemAction) {
    this._map.set(type, impl);
  }
  static get(type: ItemActionType) {
    return this._map.get(type) || null;
  }
}
