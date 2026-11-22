const MONTHS_UPPER = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];
const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const TOTAL_PM_TOOLS = 70;
const ROSTER_STORAGE_KEY = "ToolSyncPM_70_Roster_v2";
const CELLS_STORAGE_KEY = "ToolSyncPM_Matrix_Cells_v2";
const SHARED_TOOLS_MIRROR_KEY = "ToolSyncPM_Tools_v1";

const INITIAL_30_TOOLS = [
    "145W410441-00202",
    "145W410461-00201",
    "145W410441-00207",
    "521140-007 OLD",
    "521185-003",
    "525024-001",
    "531686-004",
    "531686-005",
    "531856-002",
    "531866-001",
    "531890-001",
    "531890-008",
    "531898-001",
    "531898-002",
    "532046-003",
    "541047-001",
    "541048-001",
    "541405-003",
    "145W410522-00002",
    "145W410551-00011",
    "145W410551-00010",
    "145W410524-00005",
    "145W410524-00007",
    "145W330142-00008",
    "145W330142-00006",
    "145W311097-00003",
    "145W330160-00001",
    "145W330160-00019",
    "145W330160-00006",
    "145W330160-00027"
];

function escapeAttr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function showToast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("translate-y-20", "opacity-0");
    el.classList.add("translate-y-0", "opacity-100");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
        el.classList.remove("translate-y-0", "opacity-100");
        el.classList.add("translate-y-20", "opacity-0");
    }, 2200);
}

function createDefault70Roster() {
    const list = [];
    for (let i = 1; i <= TOTAL_PM_TOOLS; i++) {
        list.push(INITIAL_30_TOOLS[i - 1] || `TOOL-${String(i).padStart(3, "0")}`);
    }
    return list;
}

function loadRoster() {
    const defaults = createDefault70Roster();
    try {
        const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
        if (!raw) return defaults;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || !arr.length) return defaults;
        const out = [];
        for (let i = 0; i < TOTAL_PM_TOOLS; i++) {
            const val = String(arr[i] ?? defaults[i]).trim().toUpperCase();
            out.push(val || defaults[i]);
        }
        return out;
    } catch {
        return defaults;
    }
}

function saveRoster(roster) {
    try {
        localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster.slice(0, TOTAL_PM_TOOLS)));
    } catch {
        // Ignore storage errors
    }
}

function loadCellsMap() {
    try {
        const raw = localStorage.getItem(CELLS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") return parsed;
        }
    } catch {
        // Ignore storage errors
    }

    // Seed initial marks from existing localStorage mirror if present
    const seeded = {};
    try {
        const mirror = JSON.parse(localStorage.getItem(SHARED_TOOLS_MIRROR_KEY) || "[]");
        if (Array.isArray(mirror)) {
            mirror.forEach((item) => {
                if (item && item.toolCode && item.scheduledDate) {
                    const key = `${String(item.toolCode).trim().toUpperCase()}__${String(item.scheduledDate).trim()}`;
                    seeded[key] = String(item.pmMark || "P").trim().toUpperCase() || "P";
                }
            });
        }
    } catch {
        // Ignore mirror read errors
    }
    return seeded;
}

function saveCellsMap(mapObj) {
    try {
        localStorage.setItem(CELLS_STORAGE_KEY, JSON.stringify(mapObj));
        const mirrorList = Object.entries(mapObj).map(([key, mark]) => {
            const [toolCode, scheduledDate] = key.split("__");
            return {
                id: `fp_${toolCode}_${scheduledDate}`,
                toolCode,
                scheduledDate,
                pmMark: mark || "P",
                status: "Scheduled",
                remarks: ""
            };
        });
        localStorage.setItem(SHARED_TOOLS_MIRROR_KEY, JSON.stringify(mirrorList));
    } catch {
        // Ignore storage errors
    }
}

let activeYear = 2026;
let activeMonthIdx = 10; // November
let roster70 = loadRoster();
let cellsMap = loadCellsMap();

function getDaysInMonth(year, monthIdx) {
    return new Date(year, monthIdx + 1, 0).getDate();
}

function makeIsoDate(year, monthIdx, day) {
    return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function updateHeaderTitle() {
    const titleEl = document.getElementById("sheet-main-title");
    if (titleEl) {
        titleEl.textContent = `MOULD PREVENTIVE MAINTENANCE PLAN ${MONTHS_UPPER[activeMonthIdx]} - ${activeYear}`;
    }
    const badgeEl = document.getElementById("tool-count-badge");
    if (badgeEl) {
        badgeEl.textContent = `${roster70.length} Tools`;
    }
}

function renderDateColumns() {
    const headerRow = document.getElementById("pm-date-header-row");
    const slotTh = document.getElementById("date-headers-slot");
    if (!headerRow || !slotTh) return;

    const totalDays = getDaysInMonth(activeYear, activeMonthIdx);
    slotTh.colSpan = totalDays;

    const prefixCols = `
        <th class="sticky left-0 z-30 bg-[#0d1017] text-center py-1.5 text-stone-400">#</th>
        <th class="sticky left-14 z-30 bg-[#0d1017] px-3 py-1.5 text-left text-stone-400">
            Mould Code
        </th>
    `;

    const dateCols = [];
    for (let d = 1; d <= totalDays; d++) {
        dateCols.push(`
            <th class="py-1.5 px-1 text-center min-w-[42px] whitespace-nowrap">
                ${d}/${MONTHS_SHORT[activeMonthIdx]}
            </th>
        `);
    }

    headerRow.innerHTML = prefixCols + dateCols.join("");
}

function getFilteredRosterRows() {
    const q = (document.getElementById("tool-search-input")?.value || "").trim().toLowerCase();
    const rows = roster70.map((code, i) => ({ srNo: i + 1, code }));
    if (!q) return rows;
    return rows.filter(
        (r) => String(r.srNo) === q || r.code.toLowerCase().includes(q)
    );
}

function renderExcelGrid() {
    const tbody = document.getElementById("pm-matrix-tbody");
    if (!tbody) return;

    const totalDays = getDaysInMonth(activeYear, activeMonthIdx);
    const rows = getFilteredRosterRows();

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${totalDays + 2}" class="py-6 text-center text-stone-400">
                    No matching tool numbers found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows
        .map(({ srNo, code }) => {
            const dateCells = [];
            for (let d = 1; d <= totalDays; d++) {
                const iso = makeIsoDate(activeYear, activeMonthIdx, d);
                const cellKey = `${code}__${iso}`;
                const mark = cellsMap[cellKey] || "";
                const activeStyle = mark
                    ? "bg-emerald-500/20 text-emerald-300 font-bold"
                    : "bg-[#11151d] text-stone-500 hover:bg-stone-800/80";

                dateCells.push(`
                    <td class="p-0 text-center ${activeStyle}">
                        <button
                            type="button"
                            onclick="toggleMatrixCell('${escapeAttr(code)}', '${iso}')"
                            class="w-full h-8 flex items-center justify-center text-[11px] font-bold"
                            title="Sr ${srNo} | ${code} | ${iso}"
                        >
                            ${escapeAttr(mark)}
                        </button>
                    </td>
                `);
            }

            return `
                <tr>
                    <td class="sticky left-0 z-10 bg-[#11151d] py-1.5 px-2 text-center text-stone-400">
                        ${srNo}
                    </td>
                    <td class="sticky left-14 z-10 bg-[#11151d] py-1.5 px-3 font-bold text-stone-100 whitespace-nowrap">
                        <button
                            type="button"
                            onclick="editRosterTool(${srNo - 1})"
                            class="text-left hover:text-amber-300 w-full truncate"
                            title="Click to edit Tool Number #${srNo}"
                        >
                            ${escapeAttr(code)}
                        </button>
                    </td>
                    ${dateCells.join("")}
                </tr>
            `;
        })
        .join("");
}

window.toggleMatrixCell = function (toolCode, isoDate) {
    const key = `${toolCode}__${isoDate}`;
    if (cellsMap[key]) {
        delete cellsMap[key];
        saveCellsMap(cellsMap);
        renderExcelGrid();
        showToast(`Cleared mark for ${toolCode} (${isoDate})`);
    } else {
        cellsMap[key] = "P";
        saveCellsMap(cellsMap);
        renderExcelGrid();
        showToast(`Marked P for ${toolCode} (${isoDate})`);
    }
};

window.editRosterTool = function (index) {
    if (index < 0 || index >= roster70.length) return;
    const current = roster70[index];
    const entered = window.prompt(`Enter Tool Number for Sr. No ${index + 1}:`, current);
    if (entered === null) return;

    const clean = entered.trim().toUpperCase();
    if (!clean || clean === current) return;

    // Migrate any existing cell marks from old code to new code
    Object.keys(cellsMap).forEach((k) => {
        if (k.startsWith(`${current}__`)) {
            const datePart = k.split("__")[1];
            const markVal = cellsMap[k];
            delete cellsMap[k];
            cellsMap[`${clean}__${datePart}`] = markVal;
        }
    });

    roster70[index] = clean;
    saveRoster(roster70);
    saveCellsMap(cellsMap);
    renderExcelGrid();
    showToast(`Sr #${index + 1} updated to ${clean}`);
};

function bindSignOff() {
    const prepEl = document.getElementById("prepared-by-input");
    const appEl = document.getElementById("approved-by-input");
    const key = `ToolSyncPM_SignOff_${activeYear}-${String(activeMonthIdx + 1).padStart(2, "0")}`;

    try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        if (prepEl) prepEl.value = data.preparedBy || "";
        if (appEl) appEl.value = data.approvedBy || "";
    } catch {
        // Ignore storage read errors
    }

    const saveSignOff = () => {
        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    preparedBy: prepEl?.value.trim() || "",
                    approvedBy: appEl?.value.trim() || ""
                })
            );
        } catch {
            // Ignore storage write errors
        }
    };

    if (prepEl) prepEl.oninput = saveSignOff;
    if (appEl) appEl.oninput = saveSignOff;
}

function initFrontPageGrid() {
    // Place any saved tool codes from cellsMap into empty TOOL-xxx slots if not already present
    Object.keys(cellsMap).forEach((k) => {
        const code = (k.split("__")[0] || "").trim().toUpperCase();
        if (code && !roster70.includes(code)) {
            const slotIdx = roster70.findIndex((c) => /^TOOL-\d{3}$/.test(c));
            if (slotIdx !== -1) {
                roster70[slotIdx] = code;
            }
        }
    });
    saveRoster(roster70);

    updateHeaderTitle();
    renderDateColumns();
    renderExcelGrid();
    bindSignOff();

    document.getElementById("month-picker")?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val || !val.includes("-")) return;
        const [yStr, mStr] = val.split("-");
        activeYear = Number(yStr);
        activeMonthIdx = Number(mStr) - 1;
        updateHeaderTitle();
        renderDateColumns();
        renderExcelGrid();
        bindSignOff();
    });

    document.getElementById("tool-search-input")?.addEventListener("input", renderExcelGrid);

    document.getElementById("toggle-add-tool-btn")?.addEventListener("click", () => {
        document.getElementById("add-tool-panel")?.classList.toggle("hidden");
    });

    document.getElementById("add-tool-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const srVal = Number(document.getElementById("new-tool-sr")?.value);
        const toolVal = document.getElementById("new-tool-number")?.value.trim().toUpperCase();
        const dateVal = document.getElementById("new-tool-pm-date")?.value || makeIsoDate(activeYear, activeMonthIdx, 1);
        const markVal = (document.getElementById("new-tool-mark")?.value || "P").trim().toUpperCase() || "P";

        if (!toolVal) return;

        if (srVal >= 1 && srVal <= TOTAL_PM_TOOLS) {
            roster70[srVal - 1] = toolVal;
        } else if (!roster70.includes(toolVal)) {
            const emptyIdx = roster70.findIndex((c) => /^TOOL-\d{3}$/.test(c));
            roster70[emptyIdx !== -1 ? emptyIdx : TOTAL_PM_TOOLS - 1] = toolVal;
        }

        cellsMap[`${toolVal}__${dateVal}`] = markVal;
        saveRoster(roster70);
        saveCellsMap(cellsMap);

        const [dy, dm] = dateVal.split("-").map(Number);
        if (dy && dm) {
            activeYear = dy;
            activeMonthIdx = dm - 1;
            const mp = document.getElementById("month-picker");
            if (mp) mp.value = `${dy}-${String(dm).padStart(2, "0")}`;
        }

        document.getElementById("new-tool-number").value = "";
        document.getElementById("new-tool-sr").value = "";
        updateHeaderTitle();
        renderDateColumns();
        renderExcelGrid();
        bindSignOff();
        showToast(`Saved ${toolVal} (${markVal}) on ${dateVal}`);
    });
}

initFrontPageGrid();