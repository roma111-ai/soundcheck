// =========================================
// SoundCheck — app.js (финальная версия)
// =========================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let radarChart = null;

// Глобальное хранилище результатов
let globalScores = {
  text: null,  // { scores, average }
  vocal: null, // { accuracy, average }
  mix: null    // { scores, total, average }
};

document.addEventListener('DOMContentLoaded', () => {
  initYear();
  initHero();
  initTextBlock();
  initDropzones();
  initRadar();
});

// ----- утилиты -----
function initYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function initHero() {
  const btn = document.querySelector('.hero .btn-primary');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('text')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

// =========================================
// РАДАР-ЧАРТ
// =========================================
function initRadar() {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Рифма', 'Ритм', 'Смысл', 'Панчлайны', 'Структура', 'Оригинальность'],
      datasets: [{
        label: 'Оценка',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(124, 92, 255, 0.2)',
        borderColor: '#7C5CFF',
        borderWidth: 2,
        pointBackgroundColor: '#3BA7FF',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, color: '#8E8AA8', backdropColor: 'transparent' },
          grid: { color: '#2A2550' },
          angleLines: { color: '#2A2550' },
          pointLabels: { color: '#EDEBFF', font: { size: 12, family: 'Inter, sans-serif' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function updateRadar(labels, data) {
  if (!radarChart) return;
  radarChart.data.labels = labels;
  radarChart.data.datasets[0].data = data;
  radarChart.update();
}

// =========================================
// ОБЩАЯ ОЦЕНКА (СБОРКА ВСЕХ БЛОКОВ)
// =========================================
function updateOverallScore() {
  const parts = [];
  
  if (globalScores.text) parts.push({ name: 'Текст', score: globalScores.text.average, weight: 0.35 });
  if (globalScores.vocal) parts.push({ name: 'Вокал', score: globalScores.vocal.average, weight: 0.3 });
  if (globalScores.mix) parts.push({ name: 'Микс', score: globalScores.mix.average, weight: 0.35 });
  
  if (parts.length === 0) return;
  
  // Пересчёт весов (если чего-то нет)
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  let weightedSum = 0;
  parts.forEach(p => {
    weightedSum += p.score * (p.weight / totalWeight);
  });
  
  const overall = Math.round(weightedSum * 10); // 0-10 -> 0-100
  
  const scoreNum = document.getElementById('scoreNum');
  const verdictEl = document.getElementById('verdict');
  const totalAdvice = document.getElementById('totalAdvice');
  
  if (scoreNum) scoreNum.textContent = overall;
  if (verdictEl) {
    const verdict = getVerdict(overall);
    verdictEl.textContent = verdict.text;
    verdictEl.className = 'verdict ' + verdict.cls;
  }
  
  // Советы (краткие результаты по блокам)
  if (totalAdvice) {
    const adviceList = [];
    if (globalScores.text) adviceList.push(`Текст: ${globalScores.text.average}/10`);
    if (globalScores.vocal) adviceList.push(`Вокал: попадание ${globalScores.vocal.accuracy.toFixed(0)}% (${globalScores.vocal.average}/10)`);
    if (globalScores.mix) adviceList.push(`Микс: ${globalScores.mix.average}/10`);
    totalAdvice.innerHTML = `<ul>${adviceList.map(a => `<li>${a}</li>`).join('')}</ul>`;
  }

  // Обновляем радар сводными данными (только если есть все 3 блока)
  if (globalScores.text && globalScores.vocal && globalScores.mix) {
    updateRadar(
      ['Текст', 'Вокал', 'Микс'],
      [globalScores.text.average, globalScores.vocal.average, globalScores.mix.average]
    );
  }
  
  console.log('Общая оценка:', overall, 'части:', parts);
}

// =========================================
// АНАЛИЗ ТЕКСТА
// =========================================
function analyzeTextHeuristic(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const words = text.toLowerCase().match(/[а-яёa-z]+/g) || [];
  
  if (lines.length === 0 || words.length === 0) {
    return { scores: {}, advice: ["Вставь текст, чтобы увидеть анализ."] };
  }

  const getVowels = (str) => {
    const vowels = str.toLowerCase().match(/[аеёиоуыэюя]/g);
    return vowels ? vowels.join('') : '';
  };
  let rhymeMatches = 0;
  let assonanceMatches = 0;
  const endings = lines.map(l => l.slice(-2).toLowerCase());
  const vowelPatterns = lines.map(l => getVowels(l));

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (endings[i] === endings[j]) rhymeMatches++;
      const v1 = vowelPatterns[i].slice(-2);
      const v2 = vowelPatterns[j].slice(-2);
      if (v1.length >= 2 && v1 === v2) assonanceMatches++;
    }
  }
  const rhymeScore = Math.min(10, Math.max(1, Math.round(((rhymeMatches * 1.5 + assonanceMatches) / lines.length) * 5)));

  const syllableCounts = lines.map(l => {
    const vowels = l.match(/[аеёиоуыэюя]/gi);
    return vowels ? vowels.length : 1;
  });
  const avgSyllables = syllableCounts.reduce((s, c) => s + c, 0) / lines.length;
  let syllableVariance = 0;
  syllableCounts.forEach(c => syllableVariance += Math.pow(c - avgSyllables, 2));
  syllableVariance /= lines.length;
  
  let stabilityScore = 7;
  if (syllableVariance < 3) stabilityScore = 9;
  else if (syllableVariance < 10) stabilityScore = 8;
  else if (syllableVariance < 30) stabilityScore = 6;
  else stabilityScore = 5;

  const longWords = words.filter(w => w.length > 5).length;
  const hasProfanity = words.some(w => ['хуй', 'пизд', 'ебал', 'нахуй', 'бля'].includes(w));
  const meaningScore = Math.min(10, Math.max(1, Math.round((longWords / (words.length || 1)) * 25 + (hasProfanity ? 2 : 0))));

  let punchCount = 0;
  lines.forEach(line => {
    const parts = line.split(/[,.!?—]/).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart.length < 15) punchCount++;
    }
    if (line.length < 20 && line.includes('!')) punchCount++;
  });
  const punchScore = Math.min(10, Math.max(1, Math.round((punchCount / lines.length) * 20)));

  const half = Math.floor(lines.length / 2);
  let repeatMatches = 0;
  for (let i = 0; i < half; i++) {
    for (let j = half; j < lines.length; j++) {
      if (lines[i].length > 5 && lines[j].includes(lines[i].substring(0, 5))) {
        repeatMatches++;
      }
    }
  }
  let structureScore = 5;
  if (repeatMatches > lines.length * 0.1) structureScore += 2;
  if (repeatMatches > lines.length * 0.2) structureScore += 1;
  if (text.includes('[Припев]') || text.includes('Припев')) structureScore += 2;

  const slangWords = ['флексим', 'мамбл', 'панч', 'флоу', 'хайп', 'краш', 'вайб', 'баттл', 'дроп', 'бит', 'рэп', 'трэп', 'дисс', 'сиги', 'майндсет', 'каджит', 'эноки', 'тикток', 'бомбы', 'петарды'];
  const slangCount = words.filter(w => slangWords.includes(w)).length;
  
  const wordCounts = {};
  words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
  const rareWords = words.filter(w => wordCounts[w] === 1).length;
  
  const originalityScore = Math.min(10, Math.max(1, Math.round((slangCount * 2 + rareWords * 0.5) / (words.length || 1) * 30)));

  const scores = {
    "Рифма/Ассонанс": rhymeScore,
    "Ритм/флоу": stabilityScore,
    "Смысл": meaningScore,
    "Панчлайны": punchScore,
    "Структура": structureScore,
    "Оригинальность": originalityScore
  };

  const advice = [];
  if (rhymeScore < 5) advice.push("Добавь больше совпадений гласных или окончаний.");
  else advice.push("Хорошая плотность рифм и ассонанса.");
  
  if (stabilityScore < 5) advice.push("Слишком хаотичная длина строк, попробуй сделать её более предсказуемой.");
  else if (stabilityScore >= 8) advice.push("Хорошая ровность и динамика длины строк.");
  
  if (structureScore < 6) advice.push("Добавь маркеры структуры ([Припев], [Куплет]) или сделай её более явной.");
  else advice.push("Структура трека читается хорошо.");

  if (originalityScore < 5) advice.push("Попробуй использовать больше уникальных или сленговых слов.");
  else advice.push("Хорошая оригинальность лексики.");

  return { scores, advice };
}

function updateTextUI(result) {
  const container = document.getElementById('textScores');
  const names = ['Рифма/Ассонанс', 'Ритм/флоу', 'Смысл', 'Панчлайны', 'Структура', 'Оригинальность'];
  
  if (container) {
    container.innerHTML = '';
    names.forEach((name) => {
      const score = result.scores?.[name] ?? '—';
      const card = document.createElement('div');
      card.className = 'card';
      const cls = typeof score === 'number' ? (score >= 8 ? 'sc-good' : score >= 5 ? 'sc-mid' : 'sc-bad') : '';
      card.innerHTML = `<span class="card-name">${name}</span><span class="card-score ${cls}">${score}${typeof score === 'number' ? '/10' : ''}</span>`;
      container.appendChild(card);
    });
  }

  const adviceBox = document.getElementById('textAdvice');
  if (adviceBox && Array.isArray(result.advice)) {
    adviceBox.innerHTML = `<ul>${result.advice.map(a => `<li>${a}</li>`).join('')}</ul>`;
  }

  // Сохраняем и обновляем общую оценку
  if (result.scores) {
    const vals = Object.values(result.scores);
    const avg = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    globalScores.text = { scores: result.scores, average: avg };
    updateOverallScore();
  }
}

function initTextBlock() {
  const textarea = document.getElementById('lyricsInput');
  const counter = document.getElementById('charCount');
  const btn = document.getElementById('analyzeTextBtn');

  if (textarea && counter) {
    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length} символов`;
    });
  }

  const names = ['Рифма/Ассонанс', 'Ритм/флоу', 'Смысл', 'Панчлайны', 'Структура', 'Оригинальность'];
  const container = document.getElementById('textScores');
  if (container) {
    container.innerHTML = '';
    names.forEach((name) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<span class="card-name">${name}</span><span class="card-score">—</span>`;
      container.appendChild(card);
    });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const text = textarea?.value?.trim();
      if (!text || text.length < 20) {
        alert('Вставь текст песни (минимум 20 символов).');
        return;
      }

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Анализирую...';

      setTimeout(() => {
        try {
          const result = analyzeTextHeuristic(text);
          updateTextUI(result);
        } catch (e) {
          console.error(e);
          alert('Ошибка анализа текста.');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }, 300);
    });
  }
}

// ----- dropzones -----
const state = { vocal: null, beat: null, mix: null, final: null };

function initDropzones() {
  const zones = document.querySelectorAll('.dropzone');

  zones.forEach((zone) => {
    const input = zone.querySelector('input[type="file"]');
    const kind = zone.dataset.kind;

    zone.addEventListener('click', () => input?.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(kind, file, zone);
    });
    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) handleFile(kind, file, zone);
    });
  });

  const vocalBtn = document.getElementById('analyzeVocalBtn');
  const mixBtn = document.getElementById('analyzeMixBtn');

  vocalBtn?.addEventListener('click', () => analyzeVocal());
  mixBtn?.addEventListener('click', () => analyzeMix());

  document.addEventListener('soundcheck:filechange', () => {
    if (vocalBtn) vocalBtn.disabled = !(state.vocal && state.beat);
    if (mixBtn) mixBtn.disabled = !state.mix;
  });
}

function handleFile(kind, file, zone) {
  state[kind] = file;
  zone.classList.add('has-file');
  const textEl = zone.querySelector('.dz-text');
  if (textEl) textEl.textContent = file.name;
  document.dispatchEvent(new CustomEvent('soundcheck:filechange', { detail: { kind, file } }));
}

// =========================================
// АУДИО-ДВИЖОК
// =========================================

async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function analyzeVolume(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  let sumSquares = 0;
  let peak = 0;
  let clippedSamples = 0;

  for (let i = 0; i < data.length; i++) {
    const sample = data[i];
    const absSample = Math.abs(sample);
    sumSquares += sample * sample;
    if (absSample > peak) peak = absSample;
    if (absSample >= 0.999) clippedSamples++;
  }

  const rms = Math.sqrt(sumSquares / data.length);
  const db = 20 * Math.log10(rms || 0.00001);

  return { peak, rms, db, clippingRatio: clippedSamples / data.length };
}

async function analyzeSpectrum(audioBuffer) {
  const startSample = Math.floor(audioBuffer.length / 2);
  const length = Math.min(audioBuffer.sampleRate, audioBuffer.length - startSample);
  const slice = audioBuffer.getChannelData(0).slice(startSample, startSample + length);

  const offlineCtx = new OfflineAudioContext(1, length, audioBuffer.sampleRate);
  const buffer = offlineCtx.createBuffer(1, length, audioBuffer.sampleRate);
  buffer.copyToChannel(slice, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();

  const tempCtx = new AudioContext();
  const tempSource = tempCtx.createBufferSource();
  const tempAnalyser = tempCtx.createAnalyser();
  tempAnalyser.fftSize = 2048;

  tempSource.buffer = rendered;
  tempSource.connect(tempAnalyser);
  tempAnalyser.connect(tempCtx.destination);
  tempSource.start(0);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const freqData = new Uint8Array(tempAnalyser.frequencyBinCount);
  tempAnalyser.getByteFrequencyData(freqData);

  const binHz = audioBuffer.sampleRate / tempAnalyser.fftSize;
  const lowEnd = Math.floor(250 / binHz);
  const midEnd = Math.floor(4000 / binHz);

  let low = 0, mid = 0, high = 0;
  for (let i = 0; i < freqData.length; i++) {
    const v = freqData[i];
    if (i < lowEnd) low += v;
    else if (i < midEnd) mid += v;
    else high += v;
  }

  const total = low + mid + high || 1;
  tempCtx.close();

  return { low: low / total, mid: mid / total, high: high / total };
}

// =========================================
// ПОИСК ПИКОВ И BPM
// =========================================

function findPeaks(audioBuffer, minDistance = 0.1) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const peaks = [];
  const step = Math.floor(sampleRate * 0.01);

  const energies = [];
  for (let i = 0; i < data.length - step; i += step) {
    let energy = 0;
    for (let j = 0; j < step; j++) {
      energy += Math.abs(data[i + j]);
    }
    energies.push(energy / step);
  }

  let lastPeakIndex = -Infinity;
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      const time = (i * step) / sampleRate;
      if (time - lastPeakIndex > minDistance) {
        peaks.push(time);
        lastPeakIndex = time;
      }
    }
  }
  return peaks;
}

function findStrongPeaks(audioBuffer, minDistance = 0.3) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const peaks = [];
  const step = Math.floor(sampleRate * 0.02);

  const energies = [];
  for (let i = 0; i < data.length - step; i += step) {
    let energy = 0;
    for (let j = 0; j < step; j++) {
      energy += Math.abs(data[i + j]);
    }
    energies.push(energy / step);
  }

  const avg = energies.reduce((s, e) => s + e, 0) / energies.length;
  
  let lastPeakIndex = -Infinity;
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > avg * 1.5 && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      const time = (i * step) / sampleRate;
      if (time - lastPeakIndex > minDistance) {
        peaks.push(time);
        lastPeakIndex = time;
      }
    }
  }
  return peaks;
}

function calculateBPM(peaks) {
  if (peaks.length < 2) return 0;
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - peaks[i - 1];
    if (interval > 0.2 && interval < 2.0) {
      intervals.push(interval);
    }
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  return Math.round(60 / medianInterval);
}

function analyzeTiming(vocalBuffer, beatBuffer, userBPM = 0) {
  const vocalPeaks = findPeaks(vocalBuffer, 0.15);
  const beatPeaks = findPeaks(beatBuffer, 0.25);

  let totalDeviation = 0;
  let matches = 0;
  vocalPeaks.forEach((vocalTime) => {
    let minDiff = Infinity;
    beatPeaks.forEach((beatTime) => {
      const diff = Math.abs(vocalTime - beatTime);
      if (diff < minDiff) minDiff = diff;
    });
    if (minDiff < 0.08) {
      matches++;
      totalDeviation += minDiff;
    }
  });
  const accuracy = vocalPeaks.length > 0 ? (matches / vocalPeaks.length) * 100 : 0;
  const avgDeviation = (matches > 0) ? (totalDeviation / matches) * 1000 : 0;

  let bpmScore = 0;
  let detectedBPM = 0;
  
  if (userBPM > 0) {
    detectedBPM = userBPM;
    if (userBPM >= 60 && userBPM <= 200) {
      bpmScore = 10;
    } else {
      bpmScore = 5;
    }
  } else {
    const strongBeatPeaks = findStrongPeaks(beatBuffer, 0.3);
    detectedBPM = calculateBPM(strongBeatPeaks);
    if (detectedBPM >= 70 && detectedBPM <= 160) {
      bpmScore = 10;
    } else if (detectedBPM > 0) {
      bpmScore = 5;
    }
  }

  return {
    totalOnsets: vocalPeaks.length,
    beatOnsets: beatPeaks.length,
    matches,
    accuracy,
    avgDeviation,
    beatBPM: detectedBPM,
    bpmScore
  };
}

// =========================================
// ОБРАБОТЧИКИ КНОПОК
// =========================================

async function analyzeVocal() {
  if (!state.vocal || !state.beat) {
    alert('Загрузи вокал и инструментал!');
    return;
  }

  const bpmInput = document.getElementById('bpmInput');
  const userBPM = bpmInput ? parseInt(bpmInput.value) || 0 : 0;

  try {
    console.log('Декодирую вокал...');
    const vocalBuffer = await decodeAudioFile(state.vocal);
    console.log('Декодирую бит...');
    const beatBuffer = await decodeAudioFile(state.beat);

    const timing = analyzeTiming(vocalBuffer, beatBuffer, userBPM);
    console.log('Тайминг:', timing);

    const adviceBox = document.getElementById('vocalAdvice');
    if (adviceBox) {
      let bpmText = '';
      if (userBPM > 0) {
        bpmText = `<li>BPM (введён вручную): <b>${timing.beatBPM}</b> (${timing.bpmScore}/10)</li>`;
      } else {
        bpmText = `<li>BPM (вычислен): <b>${timing.beatBPM}</b> (${timing.bpmScore}/10)</li>`;
      }

      adviceBox.innerHTML = `
        <ul>
          <li>Попадание в бит: <b>${timing.accuracy.toFixed(0)}%</b> (Среднее отклонение: ${timing.avgDeviation.toFixed(0)} мс)</li>
          ${bpmText}
          <li>Найдено пиков: ${timing.totalOnsets} вокал / ${timing.beatOnsets} бит</li>
        </ul>
      `;
    }

    // Сохраняем и обновляем общую оценку
    globalScores.vocal = {
      accuracy: timing.accuracy,
      average: Math.min(10, Math.max(1, Math.round(timing.accuracy / 10)))
    };
    updateOverallScore();

  } catch (e) {
    console.error('Ошибка анализа вокала:', e);
    alert('Не удалось декодировать файлы. Проверь формат.');
  }
}

async function analyzeMix() {
  if (!state.mix) {
    alert('Загрузи финальный микс!');
    return;
  }

  try {
    const buffer = await decodeAudioFile(state.mix);
    const volume = analyzeVolume(buffer);
    const spectrum = await analyzeSpectrum(buffer);

    const scores = {
      peak: scorePeak(volume.peak),
      rms: scoreRms(volume.db),
      clipping: scoreClipping(volume.clippingRatio),
      spectrum: scoreSpectrum(spectrum)
    };

    const total = calculateTotalScore(scores);
    const verdict = getVerdict(total);

    const mixScores = document.getElementById('mixScores');
    if (mixScores) {
      mixScores.innerHTML = `
        <div class="card"><span class="card-name">Громкость (пик)</span><span class="card-score ${scoreClass(scores.peak)}">${scores.peak}/10</span></div>
        <div class="card"><span class="card-name">Громкость (RMS)</span><span class="card-score ${scoreClass(scores.rms)}">${scores.rms}/10</span></div>
        <div class="card"><span class="card-name">Клиппинг</span><span class="card-score ${scoreClass(scores.clipping)}">${scores.clipping}/10</span></div>
        <div class="card"><span class="card-name">Спектр</span><span class="card-score ${scoreClass(scores.spectrum)}">${scores.spectrum}/10</span></div>
      `;
    }

    const mixAdvice = document.getElementById('mixAdvice');
    if (mixAdvice) {
      const adviceList = [];
      if (scores.peak < 7) adviceList.push('Пик далёк от оптимума — проверь лимитер на мастере.');
      if (scores.rms < 7) adviceList.push('RMS вне целевого диапазона — подтяни общую громкость.');
      if (scores.clipping < 10) adviceList.push('Есть клиппинг — снизь уровень на мастере на 1–2 dB.');
      if (spectrum.low < 0.25) adviceList.push('Мало низов — добавь бочки/баса, проверь эквалайзер на мастере.');
      if (spectrum.high > 0.35) adviceList.push('Много верхов — приглуши хэты/сибилянты на 2–3 dB.');
      if (adviceList.length === 0) adviceList.push('Микс в отличной форме — можно выкладывать.');

      mixAdvice.innerHTML = `<ul>${adviceList.map(a => `<li>${a}</li>`).join('')}</ul>`;
    }

    // Сохраняем и обновляем общую оценку
    globalScores.mix = {
      scores,
      total,
      average: Math.round(total / 10)
    };
    updateOverallScore();

  } catch (e) {
    console.error('Ошибка анализа микса:', e);
    alert('Не удалось декодировать файл. Проверь формат.');
  }
}

function scoreClass(score) {
  if (score >= 8) return 'sc-good';
  if (score >= 5) return 'sc-mid';
  return 'sc-bad';
}

// =========================================
// ОЦЕНКИ
// =========================================
function scorePeak(peak) {
  const p = peak * 100;
  if (p >= 80 && p <= 90) return 10;
  if (p >= 70 && p < 80) return 8;
  if (p > 90 && p <= 95) return 8;
  if (p >= 60 && p < 70) return 6;
  if (p > 95 && p <= 98) return 6;
  if (p >= 50 && p < 60) return 4;
  if (p > 98) return 3;
  return 2;
}

function scoreRms(db) {
  if (db >= -14 && db <= -11) return 10;
  if (db >= -16 && db < -14) return 8;
  if (db > -11 && db <= -9) return 8;
  if (db >= -18 && db < -16) return 6;
  if (db > -9 && db <= -7) return 6;
  if (db >= -22 && db < -18) return 4;
  if (db > -7) return 3;
  return 2;
}

function scoreClipping(ratio) {
  const r = ratio * 100;
  if (r === 0) return 10;
  if (r < 0.01) return 9;
  if (r < 0.05) return 7;
  if (r < 0.1) return 5;
  if (r < 0.5) return 3;
  return 1;
}

function scoreSpectrum(spec) {
  const { low, mid, high } = spec;
  let score = 10;
  if (low < 0.15) score -= 3;
  else if (low < 0.25) score -= 1;
  else if (low > 0.5) score -= 3;
  else if (low > 0.4) score -= 1;
  if (mid < 0.3) score -= 2;
  else if (mid > 0.65) score -= 2;
  if (high > 0.35) score -= 3;
  else if (high > 0.25) score -= 1;
  else if (high < 0.05) score -= 1;
  return Math.max(1, Math.min(10, score));
}

function calculateTotalScore(scores) {
  const weights = { peak: 0.2, rms: 0.25, clipping: 0.25, spectrum: 0.3 };
  let total = 0;
  for (const key in weights) {
    total += scores[key] * weights[key];
  }
  return Math.round(total * 10);
}

function getVerdict(score) {
  if (score >= 80) return { text: 'Готов к релизу', cls: 'v-good' };
  if (score >= 60) return { text: 'Почти готов, доработай детали', cls: 'v-mid' };
  if (score >= 40) return { text: 'Нужно доработать', cls: 'v-mid' };
  return { text: 'Требуется серьёзная работа', cls: 'v-bad' };
}