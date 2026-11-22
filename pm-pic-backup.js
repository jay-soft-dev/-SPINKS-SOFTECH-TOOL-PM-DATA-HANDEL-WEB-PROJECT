const ONLY_PIC_BACKUP_KEY = "ToolSyncPM_Only_Pic_Backup_v1";
const LEGACY_PIC_BACKUP_KEY = "ToolSyncPM_PhotoBackup_v1";

function readOnlyPicBackup() {
    try {
        const raw = localStorage.getItem(ONLY_PIC_BACKUP_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // Ignore storage read errors
    }
    return [];
}

function writeOnlyPicBackup(records) {
    try {
        const cleanList = Array.isArray(records) ? records : [];
        localStorage.setItem(ONLY_PIC_BACKUP_KEY, JSON.stringify(cleanList));

        // Keep existing photo history keys in sync with toolNo + date + pic
        const legacyFormat = cleanList.map((item) => ({
            id: item.id,
            toolCode: item.toolNo,
            date: item.date,
            stage: item.stage,
            photo: item.pic
        }));
        localStorage.setItem(LEGACY_PIC_BACKUP_KEY, JSON.stringify(legacyFormat));
    } catch {
        // Ignore storage write errors
    }
}

/**
 * Saves or updates a single photo entry with Tool No and Date.
 * @param {{ toolNo: string, date: string, stage?: string, picDataUrl: string }} entry
 */
window.savePmPicBackup = function ({ toolNo, date, stage = "PM", picDataUrl }) {
    const cleanTool = String(toolNo || "").trim().toUpperCase();
    const cleanDate = String(date || "").trim();
    const cleanStage = String(stage || "PM").trim().toUpperCase();
    if (!cleanTool || !cleanDate) return;

    const list = readOnlyPicBackup();
    const recordId = `${cleanTool}__${cleanDate}__${cleanStage}`;
    const idx = list.findIndex((r) => r.id === recordId);

    if (!picDataUrl) {
        if (idx !== -1) {
            list.splice(idx, 1);
            writeOnlyPicBackup(list);
        }
        return;
    }

    const record = {
        id: recordId,
        toolNo: cleanTool,
        date: cleanDate,
        stage: cleanStage,
        pic: picDataUrl,
        savedAt: new Date().toISOString()
    };

    if (idx !== -1) {
        list[idx] = record;
    } else {
        list.unshift(record);
    }

    writeOnlyPicBackup(list);
};

/**
 * Syncs Before & After photos for a specific Tool No + Date into the backup file.
 */
window.syncToolBeforeAfterPicBackup = function ({ toolNo, date, beforePic, afterPic }) {
    window.savePmPicBackup({
        toolNo,
        date,
        stage: "BEFORE",
        picDataUrl: beforePic || ""
    });
    window.savePmPicBackup({
        toolNo,
        date,
        stage: "AFTER",
        picDataUrl: afterPic || ""
    });
};

window.getOnlyPicBackupList = function () {
    return readOnlyPicBackup();
};