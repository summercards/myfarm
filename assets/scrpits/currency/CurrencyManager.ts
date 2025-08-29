/* assets/scrpits/currency/CurrencyManager.ts
 * 简单金币管理（3.8.6）
 * - 保存到本地存储（key: 'coins'）
 * - 提供 add / spend / get / set 接口
 * - 通过全局事件派发 'coins-changed'（用 cc.EventTarget）
 */
import { _decorator, Component, sys, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

export const CoinEvents = new EventTarget();

@ccclass('CurrencyManager')
export class CurrencyManager extends Component {
  @property
  startCoins: number = 0;

  private _coins: number = 0;

  onLoad() {
    // 读取
    const raw = sys.localStorage.getItem('coins');
    if (raw != null) {
      const n = parseInt(raw);
      this._coins = isNaN(n) ? 0 : n;
    } else {
      this._coins = this.startCoins | 0;
      this._save();
    }
    // 初始广播
    CoinEvents.emit('coins-changed', this._coins);
  }

  get coins() { return this._coins; }

  setCoins(n: number) {
    const v = Math.max(0, Math.floor(n));
    if (v === this._coins) return;
    this._coins = v;
    this._save();
    CoinEvents.emit('coins-changed', this._coins);
  }

  addCoins(delta: number) {
    if (!delta) return;
    this.setCoins(this._coins + Math.floor(delta));
  }

  trySpend(cost: number): boolean {
    cost = Math.max(0, Math.floor(cost));
    if (this._coins < cost) return false;
    this.setCoins(this._coins - cost);
    return true;
  }

  private _save() {
    try { sys.localStorage.setItem('coins', String(this._coins)); } catch {}
  }
}
