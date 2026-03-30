/**
 * 副業収支ダッシュボード — データ管理モジュール
 * localStorage を使ったデータの保存・読み込み・操作
 */

const STORAGE_KEYS = {
  MONTHLY_DATA: 'fukugyo_monthly_data',
  SETTINGS: 'fukugyo_settings',
};

/** デフォルトの設定値 */
const DEFAULT_SETTINGS = {
  annualGoal: 4200000,
  targetHourlyRate: 17500,
  taxSettings: {
    blueReturn: true,
    smallBizMutualAid: 70000,
    furusatoTax: true,
  },
};

/** デモデータ（ポートフォリオ用） */
const DEMO_DATA = {
  '2025-07': { revenue: 280000, workHours: 140, expenses: { '通信費': 5000, '交通費': 2000, '消耗品費': 3000, '家賃（按分）': 18000, '水道光熱費（按分）': 2500 } },
  '2025-08': { revenue: 310000, workHours: 130, expenses: { '通信費': 5000, '交通費': 3500, '消耗品費': 0, '家賃（按分）': 18000, '水道光熱費（按分）': 3000 } },
  '2025-09': { revenue: 350000, workHours: 120, expenses: { '通信費': 5000, '交通費': 2000, '消耗品費': 8000, '家賃（按分）': 18000, '水道光熱費（按分）': 2800 } },
  '2025-10': { revenue: 330000, workHours: 115, expenses: { '通信費': 5000, '交通費': 4000, '消耗品費': 0, '家賃（按分）': 20000, '水道光熱費（按分）': 2500 } },
  '2025-11': { revenue: 380000, workHours: 110, expenses: { '通信費': 5000, '交通費': 1500, '消耗品費': 15000, '家賃（按分）': 20000, '水道光熱費（按分）': 3200 } },
  '2025-12': { revenue: 420000, workHours: 100, expenses: { '通信費': 5000, '交通費': 5000, '消耗品費': 0, '家賃（按分）': 20000, '水道光熱費（按分）': 3500 } },
  '2026-01': { revenue: 400000, workHours: 95, expenses: { '通信費': 5000, '交通費': 2000, '消耗品費': 2000, '家賃（按分）': 20000, '水道光熱費（按分）': 3800 } },
  '2026-02': { revenue: 450000, workHours: 85, expenses: { '通信費': 5000, '交通費': 3000, '消耗品費': 0, '家賃（按分）': 20000, '水道光熱費（按分）': 3200 } },
  '2026-03': { revenue: 480000, workHours: 75, expenses: { '通信費': 5000, '交通費': 1000, '消耗品費': 5000, '家賃（按分）': 20000, '水道光熱費（按分）': 2800 } },
};

/** 経費カテゴリ一覧 */
export const EXPENSE_CATEGORIES = [
  '通信費',
  '交通費',
  '消耗品費',
  '家賃（按分）',
  '水道光熱費（按分）',
];

// ------ ストレージ操作 ------

/** 月次データを全件取得 */
export function getAllData() {
  const raw = localStorage.getItem(STORAGE_KEYS.MONTHLY_DATA);
  return raw ? JSON.parse(raw) : {};
}

/** 月次データを保存 */
export function saveMonthData(month, data) {
  const all = getAllData();
  all[month] = data;
  localStorage.setItem(STORAGE_KEYS.MONTHLY_DATA, JSON.stringify(all));
}

/** 月次データを削除 */
export function deleteMonthData(month) {
  const all = getAllData();
  delete all[month];
  localStorage.setItem(STORAGE_KEYS.MONTHLY_DATA, JSON.stringify(all));
}

/** 設定を取得 */
export function getSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
}

/** 設定を保存 */
export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/** デモデータを読み込み */
export function loadDemoData() {
  localStorage.setItem(STORAGE_KEYS.MONTHLY_DATA, JSON.stringify(DEMO_DATA));
}

// ------ データ計算 ------

/** 月の経費合計を計算 */
export function calcTotalExpenses(monthData) {
  if (!monthData || !monthData.expenses) return 0;
  return Object.values(monthData.expenses).reduce((sum, v) => sum + (v || 0), 0);
}

/** 月の手取り（売上 - 経費） */
export function calcNetIncome(monthData) {
  if (!monthData) return 0;
  return (monthData.revenue || 0) - calcTotalExpenses(monthData);
}

/** 時給を計算 */
export function calcHourlyRate(monthData) {
  if (!monthData || !monthData.workHours || monthData.workHours === 0) return 0;
  return Math.round(monthData.revenue / monthData.workHours);
}

/** ソート済みの月キーを取得 */
export function getSortedMonths(data) {
  return Object.keys(data).sort();
}

/** 今年のデータだけフィルタ */
export function getCurrentYearData(data) {
  const year = new Date().getFullYear();
  const filtered = {};
  for (const [month, d] of Object.entries(data)) {
    if (month.startsWith(String(year))) {
      filtered[month] = d;
    }
  }
  return filtered;
}

/** 年間売上の合計 */
export function calcAnnualRevenue(data) {
  const yearData = getCurrentYearData(data);
  return Object.values(yearData).reduce((sum, d) => sum + (d.revenue || 0), 0);
}

/** 年間予測（直近3ヶ月の平均を使う） */
export function calcForecast(data) {
  const months = getSortedMonths(data);
  if (months.length === 0) return null;

  // 直近3ヶ月（またはある分）
  const recent = months.slice(-3);
  const avgRevenue = recent.reduce((s, m) => s + (data[m].revenue || 0), 0) / recent.length;
  const avgHours = recent.reduce((s, m) => s + (data[m].workHours || 0), 0) / recent.length;
  const avgExpenses = recent.reduce((s, m) => s + calcTotalExpenses(data[m]), 0) / recent.length;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const remainingMonths = 12 - currentMonth + 1; // 今月含む

  const yearData = getCurrentYearData(data);
  const yearRevenue = Object.values(yearData).reduce((s, d) => s + (d.revenue || 0), 0);
  const predictedAnnual = yearRevenue + avgRevenue * (12 - Object.keys(yearData).length);

  return {
    predictedAnnual: Math.round(predictedAnnual),
    avgMonthlyRevenue: Math.round(avgRevenue),
    avgHourlyRate: avgHours > 0 ? Math.round(avgRevenue / avgHours) : 0,
    avgMonthlyExpenses: Math.round(avgExpenses),
  };
}

// ------ CSV エクスポート / インポート ------

/** CSVエクスポート */
export function exportToCSV(data) {
  const months = getSortedMonths(data);
  const headers = ['月', '売上', '稼働時間', ...EXPENSE_CATEGORIES];
  const rows = months.map(m => {
    const d = data[m];
    return [
      m,
      d.revenue || 0,
      d.workHours || 0,
      ...EXPENSE_CATEGORIES.map(cat => (d.expenses && d.expenses[cat]) || 0),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/** CSVインポート */
export function importFromCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return {};

  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;

    const month = cols[0].trim();
    const revenue = parseInt(cols[1]) || 0;
    const workHours = parseInt(cols[2]) || 0;
    const expenses = {};
    EXPENSE_CATEGORIES.forEach((cat, idx) => {
      expenses[cat] = parseInt(cols[3 + idx]) || 0;
    });

    data[month] = { revenue, workHours, expenses };
  }
  return data;
}
