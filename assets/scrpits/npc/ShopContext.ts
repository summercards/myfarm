import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('ShopContext')
export class ShopContext extends Component {
  /** 当前正在对话 / 交易的 NPC（对话关闭或商店关闭时清空） */
  public static currentNPC: Node | null = null;

  /** 商店是否打开：用于禁止 I 键等外部开关打断商店界面 */
  public static shopOpen: boolean = false;
}
