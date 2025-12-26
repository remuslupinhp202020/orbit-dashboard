/* ORBIT MIRROR TEST (DEBUGGER) */

// 1. RE-PASTE YOUR CSV LINK HERE CAREFULLY:
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlbiHy3EJ1XoBwp4TD8r45-nM3P1MqYLxDCvbKfNSkBZbNArv4jsYx_BobpiiMsl_sCCoSEW0VGS83/pub?gid=1193155342&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
    runDiagnostics();
});

async function runDiagnostics() {
    const app = document.querySelector('.app-container');
    app.innerHTML = '<h2 style="padding:20px; color:cyan;">Running Diagnostic...</h2>';
    
    try {
        // Add timestamp to bypass cache
        const finalUrl = SHEET_URL + `&t=${Date.now()}`;
        console.log("Fetching:", finalUrl);
        
        const response = await fetch(finalUrl);
        const text = await response.text();

        // REPORT 1: CONNECTION
        let html = `<div style="padding:20px; font-family:monospace; word-break:break-all;">`;
        html += `<h3 style="color:#0f0">✔ CONNECTION SUCCESSFUL</h3>`;
        html += `<p><strong>Characters Received:</strong> ${text.length}</p>`;

        // REPORT 2: RAW DATA PREVIEW
        html += `<h3 style="color:#ff0; margin-top:20px;">RAW CSV PREVIEW (First 200 chars):</h3>`;
        html += `<div style="background:#222; padding:10px; border:1px solid #444;">${text.substring(0, 200).replace(/\n/g, '<br>')}</div>`;

        // REPORT 3: PARSING TEST
        const rows = parseCSV(text);
        html += `<h3 style="color:#00F0FF; margin-top:20px;">PARSER RESULT:</h3>`;
        html += `<p><strong>Total Rows Found:</strong> ${rows.length}</p>`;
        
        if (rows.length > 1) {
             html += `<p><strong>Row 1 (Header):</strong> [${rows[0]}]</p>`;
             html += `<p><strong>Row 2 (Data):</strong> [${rows[1]}]</p>`;
        } else {
             html += `<p style="color:red"><strong>⚠ WARNING: Only 0-1 rows found. Dashboard needs at least 2 rows (Header + Data).</strong></p>`;
        }

        html += `</div>`;
        app.innerHTML = html;

    } catch (error) {
        app.innerHTML = `<h1 style="color:red; padding:20px;">FETCH ERROR: ${error.message}</h1>`;
    }
}

// STANDARD PARSER
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
            if (insideQuotes && nextChar === '"') { i++; currentCell += '"'; } 
            else { insideQuotes = !insideQuotes; }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
}
