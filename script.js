/* 
    ORBIT COCKPIT ENGINE 
    v1.0 | Data-Driven Bio-Feedback
*/

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlbiHy3EJ1XoBwp4TD8r45-nM3P1MqYLxDCvbKfNSkBZbNArv4jsYx_BobpiiMsl_sCCoSEW0VGS83/pub?gid=1193155342&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        const parsedData = parseCSV(data);
        
        // Remove header row and reverse to show newest first
        const rows = parsedData.slice(1).reverse();
        
        updateHUD(rows);
        renderHeatmap(rows);
        renderGhostWeight(rows);
        renderTable(rows);
    } catch (error) {
        console.error('Orbit Connection Failed:', error);
        document.querySelector('.brand').innerHTML += '<span style="color:red"> (OFFLINE)</span>';
    }
}

/* --- CORE: CSV PARSER (Handles Commas in "Fuel" Checkboxes) --- */
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') { i++; currentCell += '"'; } // Escaped quote
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
    return rows;
}

/* --- SECTION 1: THE HUD --- */
function updateHUD(data) {
    if (data.length === 0) return;

    const latest = data[0]; 
    // Mapping indices based on Step 1 Schema:
    // 0:Time, 1:Activity, 2:Speed, 3:Dur, 4:Sleep, 5:Fuel, 6:Hygiene, 7:Weight, 8:Cycle, 9:Vibe
    
    // 1. BATTERY (Sleep)
    const sleep = parseFloat(latest[4]) || 0;
    const batteryLevel = document.getElementById('battery-level');
    const sleepStat = document.getElementById('sleep-stat');
    
    // Logic: 8hrs = 100%, 4hrs = 0% (Red Zone)
    let percentage = Math.min(100, Math.max(0, (sleep / 8) * 100));
    batteryLevel.style.width = `${percentage}%`;
    sleepStat.innerText = `${sleep} hrs`;

    if (sleep < 5) batteryLevel.style.background = 'var(--color-alert)';
    else if (sleep < 7) batteryLevel.style.background = 'var(--color-warn)';
    else batteryLevel.style.background = 'var(--color-accent-2)'; // Green

    // 2. SPEEDOMETER
    const speed = parseFloat(latest[2]) || 0;
    document.getElementById('avg-speed').innerText = speed;
    const speedGauge = document.getElementById('speed-gauge');
    
    // Visual: 4.4 is the goal (100% full rotation). Scale: 3.0 to 5.0
    // Simple width mapping for now (can be upgraded to rotation later)
    let speedPercent = Math.min(100, ((speed - 3) / 2) * 100); 
    speedGauge.style.width = `${speedPercent}%`;

    // 3. PIZZA PROGRESS (Streak)
    // Count valid workouts in last 14 entries
    let streak = 0;
    const window = data.slice(0, 14);
    window.forEach(row => {
        if (row[1] === 'Treadmill' || row[1] === 'House Cleaning') streak++;
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
    
    // Show last 28 days
    const recent = data.slice(0, 28).reverse(); 
    
    recent.forEach(row => {
        const div = document.createElement('div');
        div.className = 'heat-box';
        
        const type = row[1];
        const cycle = row[8]; // Cycle Status
        
        if (cycle === 'Period') {
            div.classList.add('period-mode');
        }

        if (type === 'Treadmill') div.classList.add('hit');
        else if (type === 'House Cleaning') div.classList.add('maintenance');
        else div.classList.add('rest');

        // Tooltip
        div.title = `${row[0].split(' ')[0]}: ${type}`;
        grid.appendChild(div);
    });
}

/* --- SECTION 3: GHOST WEIGHT CHART --- */
function renderGhostWeight(data) {
    // Need chronological order for chart
    const chronological = [...data].reverse();
    const svg = document.getElementById('weight-chart');
    
    // Extract valid weight points
    let points = [];
    chronological.forEach((row, index) => {
        let w = parseFloat(row[7]); // Weight Log
        if (!isNaN(w)) {
            points.push({ val: w, type: row[8], index: index });
        }
    });

    if (points.length < 2) return;

    // Scaling
    const maxW = Math.max(...points.map(p => p.val)) + 1;
    const minW = Math.min(...points.map(p => p.val)) - 1;
    const width = 1000;
    const height = 200;
    
    const getX = (i) => (i / (points.length - 1)) * width;
    const getY = (w) => height - ((w - minW) / (maxW - minW)) * height;

    // Draw Line
    let pathD = `M ${getX(0)} ${getY(points[0].val)}`;
    points.forEach((p, i) => {
        pathD += ` L ${getX(i)} ${getY(p.val)}`;
        
        // Draw Dots
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', getX(i));
        circle.setAttribute('cy', getY(p.val));
        circle.setAttribute('r', 5);
        
        // Color logic based on "Cycle" (Ghost Weight)
        if (p.type === 'Period' || p.type === 'Feast') {
            circle.setAttribute('fill', '#9D4EDD'); // Purple for spikes
        } else {
            circle.setAttribute('fill', '#00F0FF'); // Cyan for true weight
        }
        svg.appendChild(circle);
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', '#333');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');
    svg.insertBefore(path, svg.firstChild);
}

/* --- SECTION 4: TABLE --- */
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        
        // Safe access helper
        const get = (i) => row[i] || '-';

        tr.innerHTML = `
            <td>${get(0).split(' ')[0]}</td>
            <td>${get(1)}</td>
            <td class="font-mono">${get(2)}</td>
            <td class="font-mono">${get(3)}</td>
            <td class="font-mono">${get(4)}</td>
            <td class="font-mono">${get(7)}</td>
            <td><span class="tag ${get(9).toLowerCase()}">${get(9)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
