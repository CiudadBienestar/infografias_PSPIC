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

  // Set initial state
  combinedMode = true;
  activeTab = "acciones";

  // Initialize UI
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Activar contenido...
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      document.getElementById(`${btn.dataset.tab}-content`).classList.add("active");

      activeTab = btn.dataset.tab;
      combinedMode = false;

      // Resetear filtros y volver a renderizar
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

  // Reset UI to initial state
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
    // Combined view
    const accCount = rawData.acciones.length;
    const procCount = rawData.processos.length;

    document.getElementById("totalAcciones").textContent = accCount;
    document.getElementById("totalProcesos").textContent = procCount;
    document.getElementById("totalParticipantes").textContent = accCount + procCount;

    // Combined activities
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
    // Solo Acciones
    const accCount = filteredData.acciones.length;
    document.getElementById("totalAcciones").textContent = accCount;
    document.getElementById("totalProcesos").textContent = rawData.processos.length;
    document.getElementById("totalParticipantes").textContent = accCount;

    // Actividades distintas en acciones
    const acts = new Set(
      filteredData.acciones
        .map(r => r[SHEETS.acciones.columns.actividad]?.trim())
        .filter(Boolean)
    );
    document.getElementById("totalZonas").textContent = acts.size;
  } else if (tab === "processos") {
    // Solo Processos
    const procCount = filteredData.processos.length;
    document.getElementById("totalAcciones").textContent = rawData.acciones.length;
    document.getElementById("totalProcesos").textContent = procCount;
    document.getElementById("totalParticipantes").textContent = procCount;

    // Processos distintos
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

  // Function auxiliar para actualizar el contador de cada chart
  function updateChartCounter(counterId, data, columnName) {
    const el = document.getElementById(counterId);
    if (!el) return;

    const validCount = data.filter(r => r[columnName]?.trim()).length;
    el.textContent = validCount;
  }


  // --- Determinar qué datos usar ---
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

  // Mostrar/ocultar tarjetas de género según el modo
  const accionesGenderCard = document.getElementById("accionesSexoContainer")?.closest(".chart-card");
  const processGenderCard = document.getElementById("processosIdentificaContainer")?.closest(".chart-card");

  if (accionesGenderCard) {
    accionesGenderCard.style.display = combinedMode ? "none" : (tab === "acciones" ? "" : "none");
  }
  if (processGenderCard) {
    processGenderCard.style.display = combinedMode ? "none" : (tab === "processos" ? "" : "none");
  }
}

function renderChart(id, label, data, column, counterId, type = "bar") {
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
    // Orden especial para Comuna 1, Comuna 2, ..., Comuna 10
    const numA = a.match(/Comuna (\d+)/);
    const numB = b.match(/Comuna (\d+)/);
    if (numA && numB) {
      return parseInt(numA[1]) - parseInt(numB[1]);
    }
    // Orden alfabético para todo lo demás
    return a.localeCompare(b);
  });

  // Acortar etiquetas largas
  const labels = sortedEntries.map(([label]) => {
    if (label.length > 15) {
      return label.substring(0, 12) + "...";
    }
    return label;
  });

  const values = sortedEntries.map(([_, count]) => count);
  const percentages = values.map((v) => ((v / total) * 100).toFixed(1) + "%");

  // Destruir gráfica anterior si existe
  if (charts[id]) charts[id].destroy();

  // Configurar colores
  const multiColors = [
    "#0072ce",
    "#00b5e2",
    "#00a878",
    "#f4a261",
    "#e76151",
    "#e63946",
    "#ffb703",
    "#6d597a",
  ];

  const bgColor = type == "pie" || type == "doughnut"
    ? multiColors
    : "rgba(0, 114, 206, 0.7)";
  const borderColor = type == "pie" || type == "doughnut"
    ? multiColors
    : "rgba(0, 114, 206, 1)";

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
        padding: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            padding: 20,
            font: {
              size: 10,
            },
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
      },
      scales: type == "bar" ? {
        y: {
          beginAtZero: true,
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10,
            },
          },
        },
      } : {},
    },
  });

  if (counterId) document.getElementById(counterId).textContent = total;
  // Mostrar nota de registros vacíos
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
    warningNote.innerHTML = invalidCount > 0
      ? `<span class="icon">⚠️</span> <span class="text">${invalidCount} registro${invalidCount > 1 ? "s" : ""} sin dato</span>`
      : "";
  }
  // Agregar botón de descarga
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

  // Actualizar contador superior derecho según el dataset
  if (datasetKey == "acciones") {
    const counter = document.getElementById("accionesSexoCount");
    if (counter) counter.textContent = total;
  } else if (datasetKey == "processos") {
    const counter = document.getElementById("processosIdentificaCount");
    if (counter) counter.textContent = total;
  }

  // ✅ Agregar botón de descarga para ambos casos
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
          link.download = datasetKey === "acciones" ? "sexo.png" : "se_identifica_como.png";
          link.click();
        });
      });

      chartCard.style.position = "relative";
      chartCard.appendChild(downloadBtn);
    }

    // Mostrar nota de registros vacíos
    const totalRegistros = data.length;
    const totalConDato = male + female;
    const registrosVacios = totalRegistros - totalConDato;

    let warningNote = chartCard.querySelector(".missing-note");
    if (!warningNote) {
      warningNote = document.createElement("div");
      warningNote.className = "missing-note";
      chartCard.appendChild(warningNote);
    }

    warningNote.innerHTML =
      registrosVacios > 0
        ? `<span class="icon">⚠️</span> <span class="text">${registrosVacios} registro${registrosVacios > 1 ? "s" : ""} sin dato</span>`
        : "";
  }
}
// Inicializar la aplicación
loadData().then(() => {
  disableFilters();
  populateFilters();
  applyFiltersAndRender();
});
