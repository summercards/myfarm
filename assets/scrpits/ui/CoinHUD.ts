/* assets/scrpits/ui/CoinHUD.ts */
import { _decorator, Component, Label, sys, find } from 'cc';
import { CoinEvents, CurrencyManager } from '../currency/CurrencyManager';
const { ccclass, property } = _decorator;

@ccclass('CoinHUD')
export class CoinHUD extends Component {
  @property(Label) label: Label | null = null;
  @property({ tooltip: '前缀文字，如：金币：' }) prefix: string = '金币：';

  // 可选：拖进来或自动查找 GameRoot 上的 CurrencyManager
  @property(CurrencyManager) currency: CurrencyManager | null = null;

  onLoad() {
    if (!this.currency) {
      const n = find('GameRoot');
      this.currency = n?.getComponent(CurrencyManager) ?? null;
    }
    // 启动时先把当前金币显示出来（防止错过早期广播）
    const raw = sys.localStorage.getItem('coins');
    const current = this.currency?.coins ?? (raw ? parseInt(raw) || 0 : 0);
    this._onCoins(current);
    // 可选：调试
    // console.log('[CoinHUD] init coins =', current);
  }

  onEnable() {
    CoinEvents.on('coins-changed', this._onCoins, this);
  }
  onDisable() {
    CoinEvents.off('coins-changed', this._onCoins, this);
  }

  private _onCoins(n: number) {
    if (this.label) this.label.string = this.prefix + String(n | 0);
  }
}
