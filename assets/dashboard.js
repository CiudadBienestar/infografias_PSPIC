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
  processos: {
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
let rawData = { acciones: [], processos: [] };
let filteredData = { acciones: [], processos: [] };
let combinedMode = true;
let activeTab = "acciones";

function disableFilters() {
  ["equipoFilter", "entornosFilter", "actividadFilter", "zonaFilter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });
}

function enableFilters() {
  ["equipoFilter", "entornosFilter", "actividadFilter", "zonaFilter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });
}

function getActiveTab() {
  return activeTab;
}

async function loadData() {
  const urls = Object.entries(SHEETS).map(([key, sheet]) =>
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${sheet.gid}`)
      .then((r) => r.text())
      .then((csv) => ({ key, data: Papa.parse(csv, { header: true }).data }))
  );

  const results = await Promise.all(urls);
  results.forEach(({ key, data }) => (rawData[key] = data));

  // Estado Inicial
  combinedMode = true;
  activeTab = "acciones";
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Activar contenido.
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      document.getElementById(`${btn.dataset.tab}-content`).classList.add("active");

      activeTab = btn.dataset.tab;
      combinedMode = false;

      // Resetear filtros
      document.querySelectorAll(".filter-select").forEach((el) => (el.value = ""));
      enableFilters();
      applyFiltersAndRender();
    });
  });

  updateSummaries();
  renderCharts();
  disableFilters();
}
function resetFilters() {
  document.querySelectorAll(".filter-select").forEach((el) => (el.value = ""));

  combinedMode = true;
  activeTab = "acciones";

  document.querySelectorAll(".tab-button").forEach(btn => {
    if (btn.dataset.tab === "acciones") {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  document.querySelectorAll(".tab-content").forEach(content => {
    if (content.id === "acciones-content") {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  disableFilters();
  updateSummaries();
  renderCharts();
}

document.getElementById("clearFilters").addEventListener("click", resetFilters);

document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    document.getElementById(`${btn.dataset.tab}-content`).classList.add("active");

    activeTab = btn.dataset.tab;
    combinedMode = false;

    document.querySelectorAll(".filter-select").forEach((el) => (el.value = ""));
    enableFilters();
    applyFiltersAndRender();
  });
});

function applyFiltersAndRender() {
  const tab = getActiveTab();
  const f = {
    equipo: document.getElementById("equipoFilter").value,
    entorno: document.getElementById("entornosFilter").value,
    actividad: document.getElementById("actividadFilter").value,
    zona: document.getElementById("zonaFilter").value,
  };

  const baseRows = rawData[tab];

  const filtered = baseRows.filter((r) => {
    return Object.entries(f).every(([k, v]) => {
      if (!v) return true;
      const key = k === "entornos" ? "entorno" : k;
      const col = SHEETS[tab].columns[key];
      return r[col]?.trim() === v;
    });
  });

  filteredData[tab] = filtered;

  updateSummaries();
  populateFilters();
  renderCharts();
}

function populateFilters() {
  const tab = getActiveTab();
  if (tab === "all") return;

  const filters = ["equipo", "entornos", "actividad", "zona"];

  const current = {
    equipo: document.getElementById("equipoFilter").value,
    entorno: document.getElementById("entornosFilter").value,
    actividad: document.getElementById("actividadFilter").value,
    zona: document.getElementById("zonaFilter").value,
  };

  filters.forEach((filter) => {
    const select = document.getElementById(`${filter}Filter`);
    if (!select) return;

    select.innerHTML = `<option value="">Todos</option>`;

    const key = filter === "entornos" ? "entorno" : filter;
    const col = SHEETS[tab].columns[key];

    const filteredRows = rawData[tab].filter((r) => {
      return Object.entries(current).every(([k, v]) => {
        if (!v || k === filter) return true;
        const colKey = k === "entornos" ? "entorno" : k;
        return r[SHEETS[tab].columns[colKey]]?.trim() === v;
      });
    });

    const values = new Set();
    filteredRows.forEach((r) => {
      if (r[col]) values.add(r[col].trim());
    });

    [...values].sort().forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      if (v === current[filter]) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = applyFiltersAndRender;
  });
}

function updateSummaries() {
  const tab = getActiveTab();

  if (combinedMode || tab === "all") {
    // Modo Combinado
    const accCount = rawData.acciones.length;
    const procCount = rawData.processos.length;

    document.getElementById("totalAcciones").textContent = accCount;
    document.getElementById("totalProcesos").textContent = procCount;
    document.getElementById("totalParticipantes").textContent = accCount + procCount;

    // Actividades Combinadas
    const actividadColAcc = SHEETS.acciones.columns.actividad;
    const actividadColProc = SHEETS.processos.columns.actividad;

    const allActs = new Set();
    rawData.acciones.forEach(r => {
      if (r[actividadColAcc]) allActs.add(r[actividadColAcc].trim());
    });
    rawData.processos.forEach(r => {
      if (r[actividadColProc]) allActs.add(r[actividadColProc].trim());
    });

    document.getElementById("totalZonas").textContent = allActs.size;
  } else if (tab === "acciones") {

    // Solo Acciones Informativas
    const accCount = filteredData.acciones.length;
    document.getElementById("totalAcciones").textContent = accCount;
    document.getElementById("totalProcesos").textContent = rawData.processos.length;
    document.getElementById("totalParticipantes").textContent = accCount;

    const acts = new Set(
      filteredData.acciones
        .map(r => r[SHEETS.acciones.columns.actividad]?.trim())
        .filter(Boolean)
    );
    document.getElementById("totalZonas").textContent = acts.size;
  } else if (tab === "processos") {

    // Solo Processos Formativos
    const procCount = filteredData.processos.length;
    document.getElementById("totalAcciones").textContent = rawData.acciones.length;
    document.getElementById("totalProcesos").textContent = procCount;
    document.getElementById("totalParticipantes").textContent = procCount;

    const procs = new Set(
      filteredData.processos
        .map(r => r[SHEETS.processos.columns.actividad]?.trim())
        .filter(Boolean)
    );
    document.getElementById("totalZonas").textContent = procs.size;
  }
}
function renderCharts() {
  const tab = getActiveTab();
  const combinedCount = rawData.acciones.length + rawData.processos.length;

  // Actualizar el contador de cada gráfica
  function updateChartCounter(counterId, data, columnName) {
    const el = document.getElementById(counterId);
    if (!el) return;

    const validCount = data.filter(r => r[columnName]?.trim()).length;
    el.textContent = validCount;
  }
  let accData = [];
  let procData = [];

  if (combinedMode) {
    accData = [...rawData.acciones, ...rawData.processos];
    procData = [...rawData.acciones, ...rawData.processos];
  } else {
    if (tab === "acciones") {
      accData = filteredData.acciones;
      procData = [];
    } else if (tab === "processos") {
      accData = [];
      procData = filteredData.processos;
    }

  }
  // --- Acciones: Curso de Vida ---
  renderChart(
    "accionesCursoChart",
    "Curso de Vida",
    accData,
    SHEETS.acciones.columns.curso,
    "accionesCursoCount"
  );
  updateChartCounter("accionesCursoCount", accData, SHEETS.acciones.columns.curso);;

  // --- Acciones: Sexo ---
  if (!combinedMode && tab === "acciones") {
    renderGender("accionesSexoContainer", "acciones");
    updateChartCounter("accionesSexoCount", filteredData.acciones, SHEETS.acciones.columns.sexo);
  }

  // --- Acciones: Etnia ---
  renderChart(
    "accionesEtniaChart",
    "Etnia",
    accData,
    SHEETS.acciones.columns.etnia,
    "accionesEtniaCount"
  );
  updateChartCounter("accionesEtniaCount", accData, SHEETS.acciones.columns.etnia);

  // --- Acciones: Zona ---
  renderChart(
    "accionesZonaChart",
    "Zona",
    accData,
    SHEETS.acciones.columns.zona,
    "accionesZonaCount",
    "doughnut"
  );
  updateChartCounter("accionesZonaCount", accData, SHEETS.acciones.columns.zona);

  // --- Acciones: Comuna ---
  renderChart(
    "accionesComunaChart",
    "Comuna/Corregimiento",
    accData,
    SHEETS.acciones.columns.comuna,
    "accionesComunaCount"
  );
  updateChartCounter("accionesComunaCount", accData, SHEETS.acciones.columns.comuna);

  // --- Processos: Curso de Vida ---
  renderChart(
    "processosCursoChart",
    "Curso de Vida",
    procData,
    SHEETS.processos.columns.curso,
    "processosCursoCount"
  );
  updateChartCounter("processosCursoCount", procData, SHEETS.processos.columns.curso);

  // --- Processos: Se Identifican Como ---
  if (!combinedMode && tab === "processos") {
    renderGender("processosIdentificaContainer", "processos");
    updateChartCounter("processosIdentificaCount", filteredData.processos, SHEETS.processos.columns.sexo);
  }

  // --- Processos: Preferencia Sexual ---
  renderChart(
    "processosPreferenciaChart",
    "Preferencia Sexual",
    procData,
    SHEETS.processos.columns.preferencia,
    "processosPreferenciaCount"
  );
  updateChartCounter("processosPreferenciaCount", procData, SHEETS.processos.columns.preferencia);

  // --- Processos: Etnia ---
  renderChart(
    "processosEtniaChart",
    "Etnia",
    procData,
    SHEETS.processos.columns.etnia,
    "processosEtniaCount"
  );
  updateChartCounter("processosEtniaCount", procData, SHEETS.processos.columns.etnia);

  // --- Processos: Escolaridad ---
  renderChart(
    "processosEscolaridadChart",
    "Escolaridad",
    procData,
    SHEETS.processos.columns.escolaridad,
    "processosEscolaridadCount"
  );
  updateChartCounter("processosEscolaridadCount", procData, SHEETS.processos.columns.escolaridad);

  // --- Processos: Discapacidad ---
  renderChart(
    "processosDiscapacidadChart",
    "Discapacidad",
    procData,
    SHEETS.processos.columns.discapacidad,
    "processosDiscapacidadCount"
  );
  updateChartCounter("processosDiscapacidadCount", procData, SHEETS.processos.columns.discapacidad);

  // --- Processos: Zona ---
  renderChart(
    "processosZonaChart",
    "Zona",
    procData,
    SHEETS.processos.columns.zona,
    "processosZonaCount",
    "doughnut"
  );
  updateChartCounter("processosZonaCount", procData, SHEETS.processos.columns.zona);

  // --- Processos: Comuna ---
  renderChart(
    "processosComunaChart",
    "Comuna/Corregimiento",
    procData,
    SHEETS.processos.columns.comuna,
    "processosComunaCount"
  );
  updateChartCounter("processosComunaCount", procData, SHEETS.processos.columns.comuna);

  // --- Processos: Salud ---
  renderChart(
    "processosSaludChart",
    "Tipo de Afiliación a Salud",
    procData,
    SHEETS.processos.columns.salud,
    "processosSaludCount",
    "pie"
  );
  updateChartCounter("processosSaludCount", procData, SHEETS.processos.columns.salud);

  // Mostrar/ocultar tarjetas
  const accionesGenderCard = document.getElementById("accionesSexoContainer")?.closest(".chart-card");
  const processGenderCard = document.getElementById("processosIdentificaContainer")?.closest(".chart-card");

  if (accionesGenderCard) {
    accionesGenderCard.style.display = combinedMode ? "none" : (tab === "acciones" ? "" : "none");
  }
  if (processGenderCard) {
    processGenderCard.style.display = combinedMode ? "none" : (tab === "processos" ? "" : "none");
  }
}
function renderChart(id, label, data, column, counterId, type = "bar", showLabels = false) {
  const validRows = data.filter(row => row[column]?.trim());
  const invalidCount = data.length - validRows.length;
  const ctx = document.getElementById(id)?.getContext("2d");
  if (!ctx) return;

  // Contar ocurrencias de cada valor
  const counts = {};
  data.forEach((row) => {
    const value = row[column]?.trim();
    if (value) counts[value] = (counts[value] || 0) + 1;
  });

  const total = data.length;

  // Ordenar entradas
  const sortedEntries = Object.entries(counts).sort(([a], [b]) => {
    const numA = a.match(/Comuna (\d+)/);
    const numB = b.match(/Comuna (\d+)/);
    if (numA && numB) return parseInt(numA[1]) - parseInt(numB[1]);
    return a.localeCompare(b);
  });

  // Etiquetas y valores
  const labels = sortedEntries.map(([label]) => {
    return label.length > 15 ? label.substring(0, 12) + "..." : label;
  });
  const values = sortedEntries.map(([_, count]) => count);
  const percentages = values.map(v => ((v / total) * 100).toFixed(1) + "%");

  // Deshacer gráfica anterior
  if (charts[id]) charts[id].destroy();

  // Colores
  const multiColors = ["#0072ce", "#00b5e2", "#00a878", "#f4a261", "#e76151", "#e63946", "#ffb703", "#6d597a"];
  const bgColor = (type === "pie" || type === "doughnut") ? multiColors : "rgba(0, 114, 206, 0.7)";
  const borderColor = (type === "pie" || type === "doughnut") ? multiColors : "rgba(0, 114, 206, 1)";

  // Crear nueva gráfica
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
        padding: { left: 10, right: 10, top: 10, bottom: 10 },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            padding: 20,
            font: { size: 10 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const fullLabel = sortedEntries[context.dataIndex][0];
              return `${fullLabel}: ${context.raw} (${percentages[context.dataIndex]})`;
            },
          },
        },
        datalabels: showLabels ? {
          color: '#111827',
          anchor: 'end',
          align: 'top',
          font: {
            size: 9,
            weight: 'bold',
          },
          formatter: function (value, context) {
            return `${value} (${percentages[context.dataIndex]})`;
          }
        } : false,
      },
      scales: type === "bar" ? {
        y: {
          beginAtZero: true,
          ticks: { autoSkip: true, maxTicksLimit: 10 },
        },
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 },
          },
        },
      } : {},
    },
    plugins: showLabels ? [ChartDataLabels] : [],
  });

  // Actualizar contador
  if (counterId) {
    const validTotal = data.filter(row => row[column]?.trim()).length;
    document.getElementById(counterId).textContent = validTotal;
  }


  // Registros sin dato
  const chartCard = document.getElementById(id)?.closest(".chart-card");
  if (chartCard) {
    let warningNote = chartCard.querySelector(".missing-note");
    if (!warningNote) {
      warningNote = document.createElement("div");
      warningNote.className = "missing-note";
      warningNote.style.fontSize = "0.8rem";
      warningNote.style.color = "#e63946";
      warningNote.style.marginTop = "6px";
      chartCard.appendChild(warningNote);
    }

    const porcentajeVacio = ((invalidCount / data.length) * 100).toFixed(1);
    warningNote.innerHTML =
      invalidCount > 0
        ? `<span class="text">${invalidCount} registro${invalidCount > 1 ? "s" : ""} sin dato (${porcentajeVacio}%)</span>`
        : "";
  }

  // Botón de descarga
  if (chartCard) {
    let downloadBtn = chartCard.querySelector(".download-btn");
    if (!downloadBtn) {
      downloadBtn = document.createElement("button");
      downloadBtn.className = "download-btn";
      downloadBtn.innerHTML = "⬇️";
      downloadBtn.title = "Descargar gráfica";
      downloadBtn.style.cssText = `
            position: absolute;
            top: bottom;
            left: 12px;
            background: white;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            box-shadow: 0 1px 6px rgba(0,0,0,0.2);
            font-size: 16px;
        `;
      downloadBtn.addEventListener("click", () => {
        const canvas = document.getElementById(id);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
        link.click();
      });
      chartCard.style.position = "relative";
      chartCard.appendChild(downloadBtn);
    }
  }
}
function renderGender(containerId, datasetKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = filteredData[datasetKey];
  const column = SHEETS[datasetKey].columns.sexo;

  const male = data.filter((r) => {
    const value = r[column]?.toLowerCase().trim();
    return value === "hombre" || value === "masculino";
  }).length;

  const female = data.filter((r) => {
    const value = r[column]?.toLowerCase().trim();
    return value === "mujer" || value === "femenino";
  }).length;

  const total = male + female;

  container.querySelector(".male-count").textContent = male;
  container.querySelector(".female-count").textContent = female;

  if (total > 0) {
    container.querySelector(".male-percentage").textContent =
      ((male / total) * 100).toFixed(1) + "%";
    container.querySelector(".female-percentage").textContent =
      ((female / total) * 100).toFixed(1) + "%";
  } else {
    container.querySelector(".male-percentage").textContent = "0%";
    container.querySelector(".female-percentage").textContent = "0%";
  }

  // Actualizar contador superior derecho
  if (datasetKey == "acciones") {
    const counter = document.getElementById("accionesSexoCount");
    if (counter) counter.textContent = total;
  } else if (datasetKey == "processos") {
    const counter = document.getElementById("processosIdentificaCount");
    if (counter) counter.textContent = total;
  }

  // Agregar botón de descarga gráficas
  const chartCard = container.closest(".chart-card");
  if (chartCard) {
    let downloadBtn = chartCard.querySelector(".download-btn");
    if (!downloadBtn) {
      downloadBtn = document.createElement("button");
      downloadBtn.className = "download-btn";
      downloadBtn.innerHTML = "⬇️";
      downloadBtn.title = "Descargar tarjeta";

      downloadBtn.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: #f8fafc;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        color: #003865;
      `;

      downloadBtn.addEventListener("click", () => {
        html2canvas(chartCard).then((canvas) => {
          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
          link.click();
        });
      });

      chartCard.style.position = "relative";
      chartCard.appendChild(downloadBtn);
    }

    // Registros vacíos
    const totalRegistros = data.length;
    const totalConDato = male + female;
    const registrosVacios = totalRegistros - totalConDato;

    let warningNote = chartCard.querySelector(".missing-note");
    if (!warningNote) {
      warningNote = document.createElement("div");
      warningNote.className = "missing-note";
      chartCard.appendChild(warningNote);
    }

    const porcentajeVacio = ((registrosVacios / totalRegistros) * 100).toFixed(1);
    warningNote.innerHTML =
      registrosVacios > 0
        ? `<span class="icon">⚠️</span> <span class="text">${registrosVacios} registro${registrosVacios > 1 ? "s" : ""} sin dato (${porcentajeVacio}%)</span>`
        : "";
  }
}
// Inicializar
loadData().then(() => {
  disableFilters();
  populateFilters();
  applyFiltersAndRender();
});
function disableChartAnimations() {
  Chart.defaults.animation = false;
  Chart.defaults.animations.colors = false;
  Chart.defaults.transitions.active.animation.duration = 0;
}
function enableChartAnimations() {
  Chart.defaults.animation = true;
  Chart.defaults.animations.colors = true;
  Chart.defaults.transitions.active.animation.duration = 1000;
}
function getCurrentActivityName() {
  const actividad = document.getElementById("actividadFilter")?.value?.trim();
  return actividad || null;
}
function getCurrentFilterContext() {
  const equipo = document.getElementById("equipoFilter")?.value?.trim();
  const actividad = getCurrentActivityName();

  if (combinedMode) {
    return "Reporte General - Información Participantes Procesos Formativos - Acciones Informativas y Eventos Conmemorativos";
  }
  if (getActiveTab() === "acciones") {
    let context = `Reporte de Acciones Masivas e Informativas`;
    if (equipo) context += ` - Equipo: ${equipo}`;
    if (actividad) context += ` - Actividad: ${actividad}`;
    return context;
  }
  if (getActiveTab() === "processos") {
    let context = `Reporte de Procesos Formativos`;
    if (equipo) context += ` - Equipo: ${equipo}`;
    if (actividad) context += ` - Actividad: ${actividad}`;
    return context;
  }
  return "Reporte PSPIC";
}
async function captureChartAsImage(chartId, title) {
  const chartElement = document.getElementById(chartId)?.closest(".chart-card");

  if (!chartElement || chartElement.style.display === "none") {
    console.warn(`El gráfico "${title}" no está visible o no existe.`);
    return null;
  }

  try {
    const canvas = await html2canvas(chartElement, { backgroundColor: "#ffffff", scale: 2 });
    return {
      dataURL: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height
    };
  } catch (error) {
    console.error(`Error capturando el gráfico "${title}":`, error);
    return null;
  }
}
async function captureGenderCard(cardId, title) {
  const container = document.getElementById(cardId)?.closest(".chart-card");

  if (!container || container.style.display === "none") {
    console.warn(`La tarjeta "${title}" no está visible o no existe.`);
    return null;
  }

  try {
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 2 });
    return {
      dataURL: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height
    };
  } catch (error) {
    console.error(`Error capturando la tarjeta "${title}":`, error);
    return null;
  }
}
async function renderAllChartsForPDF() {
  const tab = getActiveTab();
  let accData = [];
  let procData = [];

  if (combinedMode) {
    accData = [...rawData.acciones];
    procData = [...rawData.processos];
  } else if (tab === "acciones") {
    accData = [...filteredData.acciones];
  } else if (tab === "processos") {
    procData = [...filteredData.processos];
  }

  if (accData.length) {
    renderChart("accionesCursoChart", "Curso de Vida", accData, SHEETS.acciones.columns.curso, "accionesCursoCount", "bar", true);
    document.getElementById("accionesCursoChart")?.offsetHeight;

    renderChart("accionesEtniaChart", "Etnia", accData, SHEETS.acciones.columns.etnia, "accionesEtniaCount", "bar", true);
    document.getElementById("accionesEtniaChart")?.offsetHeight;

    renderChart("accionesZonaChart", "Zona", accData, SHEETS.acciones.columns.zona, "accionesZonaCount", "bar", true);
    document.getElementById("accionesZonaChart")?.offsetHeight;

    renderChart("accionesComunaChart", "Comuna", accData, SHEETS.acciones.columns.comuna, "accionesComunaCount", "bar", true);
    document.getElementById("accionesComunaChart")?.offsetHeight;
  }

  if (procData.length) {
    renderChart("processosCursoChart", "Curso de Vida", procData, SHEETS.processos.columns.curso, "processosCursoCount", "bar", true);
    document.getElementById("processosCursoChart")?.offsetHeight;

    renderChart("processosPreferenciaChart", "Preferencia Sexual", procData, SHEETS.processos.columns.preferencia, "processosPreferenciaCount", "bar", true);
    document.getElementById("processosPreferenciaChart")?.offsetHeight;

    renderChart("processosEtniaChart", "Etnia", procData, SHEETS.processos.columns.etnia, "processosEtniaCount", "bar", true);
    document.getElementById("processosEtniaChart")?.offsetHeight;

    renderChart("processosEscolaridadChart", "Escolaridad", procData, SHEETS.processos.columns.escolaridad, "processosEscolaridadCount", "bar", true);
    document.getElementById("processosEscolaridadChart")?.offsetHeight;

    renderChart("processosDiscapacidadChart", "Discapacidad", procData, SHEETS.processos.columns.discapacidad, "processosDiscapacidadCount", "bar", true);
    document.getElementById("processosDiscapacidadChart")?.offsetHeight;

    renderChart("processosZonaChart", "Zona", procData, SHEETS.processos.columns.zona, "processosZonaCount", "bar", true);
    document.getElementById("processosZonaChart")?.offsetHeight;

    renderChart("processosComunaChart", "Comuna", procData, SHEETS.processos.columns.comuna, "processosComunaCount", "bar", true);
    document.getElementById("processosComunaChart")?.offsetHeight;

    renderChart("processosSaludChart", "Afiliación a Salud", procData, SHEETS.processos.columns.salud, "processosSaludCount", "bar", true);
    document.getElementById("processosSaludChart")?.offsetHeight;
  }
  await new Promise(resolve => setTimeout(resolve, 400));
}

let chartCount = 0;
let chartX = 15;
let chartY = 60;
let rowHeight = 65;

async function addChartImage(imageData, title) {
  if (!imageData) return;

  const pageWidth = 210;
  const margin = 15;
  const colWidth = (pageWidth - margin * 2) / 2 - 5;
  const imgWidth = colWidth;
  const imgHeight = (imageData.height * imgWidth) / imageData.width;
  const finalHeight = Math.min(imgHeight, rowHeight);

  if (chartCount % 4 === 0 && chartCount !== 0) {
    pdf.addPage();
    chartY = margin;
    chartX = margin;
  } else if (chartCount % 2 === 0) {
    chartX = margin;
    chartY += rowHeight + 10;
  } else {
    chartX = margin + colWidth + 10;
  }

  pdf.addImage(imageData.dataURL, 'PNG', chartX, chartY, imgWidth, finalHeight);
  chartCount++;
}
const PDF_CONFIG = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 15,
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    text: '#1e293b',
    lightGray: '#f8fafc',
    border: '#e2e8f0'
  },
  fonts: {
    title: { size: 18, style: 'bold' },
    subtitle: { size: 14, style: 'bold' },
    body: { size: 11, style: 'normal' },
    caption: { size: 9, style: 'normal' },
    small: { size: 8, style: 'normal' }
  }
};

class PDFLayoutManager {
  constructor(pdf) {
    this.pdf = pdf;
    this.currentY = PDF_CONFIG.margin;
    this.pageWidth = PDF_CONFIG.pageWidth;
    this.pageHeight = PDF_CONFIG.pageHeight;
    this.margin = PDF_CONFIG.margin;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  checkNewPage(requiredHeight = 20) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin - 15) {
      this.pdf.addPage();
      this.currentY = this.margin;
      return true;
    }
    return false;
  }

  addVerticalSpace(space = 5) {
    this.currentY += space;
  }

  setFont(type = 'body') {
    const font = PDF_CONFIG.fonts[type];
    this.pdf.setFontSize(font.size);
    this.pdf.setFont('helvetica', font.style);
  }

  addTitle(text, type = 'title', color = PDF_CONFIG.colors.primary) {
    this.checkNewPage(20);
    this.setFont(type);
    this.pdf.setTextColor(color);
    this.pdf.text(text, this.margin, this.currentY);
    this.currentY += PDF_CONFIG.fonts[type].size * 0.6;
    this.addVerticalSpace(5);
  }

  addText(text, type = 'body', align = 'left', color = PDF_CONFIG.colors.text) {
    this.setFont(type);
    this.pdf.setTextColor(color);

    const lines = this.pdf.splitTextToSize(text, this.contentWidth);
    lines.forEach(line => {
      this.checkNewPage(PDF_CONFIG.fonts[type].size * 0.6);
      if (align === 'center') {
        this.pdf.text(line, this.pageWidth / 2, this.currentY, { align: 'center' });
      } else if (align === 'right') {
        this.pdf.text(line, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      } else {
        this.pdf.text(line, this.margin, this.currentY);
      }
      this.currentY += PDF_CONFIG.fonts[type].size * 0.6;
    });
  }

  addDivider(color = PDF_CONFIG.colors.border) {
    this.addVerticalSpace(3);
    this.pdf.setDrawColor(color);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.addVerticalSpace(8);
  }

  addBox(x, y, width, height, fillColor = null, borderColor = PDF_CONFIG.colors.border) {
    if (fillColor) {
      this.pdf.setFillColor(fillColor);
      this.pdf.rect(x, y, width, height, 'F');
    }
    this.pdf.setDrawColor(borderColor);
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(x, y, width, height, 'S');
  }
}
async function captureChartAsImageOptimized(chartId, title) {
  const chartElement = document.getElementById(chartId)?.closest(".chart-card");
  if (!chartElement || chartElement.style.display === "none") {
    console.warn(`El gráfico "${title}" no está visible o no existe.`);
    return null;
  }

  try {
    const chart = charts[chartId];
    if (chart) {
      chart.update('none'); // Actualizar sin animación
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    return await html2canvas(chartElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: true,
      onclone: (clonedDoc) => {

        const clonedChart = clonedDoc.getElementById(chartId);
        if (clonedChart) {
          clonedChart.style.visibility = 'visible';
          clonedChart.style.opacity = '1';
        }
      }
    }).then(canvas => ({
      dataURL: canvas.toDataURL("image/png", 0.95),
      width: canvas.width,
      height: canvas.height,
      title: title
    }));
  } catch (error) {
    console.error(`Error capturando el gráfico "${title}":`, error);
    return null;
  }
}

// ==================== GENERADOR DE PORTADA ===================

async function generateCoverPage(pdf, layout) {
  const logoImg = new Image();
  logoImg.src = "assets/logo.png";

  await new Promise((resolve) => {
    logoImg.onload = resolve;
    logoImg.onerror = resolve;
  });

  // Logo
  try {
    const logoNaturalWidth = logoImg.naturalWidth || 400;
    const logoNaturalHeight = logoImg.naturalHeight || 100;

    // Tamaño 
    const maxLogoWidth = 90;
    const maxLogoHeight = 60;

    let logoWidth = maxLogoWidth;
    let logoHeight = (logoNaturalHeight / logoNaturalWidth) * logoWidth;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = (logoNaturalWidth / logoNaturalHeight) * logoHeight;
    }

    const logoX = layout.pageWidth / 2 - logoWidth / 2;
    const logoY = layout.margin;

    pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);

    layout.currentY = logoY + logoHeight + 10;
  } catch (e) {
    console.warn('No se pudo cargar el logo');
  }

  layout.currentY = 60;
  layout.addBox(layout.margin, layout.currentY - 5, layout.contentWidth, 45, PDF_CONFIG.colors.lightGray);

  layout.currentY += 15;
  layout.setFont('title');
  pdf.setFontSize(22);
  pdf.setTextColor(PDF_CONFIG.colors.primary);

  const titulo = "REPORTE PLAN DE SALUD PÚBLICA DE INTERVENCIONES COLECTIVAS";
  const lineasTitulo = pdf.splitTextToSize(titulo, layout.contentWidth - 20);
  lineasTitulo.forEach(linea => {
    pdf.text(linea, layout.pageWidth / 2, layout.currentY, { align: 'center' });
    layout.currentY += 8;
  });

  layout.addVerticalSpace(7);
  layout.addText("Análisis Gráfico Cobertura Poblacional PSPIC", 'subtitle', 'center', PDF_CONFIG.colors.secondary);
  layout.addText("2025", 'body', 'center', PDF_CONFIG.colors.accent);

  // Línea decorativa
  layout.addVerticalSpace(20);
  pdf.setDrawColor(PDF_CONFIG.colors.primary);
  pdf.setLineWidth(2);
  pdf.line(layout.margin + 40, layout.currentY, layout.pageWidth - layout.margin - 40, layout.currentY);

  // Contexto del reporte
  layout.addVerticalSpace(25);
  const context = getCurrentFilterContext();
  layout.addBox(layout.margin + 10, layout.currentY - 5, layout.contentWidth - 20, 30, PDF_CONFIG.colors.lightGray);
  layout.currentY += 10;
  layout.addText(context, 'subtitle', 'center', PDF_CONFIG.colors.text);

  // Fecha y metadatos
  layout.currentY = layout.pageHeight - 80;
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  layout.addText(`Generado el: ${fecha}`, 'caption', 'center', PDF_CONFIG.colors.secondary);
  layout.addText("Sistema de Información Ciudad Bienestar - SICB", 'small', 'center', PDF_CONFIG.colors.secondary);
}

// ==================== RESUMEN ====================

function generateSummarySection(pdf, layout) {
  layout.addTitle("RESUMEN EJECUTIVO", 'title');

  // Crear tarjetas
  const summaryData = [
    {
      label: "Participantes en Acciones",
      value: document.getElementById("totalAcciones")?.textContent || "0",
      color: '#3b82f6'
    },
    {
      label: "Participantes en Procesos",
      value: document.getElementById("totalProcesos")?.textContent || "0",
      color: '#10b981'
    },
    {
      label: "Total General",
      value: document.getElementById("totalParticipantes")?.textContent || "0",
      color: '#f59e0b'
    },
    {
      label: "Total de Actividades",
      value: document.getElementById("totalZonas")?.textContent || "0",
      color: '#8b5cf6'
    }
  ];

  const cardWidth = (layout.contentWidth - 10) / 2;
  const cardHeight = 25;
  let cardX = layout.margin;
  let cardY = layout.currentY;

  summaryData.forEach((item, index) => {
    if (index % 2 === 0) {
      cardX = layout.margin;
      if (index > 0) cardY += cardHeight + 5;
    } else {
      cardX = layout.margin + cardWidth + 5;
    }

    layout.addBox(cardX, cardY, cardWidth, cardHeight, PDF_CONFIG.colors.lightGray);
    pdf.setDrawColor(item.color);
    pdf.setLineWidth(2);
    pdf.line(cardX, cardY, cardX + cardWidth, cardY);

    // Contenido de la tarjeta
    pdf.setTextColor(PDF_CONFIG.colors.text);
    layout.setFont('caption');
    pdf.text(item.label, cardX + 5, cardY + 8);

    layout.setFont('subtitle');
    pdf.setTextColor(item.color);
    pdf.text(item.value, cardX + cardWidth - 5, cardY + 18, { align: 'right' });
  });

  layout.currentY = cardY + cardHeight + 15;
}

async function addOptimizedChart(pdf, layout, imageData, title) {
  if (!imageData) return;

  layout.checkNewPage(80);

  // Título del gráfico
  layout.addText(title, 'subtitle', 'left', PDF_CONFIG.colors.primary);
  layout.addVerticalSpace(5);

  try {
    const maxWidth = layout.contentWidth;
    const maxHeight = 100;
    const aspectRatio = imageData.width / imageData.height;

    let imgWidth = maxWidth;
    let imgHeight = imgWidth / aspectRatio;

    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight * aspectRatio;
    }
    const imgX = layout.margin + (layout.contentWidth - imgWidth) / 2;

    layout.addBox(imgX - 2, layout.currentY - 2, imgWidth + 4, imgHeight + 4,
      PDF_CONFIG.colors.lightGray, PDF_CONFIG.colors.border);

    pdf.addImage(imageData.dataURL, 'PNG', imgX, layout.currentY, imgWidth, imgHeight);
    layout.currentY += imgHeight + 15;

  } catch (error) {
    console.warn(`⚠️ No se pudo agregar la imagen "${title}" al PDF.`, error);
    layout.addText(`[Gráfico no disponible: ${title}]`, 'caption', 'center', PDF_CONFIG.colors.secondary);
    layout.addVerticalSpace(10);
  }
}
async function generateOptimizedPDFReport() {
  const { jsPDF } = window.jspdf;
  const originalTab = getActiveTab();
  const originalCombinedMode = combinedMode;
  const originalFilteredData = JSON.parse(JSON.stringify(filteredData));
  const pdf = new jsPDF('p', 'mm', 'a4');
  const layout = new PDFLayoutManager(pdf);

  // Indicador de carga
  const loadingIndicator = createLoadingIndicator();
  document.body.appendChild(loadingIndicator);

  try {
    // ========== PORTADA ==========
    updateLoadingIndicator(loadingIndicator, "Generando portada...");
    await generateCoverPage(pdf, layout);

    // ========== RESUMEN ==========
    pdf.addPage();
    layout.currentY = layout.margin;
    updateLoadingIndicator(loadingIndicator, "Creando resumen ejecutivo...");
    generateSummarySection(pdf, layout);

    // ========== PREPARAR GRÁFICOS ==========
    updateLoadingIndicator(loadingIndicator, "Preparando gráficos...");
    disableChartAnimations();
    await renderAllChartsForPDF();
    await new Promise(resolve => setTimeout(resolve, 200));

    updateLoadingIndicator(loadingIndicator, "Capturando gráficos...");

    pdf.addPage();
    layout.currentY = layout.margin;
    layout.addTitle("ANÁLISIS GRÁFICO", 'title');
    layout.addDivider();

    const chartsList = getChartsListForCurrentMode();
    let chartsProcessed = 0;

    for (const { id, title, section } of chartsList) {
      if (section && chartsProcessed > 0) {
        layout.addTitle(section, 'subtitle', PDF_CONFIG.colors.accent);
        layout.addVerticalSpace(5);
      }

      updateLoadingIndicator(loadingIndicator, `Procesando: ${title}... (${chartsProcessed + 1}/${chartsList.length})`);

      const imageData = await captureChartAsImageOptimized(id, title);
      await addOptimizedChart(pdf, layout, imageData, title);

      chartsProcessed++;
    }
    // ========== TARJETAS DE GÉNERO ==========
    const genderCards = [
      { id: "accionesSexoContainer", title: "Distribución por Sexo - Acciones" },
      { id: "processosIdentificaContainer", title: "Identificación de Género - Procesos" }
    ];

    for (const card of genderCards) {
      updateLoadingIndicator(loadingIndicator, `Procesando: ${card.title}...`);
      const genderImg = await captureChartAsImageOptimized(card.id, card.title);
      await addOptimizedChart(pdf, layout, genderImg, card.title);
    }

    // ========== PIE DE PÁGINA ==========
    addProfessionalFooters(pdf, layout);

    combinedMode = originalCombinedMode;
    activeTab = originalTab;
    filteredData = JSON.parse(JSON.stringify(originalFilteredData));
    applyFiltersAndRender();

    // ========== GUARDAR ARCHIVO ==========
    updateLoadingIndicator(loadingIndicator, "Finalizando reporte...");
    enableChartAnimations();

    const filename = `Reporte_PSPIC_${new Date().toISOString().slice(0, 10)}_${Date.now()}.pdf`;
    pdf.save(filename);

    showSuccessMessage(loadingIndicator, filename);

  } catch (error) {
    console.error("Error generando reporte:", error);
    showErrorMessage(loadingIndicator, error.message);
    enableChartAnimations();
  }
}
function createLoadingIndicator() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.95); color: white; z-index: 9999;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  loadingIndicator.innerHTML = `
    <div style="text-align: center;">
      <div style="width: 60px; height: 60px; border: 4px solid #334155; border-top: 4px solid #3b82f6; 
                  border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 10px;">Generando Reporte PDF</div>
      <div id="loading-status" style="font-size: 14px; color: #94a3b8;">Iniciando proceso...</div>
      <div style="width: 300px; height: 4px; background: #334155; border-radius: 2px; margin: 20px auto; overflow: hidden;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); 
                                     transition: width 0.3s ease; border-radius: 2px;"></div>
      </div>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;

  return loadingIndicator;
}
function updateLoadingIndicator(indicator, message) {
  const statusElement = indicator.querySelector('#loading-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}
function showSuccessMessage(indicator, filename) {
  indicator.innerHTML = `
    <div style="text-align: center; color: #10b981;">
      <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 10px;">¡Reporte Generado Exitosamente!</div>
      <div style="font-size: 14px; color: #94a3b8;">${filename}</div>
    </div>
  `;
  setTimeout(() => document.body.removeChild(indicator), 3000);
}

function showErrorMessage(indicator, errorMsg) {
  indicator.innerHTML = `
    <div style="text-align: center; color: #ef4444;">
      <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 10px;">Error al Generar Reporte</div>
      <div style="font-size: 14px; color: #94a3b8;">${errorMsg}</div>
    </div>
  `;
  setTimeout(() => document.body.removeChild(indicator), 4000);
}
function getChartsListForCurrentMode() {
  const baseCharts = {
    acciones: [
      { id: 'accionesCursoChart', title: 'Distribución por Curso de Vida', section: 'ACCIONES MASIVAS E INFORMATIVAS' },
      { id: 'accionesEtniaChart', title: 'Distribución por Etnia' },
      { id: 'accionesZonaChart', title: 'Distribución por Zona' },
      { id: 'accionesComunaChart', title: 'Distribución por Comuna' }
    ],
    processos: [
      { id: 'processosCursoChart', title: 'Distribución por Curso de Vida', section: 'PROCESOS FORMATIVOS' },
      { id: 'processosPreferenciaChart', title: 'Distribución por Preferencia Sexual' },
      { id: 'processosEtniaChart', title: 'Distribución por Etnia' },
      { id: 'processosEscolaridadChart', title: 'Distribución por Escolaridad' },
      { id: 'processosDiscapacidadChart', title: 'Distribución por Discapacidad' },
      { id: 'processosZonaChart', title: 'Distribución por Zona de Residencia' },
      { id: 'processosComunaChart', title: 'Distribución por Comuna/Corregimiento' },
      { id: 'processosSaludChart', title: 'Afiliación a Salud' }
    ]
  };

  const tab = getActiveTab();

  if (combinedMode) {
    return baseCharts.acciones;
  } else if (tab === "acciones") {
    return baseCharts.acciones;
  } else if (tab === "processos") {
    return baseCharts.processos;
  }

  return [];
}
function addProfessionalFooters(pdf, layout) {
  const totalPages = pdf.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Línea superior pie de página
    pdf.setDrawColor(PDF_CONFIG.colors.border);
    pdf.setLineWidth(0.3);
    pdf.line(layout.margin, layout.pageHeight - 20, layout.pageWidth - layout.margin, layout.pageHeight - 20);

    // Texto pie de página
    layout.setFont('small');
    pdf.setTextColor(PDF_CONFIG.colors.secondary);

    // Nombre del sistema
    pdf.text("Plan de Salud Pública de Intervenciones Colectivas - PSPIC 2025",
      layout.margin, layout.pageHeight - 12);

    // Numeración
    pdf.text(`Página ${i} de ${totalPages}`,
      layout.pageWidth - layout.margin, layout.pageHeight - 12, { align: 'right' });
  }
}

async function generatePDFReport() {
  return await generateOptimizedPDFReport();
}

// ==================== INICIO ===================

document.addEventListener('DOMContentLoaded', function () {
  const downloadBtn = document.getElementById('downloadReportBtn');
  if (downloadBtn) {
    // Limpiar eventos existentes
    const newBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

    // Agregar el nuevo evento
    newBtn.addEventListener('click', generateOptimizedPDFReport);

    // Mejorar el estilo del botón
    newBtn.style.cssText += `
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: none; border-radius: 8px; padding: 12px 24px;
      color: white; font-weight: 600; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
    `;

    newBtn.addEventListener('mouseenter', () => {
      newBtn.style.transform = 'translateY(-1px)';
      newBtn.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.35)';
    });

    newBtn.addEventListener('mouseleave', () => {
      newBtn.style.transform = 'translateY(0)';
      newBtn.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.25)';
    });
  }
});
function disableChartAnimations() {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.animation = false;
    Chart.defaults.animations.colors = false;
    Chart.defaults.transitions.active.animation.duration = 0;
  }
}
// Función habilitar animaciones
function enableChartAnimations() {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.animation = true;
    Chart.defaults.animations.colors = true;
    Chart.defaults.transitions.active.animation.duration = 1000;
  }
}
// Función renderizar gráficos
async function renderAllChartsForPDF() {
  if (typeof renderChart === 'function') {
    const tab = typeof getActiveTab === 'function' ? getActiveTab() : 'acciones';
    let accData = [];
    let procData = [];

    if (typeof combinedMode !== 'undefined' && combinedMode) {
      if (typeof rawData !== 'undefined') {
        accData = [...(rawData.acciones || [])];
        procData = [...(rawData.processos || [])];
      }
    } else if (tab === "acciones") {
      if (typeof filteredData !== 'undefined') {
        accData = [...(filteredData.acciones || [])];
      }
    } else if (tab === "processos") {
      if (typeof filteredData !== 'undefined') {
        procData = [...(filteredData.processos || [])];
      }
    }

    // Renderizar gráficos 
    if (accData.length && typeof SHEETS !== 'undefined') {
      try {
        renderChart("accionesCursoChart", "Curso de Vida", accData, SHEETS.acciones?.columns?.curso, "accionesCursoCount", "bar", true);
        renderChart("accionesEtniaChart", "Etnia", accData, SHEETS.acciones?.columns?.etnia, "accionesEtniaCount", "bar", true);
        renderChart("accionesZonaChart", "Zona", accData, SHEETS.acciones?.columns?.zona, "accionesZonaCount", "bar", true);
        renderChart("accionesComunaChart", "Comuna", accData, SHEETS.acciones?.columns?.comuna, "accionesComunaCount", "bar", true);
      } catch (e) {
        console.warn('Error renderizando gráficos de acciones:', e);
      }
    }

    if (procData.length && typeof SHEETS !== 'undefined') {
      try {
        renderChart("processosCursoChart", "Curso de Vida", procData, SHEETS.processos?.columns?.curso, "processosCursoCount", "bar", true);
        renderChart("processosPreferenciaChart", "Preferencia Sexual", procData, SHEETS.processos?.columns?.preferencia, "processosPreferenciaCount", "bar", true);
        renderChart("processosEtniaChart", "Etnia", procData, SHEETS.processos?.columns?.etnia, "processosEtniaCount", "bar", true);
        renderChart("processosEscolaridadChart", "Escolaridad", procData, SHEETS.processos?.columns?.escolaridad, "processosEscolaridadCount", "bar", true);
        renderChart("processosDiscapacidadChart", "Discapacidad", procData, SHEETS.processos?.columns?.discapacidad, "processosDiscapacidadCount", "bar", true);
        renderChart("processosZonaChart", "Zona", procData, SHEETS.processos?.columns?.zona, "processosZonaCount", "bar", true);
        renderChart("processosComunaChart", "Comuna", procData, SHEETS.processos?.columns?.comuna, "processosComunaCount", "bar", true);
        renderChart("processosSaludChart", "Afiliación a Salud", procData, SHEETS.processos?.columns?.salud, "processosSaludCount", "bar", true);
      } catch (e) {
        console.warn('Error renderizando gráficos de procesos:', e);
      }
    }
  }
  // Espera renderizado completo
  await new Promise(resolve => setTimeout(resolve, 400));
}
