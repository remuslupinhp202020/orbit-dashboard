/* ORBIT DIAGNOSTIC MODE */

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlbiHy3EJ1XoBwp4TD8r45-nM3P1MqYLxDCvbKfNSkBZbNArv4jsYx_BobpiiMsl_sCCoSEW0VGS83/pub?gid=1193155342&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        // Force refresh
        const response = await fetch(SHEET_URL + `&t=${Date.now()}`);
        const data = await response.text();
        const parsedData = parseCSV(data);
        const rows = parsedData.slice(1).reverse();
        
        // 1. Check if data exists
        if (rows.length === 0) {
            alert("Connection Successful, but CSV is EMPTY. Check Google Sheet 'Publish to Web' settings.");
            return;
        }

        // 2. DEBUG: Log the first row to the browser console (F12)
        console.log("MAPPING TEST (First Row):", rows[0]);
        console.log("Index 0 (Date):", rows[0][1]);
        console.log("Index 3 (Speed):", rows[0][3]);
        console.log("Index 8 (Weight):", rows[0][8]);

        // 3. Render App
        updateHUD(rows);
        renderHeatmap(rows);
        renderGhostWeight(rows);
        renderTable(rows);

    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<h1 style="color:red; padding:20px;">ERROR: ${error.message}</h1>`;
    }
}

/* CSV PARSER */
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && text[i+1] === '"') { i++; currentCell += '"'; }
        else if (char === '"') { insideQuotes = !insideQuotes; }
        else if (char === ',' && !insideQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; }
        else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (currentCell || currentRow.length) currentRow.push(currentCell.trim());
            if (currentRow.length) rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else { currentCell += char; }
    }
    return rows;
}

/* RENDERERS (Standard) */
function updateHUD(data) {
    if(!data.length) return;
    const latest = data[0];
    
    // Indices based on your screenshot:
    // 0:Time, 1:Date, 2:Activity, 3:Speed, 4:Dur, 5:Sleep, 6:Fuel, 7:Hyg, 8:Weight, 9:Cycle, 10:Vibe
    
    document.getElementById('battery-level').style.width = `${Math.min(100, (parseFloat(latest[5]||0)/8)*100)}%`;
    document.getElementById('sleep-stat').innerText = `${latest[5] || '-'} hrs`;
    document.getElementById('avg-speed').innerText = latest[3] || '-';
    
    // Streak
    let streak = 0;
    data.slice(0, 14).forEach(r => { if(r[2]?.includes('Treadmill') || r[2]?.includes('Clean')) streak++; });
    document.getElementById('streak-count').innerText = `${streak} / 14 Days`;
    document.getElementById('pizza-bar').style.width = `${(streak/14)*100}%`;
}

function renderHeatmap(data) {
    const grid = document.getElementById('heatmap-grid');
    grid.innerHTML = '';
    data.slice(0, 28).reverse().forEach(row => {
        const div = document.createElement('div');
        div.className = `heat-box ${row[2] === 'Treadmill' ? 'hit' : 'rest'}`;
        div.title = row[1];
        if(row[9] === 'Period') div.classList.add('period-mode');
        grid.appendChild(div);
    });
}

function renderGhostWeight(data) {
    // Basic Chart Logic
    const svg = document.getElementById('weight-chart');
    svg.innerHTML = '';
    let pts = [];
    [...data].reverse().forEach((r,i) => {
        let w = parseFloat(r[8]);
        if(!isNaN(w)) pts.push({x:i, y:w, c:r[9]});
    });
    if(pts.length < 2) return;
    
    const max = Math.max(...pts.map(p=>p.y))+1, min = Math.min(...pts.map(p=>p.y))-1;
    pts.forEach(p => {
        let cx = (p.x/(pts.length-1))*1000;
        let cy = 200 - ((p.y-min)/(max-min))*200;
        let c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',5);
        c.setAttribute('fill', (p.c==='Period') ? '#9D4EDD' : '#00F0FF');
        svg.appendChild(c);
    });
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    data.forEach(r => {
        tbody.innerHTML += `<tr><td>${r[1]}</td><td>${r[2]}</td><td class="font-mono">${r[3]}</td><td class="font-mono">${r[4]}</td><td class="font-mono">${r[8]}</td><td class="font-mono">${r[10]}</td></tr>`;
    });
}
