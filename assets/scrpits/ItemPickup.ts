import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/** 被角色触发后交给角色脚本处理 */
@ccclass('ItemPickup')
export class ItemPickup extends Component {

    @property({ displayName: '物品 ID' })
    itemId = 'apple';              // 将来可做不同道具

    picked = false;                // 标记是否已被拾取
}
