document.addEventListener('DOMContentLoaded', () => {});


// Vercelのサーバレス関数（環境変数GAS_API_URLを参照）
const API_URL = '/api/gas';

// HTMLの要素を取得
const loadingElement = document.getElementById('loading');
const chartCanvas = document.getElementById('myChart');

// データを非同期で取得し、グラフを描画
fetch(API_URL)
  .then(response => {
    // レスポンスが正常か確認
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // ローディングメッセージを非表示にする
    loadingElement.style.display = 'none';

    // 返却スキーマに合わせて、全シリーズの全日付をユニオンし昇順に並べる
    const seriesArray = Array.isArray(data) ? data : [];
    const allDateSet = new Set();
    seriesArray.forEach(s => {
      (s?.data || []).forEach(p => {
        if (p && p.date) allDateSet.add(p.date);
      });
    });
    const labels = Array.from(allDateSet).sort((a, b) => new Date(a) - new Date(b));

    // 列順（返却順）に固定色を割り当て
    const COLOR_PALETTE = ['#ef4444','#22c55e','#60a5fa','#f59e0b','#a78bfa','#14b8a6','#f43f5e','#84cc16','#f472b6'];

    // 各シリーズを labels に合わせて整列（欠損日は null）
    const datasets = seriesArray.map((s, i) => {
      const color = COLOR_PALETTE[i % COLOR_PALETTE.length];
      const map = new Map((s?.data || []).map(p => [p.date, Number(p.viewCount)]));
      const values = labels.map(d => (map.has(d) ? map.get(d) : null));
      return {
        label: s?.title || `シリーズ ${i + 1}`,
        data: values,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.25),
        tension: 0.25,
        pointRadius: 2
      };
    });

    // Chart.jsの設定
    if (!chartCanvas) {
      console.warn('Canvas要素 #myChart が見つかりません。');
      return;
    }
    const myChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: '日付'
            }
          },
          y: {
            title: {
              display: true,
              text: '再生数'
            },
            min: 0 // Y軸の最小値を0に設定
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
          hover: {
            mode: 'nearest',
            intersect: true
          }
        }
      }
    });

    // カスタム凡例を描画
    renderCustomLegend(myChart);

  })
  .catch(error => {
    console.error('データの取得に失敗しました:', error);
    loadingElement.textContent = 'データの読み込みに失敗しました。';
  });

// HEXカラーを rgba に変換
function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value.length === 3
    ? value.split('').map(c => c + c).join('')
    : value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// カスタム凡例（3列グリッド、クリックで表示/非表示）
function renderCustomLegend(chart) {
  const container = document.getElementById('customLegend');
  if (!container) return;
  container.innerHTML = '';

  const { datasets } = chart.data;
  datasets.forEach((ds, index) => {
    const item = document.createElement('div');
    item.className = 'legend-item' + (chart.isDatasetVisible(index) ? '' : ' disabled');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-pressed', String(chart.isDatasetVisible(index)));
    item.dataset.index = String(index);

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor;

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = ds.label || `シリーズ ${index + 1}`;

    item.appendChild(swatch);
    item.appendChild(label);

    item.addEventListener('click', () => {
      const visible = chart.isDatasetVisible(index);
      chart.setDatasetVisibility(index, !visible);
      item.classList.toggle('disabled', visible);
      item.setAttribute('aria-pressed', String(!visible));
      chart.update('none');
    });

    container.appendChild(item);
  });
}
