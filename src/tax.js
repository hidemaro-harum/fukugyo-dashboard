/**
 * 副業収支ダッシュボード — 税金計算モジュール
 * 累進課税テーブル（所得税）+ 住民税 + 国保 + 国民年金
 */

// 令和7年 (2025年) 所得税の速算表
const INCOME_TAX_TABLE = [
  { limit: 1950000,   rate: 0.05,  deduction: 0 },
  { limit: 3300000,   rate: 0.10,  deduction: 97500 },
  { limit: 6950000,   rate: 0.20,  deduction: 427500 },
  { limit: 9000000,   rate: 0.23,  deduction: 636000 },
  { limit: 18000000,  rate: 0.33,  deduction: 1536000 },
  { limit: 40000000,  rate: 0.40,  deduction: 2796000 },
  { limit: Infinity,  rate: 0.45,  deduction: 4796000 },
];

// 住民税率（一律10%）
const RESIDENT_TAX_RATE = 0.10;
const RESIDENT_TAX_EQUALIZATION = 5000; // 均等割

// 国民年金（令和7年度）
const NATIONAL_PENSION_MONTHLY = 17510;
const NATIONAL_PENSION_ANNUAL = NATIONAL_PENSION_MONTHLY * 12;

// 基礎控除
const BASIC_DEDUCTION = 480000;

// 青色申告特別控除
const BLUE_RETURN_DEDUCTION = 650000;

/**
 * 所得税を計算（累進課税）
 * @param {number} taxableIncome - 課税所得
 * @returns {number} 所得税額
 */
function calcIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  for (const bracket of INCOME_TAX_TABLE) {
    if (taxableIncome <= bracket.limit) {
      return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  return 0;
}

/**
 * 住民税を計算
 * @param {number} taxableIncome - 課税所得
 * @returns {number} 住民税額
 */
function calcResidentTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  return Math.floor(taxableIncome * RESIDENT_TAX_RATE) + RESIDENT_TAX_EQUALIZATION;
}

/**
 * 国民健康保険料を概算
 * （自治体により異なるため概算値を使用）
 * @param {number} income - 所得金額
 * @returns {number} 年間国保料の概算
 */
function calcNationalHealthInsurance(income) {
  if (income <= 0) return 0;

  // 概算: 医療分 + 支援分 + 介護分（40歳未満は介護分なし）
  // 所得割率: 約8%（医療7.16% + 支援2.42%）
  // 均等割: 約5万円
  const incomeRate = 0.096;
  const equalRate = 50000;
  const baseIncome = Math.max(income - 430000, 0); // 基礎控除43万

  const calculated = Math.floor(baseIncome * incomeRate) + equalRate;

  // 上限額（医療65万 + 支援24万 = 89万）
  return Math.min(calculated, 890000);
}

/**
 * ふるさと納税の控除上限額を概算
 * @param {number} taxableIncome - 課税所得
 * @returns {number} ふるさと納税の上限額（目安）
 */
function calcFurusatoLimit(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  // 住民税所得割額の20%が目安
  const residentIncomePortion = taxableIncome * RESIDENT_TAX_RATE;
  const limit = Math.floor(residentIncomePortion * 0.20 + 2000);

  return limit;
}

/**
 * 手取りシミュレーション（メイン関数）
 * @param {Object} params
 * @param {number} params.annualRevenue - 年間売上
 * @param {number} params.annualExpenses - 年間経費
 * @param {boolean} params.blueReturn - 青色申告控除を適用するか
 * @param {number} params.smallBizMutualAid - 小規模企業共済の月額
 * @param {boolean} params.furusatoTax - ふるさと納税を活用するか
 * @returns {Object} 計算結果
 */
export function simulateTakeHome(params) {
  const {
    annualRevenue = 0,
    annualExpenses = 0,
    blueReturn = true,
    smallBizMutualAid = 70000,
    furusatoTax = true,
  } = params;

  // --- 控除なしの計算 ---
  const incomeNoDeduction = annualRevenue - annualExpenses;
  const taxableNoDeduction = Math.max(incomeNoDeduction - BASIC_DEDUCTION - NATIONAL_PENSION_ANNUAL, 0);
  const incomeTaxNo = calcIncomeTax(taxableNoDeduction);
  const residentTaxNo = calcResidentTax(taxableNoDeduction);
  const nhiNo = calcNationalHealthInsurance(incomeNoDeduction);
  const totalTaxNo = incomeTaxNo + residentTaxNo + nhiNo + NATIONAL_PENSION_ANNUAL;
  const takeHomeNo = annualRevenue - annualExpenses - totalTaxNo;

  // --- 控除ありの計算 ---
  let totalDeductions = BASIC_DEDUCTION + NATIONAL_PENSION_ANNUAL;

  // 青色申告控除
  if (blueReturn) {
    totalDeductions += BLUE_RETURN_DEDUCTION;
  }

  // 小規模企業共済
  const mutualAidAnnual = smallBizMutualAid * 12;
  totalDeductions += mutualAidAnnual;

  const incomeWithDeduction = annualRevenue - annualExpenses;
  const taxableWithDeduction = Math.max(incomeWithDeduction - totalDeductions, 0);
  const incomeTaxWith = calcIncomeTax(taxableWithDeduction);
  const residentTaxWith = calcResidentTax(taxableWithDeduction);
  const nhiWith = calcNationalHealthInsurance(incomeWithDeduction);

  // ふるさと納税
  let furusatoAmount = 0;
  if (furusatoTax) {
    furusatoAmount = calcFurusatoLimit(taxableWithDeduction);
  }

  const totalTaxWith = incomeTaxWith + residentTaxWith + nhiWith + NATIONAL_PENSION_ANNUAL + mutualAidAnnual;
  const takeHomeWith = annualRevenue - annualExpenses - totalTaxWith;

  return {
    // 控除なし
    noDeduction: {
      income: incomeNoDeduction,
      taxableIncome: taxableNoDeduction,
      incomeTax: incomeTaxNo,
      residentTax: residentTaxNo,
      nhi: nhiNo,
      pension: NATIONAL_PENSION_ANNUAL,
      totalTax: totalTaxNo,
      takeHome: takeHomeNo,
    },
    // 控除あり
    withDeduction: {
      income: incomeWithDeduction,
      taxableIncome: taxableWithDeduction,
      incomeTax: incomeTaxWith,
      residentTax: residentTaxWith,
      nhi: nhiWith,
      pension: NATIONAL_PENSION_ANNUAL,
      mutualAid: mutualAidAnnual,
      totalTax: totalTaxWith,
      takeHome: takeHomeWith,
    },
    // 節税効果
    savings: takeHomeWith - takeHomeNo + mutualAidAnnual, // 共済は「貯蓄」なので実質手取りに加算
    furusatoLimit: furusatoAmount,
  };
}

/**
 * 金額をフォーマットする
 * @param {number} amount - 金額
 * @returns {string} フォーマット済み文字列（例: ¥4,200,000）
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const prefix = amount < 0 ? '-¥' : '¥';
  return prefix + Math.abs(Math.round(amount)).toLocaleString('ja-JP');
}

/**
 * 金額を万円で表示
 * @param {number} amount - 金額
 * @returns {string}
 */
export function formatManYen(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return (amount / 10000).toFixed(1) + '万円';
}
