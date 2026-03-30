/**
 * 副業収支ダッシュボード — メインエントリーポイント
 * 全モジュールを統合し、UIの初期化とイベント処理を行う
 */
import './style.css';
import {
  getAllData, saveMonthData, deleteMonthData,
  getSettings, saveSettings, loadDemoData,
  calcTotalExpenses, calcNetIncome, calcHourlyRate,
  getSortedMonths, calcAnnualRevenue, calcForecast,
  EXPENSE_CATEGORIES, exportToCSV, importFromCSV,
  getCurrentYearData,
} from './data.js';
import { simulateTakeHome, formatCurrency } from './tax.js';
import { updateRevenueChart, updateHourlyChart, updateExpenseChart } from './charts.js';

// ===== DOM 要素 =====
const $ = (id) => document.getElementById(id);

// ===== 初期化 =====
function init() {
  setupEventListeners();
  refreshAll();
}

// ===== 全画面を再描画 =====
function refreshAll() {
  const data = getAllData();
  const settings = getSettings();

  updateGoalBar(data, settings);
  updateCharts(data, settings);
  updateForecast(data, settings);
  updateDataTable(data);
  updateSimulator();
}

// ===== 年収目標プログレスバー =====
function updateGoalBar(data, settings) {
  const annualRevenue = calcAnnualRevenue(data);
  const goal = settings.annualGoal || 4200000;
  const percent = goal > 0 ? Math.min((annualRevenue / goal) * 100, 100) : 0;

  const yearData = getCurrentYearData(data);
  const monthsWithData = Object.keys(yearData).length;
  const now = new Date();
  const remainingMonths = 12 - now.getMonth(); // 残りの月（今月含まない）

  $('goal-progress').style.width = `${percent}%`;
  $('goal-glow').style.width = `${percent}%`;
  $('goal-amount').textContent = `${formatCurrency(annualRevenue)} / ${formatCurrency(goal)}`;
  $('goal-percent').textContent = `${percent.toFixed(1)}%`;
  $('goal-remaining').textContent = `残り ${formatCurrency(goal - annualRevenue)}（${remainingMonths}ヶ月）`;

  // 100%達成の祝福
  const goalSection = $('goal-section');
  if (percent >= 100) {
    goalSection.classList.add('celebrated');
    $('goal-percent').textContent = '🎉 達成！';
  } else {
    goalSection.classList.remove('celebrated');
  }
}

// ===== グラフ更新 =====
function updateCharts(data, settings) {
  const months = getSortedMonths(data);
  if (months.length === 0) return;

  // ラベル（YYYY-MM → M月）
  const labels = months.map(m => {
    const [, month] = m.split('-');
    return `${parseInt(month)}月`;
  });

  // 収支推移データ
  const revenues = months.map(m => data[m].revenue || 0);
  const expenses = months.map(m => calcTotalExpenses(data[m]));
  const nets = months.map(m => calcNetIncome(data[m]));

  updateRevenueChart(labels, revenues, expenses, nets);

  // 時給推移データ
  const hourlyRates = months.map(m => calcHourlyRate(data[m]));
  updateHourlyChart(labels, hourlyRates, settings.targetHourlyRate || 17500);

  // 経費内訳（最新月 or 年間合計）
  updateExpenseBreakdown(data, 'month');
}

function updateExpenseBreakdown(data, period) {
  const months = getSortedMonths(data);
  if (months.length === 0) return;

  if (period === 'month') {
    // 最新月のデータ
    const latest = data[months[months.length - 1]];
    const amounts = EXPENSE_CATEGORIES.map(cat =>
      (latest.expenses && latest.expenses[cat]) || 0
    );
    updateExpenseChart(EXPENSE_CATEGORIES, amounts);
  } else {
    // 年間合計
    const totals = EXPENSE_CATEGORIES.map(cat => {
      return months.reduce((sum, m) => {
        return sum + ((data[m].expenses && data[m].expenses[cat]) || 0);
      }, 0);
    });
    updateExpenseChart(EXPENSE_CATEGORIES, totals);
  }
}

// ===== 年間予測 =====
function updateForecast(data, settings) {
  const forecast = calcForecast(data);
  if (!forecast) {
    $('forecast-amount').textContent = '—';
    $('forecast-vs-goal').textContent = '—';
    $('forecast-avg').textContent = '—';
    $('forecast-hourly').textContent = '—';
    return;
  }

  $('forecast-amount').textContent = formatCurrency(forecast.predictedAnnual);

  const goal = settings.annualGoal || 4200000;
  const vsGoal = ((forecast.predictedAnnual / goal - 1) * 100).toFixed(1);
  const sign = vsGoal >= 0 ? '+' : '';
  $('forecast-vs-goal').textContent = `${sign}${vsGoal}%`;
  $('forecast-vs-goal').style.color = vsGoal >= 0 ? '#00b894' : '#e17055';

  $('forecast-avg').textContent = formatCurrency(forecast.avgMonthlyRevenue);
  $('forecast-hourly').textContent = `${formatCurrency(forecast.avgHourlyRate)}/h`;
}

// ===== データテーブル =====
function updateDataTable(data) {
  const tbody = $('data-table-body');
  const empty = $('table-empty');
  const months = getSortedMonths(data);

  if (months.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = months.map(month => {
    const d = data[month];
    const expenses = calcTotalExpenses(d);
    const net = calcNetIncome(d);
    const hourly = calcHourlyRate(d);

    return `
      <tr>
        <td>${month}</td>
        <td>${formatCurrency(d.revenue)}</td>
        <td>${d.workHours || 0}h</td>
        <td>${formatCurrency(hourly)}/h</td>
        <td>${formatCurrency(expenses)}</td>
        <td>${formatCurrency(net)}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn--ghost btn--sm" onclick="window.__editMonth('${month}')">✏️</button>
            <button class="btn btn--ghost btn--sm" onclick="window.__deleteMonth('${month}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== シミュレーター =====
function updateSimulator() {
  const simInput = $('sim-revenue');
  let revenue = parseInt(simInput?.value) || 0;

  // 入力が空の場合、年間予測か目標値をデフォルト入力
  if (revenue === 0) {
    const data = getAllData();
    const forecast = calcForecast(data);
    const settings = getSettings();
    if (forecast && forecast.predictedAnnual > 0) {
      revenue = forecast.predictedAnnual;
    } else if (settings.annualGoal > 0) {
      revenue = settings.annualGoal;
    }
    if (revenue > 0 && simInput) {
      simInput.value = revenue;
    }
  }

  if (revenue === 0) {
    $('sim-no-deduction').textContent = '—';
    $('sim-with-deduction').textContent = '—';
    $('sim-savings').textContent = '—';
    $('sim-furusato-limit').textContent = '—';
    $('sim-furusato-note').textContent = '';
    return;
  }

  const data = getAllData();
  const months = getSortedMonths(data);
  let annualExpenses = 0;
  if (months.length > 0) {
    const avgExpense = months.reduce((s, m) => s + calcTotalExpenses(data[m]), 0) / months.length;
    annualExpenses = Math.round(avgExpense * 12);
  }

  const result = simulateTakeHome({
    annualRevenue: revenue,
    annualExpenses,
    blueReturn: $('sim-blue')?.checked ?? true,
    smallBizMutualAid: parseInt($('sim-mutual')?.value) || 0,
    furusatoTax: $('sim-furusato')?.checked ?? true,
  });

  $('sim-no-deduction').textContent = formatCurrency(result.noDeduction.takeHome);
  $('sim-with-deduction').textContent = formatCurrency(result.withDeduction.takeHome);
  $('sim-savings').textContent = `+${formatCurrency(result.savings)}`;

  // ふるさと納税上限額
  const furusatoCard = $('sim-furusato-card');
  if ($('sim-furusato')?.checked && result.furusatoLimit > 0) {
    furusatoCard.style.display = '';
    $('sim-furusato-limit').textContent = formatCurrency(result.furusatoLimit);
    $('sim-furusato-note').textContent = `※ 自己負担2,000円で約${formatCurrency(result.furusatoLimit - 2000)}分の返礼品`;
  } else {
    furusatoCard.style.display = 'none';
  }
}

// ===== イベントリスナー =====
function setupEventListeners() {
  // データ入力モーダル
  $('btn-add-data')?.addEventListener('click', () => openModal());
  $('modal-close')?.addEventListener('click', () => closeModal());
  $('modal-cancel')?.addEventListener('click', () => closeModal());
  $('modal-save')?.addEventListener('click', () => saveModalData());
  $('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // 設定モーダル
  $('btn-settings')?.addEventListener('click', () => openSettings());
  $('settings-close')?.addEventListener('click', () => closeSettings());
  $('settings-cancel')?.addEventListener('click', () => closeSettings());
  $('settings-save')?.addEventListener('click', () => saveSettingsModal());
  $('settings-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'settings-overlay') closeSettings();
  });
  $('btn-load-demo')?.addEventListener('click', () => {
    loadDemoData();
    closeSettings();
    refreshAll();
  });

  // シミュレーター
  $('sim-revenue')?.addEventListener('input', () => updateSimulator());
  $('sim-blue')?.addEventListener('change', () => updateSimulator());
  $('sim-mutual')?.addEventListener('input', () => {
    const val = parseInt($('sim-mutual').value) || 0;
    $('sim-mutual-display').textContent = formatCurrency(val);
    updateSimulator();
  });
  $('sim-furusato')?.addEventListener('change', () => updateSimulator());

  // 経費内訳の月別/年間切替
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      updateExpenseBreakdown(getAllData(), e.target.dataset.period);
    });
  });

  // CSV エクスポート
  $('btn-export')?.addEventListener('click', () => {
    const csv = exportToCSV(getAllData());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fukugyo_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // CSV インポート
  $('btn-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imported = importFromCSV(ev.target.result);
        const existing = getAllData();
        const merged = { ...existing, ...imported };
        localStorage.setItem('fukugyo_monthly_data', JSON.stringify(merged));
        refreshAll();
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // グローバル関数（テーブルのボタン用）
  window.__editMonth = (month) => openModal(month);
  window.__deleteMonth = (month) => {
    if (confirm(`${month} のデータを削除しますか？`)) {
      deleteMonthData(month);
      refreshAll();
    }
  };
}

// ===== モーダル操作 =====
function openModal(editMonth = null) {
  const overlay = $('modal-overlay');
  overlay.classList.add('active');

  if (editMonth) {
    const data = getAllData();
    const d = data[editMonth];
    if (d) {
      $('input-month').value = editMonth;
      $('input-revenue').value = d.revenue || '';
      $('input-hours').value = d.workHours || '';
      $('input-exp-comm').value = d.expenses?.['通信費'] || '';
      $('input-exp-trans').value = d.expenses?.['交通費'] || '';
      $('input-exp-supply').value = d.expenses?.['消耗品費'] || '';
      $('input-exp-rent').value = d.expenses?.['家賃（按分）'] || '';
      $('input-exp-utility').value = d.expenses?.['水道光熱費（按分）'] || '';
    }
  } else {
    // 新規: 今月をデフォルトで設定
    const now = new Date();
    $('input-month').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    $('input-revenue').value = '';
    $('input-hours').value = '';
    $('input-exp-comm').value = '';
    $('input-exp-trans').value = '';
    $('input-exp-supply').value = '';
    $('input-exp-rent').value = '';
    $('input-exp-utility').value = '';
  }
}

function closeModal() {
  $('modal-overlay').classList.remove('active');
}

function saveModalData() {
  const month = $('input-month').value;
  if (!month) {
    alert('月を選択してください');
    return;
  }

  const data = {
    revenue: parseInt($('input-revenue').value) || 0,
    workHours: parseInt($('input-hours').value) || 0,
    expenses: {
      '通信費': parseInt($('input-exp-comm').value) || 0,
      '交通費': parseInt($('input-exp-trans').value) || 0,
      '消耗品費': parseInt($('input-exp-supply').value) || 0,
      '家賃（按分）': parseInt($('input-exp-rent').value) || 0,
      '水道光熱費（按分）': parseInt($('input-exp-utility').value) || 0,
    },
  };

  saveMonthData(month, data);
  closeModal();
  refreshAll();
}

// ===== 設定モーダル =====
function openSettings() {
  const settings = getSettings();
  $('settings-goal').value = settings.annualGoal || '';
  $('settings-hourly').value = settings.targetHourlyRate || '';
  $('settings-overlay').classList.add('active');
}

function closeSettings() {
  $('settings-overlay').classList.remove('active');
}

function saveSettingsModal() {
  const settings = getSettings();
  settings.annualGoal = parseInt($('settings-goal').value) || 4200000;
  settings.targetHourlyRate = parseInt($('settings-hourly').value) || 17500;
  saveSettings(settings);
  closeSettings();
  refreshAll();
}

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', init);
