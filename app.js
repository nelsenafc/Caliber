// Caliber - Body Composition Tracker
// Data stored in localStorage

const STORAGE_KEY = 'caliber_entries';
const GOALS = {
    targetWeight: 71.3,
    startWeight: 73.3,
    fatLoss: -6.3,
    muscleGain: 4.3,
    startFatMass: 17.0,
    startMuscle: 31.5
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadEntries();
    setupEventListeners();
    updateDisplay();
    initializeCharts();
    setDefaultDate();
}

// Set default date to today
function setDefaultDate() {
    const dateInput = document.getElementById('entry-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Local Storage Functions
function getEntries() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addEntry(entry) {
    const entries = getEntries();
    // Check if entry for this date already exists
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    if (existingIndex >= 0) {
        entries[existingIndex] = entry;
    } else {
        entries.push(entry);
    }
    // Sort by date
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveEntries(entries);
    return entries;
}

function deleteEntry(date) {
    let entries = getEntries();
    entries = entries.filter(e => e.date !== date);
    saveEntries(entries);
    return entries;
}

// Event Listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('entry-form').addEventListener('submit', handleFormSubmit);

    // Quick entry auto-advance on Enter key
    setupQuickEntryNavigation();

    // Image upload
    const imageInput = document.getElementById('image-input');
    const uploadArea = document.getElementById('upload-area');

    imageInput.addEventListener('change', handleImageUpload);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImage(file);
        }
    });
}

// Quick Entry navigation - Enter moves to next field
function setupQuickEntryNavigation() {
    const quickInputs = document.querySelectorAll('[data-quick-entry]');
    const inputArray = Array.from(quickInputs);

    quickInputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                // Move to next input or submit if last
                const nextInput = inputArray[index + 1];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                } else {
                    // Last field - submit the form
                    document.getElementById('entry-form').requestSubmit();
                }
            }
        });

        // Select all text on focus for easy overwriting
        input.addEventListener('focus', () => {
            if (input.type === 'number' || input.type === 'text') {
                input.select();
            }
        });
    });
}

// Form Handling
function handleFormSubmit(e) {
    e.preventDefault();

    const entry = {
        date: document.getElementById('entry-date').value,
        weight: parseFloat(document.getElementById('entry-weight').value),
        bodyFatPercent: parseFloat(document.getElementById('entry-bf').value),
        bodyFatMass: parseFloat(document.getElementById('entry-bfm').value),
        muscleMass: parseFloat(document.getElementById('entry-smm').value),
        visceralFat: parseInt(document.getElementById('entry-vf').value),
        bmi: parseFloat(document.getElementById('entry-bmi').value),
        inbodyScore: parseInt(document.getElementById('entry-score').value),
        waistHipRatio: parseFloat(document.getElementById('entry-whr').value) || null
    };

    addEntry(entry);
    updateDisplay();
    updateCharts();
    e.target.reset();
    setDefaultDate();

    alert('Entry saved successfully!');
}

// Image Upload & OCR
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
}

async function processImage(file) {
    const ocrStatus = document.getElementById('ocr-status');
    ocrStatus.style.display = 'flex';
    ocrStatus.querySelector('span').textContent = 'Processing image...';

    try {
        // Try multiple orientations to get best OCR result
        const orientations = [0, 90, 180, 270];
        let bestResult = null;
        let bestScore = 0;

        for (const rotation of orientations) {
            ocrStatus.querySelector('span').textContent = `Trying orientation ${rotation}°...`;

            const rotatedImage = await rotateImage(file, rotation);
            const result = await Tesseract.recognize(rotatedImage, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        ocrStatus.querySelector('span').textContent =
                            `Scanning (${rotation}°): ${Math.round(m.progress * 100)}%`;
                    }
                }
            });

            const text = result.data.text;
            const extractedData = extractInBodyData(text);
            const score = scoreExtraction(extractedData);

            console.log(`Rotation ${rotation}°: Score ${score}, extracted:`, extractedData);

            if (score > bestScore) {
                bestScore = score;
                bestResult = { text, data: extractedData };
            }

            // If we got a good extraction, stop trying
            if (score >= 6) break;
        }

        if (bestResult && bestScore > 0) {
            console.log('Best OCR Result:', bestResult.text);
            console.log('Best extracted data:', bestResult.data);
            fillFormWithData(bestResult.data);
        } else {
            alert('Could not extract data from image. Please enter values manually.');
        }

        ocrStatus.style.display = 'none';
    } catch (error) {
        console.error('OCR Error:', error);
        ocrStatus.style.display = 'none';
        alert('Could not extract data from image. Please enter values manually.');
    }
}

// Rotate image using canvas
function rotateImage(file, degrees) {
    return new Promise((resolve) => {
        if (degrees === 0) {
            resolve(file);
            return;
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Swap dimensions for 90/270 degree rotations
                if (degrees === 90 || degrees === 270) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                // Move to center and rotate
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((degrees * Math.PI) / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.95);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Score how many fields were extracted (more = better orientation)
function scoreExtraction(data) {
    let score = 0;
    if (data.date) score += 1;
    if (data.weight) score += 1;
    if (data.bodyFatPercent) score += 1;
    if (data.bodyFatMass) score += 1;
    if (data.muscleMass) score += 1;
    if (data.visceralFat) score += 1;
    if (data.bmi) score += 1;
    if (data.inbodyScore) score += 1;
    if (data.waistHipRatio) score += 1;
    return score;
}

function extractInBodyData(text) {
    const data = {};

    // Normalize text - replace common OCR mistakes
    const normalizedText = text
        .replace(/[|l]/g, '1')  // Common OCR confusion
        .replace(/[oO]/g, '0')  // In numeric contexts
        .replace(/\s+/g, ' ');  // Normalize whitespace

    console.log('Normalized OCR text:', normalizedText);

    // Date pattern - look for Test Date/Time format "DD.MM.YYYY" at start of document
    // InBody 270 shows date like "16.11.2025 08:16"
    const dateMatch = text.match(/(?:Test\s*Date|Date)?\s*[\/:]?\s*(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})/i) ||
                      text.match(/(\d{2})\.(\d{2})\.(\d{4})\s*\d{2}:\d{2}/);
    if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        data.date = `${year}-${month}-${day}`;
        console.log('Extracted date:', data.date);
    }

    // InBody Score - usually prominently displayed, e.g., "68" near "InBody Score"
    const scoreMatch = text.match(/InBody\s*Score\s*(\d{2})/i) ||
                       text.match(/Score\s*(\d{2})\s*[\/\s]*100/i) ||
                       text.match(/(\d{2})\s*[\/\s]*100\s*(?:pts|points)/i);
    if (scoreMatch) data.inbodyScore = parseInt(scoreMatch[1]);

    // Weight - look for patterns like "Weight 71.3" or in the body composition table
    const weightPatterns = [
        /Weight\s*(?:\(kg\))?\s*(\d{2,3}\.?\d*)/i,
        /(?:^|\s)(\d{2,3}\.\d)\s*kg\s*(?:Weight|$)/im,
        /Body\s*Weight\s*(\d{2,3}\.?\d*)/i
    ];
    for (const pattern of weightPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 30 && parseFloat(match[1]) < 200) {
            data.weight = parseFloat(match[1]);
            break;
        }
    }

    // Skeletal Muscle Mass (SMM) - in kg, typically 25-45 range
    const smmPatterns = [
        /SMM\s*(?:\(kg\))?\s*(\d{2,3}\.?\d*)/i,
        /Skeletal\s*Muscle\s*Mass\s*(?:\(kg\))?\s*(\d{2,3}\.?\d*)/i,
        /SMM\s*[\s\S]{0,20}?(\d{2}\.\d)\s*kg/i
    ];
    for (const pattern of smmPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 15 && parseFloat(match[1]) < 60) {
            data.muscleMass = parseFloat(match[1]);
            break;
        }
    }

    // Body Fat Percentage (PBF) - typically 5-50%
    const pbfPatterns = [
        /PBF\s*(?:\(%\))?\s*(\d{1,2}\.?\d*)/i,
        /Percent\s*Body\s*Fat\s*(\d{1,2}\.?\d*)/i,
        /Body\s*Fat\s*(?:%|Percent)\s*(\d{1,2}\.?\d*)/i,
        /(\d{1,2}\.\d)\s*%?\s*PBF/i
    ];
    for (const pattern of pbfPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 3 && parseFloat(match[1]) < 55) {
            data.bodyFatPercent = parseFloat(match[1]);
            break;
        }
    }

    // Body Fat Mass (BFM) - in kg, typically 5-40 range
    const bfmPatterns = [
        /Body\s*Fat\s*Mass\s*(?:\(kg\))?\s*(\d{1,2}\.?\d*)/i,
        /Fat\s*Mass\s*(\d{1,2}\.?\d*)\s*kg/i,
        /BFM\s*(\d{1,2}\.?\d*)/i
    ];
    for (const pattern of bfmPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 2 && parseFloat(match[1]) < 50) {
            data.bodyFatMass = parseFloat(match[1]);
            break;
        }
    }

    // BMI - typically 15-40 range
    const bmiPatterns = [
        /BMI\s*(?:\(kg\/m2\))?\s*(\d{1,2}\.?\d*)/i,
        /(\d{1,2}\.\d)\s*(?:kg\/m|BMI)/i
    ];
    for (const pattern of bmiPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 12 && parseFloat(match[1]) < 45) {
            data.bmi = parseFloat(match[1]);
            break;
        }
    }

    // Visceral Fat Level - typically 1-20
    const vfPatterns = [
        /Visceral\s*Fat\s*(?:Level)?\s*(\d{1,2})/i,
        /VFL\s*(\d{1,2})/i
    ];
    for (const pattern of vfPatterns) {
        const match = text.match(pattern);
        if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 20) {
            data.visceralFat = parseInt(match[1]);
            break;
        }
    }

    // Waist-Hip Ratio - typically 0.7-1.1
    const whrPatterns = [
        /Waist[\-\s]?Hip\s*Ratio\s*(\d+\.?\d*)/i,
        /WHR\s*(\d+\.?\d*)/i,
        /(\d\.\d{2})\s*(?:Waist|WHR)/i
    ];
    for (const pattern of whrPatterns) {
        const match = text.match(pattern);
        if (match && parseFloat(match[1]) > 0.5 && parseFloat(match[1]) < 1.5) {
            data.waistHipRatio = parseFloat(match[1]);
            break;
        }
    }

    console.log('Extracted data:', data);
    return data;
}

function fillFormWithData(data) {
    if (data.date) document.getElementById('entry-date').value = data.date;
    if (data.weight) document.getElementById('entry-weight').value = data.weight;
    if (data.bodyFatPercent) document.getElementById('entry-bf').value = data.bodyFatPercent;
    if (data.bodyFatMass) document.getElementById('entry-bfm').value = data.bodyFatMass;
    if (data.muscleMass) document.getElementById('entry-smm').value = data.muscleMass;
    if (data.visceralFat) document.getElementById('entry-vf').value = data.visceralFat;
    if (data.bmi) document.getElementById('entry-bmi').value = data.bmi;
    if (data.inbodyScore) document.getElementById('entry-score').value = data.inbodyScore;
    if (data.waistHipRatio) document.getElementById('entry-whr').value = data.waistHipRatio;

    // Show what was extracted
    const extracted = Object.keys(data).filter(k => data[k] !== undefined);
    if (extracted.length > 0) {
        alert(`Extracted ${extracted.length} values from image. Please review and fill in any missing fields.`);
    }
}

// Display Updates
function loadEntries() {
    let entries = getEntries();

    // Seed initial data if empty
    if (entries.length === 0) {
        // November 2025 InBody data (from scan)
        const novemberEntry = {
            date: '2025-11-16',
            weight: 74.2,
            bodyFatPercent: 24.8,
            bodyFatMass: 18.4,
            muscleMass: 31.3,
            visceralFat: 8,
            bmi: 22.9,
            inbodyScore: 68,
            waistHipRatio: 0.97
        };
        // December 2025 InBody data
        const decemberEntry = {
            date: '2025-12-30',
            weight: 73.3,
            bodyFatPercent: 23.1,
            bodyFatMass: 17.0,
            muscleMass: 31.5,
            visceralFat: 7,
            bmi: 22.6,
            inbodyScore: 69,
            waistHipRatio: 0.91
        };
        saveEntries([novemberEntry, decemberEntry]);
    } else {
        // One-time migration: update November entry with correct values
        const novemberIndex = entries.findIndex(e => e.date === '2025-11-16');
        const correctNovemberEntry = {
            date: '2025-11-16',
            weight: 74.2,
            bodyFatPercent: 24.8,
            bodyFatMass: 18.4,
            muscleMass: 31.3,
            visceralFat: 8,
            bmi: 22.9,
            inbodyScore: 68,
            waistHipRatio: 0.97
        };
        if (novemberIndex >= 0) {
            entries[novemberIndex] = correctNovemberEntry;
        } else {
            entries.push(correctNovemberEntry);
        }
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveEntries(entries);
    }
}

function updateDisplay() {
    const entries = getEntries();
    updateCurrentStats(entries);
    updateGoalProgress(entries);
    updateHistoryTable(entries);
}

function updateCurrentStats(entries) {
    // Clear change indicators and context
    const changeIds = ['change-weight', 'change-bf', 'change-smm', 'change-vf', 'change-bmi', 'change-score'];
    const contextIds = ['context-weight', 'context-bf', 'context-smm', 'context-vf', 'context-bmi', 'context-score'];

    changeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.className = 'stat-change';
        }
    });

    contextIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
        }
    });

    if (entries.length === 0) {
        document.getElementById('current-weight').textContent = '--';
        document.getElementById('current-bf').textContent = '--';
        document.getElementById('current-smm').textContent = '--';
        document.getElementById('current-vf').textContent = '--';
        document.getElementById('current-bmi').textContent = '--';
        document.getElementById('current-score').textContent = '--';
        document.getElementById('last-updated').textContent = 'No data yet - add your first entry!';
        return;
    }

    const latest = entries[entries.length - 1];
    document.getElementById('current-weight').textContent = latest.weight.toFixed(1);
    document.getElementById('current-bf').textContent = latest.bodyFatPercent.toFixed(1);
    document.getElementById('current-smm').textContent = latest.muscleMass.toFixed(1);
    document.getElementById('current-vf').textContent = latest.visceralFat;
    document.getElementById('current-bmi').textContent = latest.bmi.toFixed(1);
    document.getElementById('current-score').textContent = latest.inbodyScore;

    const date = new Date(latest.date);
    document.getElementById('last-updated').textContent =
        `Last updated: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

    // Show changes if we have previous data
    if (entries.length >= 2) {
        const previous = entries[entries.length - 2];
        const previousMonth = new Date(previous.date).toLocaleDateString('en-US', { month: 'short' });

        const changes = [
            { id: 'change-weight', contextId: 'context-weight', value: latest.weight - previous.weight, inverse: true, decimals: 1 },
            { id: 'change-bf', contextId: 'context-bf', value: latest.bodyFatPercent - previous.bodyFatPercent, inverse: true, decimals: 1 },
            { id: 'change-smm', contextId: 'context-smm', value: latest.muscleMass - previous.muscleMass, inverse: false, decimals: 1 },
            { id: 'change-vf', contextId: 'context-vf', value: latest.visceralFat - previous.visceralFat, inverse: true, decimals: 0 },
            { id: 'change-bmi', contextId: 'context-bmi', value: latest.bmi - previous.bmi, inverse: true, decimals: 1 },
            { id: 'change-score', contextId: 'context-score', value: latest.inbodyScore - previous.inbodyScore, inverse: false, decimals: 0 }
        ];

        changes.forEach(change => {
            const el = document.getElementById(change.id);
            const contextEl = document.getElementById(change.contextId);
            if (!el) return;

            const isPositive = change.inverse ? change.value < 0 : change.value > 0;
            const isNegative = change.inverse ? change.value > 0 : change.value < 0;
            const arrow = change.value > 0 ? '▲' : (change.value < 0 ? '▼' : '');
            const absValue = Math.abs(change.value).toFixed(change.decimals);

            if (change.value === 0) {
                el.textContent = '―';
                el.className = 'stat-change neutral';
            } else {
                el.textContent = `${arrow} ${absValue}`;
                el.className = `stat-change ${isPositive ? 'positive' : (isNegative ? 'negative' : 'neutral')}`;
            }

            // Show comparison context
            if (contextEl) {
                contextEl.textContent = `from ${previousMonth}`;
            }
        });
    }
}

function updateGoalProgress(entries) {
    if (entries.length === 0) return;

    const latest = entries[entries.length - 1];
    const first = entries[0];

    // Fat progress
    const fatLost = first.bodyFatMass - latest.bodyFatMass;
    const fatGoalRemaining = GOALS.fatLoss + fatLost;
    document.getElementById('fat-progress').textContent =
        fatLost >= 0 ? `${fatLost.toFixed(1)} kg lost (${Math.abs(fatGoalRemaining).toFixed(1)} kg to go)`
                     : `${Math.abs(fatLost).toFixed(1)} kg gained`;

    // Muscle progress
    const muscleGained = latest.muscleMass - first.muscleMass;
    const muscleGoalRemaining = GOALS.muscleGain - muscleGained;
    document.getElementById('muscle-progress').textContent =
        muscleGained >= 0 ? `${muscleGained.toFixed(1)} kg gained (${muscleGoalRemaining.toFixed(1)} kg to go)`
                          : `${Math.abs(muscleGained).toFixed(1)} kg lost`;
}

function updateHistoryTable(entries) {
    const tbody = document.getElementById('history-body');

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <p>No entries yet</p>
                    <p>Upload an InBody scan or add an entry manually</p>
                </td>
            </tr>
        `;
        return;
    }

    // Show most recent first
    const sortedEntries = [...entries].reverse();

    tbody.innerHTML = sortedEntries.map(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${entry.weight.toFixed(1)} kg</td>
                <td>${entry.bodyFatPercent.toFixed(1)}%</td>
                <td>${entry.muscleMass.toFixed(1)} kg</td>
                <td>${entry.visceralFat}</td>
                <td>${entry.inbodyScore}/100</td>
                <td><button class="btn-delete" onclick="handleDelete('${entry.date}')">Delete</button></td>
            </tr>
        `;
    }).join('');
}

function handleDelete(date) {
    if (confirm('Are you sure you want to delete this entry?')) {
        deleteEntry(date);
        updateDisplay();
        updateCharts();
    }
}

// ===== Charts =====
let weightChart, bodyFatChart, compositionChart, healthChart;

// Color palette with opacity variants
const CHART_COLORS = {
    ink: '#1a1a1a',
    inkSubtle: 'rgba(26, 26, 26, 0.06)',
    stone: '#6b6b6b',
    sage: '#7d8c7a',
    sageSubtle: 'rgba(125, 140, 122, 0.08)',
    brick: '#9a6458',
    brickSubtle: 'rgba(154, 100, 88, 0.08)',
    gold: '#b8a88a',
    terracotta: '#c4a484',
    gridLine: 'rgba(0, 0, 0, 0.04)',
};

// Vertical crosshair plugin
const crosshairPlugin = {
    id: 'crosshair',
    afterDraw(chart) {
        if (chart.tooltip?._active?.length) {
            const activePoint = chart.tooltip._active[0];
            const x = activePoint.element.x;
            const yAxis = chart.scales.y;
            const ctx = chart.ctx;

            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(x, yAxis.top);
            ctx.lineTo(x, yAxis.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.stroke();
            ctx.restore();
        }
    }
};

Chart.register(crosshairPlugin);

// Custom external tooltip
function getOrCreateTooltip(chart) {
    let tooltipEl = chart.canvas.parentNode.querySelector('.caliber-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'caliber-tooltip';
        chart.canvas.parentNode.appendChild(tooltipEl);
    }
    return tooltipEl;
}

function externalTooltipHandler(context) {
    const { chart, tooltip } = context;
    const tooltipEl = getOrCreateTooltip(chart);

    if (tooltip.opacity === 0) {
        tooltipEl.classList.remove('active');
        return;
    }

    if (tooltip.body) {
        const titleLines = tooltip.title || [];
        const bodyLines = tooltip.body.map(b => b.lines);

        let html = '';

        if (titleLines.length > 0) {
            html += `<div class="caliber-tooltip-date">${titleLines[0]}</div>`;
        }

        bodyLines.forEach((body, i) => {
            const dataPoint = tooltip.dataPoints[i];
            const dataset = dataPoint.dataset;
            const value = dataPoint.formattedValue;
            const label = dataset.label || '';
            const color = dataset.borderColor;
            const unit = dataset.unit || '';

            html += `<div style="display: flex; align-items: center; gap: 8px; ${i > 0 ? 'margin-top: 6px;' : ''}">`;
            html += `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>`;
            html += `<span>`;
            html += `<span class="caliber-tooltip-value">${value}</span>`;
            html += `<span class="caliber-tooltip-unit">${unit}</span>`;
            if (label && bodyLines.length > 1) {
                html += `<div class="caliber-tooltip-label">${label}</div>`;
            }
            html += `</span>`;
            html += `</div>`;
        });

        tooltipEl.innerHTML = html;
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
    const tooltipWidth = tooltipEl.offsetWidth;
    const canvasWidth = chart.canvas.offsetWidth;

    let left = positionX + tooltip.caretX + 12;
    if (left + tooltipWidth > positionX + canvasWidth) {
        left = positionX + tooltip.caretX - tooltipWidth - 12;
    }

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = positionY + tooltip.caretY - 20 + 'px';
    tooltipEl.classList.add('active');
}

// Shared base chart options
function createBaseOptions(overrides = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart',
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        hover: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            title: { display: false },
            legend: { display: false },
            tooltip: {
                enabled: false,
                external: externalTooltipHandler,
            },
        },
        scales: {
            x: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                    font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                    color: CHART_COLORS.stone,
                    padding: 8,
                    maxRotation: 0,
                },
            },
            y: {
                border: { display: false },
                beginAtZero: false,
                grid: {
                    color: CHART_COLORS.gridLine,
                    lineWidth: 1,
                    drawTicks: false,
                },
                ticks: {
                    font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                    color: CHART_COLORS.stone,
                    padding: 12,
                    maxTicksLimit: 6,
                },
            },
        },
        layout: {
            padding: { top: 8, right: 8, bottom: 0, left: 0 },
        },
        ...overrides,
    };
}

// Shared dataset defaults
function createDatasetDefaults(color, options = {}) {
    return {
        borderColor: color,
        backgroundColor: options.fillColor || 'transparent',
        fill: !!options.fillColor,
        tension: 0.4,
        borderWidth: 1.75,
        pointRadius: options.pointRadius ?? 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointHitRadius: 20,
        ...options,
    };
}

function initializeCharts() {
    const entries = getEntries();
    const labels = entries.map(e => formatChartDate(e.date));
    const showPoints = entries.length <= 4;
    const ptRadius = showPoints ? 4 : 0;

    // --- Weight Chart (Hero) ---
    weightChart = new Chart(document.getElementById('weightChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Weight',
                data: entries.map(e => e.weight),
                unit: 'kg',
                ...createDatasetDefaults(CHART_COLORS.ink, {
                    fillColor: CHART_COLORS.inkSubtle,
                    pointRadius: ptRadius,
                }),
            }]
        },
        options: createBaseOptions({
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler,
                },
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: GOALS.targetWeight,
                            yMax: GOALS.targetWeight,
                            borderColor: CHART_COLORS.gold,
                            borderWidth: 1.5,
                            borderDash: [6, 4],
                            label: {
                                display: true,
                                content: `Goal: ${GOALS.targetWeight} kg`,
                                position: 'end',
                                backgroundColor: 'transparent',
                                color: CHART_COLORS.gold,
                                font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
                                padding: { left: 8, right: 0, top: 0, bottom: 0 },
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 8,
                    },
                },
                y: {
                    border: { display: false },
                    beginAtZero: false,
                    grid: { color: CHART_COLORS.gridLine, lineWidth: 1, drawTicks: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 12,
                        maxTicksLimit: 6,
                        callback: (value) => `${value} kg`,
                    },
                },
            },
        }),
    });

    // --- Body Fat % Chart ---
    bodyFatChart = new Chart(document.getElementById('bodyFatChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Body Fat',
                data: entries.map(e => e.bodyFatPercent),
                unit: '%',
                ...createDatasetDefaults(CHART_COLORS.brick, {
                    fillColor: CHART_COLORS.brickSubtle,
                    pointRadius: ptRadius,
                }),
            }]
        },
        options: createBaseOptions({
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler,
                },
                annotation: {
                    annotations: {
                        healthyZone: {
                            type: 'box',
                            yMin: 10,
                            yMax: 20,
                            backgroundColor: 'rgba(125, 140, 122, 0.05)',
                            borderColor: 'transparent',
                            label: {
                                display: true,
                                content: 'Healthy range',
                                position: { x: 'end', y: 'start' },
                                backgroundColor: 'transparent',
                                color: CHART_COLORS.sage,
                                font: { family: 'Inter, sans-serif', size: 9, weight: '400', style: 'italic' },
                                padding: 4,
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 8,
                    },
                },
                y: {
                    border: { display: false },
                    beginAtZero: false,
                    grid: { color: CHART_COLORS.gridLine, lineWidth: 1, drawTicks: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 12,
                        maxTicksLimit: 5,
                        callback: (value) => `${value}%`,
                    },
                },
            },
        }),
    });

    // --- Composition Chart (Muscle vs Fat Mass) ---
    compositionChart = new Chart(document.getElementById('compositionChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Muscle',
                    data: entries.map(e => e.muscleMass),
                    unit: 'kg',
                    ...createDatasetDefaults(CHART_COLORS.sage, {
                        fillColor: CHART_COLORS.sageSubtle,
                        pointRadius: ptRadius,
                    }),
                    order: 1,
                },
                {
                    label: 'Fat Mass',
                    data: entries.map(e => e.bodyFatMass),
                    unit: 'kg',
                    ...createDatasetDefaults(CHART_COLORS.brick, {
                        fillColor: CHART_COLORS.brickSubtle,
                        pointRadius: ptRadius,
                    }),
                    order: 0,
                },
            ]
        },
        options: createBaseOptions({
            plugins: {
                title: { display: false },
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16,
                        font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
                        color: CHART_COLORS.stone,
                    },
                },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler,
                },
            },
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 8,
                    },
                },
                y: {
                    border: { display: false },
                    beginAtZero: false,
                    grid: { color: CHART_COLORS.gridLine, lineWidth: 1, drawTicks: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 12,
                        maxTicksLimit: 5,
                        callback: (value) => `${value} kg`,
                    },
                },
            },
        }),
    });

    // --- Health Metrics Chart (Visceral Fat + WHR) ---
    healthChart = new Chart(document.getElementById('healthChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Visceral Fat',
                    data: entries.map(e => e.visceralFat),
                    unit: 'level',
                    ...createDatasetDefaults(CHART_COLORS.stone, {
                        pointRadius: ptRadius,
                    }),
                    yAxisID: 'y',
                },
                {
                    label: 'WHR',
                    data: entries.map(e => e.waistHipRatio),
                    unit: '',
                    ...createDatasetDefaults(CHART_COLORS.terracotta, {
                        pointRadius: ptRadius,
                        borderDash: [4, 3],
                    }),
                    yAxisID: 'y1',
                }
            ]
        },
        options: createBaseOptions({
            plugins: {
                title: { display: false },
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16,
                        font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
                        color: CHART_COLORS.stone,
                    },
                },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler,
                },
                annotation: {
                    annotations: {
                        vfHealthy: {
                            type: 'box',
                            yMin: 1,
                            yMax: 9,
                            yScaleID: 'y',
                            backgroundColor: 'rgba(125, 140, 122, 0.04)',
                            borderColor: 'transparent',
                        },
                        whrThreshold: {
                            type: 'line',
                            yMin: 0.90,
                            yMax: 0.90,
                            yScaleID: 'y1',
                            borderColor: 'rgba(154, 100, 88, 0.2)',
                            borderWidth: 1,
                            borderDash: [3, 3],
                            label: {
                                display: true,
                                content: 'WHR threshold',
                                position: 'start',
                                backgroundColor: 'transparent',
                                color: 'rgba(154, 100, 88, 0.4)',
                                font: { family: 'Inter, sans-serif', size: 9, weight: '400' },
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 11, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 8,
                    },
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    border: { display: false },
                    beginAtZero: false,
                    grid: { color: CHART_COLORS.gridLine, lineWidth: 1, drawTicks: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 10, weight: '400' },
                        color: CHART_COLORS.stone,
                        padding: 8,
                        maxTicksLimit: 5,
                        stepSize: 1,
                    },
                    title: {
                        display: true,
                        text: 'Visceral Fat',
                        font: { family: 'Inter, sans-serif', size: 9, weight: '500' },
                        color: CHART_COLORS.stone,
                        padding: { bottom: 4 },
                    },
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    border: { display: false },
                    beginAtZero: false,
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { family: 'Inter, sans-serif', size: 10, weight: '400' },
                        color: CHART_COLORS.terracotta,
                        padding: 8,
                        maxTicksLimit: 5,
                    },
                    title: {
                        display: true,
                        text: 'WHR',
                        font: { family: 'Inter, sans-serif', size: 9, weight: '500' },
                        color: CHART_COLORS.terracotta,
                        padding: { bottom: 4 },
                    },
                },
            },
        }),
    });
}

function updateCharts() {
    const entries = getEntries();
    const labels = entries.map(e => formatChartDate(e.date));
    const showPoints = entries.length <= 4;
    const ptRadius = showPoints ? 4 : 0;

    // Weight Chart
    weightChart.data.labels = labels;
    weightChart.data.datasets[0].data = entries.map(e => e.weight);
    weightChart.data.datasets[0].pointRadius = ptRadius;
    weightChart.update();

    // Body Fat Chart
    bodyFatChart.data.labels = labels;
    bodyFatChart.data.datasets[0].data = entries.map(e => e.bodyFatPercent);
    bodyFatChart.data.datasets[0].pointRadius = ptRadius;
    bodyFatChart.update();

    // Composition Chart
    compositionChart.data.labels = labels;
    compositionChart.data.datasets[0].data = entries.map(e => e.muscleMass);
    compositionChart.data.datasets[1].data = entries.map(e => e.bodyFatMass);
    compositionChart.data.datasets[0].pointRadius = ptRadius;
    compositionChart.data.datasets[1].pointRadius = ptRadius;
    compositionChart.update();

    // Health Chart
    healthChart.data.labels = labels;
    healthChart.data.datasets[0].data = entries.map(e => e.visceralFat);
    healthChart.data.datasets[1].data = entries.map(e => e.waistHipRatio);
    healthChart.data.datasets[0].pointRadius = ptRadius;
    healthChart.data.datasets[1].pointRadius = ptRadius;
    healthChart.update();
}

function formatChartDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
