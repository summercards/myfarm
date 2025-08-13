export class ItemStack {
  id: string = '';
  count: number = 0;
  durability: number = 0; // 可选：工具耐久

  constructor(id: string, count = 1, durability = 0) {
    this.id = id;
    this.count = count;
    this.durability = durability;
  }
}
