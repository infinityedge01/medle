// deno-lint-ignore-file no-unused-vars prefer-const no-window-prefix
const decode = (data) => {
  var input = 'PzclHZIYLhjkSuBewrfdbqRTXDstvnJpyCUQaFMgmKWoGiNOVAEx';
  var output = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let ret = data.split("");
  for (let i = 0; i < data.length; i++)
    if (input.includes(data[i]))
      ret[i] = output[input.indexOf(data[i])];
  return JSON.parse(unescape(window.atob(ret.join(""))));
};

tune = decode(encodedTune);
const N = tune.length;
const DECO_8VA = 1;
const DECO_8VB = 2;
const DECO_SHARP = 4;
const DECO_FLAT = 8;
const DECO_APPO = 16;
const MIN_PITCH = 24;
const MAX_PITCH = 105;
const tuneDecos = tune.map((note) => {
  let a = note[0];
  let r = 0;
  if (a >= 100) {
    r |= DECO_APPO;
    a -= 100;
    note[0] = a;
  }
  if (a < 1) r |= DECO_8VB;
  if (a > 7) r |= DECO_8VA;
  const i = Math.round(a);
  if (i !== a) {
    note[0] = i;
    r |= (a < i ? DECO_FLAT : DECO_SHARP);
  }
  return r;
});
const tuneAnswer = tune.map((x) => (x[0] + 6) % 7 + 1);

const attemptsLimit = (N >= 10 ? 6 : 5);

const SCALE = [0, 2, 4, 5, 7, 9, 11];

let tuneDur = 0;
for (const v of tune) {
  for (let i = 1; i < v.length; i++) {
    const t = v[i];
    v[i] = tuneDur;
    tuneDur += t;
  }
}

let sfxOn;
let metronomeOn;
let useWaterflow;
let musicOffset = 0;

const loadMusicOffset = () => {
  if (localStorage.getItem("music-offset") !== null) {
    musicOffset = Math.floor(Number(localStorage.getItem("music-offset")));
    if (isNaN(musicOffset))
      musicOffset = 0;
  }
  document.getElementById('music-offset').innerHTML = musicOffset;
};

let unknownStatus = false;

const loadProblemStatus = () => {
  let x = localStorage.getItem("problemStatus-" + puzzleId);
  if (x === null) {
    localStorage.setItem("problemStatus-" + puzzleId, x = "0");
    if (localStorage.getItem("savedGuesses-" + puzzleId) === null)
      return;
    unknownStatus = true;
  }
};

const modifyMusicOffset = (num) => {
  musicOffset = num;
  document.getElementById('music-offset').innerHTML = num;
  localStorage.setItem("music-offset", num);
};

const metronomeOffset =
  () => (metronomeOn && metronome[0] < 0 ? -metronome[0] : 0);

const createRow = (decos, parentEl, rowIndex) => {
  const o = {};

  const n = decos.length;

  const div = (parentEl, classes) => {
    const el = document.createElement('div');
    if (typeof classes === 'string')
      el.classList.add(classes);
    else if (typeof classes === 'object')
      for (const cl of classes) el.classList.add(cl);
    parentEl.appendChild(el);
    return el;
  };

  const bgDivs = [];
  const fgDivs = [];
  const fgTexts = [];

  const el1 = div(parentEl, 'list');
  const el2 = div(el1, 'bg');
  const el3 = div(el1, 'fg');
  for (let i = 0; i < n; i++) {
    const el4a = n <= 10 ? div(el2, 'bubble') : div(el2, 'small-bubble');
    const el5a = div(el4a, 'content');
    const el4b = n <= 10 ? div(el3, 'bubble') : div(el3, 'small-bubble');
    const el5b = div(el4b, 'content');
    bgDivs.push(el4a);
    fgDivs.push(el4b);
    fgTexts.push(el5b);
    // Decoration?
    if (decos[i] & DECO_8VA) div(el5a, ['tune-dot', 'ottava']);
    if (decos[i] & DECO_8VB) div(el5a, ['tune-dot', 'ottava-bassa']);
    if (decos[i] & DECO_FLAT) el5a.classList.add('flat');
    if (decos[i] & DECO_SHARP) el5a.classList.add('sharp');
    if (decos[i] & DECO_APPO) {
      el4a.classList.add('appo');
      el4b.classList.add('appo');
    }
    div(el5a, 'accidental');
  }

  o.fill = (i, s) => {
    bgDivs[i].classList.remove('hidden');
    fgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.remove('outline');
    bgDivs[i].classList.add('filled');
    for (let s = 1; s <= 7; s++) {
      fgDivs[i].classList.remove(`solf-${s}`);
      bgDivs[i].classList.remove(`solf-${s}`);
    }
    if (s !== undefined) {
      fgDivs[i].classList.add(`solf-${s}`);
      bgDivs[i].classList.add(`solf-${s}`);
    }
  };
  o.clear = (i) => {
    bgDivs[i].classList.remove('hidden');
    bgDivs[i].classList.remove('filled');
    bgDivs[i].classList.add('outline');
    fgDivs[i].classList.add('hidden');
  };
  o.style = (i, s) => {
    bgDivs[i].classList.add(s);
    fgDivs[i].classList.add(s);
  };
  o.clearStyle = (i, s) => {
    bgDivs[i].classList.remove(s);
    fgDivs[i].classList.remove(s);
  };
  o.pop = (i, keep) => {
    fgDivs[i].classList.add('large');
    bgDivs[i].classList.add('large');
    setTimeout(() => {
        fgDivs[i].classList.remove('large');
        bgDivs[i].classList.remove('large');
      }, isFinite(keep) ?
      Math.min(100, Math.max(75, keep / 2)) :
      100);
  };
  o.show = (b) => {
    if (b) {
      for (let i = 0; i < n; i++) bgDivs[i].classList.remove('hidden');
      for (let i = 0; i < n; i++) fgDivs[i].classList.remove('hidden');
    } else {
      for (let i = 0; i < n; i++) bgDivs[i].classList.add('hidden');
      for (let i = 0; i < n; i++) fgDivs[i].classList.add('hidden');
    }
  };
  o.fast = (b) => {
    if (b)
      for (let i = 0; i < n; i++) bgDivs[i].classList.add('fast');
    else
      for (let i = 0; i < n; i++) bgDivs[i].classList.remove('fast');
  };
  o.fastPop = (b) => {
    if (b)
      for (let i = 0; i < n; i++) bgDivs[i].classList.add('fast-pop');
    else
      for (let i = 0; i < n; i++) bgDivs[i].classList.remove('fast-pop');
  };
  o.serrated = (b) => {
    if (b) {
      for (let i = 0; i < n; i++) bgDivs[i].classList.add('serrated');
      for (let i = 0; i < n; i++) fgDivs[i].classList.add('serrated');
    } else {
      for (let i = 0; i < n; i++) bgDivs[i].classList.remove('serrated');
      for (let i = 0; i < n; i++) fgDivs[i].classList.remove('serrated');
    }
  };

  if (rowIndex !== undefined) {
    el1.addEventListener('click', () => window.replay(rowIndex));
  }

  return o;
};

const check = (answer, guess) => {
  const n = answer.length;
  const result = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    guess[i] = parseInt(guess[i]);
  for (let i = 0; i < n; i++)
    if (answer[i] === guess[i]) result[i] = 2;
  for (let i = 0; i < n; i++)
    if (result[i] !== 2) {
      // Look for the leftmost unmarked occurrence of answer[i] in the guess
      for (let j = 0; j < n; j++)
        if (result[j] === 0 && answer[i] === guess[j]) {
          result[j] = 1;
          break;
        }
    }
  return result;
};

const sendAnalytics = async (contents) => {
  const form = new FormData();
  form.append('puzzle', puzzleId);
  form.append('t', contents);
  let req = await fetch('/analytics', {
    method: 'POST',
    body: form
  });
  let ret = await req.json();
  return ret;
};

const audios = {};
const paths = [
  ['/static/samples/pop.wav'],
  ['/static/samples/beat.wav']
];

const notesReachable = {};
const octaves = [0];
const accidentals = [0];
if (!tuneDecos.every((r) => (r & DECO_8VA) === 0)) octaves.push(12);
if (!tuneDecos.every((r) => (r & DECO_8VB) === 0)) octaves.push(-12);
if (!tuneDecos.every((r) => (r & DECO_SHARP) === 0)) accidentals.push(1);
if (!tuneDecos.every((r) => (r & DECO_FLAT) === 0)) accidentals.push(-1);
for (const a of octaves)
  for (const b of accidentals)
    for (const c of SCALE)
      notesReachable[a + b + c] = true;
for (let i = -12; i <= 24; i++)
  if (notesReachable[i])
    paths.push([
      `/static/samples/pf-${tunePitchBase + i}.ogg`,
      `/static/samples/pf-${tunePitchBase + i}.mp3`,
    ]);

// Music offset adjust
paths.push([
  `/static/samples/pf-72.ogg`,
  `/static/samples/pf-72.mp3`,
]);
paths.push([
  `/static/samples/pf-60.ogg`,
  `/static/samples/pf-60.mp3`,
]);

const preloadSounds = (callback) => {
  let count = 0;
  for (const pathList of paths) {
    const name = pathList[0].split('/').pop().split('.')[0];
    const audio = new Howl({
      src: pathList
    });
    audio.once('load', () => {
      callback(++count, paths.length);
    });
    audios[name] = audio;
  }
};

const playSound = (name, vol) => {
  if (!sfxOn) return;
  if (name === 'beat' && !metronomeOn) return;
  const id = audios[name].play();
  audios[name].volume(vol !== undefined ? vol : 1, id);
  return [name, id];
};
const stopSound = ([name, id], fade) => {
  if (!sfxOn) return;
  if (fade) {
    audios[name].fade(audios[name].volume(undefined, id), 0, 100, id);
  } else {
    audios[name].stop(id);
  }
};

const modalBackground = document.getElementById('modal-bg');
let modalStack = [];
let modalStackOnClose = [];

let onAdjust = false;
let adjustNums = [undefined, undefined, undefined, undefined];
let adjustTimeTick = 0;
let adjustStep = -1;
const adjustOneNote = 500;

const acceptAdjustClick = () => {
  if (adjustStep === -1 || adjustNums[adjustStep] !== undefined)
    return;
  adjustNums[adjustStep] = (adjustOneNote * (adjustStep * 4 + 2) + adjustTimeTick - Date.now() + 50);
  document.getElementById('music-offset-adjuster-' + (adjustStep + 1)).innerHTML = adjustNums[adjustStep];
};

const startAdjust = () => {
  if (onAdjust)
    return;
  onAdjust = true;
  const box = document.getElementById('options-music-offset-adjuster');
  box.classList.remove('hidden');
  let adjusterList = [];
  for (let i = 1; i <= 4; i ++)
    adjusterList.push(document.getElementById('music-offset-adjuster-' + i));
  for (let i = 0; i < 4; i ++) {
    adjusterList[i].innerHTML = '-';
    adjusterList[i].classList.remove('active');
  }
  const lowPitch = 'pf-60';
  const highPitch = 'pf-72';
  const delayTime = 1000;
  const lastTime = delayTime + adjustOneNote * (4 * 4 + 1);
  adjustTimeTick = Date.now() + delayTime;
  adjustNums = [undefined, undefined, undefined, undefined];
  adjustStep = -1;

  for (let i = 0; i < 4; i ++) {
    setTimeout(() => {
      if (i !== 0)
        adjusterList[i-1].classList.remove('active');
      adjusterList[i].classList.add('active');
      adjustStep = i;
      playSound(lowPitch);
    }, delayTime + adjustOneNote * (4 * i));
    
    setTimeout(() => {
      playSound(lowPitch);
    }, delayTime + adjustOneNote * (4 * i + 1));
    
    setTimeout(() => {
      playSound(highPitch);
    }, delayTime + adjustOneNote * (4 * i + 2));
    
    setTimeout(() => {
      playSound(highPitch);
    }, delayTime + adjustOneNote * (4 * i + 2));
  }

  setTimeout(() => {
    onAdjust = false;
    adjustStep = -1;
    box.classList.add('hidden');

    let count = 0, total = 0;
    for(let i = 0; i < 4; i ++) if(adjustNums[i] !== undefined) {
      ++ count;
      total += adjustNums[i];
    }

    if (count !== 0)
      modifyMusicOffset(Math.floor(total / count));

  }, lastTime);
};

document.getElementById('btn-start-adjust')
  .addEventListener('click', startAdjust);
document.addEventListener('mousedown', (e) => {
  if (onAdjust)
    acceptAdjustClick();
});
document.addEventListener('touchstart', (e) => {
  if (onAdjust)
    acceptAdjustClick();
});
document.addEventListener('keydown', (e) => {
  if (onAdjust)
    acceptAdjustClick();
});

const closeModal = () => {
  if (modalStack.length === 0 || onAdjust) return;
  // Close the topmost modal
  const el1 = modalStack.pop();
  el1.classList.add('hidden');
  const fn = modalStackOnClose.pop();
  if (fn) fn();
  // Hide the background, or show the new topmost modal
  if (modalStack.length === 0) {
    modalBackground.classList.add('hidden');
  } else {
    const el2 = modalStack[modalStack.length - 1];
    el2.classList.remove('hidden');
  }
};
const showModal = (id, onClose) => {
  if (modalStack.length > 0)
    modalStack[modalStack.length - 1].classList.add('hidden');
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  modalStack.push(el);
  modalStackOnClose.push(onClose);
  modalBackground.classList.remove('hidden');
};
modalBackground.addEventListener('mouseup', closeModal);

const loadingContainer = document.getElementById('text-loading');
const loadingProgress = document.getElementById('text-loading-progress');
const startButton = document.getElementById('btn-start');
const textTip = document.getElementById('text-tip');

// Back up local storage with cookies
const clearCookies = () => {
  const items = document.cookie.split(';');
  if (items)
    for (const s of items) {
      const i = s.indexOf('=');
      const key = decodeURIComponent(s.substring(0, i).trim());
      const value = decodeURIComponent(s.substring(i + 1));
      document.cookie = `${encodeURIComponent(key)}=; samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
};
const cookieToLocalStorage = () => {
  localStorage.clear();
  const items = document.cookie.split(';');
  for (const s of items) {
    const i = s.indexOf('=');
    const key = decodeURIComponent(s.substring(0, i).trim());
    const value = decodeURIComponent(s.substring(i + 1));
    localStorage[key] = value;
  }
};
const localStorageToCookie = () => {
  clearCookies();
  for (const [key, value] of Object.entries(localStorage)) {
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; samesite=strict; max-age=2592000`;
  }
};

if (localStorage.length === 0 && document.cookie) {
  cookieToLocalStorage();
}

// Display tip
const tips = textTip.children;
const tipIndex = ((+localStorage.tip || 0) + 1) % tips.length;
localStorage.tip = tipIndex;
tips[tipIndex].style.display = 'inline';

let gamePreloaded = false;
let gameStarted = false;
let statMode = 0;

const flushStat = () => {
  let cnt = [0, 0, 0, 0, 0, 0, 0, 0];
  const getNum = (str) => {
    let x = localStorage.getItem(str);
    if(x === null)
      x = 0;
    else
      x = Number(x);
    return x;
  }
  for (let i = 0; i < 2; i ++) if(statMode !== i + 1) {
    cnt[0] += getNum('statictics-' + i + '-total');
    for (let j = 1; j <= 7; j ++) 
      cnt[j] += getNum('statictics-' + i + '-' + (j <= 6 ? j : 'fail'));
  }
  let mxm = 0;
  for (let i = 1; i <= 7; i ++)
    mxm = Math.max(mxm, cnt[i]);
  let total = 0;
  for (let i = 1; i <= 7; i ++) {
    let controlId = (i > 6 ? 'fail' : String(i));
    let percent = 0;
    if (mxm != 0)
      percent = cnt[i] / mxm;
    if (i !== 7)
      total += i * cnt[i];
    document.getElementById('stat-progress-bar-' + controlId).style.width = String(percent * 100) + '%';
    if (percent >= 0.5) {
      document.getElementById('stat-progress-bar-' + controlId).innerHTML = cnt[i];
      document.getElementById('stat-progress-outer-count-' + controlId).innerHTML = '';
      document.getElementById('stat-progress-outer-count-' + controlId).classList.add('hidden');
    }
    else {
      document.getElementById('stat-progress-bar-' + controlId).innerHTML = '';
      document.getElementById('stat-progress-outer-count-' + controlId).innerHTML = cnt[i];
      document.getElementById('stat-progress-outer-count-' + controlId).classList.remove('hidden');
    }
  }
  document.getElementById('stat-total-puzzles').innerHTML = cnt[0];
  document.getElementById('stat-accuracy').innerHTML = (
    cnt[0] === 0 ? '-' : (((cnt[0] - cnt[7]) / cnt[0] * 100).toFixed(2)) + '%'
  );
  document.getElementById('stat-average-step').innerHTML = (
    cnt[0] === cnt[7] ? '-' : ((total / (cnt[0] - cnt[7])).toFixed(2))
  );

};

const flushStatButtons = (num) => {
  for (let i = 0; i < 3; i ++) {
    if (i === num)
      document.getElementById('btn-stat-' + i).classList.remove('hidden');
    else
      document.getElementById('btn-stat-' + i).classList.add('hidden');
  }
  flushStat();
}

const initStatEvents = () => {
  document.getElementById('icon-btn-stat').addEventListener('click', () => {
    showModal('modal-stat');
  });
  flushStatButtons(0);
  document.getElementById('btn-stat').addEventListener('click'
    , () => flushStatButtons(statMode = (statMode + 1) % 3));
};

initStatEvents();

const startGame = (savedGuesses = []) => {
  gameStarted = true;
  startButton.classList.add('hidden');
  document.getElementById('start-btn-container').classList.add('no-pointer');
  textTip.classList.add('hidden');
  if (!(localStorage.getItem("savedGuesses-" + puzzleId) !== undefined &&
    localStorage.getItem("savedGuesses-" + puzzleId) !== null)) {
    sendAnalytics('start');
    localStorage.setItem("savedGuesses-" + puzzleId, "");
    savedGuesses = [];
  }

  const listContainer = document.getElementById('list-container');
  const btnsRow1 = document.getElementById('input-btns-row-1');
  const btnsRow2 = document.getElementById('input-btns-row-2');
  const btnDelBg = document.getElementById('input-btn-del-bg');
  const btnsConfirm = document.getElementById('input-btns-confirm');
  const btnConfirmBg = document.getElementById('input-btn-confirm-bg');
  const btnsReveal = document.getElementById('input-btns-reveal');
  const btnRevealBg = document.getElementById('input-btn-reveal-bg');
  const visitorCount = document.getElementById('total-visitors');

  let curPfSound = undefined;
  const stopPfSound = () => {
    if (curPfSound !== undefined) stopSound(curPfSound, true);
  };
  const playForPos = (pos, solf, vol) => {
    setTimeout(() => {
      const pitch = tunePitchBase + SCALE[solf - 1] +
        ((tuneDecos[pos] & DECO_8VA) ? 12 :
          (tuneDecos[pos] & DECO_8VB) ? -12 : 0) +
        ((tuneDecos[pos] & DECO_SHARP) ? 1 :
          (tuneDecos[pos] & DECO_FLAT) ? -1 : 0);
      stopPfSound();
      vol = (vol === undefined ? 1 : vol);
      if (tuneDecos[pos] & DECO_APPO) vol *= 0.5;
      curPfSound = playSound(`pf-${pitch}`, vol);
    }, Math.max(0, musicOffset));
  };
  const playPopForPos = (pos, vol) => {
    setTimeout(() => {
      vol = (vol === undefined ? 1 : vol);
      if (tuneDecos[pos] & DECO_APPO) vol *= 0.3;
      playSound('pop', vol);
    }, Math.max(0, musicOffset));
  };

  const curInput = [];
  const attInputs = [];
  const attResults = [];
  const attRows = [];
  let succeeded = false;
  let haveRevealed = false;

  let buttonsVisible = false;
  const pickVisibleButtons = () => {
    if (attResults.length === attemptsLimit || succeeded) {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsRow2.classList.add('must');
      btnsConfirm.classList.add('hidden');
      btnsReveal.classList.remove('hidden');
      recalcConfirmWidth();
      return;
    }
    btnsReveal.classList.add('hidden');
    if (curInput.length < N) {
      btnsRow1.classList.remove('hidden');
      btnsRow2.classList.remove('hidden');
      btnsConfirm.classList.add('hidden');
    } else {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsConfirm.classList.remove('hidden');
      recalcConfirmWidth();
    }
  };
  const showButtons = (b) => {
    buttonsVisible = b;
    if (b) {
      btnsRow1.classList.remove('hidden');
      btnsRow2.classList.remove('hidden');
      btnsRow2.classList.remove('must');
      btnsConfirm.classList.remove('hidden');
      btnsReveal.classList.remove('hidden');
      pickVisibleButtons();
    } else {
      btnsRow1.classList.add('hidden');
      btnsRow2.classList.add('hidden');
      btnsRow2.classList.add('must');
      btnsConfirm.classList.add('hidden');
      btnsReveal.classList.add('hidden');
    }
  };

  const initialRow = createRow(tuneDecos, listContainer, 0);
  initialRow.serrated(true);
  attRows.push(initialRow);
  initialRow.show(false);

  // Replay
  let replayTimers = [];
  let curReplay = -1;
  const animateInitialRow = (r) => {
    curReplay = -2;
    r.fast(true);
    r.serrated(false);
    r.show(false);
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      for (let j = 1; j < ts.length; j++) {
        setTimeout(() => {
          setTimeout(() => {
            if (j === 1) r.fill(i);
            else r.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
          }, Math.max(0, -musicOffset));
        }, (ts[j] + metronomeOffset()) * tuneBeatDur + 20);
        let timer = setTimeout(() => {
          playPopForPos(i);
        }, (ts[j] + metronomeOffset()) * tuneBeatDur + 20);
        replayTimers.push(timer);
      }
      for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
        let timer = setTimeout(() => playSound('beat'),
          (t + metronomeOffset()) * tuneBeatDur + 20 + Math.max(0, musicOffset));
        replayTimers.push(timer);
      }
    }
    setTimeout(() => {
      for (let i = 0; i < N; i++) r.clear(i);
      r.fast(false);
      r.serrated(true);
    }, (tuneDur + metronomeOffset()) * tuneBeatDur);
    setTimeout(() => {
      showButtons(true);
      curReplay = -1;
      replayTimers.splice(0);
    }, tuneDur * tuneBeatDur + 1000);
  };

  const stopReplay = () => {
    // Stop the replay in progress, if any
    if (curReplay !== -1) {
      for (const t of replayTimers) clearTimeout(t);
      replayTimers.splice(0);
      if (curReplay !== -2)
        for (let i = 0; i < N; i++)
          attRows[curReplay].clearStyle(i, 'large');
      curReplay = -1;
    }
  };
  const replay = (attemptIndex) => {
    const prevReplay = curReplay;
    stopReplay();
    if (!buttonsVisible) return;
    if (prevReplay === attemptIndex) {
      curReplay = -1;
      return;
    }
    // Start replay
    curReplay = attemptIndex;
    const input = (attemptIndex >= attInputs.length ?
      curInput : attInputs[attemptIndex]);
    const row = attRows[attemptIndex];
    const result = attResults[attemptIndex];
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      for (let j = 1; j < ts.length; j++) {
        const timer = setTimeout(() => {
          setTimeout(() => {
            row.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
          }, Math.max(0, -musicOffset));
          if (input[i] !== undefined) {
            const pop = (result && result[i] !== 2);
            playForPos(i, input[i], pop ? 0.2 : 1);
            if (pop) playPopForPos(i);
          } else {
            stopPfSound();
            playPopForPos(i);
          }
        }, (ts[j] + metronomeOffset()) * tuneBeatDur + 20);
        replayTimers.push(timer);
      }
      for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
        const timer = setTimeout(() => playSound('beat'),
          (t + metronomeOffset()) * tuneBeatDur + 20 + Math.max(0, musicOffset));
        replayTimers.push(timer);
      }
    }
    const timer = setTimeout(() => {
      curReplay = -1;
      replayTimers.splice(0);
    }, (tuneDur + metronomeOffset()) * tuneBeatDur + 20);
    replayTimers.push(timer);
  };
  window.replay = replay;

  const recalcConfirmWidth = () => {
    const rect = btnDelBg.getBoundingClientRect();
    const vw = document.body.clientWidth;
    const w = vw - 2 * (vw - rect.right);
    btnConfirmBg.style.width = (w / 1.2) + 'px'
  };
  window.addEventListener('resize', recalcConfirmWidth);

  let r = initialRow;

  window.input = (i) => {
    if (attResults.length === attemptsLimit || succeeded) return;
    stopReplay();
    if (i === -1 && curInput.length > 0) {
      curInput.pop();
      r.clear(curInput.length);
    } else if (i !== -1 && curInput.length < N) {
      const len = curInput.length;
      setTimeout(() => {
        r.fill(len, i);
      }, Math.max(0, -musicOffset))
      curInput.push(i);
      playForPos(curInput.length - 1, i);
    }
    pickVisibleButtons();
  };

  let previousGuesses = [];

  const addStatistics = (data) => {
    let x = localStorage.getItem('statictics-' + (isDaily ? '1' : '0') + '-' + data);
    if (x === null)
      x = "0";
    x = String(Number(x) + 1);
    localStorage.setItem('statictics-' + (isDaily ? '1' : '0') + '-' + data, x);
    x = localStorage.getItem('statictics-' + (isDaily ? '1' : '0') + '-total');
    if (x === null)
      x = "0";
    x = String(Number(x) + 1);
    localStorage.setItem('statictics-' + (isDaily ? '1' : '0') + '-total', x);
    flushStat();
  }

  window.confirmGuess = (silence = false, data = [], revealSilence = false) => {
    stopReplay();
    showButtons(false);
    const input = (silence ? data : curInput.splice(0));
    previousGuesses.push(input.join(""));
    localStorage.setItem("savedGuesses-" + puzzleId, previousGuesses.join(","));
    const result = check(tuneAnswer, input);
    r.show(true);
    const previousRow = r;
    const notePopSpeed = 20;
    if (silence) {
      const paint = (i, time) => {
        setTimeout(() => {
          if (result[i] === 0) previousRow.style(i, 'none');
          if (result[i] === 1) previousRow.style(i, 'maybe');
          if (result[i] === 2) previousRow.style(i, 'bingo');
          previousRow.style(i, 'solf-' + input[i]);
        }, time);
      }
      for (let i = 0; i < input.length; i ++)
        paint(i, i * notePopSpeed);
    }
    else
      for (let i = 0; i < N; i++) {
        const ts = tune[i];
        const r = previousRow;
        for (let j = 1; j < ts.length; j++) {
          setTimeout(() => {
            setTimeout(() => {
              r.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
              if (result[i] === 0) r.style(i, 'none');
              if (result[i] === 1) r.style(i, 'maybe');
              if (result[i] === 2) r.style(i, 'bingo');
            }, Math.max(0, -musicOffset))
            const pop = (result[i] !== 2);
            playForPos(i, input[i], pop ? 0.2 : 1);
            if (pop) playPopForPos(i);
          }, 500 + (ts[j] + metronomeOffset()) * tuneBeatDur);
        }
        if (!silence)
          for (let t = metronome[0]; t < tuneDur; t += metronome[1]) {
            setTimeout(() => playSound('beat'),
              500 + (t + metronomeOffset()) * tuneBeatDur + Math.max(0, musicOffset));
          }
      }
    attInputs.push(input);
    attResults.push(result);
    succeeded = result.every((r) => r === 2);
    const finished = (attResults.length === attemptsLimit || succeeded);
    let newRow;
    if (!finished) {
      newRow = r = createRow(tuneDecos, listContainer, attResults.length);
      r.show(false);
      r.serrated(true);
      attRows.push(r);
    }
    if (!revealSilence)
      setTimeout(async () => {
        let currFinished = (attResults.length === attemptsLimit || succeeded);
        if (currFinished) {
          if (haveRevealed)
            return;
          haveRevealed = true;
          // Send analytics
          let visits = [];
          if (!silence) {
            // sendAnalytics('fin ' + attInputs.map((a) => a.join('')).join(','));
            visits = await sendAnalytics('fin ' + (succeeded ? attInputs.length : attemptsLimit + 1));
            const problemStatus = (succeeded ? String(attInputs.length) : 'fail');
            localStorage.setItem("problemStatus-" + puzzleId, problemStatus);
            addStatistics(problemStatus);
          }
          else {
            if (localStorage.getItem("problemStatus-" + puzzleId) === "0") {
              if (!unknownStatus) {
                // after update but havn't added into database
                visits = await sendAnalytics('fin ' + (succeeded ? attInputs.length : attemptsLimit + 1));
              }
              else
                visits = await sendAnalytics('fetch');
              const problemStatus = (succeeded ? String(attInputs.length) : 'fail');
              localStorage.setItem("problemStatus-" + puzzleId, problemStatus);
              addStatistics(problemStatus);
            }
            else
              visits = await sendAnalytics('fetch');
          }
          // Reveal answer
          window.revealAnswer(visits);
          showButtons(true);
        } else {
          for (let i = 0; i < N; i++) newRow.clear(i);
          showButtons(true);
        }
      }, (silence ? 100 + input.length * notePopSpeed : 500 + (tuneDur + metronomeOffset()) * tuneBeatDur + 1000 + Math.abs(musicOffset)));
  };

  const answerContainer = document.getElementById('answer-container');
  const answerRow = createRow(tuneDecos, answerContainer);
  for (let i = 0; i < N; i++)
    answerRow.fill(i, tuneAnswer[i]);
  answerRow.serrated(true);

  const btnShare = document.getElementById('btn-share');
  new ClipboardJS(btnShare, {
    text: () => {
      btnShare.classList.add('copied');
      const prefix = `TOUHOU Medle ${puzzleId} ${succeeded ? attResults.length : 'X'}/${attemptsLimit}\n`;
      const suffix = `https://medle.akashiya.top/` +
        (puzzleId === todayDaily ? '' : puzzleId);
      return prefix +
        attResults.map((result) => result.map((r) => {
          // if (r === 0) return '\u{26aa}';
          // if (r === 1) return '\u{1f7e1}';
          // if (r === 2) return '\u{1f7e2}';
          if (r === 0) return 'Ｘ';
          if (r === 1) return 'ｅ';
          if (r === 2) return 'Ｏ';
        }).join('')).join('\n') +
        '\n' + suffix;
    }
  });

  let answerAudioLoading = false;
  let answerAudio;
  const btnPlay = document.getElementById('btn-play');
  const btnPlayContent = document.getElementById('btn-play-content');

  let fadeOutTimer = -1;
  let playing = false;
  const updatePlayButtonText = () => {
    btnPlayContent.innerText = (playing ? '\u{f04d}' : '\u{f04b}');
  };

  let revealBubbleTimers = [];

  const initVisualizer = (bxid, PL, PR) => {
    const box = document.getElementById(bxid);

    let lastColor = -1, lastIndex = 0;

    const addRail = (L, R) => {
      if (lastColor === -1)
        return;
      let W = 100 / (PR - PL + 3);
      const rail = document.createElement('div');
      rail.classList.add('visualizerRail');
      rail.style.left = `calc(${W / 2}% + (100% - ${2 * W}%) * ${(L - PL) / (PR - PL)})`;
      rail.style.width = `calc(${(R - L + 1) * W}% + 1px)`;
      if (lastColor === 1)
        rail.classList.add('deep');
      box.appendChild(rail);
    }

    const addColor = (col, idx) => {
      if (idx < PL || idx > PR)
        return;
      if(lastColor !== col) {
        addRail(lastIndex, idx - 1);
        lastIndex = idx;
      }
      lastColor = col;
    };

    for (let i = tunePitchBase - 120; i <= MAX_PITCH; i += 12) {
      if(i > PL && i <= PR) {
        const line = document.createElement('div');
        line.classList.add('visualizerLine');
        let W = 100 / (PR - PL + 3);
        line.style.left = `calc(${W / 2}% + (100% - ${2 * W}%) * ${(i - PL) / (PR - PL)} - 1px)`;
        box.appendChild(line);
      }
      let p = 0;
      for (let j = 0; j < 12; j ++) {
        if(j === SCALE[p]) {
          addColor(0, i + j);
          ++ p;
        }
        else
          addColor(1, i + j);
      }
    }
    addRail(lastIndex, PR);

    box.innerHTML += `<div class='visualizerLine' style='width: 100%; height: 2px; top: 0px; left: 0px;'></div>`;
  };

  // initVisualizer('visualizerLines', MIN_PITCH, MAX_PITCH);
  initVisualizer('visualizerLines', tunePitchBase - 12, tunePitchBase + 24);

  const createBubbleTimers = () => {
    const speed = 150;
    const hgt = document.getElementById('visualizer').clientHeight;
    for (let i = 0; i < N; i++) {
      const ts = tune[i];
      for (let j = 1; j < ts.length; j++) {
        const t = setTimeout(
          () => {
            answerRow.pop(i, (ts[j + 1] - ts[j]) * tuneBeatDur);
            answerRow.style(i, 'bingo');
          },
          ts[j] * tuneRevealBeatDur + tuneRevealOffset + Math.max(0, -musicOffset));
        revealBubbleTimers.push(t);
      }
    }
    if (useWaterflow) {
      let MAX_TIME = tuneDur, MIN_TIME = 1e9;
      let sortList = [];
      for (let i = 0; i < N; i++) {
        const ts = tune[i];
        for (let j = 1; j < ts.length; j++) {
          MIN_TIME = Math.min(MIN_TIME, ts[j]);
          sortList.push([ts[j], i]);
        }
      }
      sortList.push([tuneDur, -1]);
      sortList.sort((x, y) => {
        return x[0] - y[0];
      });
      const duelBox = (bxid, L, R) => {
        const box = document.getElementById(bxid);
        for (let p = 0; p < sortList.length - 1; p ++) {
          let i = sortList[p][1];
          let timer = setTimeout(() => {
            const note = document.createElement('div');
            const pitch = tunePitchBase + SCALE[tuneAnswer[i] - 1] +
              ((tuneDecos[i] & DECO_8VA) ? 12 :
                (tuneDecos[i] & DECO_8VB) ? -12 : 0) +
              ((tuneDecos[i] & DECO_SHARP) ? 1 :
                (tuneDecos[i] & DECO_FLAT) ? -1 : 0);
            const length = (sortList[p + 1][0] - sortList[p][0]) * tuneRevealBeatDur;
            note.classList.add('visualizeNote');
            note.classList.add('highlighted');
            note.style.transition = 'transform ' + (length / 1000 + hgt / speed) + 's linear';
            let W = 100 / (R - L + 3);
            note.style.left = `calc(${W / 2}% + (100% - ${2 * W}%) * ${(pitch - L) / (R - L)})`;
            note.style.bottom = '100%';
            note.style.width = `${W}%`;
            note.style.height = (length / 1000 * speed - (tuneAnswer[sortList[p+1][1]] === tuneAnswer[sortList[p][1]] ? 5 : 0)) + 'px';
            box.appendChild(note);
            setTimeout(() => {
              note.style.transform = `translateY(${(length / 1000 * speed) + hgt}px)`;
              setTimeout(() => {
                note.classList.remove('highlighted');
              }, length);
              setTimeout(() => {
                try {
                  box.removeChild(note);
                } catch {

                }
              }, (length + hgt / speed * 1000));
            }, 20);
          },
          sortList[p][0] * tuneRevealBeatDur + tuneRevealOffset + Math.max(0, -musicOffset));
          revealBubbleTimers.push(timer);
        }
        for (let t = metronome[0]; t <= tuneDur; t += metronome[1]) {
          let timer = setTimeout(() => {
             const beat = document.createElement('div');
             beat.classList.add('visualizeBeat');
             beat.style.top = '0px';
             beat.style.transition = 'transform ' + (hgt / speed) + 's linear';
             box.appendChild(beat);
             setTimeout(() => {
              beat.style.transform = `translateY(${hgt}px)`;
              setTimeout(() => {
                try {
                  box.removeChild(beat);
                } catch {

                }
              }, hgt / speed * 1000);
            }, 20);
          },
            t * tuneRevealBeatDur + tuneRevealOffset + Math.max(0, -musicOffset));
          revealBubbleTimers.push(timer);
        }
      }

      // duelBox('visualizerNotes', MIN_PITCH, MAX_PITCH);
      duelBox('visualizerNotes', tunePitchBase - 12, tunePitchBase + 24);

      let timer = setTimeout(() => {
        document.getElementById('visualizer').classList.remove('hidden');
        btnPlay.classList.add('small');
      }, MIN_TIME * tuneRevealBeatDur + tuneRevealOffset - 100 + Math.max(0, -musicOffset) - 1000);
      revealBubbleTimers.push(timer);
      timer = setTimeout(() => {
        document.getElementById('visualizer').classList.add('hidden');
        btnPlay.classList.remove('small');
      }, MAX_TIME * tuneRevealBeatDur + tuneRevealOffset - 100 + Math.max(0, -musicOffset) + 1500);
      revealBubbleTimers.push(timer);
    }

  };
  const stopBubbleTimers = () => {
    for (const t of revealBubbleTimers) clearTimeout(t);
    revealBubbleTimers.splice(0);
    for (let i = 0; i < N; i++) answerRow.clearStyle(i, 'bingo');
    document.getElementById('visualizer').classList.add('hidden');
    btnPlay.classList.remove('small');
    const visualNts = document.getElementById('visualizerNotes');
    const n = visualNts.childNodes.length;
    for (let i = 0; i < n; i ++)
      visualNts.removeChild(visualNts.firstChild);
    // const visualNts2 = document.getElementById('visualizerNotesSmall');
    // const n2 = visualNts2.childNodes.length;
    // for (let i = 0; i < n2; i ++)
    //   visualNts2.removeChild(visualNts2.firstChild);
  };

  let tmpVisitInfo = undefined;

  window.revealAnswer = (visits) => {
    if (visits === undefined)
      visits = tmpVisitInfo;
    else
      tmpVisitInfo = visits;
    visitorCount.innerHTML = visits[0];
    btnShare.classList.remove('copied');
    if (attemptsLimit == 5)
      document.getElementById('progress-6').classList.add('hidden');
    let mxm = 0, tot = 0, total = 0;
    for (let i = 1; i <= attemptsLimit + 1; i ++)
      mxm = Math.max(mxm, visits[i]), tot += visits[i];
    for (let i = 1; i <= attemptsLimit + 1; i ++) {
      let controlId = (i > attemptsLimit ? 'fail' : String(i));
      if (i <= attemptsLimit)
        total += i * visits[i];
      let percent = 0;
      if (mxm != 0)
        percent = visits[i] / mxm;
      document.getElementById('progress-bar-' + controlId).style.width = String(percent * 100) + '%';
      if (percent >= 0.5) {
        document.getElementById('progress-bar-' + controlId).innerHTML = visits[i];
        document.getElementById('progress-outer-count-' + controlId).classList.add('hidden');
      }
      else
        document.getElementById('progress-outer-count-' + controlId).innerHTML = visits[i];
    }

    document.getElementById('total-puzzles').innerHTML = tot;
    document.getElementById('accuracy').innerHTML = (
      tot === 0 ? '-' : (((tot - visits[attemptsLimit + 1]) / tot * 100).toFixed(2)) + '%'
    );
    document.getElementById('average-step').innerHTML = (
      tot === visits[attemptsLimit + 1] ? '-' : ((total / (tot - visits[attemptsLimit + 1])).toFixed(2))
    );

    showModal('modal-finish', () => {
      if (playing) window.revealPlay();
    });
    playing = false;

    if (!answerAudioLoading) {
      answerAudioLoading = true;
      answerAudio = new Howl({
        src: [`/reveal/${puzzleId}.mp3`]
      });
      answerAudio.once('load', () => {
        btnPlay.classList.remove('disabled');
        updatePlayButtonText();
      });
      answerAudio.on('end', () => {
        playing = false;
        updatePlayButtonText();
        stopBubbleTimers();
      });
    }

    for (let i = 0; i < N; i++)
      answerRow.clearStyle(i, 'bingo');
  };

  window.revealPlay = () => {
    stopReplay();
    if (fadeOutTimer !== -1) clearTimeout(fadeOutTimer);
    if (playing) {
      answerAudio.fade(1, 0, 100);
      fadeOutTimer = setTimeout(
        () => answerAudio.stop(),
        120);
      stopBubbleTimers();
    } else {
      setTimeout(() => {
        answerAudio.stop();
        answerAudio.fade(0, 1, 100);
        answerAudio.play();
      }, Math.max(0, musicOffset));
      fadeOutTimer = setTimeout(
        () => answerAudio.fade(1, 0, 100),
        answerAudio.duration() * 1000 - 120 + Math.max(0, musicOffset));
      createBubbleTimers();
    }
    playing = !playing;
    updatePlayButtonText();
  };

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (onAdjust) {
      acceptAdjustClick();
      return;
    }
    if (!buttonsVisible) return;
    // Do not use e.keyCode for better compatibility with numpads
    if (e.key.length === 1) {
      // Numeric
      const num = e.key.charCodeAt(0) - 48;
      if (num >= 1 && num <= 7) window.input(num);
      // Alphabetic
      if (localStorage.notation === 'nota-alpha') {
        const alpha = e.key.charCodeAt(0) - 97;
        if (alpha >= 0 && alpha <= 6) {
          const note = tuneNoteBase.charCodeAt(0) - 65;
          window.input((alpha - note + 7) % 7 + 1);
        }
      }
    } else if (e.key === 'Backspace') {
      window.input(-1);
    } else if (e.key === 'Enter') {
      if (curInput.length === N)
        window.confirmGuess();
    }
  });

  // * save today's progress
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
  const loadSavedStorage = async () => {
    if (savedGuesses.length === 0) {
      animateInitialRow(initialRow);
      return;
    }
    await sleep(100);
    for (let i = 0; i < savedGuesses.length; i++) {
      confirmGuess(true, savedGuesses[i].split(''), i !== savedGuesses.length - 1);
      await sleep(100);
    }
  };
  loadSavedStorage();

  document.getElementById('btn-start-adjust')
    .addEventListener('click', () => {
      stopReplay();
    });

};

let inSmallscreen = false;

const recalcBodyStyle = () => {
  const vw = document.body.offsetWidth;
  if (vw <= 600 && ! inSmallscreen)
    document.body.classList.add("smallscreen"), inSmallscreen = true;
  else if (vw > 600 && inSmallscreen)
    document.body.classList.remove("smallscreen"), inSmallscreen = false;
};
window.addEventListener('resize', recalcBodyStyle);
recalcBodyStyle();

// * music offset adjusts
const musicOffsetDeltas = [-100, -10, 10, 100];
for(let i = 0; i < 4; i ++) {
  document.getElementById('music-offset-delta-' + (i + 1))
    .addEventListener('click', (ele) => {
      musicOffset += musicOffsetDeltas[i];
      musicOffset = Math.min(2000, Math.max(-2000, musicOffset));
      modifyMusicOffset(musicOffset);
  });
}

const checkPuzzleStorage = () => {
  if (localStorage.getItem("savedGuesses-" + puzzleId) !== undefined &&
    localStorage.getItem("savedGuesses-" + puzzleId) !== null &&
    localStorage.getItem("savedGuesses-" + puzzleId) !== "") {
    startGame(localStorage.getItem("savedGuesses-" + puzzleId).split(","));
  }
}

preloadSounds((loaded, total) => {
  loadingProgress.innerText = `${loaded}/${total}`;
  if (loaded === total) {
    // Set pitch bend
    if (tunePitchBend !== 1) {
      for (const [k, v] of Object.entries(audios))
        if (k.startsWith('pf-')) v.rate(tunePitchBend);
    }
    // Show buttons
    loadingContainer.classList.add('hidden');
    startButton.classList.remove('hidden');
    gamePreloaded = true;
    checkPuzzleStorage();
  }
});

// Press Enter to start
document.addEventListener('keydown', function(e) {
  if (gameStarted) {
    document.removeEventListener('keydown', arguments.callee);
  }
  if (gamePreloaded && !gameStarted && e.key === 'Enter') {
    startGame();
    document.removeEventListener('keydown', arguments.callee);
  }
});

const getPuzzleId = (index) => {
  let id = 0, ptr = 0;
  while (ptr < index.length) {
    let ch = index.charCodeAt(ptr);
    if (ch >= 48 && ch <= 57) {
      id = id * 10 + ch - 48;
      ++ ptr;
    }
    else
      break;
  }
  return [id, index.substring(ptr)];
}

// Archive
const puzzleLink = (index) => {
  let decomposition = getPuzzleId(index);
  let id = decomposition[0];
  // let suffix = decomposition[1];
  let date = new Date('2022-05-27');
  const a = document.createElement('a');
  a.classList.add('puzzle-link');
  date.setDate(date.getDate() + (id - 1));
  a.innerHTML =
    date.getFullYear() + '.' +
    (date.getMonth() + 1).toString().padStart(2, '0') + '.' +
    (date.getDate()).toString().padStart(2, '0') +
    ` — <strong>${index}</strong>`;
  if (index === puzzleId) {
    a.classList.add('current');
    a.setAttribute('href', `javascript:closeModal()`);
  } else {
    a.setAttribute('href', `/${index}?past`);
  }
  return a;
};

const dailyList = ['EX', 'PH'];

if (isDaily) {
  document.getElementById('icon-btn-archive').addEventListener('click', () => {
    showModal('modal-archive');
  });
  const container = document.getElementById('archive-container');
  availablePuzzleIds.sort((x, y) => {
    let xd = getPuzzleId(x);
    let yd = getPuzzleId(y);
    if (xd[0] > yd[0]) return -1;
    if (xd[0] < yd[0]) return 1;
    if (xd[1] > yd[1]) return 1;
    if (xd[1] < yd[1]) return -1;
    return 0;
  })
  for (let id of availablePuzzleIds) {
    container.appendChild(puzzleLink(id));
  }
  let decomposition = getPuzzleId(puzzleId);
  let id = decomposition[0].toString().padStart(3, '0');
  let suffix = undefined;
  if (decomposition[1] === '')
    suffix = dailyList[0];
  else {
    let idx = dailyList.indexOf(suffix);
    if (idx !== -1 && idx !== dailyList.length - 1)
      suffix = dailyList[idx] + 1;
  }
  if (suffix !== undefined && availablePuzzleIds.indexOf(id + suffix) != -1) {
    let container = document.getElementById('next-puzzle-container');
    container.classList.remove('hidden')
    container.appendChild(puzzleLink(id + suffix));
  }
}
if (guideToToday) {
  const guideLinks = document.getElementById('guide-today-links');
  guideLinks.appendChild(puzzleLink(puzzleId));
  guideLinks.appendChild(puzzleLink(todayDaily));
  let suffix = 'a';
  while (availablePuzzleIds.indexOf(todayDaily + suffix) != -1) {
    guideLinks.appendChild(puzzleLink(todayDaily + suffix));
    suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
  }
  showModal('modal-guide-today');
}

if (localStorage.first === undefined) {
  showModal('modal-intro');
  localStorage.first = '';
}

document.getElementById('icon-btn-help').addEventListener('click', () => {
  showModal('modal-intro');
});

document.getElementById('icon-btn-options').addEventListener('click', () => {
  showModal('modal-options');
});

const initToggleButton = (ids, cfgKey, defaultVal, fn) => {
  if (typeof ids === 'string') ids = [ids];
  const btns = ids.map((id) => document.getElementById(id));

  const update = (on) => {
    fn(on);
    if (on) {
      for (const btn of btns) {
        btn.classList.add('on');
        btn.innerText = 'ON';
      }
    } else {
      for (const btn of btns) {
        btn.classList.remove('on');
        btn.innerText = 'OFF';
      }
    }
  };
  if (localStorage[cfgKey] === undefined)
    localStorage[cfgKey] = (defaultVal ? '1' : '0');
  localStorageToCookie();
  update(localStorage[cfgKey] === '1');
  for (const btn of btns)
    btn.addEventListener('click', (e) => {
      const on = (localStorage[cfgKey] !== '1');
      localStorage[cfgKey] = (on ? '1' : '0');
      localStorageToCookie();
      update(on);
    });
};
initToggleButton('btn-play-sfx', 'sfx', true, (on) => sfxOn = on);
initToggleButton('btn-metronome', 'metronome', false, (on) => metronomeOn = on);
initToggleButton('btn-flow', 'flow', false, (on) => useWaterflow = on);
initToggleButton('btn-dark-theme', 'dark',
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
  (on) => {
    if (on) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  });
initToggleButton(['btn-high-con', 'btn-high-con-alt'], 'highcon', false, (on) => {
  if (on) document.body.classList.add('highcon');
  else document.body.classList.remove('highcon');
});

const btnNotation = document.getElementById('btn-notation');
const updateNotation = (inc) => {
  const notations = ['nota-num', 'nota-solf', 'nota-alpha', 'nota-roman', 'nota-aikin', 'nota-blank'];
  let current = notations.indexOf(localStorage.notation);
  if (current === -1) current = 0;
  const nova = (current + (inc ? 1 : 0)) % notations.length;
  localStorage.notation = notations[nova];
  localStorageToCookie();
  document.body.classList.remove(notations[current]);
  document.body.classList.add(notations[nova]);
};
btnNotation.addEventListener('click', () => {
  updateNotation(true);
});
updateNotation(false);

// Internationalization
let curLang = 1; // Defaults to English
const btnLangs = [document.getElementById('btn-lang'), document.getElementById('btn-lang-alt')];

const i18nEls = document.querySelectorAll('[data-t]');
const updateInterfaceLanguage = () => {
  const dict = window.languages[curLang][2];
  const langName = window.languages[curLang][0];
  const langVars = decode(i18nVars)[langName];
  for (const el of i18nEls) {
    const key = el.dataset.t;
    if (key[0] === '=') {
      if (el.tagName === 'IMG')
        el.alt = langVars[key.substring(1)];
      else
        el.innerText = langVars[key.substring(1)];
    } else {
      el.innerText = dict[key];
    }
  }
  for (const btnLang of btnLangs)
    btnLang.innerText = window.languages[curLang][1];
  localStorage.lang = langName;
  localStorageToCookie();
};

// Find previously stored language or preferred language
const langCode = (localStorage.lang || window.navigator.languages[0]).split('-');
let bestMatch = 0;
for (const [i, [code, name, dict]] of Object.entries(window.languages)) {
  const codeParts = code.split('-');
  // Compare components
  let comps = 0;
  for (comps = 0; comps < langCode.length && comps < codeParts.length; comps++)
    if (langCode[comps] !== codeParts[comps]) break;
  if (comps > bestMatch) {
    bestMatch = comps;
    curLang = +i;
  }
}
updateInterfaceLanguage();

for (const btnLang of btnLangs)
  btnLang.addEventListener('click', () => {
    curLang = (curLang + 1) % window.languages.length;
    updateInterfaceLanguage();
  });

localStorageToCookie();
loadMusicOffset();
loadProblemStatus();

document.body.classList.add('loaded');