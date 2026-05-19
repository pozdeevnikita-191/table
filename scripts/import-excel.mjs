/**
 * Import script: reads the Excel time-tracking file and populates the DB via API.
 * Usage: node scripts/import-excel.mjs
 */
import XLSX from 'xlsx';
import { createRequire } from 'module';

const API = 'http://localhost:80';

// --- Excel time fraction → "HH:MM" ---
function excelTimeToHHMM(frac) {
  if (frac === undefined || frac === null || frac === '') return null;
  const totalMins = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Russian month names → 0-based month index
const MONTH_MAP = {
  'январь': 0,  'февраль': 1, 'март': 2,    'апрель': 3,
  'май': 4,     'июнь': 5,    'июль': 6,    'август': 7,
  'сентябрь': 8,'октябрь': 9, 'ноябрь': 10, 'декабрь': 11,
};

function isMonthName(s) {
  if (typeof s !== 'string') return false;
  return s.toLowerCase().trim() in MONTH_MAP;
}
function isYearMarker(s) {
  if (typeof s !== 'string') return false;
  return /\d{4}/.test(s);
}

// Normalize object name variants
const NAME_NORMALIZE = {
  'д.новая': 'Д. Новая',
  'д. новая': 'Д. Новая',
  'д.Новая': 'Д. Новая',
  'знаменское.': 'Знаменское',
  'офис.': 'Офис',
  'прайм парк (оконечное обор.)': 'Прайм парк',
  'вятская 41а': 'Вятская 41 А',
  'лихачёва 18к5': 'Лихачева 18к5',
  'лихачева 18к5': 'Лихачева 18к5',
  'ленинградка 58': 'Ленинградка 58',
  'полянка 44. лотос': 'Полянка 44. Лотос',
  'полянка 44 лотос': 'Полянка 44. Лотос',
  'жк золотой': 'ЖК Золотой',
  'новоалексеевская': 'Новоалексеевская',
  'знаменское': 'Знаменское',
};

function normalizeName(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (NAME_NORMALIZE[lower]) return NAME_NORMALIZE[lower];
  // Capitalize first letter
  return raw.trim().replace(/^\w/, c => c.toUpperCase());
}

// Split compound entries like "Ривьера , Лихачёва 18к5"
function splitObjectNames(raw) {
  if (!raw) return [];
  const lower = raw.toLowerCase().trim();
  // Skip non-object values
  if (['отпуск', 'больничный', 'выходной'].includes(lower)) return [{ type: lower, name: null }];
  // Split by comma or " , "
  const parts = raw.split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
  return parts.map(p => ({ type: 'work', name: normalizeName(p) }));
}

// --- API helpers ---
async function apiGet(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${path} → ${r.status}: ${text}`);
  }
  return r.json();
}

// Object ЛЗ codes from reference table
const OBJECT_CODES = {
  'Полянка 44. Лотос': '5147',
  'Полянка 44. Мускат': '5137',
  'Ривьера': '5134',
  'Вишнёвый сад': '5146',
  'Поляны Фасад': '5202',
  'Поляны Фасад. Светильники': '5203',
  'Поляны Ландшафт': '5217',
  'Поляны Ландшафт Светильники': '5218',
  'Новоалексеевская': '5223',
  'Волоколамская 23': '1265',
  'Сергиев посад': '2409',
  'Просвещение': '4172',
  'Боровского': '5243',
  'Суздаль. Монастырь': '5268',
  'Ателье': '5265',
  'Знаменское': '3737',
  'Ленинградка 58': '5132',
  'Прайм парк': '5351',
  'ЖК Золотой': '5357',
  'Д. Новая': '5114',
  'Вятская 41 А': '5338',
  'Ладо': '5444',
};

// --- Parse a single sheet into entries ---
function parseSheet(sheetName, wb) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  
  const getVal = (R, C) => {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
    return cell ? cell.v : undefined;
  };

  const entries = [];
  let currentYear = 2024;
  let currentMonth = null; // 0-based
  let yearExplicitlySet = false; // prevents auto-increment after explicit year marker

  for (let R = range.s.r; R <= range.e.r; R++) {
    const a = getVal(R, 0); // date/month/header
    const b = getVal(R, 1); // object
    const c = getVal(R, 2); // start time
    const d = getVal(R, 3); // end time

    // Year marker
    if (isYearMarker(String(a || ''))) {
      const match = String(a).match(/(\d{4})/);
      if (match) {
        currentYear = parseInt(match[1]);
        yearExplicitlySet = true;
      }
      continue;
    }

    // Month header
    if (isMonthName(a)) {
      const newMonth = MONTH_MAP[a.toLowerCase().trim()];
      // If we're going backward in month (e.g., Dec → Jan), it's a new year
      // But NOT if the year was just set explicitly by a year marker
      if (!yearExplicitlySet && currentMonth !== null && newMonth < currentMonth && newMonth <= 2) {
        currentYear++;
      }
      currentMonth = newMonth;
      yearExplicitlySet = false; // reset flag after first month seen
      continue;
    }

    // Data row: A must be a number (day), B must have content
    if (typeof a !== 'number' || !b || currentMonth === null) continue;

    const day = Math.round(a);
    if (day < 1 || day > 31) continue;

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const startTime = excelTimeToHHMM(c);
    const endTime = excelTimeToHHMM(d);
    const objRaw = String(b).trim();

    entries.push({ date: dateStr, objRaw, startTime, endTime });
  }

  return entries;
}

// --- Main ---
async function main() {
  console.log('Reading Excel file...');
  const wb = XLSX.readFile('attached_assets/Учет_рабочего_времени_(1)_1779191208124.xlsx');

  // Load existing data
  console.log('Loading existing employees and objects...');
  const employees = await apiGet('/api/employees');
  let objects = await apiGet('/api/objects');

  const empMap = {};
  for (const e of employees) {
    empMap[e.name.toLowerCase()] = e.id;
  }
  console.log('Employees:', employees.map(e => `${e.name}(${e.id})`).join(', '));

  // Build object map by normalized name
  const objectMap = {}; // normalizedName → id
  for (const o of objects) {
    objectMap[o.name.toLowerCase()] = o.id;
  }

  async function getOrCreateObject(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    if (objectMap[lower]) return objectMap[lower];

    console.log(`  Creating object: ${name}`);
    const code = OBJECT_CODES[name] || '-';
    const newObj = await apiPost('/api/objects', { name, code, status: 'active' });
    objectMap[lower] = newObj.id;
    return newObj.id;
  }

  // Sheet → employee mapping
  const sheetEmployeeMap = {
    'Володькин': 'андрей володькин',
    'Федотов ': 'денис федотов',
  };

  let totalEntries = 0;
  let skippedEntries = 0;

  for (const [sheetName, empNameLower] of Object.entries(sheetEmployeeMap)) {
    const empId = empMap[empNameLower];
    if (!empId) {
      console.log(`⚠ Employee not found: ${empNameLower}`);
      continue;
    }
    console.log(`\nProcessing sheet "${sheetName}" → Employee ID ${empId}...`);

    const rawEntries = parseSheet(sheetName, wb);
    console.log(`  Found ${rawEntries.length} raw rows`);

    // Group by date (one entry per date, multiple segments)
    const byDate = {};
    for (const row of rawEntries) {
      if (!byDate[row.date]) byDate[row.date] = [];
      byDate[row.date].push(row);
    }

    const dates = Object.keys(byDate).sort();
    console.log(`  Unique dates: ${dates.length} (${dates[0]} → ${dates[dates.length - 1]})`);

    for (const date of dates) {
      const rows = byDate[date];
      const firstRow = rows[0];
      const objLower = firstRow.objRaw.toLowerCase().trim();

      // Detect day type
      if (objLower === 'отпуск') {
        try {
          await apiPost('/api/entries', { employeeId: empId, date, type: 'vacation', segments: [] });
          totalEntries++;
        } catch(e) { skippedEntries++; }
        continue;
      }
      if (objLower === 'больничный') {
        try {
          await apiPost('/api/entries', { employeeId: empId, date, type: 'sick', segments: [] });
          totalEntries++;
        } catch(e) { skippedEntries++; }
        continue;
      }

      // Work day - process segments
      const segments = [];
      for (const row of rows) {
        const parts = splitObjectNames(row.objRaw);
        for (const part of parts) {
          if (part.type !== 'work' || !part.name) continue;
          const objectId = await getOrCreateObject(part.name);
          if (!objectId) continue;
          if (row.startTime && row.endTime) {
            segments.push({ objectId, startTime: row.startTime, endTime: row.endTime, note: '' });
          }
        }
      }

      if (segments.length === 0) {
        skippedEntries++;
        continue;
      }

      try {
        await apiPost('/api/entries', { employeeId: empId, date, type: 'work', segments });
        totalEntries++;
        if (totalEntries % 50 === 0) console.log(`  ... ${totalEntries} entries saved`);
      } catch(e) {
        console.log(`  ✗ Failed ${date}: ${e.message.slice(0, 80)}`);
        skippedEntries++;
      }
    }
  }

  console.log(`\n✓ Done! Imported: ${totalEntries} entries, skipped: ${skippedEntries}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
