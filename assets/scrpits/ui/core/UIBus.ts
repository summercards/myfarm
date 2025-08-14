import { EventTarget, SpriteFrame } from 'cc';

// 全局 UI 事件总线（独立）
export const UIBus = new EventTarget();

export const UIEvents = {
  InventoryChanged: 'ui:inventory-changed',
  Open: 'ui:open',
  Close: 'ui:close',
  Toggle: 'ui:toggle',
} as const;

export type UIItem = {
  id: string;
  name: string;
  count: number;
  icon?: SpriteFrame | null;
};
