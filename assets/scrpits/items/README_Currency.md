# 货币系统（金币）与出售给 NPC（极简版）

## 新增脚本
- `scrpits/currency/CurrencyManager.ts`：金币管理，保存到本地。
- `scrpits/ui/CoinHUD.ts`：画布上显示当前金币。
- `scrpits/npc/NPCVendor.ts`：把本脚本挂在 NPC 上，靠近按 **T** 键出售玩家背包里所有可售物品。

## 对 ItemData 的小改动（在检查器里设置价格）
打开 `scrpits/items/ItemData.ts`，新增两个属性（放在类里任意位置都可以）：
```ts
  /** 是否可出售（默认：sellPrice>0 即可售） */
  @property({ tooltip: '是否允许被出售' })
  canSell: boolean = true;

  /** 售价（单价，金币） */
  @property({ tooltip: '出售时每个可获得的金币' })
  sellPrice: number = 0;
```

然后到你的苹果、香蕉等 **ItemData** 预制体上，设置：
- `canSell = true`
- `sellPrice = 5`（举例）

> 不想改代码也可以：`NPCVendor` 里会用 `(d as any).sellPrice` 和 `(d as any).canSell`。只要你在 ItemData 上加上这两个字段即可。

## 如何接入（一步步）
1. **GameRoot**（已经挂 `ItemDatabase` 的节点）再挂脚本：`CurrencyManager`。
   - `Start Coins` 初始金币。发布版本会自动从本地读取/保存。
2. **Canvas** 下创建一个空节点 `CoinHUD`，添加 `Label` 组件，再挂脚本：`CoinHUD`，把 `label` 引用拖进去（就能显示金币了）。
3. 选中一个 **NPC** 节点：
   - 确保它有 `Collider` 并勾选 `IsTrigger`（你已有 `NPCInteract` 的话通常已经有）。
   - 挂上脚本 `NPCVendor`：
     - `Item DB` 指向 `GameRoot` 上的 `ItemDatabase`。
     - `Player` 指向玩家节点（挂有 `PickupToInventory` 的那个）。
     - `Currency` 指向 `GameRoot` 上的 `CurrencyManager`。
     - （可选）`Accept Categories` 勾选允许出售的大类；为空表示都允许。
     - （可选）`Accept Ids` 列出仅允许的物品 id（优先级更高）。
     - `Trade Key` 默认 **T**，可改。
4. 运行游戏：靠近该 NPC，提示会显示 **按 T 出售物品**。按下后，
   - 从玩家背包中把 **所有可出售且符合限制** 的物品清空；
   - 计算总价并 **增加金币**；
   - 左上角金币数更新；控制台输出明细。

## 常见问题
- **没有提示或按键无效**：确保 `NPCVendor.trigger` 指向了勾选 `IsTrigger` 的 `Collider`，并且玩家确实进入该触发器。
- **金币不显示**：Canvas 上的 `CoinHUD.label` 没有赋值；或者 `CurrencyManager` 没挂。
- **不想卖出全部**：这是极简版本。后续可以新增 UI：列出物品并勾选出售数量。框架可以复用本脚本里 `sellAll()` 的计算逻辑。

## 事件
- 任何界面组件都可以监听 `CoinEvents`：
  ```ts
  import { CoinEvents } from '.../currency/CurrencyManager';
  CoinEvents.on('coins-changed', (n:number)=>{ /* 更新 UI */ }, this);
  ```
