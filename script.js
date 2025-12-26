/* 
    ORBIT COCKPIT ENGINE 
    v2.0 | Production Ready
*/

// YOUR VERIFIED DATA STREAM
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlbiHy3EJ1XoBwp4TD8r45-nM3P1MqYLxDCvbKfNSkBZbNArv4jsYx_BobpiiMsl_sCCoSEW0VGS83/pub?gid=1193155342&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        // Add timestamp to force fresh data (Bypass Cache)
        const cacheBuster = `&t=${new Date().getTime()}`;
        const response = await fetch(SHEET_URL + cacheBuster);
        const data = await response.text();
        const parsedData = parseCSV(data);
        
        // Remove header row and reverse to show newest first
        const rows = parsedData.slice(1).reverse();
        
        // If data exists, start the engines
        if (rows.length > 0) {
            updateHUD(rows);
            renderHeatmap(rows);
            renderGhostWeight(rows);
            renderTable(rows);
        } else {
            console.warn("Orbit: No data rows found yet.");
        }
    } catch (error) {
        console.error('Orbit Connection Failed:', error);
        document.querySelector('.brand').innerHTML += '<span style="color:red"> (OFFLINE)</span>';
    }
}

/* --- CORE: CSV PARSER --- */
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
    // Catch the last line if no newline at end
    if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
}

/* --- SECTION 1: THE HUD --- */
function updateHUD(data) {
    const latest = data[0]; 
    
    // CONFIRMED MAPPING:
    // 0:Timestamp, 1:Date, 2:Activity, 3:Speed, 4:Dur, 5:Sleep, 6:Fuel, 7:Hyg, 8:Weight, 9:Cycle, 10:Vibe

    // 1. BATTERY
    const sleep = parseFloat(latest[5]) || 0;
    const batteryLevel = document.getElementById('battery-level');
    const sleepStat = document.getElementById('sleep-stat');
    
    let percentage = Math.min(100, Math.max(0, (sleep / 8) * 100));
    batteryLevel.style.width = `${percentage}%`;
    sleepStat.innerText = `${sleep} hrs`;

    if (sleep < 5) batteryLevel.style.background = 'var(--color-alert)';
    else if (sleep < 7) batteryLevel.style.background = 'var(--color-warn)';
    else batteryLevel.style.background = 'var(--color-accent-2)'; 

    // 2. SPEEDOMETER
    const speed = parseFloat(latest[3]) || 0;
    document.getElementById('avg-speed').innerText = speed;
    const speedGauge = document.getElementById('speed-gauge');
    
    // Visual: 4.4 is the goal. Range 3.0 to 5.0
    let speedPercent = Math.min(100, Math.max(0, ((speed - 3) / 2) * 100)); 
    speedGauge.style.width = `${speedPercent}%`;

    // 3. PIZZA PROGRESS (Streak)
    let streak = 0;
    const window = data.slice(0, 14);
    window.forEach(row => {
        if (row[2].includes('Treadmill') || row[2].includes('Clean')) streak++;
    });
    
    document.getElementById('streak-count').innerText = `${streak} / 14 Days`;
    document.getElementById('pizza-bar').style.width = `${(streak / 14) * 100}%`;
    if (streak >= 14) {
        document.getElementById('pizza-bar').style.backgroundColor = 'var(--color-accent-1)';
        document.getElementById('pizza-bar').style.boxShadow = '0 0 15px var(--color-accent-1)';
    }
}

/* --- SECTION 2: HEATMAP --- */
function renderHeatmap(data) {
    const grid = document.getElementById('heatmap-grid');
    grid.innerHTML = '';
    
    const recent = data.slice(0, 28).reverse(); 
    
    recent.forEach(row => {
        const div = document.createElement('div');
        div.className = 'heat-box';
        
        const type = row[2]; 
        const cycle = row[9];
        
        if (cycle === 'Period') div.classList.add('period-mode');

        if (type.includes('Treadmill')) div.classList.add('hit');
        else if (type.includes('Clean')) div.classList.add('maintenance');
        else div.classList.add('rest');

        div.title = `${row[1]}: ${type}`;
        grid.appendChild(div);
    });
}

/* --- SECTION 3: GHOST WEIGHT CHART --- */
function renderGhostWeight(data) {
    const chronological = [...data].reverse();
    const svg = document.getElementById('weight-chart');
    svg.innerHTML = ''; 

    let points = [];
    chronological.forEach((row, index) => {
        let w = parseFloat(row[8]); // Weight is Index 8
        if (!isNaN(w)) {
            points.push({ val: w, type: row[9], index: index });
        }
    });

    if (points.length === 0) return;

    // SCALING LOGIC
    const maxW = Math.max(...points.map(p => p.val)) + 1;
    const minW = Math.min(...points.map(p => p.val)) - 1;
    const width = 1000;
    const height = 200;
    
    // Safety for single point (avoid divide by zero)
    const getX = (i) => (points.length > 1) ? (i / (points.length - 1)) * width : 500;
    const getY = (w) => height - ((w - minW) / (maxW - minW)) * height;

    // Draw Line (Only if 2+ points)
    if (points.length > 1) {
        let pathD = `M ${getX(0)} ${getY(points[0].val)}`;
        points.forEach((p, i) => {
            pathD += ` L ${getX(i)} ${getY(p.val)}`;
        });
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('stroke', '#333');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);
    }

    // Draw Dots
    points.forEach((p, i) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', getX(i));
        circle.setAttribute('cy', getY(p.val));
        circle.setAttribute('r', 6);
        
        if (p.type === 'Period' || p.type === 'Feast') {
            circle.setAttribute('fill', '#9D4EDD'); // Purple
        } else {
            circle.setAttribute('fill', '#00F0FF'); // Cyan
        }
        svg.appendChild(circle);
    });
}

/* --- SECTION 4: TABLE --- */
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        const get = (i) => row[i] || '-';

        // Mapped: Date(1), Act(2), Spd(3), Dur(4), Slp(5), Wgt(8), Vibe(10)
        tr.innerHTML = `
            <td>${get(1)}</td>
            <td>${get(2)}</td>
            <td class="font-mono">${get(3)}</td>
            <td class="font-mono">${get(4)}</td>
            <td class="font-mono">${get(5)}</td>
            <td class="font-mono">${get(8)}</td>
            <td><span class="tag ${get(10).toLowerCase()}">${get(10)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
