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
const EXCHANGE_STORAGE_KEY = "ToolSyncPM_70_ToolExchange_v1";
const MATRIX_STATE_KEY = "ToolSyncPM_Matrix_3Grid_v1";
const PHOTO_BACKUP_KEY = "ToolSyncPM_PhotoBackup_v1";
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

function loadExchangeMap() {
    try {
        const raw = localStorage.getItem(EXCHANGE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function saveExchangeMap(mapObj) {
    try {
        localStorage.setItem(EXCHANGE_STORAGE_KEY, JSON.stringify(mapObj));
    } catch {
        // Ignore storage errors
    }
}

/**
 * matrixState[key] = {
 *   p: boolean,
 *   a: boolean,
 *   beforePhoto: string,
 *   afterPhoto: string,
 *   remark: string
 * }
 */
function loadMatrixState() {
    try {
        const raw = localStorage.getItem(MATRIX_STATE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") return parsed;
        }
    } catch {
        // Ignore storage errors
    }

    const seeded = {};
    try {
        const mirror = JSON.parse(localStorage.getItem(SHARED_TOOLS_MIRROR_KEY) || "[]");
        if (Array.isArray(mirror)) {
            mirror.forEach((item) => {
                if (!item || !item.toolCode || !item.scheduledDate) return;
                const key = `${String(item.toolCode).trim().toUpperCase()}__${String(item.scheduledDate).trim()}`;
                const mark = String(item.pmMark || "P").trim().toUpperCase();
                seeded[key] = {
                    p: mark === "P" || item.status === "Scheduled" || !mark,
                    a: mark === "A" || item.status === "PM Completed",
                    beforePhoto: item.beforePhoto || "",
                    afterPhoto: item.afterPhoto || "",
                    remark: item.remarks || ""
                };
            });
        }
    } catch {
        // Ignore mirror errors
    }
    return seeded;
}

function syncBackupAndMirror(stateObj) {
    try {
        localStorage.setItem(MATRIX_STATE_KEY, JSON.stringify(stateObj));

        const mirrorList = [];
        const backupPhotos = [];

        Object.entries(stateObj).forEach(([key, entry]) => {
            if (!entry) return;
            const [toolCode, scheduledDate] = key.split("__");
            if (!toolCode || !scheduledDate) return;

            const hasBefore = Boolean(entry.beforePhoto);
            const hasAfter = Boolean(entry.afterPhoto);
            if (!entry.p && !entry.a && !hasBefore && !hasAfter) return;

            mirrorList.push({
                id: `fp_${toolCode}_${scheduledDate}`,
                toolCode,
                scheduledDate,
                pmMark: entry.a ? "A" : "P",
                status: entry.a ? "PM Completed" : "Scheduled",
                beforePhoto: entry.beforePhoto || "",
                afterPhoto: entry.afterPhoto || "",
                remarks: entry.remark || ""
            });

            if (hasBefore) {
                backupPhotos.push({
                    id: `${toolCode}__${scheduledDate}__BEFORE`,
                    toolCode,
                    date: scheduledDate,
                    stage: "BEFORE PM",
                    photo: entry.beforePhoto,
                    remarks: entry.remark || ""
                });
            }
            if (hasAfter) {
                backupPhotos.push({
                    id: `${toolCode}__${scheduledDate}__AFTER`,
                    toolCode,
                    date: scheduledDate,
                    stage: "AFTER PM",
                    photo: entry.afterPhoto,
                    remarks: entry.remark || ""
                });
            }
        });

        localStorage.setItem(SHARED_TOOLS_MIRROR_KEY, JSON.stringify(mirrorList));
        localStorage.setItem(PHOTO_BACKUP_KEY, JSON.stringify(backupPhotos));
    } catch {
        // Ignore storage quota errors
    }
}

function compressImageToDataUrl(file, maxWidth = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let activeYear = 2026;
let activeMonthIdx = 10; // November
let roster70 = loadRoster();
let exchangeMap = loadExchangeMap();
let matrixState = loadMatrixState();

// Modal state
let activePicTool = "";
let activePicDate = "";
let draftBeforeUrl = "";
let draftAfterUrl = "";
let draftRemarkText = "";

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
        <th class="sticky left-12 z-30 bg-[#0d1017] px-3 py-1.5 text-left text-stone-400">
            Mould Code
        </th>
        <th class="sticky left-[253px] z-30 bg-[#0d1017] px-3 py-1.5 text-left text-stone-400">
            Tool Exchange
        </th>
        <th class="sticky left-[433px] z-30 bg-[#0d1017] px-2 py-1.5 text-center text-stone-400">
            Type
        </th>
    `;

    const dateCols = [];
    for (let d = 1; d <= totalDays; d++) {
        dateCols.push(`
            <th class="py-1.5 px-1 text-center min-w-[44px] whitespace-nowrap">
                ${d}/${MONTHS_SHORT[activeMonthIdx]}
            </th>
        `);
    }

    headerRow.innerHTML = prefixCols + dateCols.join("");
}

function hasActivityOnDate(code, targetDate) {
    if (!targetDate) return true;
    const item = matrixState[`${code}__${targetDate}`];
    if (!item) return false;
    return Boolean(item.p || item.a || item.beforePhoto || item.afterPhoto || item.remark);
}

function getFilteredRosterRows() {
    const q = (document.getElementById("tool-search-input")?.value || "").trim().toLowerCase();
    const targetDate = (document.getElementById("date-search-input")?.value || "").trim();

    const rows = roster70.map((code, i) => ({
        srNo: i + 1,
        code,
        exchange: exchangeMap[String(i + 1)] || ""
    }));

    return rows.filter((r) => {
        const matchesQuery =
            !q ||
            String(r.srNo) === q ||
            r.code.toLowerCase().includes(q) ||
            r.exchange.toLowerCase().includes(q);
        const matchesDate = hasActivityOnDate(r.code, targetDate);
        return matchesQuery && matchesDate;
    });
}

function renderExcelGrid() {
    const tbody = document.getElementById("pm-matrix-tbody");
    if (!tbody) return;

    const totalDays = getDaysInMonth(activeYear, activeMonthIdx);
    const rows = getFilteredRosterRows();

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${totalDays + 4}" class="py-6 text-center text-stone-400">
                    No matching tool numbers found.
                </td>
            </tr>
        `;
        return;
    }

    const htmlRows = [];

    rows.forEach(({ srNo, code, exchange }) => {
        const pCells = [];
        const aCells = [];
        const picCells = [];

        for (let d = 1; d <= totalDays; d++) {
            const iso = makeIsoDate(activeYear, activeMonthIdx, d);
            const key = `${code}__${iso}`;
            const item = matrixState[key] || {};

            // 1. [P] Grid Cell
            const hasP = Boolean(item.p);
            pCells.push(`
                <td class="p-0 text-center ${hasP ? "bg-amber-400/20 text-amber-300 font-bold" : "bg-[#11151d] text-stone-600 hover:bg-stone-800/80"}">
                    <button
                        type="button"
                        onclick="toggleFlagCell('${escapeAttr(code)}', '${iso}', 'p')"
                        class="w-full h-7 flex items-center justify-center text-[11px] font-bold"
                        title="Sr ${srNo} | ${code} | ${iso} — [P] Plan"
                    >
                        ${hasP ? "P" : ""}
                    </button>
                </td>
            `);

            // 2. [A] Grid Cell
            const hasA = Boolean(item.a);
            aCells.push(`
                <td class="p-0 text-center ${hasA ? "bg-emerald-500/20 text-emerald-300 font-bold" : "bg-[#11151d] text-stone-600 hover:bg-stone-800/80"}">
                    <button
                        type="button"
                        onclick="toggleFlagCell('${escapeAttr(code)}', '${iso}', 'a')"
                        class="w-full h-7 flex items-center justify-center text-[11px] font-bold"
                        title="Sr ${srNo} | ${code} | ${iso} — [A] Attended/Complete"
                    >
                        ${hasA ? "A" : ""}
                    </button>
                </td>
            `);

            // 3. [PIC] Grid Cell
            const picCount = (item.beforePhoto ? 1 : 0) + (item.afterPhoto ? 1 : 0);
            const picCls =
                picCount === 2
                    ? "bg-sky-500/25 text-sky-200 font-bold"
                    : picCount === 1
                    ? "bg-cyan-500/15 text-cyan-300 font-bold"
                    : "bg-[#11151d] text-stone-500 hover:bg-stone-800/80";

            picCells.push(`
                <td class="p-0 text-center ${picCls}">
                    <button
                        type="button"
                        onclick="openPicModal('${escapeAttr(code)}', '${iso}')"
                        class="w-full h-7 px-0.5 flex items-center justify-center text-[10px] font-bold tracking-tight"
                        title="Sr ${srNo} | ${code} | ${iso} — Before/After Pic (${picCount}/2)"
                    >
                        ${picCount > 0 ? `PIC(${picCount})` : "PIC"}
                    </button>
                </td>
            `);
        }

        // Row 1: [P]
        htmlRows.push(`
            <tr>
                <td rowspan="3" class="sticky left-0 z-10 bg-[#11151d] py-1 px-2 text-center text-stone-300 font-bold align-middle">
                    ${srNo}
                </td>
                <td rowspan="3" class="sticky left-12 z-10 bg-[#11151d] py-1 px-3 font-bold text-stone-100 whitespace-nowrap align-middle">
                    <button
                        type="button"
                        onclick="editRosterTool(${srNo - 1})"
                        class="text-left hover:text-amber-300 w-full truncate"
                        title="Click to edit Tool Number #${srNo}"
                    >
                        ${escapeAttr(code)}
                    </button>
                </td>
                <td rowspan="3" class="sticky left-[253px] z-10 bg-[#11151d] py-1 px-2.5 text-left align-middle max-w-[180px]">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[11px] truncate ${exchange ? "text-amber-200 font-semibold" : "text-stone-500"}" title="${escapeAttr(exchange)}">
                            ${exchange ? escapeAttr(exchange) : "—"}
                        </span>
                        <button
                            type="button"
                            onclick="editToolExchange(${srNo - 1})"
                            class="shrink-0 px-1.5 py-0.5 rounded bg-stone-800 hover:bg-amber-400/20 border border-stone-600 hover:border-amber-400/60 text-[10px] text-amber-300 font-bold"
                            title="Edit Tool Exchange for Sr #${srNo}"
                        >
                            Edit
                        </button>
                    </div>
                </td>
                <td class="sticky left-[433px] z-10 bg-[#151a24] px-2 py-0.5 text-center text-[10px] font-bold text-amber-300">
                    P
                </td>
                ${pCells.join("")}
            </tr>
        `);

        // Row 2: [A]
        htmlRows.push(`
            <tr>
                <td class="sticky left-[433px] z-10 bg-[#151a24] px-2 py-0.5 text-center text-[10px] font-bold text-emerald-300">
                    A
                </td>
                ${aCells.join("")}
            </tr>
        `);

        // Row 3: [PIC]
        htmlRows.push(`
            <tr class="border-b-2 border-stone-600">
                <td class="sticky left-[433px] z-10 bg-[#151a24] px-2 py-0.5 text-center text-[10px] font-bold text-sky-300">
                    PIC
                </td>
                ${picCells.join("")}
            </tr>
        `);
    });

    tbody.innerHTML = htmlRows.join("");
}

window.editToolExchange = function (index) {
    if (index < 0 || index >= roster70.length) return;
    const srKey = String(index + 1);
    const current = exchangeMap[srKey] || "";
    const entered = window.prompt(
        `Enter Tool Exchange for Sr. No ${index + 1} (${roster70[index]}):`,
        current
    );
    if (entered === null) return;

    const clean = entered.trim();
    if (clean) {
        exchangeMap[srKey] = clean;
    } else {
        delete exchangeMap[srKey];
    }

    saveExchangeMap(exchangeMap);
    renderExcelGrid();
    showToast(`Tool Exchange updated for Sr #${index + 1}`);
};

window.toggleFlagCell = function (toolCode, isoDate, field) {
    const key = `${toolCode}__${isoDate}`;
    const current = matrixState[key] || {
        p: false,
        a: false,
        beforePhoto: "",
        afterPhoto: "",
        remark: ""
    };

    const nextVal = !Boolean(current[field]);
    const updated = { ...current, [field]: nextVal };

    if (!updated.p && !updated.a && !updated.beforePhoto && !updated.afterPhoto && !updated.remark) {
        delete matrixState[key];
    } else {
        matrixState[key] = updated;
    }

    syncBackupAndMirror(matrixState);
    renderExcelGrid();

    const label = field === "p" ? "P (Plan)" : "A (Attended/Complete)";
    showToast(`${nextVal ? "Set" : "Cleared"} ${label} for ${toolCode} on ${isoDate}`);
};

window.editRosterTool = function (index) {
    if (index < 0 || index >= roster70.length) return;
    const current = roster70[index];
    const entered = window.prompt(`Enter Tool Number for Sr. No ${index + 1}:`, current);
    if (entered === null) return;

    const clean = entered.trim().toUpperCase();
    if (!clean || clean === current) return;

    Object.keys(matrixState).forEach((k) => {
        if (k.startsWith(`${current}__`)) {
            const datePart = k.split("__")[1];
            const val = matrixState[k];
            delete matrixState[k];
            matrixState[`${clean}__${datePart}`] = val;
            if (typeof window.syncToolBeforeAfterPicBackup === "function" && val) {
                window.syncToolBeforeAfterPicBackup({
                    toolNo: clean,
                    date: datePart,
                    beforePic: val.beforePhoto || "",
                    afterPic: val.afterPhoto || ""
                });
            }
        }
    });

    roster70[index] = clean;
    saveRoster(roster70);
    syncBackupAndMirror(matrixState);
    renderExcelGrid();
    showToast(`Sr #${index + 1} updated to ${clean}`);
};

function syncPicModalUI() {
    const beforeImg = document.getElementById("modal-before-img");
    const beforeEmpty = document.getElementById("modal-before-empty");
    const beforeBtnTxt = document.getElementById("before-upload-label");

    if (draftBeforeUrl) {
        beforeImg.src = draftBeforeUrl;
        beforeImg.classList.remove("hidden");
        beforeEmpty.classList.add("hidden");
        if (beforeBtnTxt) beforeBtnTxt.textContent = "Change / Edit Before Pic";
    } else {
        beforeImg.classList.add("hidden");
        beforeEmpty.classList.remove("hidden");
        if (beforeBtnTxt) beforeBtnTxt.textContent = "Upload Before Pic";
    }

    const afterImg = document.getElementById("modal-after-img");
    const afterEmpty = document.getElementById("modal-after-empty");
    const afterBtnTxt = document.getElementById("after-upload-label");

    if (draftAfterUrl) {
        afterImg.src = draftAfterUrl;
        afterImg.classList.remove("hidden");
        afterEmpty.classList.add("hidden");
        if (afterBtnTxt) afterBtnTxt.textContent = "Change / Edit After Pic";
    } else {
        afterImg.classList.add("hidden");
        afterEmpty.classList.remove("hidden");
        if (afterBtnTxt) afterBtnTxt.textContent = "Upload After Pic";
    }
}

window.openPicModal = function (toolCode, isoDate) {
    activePicTool = toolCode;
    activePicDate = isoDate;
    const key = `${toolCode}__${isoDate}`;
    const existing = matrixState[key] || {};

    draftBeforeUrl = existing.beforePhoto || "";
    draftAfterUrl = existing.afterPhoto || "";
    draftRemarkText = existing.remark || "";

    document.getElementById("pic-modal-title").textContent = `Tool: ${toolCode} • Date: ${isoDate}`;
    document.getElementById("modal-pic-remark").value = draftRemarkText;
    document.getElementById("modal-before-file").value = "";
    document.getElementById("modal-after-file").value = "";

    syncPicModalUI();

    const modal = document.getElementById("pic-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
};

function closePicModal() {
    activePicTool = "";
    activePicDate = "";
    const modal = document.getElementById("pic-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

function openLightbox(src) {
    if (!src) return;
    const lb = document.getElementById("image-lightbox");
    const img = document.getElementById("lightbox-full-img");
    img.src = src;
    lb.classList.remove("hidden");
    lb.classList.add("flex");
}

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
    Object.keys(matrixState).forEach((k) => {
        const code = (k.split("__")[0] || "").trim().toUpperCase();
        if (code && !roster70.includes(code)) {
            const slotIdx = roster70.findIndex((c) => /^TOOL-\d{3}$/.test(c));
            if (slotIdx !== -1) {
                roster70[slotIdx] = code;
            }
        }
    });
    saveRoster(roster70);
    syncBackupAndMirror(matrixState);

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

    document.getElementById("date-search-input")?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val && val.includes("-")) {
            const [yStr, mStr] = val.split("-");
            const y = Number(yStr);
            const mIdx = Number(mStr) - 1;
            if (y && mIdx >= 0 && mIdx <= 11 && (y !== activeYear || mIdx !== activeMonthIdx)) {
                activeYear = y;
                activeMonthIdx = mIdx;
                const mp = document.getElementById("month-picker");
                if (mp) mp.value = `${yStr}-${mStr}`;
                updateHeaderTitle();
                renderDateColumns();
                bindSignOff();
            }
        }
        renderExcelGrid();
    });

    document.getElementById("clear-date-search-btn")?.addEventListener("click", () => {
        const dateInput = document.getElementById("date-search-input");
        if (dateInput) dateInput.value = "";
        renderExcelGrid();
    });

    document.getElementById("toggle-add-tool-btn")?.addEventListener("click", () => {
        document.getElementById("add-tool-panel")?.classList.toggle("hidden");
    });

    document.getElementById("add-tool-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const srVal = Number(document.getElementById("new-tool-sr")?.value);
        const toolVal = document.getElementById("new-tool-number")?.value.trim().toUpperCase();
        const dateVal = document.getElementById("new-tool-pm-date")?.value || makeIsoDate(activeYear, activeMonthIdx, 1);
        const markVal = (document.getElementById("new-tool-mark")?.value || "P").trim().toUpperCase();

        if (!toolVal) return;

        if (srVal >= 1 && srVal <= TOTAL_PM_TOOLS) {
            roster70[srVal - 1] = toolVal;
        } else if (!roster70.includes(toolVal)) {
            const emptyIdx = roster70.findIndex((c) => /^TOOL-\d{3}$/.test(c));
            roster70[emptyIdx !== -1 ? emptyIdx : TOTAL_PM_TOOLS - 1] = toolVal;
        }

        const key = `${toolVal}__${dateVal}`;
        const prev = matrixState[key] || { p: false, a: false, beforePhoto: "", afterPhoto: "", remark: "" };
        if (markVal === "A") {
            prev.a = true;
        } else {
            prev.p = true;
        }
        matrixState[key] = prev;

        saveRoster(roster70);
        syncBackupAndMirror(matrixState);

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
        showToast(`Saved ${toolVal} on ${dateVal}`);
    });

    // Photo modal listeners
    document.getElementById("modal-before-file")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        draftBeforeUrl = await compressImageToDataUrl(file);
        syncPicModalUI();
    });

    document.getElementById("modal-after-file")?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        draftAfterUrl = await compressImageToDataUrl(file);
        syncPicModalUI();
    });

    document.getElementById("remove-before-pic-btn")?.addEventListener("click", () => {
        draftBeforeUrl = "";
        document.getElementById("modal-before-file").value = "";
        syncPicModalUI();
    });

    document.getElementById("remove-after-pic-btn")?.addEventListener("click", () => {
        draftAfterUrl = "";
        document.getElementById("modal-after-file").value = "";
        syncPicModalUI();
    });

    document.getElementById("modal-before-img")?.addEventListener("click", () => openLightbox(draftBeforeUrl));
    document.getElementById("modal-after-img")?.addEventListener("click", () => openLightbox(draftAfterUrl));
    document.getElementById("close-lightbox-btn")?.addEventListener("click", () => {
        const lb = document.getElementById("image-lightbox");
        lb.classList.add("hidden");
        lb.classList.remove("flex");
    });

    document.getElementById("close-pic-modal-btn")?.addEventListener("click", closePicModal);
    document.getElementById("cancel-pic-modal-btn")?.addEventListener("click", closePicModal);

    document.getElementById("save-pic-modal-btn")?.addEventListener("click", () => {
        if (!activePicTool || !activePicDate) return;
        const key = `${activePicTool}__${activePicDate}`;
        const remarkVal = (document.getElementById("modal-pic-remark")?.value || "").trim();
        const prev = matrixState[key] || { p: false, a: false };

        const nextEntry = {
            ...prev,
            beforePhoto: draftBeforeUrl,
            afterPhoto: draftAfterUrl,
            remark: remarkVal
        };

        if (!nextEntry.p && !nextEntry.a && !nextEntry.beforePhoto && !nextEntry.afterPhoto && !nextEntry.remark) {
            delete matrixState[key];
        } else {
            matrixState[key] = nextEntry;
        }

        if (typeof window.syncToolBeforeAfterPicBackup === "function") {
            window.syncToolBeforeAfterPicBackup({
                toolNo: activePicTool,
                date: activePicDate,
                beforePic: draftBeforeUrl,
                afterPic: draftAfterUrl
            });
        }

        syncBackupAndMirror(matrixState);
        renderExcelGrid();
        closePicModal();
        showToast(`Saved photos for ${activePicTool} (${activePicDate})`);
    });
}

initFrontPageGrid();