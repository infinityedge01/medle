// import { serve } from 'deno';
// import { serveFile } from 'deno';
// import { existsSync } from 'deno';
// import { parse } from 'deno';
const yaml = require('js-yaml');
const fs = require('fs');
const urlParser = require('url');
const http = require('http');
const eta = require('eta');
const etaCompile = eta.compile;
const etaConfig = eta.config;
const querystring = require('querystring');
const util = require('util');
const formidable = require('formidable');
const { LocalStorage } = require('node-localstorage');

global.localStorage = new LocalStorage('./scratch');

let database = {};
const serverStartTime = new Date();

const encodePuzzleId = (data) => {
  let ret = "";
  for (let idx in data) {
    if(data.charCodeAt(idx) >= 97 && data.charCodeAt(idx) <= 122)
      ret += "_", ret += String.fromCharCode(data.charCodeAt(idx) - 32);
    else
      ret += data[idx];
  }
  return ret;
}

const increaseVisitData = (puzzleId, index) => {
  puzzleId = encodePuzzleId(puzzleId);
  puzzleId = "puzzle-" + puzzleId;
  if(database[puzzleId] === undefined) {
    if(localStorage.getItem(puzzleId) === null) {
      database[puzzleId] = [0,0,0,0,0,0,0,0];
      localStorage.setItem(puzzleId, "[0,0,0,0,0,0,0,0]");
    }
    else
       database[puzzleId] = JSON.parse(localStorage.getItem(puzzleId));
  }
  let data = database[puzzleId];
  ++ data[index];
  localStorage.setItem(puzzleId, JSON.stringify(data));
  return JSON.stringify(data);
}

const getVisitData = (puzzleId) => {
  puzzleId = encodePuzzleId(puzzleId);
  puzzleId = "puzzle-" + puzzleId;
  if (database[puzzleId] === undefined) {
    if(localStorage.getItem(puzzleId) === null) {
      database[puzzleId] = [0,0,0,0,0,0,0,0];
      localStorage.setItem(puzzleId, "[0,0,0,0,0,0,0,0]");
    }
    else
       database[puzzleId] = JSON.parse(localStorage.getItem(puzzleId));
  }
  return JSON.stringify(database[puzzleId]);
}


const log = (msg) => {
  console.log(`${(new Date()).toISOString()} ${msg}`);
};
var keyStr = "ABCDEFGHIJKLMNOP" +
  "QRSTUVWXYZabcdef" +
  "ghijklmnopqrstuv" +
  "wxyz0123456789+/" +
  "=";

function encode64(input) {
  input = escape(input);
  var output = "";
  var chr1, chr2, chr3 = "";
  var enc1, enc2, enc3, enc4 = "";
  var i = 0;
  do {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);
    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;
    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output = output +
      keyStr.charAt(enc1) +
      keyStr.charAt(enc2) +
      keyStr.charAt(enc3) +
      keyStr.charAt(enc4);
    chr1 = chr2 = chr3 = "";
    enc1 = enc2 = enc3 = enc4 = "";
  } while (i < input.length);
  return (output);
}

const encodeData = (data) => {
  data = JSON.stringify(data);
  // const buff = iconv.encode(data, 'gbk');
  data = encode64(data);
  var input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var output = 'PzclHZIYLhjkSuBewrfdbqRTXDstvnJpyCUQaFMgmKWoGiNOVAEx';
  let ret = data.split("");
  for (let i = 0; i < data.length; i++)
    if (input.includes(data[i]))
      ret[i] = output[input.indexOf(data[i])];
  return ret.join("");
};
// const debug = (Deno.env.get('DEBUG') === '1');
const debug = false;

const indexHtmlContents = new TextDecoder().decode(fs.readFileSync('page/index.html'));
const indexTemplate = etaCompile(indexHtmlContents);

const epoch = new Date('2022-06-04T16:00:00Z');
const todaysPuzzleIndex = () => Math.ceil((new Date() - epoch) / 86400000);
const todaysPuzzle = () => todaysPuzzleIndex().toString().padStart(3, '0');

const analytics = (req) => {
  const cookies = req.headers.cookie;
  if (cookies === null || cookies === undefined) return '';
  const dict = {};
  for (const s of cookies.split(';')) {
    const i = s.indexOf('=');
    const key = decodeURIComponent(s.substring(0, i).trim());
    const value = decodeURIComponent(s.substring(i + 1));
    dict[key] = value;
  }
  if (!dict['lang']) return '';
  return `${dict['lang']} ${dict['sfx']} ${dict['dark']} ${dict['highcon']} ${dict['notation']}`;
};

const NOTE_OFFS = [9, 11, 0, 2, 4, 5, 7];
const SCALE_OFFS = [0, 2, 4, 5, 7, 9, 11];

const midiPitch = (s) => {
  const i = s.charCodeAt(0) - 'A'.charCodeAt(0);
  const acci = (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);
  const oct = s.charCodeAt(acci === 0 ? 1 : 2) - '0'.charCodeAt(0);
  return 12 +
    NOTE_OFFS[i] +
    oct * 12 +
    acci;
};
const bend = (s) => {
  const i = s.indexOf('/');
  if (i === -1) return 1;
  return parseFloat(s.substring(i + 1)) / 440;
};

const getPuzzleId = (index) => {
  const lastChar = index[index.length - 1];
  let suffix = '';
  let id = 0;
  if (lastChar >= 'a' && lastChar <= 'z') {
    suffix = lastChar;
    id = parseInt(index.toString().substring(0, index.length - 1));
  } else {
    id = parseInt(index.toString().padStart(3, '0'));
  }
  return [id, suffix]
}

const Response = (data, opt) => {
  return {
    data: data,
    options: opt
  }
};

const noSuchPuzzle = () => Response('No such puzzle > <\n', {
  status: 200
});

const servePuzzle = async (req, puzzleId, checkToday) => {
  const today = todaysPuzzle();
  if (puzzleId === undefined) puzzleId = today;

  const file = `puzzles/${puzzleId}.yml`;

  if (fs.existsSync(file)) {
    let realpath = await fs.realpathSync.native(file);
    if (typeof realpath !== 'string' || !realpath.replace(/\\/g, '/').endsWith(file))
      return noSuchPuzzle();
  }
  else
    return noSuchPuzzle();
  const puzzleContents = yaml.load(
    new TextDecoder().decode(await fs.readFileSync(file))
  );

  puzzleContents.id = puzzleId;

  for (const note of puzzleContents.tune) {
    const noteName = note[0].toString();
    let noteValue = parseInt(noteName[0]);
    if (noteName.indexOf('-') !== -1) noteValue -= 7;
    if (noteName.indexOf('+') !== -1) noteValue += 7;
    if (noteName.indexOf('b') !== -1) noteValue -= 0.1;
    if (noteName.indexOf('#') !== -1) noteValue += 0.1;
    if (noteName.indexOf('*') !== -1) noteValue += 100;
    note[0] = noteValue;
  }

  // Accidentals in absolute notation
  const tunePitchBase = puzzleContents.tunePitchBase;
  const acciStyles = [];
  const note = tunePitchBase.charCodeAt(0) - 'A'.charCodeAt(0);
  const acci = (tunePitchBase[1] === 'b' ? -1 :
    tunePitchBase[1] === '#' ? 1 : 0);
  for (let s = 1; s <= 7; s++) {
    acciStyles.push(`body.nota-alpha .fg > .bubble.solf-${s} > div.content:before { content: '${String.fromCharCode('A'.charCodeAt(0) + (note + s - 1) % 7)}'; }`);
    acciStyles.push(`body.nota-alpha .fg > .small-bubble.solf-${s} > div.content:before { content: '${String.fromCharCode('A'.charCodeAt(0) + (note + s - 1) % 7)}'; }`);
  }
  for (let s = 1; s <= 7; s++) {
    const value = NOTE_OFFS[note] + acci + SCALE_OFFS[s - 1];
    const diff = (value - NOTE_OFFS[(note + s - 1) % 7] + 12) % 12;
    let accis = undefined;
    if (diff === 1) accis = ['\\266f', '\\266e', '\\2715'];
    else if (diff === 11) accis = ['\\266d', '\\266d\\266d', '\\266e'];
    if (accis) {
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > * > .accidental::before { content: '${accis[0]}'; }`);
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > .flat > .accidental::before { content: '${accis[1]}'; }`);
      acciStyles.push(`body.nota-alpha .bubble:not(.outline).solf-${s} > .sharp > .accidental::before { content: '${accis[2]}'; }`);
    }
  }
  puzzleContents.acciStyles = acciStyles.join('\n');

  puzzleContents.tuneNoteBase = puzzleContents.tunePitchBase[0];
  puzzleContents.tunePitchBend = bend(puzzleContents.tunePitchBase);
  puzzleContents.tunePitchBase = midiPitch(puzzleContents.tunePitchBase);

  const i18n = {};
  for (const lang of ['zh-Hans', 'en']) {
    const langContents = puzzleContents[lang];
    i18n[lang] = langContents;
  }
  puzzleContents.i18nVars = encodeData(i18n);

  const isDaily = !!puzzleId.match(/^[0-9]{3,}(EX|PH)?$/g);
  puzzleContents.guideToToday =
    (checkToday && isDaily && parseInt(puzzleId) < parseInt(today));
  puzzleContents.isDaily = isDaily;
  puzzleContents.todayDaily = today;

  const puzzleNames = fs.readdirSync("./puzzles/", {
    withFileTypes: true
  });
  const validPuzzleIds = []
  for (const entry of puzzleNames) {
    if (entry.isDirectory()) continue;
    const fileName = entry.name;
    const isValid = !!fileName.match(/^[0-9]{3,}(EX|PH)?\.yml$/g);
    if (!isValid) continue;
    let index = fileName.substring(0, fileName.length - 4); // remove the file extension '.yml'
    let decomposition = getPuzzleId(index);
    if (decomposition[0] > todaysPuzzleIndex()) continue; // should not show the future puzzles.
    validPuzzleIds.push(index);
  }
  puzzleContents.availablePuzzleIds = validPuzzleIds;
  puzzleContents.currentTime = Date.now();

  log(`puzzle ${puzzleId} ${analytics(req)}`);
  puzzleContents.tune = encodeData(puzzleContents.tune);
  puzzleContents.serverTime = serverStartTime.toUTCString();
  const pageContents = indexTemplate(puzzleContents, etaConfig);
  return Response(pageContents, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
};

const respond_request = (resp, res) => {
  if (resp.options.status === 0)
    return;
  if (resp.options.headers !== undefined)
    for (let x in resp.options.headers)
      if (resp.options.headers.hasOwnProperty(x))
        res.setHeader(x, resp.options.headers[x]);
  res.statusCode = resp.options.status;
  res.end(resp.data);
}

const request_manage = async function(req, res) {
  const url = urlParser.parse(req.url, true);

  const serveFile = (location, cache = false) => {
    try {
      let res = fs.readFileSync(location);
      if (cache)
        return Response(res, {
          status: 200,
          headers: {
            'Cache-Control': 'max-age=864000'
          }
        });
      return Response(res, {
        status: 200
      });
    } catch (error) {
      return Response('', {
        status: 404
      });
    }
  }

  if (req.method === 'GET') {
    if (url.pathname === '/') {
      return servePuzzle(req, undefined, false);
    }
    if (url.pathname === '/favicon.ico') {
      return serveFile('favicon.ico');
    }
    if (url.pathname.startsWith('/static/')) {
      const fileName = url.pathname.substring('/static/'.length);
      return serveFile('page/' + fileName, true);
    }
    if (url.pathname.startsWith('/reveal/')) {
      const fileName = url.pathname.substring('/reveal/'.length);
      return serveFile('puzzles/reveal/' + fileName);
    }
    // Custom puzzle
    if (url.pathname.match(/^\/[A-Za-z0-9]+$/g)) {
      const puzzleId = url.pathname.substring(1);
      if (!debug && url.pathname.match(/^\/[0-9]+$/g) && parseInt(puzzleId) > todaysPuzzleIndex())
        return noSuchPuzzle();
      return servePuzzle(req, puzzleId, url.search !== '?past');
    }
  } else if (req.method === 'POST') {
    // Analytics
    if (url.pathname === '/analytics') {
      const form = formidable({
        multiples: true
      });
      form.parse(req, (err, body) => {
        let resp_data = [];
        if (err){
          respond_request(Response('formidable error', {
            status: 400
          }), res);
          return;
        }
        if(body.t === "start")
          resp_data = increaseVisitData(body.puzzle, 0);
        else if(body.t === "fetch")
          resp_data = getVisitData(body.puzzle);
        else if(body.t.substring(0, 4) === "fin ") {
          const num = Math.floor(parseInt(body.t.substring(4)));
          if(num <= 0 || num > 7){
            respond_request(Response('invalid step', {
              status: 400
            }), res);
            return;
          }
          resp_data = increaseVisitData(body.puzzle, num);
        }
        else{
          respond_request(Response('invalid data', {
            status: 400
          }), res);
          return;
        }
        respond_request(Response(resp_data, {
          status: 200
        }), res);
        log(`analy ${body.puzzle} ${body.t} ${analytics(req)}`);
      });
      return Response('', { status: 0 })
    }
  }
  return Response('Void space, please return\n', {
    status: 200
  });
};

const handler = async (req, res) => {
  const resp = await request_manage(req, res);
  respond_request(resp, res);
};

//const port = process.env.PORT;
const port = 2222;
// log(`http://localhost:${port}/`);

const server = http.createServer(handler)

server.listen(port, () => {})