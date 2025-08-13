使用方法（背包格子面板）
========================

1) 将 `InventoryPanel.ts` 放到：assets/scrpits/items/ui/
   将 `InventoryToggle.ts` 放到同目录。

2) 在 Canvas 下新建一个空节点 `InventoryPanelRoot`：
   - 添加组件：`UITransform`，设置宽高（比如 600 x 420）
   - 添加组件：`InventoryPanel`
     - gridRoot：留空（脚本会自动创建子节点 Grid）
     - itemDBNode：拖 GameRoot（挂了 ItemDatabase 的节点）
     - invBridgeNode：拖 玩家节点（挂了 PickupToInventory 的那个）
     - rows/cols/cellSize/gap：按需设置（默认 4x5, 80px, 8px）
   - （可选）再挂 `InventoryToggle`，设置 target=本节点。运行时按 I 显示/隐藏。

3) 运行后，面板会每 0.2 秒从 PickupToInventory 里读取 `inventory.slots`，
   将每个槽位的 `ItemData.icon` 和数量显示在网格里。
   - 若某个物品没有 icon，会显示为空白（可在 ItemData 上设置 SpriteFrame 图标）。

4) 槽位数量 = rows * cols。若你的 Inventory 容量更大，界面只显示前 N 个槽位。

注意：该面板只负责“显示”。使用/丢弃等交互可以之后再加按钮调用你已有的系统。
