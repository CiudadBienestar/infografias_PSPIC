const SHEET_ID = "1srJaMCHuNcwcKVyLbKOAREf03BNn88jeSkD5qyvN42E";
const SHEETS = {
  acciones: {
    gid: "759616433",
    columns: {
      equipo: "Equipo/Problemática",
      entorno: "Entornos Abordados",
      actividad: "Actividad/Proceso",
      zona: "Zona",
      curso: "Curso de Vida",
      sexo: "Sexo",
      etnia: "Etnia",
      comuna: "Comuna/Corregimiento",
    },
  },
  procesos: {
    gid: "20459118",
    columns: {
      equipo: "Equipo/Problemática",
      entorno: "Entornos Abordados",
      actividad: "Actividad/Proceso",
      zona: "Zona",
      curso: "Curso de Vida",
      sexo: "Se identifica como",
      preferencia: "Preferencia Sexual",
      etnia: "Etnia",
      escolaridad: "Escolaridad",
      discapacidad: "Posee algún tipo de Discapacidad",
      comuna: "Comuna/Corregimiento",
      salud: "Tipo de afiliación a Salud",
    },
  },
};

const charts = {};
let rawData = { acciones: [], procesos: [] };
let filteredData = { acciones: [], procesos: [] };

async function loadData() {
  const urls = Object.entries(SHEETS).map(([key, sheet]) =>
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${sheet.gid}`)
      .then((r) => r.text())
      .then((csv) => ({ key, data: Papa.parse(csv, { header: true }).data }))
  );

  const results = await Promise.all(urls);
  results.forEach(({ key, data }) => (rawData[key] = data));
  applyFiltersAndRender();
  populateFilters();
}

function getActiveTab() {
  return document.querySelector(".tab-button.active")?.dataset.tab || "acciones";
}

function populateFilters() {
  const activeTab = getActiveTab();
  const filters = ["equipo", "entornos", "actividad", "zona"];

  filters.forEach((filter) => {
    const select = document.getElementById(`${filter}Filter`);
    select.innerHTML = '<option value="">Todos</option>';

    const values = new Set();
    rawData[activeTab].forEach((row) => {
      const key = filter === "entornos" ? "entorno" : filter;
      const col = SHEETS[activeTab].columns[key];
      if (row[col]) values.add(row[col].trim());
    });

    [...values].sort().forEach((val) => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });

    select.addEventListener("change", applyFiltersAndRender);
  });
}

function applyFiltersAndRender() {
  const filters = {
    equipo: document.getElementById("equipoFilter").value,
    entorno: document.getElementById("entornosFilter").value,
    actividad: document.getElementById("actividadFilter").value,
    zona: document.getElementById("zonaFilter").value,
  };

  Object.keys(rawData).forEach((key) => {
    filteredData[key] = rawData[key].filter((row) => {
      return Object.keys(filters).every((f) => {
        if (!filters[f]) return true;
        const col = SHEETS[key].columns[f];
        return row[col]?.trim() === filters[f];
      });
    });
  });

  updateSummaries();
  renderCharts();
}

function updateSummaries() {
  document.getElementById("totalAcciones").textContent = filteredData.acciones.length;
  document.getElementById("totalProcesos").textContent = filteredData.procesos.length;
  document.getElementById("totalParticipantes").textContent = filteredData.acciones.length + filteredData.procesos.length;

  const zonas = new Set();
  [...filteredData.acciones, ...filteredData.procesos].forEach((row) => {
    const zonaCol = SHEETS[row.__sheet || "acciones"].columns.zona;
    if (row[zonaCol]) zonas.add(row[zonaCol].trim());
  });

  document.getElementById("totalZonas").textContent = zonas.size;
}

function renderCharts() {
  renderChart("accionesCursoChart", "Curso de Vida", filteredData.acciones, SHEETS.acciones.columns.curso, "accionesCursoCount");
  renderGender("accionesSexoContainer", "acciones");
  renderChart("accionesEtniaChart", "Etnia", filteredData.acciones, SHEETS.acciones.columns.etnia, "accionesEtniaCount");
  renderChart("accionesZonaChart", "Zona", filteredData.acciones, SHEETS.acciones.columns.zona, "accionesZonaCount", "doughnut");
  renderChart("accionesComunaChart", "Comuna/Corregimiento", filteredData.acciones, SHEETS.acciones.columns.comuna, "accionesComunaCount");

  renderChart("procesosCursoChart", "Curso de Vida", filteredData.procesos, SHEETS.procesos.columns.curso, "procesosCursoCount");
  renderGender("procesosIdentificaContainer", "procesos");
  renderChart("procesosPreferenciaChart", "Preferencia Sexual", filteredData.procesos, SHEETS.procesos.columns.preferencia, "procesosPreferenciaCount");
  renderChart("procesosEtniaChart", "Etnia", filteredData.procesos, SHEETS.procesos.columns.etnia, "procesosEtniaCount");
  renderChart("procesosEscolaridadChart", "Escolaridad", filteredData.procesos, SHEETS.procesos.columns.escolaridad, "procesosEscolaridadCount");
  renderChart("procesosDiscapacidadChart", "Discapacidad", filteredData.procesos, SHEETS.procesos.columns.discapacidad, "procesosDiscapacidadCount");
  renderChart("procesosZonaChart", "Zona", filteredData.procesos, SHEETS.procesos.columns.zona, "procesosZonaCount", "doughnut");
  renderChart("procesosComunaChart", "Comuna/Corregimiento", filteredData.procesos, SHEETS.procesos.columns.comuna, "procesosComunaCount");
  renderChart("procesosSaludChart", "Tipo de Afiliación a Salud", filteredData.procesos, SHEETS.procesos.columns.salud, "procesosSaludCount", "pie");
}

function renderChart(id, label, data, column, counterId, type = 'bar') {
  const ctx = document.getElementById(id)?.getContext("2d");
  if (!ctx) return;

  const counts = {};
  data.forEach((row) => {
    const value = row[column]?.trim();
    if (value) counts[value] = (counts[value] || 0) + 1;
  });

  const total = data.length;
  const sortedEntries = Object.entries(counts).sort(([a], [b]) => {
    // Orden especial para Comuna 1, Comuna 2, ..., Comuna 10
    const numA = a.match(/^Comuna (\d+)/);
    const numB = b.match(/^Comuna (\d+)/);

    if (numA && numB) {
      return parseInt(numA[1]) - parseInt(numB[1]);
    }

    // Orden alfabético para todo lo demás
    return a.localeCompare(b);
  });

  // Acortar etiquetas largas
  const labels = sortedEntries.map(([label]) => {
    if (label.length > 15) {
      return label.substring(0, 12) + '...';
    }
    return label;
  });
  
  const values = sortedEntries.map(([_, count]) => count);
  const percentages = values.map((v) => ((v / total) * 100).toFixed(1) + "%");

  if (charts[id]) charts[id].destroy();

  const multiColors = [
    '#0072ce', '#00b5e2', '#00a878', '#f4a261',
    '#e76f51', '#e63946', '#ffb703', '#6d597a'
  ];

  const bgColor = (type === 'pie' || type === 'doughnut') ? multiColors : 'rgba(0, 114, 206, 0.7)';
  const borderColor = (type === 'pie' || type === 'doughnut') ? multiColors : 'rgba(0, 114, 206, 1)';

  charts[id] = new Chart(ctx, {
    type: type,
    data: {
      labels,
      datasets: [{
        label: `${label} (%)`,
        data: values,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 20,
            font: {
              size: 10
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const fullLabel = sortedEntries[context.dataIndex][0];
              return `${fullLabel}: ${context.raw} (${percentages[context.dataIndex]})`;
            },
          },
        },
      },
      scales: type === 'bar' ? {
        y: { 
          beginAtZero: true,
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          }
        }
      } : {},
    }
  });

  if (counterId) document.getElementById(counterId).textContent = total;
}

function renderGender(containerId, datasetKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = filteredData[datasetKey];
  const column = SHEETS[datasetKey].columns.sexo;

  const male = data.filter((r) => r[column]?.toLowerCase().trim() === "hombre").length;
  const female = data.filter((r) => r[column]?.toLowerCase().trim() === "mujer").length;

  const total = male + female;
  container.querySelector(".male-count").textContent = male;
  container.querySelector(".female-count").textContent = female;

  if (total > 0) {
    container.querySelector(".male-percentage").textContent = ((male / total) * 100).toFixed(1) + "%";
    container.querySelector(".female-percentage").textContent = ((female / total) * 100).toFixed(1) + "%";
  } else {
    container.querySelector(".male-percentage").textContent = "0%";
    container.querySelector(".female-percentage").textContent = "0%";
  }
}

document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`${btn.dataset.tab}-content`).classList.add("active");
    populateFilters();
    applyFiltersAndRender();
  });
});

loadData();
