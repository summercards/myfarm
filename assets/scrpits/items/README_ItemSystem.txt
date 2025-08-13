放置目录：assets/scrpits/items

包含：
- ItemCategory.ts / ItemActionType.ts：物品分类与动作类型枚举
- ItemData.ts：物品模板（检查器可编辑，需做成 Prefab 资产）
- ItemDatabase.ts：物品数据库（把所有 ItemData Prefab 拖入 allItems）
- ItemStack.ts / Inventory.ts：背包数据结构与堆叠逻辑
- IItemAction.ts / ItemActionRegistry.ts：动作接口与注册器
- actions/*：Eat / Plant / ToolUse / Place 的动作实现样例
- systems/DropSystem.ts：掉落到场景的简化实现
- adapters/PickupToInventory.ts：把你现有的拾取结果转存到背包的可选适配器（不改你原脚本）

快速集成：
1) 在场景创建 GameRoot 节点，挂 ItemDatabase，把所有 ItemData 资产（Prefab）拖到 allItems。
2) 创建一些 ItemData：在层级里创建空节点，挂 ItemData，设置 id/displayName/icon/worldModel 等，保存为 Prefab。
3) 如需测试放入背包：把 adapters/PickupToInventory.ts 挂在玩家上，引用 ItemDatabase。
   - 在你现有的拾取成功时机处（例如 TPSCharacterController.pickItem 之后），调用：
     const bridge = playerNode.getComponent(PickupToInventory); bridge?.push(item.itemId, 1);
   - 这样无需改动原脚本的结构，只是多加一步把数据同步到背包。
4) UI 层：根据 Inventory.slots 渲染格子即可（本包不包含 UI 代码）。
