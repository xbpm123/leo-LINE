// 料金プラン。価格を変えるときはここだけ直す（税込・円）
export const PLANS = {
  lite: { name: 'ライト', price: 980, rank: 1 },
  standard: { name: 'スタンダード', price: 1980, rank: 2 },
  pair: { name: 'ペア', price: 2980, rank: 3 }
};

export function upgradePrice(from, to) {
  if (!PLANS[from] || !PLANS[to] || PLANS[to].rank <= PLANS[from].rank) return null;
  return PLANS[to].price - PLANS[from].price;
}
