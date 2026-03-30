/**
 * 副業収支ダッシュボード — グラフ描画モジュール
 * Chart.js を使ったグラフの初期化と更新
 */
import {
  Chart,
  LineController,
  DoughnutController,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js のモジュールを登録
Chart.register(
  LineController,
  DoughnutController,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend
);

// Chart.js のデフォルトスタイル（ダークモード対応）
Chart.defaults.color = '#9898b0';
Chart.defaults.borderColor = 'rgba(42, 42, 64, 0.5)';
Chart.defaults.font.family = "'Inter', 'Noto Sans JP', sans-serif";

/** カラーパレット */
const COLORS = {
  revenue: '#6c5ce7',
  revenueBg: 'rgba(108, 92, 231, 0.1)',
  expense: '#e17055',
  expenseBg: 'rgba(225, 112, 85, 0.1)',
  net: '#00cec9',
  netBg: 'rgba(0, 206, 201, 0.1)',
  hourly: '#00b894',
  hourlyBg: 'rgba(0, 184, 148, 0.1)',
  target: '#fdcb6e',
  categories: ['#6c5ce7', '#00cec9', '#e17055', '#fdcb6e', '#00b894'],
};

let revenueChart = null;
let hourlyChart = null;
let expenseChart = null;

/**
 * 収支推移グラフの初期化 / 更新
 */
export function updateRevenueChart(labels, revenues, expenses, nets) {
  const ctx = document.getElementById('chart-revenue');
  if (!ctx) return;

  if (revenueChart) {
    revenueChart.data.labels = labels;
    revenueChart.data.datasets[0].data = revenues;
    revenueChart.data.datasets[1].data = expenses;
    revenueChart.data.datasets[2].data = nets;
    revenueChart.update();
    return;
  }

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '売上',
          data: revenues,
          borderColor: COLORS.revenue,
          backgroundColor: COLORS.revenueBg,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: '経費',
          data: expenses,
          borderColor: COLORS.expense,
          backgroundColor: COLORS.expenseBg,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: '手取り',
          data: nets,
          borderColor: COLORS.net,
          backgroundColor: COLORS.netBg,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.2,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e8e8f0',
          bodyColor: '#9898b0',
          borderColor: '#2a2a40',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.parsed.y.toLocaleString()}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `¥${(v / 10000).toFixed(0)}万`,
          },
          grid: {
            color: 'rgba(42, 42, 64, 0.3)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

/**
 * 時給推移グラフの初期化 / 更新
 */
export function updateHourlyChart(labels, hourlyRates, targetRate) {
  const ctx = document.getElementById('chart-hourly');
  if (!ctx) return;

  const targetData = labels.map(() => targetRate);

  if (hourlyChart) {
    hourlyChart.data.labels = labels;
    hourlyChart.data.datasets[0].data = hourlyRates;
    hourlyChart.data.datasets[1].data = targetData;
    hourlyChart.update();
    return;
  }

  hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '実績時給',
          data: hourlyRates,
          borderColor: COLORS.hourly,
          backgroundColor: COLORS.hourlyBg,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
        },
        {
          label: '目標時給',
          data: targetData,
          borderColor: COLORS.target,
          borderDash: [8, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.2,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e8e8f0',
          bodyColor: '#9898b0',
          borderColor: '#2a2a40',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ¥${ctx.parsed.y.toLocaleString()}/h`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (v) => `¥${v.toLocaleString()}`,
          },
          grid: {
            color: 'rgba(42, 42, 64, 0.3)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

/**
 * 経費内訳ドーナツチャートの初期化 / 更新
 */
export function updateExpenseChart(categories, amounts) {
  const ctx = document.getElementById('chart-expense');
  if (!ctx) return;

  if (expenseChart) {
    expenseChart.data.labels = categories;
    expenseChart.data.datasets[0].data = amounts;
    expenseChart.update();
    return;
  }

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: COLORS.categories,
          borderColor: '#1a1a2e',
          borderWidth: 3,
          hoverBorderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#e8e8f0',
          bodyColor: '#9898b0',
          borderColor: '#2a2a40',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return `${ctx.label}: ¥${ctx.parsed.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}
