const MONTHS_UPPER = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];
const MONTHS_TITLE = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DEFAULT_TOOLS = [
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

let activeYear = 2026;
let activeMonthIdx = 10; // November (0-indexed)
let toolsList = [];
let breakdownsList = [];
let pmPlanRecords = [];

function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function buildIsoDate(year, monthIndex, day) {
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function updateSheetTitle() {
    const titleEl = document.getElementById("sheet-main-title");
    if (titleEl) {
        titleEl.textContent = `MOULD PREVENTIVE MAINTENANCE PLAN ${MONTHS_UPPER[activeMonthIdx]} - ${activeYear}`;
    }
}

function renderDateHeaders() {
    const headerRow = document.getElementById("pm-date-header-row");
    const slotTh = document.getElementById("date-headers-slot");
    if (!headerRow || !slotTh) return;

    const totalDays = getDaysInMonth(activeYear, activeMonthIdx);
    slotTh.colSpan = totalDays;

    const baseCells = `
        <th class="sticky left-0 z-20 bg-[#0d1017] border-r border-stone-800"></th>
        <th class="sticky left-12 z-20 bg-[#0d1017] border-r-2 border-stone-600 px-3 py-1.5 text-left text-stone-400">
            Mould Code
        </th>
    `;

    const dayCells = [];
    for (let d = 1; d <= totalDays; d++) {
        dayCells.push(`
            <th class="py-1.5 px-1 border-r border-stone-800 text-center min-w-[38px] whitespace-nowrap">
                ${d}/${MONTHS_TITLE[activeMonthIdx]}
            </th>
        `);
    }

    headerRow.innerHTML = baseCells + dayCells.join("");
}

function getUniqueToolCodes() {
    const searchQ = (document.getElementById("tool-search-input")?.value || "").trim().toLowerCase();
    const seen = new Set();
    const ordered = [];

    const addCode = (raw) => {
        const clean = String(raw || "").trim().toUpperCase();
        if (!clean || seen.has(clean)) return;
        seen.add(clean);
        ordered.push(clean);
    };

    DEFAULT_TOOLS.forEach(addCode);
    pmPlanRecords.forEach((rec) => addCode(rec.toolCode));

    if (!searchQ) return ordered;
    return ordered.filter((code) => code.toLowerCase().includes(searchQ));
}

function renderMatrixBody() {
    const tbody = document.getElementById("pm-matrix-tbody");
    if (!tbody) return;

    const totalDays = getDaysInMonth(activeYear, activeMonthIdx);
    const codes = getUniqueToolCodes();

    if (!codes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${totalDays + 2}" class="py-6 text-center text-stone-400">
                    No matching tool numbers found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = codes
        .map((code, index) => {
            const cells = [];
            for (let d = 1; d <= totalDays; d++) {
                const iso = buildIsoDate(activeYear, activeMonthIdx, d);
                const match = pmPlanRecords.find(
                    (rec) => rec.toolCode === code && rec.scheduledDate === iso
                );
                const mark = match ? (match.pmMark || "P") : "";
                const activeCls = mark
                    ? "bg-emerald-500/20 text-emerald-300 font-bold"
                    : "text-stone-500 hover:bg-stone-800/70";

                cells.push(`
                    <td class="p-0 border-r border-stone-800/80 text-center">
                        <button
                            type="button"
                            onclick="togglePlanCell('${escapeHtmlAttr(code)}', '${iso}')"
                            class="w-full h-8 flex items-center justify-center text-[11px] font-bold transition ${activeCls}"
                            title="${code} — ${iso}"
                        >
                            ${mark}
                        </button>
                    </td>
                `);
            }

            return `
                <tr class="hover:bg-stone-900/40">
                    <td class="sticky left-0 z-10 bg-[#11151d] py-1.5 px-2 border-r border-stone-800 text-center text-stone-400">
                        ${index + 1}
                    </td>
                    <td class="sticky left-12 z-10 bg-[#11151d] py-1.5 px-3 border-r-2 border-stone-600 font-bold text-stone-100 whitespace-nowrap">
                        ${code}
                    </td>
                    ${cells.join("")}
                </tr>
            `;
        })
        .join("");
}

window.togglePlanCell = async function (toolCode, isoDate) {
    const existingIdx = pmPlanRecords.findIndex(
        (rec) => rec.toolCode === toolCode && rec.scheduledDate === isoDate
    );

    if (existingIdx > -1) {
        const existing = pmPlanRecords[existingIdx];
        pmPlanRecords.splice(existingIdx, 1);
        toolsList = toolsList.filter((t) => t.id !== existing.id);
        await deleteByIdFromStore(STORE_TOOLS, existing.id);
        writeLocalStorageMirror(toolsList, breakdownsList);
        renderMatrixBody();
        showToast(`Removed PM plan for ${toolCode} on ${isoDate}`);
        return;
    }

    const newRec = {
        id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        toolCode,
        scheduledDate: isoDate,
        pmMark: "P",
        status: "Scheduled",
        remarks: ""
    };

    pmPlanRecords.push(newRec);
    toolsList.push(newRec);
    await putToStore(STORE_TOOLS, newRec);
    writeLocalStorageMirror(toolsList, breakdownsList);
    renderMatrixBody();
    showToast(`Marked P for ${toolCode} on ${isoDate}`);
};

function loadSignOffMeta() {
    const prepInput = document.getElementById("prepared-by-input");
    const appInput = document.getElementById("approved-by-input");
    const metaKey = `ToolSyncPM_SheetMeta_${activeYear}-${String(activeMonthIdx + 1).padStart(2, "0")}`;

    try {
        const saved = JSON.parse(localStorage.getItem(metaKey) || "{}");
        if (prepInput) prepInput.value = saved.preparedBy || "";
        if (appInput) appInput.value = saved.approvedBy || "";
    } catch {
        // Ignore storage read errors
    }

    const saveMeta = () => {
        try {
            localStorage.setItem(
                metaKey,
                JSON.stringify({
                    preparedBy: prepInput?.value.trim() || "",
                    approvedBy: appInput?.value.trim() || ""
                })
            );
        } catch {
            // Ignore storage write errors
        }
    };

    prepInput?.addEventListener("input", saveMeta);
    appInput?.addEventListener("input", saveMeta);
}

async function initFrontPage() {
    const loaded = await loadAllAppData();
    toolsList = loaded.tools || [];
    breakdownsList = loaded.breakdowns || [];
    pmPlanRecords = toolsList.filter((item) => item && item.toolCode && item.scheduledDate);

    updateSheetTitle();
    renderDateHeaders();
    renderMatrixBody();
    loadSignOffMeta();

    document.getElementById("month-picker")?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val || !val.includes("-")) return;
        const [yStr, mStr] = val.split("-");
        activeYear = Number(yStr);
        activeMonthIdx = Number(mStr) - 1;
        updateSheetTitle();
        renderDateHeaders();
        renderMatrixBody();
        loadSignOffMeta();
    });

    document.getElementById("tool-search-input")?.addEventListener("input", renderMatrixBody);

    document.getElementById("toggle-add-tool-btn")?.addEventListener("click", () => {
        document.getElementById("add-tool-panel")?.classList.toggle("hidden");
    });

    document.getElementById("add-tool-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const codeVal = document.getElementById("new-tool-number")?.value.trim().toUpperCase();
        const dateVal = document.getElementById("new-tool-pm-date")?.value || buildIsoDate(activeYear, activeMonthIdx, 1);
        const markVal = (document.getElementById("new-tool-mark")?.value || "P").trim().toUpperCase() || "P";

        if (!codeVal) return;

        if (!DEFAULT_TOOLS.includes(codeVal)) {
            DEFAULT_TOOLS.push(codeVal);
        }

        const exists = pmPlanRecords.find((r) => r.toolCode === codeVal && r.scheduledDate === dateVal);
        if (!exists) {
            const rec = {
                id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                toolCode: codeVal,
                scheduledDate: dateVal,
                pmMark: markVal,
                status: "Scheduled",
                remarks: ""
            };
            pmPlanRecords.push(rec);
            toolsList.push(rec);
            await putToStore(STORE_TOOLS, rec);
            writeLocalStorageMirror(toolsList, breakdownsList);
        }

        const [dy, dm] = dateVal.split("-").map(Number);
        if (dy && dm) {
            activeYear = dy;
            activeMonthIdx = dm - 1;
            const mp = document.getElementById("month-picker");
            if (mp) mp.value = `${dy}-${String(dm).padStart(2, "0")}`;
        }

        document.getElementById("new-tool-number").value = "";
        updateSheetTitle();
        renderDateHeaders();
        renderMatrixBody();
        showToast(`Added ${codeVal} (${markVal}) on ${dateVal}`);
    });
}

initFrontPage();