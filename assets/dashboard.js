
document.addEventListener("DOMContentLoaded", () => {
  Tabletop.init({
    key: GOOGLE_SHEET_ID,
    simpleSheet: false,
    wanted: [SHEET_NAMES.acciones, SHEET_NAMES.procesos],
    callback: onDataLoaded
  });
});

function onDataLoaded(data) {
  const acciones = data[SHEET_NAMES.acciones].elements;
  const procesos = data[SHEET_NAMES.procesos].elements;

  document.getElementById("counters").innerHTML = `
    <div><strong>Acciones Masivas:</strong> ${acciones.length}</div>
    <div><strong>Procesos Formativos:</strong> ${procesos.length}</div>
  `;

  document.getElementById("charts").innerHTML = `
    <div style="text-align:center;">
      <h2>Curso de Vida - Acciones</h2>
      <canvas id="cursoVidaAcciones"></canvas>
    </div>
    <div style="text-align:center;">
      <h2>Curso de Vida - Procesos</h2>
      <canvas id="cursoVidaProcesos"></canvas>
    </div>
  `;

  drawBarChart("cursoVidaAcciones", acciones.map(a => a["Curso de Vida"]));
  drawBarChart("cursoVidaProcesos", procesos.map(p => p["Curso de Vida"]));
}

function drawBarChart(canvasId, dataArray) {
  const counts = {};
  dataArray.forEach(v => {
    if (!counts[v]) counts[v] = 0;
    counts[v]++;
  });
  const labels = Object.keys(counts);
  const data = Object.values(counts);

  const ctx = document.getElementById(canvasId).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Cantidad",
        data,
        backgroundColor: "#f97316"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: function(ctx) {
            const total = data.reduce((a, b) => a + b, 0);
            const percent = ((ctx.parsed.y / total) * 100).toFixed(1);
            return `${ctx.parsed.y} (${percent}%)`;
          }
        }}
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
