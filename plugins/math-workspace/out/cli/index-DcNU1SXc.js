"use strict";
const path = require("node:path");
const crypto = require("node:crypto");
const fs$8 = require("node:fs/promises");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs$8);
const decodeCache = {};
function getDecodeCache(exclude) {
  let cache = decodeCache[exclude];
  if (cache) {
    return cache;
  }
  cache = decodeCache[exclude] = [];
  for (let i = 0; i < 128; i++) {
    const ch = String.fromCharCode(i);
    cache.push(ch);
  }
  for (let i = 0; i < exclude.length; i++) {
    const ch = exclude.charCodeAt(i);
    cache[ch] = "%" + ("0" + ch.toString(16).toUpperCase()).slice(-2);
  }
  return cache;
}
function decode$1(string, exclude) {
  if (typeof exclude !== "string") {
    exclude = decode$1.defaultChars;
  }
  const cache = getDecodeCache(exclude);
  return string.replace(/(%[a-f0-9]{2})+/gi, function(seq) {
    let result = "";
    for (let i = 0, l = seq.length; i < l; i += 3) {
      const b1 = parseInt(seq.slice(i + 1, i + 3), 16);
      if (b1 < 128) {
        result += cache[b1];
        continue;
      }
      if ((b1 & 224) === 192 && i + 3 < l) {
        const b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        if ((b2 & 192) === 128) {
          const chr = b1 << 6 & 1984 | b2 & 63;
          if (chr < 128) {
            result += "��";
          } else {
            result += String.fromCharCode(chr);
          }
          i += 3;
          continue;
        }
      }
      if ((b1 & 240) === 224 && i + 6 < l) {
        const b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        const b3 = parseInt(seq.slice(i + 7, i + 9), 16);
        if ((b2 & 192) === 128 && (b3 & 192) === 128) {
          const chr = b1 << 12 & 61440 | b2 << 6 & 4032 | b3 & 63;
          if (chr < 2048 || chr >= 55296 && chr <= 57343) {
            result += "���";
          } else {
            result += String.fromCharCode(chr);
          }
          i += 6;
          continue;
        }
      }
      if ((b1 & 248) === 240 && i + 9 < l) {
        const b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        const b3 = parseInt(seq.slice(i + 7, i + 9), 16);
        const b4 = parseInt(seq.slice(i + 10, i + 12), 16);
        if ((b2 & 192) === 128 && (b3 & 192) === 128 && (b4 & 192) === 128) {
          let chr = b1 << 18 & 1835008 | b2 << 12 & 258048 | b3 << 6 & 4032 | b4 & 63;
          if (chr < 65536 || chr > 1114111) {
            result += "����";
          } else {
            chr -= 65536;
            result += String.fromCharCode(55296 + (chr >> 10), 56320 + (chr & 1023));
          }
          i += 9;
          continue;
        }
      }
      result += "�";
    }
    return result;
  });
}
decode$1.defaultChars = ";/?:@&=+$,#";
decode$1.componentChars = "";
const encodeCache = {};
function getEncodeCache(exclude) {
  let cache = encodeCache[exclude];
  if (cache) {
    return cache;
  }
  cache = encodeCache[exclude] = [];
  for (let i = 0; i < 128; i++) {
    const ch = String.fromCharCode(i);
    if (/^[0-9a-z]$/i.test(ch)) {
      cache.push(ch);
    } else {
      cache.push("%" + ("0" + i.toString(16).toUpperCase()).slice(-2));
    }
  }
  for (let i = 0; i < exclude.length; i++) {
    cache[exclude.charCodeAt(i)] = exclude[i];
  }
  return cache;
}
function encode$1(string, exclude, keepEscaped) {
  if (typeof exclude !== "string") {
    keepEscaped = exclude;
    exclude = encode$1.defaultChars;
  }
  if (typeof keepEscaped === "undefined") {
    keepEscaped = true;
  }
  const cache = getEncodeCache(exclude);
  let result = "";
  for (let i = 0, l = string.length; i < l; i++) {
    const code2 = string.charCodeAt(i);
    if (keepEscaped && code2 === 37 && i + 2 < l) {
      if (/^[0-9a-f]{2}$/i.test(string.slice(i + 1, i + 3))) {
        result += string.slice(i, i + 3);
        i += 2;
        continue;
      }
    }
    if (code2 < 128) {
      result += cache[code2];
      continue;
    }
    if (code2 >= 55296 && code2 <= 57343) {
      if (code2 >= 55296 && code2 <= 56319 && i + 1 < l) {
        const nextCode = string.charCodeAt(i + 1);
        if (nextCode >= 56320 && nextCode <= 57343) {
          result += encodeURIComponent(string[i] + string[i + 1]);
          i++;
          continue;
        }
      }
      result += "%EF%BF%BD";
      continue;
    }
    result += encodeURIComponent(string[i]);
  }
  return result;
}
encode$1.defaultChars = ";/?:@&=+$,-_.!~*'()#";
encode$1.componentChars = "-_.!~*'()";
function format(url2) {
  let result = "";
  result += url2.protocol || "";
  result += url2.slashes ? "//" : "";
  result += url2.auth ? url2.auth + "@" : "";
  if (url2.hostname && url2.hostname.indexOf(":") !== -1) {
    result += "[" + url2.hostname + "]";
  } else {
    result += url2.hostname || "";
  }
  result += url2.port ? ":" + url2.port : "";
  result += url2.pathname || "";
  result += url2.search || "";
  result += url2.hash || "";
  return result;
}
function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.pathname = null;
}
const protocolPattern = /^([a-z0-9.+-]+:)/i;
const portPattern = /:[0-9]*$/;
const simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
const delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"];
const unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims);
const autoEscape = ["'"].concat(unwise);
const nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape);
const hostEndingChars = ["/", "?", "#"];
const hostnameMaxLen = 255;
const hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
const hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
const hostlessProtocol = {
  javascript: true,
  "javascript:": true
};
const slashedProtocol = {
  http: true,
  https: true,
  ftp: true,
  gopher: true,
  file: true,
  "http:": true,
  "https:": true,
  "ftp:": true,
  "gopher:": true,
  "file:": true
};
function urlParse(url2, slashesDenoteHost) {
  if (url2 && url2 instanceof Url) return url2;
  const u = new Url();
  u.parse(url2, slashesDenoteHost);
  return u;
}
Url.prototype.parse = function(url2, slashesDenoteHost) {
  let lowerProto, hec, slashes;
  let rest = url2;
  rest = rest.trim();
  if (!slashesDenoteHost && url2.split("#").length === 1) {
    const simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
      }
      return this;
    }
  }
  let proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    lowerProto = proto.toLowerCase();
    this.protocol = proto;
    rest = rest.substr(proto.length);
  }
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    slashes = rest.substr(0, 2) === "//";
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }
  if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
    let hostEnd = -1;
    for (let i = 0; i < hostEndingChars.length; i++) {
      hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }
    let auth, atSign;
    if (hostEnd === -1) {
      atSign = rest.lastIndexOf("@");
    } else {
      atSign = rest.lastIndexOf("@", hostEnd);
    }
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = auth;
    }
    hostEnd = -1;
    for (let i = 0; i < nonHostChars.length; i++) {
      hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }
    if (hostEnd === -1) {
      hostEnd = rest.length;
    }
    if (rest[hostEnd - 1] === ":") {
      hostEnd--;
    }
    const host2 = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);
    this.parseHost(host2);
    this.hostname = this.hostname || "";
    const ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
    if (!ipv6Hostname) {
      const hostparts = this.hostname.split(/\./);
      for (let i = 0, l = hostparts.length; i < l; i++) {
        const part = hostparts[i];
        if (!part) {
          continue;
        }
        if (!part.match(hostnamePartPattern)) {
          let newpart = "";
          for (let j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              newpart += "x";
            } else {
              newpart += part[j];
            }
          }
          if (!newpart.match(hostnamePartPattern)) {
            const validParts = hostparts.slice(0, i);
            const notHost = hostparts.slice(i + 1);
            const bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = notHost.join(".") + rest;
            }
            this.hostname = validParts.join(".");
            break;
          }
        }
      }
    }
    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = "";
    }
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
    }
  }
  const hash = rest.indexOf("#");
  if (hash !== -1) {
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  const qm = rest.indexOf("?");
  if (qm !== -1) {
    this.search = rest.substr(qm);
    rest = rest.slice(0, qm);
  }
  if (rest) {
    this.pathname = rest;
  }
  if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
    this.pathname = "";
  }
  return this;
};
Url.prototype.parseHost = function(host2) {
  let port = portPattern.exec(host2);
  if (port) {
    port = port[0];
    if (port !== ":") {
      this.port = port.substr(1);
    }
    host2 = host2.substr(0, host2.length - port.length);
  }
  if (host2) {
    this.hostname = host2;
  }
};
const mdurl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  decode: decode$1,
  encode: encode$1,
  format,
  parse: urlParse
}, Symbol.toStringTag, { value: "Module" }));
const Any = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
const Cc = /[\0-\x1F\x7F-\x9F]/;
const regex$1 = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/;
const P = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/;
const regex = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/;
const Z = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
const ucmicro = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Any,
  Cc,
  Cf: regex$1,
  P,
  S: regex,
  Z
}, Symbol.toStringTag, { value: "Module" }));
const htmlDecodeTree = new Uint16Array(
  // prettier-ignore
  'ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'.split("").map((c) => c.charCodeAt(0))
);
const xmlDecodeTree = new Uint16Array(
  // prettier-ignore
  "Ȁaglq	\x1Bɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map((c) => c.charCodeAt(0))
);
var _a;
const decodeMap = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
const fromCodePoint$1 = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, node/no-unsupported-features/es-builtins
  (_a = String.fromCodePoint) !== null && _a !== void 0 ? _a : function(codePoint) {
    let output = "";
    if (codePoint > 65535) {
      codePoint -= 65536;
      output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    output += String.fromCharCode(codePoint);
    return output;
  }
);
function replaceCodePoint(codePoint) {
  var _a2;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a2 = decodeMap.get(codePoint)) !== null && _a2 !== void 0 ? _a2 : codePoint;
}
var CharCodes;
(function(CharCodes2) {
  CharCodes2[CharCodes2["NUM"] = 35] = "NUM";
  CharCodes2[CharCodes2["SEMI"] = 59] = "SEMI";
  CharCodes2[CharCodes2["EQUALS"] = 61] = "EQUALS";
  CharCodes2[CharCodes2["ZERO"] = 48] = "ZERO";
  CharCodes2[CharCodes2["NINE"] = 57] = "NINE";
  CharCodes2[CharCodes2["LOWER_A"] = 97] = "LOWER_A";
  CharCodes2[CharCodes2["LOWER_F"] = 102] = "LOWER_F";
  CharCodes2[CharCodes2["LOWER_X"] = 120] = "LOWER_X";
  CharCodes2[CharCodes2["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes2[CharCodes2["UPPER_A"] = 65] = "UPPER_A";
  CharCodes2[CharCodes2["UPPER_F"] = 70] = "UPPER_F";
  CharCodes2[CharCodes2["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
const TO_LOWER_BIT = 32;
var BinTrieFlags;
(function(BinTrieFlags2) {
  BinTrieFlags2[BinTrieFlags2["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags2[BinTrieFlags2["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
  BinTrieFlags2[BinTrieFlags2["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
function isNumber(code2) {
  return code2 >= CharCodes.ZERO && code2 <= CharCodes.NINE;
}
function isHexadecimalCharacter(code2) {
  return code2 >= CharCodes.UPPER_A && code2 <= CharCodes.UPPER_F || code2 >= CharCodes.LOWER_A && code2 <= CharCodes.LOWER_F;
}
function isAsciiAlphaNumeric(code2) {
  return code2 >= CharCodes.UPPER_A && code2 <= CharCodes.UPPER_Z || code2 >= CharCodes.LOWER_A && code2 <= CharCodes.LOWER_Z || isNumber(code2);
}
function isEntityInAttributeInvalidEnd(code2) {
  return code2 === CharCodes.EQUALS || isAsciiAlphaNumeric(code2);
}
var EntityDecoderState;
(function(EntityDecoderState2) {
  EntityDecoderState2[EntityDecoderState2["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState2[EntityDecoderState2["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState2[EntityDecoderState2["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState2[EntityDecoderState2["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState2[EntityDecoderState2["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode2) {
  DecodingMode2[DecodingMode2["Legacy"] = 0] = "Legacy";
  DecodingMode2[DecodingMode2["Strict"] = 1] = "Strict";
  DecodingMode2[DecodingMode2["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
class EntityDecoder {
  constructor(decodeTree, emitCodePoint, errors2) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors2;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
  }
  /** Resets the instance to make it reusable. */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param string The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(str, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (str.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(str, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(str, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(str, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(str, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(str, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(str, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(str, offset) {
    if (offset >= str.length) {
      return -1;
    }
    if ((str.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(str, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(str, offset);
  }
  addToNumericResult(str, start, end, base2) {
    if (start !== end) {
      const digitCount = end - start;
      this.result = this.result * Math.pow(base2, digitCount) + parseInt(str.substr(start, digitCount), base2);
      this.consumed += digitCount;
    }
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 16);
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(str, offset) {
    const startIdx = offset;
    while (offset < str.length) {
      const char = str.charCodeAt(offset);
      if (isNumber(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str, startIdx, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 10);
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    var _a2;
    if (this.consumed <= expectedLength) {
      (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(str, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    for (; offset < str.length; offset++, this.excess++) {
      const char = str.charCodeAt(offset);
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === DecodingMode.Attribute && // We shouldn't have consumed any characters after the entity,
        (valueLength === 0 || // And there should be no invalid characters.
        isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var _a2;
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var _a2;
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        (_a2 = this.errors) === null || _a2 === void 0 ? void 0 : _a2.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
}
function getDecoder(decodeTree) {
  let ret = "";
  const decoder = new EntityDecoder(decodeTree, (str) => ret += fromCodePoint$1(str));
  return function decodeWithTrie(str, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = str.indexOf("&", offset)) >= 0) {
      ret += str.slice(lastIndex, offset);
      decoder.startEntity(decodeMode);
      const len = decoder.write(
        str,
        // Skip the "&"
        offset + 1
      );
      if (len < 0) {
        lastIndex = offset + decoder.end();
        break;
      }
      lastIndex = offset + len;
      offset = len === 0 ? lastIndex + 1 : lastIndex;
    }
    const result = ret + str.slice(lastIndex);
    ret = "";
    return result;
  };
}
function determineBranch(decodeTree, current, nodeIdx, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIdx + value] - 1;
  }
  let lo = nodeIdx;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const midVal = decodeTree[mid];
    if (midVal < char) {
      lo = mid + 1;
    } else if (midVal > char) {
      hi = mid - 1;
    } else {
      return decodeTree[mid + branchCount];
    }
  }
  return -1;
}
const htmlDecoder = getDecoder(htmlDecodeTree);
getDecoder(xmlDecodeTree);
function decodeHTML(str, mode = DecodingMode.Legacy) {
  return htmlDecoder(str, mode);
}
function decodeHTMLStrict(str) {
  return htmlDecoder(str, DecodingMode.Strict);
}
function _class$1(obj) {
  return Object.prototype.toString.call(obj);
}
function isString$1(obj) {
  return _class$1(obj) === "[object String]";
}
const _hasOwnProperty = Object.prototype.hasOwnProperty;
function has(object, key) {
  return _hasOwnProperty.call(object, key);
}
function assign$1(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  sources.forEach(function(source) {
    if (!source) {
      return;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be object");
    }
    Object.keys(source).forEach(function(key) {
      obj[key] = source[key];
    });
  });
  return obj;
}
function arrayReplaceAt(src, pos, newElements) {
  return [].concat(src.slice(0, pos), newElements, src.slice(pos + 1));
}
function isValidEntityCode(c) {
  if (c >= 55296 && c <= 57343) {
    return false;
  }
  if (c >= 64976 && c <= 65007) {
    return false;
  }
  if ((c & 65535) === 65535 || (c & 65535) === 65534) {
    return false;
  }
  if (c >= 0 && c <= 8) {
    return false;
  }
  if (c === 11) {
    return false;
  }
  if (c >= 14 && c <= 31) {
    return false;
  }
  if (c >= 127 && c <= 159) {
    return false;
  }
  if (c > 1114111) {
    return false;
  }
  return true;
}
function fromCodePoint(c) {
  if (c > 65535) {
    c -= 65536;
    const surrogate1 = 55296 + (c >> 10);
    const surrogate2 = 56320 + (c & 1023);
    return String.fromCharCode(surrogate1, surrogate2);
  }
  return String.fromCharCode(c);
}
const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;
const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi;
const UNESCAPE_ALL_RE = new RegExp(UNESCAPE_MD_RE.source + "|" + ENTITY_RE.source, "gi");
const DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
function replaceEntityPattern(match2, name) {
  if (name.charCodeAt(0) === 35 && DIGITAL_ENTITY_TEST_RE.test(name)) {
    const code2 = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    if (isValidEntityCode(code2)) {
      return fromCodePoint(code2);
    }
    return match2;
  }
  const decoded = decodeHTML(match2);
  if (decoded !== match2) {
    return decoded;
  }
  return match2;
}
function unescapeMd(str) {
  if (str.indexOf("\\") < 0) {
    return str;
  }
  return str.replace(UNESCAPE_MD_RE, "$1");
}
function unescapeAll(str) {
  if (str.indexOf("\\") < 0 && str.indexOf("&") < 0) {
    return str;
  }
  return str.replace(UNESCAPE_ALL_RE, function(match2, escaped2, entity2) {
    if (escaped2) {
      return escaped2;
    }
    return replaceEntityPattern(match2, entity2);
  });
}
const HTML_ESCAPE_TEST_RE = /[&<>"]/;
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
const HTML_REPLACEMENTS = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function replaceUnsafeChar(ch) {
  return HTML_REPLACEMENTS[ch];
}
function escapeHtml(str) {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
  }
  return str;
}
const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g;
function escapeRE$1(str) {
  return str.replace(REGEXP_ESCAPE_RE, "\\$&");
}
function isSpace(code2) {
  switch (code2) {
    case 9:
    case 32:
      return true;
  }
  return false;
}
function isWhiteSpace(code2) {
  if (code2 >= 8192 && code2 <= 8202) {
    return true;
  }
  switch (code2) {
    case 9:
    // \t
    case 10:
    // \n
    case 11:
    // \v
    case 12:
    // \f
    case 13:
    // \r
    case 32:
    case 160:
    case 5760:
    case 8239:
    case 8287:
    case 12288:
      return true;
  }
  return false;
}
function isPunctChar(ch) {
  return P.test(ch) || regex.test(ch);
}
function isPunctCharCode(code2) {
  return isPunctChar(fromCodePoint(code2));
}
function isMdAsciiPunct(ch) {
  switch (ch) {
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
    case 58:
    case 59:
    case 60:
    case 61:
    case 62:
    case 63:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 124:
    case 125:
    case 126:
      return true;
    default:
      return false;
  }
}
function normalizeReference(str) {
  str = str.trim().replace(/\s+/g, " ");
  if ("ẞ".toLowerCase() === "Ṿ") {
    str = str.replace(/ẞ/g, "ß");
  }
  return str.toLowerCase().toUpperCase();
}
function isAsciiTrimmable(c) {
  return c === 32 || c === 9 || c === 10 || c === 13;
}
function asciiTrim(str) {
  let start = 0;
  for (; start < str.length; start++) {
    if (!isAsciiTrimmable(str.charCodeAt(start))) {
      break;
    }
  }
  let end = str.length - 1;
  for (; end >= start; end--) {
    if (!isAsciiTrimmable(str.charCodeAt(end))) {
      break;
    }
  }
  return str.slice(start, end + 1);
}
const lib = { mdurl, ucmicro };
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  arrayReplaceAt,
  asciiTrim,
  assign: assign$1,
  escapeHtml,
  escapeRE: escapeRE$1,
  fromCodePoint,
  has,
  isMdAsciiPunct,
  isPunctChar,
  isPunctCharCode,
  isSpace,
  isString: isString$1,
  isValidEntityCode,
  isWhiteSpace,
  lib,
  normalizeReference,
  unescapeAll,
  unescapeMd
}, Symbol.toStringTag, { value: "Module" }));
function parseLinkLabel(state, start, disableNested) {
  let level, found, marker2, prevPos;
  const max = state.posMax;
  const oldPos = state.pos;
  state.pos = start + 1;
  level = 1;
  while (state.pos < max) {
    marker2 = state.src.charCodeAt(state.pos);
    if (marker2 === 93) {
      level--;
      if (level === 0) {
        found = true;
        break;
      }
    }
    prevPos = state.pos;
    state.md.inline.skipToken(state);
    if (marker2 === 91) {
      if (prevPos === state.pos - 1) {
        level++;
      } else if (disableNested) {
        state.pos = oldPos;
        return -1;
      }
    }
  }
  let labelEnd = -1;
  if (found) {
    labelEnd = state.pos;
  }
  state.pos = oldPos;
  return labelEnd;
}
function parseLinkDestination(str, start, max) {
  let code2;
  let pos = start;
  const result = {
    ok: false,
    pos: 0,
    str: ""
  };
  if (str.charCodeAt(pos) === 60) {
    pos++;
    while (pos < max) {
      code2 = str.charCodeAt(pos);
      if (code2 === 10) {
        return result;
      }
      if (code2 === 60) {
        return result;
      }
      if (code2 === 62) {
        result.pos = pos + 1;
        result.str = unescapeAll(str.slice(start + 1, pos));
        result.ok = true;
        return result;
      }
      if (code2 === 92 && pos + 1 < max) {
        pos += 2;
        continue;
      }
      pos++;
    }
    return result;
  }
  let level = 0;
  while (pos < max) {
    code2 = str.charCodeAt(pos);
    if (code2 === 32) {
      break;
    }
    if (code2 < 32 || code2 === 127) {
      break;
    }
    if (code2 === 92 && pos + 1 < max) {
      if (str.charCodeAt(pos + 1) === 32) {
        break;
      }
      pos += 2;
      continue;
    }
    if (code2 === 40) {
      level++;
      if (level > 32) {
        return result;
      }
    }
    if (code2 === 41) {
      if (level === 0) {
        break;
      }
      level--;
    }
    pos++;
  }
  if (start === pos) {
    return result;
  }
  if (level !== 0) {
    return result;
  }
  result.str = unescapeAll(str.slice(start, pos));
  result.pos = pos;
  result.ok = true;
  return result;
}
function parseLinkTitle(str, start, max, prev_state) {
  let code2;
  let pos = start;
  const state = {
    // if `true`, this is a valid link title
    ok: false,
    // if `true`, this link can be continued on the next line
    can_continue: false,
    // if `ok`, it's the position of the first character after the closing marker
    pos: 0,
    // if `ok`, it's the unescaped title
    str: "",
    // expected closing marker character code
    marker: 0
  };
  if (prev_state) {
    state.str = prev_state.str;
    state.marker = prev_state.marker;
  } else {
    if (pos >= max) {
      return state;
    }
    let marker2 = str.charCodeAt(pos);
    if (marker2 !== 34 && marker2 !== 39 && marker2 !== 40) {
      return state;
    }
    start++;
    pos++;
    if (marker2 === 40) {
      marker2 = 41;
    }
    state.marker = marker2;
  }
  while (pos < max) {
    code2 = str.charCodeAt(pos);
    if (code2 === state.marker) {
      state.pos = pos + 1;
      state.str += unescapeAll(str.slice(start, pos));
      state.ok = true;
      return state;
    } else if (code2 === 40 && state.marker === 41) {
      return state;
    } else if (code2 === 92 && pos + 1 < max) {
      pos++;
    }
    pos++;
  }
  state.can_continue = true;
  state.str += unescapeAll(str.slice(start, pos));
  return state;
}
const helpers = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  parseLinkDestination,
  parseLinkLabel,
  parseLinkTitle
}, Symbol.toStringTag, { value: "Module" }));
const default_rules = {};
default_rules.code_inline = function(tokens, idx, options, env, slf) {
  const token = tokens[idx];
  return "<code" + slf.renderAttrs(token) + ">" + escapeHtml(token.content) + "</code>";
};
default_rules.code_block = function(tokens, idx, options, env, slf) {
  const token = tokens[idx];
  return "<pre" + slf.renderAttrs(token) + "><code>" + escapeHtml(tokens[idx].content) + "</code></pre>\n";
};
default_rules.fence = function(tokens, idx, options, env, slf) {
  const token = tokens[idx];
  const info = token.info ? unescapeAll(token.info).trim() : "";
  let langName = "";
  let langAttrs = "";
  if (info) {
    const arr = info.split(/(\s+)/g);
    langName = arr[0];
    langAttrs = arr.slice(2).join("");
  }
  let highlighted;
  if (options.highlight) {
    highlighted = options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content);
  } else {
    highlighted = escapeHtml(token.content);
  }
  if (highlighted.indexOf("<pre") === 0) {
    return highlighted + "\n";
  }
  if (info) {
    const i = token.attrIndex("class");
    const tmpAttrs = token.attrs ? token.attrs.slice() : [];
    if (i < 0) {
      tmpAttrs.push(["class", options.langPrefix + langName]);
    } else {
      tmpAttrs[i] = tmpAttrs[i].slice();
      tmpAttrs[i][1] += " " + options.langPrefix + langName;
    }
    const tmpToken = {
      attrs: tmpAttrs
    };
    return `<pre><code${slf.renderAttrs(tmpToken)}>${highlighted}</code></pre>
`;
  }
  return `<pre><code${slf.renderAttrs(token)}>${highlighted}</code></pre>
`;
};
default_rules.image = function(tokens, idx, options, env, slf) {
  const token = tokens[idx];
  token.attrs[token.attrIndex("alt")][1] = slf.renderInlineAsText(token.children, options, env);
  return slf.renderToken(tokens, idx, options);
};
default_rules.hardbreak = function(tokens, idx, options) {
  return options.xhtmlOut ? "<br />\n" : "<br>\n";
};
default_rules.softbreak = function(tokens, idx, options) {
  return options.breaks ? options.xhtmlOut ? "<br />\n" : "<br>\n" : "\n";
};
default_rules.text = function(tokens, idx) {
  return escapeHtml(tokens[idx].content);
};
default_rules.html_block = function(tokens, idx) {
  return tokens[idx].content;
};
default_rules.html_inline = function(tokens, idx) {
  return tokens[idx].content;
};
function Renderer() {
  this.rules = assign$1({}, default_rules);
}
Renderer.prototype.renderAttrs = function renderAttrs(token) {
  let i, l, result;
  if (!token.attrs) {
    return "";
  }
  result = "";
  for (i = 0, l = token.attrs.length; i < l; i++) {
    result += " " + escapeHtml(token.attrs[i][0]) + '="' + escapeHtml(token.attrs[i][1]) + '"';
  }
  return result;
};
Renderer.prototype.renderToken = function renderToken(tokens, idx, options) {
  const token = tokens[idx];
  let result = "";
  if (token.hidden) {
    return "";
  }
  if (token.block && token.nesting !== -1 && idx && tokens[idx - 1].hidden) {
    result += "\n";
  }
  result += (token.nesting === -1 ? "</" : "<") + token.tag;
  result += this.renderAttrs(token);
  if (token.nesting === 0 && options.xhtmlOut) {
    result += " /";
  }
  let needLf = false;
  if (token.block) {
    needLf = true;
    if (token.nesting === 1) {
      if (idx + 1 < tokens.length) {
        const nextToken = tokens[idx + 1];
        if (nextToken.type === "inline" || nextToken.hidden) {
          needLf = false;
        } else if (nextToken.nesting === -1 && nextToken.tag === token.tag) {
          needLf = false;
        }
      }
    }
  }
  result += needLf ? ">\n" : ">";
  return result;
};
Renderer.prototype.renderInline = function(tokens, options, env) {
  let result = "";
  const rules = this.rules;
  for (let i = 0, len = tokens.length; i < len; i++) {
    const type = tokens[i].type;
    if (typeof rules[type] !== "undefined") {
      result += rules[type](tokens, i, options, env, this);
    } else {
      result += this.renderToken(tokens, i, options);
    }
  }
  return result;
};
Renderer.prototype.renderInlineAsText = function(tokens, options, env) {
  let result = "";
  for (let i = 0, len = tokens.length; i < len; i++) {
    switch (tokens[i].type) {
      case "text":
        result += tokens[i].content;
        break;
      case "image":
        result += this.renderInlineAsText(tokens[i].children, options, env);
        break;
      case "html_inline":
      case "html_block":
        result += tokens[i].content;
        break;
      case "softbreak":
      case "hardbreak":
        result += "\n";
        break;
    }
  }
  return result;
};
Renderer.prototype.render = function(tokens, options, env) {
  let result = "";
  const rules = this.rules;
  for (let i = 0, len = tokens.length; i < len; i++) {
    const type = tokens[i].type;
    if (type === "inline") {
      result += this.renderInline(tokens[i].children, options, env);
    } else if (typeof rules[type] !== "undefined") {
      result += rules[type](tokens, i, options, env, this);
    } else {
      result += this.renderToken(tokens, i, options, env);
    }
  }
  return result;
};
function Ruler() {
  this.__rules__ = [];
  this.__cache__ = null;
}
Ruler.prototype.__find__ = function(name) {
  for (let i = 0; i < this.__rules__.length; i++) {
    if (this.__rules__[i].name === name) {
      return i;
    }
  }
  return -1;
};
Ruler.prototype.__compile__ = function() {
  const self = this;
  const chains = [""];
  self.__rules__.forEach(function(rule) {
    if (!rule.enabled) {
      return;
    }
    rule.alt.forEach(function(altName) {
      if (chains.indexOf(altName) < 0) {
        chains.push(altName);
      }
    });
  });
  self.__cache__ = {};
  chains.forEach(function(chain) {
    self.__cache__[chain] = [];
    self.__rules__.forEach(function(rule) {
      if (!rule.enabled) {
        return;
      }
      if (chain && rule.alt.indexOf(chain) < 0) {
        return;
      }
      self.__cache__[chain].push(rule.fn);
    });
  });
};
Ruler.prototype.at = function(name, fn, options) {
  const index = this.__find__(name);
  const opt = options || {};
  if (index === -1) {
    throw new Error("Parser rule not found: " + name);
  }
  this.__rules__[index].fn = fn;
  this.__rules__[index].alt = opt.alt || [];
  this.__cache__ = null;
};
Ruler.prototype.before = function(beforeName, ruleName, fn, options) {
  const index = this.__find__(beforeName);
  const opt = options || {};
  if (index === -1) {
    throw new Error("Parser rule not found: " + beforeName);
  }
  this.__rules__.splice(index, 0, {
    name: ruleName,
    enabled: true,
    fn,
    alt: opt.alt || []
  });
  this.__cache__ = null;
};
Ruler.prototype.after = function(afterName, ruleName, fn, options) {
  const index = this.__find__(afterName);
  const opt = options || {};
  if (index === -1) {
    throw new Error("Parser rule not found: " + afterName);
  }
  this.__rules__.splice(index + 1, 0, {
    name: ruleName,
    enabled: true,
    fn,
    alt: opt.alt || []
  });
  this.__cache__ = null;
};
Ruler.prototype.push = function(ruleName, fn, options) {
  const opt = options || {};
  this.__rules__.push({
    name: ruleName,
    enabled: true,
    fn,
    alt: opt.alt || []
  });
  this.__cache__ = null;
};
Ruler.prototype.enable = function(list2, ignoreInvalid) {
  if (!Array.isArray(list2)) {
    list2 = [list2];
  }
  const result = [];
  list2.forEach(function(name) {
    const idx = this.__find__(name);
    if (idx < 0) {
      if (ignoreInvalid) {
        return;
      }
      throw new Error("Rules manager: invalid rule name " + name);
    }
    this.__rules__[idx].enabled = true;
    result.push(name);
  }, this);
  this.__cache__ = null;
  return result;
};
Ruler.prototype.enableOnly = function(list2, ignoreInvalid) {
  if (!Array.isArray(list2)) {
    list2 = [list2];
  }
  this.__rules__.forEach(function(rule) {
    rule.enabled = false;
  });
  this.enable(list2, ignoreInvalid);
};
Ruler.prototype.disable = function(list2, ignoreInvalid) {
  if (!Array.isArray(list2)) {
    list2 = [list2];
  }
  const result = [];
  list2.forEach(function(name) {
    const idx = this.__find__(name);
    if (idx < 0) {
      if (ignoreInvalid) {
        return;
      }
      throw new Error("Rules manager: invalid rule name " + name);
    }
    this.__rules__[idx].enabled = false;
    result.push(name);
  }, this);
  this.__cache__ = null;
  return result;
};
Ruler.prototype.getRules = function(chainName) {
  if (this.__cache__ === null) {
    this.__compile__();
  }
  return this.__cache__[chainName] || [];
};
function Token(type, tag, nesting) {
  this.type = type;
  this.tag = tag;
  this.attrs = null;
  this.map = null;
  this.nesting = nesting;
  this.level = 0;
  this.children = null;
  this.content = "";
  this.markup = "";
  this.info = "";
  this.meta = null;
  this.block = false;
  this.hidden = false;
}
Token.prototype.attrIndex = function attrIndex(name) {
  if (!this.attrs) {
    return -1;
  }
  const attrs = this.attrs;
  for (let i = 0, len = attrs.length; i < len; i++) {
    if (attrs[i][0] === name) {
      return i;
    }
  }
  return -1;
};
Token.prototype.attrPush = function attrPush(attrData) {
  if (this.attrs) {
    this.attrs.push(attrData);
  } else {
    this.attrs = [attrData];
  }
};
Token.prototype.attrSet = function attrSet(name, value) {
  const idx = this.attrIndex(name);
  const attrData = [name, value];
  if (idx < 0) {
    this.attrPush(attrData);
  } else {
    this.attrs[idx] = attrData;
  }
};
Token.prototype.attrGet = function attrGet(name) {
  const idx = this.attrIndex(name);
  let value = null;
  if (idx >= 0) {
    value = this.attrs[idx][1];
  }
  return value;
};
Token.prototype.attrJoin = function attrJoin(name, value) {
  const idx = this.attrIndex(name);
  if (idx < 0) {
    this.attrPush([name, value]);
  } else {
    this.attrs[idx][1] = this.attrs[idx][1] + " " + value;
  }
};
function StateCore(src, md, env) {
  this.src = src;
  this.env = env;
  this.tokens = [];
  this.inlineMode = false;
  this.md = md;
}
StateCore.prototype.Token = Token;
const NEWLINES_RE = /\r\n?|\n/g;
const NULL_RE = /\0/g;
function normalize(state) {
  let str;
  str = state.src.replace(NEWLINES_RE, "\n");
  str = str.replace(NULL_RE, "�");
  state.src = str;
}
function block(state) {
  let token;
  if (state.inlineMode) {
    token = new state.Token("inline", "", 0);
    token.content = state.src;
    token.map = [0, 1];
    token.children = [];
    state.tokens.push(token);
  } else {
    state.md.block.parse(state.src, state.md, state.env, state.tokens);
  }
}
function inline(state) {
  const tokens = state.tokens;
  for (let i = 0, l = tokens.length; i < l; i++) {
    const tok = tokens[i];
    if (tok.type === "inline") {
      state.md.inline.parse(tok.content, state.md, state.env, tok.children);
    }
  }
}
function isLinkOpen$1(str) {
  return /^<a[>\s]/i.test(str);
}
function isLinkClose$1(str) {
  return /^<\/a\s*>/i.test(str);
}
function linkify$1(state) {
  const blockTokens = state.tokens;
  if (!state.md.options.linkify) {
    return;
  }
  for (let j = 0, l = blockTokens.length; j < l; j++) {
    if (blockTokens[j].type !== "inline" || !state.md.linkify.pretest(blockTokens[j].content)) {
      continue;
    }
    let tokens = blockTokens[j].children;
    let htmlLinkLevel = 0;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const currentToken = tokens[i];
      if (currentToken.type === "link_close") {
        i--;
        while (tokens[i].level !== currentToken.level && tokens[i].type !== "link_open") {
          i--;
        }
        continue;
      }
      if (currentToken.type === "html_inline") {
        if (isLinkOpen$1(currentToken.content) && htmlLinkLevel > 0) {
          htmlLinkLevel--;
        }
        if (isLinkClose$1(currentToken.content)) {
          htmlLinkLevel++;
        }
      }
      if (htmlLinkLevel > 0) {
        continue;
      }
      if (currentToken.type === "text" && state.md.linkify.test(currentToken.content)) {
        const text2 = currentToken.content;
        let links = state.md.linkify.match(text2);
        const nodes = [];
        let level = currentToken.level;
        let lastPos = 0;
        if (links.length > 0 && links[0].index === 0 && i > 0 && tokens[i - 1].type === "text_special") {
          links = links.slice(1);
        }
        for (let ln = 0; ln < links.length; ln++) {
          const url2 = links[ln].url;
          const fullUrl = state.md.normalizeLink(url2);
          if (!state.md.validateLink(fullUrl)) {
            continue;
          }
          let urlText = links[ln].text;
          if (!links[ln].schema) {
            urlText = state.md.normalizeLinkText("http://" + urlText).replace(/^http:\/\//, "");
          } else if (links[ln].schema === "mailto:" && !/^mailto:/i.test(urlText)) {
            urlText = state.md.normalizeLinkText("mailto:" + urlText).replace(/^mailto:/, "");
          } else {
            urlText = state.md.normalizeLinkText(urlText);
          }
          const pos = links[ln].index;
          if (pos > lastPos) {
            const token = new state.Token("text", "", 0);
            token.content = text2.slice(lastPos, pos);
            token.level = level;
            nodes.push(token);
          }
          const token_o = new state.Token("link_open", "a", 1);
          token_o.attrs = [["href", fullUrl]];
          token_o.level = level++;
          token_o.markup = "linkify";
          token_o.info = "auto";
          nodes.push(token_o);
          const token_t = new state.Token("text", "", 0);
          token_t.content = urlText;
          token_t.level = level;
          nodes.push(token_t);
          const token_c = new state.Token("link_close", "a", -1);
          token_c.level = --level;
          token_c.markup = "linkify";
          token_c.info = "auto";
          nodes.push(token_c);
          lastPos = links[ln].lastIndex;
        }
        if (lastPos < text2.length) {
          const token = new state.Token("text", "", 0);
          token.content = text2.slice(lastPos);
          token.level = level;
          nodes.push(token);
        }
        blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
      }
    }
  }
}
const RARE_RE = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/;
const SCOPED_ABBR_TEST_RE = /\((c|tm|r)\)/i;
const SCOPED_ABBR_RE = /\((c|tm|r)\)/ig;
const SCOPED_ABBR = {
  c: "©",
  r: "®",
  tm: "™"
};
function replaceFn(match2, name) {
  return SCOPED_ABBR[name.toLowerCase()];
}
function replace_scoped(inlineTokens) {
  let inside_autolink = 0;
  for (let i = inlineTokens.length - 1; i >= 0; i--) {
    const token = inlineTokens[i];
    if (token.type === "text" && !inside_autolink) {
      token.content = token.content.replace(SCOPED_ABBR_RE, replaceFn);
    }
    if (token.type === "link_open" && token.info === "auto") {
      inside_autolink--;
    }
    if (token.type === "link_close" && token.info === "auto") {
      inside_autolink++;
    }
  }
}
function replace_rare(inlineTokens) {
  let inside_autolink = 0;
  for (let i = inlineTokens.length - 1; i >= 0; i--) {
    const token = inlineTokens[i];
    if (token.type === "text" && !inside_autolink) {
      if (RARE_RE.test(token.content)) {
        token.content = token.content.replace(/\+-/g, "±").replace(/\.{2,}/g, "…").replace(/([?!])…/g, "$1..").replace(/([?!]){4,}/g, "$1$1$1").replace(/,{2,}/g, ",").replace(/(^|[^-])---(?=[^-]|$)/mg, "$1—").replace(/(^|\s)--(?=\s|$)/mg, "$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/mg, "$1–");
      }
    }
    if (token.type === "link_open" && token.info === "auto") {
      inside_autolink--;
    }
    if (token.type === "link_close" && token.info === "auto") {
      inside_autolink++;
    }
  }
}
function replace(state) {
  let blkIdx;
  if (!state.md.options.typographer) {
    return;
  }
  for (blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
    if (state.tokens[blkIdx].type !== "inline") {
      continue;
    }
    if (SCOPED_ABBR_TEST_RE.test(state.tokens[blkIdx].content)) {
      replace_scoped(state.tokens[blkIdx].children);
    }
    if (RARE_RE.test(state.tokens[blkIdx].content)) {
      replace_rare(state.tokens[blkIdx].children);
    }
  }
}
const QUOTE_TEST_RE = /['"]/;
const QUOTE_RE = /['"]/g;
const APOSTROPHE = "’";
function addReplacement(replacements, tokenIdx, pos, ch) {
  if (!replacements[tokenIdx]) {
    replacements[tokenIdx] = [];
  }
  replacements[tokenIdx].push({ pos, ch });
}
function applyReplacements(str, replacements) {
  let result = "";
  let lastPos = 0;
  replacements.sort((a, b) => a.pos - b.pos);
  for (let i = 0; i < replacements.length; i++) {
    const replacement = replacements[i];
    result += str.slice(lastPos, replacement.pos) + replacement.ch;
    lastPos = replacement.pos + 1;
  }
  return result + str.slice(lastPos);
}
function process_inlines(tokens, state) {
  let j;
  const stack = [];
  const replacements = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const thisLevel = tokens[i].level;
    for (j = stack.length - 1; j >= 0; j--) {
      if (stack[j].level <= thisLevel) {
        break;
      }
    }
    stack.length = j + 1;
    if (token.type !== "text") {
      continue;
    }
    const text2 = token.content;
    let pos = 0;
    const max = text2.length;
    OUTER:
      while (pos < max) {
        QUOTE_RE.lastIndex = pos;
        const t = QUOTE_RE.exec(text2);
        if (!t) {
          break;
        }
        let canOpen = true;
        let canClose = true;
        pos = t.index + 1;
        const isSingle = t[0] === "'";
        let lastChar = 32;
        if (t.index - 1 >= 0) {
          lastChar = text2.charCodeAt(t.index - 1);
        } else {
          for (j = i - 1; j >= 0; j--) {
            if (tokens[j].type === "softbreak" || tokens[j].type === "hardbreak") break;
            if (!tokens[j].content) continue;
            lastChar = tokens[j].content.charCodeAt(tokens[j].content.length - 1);
            break;
          }
        }
        let nextChar = 32;
        if (pos < max) {
          nextChar = text2.charCodeAt(pos);
        } else {
          for (j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === "softbreak" || tokens[j].type === "hardbreak") break;
            if (!tokens[j].content) continue;
            nextChar = tokens[j].content.charCodeAt(0);
            break;
          }
        }
        const isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctCharCode(lastChar);
        const isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctCharCode(nextChar);
        const isLastWhiteSpace = isWhiteSpace(lastChar);
        const isNextWhiteSpace = isWhiteSpace(nextChar);
        if (isNextWhiteSpace) {
          canOpen = false;
        } else if (isNextPunctChar) {
          if (!(isLastWhiteSpace || isLastPunctChar)) {
            canOpen = false;
          }
        }
        if (isLastWhiteSpace) {
          canClose = false;
        } else if (isLastPunctChar) {
          if (!(isNextWhiteSpace || isNextPunctChar)) {
            canClose = false;
          }
        }
        if (nextChar === 34 && t[0] === '"') {
          if (lastChar >= 48 && lastChar <= 57) {
            canClose = canOpen = false;
          }
        }
        if (canOpen && canClose) {
          canOpen = isLastPunctChar;
          canClose = isNextPunctChar;
        }
        if (!canOpen && !canClose) {
          if (isSingle) {
            addReplacement(replacements, i, t.index, APOSTROPHE);
          }
          continue;
        }
        if (canClose) {
          for (j = stack.length - 1; j >= 0; j--) {
            let item = stack[j];
            if (stack[j].level < thisLevel) {
              break;
            }
            if (item.single === isSingle && stack[j].level === thisLevel) {
              item = stack[j];
              let openQuote;
              let closeQuote;
              if (isSingle) {
                openQuote = state.md.options.quotes[2];
                closeQuote = state.md.options.quotes[3];
              } else {
                openQuote = state.md.options.quotes[0];
                closeQuote = state.md.options.quotes[1];
              }
              addReplacement(replacements, i, t.index, closeQuote);
              addReplacement(replacements, item.token, item.pos, openQuote);
              stack.length = j;
              continue OUTER;
            }
          }
        }
        if (canOpen) {
          stack.push({
            token: i,
            pos: t.index,
            single: isSingle,
            level: thisLevel
          });
        } else if (canClose && isSingle) {
          addReplacement(replacements, i, t.index, APOSTROPHE);
        }
      }
  }
  Object.keys(replacements).forEach(function(tokenIdx) {
    tokens[tokenIdx].content = applyReplacements(tokens[tokenIdx].content, replacements[tokenIdx]);
  });
}
function smartquotes(state) {
  if (!state.md.options.typographer) {
    return;
  }
  for (let blkIdx = state.tokens.length - 1; blkIdx >= 0; blkIdx--) {
    if (state.tokens[blkIdx].type !== "inline" || !QUOTE_TEST_RE.test(state.tokens[blkIdx].content)) {
      continue;
    }
    process_inlines(state.tokens[blkIdx].children, state);
  }
}
function text_join(state) {
  let curr, last;
  const blockTokens = state.tokens;
  const l = blockTokens.length;
  for (let j = 0; j < l; j++) {
    if (blockTokens[j].type !== "inline") continue;
    const tokens = blockTokens[j].children;
    const max = tokens.length;
    for (curr = 0; curr < max; curr++) {
      if (tokens[curr].type === "text_special") {
        tokens[curr].type = "text";
      }
    }
    for (curr = last = 0; curr < max; curr++) {
      if (tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text") {
        tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
      } else {
        if (curr !== last) {
          tokens[last] = tokens[curr];
        }
        last++;
      }
    }
    if (curr !== last) {
      tokens.length = last;
    }
  }
}
const _rules$2 = [
  ["normalize", normalize],
  ["block", block],
  ["inline", inline],
  ["linkify", linkify$1],
  ["replacements", replace],
  ["smartquotes", smartquotes],
  // `text_join` finds `text_special` tokens (for escape sequences)
  // and joins them with the rest of the text
  ["text_join", text_join]
];
function Core() {
  this.ruler = new Ruler();
  for (let i = 0; i < _rules$2.length; i++) {
    this.ruler.push(_rules$2[i][0], _rules$2[i][1]);
  }
}
Core.prototype.process = function(state) {
  const rules = this.ruler.getRules("");
  for (let i = 0, l = rules.length; i < l; i++) {
    rules[i](state);
  }
};
Core.prototype.State = StateCore;
function StateBlock(src, md, env, tokens) {
  this.src = src;
  this.md = md;
  this.env = env;
  this.tokens = tokens;
  this.bMarks = [];
  this.eMarks = [];
  this.tShift = [];
  this.sCount = [];
  this.bsCount = [];
  this.blkIndent = 0;
  this.line = 0;
  this.lineMax = 0;
  this.tight = false;
  this.ddIndent = -1;
  this.listIndent = -1;
  this.parentType = "root";
  this.level = 0;
  const s = this.src;
  for (let start = 0, pos = 0, indent = 0, offset = 0, len = s.length, indent_found = false; pos < len; pos++) {
    const ch = s.charCodeAt(pos);
    if (!indent_found) {
      if (isSpace(ch)) {
        indent++;
        if (ch === 9) {
          offset += 4 - offset % 4;
        } else {
          offset++;
        }
        continue;
      } else {
        indent_found = true;
      }
    }
    if (ch === 10 || pos === len - 1) {
      if (ch !== 10) {
        pos++;
      }
      this.bMarks.push(start);
      this.eMarks.push(pos);
      this.tShift.push(indent);
      this.sCount.push(offset);
      this.bsCount.push(0);
      indent_found = false;
      indent = 0;
      offset = 0;
      start = pos + 1;
    }
  }
  this.bMarks.push(s.length);
  this.eMarks.push(s.length);
  this.tShift.push(0);
  this.sCount.push(0);
  this.bsCount.push(0);
  this.lineMax = this.bMarks.length - 1;
}
StateBlock.prototype.push = function(type, tag, nesting) {
  const token = new Token(type, tag, nesting);
  token.block = true;
  if (nesting < 0) this.level--;
  token.level = this.level;
  if (nesting > 0) this.level++;
  this.tokens.push(token);
  return token;
};
StateBlock.prototype.isEmpty = function isEmpty(line) {
  return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
};
StateBlock.prototype.skipEmptyLines = function skipEmptyLines(from) {
  for (let max = this.lineMax; from < max; from++) {
    if (this.bMarks[from] + this.tShift[from] < this.eMarks[from]) {
      break;
    }
  }
  return from;
};
StateBlock.prototype.skipSpaces = function skipSpaces(pos) {
  for (let max = this.src.length; pos < max; pos++) {
    const ch = this.src.charCodeAt(pos);
    if (!isSpace(ch)) {
      break;
    }
  }
  return pos;
};
StateBlock.prototype.skipSpacesBack = function skipSpacesBack(pos, min) {
  if (pos <= min) {
    return pos;
  }
  while (pos > min) {
    if (!isSpace(this.src.charCodeAt(--pos))) {
      return pos + 1;
    }
  }
  return pos;
};
StateBlock.prototype.skipChars = function skipChars(pos, code2) {
  for (let max = this.src.length; pos < max; pos++) {
    if (this.src.charCodeAt(pos) !== code2) {
      break;
    }
  }
  return pos;
};
StateBlock.prototype.skipCharsBack = function skipCharsBack(pos, code2, min) {
  if (pos <= min) {
    return pos;
  }
  while (pos > min) {
    if (code2 !== this.src.charCodeAt(--pos)) {
      return pos + 1;
    }
  }
  return pos;
};
StateBlock.prototype.getLines = function getLines(begin, end, indent, keepLastLF) {
  if (begin >= end) {
    return "";
  }
  const queue = new Array(end - begin);
  for (let i = 0, line = begin; line < end; line++, i++) {
    let lineIndent = 0;
    const lineStart = this.bMarks[line];
    let first = lineStart;
    let last;
    if (line + 1 < end || keepLastLF) {
      last = this.eMarks[line] + 1;
    } else {
      last = this.eMarks[line];
    }
    while (first < last && lineIndent < indent) {
      const ch = this.src.charCodeAt(first);
      if (isSpace(ch)) {
        if (ch === 9) {
          lineIndent += 4 - (lineIndent + this.bsCount[line]) % 4;
        } else {
          lineIndent++;
        }
      } else if (first - lineStart < this.tShift[line]) {
        lineIndent++;
      } else {
        break;
      }
      first++;
    }
    if (lineIndent > indent) {
      queue[i] = new Array(lineIndent - indent + 1).join(" ") + this.src.slice(first, last);
    } else {
      queue[i] = this.src.slice(first, last);
    }
  }
  return queue.join("");
};
StateBlock.prototype.Token = Token;
const MAX_AUTOCOMPLETED_CELLS = 65536;
function getLine(state, line) {
  const pos = state.bMarks[line] + state.tShift[line];
  const max = state.eMarks[line];
  return state.src.slice(pos, max);
}
function escapedSplit(str) {
  const result = [];
  const max = str.length;
  let pos = 0;
  let ch = str.charCodeAt(pos);
  let isEscaped = false;
  let lastPos = 0;
  let current = "";
  while (pos < max) {
    if (ch === 124) {
      if (!isEscaped) {
        result.push(current + str.substring(lastPos, pos));
        current = "";
        lastPos = pos + 1;
      } else {
        current += str.substring(lastPos, pos - 1);
        lastPos = pos;
      }
    }
    isEscaped = ch === 92;
    pos++;
    ch = str.charCodeAt(pos);
  }
  result.push(current + str.substring(lastPos));
  return result;
}
function table(state, startLine, endLine, silent) {
  if (startLine + 2 > endLine) {
    return false;
  }
  let nextLine = startLine + 1;
  if (state.sCount[nextLine] < state.blkIndent) {
    return false;
  }
  if (state.sCount[nextLine] - state.blkIndent >= 4) {
    return false;
  }
  let pos = state.bMarks[nextLine] + state.tShift[nextLine];
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }
  const firstCh = state.src.charCodeAt(pos++);
  if (firstCh !== 124 && firstCh !== 45 && firstCh !== 58) {
    return false;
  }
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }
  const secondCh = state.src.charCodeAt(pos++);
  if (secondCh !== 124 && secondCh !== 45 && secondCh !== 58 && !isSpace(secondCh)) {
    return false;
  }
  if (firstCh === 45 && isSpace(secondCh)) {
    return false;
  }
  while (pos < state.eMarks[nextLine]) {
    const ch = state.src.charCodeAt(pos);
    if (ch !== 124 && ch !== 45 && ch !== 58 && !isSpace(ch)) {
      return false;
    }
    pos++;
  }
  let lineText = getLine(state, startLine + 1);
  let columns = lineText.split("|");
  const aligns = [];
  for (let i = 0; i < columns.length; i++) {
    const t = columns[i].trim();
    if (!t) {
      if (i === 0 || i === columns.length - 1) {
        continue;
      } else {
        return false;
      }
    }
    if (!/^:?-+:?$/.test(t)) {
      return false;
    }
    if (t.charCodeAt(t.length - 1) === 58) {
      aligns.push(t.charCodeAt(0) === 58 ? "center" : "right");
    } else if (t.charCodeAt(0) === 58) {
      aligns.push("left");
    } else {
      aligns.push("");
    }
  }
  lineText = getLine(state, startLine).trim();
  if (lineText.indexOf("|") === -1) {
    return false;
  }
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  columns = escapedSplit(lineText);
  if (columns.length && columns[0] === "") columns.shift();
  if (columns.length && columns[columns.length - 1] === "") columns.pop();
  const columnCount = columns.length;
  if (columnCount === 0 || columnCount !== aligns.length) {
    return false;
  }
  if (silent) {
    return true;
  }
  const oldParentType = state.parentType;
  state.parentType = "table";
  const terminatorRules = state.md.block.ruler.getRules("blockquote");
  const token_to = state.push("table_open", "table", 1);
  const tableLines = [startLine, 0];
  token_to.map = tableLines;
  const token_tho = state.push("thead_open", "thead", 1);
  token_tho.map = [startLine, startLine + 1];
  const token_htro = state.push("tr_open", "tr", 1);
  token_htro.map = [startLine, startLine + 1];
  for (let i = 0; i < columns.length; i++) {
    const token_ho = state.push("th_open", "th", 1);
    if (aligns[i]) {
      token_ho.attrs = [["style", "text-align:" + aligns[i]]];
    }
    const token_il = state.push("inline", "", 0);
    token_il.content = columns[i].trim();
    token_il.children = [];
    state.push("th_close", "th", -1);
  }
  state.push("tr_close", "tr", -1);
  state.push("thead_close", "thead", -1);
  let tbodyLines;
  let autocompletedCells = 0;
  for (nextLine = startLine + 2; nextLine < endLine; nextLine++) {
    if (state.sCount[nextLine] < state.blkIndent) {
      break;
    }
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }
    lineText = getLine(state, nextLine).trim();
    if (!lineText) {
      break;
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      break;
    }
    columns = escapedSplit(lineText);
    if (columns.length && columns[0] === "") columns.shift();
    if (columns.length && columns[columns.length - 1] === "") columns.pop();
    autocompletedCells += columnCount - columns.length;
    if (autocompletedCells > MAX_AUTOCOMPLETED_CELLS) {
      break;
    }
    if (nextLine === startLine + 2) {
      const token_tbo = state.push("tbody_open", "tbody", 1);
      token_tbo.map = tbodyLines = [startLine + 2, 0];
    }
    const token_tro = state.push("tr_open", "tr", 1);
    token_tro.map = [nextLine, nextLine + 1];
    for (let i = 0; i < columnCount; i++) {
      const token_tdo = state.push("td_open", "td", 1);
      if (aligns[i]) {
        token_tdo.attrs = [["style", "text-align:" + aligns[i]]];
      }
      const token_il = state.push("inline", "", 0);
      token_il.content = columns[i] ? columns[i].trim() : "";
      token_il.children = [];
      state.push("td_close", "td", -1);
    }
    state.push("tr_close", "tr", -1);
  }
  if (tbodyLines) {
    state.push("tbody_close", "tbody", -1);
    tbodyLines[1] = nextLine;
  }
  state.push("table_close", "table", -1);
  tableLines[1] = nextLine;
  state.parentType = oldParentType;
  state.line = nextLine;
  return true;
}
function code(state, startLine, endLine) {
  if (state.sCount[startLine] - state.blkIndent < 4) {
    return false;
  }
  let nextLine = startLine + 1;
  let last = nextLine;
  while (nextLine < endLine) {
    if (state.isEmpty(nextLine)) {
      nextLine++;
      continue;
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      nextLine++;
      last = nextLine;
      continue;
    }
    break;
  }
  state.line = last;
  const token = state.push("code_block", "code", 0);
  token.content = state.getLines(startLine, last, 4 + state.blkIndent, false) + "\n";
  token.map = [startLine, state.line];
  return true;
}
function fence(state, startLine, endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  if (pos + 3 > max) {
    return false;
  }
  const marker2 = state.src.charCodeAt(pos);
  if (marker2 !== 126 && marker2 !== 96) {
    return false;
  }
  let mem = pos;
  pos = state.skipChars(pos, marker2);
  let len = pos - mem;
  if (len < 3) {
    return false;
  }
  const markup = state.src.slice(mem, pos);
  const params = state.src.slice(pos, max);
  if (marker2 === 96) {
    if (params.indexOf(String.fromCharCode(marker2)) >= 0) {
      return false;
    }
  }
  if (silent) {
    return true;
  }
  let nextLine = startLine;
  let haveEndMarker = false;
  for (; ; ) {
    nextLine++;
    if (nextLine >= endLine) {
      break;
    }
    pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];
    if (pos < max && state.sCount[nextLine] < state.blkIndent) {
      break;
    }
    if (state.src.charCodeAt(pos) !== marker2) {
      continue;
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      continue;
    }
    pos = state.skipChars(pos, marker2);
    if (pos - mem < len) {
      continue;
    }
    pos = state.skipSpaces(pos);
    if (pos < max) {
      continue;
    }
    haveEndMarker = true;
    break;
  }
  len = state.sCount[startLine];
  state.line = nextLine + (haveEndMarker ? 1 : 0);
  const token = state.push("fence", "code", 0);
  token.info = params;
  token.content = state.getLines(startLine + 1, nextLine, len, true);
  token.markup = markup;
  token.map = [startLine, state.line];
  return true;
}
function blockquote(state, startLine, endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  const oldLineMax = state.lineMax;
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  if (state.src.charCodeAt(pos) !== 62) {
    return false;
  }
  if (silent) {
    return true;
  }
  const oldBMarks = [];
  const oldBSCount = [];
  const oldSCount = [];
  const oldTShift = [];
  const terminatorRules = state.md.block.ruler.getRules("blockquote");
  const oldParentType = state.parentType;
  state.parentType = "blockquote";
  let lastLineEmpty = false;
  let nextLine;
  for (nextLine = startLine; nextLine < endLine; nextLine++) {
    const isOutdented = state.sCount[nextLine] < state.blkIndent;
    pos = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];
    if (pos >= max) {
      break;
    }
    if (state.src.charCodeAt(pos++) === 62 && !isOutdented) {
      let initial = state.sCount[nextLine] + 1;
      let spaceAfterMarker;
      let adjustTab;
      if (state.src.charCodeAt(pos) === 32) {
        pos++;
        initial++;
        adjustTab = false;
        spaceAfterMarker = true;
      } else if (state.src.charCodeAt(pos) === 9) {
        spaceAfterMarker = true;
        if ((state.bsCount[nextLine] + initial) % 4 === 3) {
          pos++;
          initial++;
          adjustTab = false;
        } else {
          adjustTab = true;
        }
      } else {
        spaceAfterMarker = false;
      }
      let offset = initial;
      oldBMarks.push(state.bMarks[nextLine]);
      state.bMarks[nextLine] = pos;
      while (pos < max) {
        const ch = state.src.charCodeAt(pos);
        if (isSpace(ch)) {
          if (ch === 9) {
            offset += 4 - (offset + state.bsCount[nextLine] + (adjustTab ? 1 : 0)) % 4;
          } else {
            offset++;
          }
        } else {
          break;
        }
        pos++;
      }
      lastLineEmpty = pos >= max;
      oldBSCount.push(state.bsCount[nextLine]);
      state.bsCount[nextLine] = state.sCount[nextLine] + 1 + (spaceAfterMarker ? 1 : 0);
      oldSCount.push(state.sCount[nextLine]);
      state.sCount[nextLine] = offset - initial;
      oldTShift.push(state.tShift[nextLine]);
      state.tShift[nextLine] = pos - state.bMarks[nextLine];
      continue;
    }
    if (lastLineEmpty) {
      break;
    }
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      state.lineMax = nextLine;
      if (state.blkIndent !== 0) {
        oldBMarks.push(state.bMarks[nextLine]);
        oldBSCount.push(state.bsCount[nextLine]);
        oldTShift.push(state.tShift[nextLine]);
        oldSCount.push(state.sCount[nextLine]);
        state.sCount[nextLine] -= state.blkIndent;
      }
      break;
    }
    oldBMarks.push(state.bMarks[nextLine]);
    oldBSCount.push(state.bsCount[nextLine]);
    oldTShift.push(state.tShift[nextLine]);
    oldSCount.push(state.sCount[nextLine]);
    state.sCount[nextLine] = -1;
  }
  const oldIndent = state.blkIndent;
  state.blkIndent = 0;
  const token_o = state.push("blockquote_open", "blockquote", 1);
  token_o.markup = ">";
  const lines = [startLine, 0];
  token_o.map = lines;
  state.md.block.tokenize(state, startLine, nextLine);
  const token_c = state.push("blockquote_close", "blockquote", -1);
  token_c.markup = ">";
  state.lineMax = oldLineMax;
  state.parentType = oldParentType;
  lines[1] = state.line;
  for (let i = 0; i < oldTShift.length; i++) {
    state.bMarks[i + startLine] = oldBMarks[i];
    state.tShift[i + startLine] = oldTShift[i];
    state.sCount[i + startLine] = oldSCount[i];
    state.bsCount[i + startLine] = oldBSCount[i];
  }
  state.blkIndent = oldIndent;
  return true;
}
function hr(state, startLine, endLine, silent) {
  const max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const marker2 = state.src.charCodeAt(pos++);
  if (marker2 !== 42 && marker2 !== 45 && marker2 !== 95) {
    return false;
  }
  let cnt = 1;
  while (pos < max) {
    const ch = state.src.charCodeAt(pos++);
    if (ch !== marker2 && !isSpace(ch)) {
      return false;
    }
    if (ch === marker2) {
      cnt++;
    }
  }
  if (cnt < 3) {
    return false;
  }
  if (silent) {
    return true;
  }
  state.line = startLine + 1;
  const token = state.push("hr", "hr", 0);
  token.map = [startLine, state.line];
  token.markup = Array(cnt + 1).join(String.fromCharCode(marker2));
  return true;
}
function skipBulletListMarker(state, startLine) {
  const max = state.eMarks[startLine];
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const marker2 = state.src.charCodeAt(pos++);
  if (marker2 !== 42 && marker2 !== 45 && marker2 !== 43) {
    return -1;
  }
  if (pos < max) {
    const ch = state.src.charCodeAt(pos);
    if (!isSpace(ch)) {
      return -1;
    }
  }
  return pos;
}
function skipOrderedListMarker(state, startLine) {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  let pos = start;
  if (pos + 1 >= max) {
    return -1;
  }
  let ch = state.src.charCodeAt(pos++);
  if (ch < 48 || ch > 57) {
    return -1;
  }
  for (; ; ) {
    if (pos >= max) {
      return -1;
    }
    ch = state.src.charCodeAt(pos++);
    if (ch >= 48 && ch <= 57) {
      if (pos - start >= 10) {
        return -1;
      }
      continue;
    }
    if (ch === 41 || ch === 46) {
      break;
    }
    return -1;
  }
  if (pos < max) {
    ch = state.src.charCodeAt(pos);
    if (!isSpace(ch)) {
      return -1;
    }
  }
  return pos;
}
function markTightParagraphs(state, idx) {
  const level = state.level + 2;
  for (let i = idx + 2, l = state.tokens.length - 2; i < l; i++) {
    if (state.tokens[i].level === level && state.tokens[i].type === "paragraph_open") {
      state.tokens[i + 2].hidden = true;
      state.tokens[i].hidden = true;
      i += 2;
    }
  }
}
function list$1(state, startLine, endLine, silent) {
  let max, pos, start, token;
  let nextLine = startLine;
  let tight = true;
  if (state.sCount[nextLine] - state.blkIndent >= 4) {
    return false;
  }
  if (state.listIndent >= 0 && state.sCount[nextLine] - state.listIndent >= 4 && state.sCount[nextLine] < state.blkIndent) {
    return false;
  }
  let isTerminatingParagraph = false;
  if (silent && state.parentType === "paragraph") {
    if (state.sCount[nextLine] >= state.blkIndent) {
      isTerminatingParagraph = true;
    }
  }
  let isOrdered;
  let markerValue;
  let posAfterMarker;
  if ((posAfterMarker = skipOrderedListMarker(state, nextLine)) >= 0) {
    isOrdered = true;
    start = state.bMarks[nextLine] + state.tShift[nextLine];
    markerValue = Number(state.src.slice(start, posAfterMarker - 1));
    if (isTerminatingParagraph && markerValue !== 1) return false;
  } else if ((posAfterMarker = skipBulletListMarker(state, nextLine)) >= 0) {
    isOrdered = false;
  } else {
    return false;
  }
  if (isTerminatingParagraph) {
    if (state.skipSpaces(posAfterMarker) >= state.eMarks[nextLine]) return false;
  }
  if (silent) {
    return true;
  }
  const markerCharCode = state.src.charCodeAt(posAfterMarker - 1);
  const listTokIdx = state.tokens.length;
  if (isOrdered) {
    token = state.push("ordered_list_open", "ol", 1);
    if (markerValue !== 1) {
      token.attrs = [["start", markerValue]];
    }
  } else {
    token = state.push("bullet_list_open", "ul", 1);
  }
  const listLines = [nextLine, 0];
  token.map = listLines;
  token.markup = String.fromCharCode(markerCharCode);
  let prevEmptyEnd = false;
  const terminatorRules = state.md.block.ruler.getRules("list");
  const oldParentType = state.parentType;
  state.parentType = "list";
  while (nextLine < endLine) {
    pos = posAfterMarker;
    max = state.eMarks[nextLine];
    const initial = state.sCount[nextLine] + posAfterMarker - (state.bMarks[nextLine] + state.tShift[nextLine]);
    let offset = initial;
    while (pos < max) {
      const ch = state.src.charCodeAt(pos);
      if (ch === 9) {
        offset += 4 - (offset + state.bsCount[nextLine]) % 4;
      } else if (ch === 32) {
        offset++;
      } else {
        break;
      }
      pos++;
    }
    const contentStart = pos;
    let indentAfterMarker;
    if (contentStart >= max) {
      indentAfterMarker = 1;
    } else {
      indentAfterMarker = offset - initial;
    }
    if (indentAfterMarker > 4) {
      indentAfterMarker = 1;
    }
    const indent = initial + indentAfterMarker;
    token = state.push("list_item_open", "li", 1);
    token.markup = String.fromCharCode(markerCharCode);
    const itemLines = [nextLine, 0];
    token.map = itemLines;
    if (isOrdered) {
      token.info = state.src.slice(start, posAfterMarker - 1);
    }
    const oldTight = state.tight;
    const oldTShift = state.tShift[nextLine];
    const oldSCount = state.sCount[nextLine];
    const oldListIndent = state.listIndent;
    state.listIndent = state.blkIndent;
    state.blkIndent = indent;
    state.tight = true;
    state.tShift[nextLine] = contentStart - state.bMarks[nextLine];
    state.sCount[nextLine] = offset;
    if (contentStart >= max && state.isEmpty(nextLine + 1)) {
      state.line = Math.min(state.line + 2, endLine);
    } else {
      state.md.block.tokenize(state, nextLine, endLine, true);
    }
    if (!state.tight || prevEmptyEnd) {
      tight = false;
    }
    prevEmptyEnd = state.line - nextLine > 1 && state.isEmpty(state.line - 1);
    state.blkIndent = state.listIndent;
    state.listIndent = oldListIndent;
    state.tShift[nextLine] = oldTShift;
    state.sCount[nextLine] = oldSCount;
    state.tight = oldTight;
    token = state.push("list_item_close", "li", -1);
    token.markup = String.fromCharCode(markerCharCode);
    nextLine = state.line;
    itemLines[1] = nextLine;
    if (nextLine >= endLine) {
      break;
    }
    if (state.sCount[nextLine] < state.blkIndent) {
      break;
    }
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      break;
    }
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }
    if (isOrdered) {
      posAfterMarker = skipOrderedListMarker(state, nextLine);
      if (posAfterMarker < 0) {
        break;
      }
      start = state.bMarks[nextLine] + state.tShift[nextLine];
    } else {
      posAfterMarker = skipBulletListMarker(state, nextLine);
      if (posAfterMarker < 0) {
        break;
      }
    }
    if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) {
      break;
    }
  }
  if (isOrdered) {
    token = state.push("ordered_list_close", "ol", -1);
  } else {
    token = state.push("bullet_list_close", "ul", -1);
  }
  token.markup = String.fromCharCode(markerCharCode);
  listLines[1] = nextLine;
  state.line = nextLine;
  state.parentType = oldParentType;
  if (tight) {
    markTightParagraphs(state, listTokIdx);
  }
  return true;
}
function reference(state, startLine, _endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  let nextLine = startLine + 1;
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  if (state.src.charCodeAt(pos) !== 91) {
    return false;
  }
  function getNextLine(nextLine2) {
    const endLine = state.lineMax;
    if (nextLine2 >= endLine || state.isEmpty(nextLine2)) {
      return null;
    }
    let isContinuation = false;
    if (state.sCount[nextLine2] - state.blkIndent > 3) {
      isContinuation = true;
    }
    if (state.sCount[nextLine2] < 0) {
      isContinuation = true;
    }
    if (!isContinuation) {
      const terminatorRules = state.md.block.ruler.getRules("reference");
      const oldParentType = state.parentType;
      state.parentType = "reference";
      let terminate = false;
      for (let i = 0, l = terminatorRules.length; i < l; i++) {
        if (terminatorRules[i](state, nextLine2, endLine, true)) {
          terminate = true;
          break;
        }
      }
      state.parentType = oldParentType;
      if (terminate) {
        return null;
      }
    }
    const pos2 = state.bMarks[nextLine2] + state.tShift[nextLine2];
    const max2 = state.eMarks[nextLine2];
    return state.src.slice(pos2, max2 + 1);
  }
  let str = state.src.slice(pos, max + 1);
  max = str.length;
  let labelEnd = -1;
  for (pos = 1; pos < max; pos++) {
    const ch = str.charCodeAt(pos);
    if (ch === 91) {
      return false;
    } else if (ch === 93) {
      labelEnd = pos;
      break;
    } else if (ch === 10) {
      const lineContent = getNextLine(nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (ch === 92) {
      pos++;
      if (pos < max && str.charCodeAt(pos) === 10) {
        const lineContent = getNextLine(nextLine);
        if (lineContent !== null) {
          str += lineContent;
          max = str.length;
          nextLine++;
        }
      }
    }
  }
  if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 58) {
    return false;
  }
  for (pos = labelEnd + 2; pos < max; pos++) {
    const ch = str.charCodeAt(pos);
    if (ch === 10) {
      const lineContent = getNextLine(nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (isSpace(ch)) ;
    else {
      break;
    }
  }
  const destRes = state.md.helpers.parseLinkDestination(str, pos, max);
  if (!destRes.ok) {
    return false;
  }
  const href = state.md.normalizeLink(destRes.str);
  if (!state.md.validateLink(href)) {
    return false;
  }
  pos = destRes.pos;
  const destEndPos = pos;
  const destEndLineNo = nextLine;
  const start = pos;
  for (; pos < max; pos++) {
    const ch = str.charCodeAt(pos);
    if (ch === 10) {
      const lineContent = getNextLine(nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (isSpace(ch)) ;
    else {
      break;
    }
  }
  let titleRes = state.md.helpers.parseLinkTitle(str, pos, max);
  while (titleRes.can_continue) {
    const lineContent = getNextLine(nextLine);
    if (lineContent === null) break;
    str += lineContent;
    pos = max;
    max = str.length;
    nextLine++;
    titleRes = state.md.helpers.parseLinkTitle(str, pos, max, titleRes);
  }
  let title;
  if (pos < max && start !== pos && titleRes.ok) {
    title = titleRes.str;
    pos = titleRes.pos;
  } else {
    title = "";
    pos = destEndPos;
    nextLine = destEndLineNo;
  }
  while (pos < max) {
    const ch = str.charCodeAt(pos);
    if (!isSpace(ch)) {
      break;
    }
    pos++;
  }
  if (pos < max && str.charCodeAt(pos) !== 10) {
    if (title) {
      title = "";
      pos = destEndPos;
      nextLine = destEndLineNo;
      while (pos < max) {
        const ch = str.charCodeAt(pos);
        if (!isSpace(ch)) {
          break;
        }
        pos++;
      }
    }
  }
  if (pos < max && str.charCodeAt(pos) !== 10) {
    return false;
  }
  const label = normalizeReference(str.slice(1, labelEnd));
  if (!label) {
    return false;
  }
  if (silent) {
    return true;
  }
  if (typeof state.env.references === "undefined") {
    state.env.references = {};
  }
  if (typeof state.env.references[label] === "undefined") {
    state.env.references[label] = { title, href };
  }
  state.line = nextLine;
  return true;
}
const block_names = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
const attr_name = "[a-zA-Z_:][a-zA-Z0-9:._-]*";
const unquoted = "[^\"'=<>`\\x00-\\x20]+";
const single_quoted = "'[^']*'";
const double_quoted = '"[^"]*"';
const attr_value = "(?:" + unquoted + "|" + single_quoted + "|" + double_quoted + ")";
const attribute = "(?:\\s+" + attr_name + "(?:\\s*=\\s*" + attr_value + ")?)";
const open_tag = "<[A-Za-z][A-Za-z0-9\\-]*" + attribute + "*\\s*\\/?>";
const close_tag = "<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>";
const comment = "<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->";
const processing = "<[?][\\s\\S]*?[?]>";
const declaration = "<![A-Za-z][^>]*>";
const cdata = "<!\\[CDATA\\[[\\s\\S]*?\\]\\]>";
const HTML_TAG_RE = new RegExp("^(?:" + open_tag + "|" + close_tag + "|" + comment + "|" + processing + "|" + declaration + "|" + cdata + ")");
const HTML_OPEN_CLOSE_TAG_RE = new RegExp("^(?:" + open_tag + "|" + close_tag + ")");
const HTML_SEQUENCES = [
  [/^<(script|pre|style|textarea)(?=(\s|>|$))/i, /<\/(script|pre|style|textarea)>/i, true],
  [/^<!--/, /-->/, true],
  [/^<\?/, /\?>/, true],
  [/^<![A-Z]/, />/, true],
  [/^<!\[CDATA\[/, /\]\]>/, true],
  [new RegExp("^</?(" + block_names.join("|") + ")(?=(\\s|/?>|$))", "i"), /^$/, true],
  [new RegExp(HTML_OPEN_CLOSE_TAG_RE.source + "\\s*$"), /^$/, false]
];
function html_block(state, startLine, endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  if (!state.md.options.html) {
    return false;
  }
  if (state.src.charCodeAt(pos) !== 60) {
    return false;
  }
  let lineText = state.src.slice(pos, max);
  let i = 0;
  for (; i < HTML_SEQUENCES.length; i++) {
    if (HTML_SEQUENCES[i][0].test(lineText)) {
      break;
    }
  }
  if (i === HTML_SEQUENCES.length) {
    return false;
  }
  if (silent) {
    return HTML_SEQUENCES[i][2];
  }
  let nextLine = startLine + 1;
  const endsOnBlankLine = HTML_SEQUENCES[i][1].test("");
  if (!HTML_SEQUENCES[i][1].test(lineText)) {
    for (; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) {
        if (endsOnBlankLine || !state.isEmpty(nextLine)) {
          break;
        }
      }
      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      lineText = state.src.slice(pos, max);
      if (HTML_SEQUENCES[i][1].test(lineText)) {
        if (lineText.length !== 0) {
          nextLine++;
        }
        break;
      }
    }
  }
  state.line = nextLine;
  const token = state.push("html_block", "", 0);
  token.map = [startLine, nextLine];
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true);
  return true;
}
function heading(state, startLine, endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  let ch = state.src.charCodeAt(pos);
  if (ch !== 35 || pos >= max) {
    return false;
  }
  let level = 1;
  ch = state.src.charCodeAt(++pos);
  while (ch === 35 && pos < max && level <= 6) {
    level++;
    ch = state.src.charCodeAt(++pos);
  }
  if (level > 6 || pos < max && !isSpace(ch)) {
    return false;
  }
  if (silent) {
    return true;
  }
  max = state.skipSpacesBack(max, pos);
  const tmp = state.skipCharsBack(max, 35, pos);
  if (tmp > pos && isSpace(state.src.charCodeAt(tmp - 1))) {
    max = tmp;
  }
  state.line = startLine + 1;
  const token_o = state.push("heading_open", "h" + String(level), 1);
  token_o.markup = "########".slice(0, level);
  token_o.map = [startLine, state.line];
  const token_i = state.push("inline", "", 0);
  token_i.content = asciiTrim(state.src.slice(pos, max));
  token_i.map = [startLine, state.line];
  token_i.children = [];
  const token_c = state.push("heading_close", "h" + String(level), -1);
  token_c.markup = "########".slice(0, level);
  return true;
}
function lheading(state, startLine, endLine) {
  const terminatorRules = state.md.block.ruler.getRules("paragraph");
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  const oldParentType = state.parentType;
  state.parentType = "paragraph";
  let level = 0;
  let marker2;
  let nextLine = startLine + 1;
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    if (state.sCount[nextLine] - state.blkIndent > 3) {
      continue;
    }
    if (state.sCount[nextLine] >= state.blkIndent) {
      let pos = state.bMarks[nextLine] + state.tShift[nextLine];
      const max = state.eMarks[nextLine];
      if (pos < max) {
        marker2 = state.src.charCodeAt(pos);
        if (marker2 === 45 || marker2 === 61) {
          pos = state.skipChars(pos, marker2);
          pos = state.skipSpaces(pos);
          if (pos >= max) {
            level = marker2 === 61 ? 1 : 2;
            break;
          }
        }
      }
    }
    if (state.sCount[nextLine] < 0) {
      continue;
    }
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }
  }
  if (!level) {
    state.parentType = oldParentType;
    return false;
  }
  const content = asciiTrim(state.getLines(startLine, nextLine, state.blkIndent, false));
  state.line = nextLine + 1;
  const token_o = state.push("heading_open", "h" + String(level), 1);
  token_o.markup = String.fromCharCode(marker2);
  token_o.map = [startLine, state.line];
  const token_i = state.push("inline", "", 0);
  token_i.content = content;
  token_i.map = [startLine, state.line - 1];
  token_i.children = [];
  const token_c = state.push("heading_close", "h" + String(level), -1);
  token_c.markup = String.fromCharCode(marker2);
  state.parentType = oldParentType;
  return true;
}
function paragraph(state, startLine, endLine) {
  const terminatorRules = state.md.block.ruler.getRules("paragraph");
  const oldParentType = state.parentType;
  let nextLine = startLine + 1;
  state.parentType = "paragraph";
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    if (state.sCount[nextLine] - state.blkIndent > 3) {
      continue;
    }
    if (state.sCount[nextLine] < 0) {
      continue;
    }
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }
  }
  const content = asciiTrim(state.getLines(startLine, nextLine, state.blkIndent, false));
  state.line = nextLine;
  const token_o = state.push("paragraph_open", "p", 1);
  token_o.map = [startLine, state.line];
  const token_i = state.push("inline", "", 0);
  token_i.content = content;
  token_i.map = [startLine, state.line];
  token_i.children = [];
  state.push("paragraph_close", "p", -1);
  state.parentType = oldParentType;
  return true;
}
const _rules$1 = [
  // First 2 params - rule name & source. Secondary array - list of rules,
  // which can be terminated by this one.
  ["table", table, ["paragraph", "reference"]],
  ["code", code],
  ["fence", fence, ["paragraph", "reference", "blockquote", "list"]],
  ["blockquote", blockquote, ["paragraph", "reference", "blockquote", "list"]],
  ["hr", hr, ["paragraph", "reference", "blockquote", "list"]],
  ["list", list$1, ["paragraph", "reference", "blockquote"]],
  ["reference", reference],
  ["html_block", html_block, ["paragraph", "reference", "blockquote"]],
  ["heading", heading, ["paragraph", "reference", "blockquote"]],
  ["lheading", lheading],
  ["paragraph", paragraph]
];
function ParserBlock() {
  this.ruler = new Ruler();
  for (let i = 0; i < _rules$1.length; i++) {
    this.ruler.push(_rules$1[i][0], _rules$1[i][1], { alt: (_rules$1[i][2] || []).slice() });
  }
}
ParserBlock.prototype.tokenize = function(state, startLine, endLine) {
  const rules = this.ruler.getRules("");
  const len = rules.length;
  const maxNesting = state.md.options.maxNesting;
  let line = startLine;
  let hasEmptyLines = false;
  while (line < endLine) {
    state.line = line = state.skipEmptyLines(line);
    if (line >= endLine) {
      break;
    }
    if (state.sCount[line] < state.blkIndent) {
      break;
    }
    if (state.level >= maxNesting) {
      state.line = endLine;
      break;
    }
    const prevLine = state.line;
    let ok = false;
    for (let i = 0; i < len; i++) {
      ok = rules[i](state, line, endLine, false);
      if (ok) {
        if (prevLine >= state.line) {
          throw new Error("block rule didn't increment state.line");
        }
        break;
      }
    }
    if (!ok) throw new Error("none of the block rules matched");
    state.tight = !hasEmptyLines;
    if (state.isEmpty(state.line - 1)) {
      hasEmptyLines = true;
    }
    line = state.line;
    if (line < endLine && state.isEmpty(line)) {
      hasEmptyLines = true;
      line++;
      state.line = line;
    }
  }
};
ParserBlock.prototype.parse = function(src, md, env, outTokens) {
  if (!src) {
    return;
  }
  const state = new this.State(src, md, env, outTokens);
  this.tokenize(state, state.line, state.lineMax);
};
ParserBlock.prototype.State = StateBlock;
function StateInline(src, md, env, outTokens) {
  this.src = src;
  this.env = env;
  this.md = md;
  this.tokens = outTokens;
  this.tokens_meta = Array(outTokens.length);
  this.pos = 0;
  this.posMax = this.src.length;
  this.level = 0;
  this.pending = "";
  this.pendingLevel = 0;
  this.cache = {};
  this.delimiters = [];
  this._prev_delimiters = [];
  this.backticks = {};
  this.backticksScanned = false;
  this.linkLevel = 0;
}
StateInline.prototype.pushPending = function() {
  const token = new Token("text", "", 0);
  token.content = this.pending;
  token.level = this.pendingLevel;
  this.tokens.push(token);
  this.pending = "";
  return token;
};
StateInline.prototype.push = function(type, tag, nesting) {
  if (this.pending) {
    this.pushPending();
  }
  const token = new Token(type, tag, nesting);
  let token_meta = null;
  if (nesting < 0) {
    this.level--;
    this.delimiters = this._prev_delimiters.pop();
  }
  token.level = this.level;
  if (nesting > 0) {
    this.level++;
    this._prev_delimiters.push(this.delimiters);
    this.delimiters = [];
    token_meta = { delimiters: this.delimiters };
  }
  this.pendingLevel = this.level;
  this.tokens.push(token);
  this.tokens_meta.push(token_meta);
  return token;
};
StateInline.prototype.scanDelims = function(start, canSplitWord) {
  const max = this.posMax;
  const marker2 = this.src.charCodeAt(start);
  let lastChar;
  if (start === 0) {
    lastChar = 32;
  } else if (start === 1) {
    lastChar = this.src.charCodeAt(0);
    if ((lastChar & 63488) === 55296) {
      lastChar = 65533;
    }
  } else {
    lastChar = this.src.charCodeAt(start - 1);
    if ((lastChar & 64512) === 56320) {
      const highSurr = this.src.charCodeAt(start - 2);
      lastChar = (highSurr & 64512) === 55296 ? 65536 + (highSurr - 55296 << 10) + (lastChar - 56320) : 65533;
    } else if ((lastChar & 64512) === 55296) {
      lastChar = 65533;
    }
  }
  let pos = start;
  while (pos < max && this.src.charCodeAt(pos) === marker2) {
    pos++;
  }
  const count = pos - start;
  let nextChar = pos < max ? this.src.charCodeAt(pos) : 32;
  if ((nextChar & 64512) === 55296) {
    const lowSurr = this.src.charCodeAt(pos + 1);
    nextChar = (lowSurr & 64512) === 56320 ? 65536 + (nextChar - 55296 << 10) + (lowSurr - 56320) : 65533;
  } else if ((nextChar & 64512) === 56320) {
    nextChar = 65533;
  }
  const isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctCharCode(lastChar);
  const isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctCharCode(nextChar);
  const isLastWhiteSpace = isWhiteSpace(lastChar);
  const isNextWhiteSpace = isWhiteSpace(nextChar);
  const left_flanking = !isNextWhiteSpace && (!isNextPunctChar || isLastWhiteSpace || isLastPunctChar);
  const right_flanking = !isLastWhiteSpace && (!isLastPunctChar || isNextWhiteSpace || isNextPunctChar);
  const can_open = left_flanking && (canSplitWord || !right_flanking || isLastPunctChar);
  const can_close = right_flanking && (canSplitWord || !left_flanking || isNextPunctChar);
  return { can_open, can_close, length: count };
};
StateInline.prototype.Token = Token;
function isTerminatorChar(ch) {
  switch (ch) {
    case 10:
    case 33:
    case 35:
    case 36:
    case 37:
    case 38:
    case 42:
    case 43:
    case 45:
    case 58:
    case 60:
    case 61:
    case 62:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 125:
    case 126:
      return true;
    default:
      return false;
  }
}
function text$2(state, silent) {
  let pos = state.pos;
  while (pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos))) {
    pos++;
  }
  if (pos === state.pos) {
    return false;
  }
  if (!silent) {
    state.pending += state.src.slice(state.pos, pos);
  }
  state.pos = pos;
  return true;
}
const SCHEME_RE = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;
function linkify(state, silent) {
  if (!state.md.options.linkify) return false;
  if (state.linkLevel > 0) return false;
  const pos = state.pos;
  const max = state.posMax;
  if (pos + 3 > max) return false;
  if (state.src.charCodeAt(pos) !== 58) return false;
  if (state.src.charCodeAt(pos + 1) !== 47) return false;
  if (state.src.charCodeAt(pos + 2) !== 47) return false;
  const match2 = state.pending.match(SCHEME_RE);
  if (!match2) return false;
  const proto = match2[1];
  const link2 = state.md.linkify.matchAtStart(state.src.slice(pos - proto.length));
  if (!link2) return false;
  let url2 = link2.url;
  if (url2.length <= proto.length) return false;
  let urlEnd = url2.length;
  while (urlEnd > 0 && url2.charCodeAt(urlEnd - 1) === 42) {
    urlEnd--;
  }
  if (urlEnd !== url2.length) {
    url2 = url2.slice(0, urlEnd);
  }
  const fullUrl = state.md.normalizeLink(url2);
  if (!state.md.validateLink(fullUrl)) return false;
  if (!silent) {
    state.pending = state.pending.slice(0, -proto.length);
    const token_o = state.push("link_open", "a", 1);
    token_o.attrs = [["href", fullUrl]];
    token_o.markup = "linkify";
    token_o.info = "auto";
    const token_t = state.push("text", "", 0);
    token_t.content = state.md.normalizeLinkText(url2);
    const token_c = state.push("link_close", "a", -1);
    token_c.markup = "linkify";
    token_c.info = "auto";
  }
  state.pos += url2.length - proto.length;
  return true;
}
function newline(state, silent) {
  let pos = state.pos;
  if (state.src.charCodeAt(pos) !== 10) {
    return false;
  }
  const pmax = state.pending.length - 1;
  const max = state.posMax;
  if (!silent) {
    if (pmax >= 0 && state.pending.charCodeAt(pmax) === 32) {
      if (pmax >= 1 && state.pending.charCodeAt(pmax - 1) === 32) {
        let ws = pmax - 1;
        while (ws >= 1 && state.pending.charCodeAt(ws - 1) === 32) ws--;
        state.pending = state.pending.slice(0, ws);
        state.push("hardbreak", "br", 0);
      } else {
        state.pending = state.pending.slice(0, -1);
        state.push("softbreak", "br", 0);
      }
    } else {
      state.push("softbreak", "br", 0);
    }
  }
  pos++;
  while (pos < max && isSpace(state.src.charCodeAt(pos))) {
    pos++;
  }
  state.pos = pos;
  return true;
}
const ESCAPED = [];
for (let i = 0; i < 256; i++) {
  ESCAPED.push(0);
}
"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(ch) {
  ESCAPED[ch.charCodeAt(0)] = 1;
});
function escape(state, silent) {
  let pos = state.pos;
  const max = state.posMax;
  if (state.src.charCodeAt(pos) !== 92) return false;
  pos++;
  if (pos >= max) return false;
  let ch1 = state.src.charCodeAt(pos);
  if (ch1 === 10) {
    if (!silent) {
      state.push("hardbreak", "br", 0);
    }
    pos++;
    while (pos < max) {
      ch1 = state.src.charCodeAt(pos);
      if (!isSpace(ch1)) break;
      pos++;
    }
    state.pos = pos;
    return true;
  }
  let escapedStr = state.src[pos];
  if (ch1 >= 55296 && ch1 <= 56319 && pos + 1 < max) {
    const ch2 = state.src.charCodeAt(pos + 1);
    if (ch2 >= 56320 && ch2 <= 57343) {
      escapedStr += state.src[pos + 1];
      pos++;
    }
  }
  const origStr = "\\" + escapedStr;
  if (!silent) {
    const token = state.push("text_special", "", 0);
    if (ch1 < 256 && ESCAPED[ch1] !== 0) {
      token.content = escapedStr;
    } else {
      token.content = origStr;
    }
    token.markup = origStr;
    token.info = "escape";
  }
  state.pos = pos + 1;
  return true;
}
function backtick(state, silent) {
  let pos = state.pos;
  const ch = state.src.charCodeAt(pos);
  if (ch !== 96) {
    return false;
  }
  const start = pos;
  pos++;
  const max = state.posMax;
  while (pos < max && state.src.charCodeAt(pos) === 96) {
    pos++;
  }
  const marker2 = state.src.slice(start, pos);
  const openerLength = marker2.length;
  if (state.backticksScanned && (state.backticks[openerLength] || 0) <= start) {
    if (!silent) state.pending += marker2;
    state.pos += openerLength;
    return true;
  }
  let matchEnd = pos;
  let matchStart;
  while ((matchStart = state.src.indexOf("`", matchEnd)) !== -1) {
    matchEnd = matchStart + 1;
    while (matchEnd < max && state.src.charCodeAt(matchEnd) === 96) {
      matchEnd++;
    }
    const closerLength = matchEnd - matchStart;
    if (closerLength === openerLength) {
      if (!silent) {
        const token = state.push("code_inline", "code", 0);
        token.markup = marker2;
        token.content = state.src.slice(pos, matchStart).replace(/\n/g, " ").replace(/^ (.+) $/, "$1");
      }
      state.pos = matchEnd;
      return true;
    }
    state.backticks[closerLength] = matchStart;
  }
  state.backticksScanned = true;
  if (!silent) state.pending += marker2;
  state.pos += openerLength;
  return true;
}
function strikethrough_tokenize(state, silent) {
  const start = state.pos;
  const marker2 = state.src.charCodeAt(start);
  if (silent) {
    return false;
  }
  if (marker2 !== 126) {
    return false;
  }
  const scanned = state.scanDelims(state.pos, true);
  let len = scanned.length;
  const ch = String.fromCharCode(marker2);
  if (len < 2) {
    return false;
  }
  let token;
  if (len % 2) {
    token = state.push("text", "", 0);
    token.content = ch;
    len--;
  }
  for (let i = 0; i < len; i += 2) {
    token = state.push("text", "", 0);
    token.content = ch + ch;
    state.delimiters.push({
      marker: marker2,
      length: 0,
      // disable "rule of 3" length checks meant for emphasis
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close
    });
  }
  state.pos += scanned.length;
  return true;
}
function postProcess$1(state, delimiters) {
  let token;
  const loneMarkers = [];
  const max = delimiters.length;
  for (let i = 0; i < max; i++) {
    const startDelim = delimiters[i];
    if (startDelim.marker !== 126) {
      continue;
    }
    if (startDelim.end === -1) {
      continue;
    }
    const endDelim = delimiters[startDelim.end];
    token = state.tokens[startDelim.token];
    token.type = "s_open";
    token.tag = "s";
    token.nesting = 1;
    token.markup = "~~";
    token.content = "";
    token = state.tokens[endDelim.token];
    token.type = "s_close";
    token.tag = "s";
    token.nesting = -1;
    token.markup = "~~";
    token.content = "";
    if (state.tokens[endDelim.token - 1].type === "text" && state.tokens[endDelim.token - 1].content === "~") {
      loneMarkers.push(endDelim.token - 1);
    }
  }
  while (loneMarkers.length) {
    const i = loneMarkers.pop();
    let j = i + 1;
    while (j < state.tokens.length && state.tokens[j].type === "s_close") {
      j++;
    }
    j--;
    if (i !== j) {
      token = state.tokens[j];
      state.tokens[j] = state.tokens[i];
      state.tokens[i] = token;
    }
  }
}
function strikethrough_postProcess(state) {
  const tokens_meta = state.tokens_meta;
  const max = state.tokens_meta.length;
  postProcess$1(state, state.delimiters);
  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      postProcess$1(state, tokens_meta[curr].delimiters);
    }
  }
}
const r_strikethrough = {
  tokenize: strikethrough_tokenize,
  postProcess: strikethrough_postProcess
};
function emphasis_tokenize(state, silent) {
  const start = state.pos;
  const marker2 = state.src.charCodeAt(start);
  if (silent) {
    return false;
  }
  if (marker2 !== 95 && marker2 !== 42) {
    return false;
  }
  const scanned = state.scanDelims(state.pos, marker2 === 42);
  for (let i = 0; i < scanned.length; i++) {
    const token = state.push("text", "", 0);
    token.content = String.fromCharCode(marker2);
    state.delimiters.push({
      // Char code of the starting marker (number).
      //
      marker: marker2,
      // Total length of these series of delimiters.
      //
      length: scanned.length,
      // A position of the token this delimiter corresponds to.
      //
      token: state.tokens.length - 1,
      // If this delimiter is matched as a valid opener, `end` will be
      // equal to its position, otherwise it's `-1`.
      //
      end: -1,
      // Boolean flags that determine if this delimiter could open or close
      // an emphasis.
      //
      open: scanned.can_open,
      close: scanned.can_close
    });
  }
  state.pos += scanned.length;
  return true;
}
function postProcess(state, delimiters) {
  const max = delimiters.length;
  for (let i = max - 1; i >= 0; i--) {
    const startDelim = delimiters[i];
    if (startDelim.marker !== 95 && startDelim.marker !== 42) {
      continue;
    }
    if (startDelim.end === -1) {
      continue;
    }
    const endDelim = delimiters[startDelim.end];
    const isStrong = i > 0 && delimiters[i - 1].end === startDelim.end + 1 && // check that first two markers match and adjacent
    delimiters[i - 1].marker === startDelim.marker && delimiters[i - 1].token === startDelim.token - 1 && // check that last two markers are adjacent (we can safely assume they match)
    delimiters[startDelim.end + 1].token === endDelim.token + 1;
    const ch = String.fromCharCode(startDelim.marker);
    const token_o = state.tokens[startDelim.token];
    token_o.type = isStrong ? "strong_open" : "em_open";
    token_o.tag = isStrong ? "strong" : "em";
    token_o.nesting = 1;
    token_o.markup = isStrong ? ch + ch : ch;
    token_o.content = "";
    const token_c = state.tokens[endDelim.token];
    token_c.type = isStrong ? "strong_close" : "em_close";
    token_c.tag = isStrong ? "strong" : "em";
    token_c.nesting = -1;
    token_c.markup = isStrong ? ch + ch : ch;
    token_c.content = "";
    if (isStrong) {
      state.tokens[delimiters[i - 1].token].content = "";
      state.tokens[delimiters[startDelim.end + 1].token].content = "";
      i--;
    }
  }
}
function emphasis_post_process(state) {
  const tokens_meta = state.tokens_meta;
  const max = state.tokens_meta.length;
  postProcess(state, state.delimiters);
  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      postProcess(state, tokens_meta[curr].delimiters);
    }
  }
}
const r_emphasis = {
  tokenize: emphasis_tokenize,
  postProcess: emphasis_post_process
};
function link(state, silent) {
  let code2, label, res, ref;
  let href = "";
  let title = "";
  let start = state.pos;
  let parseReference = true;
  if (state.src.charCodeAt(state.pos) !== 91) {
    return false;
  }
  const oldPos = state.pos;
  const max = state.posMax;
  const labelStart = state.pos + 1;
  const labelEnd = state.md.helpers.parseLinkLabel(state, state.pos, true);
  if (labelEnd < 0) {
    return false;
  }
  let pos = labelEnd + 1;
  if (pos < max && state.src.charCodeAt(pos) === 40) {
    parseReference = false;
    pos++;
    for (; pos < max; pos++) {
      code2 = state.src.charCodeAt(pos);
      if (!isSpace(code2) && code2 !== 10) {
        break;
      }
    }
    if (pos >= max) {
      return false;
    }
    start = pos;
    res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
    if (res.ok) {
      href = state.md.normalizeLink(res.str);
      if (state.md.validateLink(href)) {
        pos = res.pos;
      } else {
        href = "";
      }
      start = pos;
      for (; pos < max; pos++) {
        code2 = state.src.charCodeAt(pos);
        if (!isSpace(code2) && code2 !== 10) {
          break;
        }
      }
      res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
      if (pos < max && start !== pos && res.ok) {
        title = res.str;
        pos = res.pos;
        for (; pos < max; pos++) {
          code2 = state.src.charCodeAt(pos);
          if (!isSpace(code2) && code2 !== 10) {
            break;
          }
        }
      }
    }
    if (pos >= max || state.src.charCodeAt(pos) !== 41) {
      parseReference = true;
    }
    pos++;
  }
  if (parseReference) {
    if (typeof state.env.references === "undefined") {
      return false;
    }
    if (pos < max && state.src.charCodeAt(pos) === 91) {
      start = pos + 1;
      pos = state.md.helpers.parseLinkLabel(state, pos);
      if (pos >= 0) {
        label = state.src.slice(start, pos++);
      } else {
        pos = labelEnd + 1;
      }
    } else {
      pos = labelEnd + 1;
    }
    if (!label) {
      label = state.src.slice(labelStart, labelEnd);
    }
    ref = state.env.references[normalizeReference(label)];
    if (!ref) {
      state.pos = oldPos;
      return false;
    }
    href = ref.href;
    title = ref.title;
  }
  if (!silent) {
    state.pos = labelStart;
    state.posMax = labelEnd;
    const token_o = state.push("link_open", "a", 1);
    const attrs = [["href", href]];
    token_o.attrs = attrs;
    if (title) {
      attrs.push(["title", title]);
    }
    state.linkLevel++;
    state.md.inline.tokenize(state);
    state.linkLevel--;
    state.push("link_close", "a", -1);
  }
  state.pos = pos;
  state.posMax = max;
  return true;
}
function image(state, silent) {
  let code2, content, label, pos, ref, res, title, start;
  let href = "";
  const oldPos = state.pos;
  const max = state.posMax;
  if (state.src.charCodeAt(state.pos) !== 33) {
    return false;
  }
  if (state.src.charCodeAt(state.pos + 1) !== 91) {
    return false;
  }
  const labelStart = state.pos + 2;
  const labelEnd = state.md.helpers.parseLinkLabel(state, state.pos + 1, false);
  if (labelEnd < 0) {
    return false;
  }
  pos = labelEnd + 1;
  if (pos < max && state.src.charCodeAt(pos) === 40) {
    pos++;
    for (; pos < max; pos++) {
      code2 = state.src.charCodeAt(pos);
      if (!isSpace(code2) && code2 !== 10) {
        break;
      }
    }
    if (pos >= max) {
      return false;
    }
    start = pos;
    res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
    if (res.ok) {
      href = state.md.normalizeLink(res.str);
      if (state.md.validateLink(href)) {
        pos = res.pos;
      } else {
        href = "";
      }
    }
    start = pos;
    for (; pos < max; pos++) {
      code2 = state.src.charCodeAt(pos);
      if (!isSpace(code2) && code2 !== 10) {
        break;
      }
    }
    res = state.md.helpers.parseLinkTitle(state.src, pos, state.posMax);
    if (pos < max && start !== pos && res.ok) {
      title = res.str;
      pos = res.pos;
      for (; pos < max; pos++) {
        code2 = state.src.charCodeAt(pos);
        if (!isSpace(code2) && code2 !== 10) {
          break;
        }
      }
    } else {
      title = "";
    }
    if (pos >= max || state.src.charCodeAt(pos) !== 41) {
      state.pos = oldPos;
      return false;
    }
    pos++;
  } else {
    if (typeof state.env.references === "undefined") {
      return false;
    }
    if (pos < max && state.src.charCodeAt(pos) === 91) {
      start = pos + 1;
      pos = state.md.helpers.parseLinkLabel(state, pos);
      if (pos >= 0) {
        label = state.src.slice(start, pos++);
      } else {
        pos = labelEnd + 1;
      }
    } else {
      pos = labelEnd + 1;
    }
    if (!label) {
      label = state.src.slice(labelStart, labelEnd);
    }
    ref = state.env.references[normalizeReference(label)];
    if (!ref) {
      state.pos = oldPos;
      return false;
    }
    href = ref.href;
    title = ref.title;
  }
  if (!silent) {
    content = state.src.slice(labelStart, labelEnd);
    const tokens = [];
    state.md.inline.parse(
      content,
      state.md,
      state.env,
      tokens
    );
    const token = state.push("image", "img", 0);
    const attrs = [["src", href], ["alt", ""]];
    token.attrs = attrs;
    token.children = tokens;
    token.content = content;
    if (title) {
      attrs.push(["title", title]);
    }
  }
  state.pos = pos;
  state.posMax = max;
  return true;
}
const EMAIL_RE = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;
const AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;
function autolink(state, silent) {
  let pos = state.pos;
  if (state.src.charCodeAt(pos) !== 60) {
    return false;
  }
  const start = state.pos;
  const max = state.posMax;
  for (; ; ) {
    if (++pos >= max) return false;
    const ch = state.src.charCodeAt(pos);
    if (ch === 60) return false;
    if (ch === 62) break;
  }
  const url2 = state.src.slice(start + 1, pos);
  if (AUTOLINK_RE.test(url2)) {
    const fullUrl = state.md.normalizeLink(url2);
    if (!state.md.validateLink(fullUrl)) {
      return false;
    }
    if (!silent) {
      const token_o = state.push("link_open", "a", 1);
      token_o.attrs = [["href", fullUrl]];
      token_o.markup = "autolink";
      token_o.info = "auto";
      const token_t = state.push("text", "", 0);
      token_t.content = state.md.normalizeLinkText(url2);
      const token_c = state.push("link_close", "a", -1);
      token_c.markup = "autolink";
      token_c.info = "auto";
    }
    state.pos += url2.length + 2;
    return true;
  }
  if (EMAIL_RE.test(url2)) {
    const fullUrl = state.md.normalizeLink("mailto:" + url2);
    if (!state.md.validateLink(fullUrl)) {
      return false;
    }
    if (!silent) {
      const token_o = state.push("link_open", "a", 1);
      token_o.attrs = [["href", fullUrl]];
      token_o.markup = "autolink";
      token_o.info = "auto";
      const token_t = state.push("text", "", 0);
      token_t.content = state.md.normalizeLinkText(url2);
      const token_c = state.push("link_close", "a", -1);
      token_c.markup = "autolink";
      token_c.info = "auto";
    }
    state.pos += url2.length + 2;
    return true;
  }
  return false;
}
function isLinkOpen(str) {
  return /^<a[>\s]/i.test(str);
}
function isLinkClose(str) {
  return /^<\/a\s*>/i.test(str);
}
function isLetter(ch) {
  const lc = ch | 32;
  return lc >= 97 && lc <= 122;
}
function html_inline(state, silent) {
  if (!state.md.options.html) {
    return false;
  }
  const max = state.posMax;
  const pos = state.pos;
  if (state.src.charCodeAt(pos) !== 60 || pos + 2 >= max) {
    return false;
  }
  const ch = state.src.charCodeAt(pos + 1);
  if (ch !== 33 && ch !== 63 && ch !== 47 && !isLetter(ch)) {
    return false;
  }
  const match2 = state.src.slice(pos).match(HTML_TAG_RE);
  if (!match2) {
    return false;
  }
  if (!silent) {
    const token = state.push("html_inline", "", 0);
    token.content = match2[0];
    if (isLinkOpen(token.content)) state.linkLevel++;
    if (isLinkClose(token.content)) state.linkLevel--;
  }
  state.pos += match2[0].length;
  return true;
}
const DIGITAL_RE = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i;
const NAMED_RE = /^&([a-z][a-z0-9]{1,31});/i;
function entity(state, silent) {
  const pos = state.pos;
  const max = state.posMax;
  if (state.src.charCodeAt(pos) !== 38) return false;
  if (pos + 1 >= max) return false;
  const ch = state.src.charCodeAt(pos + 1);
  if (ch === 35) {
    const match2 = state.src.slice(pos).match(DIGITAL_RE);
    if (match2) {
      if (!silent) {
        const code2 = match2[1][0].toLowerCase() === "x" ? parseInt(match2[1].slice(1), 16) : parseInt(match2[1], 10);
        const token = state.push("text_special", "", 0);
        token.content = isValidEntityCode(code2) ? fromCodePoint(code2) : fromCodePoint(65533);
        token.markup = match2[0];
        token.info = "entity";
      }
      state.pos += match2[0].length;
      return true;
    }
  } else {
    const match2 = state.src.slice(pos).match(NAMED_RE);
    if (match2) {
      const decoded = decodeHTMLStrict(match2[0]);
      if (decoded !== match2[0]) {
        if (!silent) {
          const token = state.push("text_special", "", 0);
          token.content = decoded;
          token.markup = match2[0];
          token.info = "entity";
        }
        state.pos += match2[0].length;
        return true;
      }
    }
  }
  return false;
}
function processDelimiters(delimiters) {
  const openersBottom = {};
  const max = delimiters.length;
  if (!max) return;
  let headerIdx = 0;
  let lastTokenIdx = -2;
  const jumps = [];
  for (let closerIdx = 0; closerIdx < max; closerIdx++) {
    const closer = delimiters[closerIdx];
    jumps.push(0);
    if (delimiters[headerIdx].marker !== closer.marker || lastTokenIdx !== closer.token - 1) {
      headerIdx = closerIdx;
    }
    lastTokenIdx = closer.token;
    closer.length = closer.length || 0;
    if (!closer.close) continue;
    if (!openersBottom.hasOwnProperty(closer.marker)) {
      openersBottom[closer.marker] = [-1, -1, -1, -1, -1, -1];
    }
    const minOpenerIdx = openersBottom[closer.marker][(closer.open ? 3 : 0) + closer.length % 3];
    let openerIdx = headerIdx - jumps[headerIdx] - 1;
    let newMinOpenerIdx = openerIdx;
    for (; openerIdx > minOpenerIdx; openerIdx -= jumps[openerIdx] + 1) {
      const opener = delimiters[openerIdx];
      if (opener.marker !== closer.marker) continue;
      if (opener.open && opener.end < 0) {
        let isOddMatch = false;
        if (opener.close || closer.open) {
          if ((opener.length + closer.length) % 3 === 0) {
            if (opener.length % 3 !== 0 || closer.length % 3 !== 0) {
              isOddMatch = true;
            }
          }
        }
        if (!isOddMatch) {
          const lastJump = openerIdx > 0 && !delimiters[openerIdx - 1].open ? jumps[openerIdx - 1] + 1 : 0;
          jumps[closerIdx] = closerIdx - openerIdx + lastJump;
          jumps[openerIdx] = lastJump;
          closer.open = false;
          opener.end = closerIdx;
          opener.close = false;
          newMinOpenerIdx = -1;
          lastTokenIdx = -2;
          break;
        }
      }
    }
    if (newMinOpenerIdx !== -1) {
      openersBottom[closer.marker][(closer.open ? 3 : 0) + (closer.length || 0) % 3] = newMinOpenerIdx;
    }
  }
}
function link_pairs(state) {
  const tokens_meta = state.tokens_meta;
  const max = state.tokens_meta.length;
  processDelimiters(state.delimiters);
  for (let curr = 0; curr < max; curr++) {
    if (tokens_meta[curr] && tokens_meta[curr].delimiters) {
      processDelimiters(tokens_meta[curr].delimiters);
    }
  }
}
function fragments_join(state) {
  let curr, last;
  let level = 0;
  const tokens = state.tokens;
  const max = state.tokens.length;
  for (curr = last = 0; curr < max; curr++) {
    if (tokens[curr].nesting < 0) level--;
    tokens[curr].level = level;
    if (tokens[curr].nesting > 0) level++;
    if (tokens[curr].type === "text" && curr + 1 < max && tokens[curr + 1].type === "text") {
      tokens[curr + 1].content = tokens[curr].content + tokens[curr + 1].content;
    } else {
      if (curr !== last) {
        tokens[last] = tokens[curr];
      }
      last++;
    }
  }
  if (curr !== last) {
    tokens.length = last;
  }
}
const _rules = [
  ["text", text$2],
  ["linkify", linkify],
  ["newline", newline],
  ["escape", escape],
  ["backticks", backtick],
  ["strikethrough", r_strikethrough.tokenize],
  ["emphasis", r_emphasis.tokenize],
  ["link", link],
  ["image", image],
  ["autolink", autolink],
  ["html_inline", html_inline],
  ["entity", entity]
];
const _rules2 = [
  ["balance_pairs", link_pairs],
  ["strikethrough", r_strikethrough.postProcess],
  ["emphasis", r_emphasis.postProcess],
  // rules for pairs separate '**' into its own text tokens, which may be left unused,
  // rule below merges unused segments back with the rest of the text
  ["fragments_join", fragments_join]
];
function ParserInline() {
  this.ruler = new Ruler();
  for (let i = 0; i < _rules.length; i++) {
    this.ruler.push(_rules[i][0], _rules[i][1]);
  }
  this.ruler2 = new Ruler();
  for (let i = 0; i < _rules2.length; i++) {
    this.ruler2.push(_rules2[i][0], _rules2[i][1]);
  }
}
ParserInline.prototype.skipToken = function(state) {
  const pos = state.pos;
  const rules = this.ruler.getRules("");
  const len = rules.length;
  const maxNesting = state.md.options.maxNesting;
  const cache = state.cache;
  if (typeof cache[pos] !== "undefined") {
    state.pos = cache[pos];
    return;
  }
  let ok = false;
  if (state.level < maxNesting) {
    for (let i = 0; i < len; i++) {
      state.level++;
      ok = rules[i](state, true);
      state.level--;
      if (ok) {
        if (pos >= state.pos) {
          throw new Error("inline rule didn't increment state.pos");
        }
        break;
      }
    }
  } else {
    state.pos = state.posMax;
  }
  if (!ok) {
    state.pos++;
  }
  cache[pos] = state.pos;
};
ParserInline.prototype.tokenize = function(state) {
  const rules = this.ruler.getRules("");
  const len = rules.length;
  const end = state.posMax;
  const maxNesting = state.md.options.maxNesting;
  while (state.pos < end) {
    const prevPos = state.pos;
    let ok = false;
    if (state.level < maxNesting) {
      for (let i = 0; i < len; i++) {
        ok = rules[i](state, false);
        if (ok) {
          if (prevPos >= state.pos) {
            throw new Error("inline rule didn't increment state.pos");
          }
          break;
        }
      }
    }
    if (ok) {
      if (state.pos >= end) {
        break;
      }
      continue;
    }
    state.pending += state.src[state.pos++];
  }
  if (state.pending) {
    state.pushPending();
  }
};
ParserInline.prototype.parse = function(str, md, env, outTokens) {
  const state = new this.State(str, md, env, outTokens);
  this.tokenize(state);
  const rules = this.ruler2.getRules("");
  const len = rules.length;
  for (let i = 0; i < len; i++) {
    rules[i](state);
  }
};
ParserInline.prototype.State = StateInline;
function reFactory(opts) {
  const re = {};
  opts = opts || {};
  re.src_Any = Any.source;
  re.src_Cc = Cc.source;
  re.src_Z = Z.source;
  re.src_P = P.source;
  re.src_ZPCc = [re.src_Z, re.src_P, re.src_Cc].join("|");
  re.src_ZCc = [re.src_Z, re.src_Cc].join("|");
  const text_separators = "[><｜]";
  re.src_pseudo_letter = `(?:(?!${text_separators}|${re.src_ZPCc})${re.src_Any})`;
  re.src_ip4 = "(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
  re.src_auth = `(?:(?:(?!${re.src_ZCc}|[@/\\[\\]()]).){1,50}@)?`;
  re.src_port = "(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?";
  re.src_host_terminator = `(?=$|${text_separators}|${re.src_ZPCc})(?!${opts["---"] ? "-(?!--)|" : "-|"}_|:\\d|\\.-|\\.(?!$|${re.src_ZPCc}))`;
  re.src_path = `(?:[/?#](?:(?!${re.src_ZCc}|${text_separators}|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!${re.src_ZCc}|\\]).)*\\]|\\((?:(?!${re.src_ZCc}|[)]).)*\\)|\\{(?:(?!${re.src_ZCc}|[}]).)*\\}|\\"(?:(?!${re.src_ZCc}|["]).)+\\"|\\'(?:(?!${re.src_ZCc}|[']).)+\\'|\\'(?=${re.src_pseudo_letter}|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!${re.src_ZCc}|[.]|$)|` + (opts["---"] ? "\\-(?!--(?:[^-]|$))(?:-*)|" : "\\-+|") + // allow `,,,` in paths
  `,(?!${re.src_ZCc}|$)|;(?!${re.src_ZCc}|$)|\\!+(?!${re.src_ZCc}|[!]|$)|\\?(?!${re.src_ZCc}|[?]|$))+|\\/)?`;
  re.src_email_name = '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]{0,63}';
  re.src_xn = "xn--[a-z0-9\\-]{1,59}";
  re.src_domain_root = // Allow letters & digits (http://test1)
  "(?:" + re.src_xn + `|${re.src_pseudo_letter}{1,63})`;
  re.src_domain = "(?:" + re.src_xn + `|(?:${re.src_pseudo_letter})|(?:${re.src_pseudo_letter}(?:-|${re.src_pseudo_letter}){0,61}${re.src_pseudo_letter}))`;
  re.src_host = `(?:(?:(?:(?:${re.src_domain})\\.)*${re.src_domain}))`;
  re.tpl_host_fuzzy = "(?:" + re.src_ip4 + `|(?:(?:(?:${re.src_domain})\\.)+(?:%TLDS%)))`;
  re.tpl_host_no_ip_fuzzy = `(?:(?:(?:${re.src_domain})\\.)+(?:%TLDS%))`;
  re.src_host_strict = re.src_host + re.src_host_terminator;
  re.tpl_host_fuzzy_strict = re.tpl_host_fuzzy + re.src_host_terminator;
  re.src_host_port_strict = re.src_host + re.src_port + re.src_host_terminator;
  re.tpl_host_port_fuzzy_strict = re.tpl_host_fuzzy + re.src_port + re.src_host_terminator;
  re.tpl_host_port_no_ip_fuzzy_strict = re.tpl_host_no_ip_fuzzy + re.src_port + re.src_host_terminator;
  re.tpl_host_fuzzy_test = `localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:${re.src_ZPCc}|>|$))`;
  re.tpl_email_fuzzy = `(^|${text_separators}|"|\\(|${re.src_ZCc})(${re.src_email_name}@${re.tpl_host_fuzzy_strict})`;
  re.tpl_link_fuzzy = // Fuzzy link can't be prepended with .:/\- and non punctuation.
  // but can start with > (markdown blockquote)
  `(^|(?![.:/\\-_@])(?:[$+<=>^\`|｜]|${re.src_ZPCc}))((?![$+<=>^\`|｜])${re.tpl_host_port_fuzzy_strict}${re.src_path})`;
  re.tpl_link_no_ip_fuzzy = // Fuzzy link can't be prepended with .:/\- and non punctuation.
  // but can start with > (markdown blockquote)
  `(^|(?![.:/\\-_@])(?:[$+<=>^\`|｜]|${re.src_ZPCc}))((?![$+<=>^\`|｜])${re.tpl_host_port_no_ip_fuzzy_strict}${re.src_path})`;
  return re;
}
function assign(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  sources.forEach(function(source) {
    if (!source) {
      return;
    }
    Object.keys(source).forEach(function(key) {
      obj[key] = source[key];
    });
  });
  return obj;
}
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function isString(obj) {
  return _class(obj) === "[object String]";
}
function isObject(obj) {
  return _class(obj) === "[object Object]";
}
function isRegExp(obj) {
  return _class(obj) === "[object RegExp]";
}
function isFunction(obj) {
  return _class(obj) === "[object Function]";
}
function escapeRE(str) {
  return str.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}
const defaultOptions = {
  fuzzyLink: true,
  fuzzyEmail: true,
  fuzzyIP: false
};
function isOptionsObj(obj) {
  return Object.keys(obj || {}).reduce(function(acc, k) {
    return acc || defaultOptions.hasOwnProperty(k);
  }, false);
}
const defaultSchemas = {
  "http:": {
    validate: function(text2, pos, self) {
      const tail = text2.slice(pos);
      if (!self.re.http) {
        self.re.http = new RegExp(
          `^\\/\\/${self.re.src_auth}${self.re.src_host_port_strict}${self.re.src_path}`,
          "i"
        );
      }
      if (self.re.http.test(tail)) {
        return tail.match(self.re.http)[0].length;
      }
      return 0;
    }
  },
  "https:": "http:",
  "ftp:": "http:",
  "//": {
    validate: function(text2, pos, self) {
      const tail = text2.slice(pos);
      if (!self.re.no_http) {
        self.re.no_http = new RegExp(
          "^" + self.re.src_auth + // Don't allow single-level domains, because of false positives like '//test'
          // with code comments
          `(?:localhost|(?:(?:${self.re.src_domain})\\.)+${self.re.src_domain_root})` + self.re.src_port + self.re.src_host_terminator + self.re.src_path,
          "i"
        );
      }
      if (self.re.no_http.test(tail)) {
        if (pos >= 3 && text2[pos - 3] === ":") {
          return 0;
        }
        if (pos >= 3 && text2[pos - 3] === "/") {
          return 0;
        }
        return tail.match(self.re.no_http)[0].length;
      }
      return 0;
    }
  },
  "mailto:": {
    validate: function(text2, pos, self) {
      const tail = text2.slice(pos);
      if (!self.re.mailto) {
        self.re.mailto = new RegExp(
          `^${self.re.src_email_name}@${self.re.src_host_strict}`,
          "i"
        );
      }
      if (self.re.mailto.test(tail)) {
        return tail.match(self.re.mailto)[0].length;
      }
      return 0;
    }
  }
};
const tlds_2ch_src_re = "a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]";
const tlds_default = "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф".split("|");
function createValidator(re) {
  return function(text2, pos) {
    const tail = text2.slice(pos);
    if (re.test(tail)) {
      return tail.match(re)[0].length;
    }
    return 0;
  };
}
function createNormalizer() {
  return function(match2, self) {
    self.normalize(match2);
  };
}
function compile(self) {
  const re = self.re = reFactory(self.__opts__);
  const tlds2 = self.__tlds__.slice();
  self.onCompile();
  if (!self.__tlds_replaced__) {
    tlds2.push(tlds_2ch_src_re);
  }
  tlds2.push(re.src_xn);
  re.src_tlds = tlds2.join("|");
  function untpl(tpl) {
    return tpl.replace("%TLDS%", re.src_tlds);
  }
  re.email_fuzzy = RegExp(untpl(re.tpl_email_fuzzy), "i");
  re.email_fuzzy_global = RegExp(untpl(re.tpl_email_fuzzy), "ig");
  re.link_fuzzy = RegExp(untpl(re.tpl_link_fuzzy), "i");
  re.link_fuzzy_global = RegExp(untpl(re.tpl_link_fuzzy), "ig");
  re.link_no_ip_fuzzy = RegExp(untpl(re.tpl_link_no_ip_fuzzy), "i");
  re.link_no_ip_fuzzy_global = RegExp(untpl(re.tpl_link_no_ip_fuzzy), "ig");
  re.host_fuzzy_test = RegExp(untpl(re.tpl_host_fuzzy_test), "i");
  const aliases2 = [];
  self.__compiled__ = {};
  function schemaError(name, val) {
    throw new Error(`(LinkifyIt) Invalid schema "${name}": ${val}`);
  }
  Object.keys(self.__schemas__).forEach(function(name) {
    const val = self.__schemas__[name];
    if (val === null) {
      return;
    }
    const compiled = { validate: null, link: null };
    self.__compiled__[name] = compiled;
    if (isObject(val)) {
      if (isRegExp(val.validate)) {
        compiled.validate = createValidator(val.validate);
      } else if (isFunction(val.validate)) {
        compiled.validate = val.validate;
      } else {
        schemaError(name, val);
      }
      if (isFunction(val.normalize)) {
        compiled.normalize = val.normalize;
      } else if (!val.normalize) {
        compiled.normalize = createNormalizer();
      } else {
        schemaError(name, val);
      }
      return;
    }
    if (isString(val)) {
      aliases2.push(name);
      return;
    }
    schemaError(name, val);
  });
  aliases2.forEach(function(alias) {
    if (!self.__compiled__[self.__schemas__[alias]]) {
      return;
    }
    self.__compiled__[alias].validate = self.__compiled__[self.__schemas__[alias]].validate;
    self.__compiled__[alias].normalize = self.__compiled__[self.__schemas__[alias]].normalize;
  });
  self.__compiled__[""] = { validate: null, normalize: createNormalizer() };
  const slist = Object.keys(self.__compiled__).filter(function(name) {
    return name.length > 0 && self.__compiled__[name];
  }).map(escapeRE).join("|");
  self.re.schema_test = RegExp(`(^|(?!_)(?:[><｜]|${re.src_ZPCc}))(${slist})`, "i");
  self.re.schema_search = RegExp(`(^|(?!_)(?:[><｜]|${re.src_ZPCc}))(${slist})`, "ig");
  self.re.schema_at_start = RegExp(`^${self.re.schema_search.source}`, "i");
  self.re.pretest = RegExp(
    `(${self.re.schema_test.source})|(${self.re.host_fuzzy_test.source})|@`,
    "i"
  );
}
function Match(text2, schema, index, lastIndex) {
  const raw = text2.slice(index, lastIndex);
  this.schema = schema.toLowerCase();
  this.index = index;
  this.lastIndex = lastIndex;
  this.raw = raw;
  this.text = raw;
  this.url = raw;
}
function LinkifyIt(schemas, options) {
  if (!(this instanceof LinkifyIt)) {
    return new LinkifyIt(schemas, options);
  }
  if (!options) {
    if (isOptionsObj(schemas)) {
      options = schemas;
      schemas = {};
    }
  }
  this.__opts__ = assign({}, defaultOptions, options);
  this.__schemas__ = assign({}, defaultSchemas, schemas);
  this.__compiled__ = {};
  this.__tlds__ = tlds_default;
  this.__tlds_replaced__ = false;
  this.re = {};
  compile(this);
}
LinkifyIt.prototype.add = function add(schema, definition) {
  this.__schemas__[schema] = definition;
  compile(this);
  return this;
};
LinkifyIt.prototype.set = function set(options) {
  this.__opts__ = assign(this.__opts__, options);
  return this;
};
LinkifyIt.prototype.test = function test(text2) {
  if (!text2.length) {
    return false;
  }
  let m, re;
  if (this.re.schema_test.test(text2)) {
    re = this.re.schema_search;
    re.lastIndex = 0;
    while ((m = re.exec(text2)) !== null) {
      if (this.testSchemaAt(text2, m[2], re.lastIndex)) {
        return true;
      }
    }
  }
  if (this.__opts__.fuzzyLink && this.__compiled__["http:"]) {
    if (text2.search(this.re.host_fuzzy_test) >= 0) {
      if (text2.match(this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy) !== null) {
        return true;
      }
    }
  }
  if (this.__opts__.fuzzyEmail && this.__compiled__["mailto:"]) {
    if (text2.indexOf("@") >= 0) {
      if (text2.match(this.re.email_fuzzy) !== null) {
        return true;
      }
    }
  }
  return false;
};
LinkifyIt.prototype.pretest = function pretest(text2) {
  return this.re.pretest.test(text2);
};
LinkifyIt.prototype.testSchemaAt = function testSchemaAt(text2, schema, pos) {
  if (!this.__compiled__[schema.toLowerCase()]) {
    return 0;
  }
  return this.__compiled__[schema.toLowerCase()].validate(text2, pos, this);
};
LinkifyIt.prototype.match = function match(text2) {
  const result = [];
  const type_schemed = [];
  const type_fuzzy_link = [];
  const type_fuzzy_email = [];
  let m, len, re;
  function choose(a, b) {
    if (!a) {
      return b;
    }
    if (!b) {
      return a;
    }
    if (a.index !== b.index) {
      return a.index < b.index ? a : b;
    }
    return a.lastIndex >= b.lastIndex ? a : b;
  }
  if (!text2.length) {
    return null;
  }
  if (this.re.schema_test.test(text2)) {
    re = this.re.schema_search;
    re.lastIndex = 0;
    while ((m = re.exec(text2)) !== null) {
      len = this.testSchemaAt(text2, m[2], re.lastIndex);
      if (len) {
        type_schemed.push({
          schema: m[2],
          index: m.index + m[1].length,
          lastIndex: m.index + m[0].length + len
        });
      }
    }
  }
  if (this.__opts__.fuzzyLink && this.__compiled__["http:"]) {
    re = this.__opts__.fuzzyIP ? this.re.link_fuzzy_global : this.re.link_no_ip_fuzzy_global;
    re.lastIndex = 0;
    while ((m = re.exec(text2)) !== null) {
      type_fuzzy_link.push({
        schema: "",
        index: m.index + m[1].length,
        lastIndex: m.index + m[0].length
      });
    }
  }
  if (this.__opts__.fuzzyEmail && this.__compiled__["mailto:"]) {
    re = this.re.email_fuzzy_global;
    re.lastIndex = 0;
    while ((m = re.exec(text2)) !== null) {
      type_fuzzy_email.push({
        schema: "mailto:",
        index: m.index + m[1].length,
        lastIndex: m.index + m[0].length
      });
    }
  }
  const indexes = [0, 0, 0];
  let lastIndex = 0;
  for (; ; ) {
    const candidates = [
      type_schemed[indexes[0]],
      type_fuzzy_email[indexes[1]],
      type_fuzzy_link[indexes[2]]
    ];
    const candidate = choose(choose(candidates[0], candidates[1]), candidates[2]);
    if (!candidate) {
      break;
    }
    if (candidate === candidates[0]) {
      indexes[0]++;
    } else if (candidate === candidates[1]) {
      indexes[1]++;
    } else {
      indexes[2]++;
    }
    if (candidate.index < lastIndex) {
      continue;
    }
    const match2 = new Match(text2, candidate.schema, candidate.index, candidate.lastIndex);
    this.__compiled__[match2.schema].normalize(match2, this);
    result.push(match2);
    lastIndex = candidate.lastIndex;
  }
  if (result.length) {
    return result;
  }
  return null;
};
LinkifyIt.prototype.matchAtStart = function matchAtStart(text2) {
  if (!text2.length) return null;
  const m = this.re.schema_at_start.exec(text2);
  if (!m) return null;
  const len = this.testSchemaAt(text2, m[2], m[0].length);
  if (!len) return null;
  const match2 = new Match(text2, m[2], m.index + m[1].length, m.index + m[0].length + len);
  this.__compiled__[match2.schema].normalize(match2, this);
  return match2;
};
LinkifyIt.prototype.tlds = function tlds(list2, keepOld) {
  list2 = Array.isArray(list2) ? list2 : [list2];
  if (!keepOld) {
    this.__tlds__ = list2.slice();
    this.__tlds_replaced__ = true;
    compile(this);
    return this;
  }
  this.__tlds__ = this.__tlds__.concat(list2).sort().filter(function(el, idx, arr) {
    return el !== arr[idx - 1];
  }).reverse();
  compile(this);
  return this;
};
LinkifyIt.prototype.normalize = function normalize2(match2) {
  if (!match2.schema) {
    match2.url = `http://${match2.url}`;
  }
  if (match2.schema === "mailto:" && !/^mailto:/i.test(match2.url)) {
    match2.url = `mailto:${match2.url}`;
  }
};
LinkifyIt.prototype.onCompile = function onCompile() {
};
const maxInt = 2147483647;
const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128;
const delimiter = "-";
const regexPunycode = /^xn--/;
const regexNonASCII = /[^\0-\x7F]/;
const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
const errors = {
  "overflow": "Overflow: input needs wider integers to process",
  "not-basic": "Illegal input >= 0x80 (not a basic code point)",
  "invalid-input": "Invalid input"
};
const baseMinusTMin = base - tMin;
const floor = Math.floor;
const stringFromCharCode = String.fromCharCode;
function error(type) {
  throw new RangeError(errors[type]);
}
function map(array, callback) {
  const result = [];
  let length = array.length;
  while (length--) {
    result[length] = callback(array[length]);
  }
  return result;
}
function mapDomain(domain, callback) {
  const parts = domain.split("@");
  let result = "";
  if (parts.length > 1) {
    result = parts[0] + "@";
    domain = parts[1];
  }
  domain = domain.replace(regexSeparators, ".");
  const labels = domain.split(".");
  const encoded = map(labels, callback).join(".");
  return result + encoded;
}
function ucs2decode(string) {
  const output = [];
  let counter = 0;
  const length = string.length;
  while (counter < length) {
    const value = string.charCodeAt(counter++);
    if (value >= 55296 && value <= 56319 && counter < length) {
      const extra = string.charCodeAt(counter++);
      if ((extra & 64512) == 56320) {
        output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
      } else {
        output.push(value);
        counter--;
      }
    } else {
      output.push(value);
    }
  }
  return output;
}
const ucs2encode = (codePoints) => String.fromCodePoint(...codePoints);
const basicToDigit = function(codePoint) {
  if (codePoint >= 48 && codePoint < 58) {
    return 26 + (codePoint - 48);
  }
  if (codePoint >= 65 && codePoint < 91) {
    return codePoint - 65;
  }
  if (codePoint >= 97 && codePoint < 123) {
    return codePoint - 97;
  }
  return base;
};
const digitToBasic = function(digit, flag) {
  return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
};
const adapt = function(delta, numPoints, firstTime) {
  let k = 0;
  delta = firstTime ? floor(delta / damp) : delta >> 1;
  delta += floor(delta / numPoints);
  for (; delta > baseMinusTMin * tMax >> 1; k += base) {
    delta = floor(delta / baseMinusTMin);
  }
  return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
};
const decode = function(input) {
  const output = [];
  const inputLength = input.length;
  let i = 0;
  let n = initialN;
  let bias = initialBias;
  let basic = input.lastIndexOf(delimiter);
  if (basic < 0) {
    basic = 0;
  }
  for (let j = 0; j < basic; ++j) {
    if (input.charCodeAt(j) >= 128) {
      error("not-basic");
    }
    output.push(input.charCodeAt(j));
  }
  for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
    const oldi = i;
    for (let w = 1, k = base; ; k += base) {
      if (index >= inputLength) {
        error("invalid-input");
      }
      const digit = basicToDigit(input.charCodeAt(index++));
      if (digit >= base) {
        error("invalid-input");
      }
      if (digit > floor((maxInt - i) / w)) {
        error("overflow");
      }
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) {
        break;
      }
      const baseMinusT = base - t;
      if (w > floor(maxInt / baseMinusT)) {
        error("overflow");
      }
      w *= baseMinusT;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi == 0);
    if (floor(i / out) > maxInt - n) {
      error("overflow");
    }
    n += floor(i / out);
    i %= out;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
};
const encode = function(input) {
  const output = [];
  input = ucs2decode(input);
  const inputLength = input.length;
  let n = initialN;
  let delta = 0;
  let bias = initialBias;
  for (const currentValue of input) {
    if (currentValue < 128) {
      output.push(stringFromCharCode(currentValue));
    }
  }
  const basicLength = output.length;
  let handledCPCount = basicLength;
  if (basicLength) {
    output.push(delimiter);
  }
  while (handledCPCount < inputLength) {
    let m = maxInt;
    for (const currentValue of input) {
      if (currentValue >= n && currentValue < m) {
        m = currentValue;
      }
    }
    const handledCPCountPlusOne = handledCPCount + 1;
    if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
      error("overflow");
    }
    delta += (m - n) * handledCPCountPlusOne;
    n = m;
    for (const currentValue of input) {
      if (currentValue < n && ++delta > maxInt) {
        error("overflow");
      }
      if (currentValue === n) {
        let q = delta;
        for (let k = base; ; k += base) {
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (q < t) {
            break;
          }
          const qMinusT = q - t;
          const baseMinusT = base - t;
          output.push(
            stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
          );
          q = floor(qMinusT / baseMinusT);
        }
        output.push(stringFromCharCode(digitToBasic(q, 0)));
        bias = adapt(delta, handledCPCountPlusOne, handledCPCount === basicLength);
        delta = 0;
        ++handledCPCount;
      }
    }
    ++delta;
    ++n;
  }
  return output.join("");
};
const toUnicode = function(input) {
  return mapDomain(input, function(string) {
    return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
  });
};
const toASCII = function(input) {
  return mapDomain(input, function(string) {
    return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
  });
};
const punycode = {
  /**
   * A string representing the current Punycode.js version number.
   * @memberOf punycode
   * @type String
   */
  "version": "2.3.1",
  /**
   * An object of methods to convert from JavaScript's internal character
   * representation (UCS-2) to Unicode code points, and back.
   * @see <https://mathiasbynens.be/notes/javascript-encoding>
   * @memberOf punycode
   * @type Object
   */
  "ucs2": {
    "decode": ucs2decode,
    "encode": ucs2encode
  },
  "decode": decode,
  "encode": encode,
  "toASCII": toASCII,
  "toUnicode": toUnicode
};
const cfg_default = {
  options: {
    // Enable HTML tags in source
    html: false,
    // Use '/' to close single tags (<br />)
    xhtmlOut: false,
    // Convert '\n' in paragraphs into <br>
    breaks: false,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: false,
    // Enable some language-neutral replacements + quotes beautification
    typographer: false,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 100
  },
  components: {
    core: {},
    block: {},
    inline: {}
  }
};
const cfg_zero = {
  options: {
    // Enable HTML tags in source
    html: false,
    // Use '/' to close single tags (<br />)
    xhtmlOut: false,
    // Convert '\n' in paragraphs into <br>
    breaks: false,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: false,
    // Enable some language-neutral replacements + quotes beautification
    typographer: false,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 20
  },
  components: {
    core: {
      rules: [
        "normalize",
        "block",
        "inline",
        "text_join"
      ]
    },
    block: {
      rules: [
        "paragraph"
      ]
    },
    inline: {
      rules: [
        "text"
      ],
      rules2: [
        "balance_pairs",
        "fragments_join"
      ]
    }
  }
};
const cfg_commonmark = {
  options: {
    // Enable HTML tags in source
    html: true,
    // Use '/' to close single tags (<br />)
    xhtmlOut: true,
    // Convert '\n' in paragraphs into <br>
    breaks: false,
    // CSS language prefix for fenced blocks
    langPrefix: "language-",
    // autoconvert URL-like texts to links
    linkify: false,
    // Enable some language-neutral replacements + quotes beautification
    typographer: false,
    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Could be either a String or an Array.
    //
    // For example, you can use '«»„“' for Russian, '„“‚‘' for German,
    // and ['«\xA0', '\xA0»', '‹\xA0', '\xA0›'] for French (including nbsp).
    quotes: "“”‘’",
    /* “”‘’ */
    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed and should be escaped externaly.
    // If result starts with <pre... internal wrapper is skipped.
    //
    // function (/*str, lang*/) { return ''; }
    //
    highlight: null,
    // Internal protection, recursion limit
    maxNesting: 20
  },
  components: {
    core: {
      rules: [
        "normalize",
        "block",
        "inline",
        "text_join"
      ]
    },
    block: {
      rules: [
        "blockquote",
        "code",
        "fence",
        "heading",
        "hr",
        "html_block",
        "lheading",
        "list",
        "reference",
        "paragraph"
      ]
    },
    inline: {
      rules: [
        "autolink",
        "backticks",
        "emphasis",
        "entity",
        "escape",
        "html_inline",
        "image",
        "link",
        "newline",
        "text"
      ],
      rules2: [
        "balance_pairs",
        "emphasis",
        "fragments_join"
      ]
    }
  }
};
const config = {
  default: cfg_default,
  zero: cfg_zero,
  commonmark: cfg_commonmark
};
const BAD_PROTO_RE = /^(vbscript|javascript|file|data):/;
const GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;
function validateLink(url2) {
  const str = url2.trim().toLowerCase();
  return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) : true;
}
const RECODE_HOSTNAME_FOR = ["http:", "https:", "mailto:"];
function normalizeLink(url2) {
  const parsed = urlParse(url2, true);
  if (parsed.hostname) {
    if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
      try {
        parsed.hostname = punycode.toASCII(parsed.hostname);
      } catch (er) {
      }
    }
  }
  return encode$1(format(parsed));
}
function normalizeLinkText(url2) {
  const parsed = urlParse(url2, true);
  if (parsed.hostname) {
    if (!parsed.protocol || RECODE_HOSTNAME_FOR.indexOf(parsed.protocol) >= 0) {
      try {
        parsed.hostname = punycode.toUnicode(parsed.hostname);
      } catch (er) {
      }
    }
  }
  return decode$1(format(parsed), decode$1.defaultChars + "%");
}
function MarkdownIt(presetName, options) {
  if (!(this instanceof MarkdownIt)) {
    return new MarkdownIt(presetName, options);
  }
  if (!options) {
    if (!isString$1(presetName)) {
      options = presetName || {};
      presetName = "default";
    }
  }
  this.inline = new ParserInline();
  this.block = new ParserBlock();
  this.core = new Core();
  this.renderer = new Renderer();
  this.linkify = new LinkifyIt();
  this.validateLink = validateLink;
  this.normalizeLink = normalizeLink;
  this.normalizeLinkText = normalizeLinkText;
  this.utils = utils;
  this.helpers = assign$1({}, helpers);
  this.options = {};
  this.configure(presetName);
  if (options) {
    this.set(options);
  }
}
MarkdownIt.prototype.set = function(options) {
  assign$1(this.options, options);
  return this;
};
MarkdownIt.prototype.configure = function(presets) {
  const self = this;
  if (isString$1(presets)) {
    const presetName = presets;
    presets = config[presetName];
    if (!presets) {
      throw new Error('Wrong `markdown-it` preset "' + presetName + '", check name');
    }
  }
  if (!presets) {
    throw new Error("Wrong `markdown-it` preset, can't be empty");
  }
  if (presets.options) {
    self.set(presets.options);
  }
  if (presets.components) {
    Object.keys(presets.components).forEach(function(name) {
      if (presets.components[name].rules) {
        self[name].ruler.enableOnly(presets.components[name].rules);
      }
      if (presets.components[name].rules2) {
        self[name].ruler2.enableOnly(presets.components[name].rules2);
      }
    });
  }
  return this;
};
MarkdownIt.prototype.enable = function(list2, ignoreInvalid) {
  let result = [];
  if (!Array.isArray(list2)) {
    list2 = [list2];
  }
  ["core", "block", "inline"].forEach(function(chain) {
    result = result.concat(this[chain].ruler.enable(list2, true));
  }, this);
  result = result.concat(this.inline.ruler2.enable(list2, true));
  const missed = list2.filter(function(name) {
    return result.indexOf(name) < 0;
  });
  if (missed.length && !ignoreInvalid) {
    throw new Error("MarkdownIt. Failed to enable unknown rule(s): " + missed);
  }
  return this;
};
MarkdownIt.prototype.disable = function(list2, ignoreInvalid) {
  let result = [];
  if (!Array.isArray(list2)) {
    list2 = [list2];
  }
  ["core", "block", "inline"].forEach(function(chain) {
    result = result.concat(this[chain].ruler.disable(list2, true));
  }, this);
  result = result.concat(this.inline.ruler2.disable(list2, true));
  const missed = list2.filter(function(name) {
    return result.indexOf(name) < 0;
  });
  if (missed.length && !ignoreInvalid) {
    throw new Error("MarkdownIt. Failed to disable unknown rule(s): " + missed);
  }
  return this;
};
MarkdownIt.prototype.use = function(plugin) {
  const args = [this].concat(Array.prototype.slice.call(arguments, 1));
  plugin.apply(plugin, args);
  return this;
};
MarkdownIt.prototype.parse = function(src, env) {
  if (typeof src !== "string") {
    throw new Error("Input data should be a String");
  }
  const state = new this.core.State(src, this, env);
  this.core.process(state);
  return state.tokens;
};
MarkdownIt.prototype.render = function(src, env) {
  env = env || {};
  return this.renderer.render(this.parse(src, env), this.options, env);
};
MarkdownIt.prototype.parseInline = function(src, env) {
  const state = new this.core.State(src, this, env);
  state.inlineMode = true;
  this.core.process(state);
  return state.tokens;
};
MarkdownIt.prototype.renderInline = function(src, env) {
  env = env || {};
  return this.renderer.render(this.parseInline(src, env), this.options, env);
};
function interactiveFigureReference(tokens) {
  if (tokens?.length !== 3) return;
  const [link2, image2, close] = tokens;
  if (link2.type !== "link_open" || image2.type !== "image" || close.type !== "link_close") return;
  if (!["交互图", "interactive figure"].includes(String(link2.attrGet("title") || "").trim().toLowerCase())) return;
  const source = String(link2.attrGet("href") || "");
  const poster = String(image2.attrGet("src") || "");
  const local = (value) => !!value && !/^(?:[a-z][a-z0-9+.-]*:|[\\/#])|[?#\u0000-\u001f]/i.test(value);
  if (!local(source) || !/\.html?$/i.test(source) || !local(poster) || !/\.(?:svg|png|jpe?g|webp|gif)$/i.test(poster)) return;
  return { source, poster, title: image2.content || "" };
}
const markdown$1 = new MarkdownIt({ html: false });
function staticFigureMarkdown(line) {
  const tokens = markdown$1.parseInline(line.trim(), {});
  const figure = interactiveFigureReference(tokens[0]?.children);
  if (!figure) return line;
  const indent = line.match(/^\s*/)?.[0] || "";
  const title = figure.title.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  return `${indent}![${title}](<${figure.poster.replace(/>/g, "%3E")}>)`;
}
const WORK_METADATA_TEXT_FIELDS = ["title", "subtitle", "language", "description", "license", "licenseUrl", "website", "repository", "preferredCitation"];
const text$1 = (value, field, limit = 1e5) => {
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error(`Invalid metadata ${field}.`);
  return value.trim();
};
function metadataDoi(value) {
  if (value === void 0) return;
  const normalized = text$1(value, "DOI", 300).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  if (normalized && !/^10\.\d{4,9}\/[^\s<>]+$/i.test(normalized)) throw new Error("Enter a DOI such as 10.1234/example.");
  return normalized;
}
function url(value, field) {
  const result = text$1(value, field, 3e3);
  if (result && !/^https?:\/\/[^\s<>]+$/i.test(result)) throw new Error(`Metadata ${field} must be an HTTP or HTTPS URL.`);
  if (result) {
    let parsed;
    try {
      parsed = new globalThis.URL(result);
    } catch {
      throw new Error(`Invalid metadata ${field} URL.`);
    }
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error(`Invalid metadata ${field} URL.`);
  }
  return result;
}
function strings(input, field, limit = 100) {
  if (!Array.isArray(input) || input.length > limit) throw new Error(`Invalid metadata ${field}.`);
  return [...new Set(input.map((value) => text$1(value, field, 3e3)).filter(Boolean))];
}
function normalizeWorkMetadata(input) {
  if (input === void 0) return {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Metadata must be an object.");
  const value = input, result = {};
  for (const field of WORK_METADATA_TEXT_FIELDS) if (value[field] !== void 0) {
    result[field] = ["website", "repository", "licenseUrl"].includes(field) ? url(value[field], field) : text$1(value[field], field);
  }
  if (value.authors !== void 0) {
    if (!Array.isArray(value.authors) || value.authors.length > 100) throw new Error("Invalid metadata authors.");
    result.authors = value.authors.map((author) => {
      if (!author || typeof author !== "object" || Array.isArray(author)) throw new Error("Invalid metadata author.");
      const name = text$1(author.name, "author name", 1e3);
      if (!name) throw new Error("Every publication author needs a name.");
      const result2 = { name };
      for (const field of ["nativeName", "affiliation"]) if (author[field] !== void 0) result2[field] = text$1(author[field], field, 3e3);
      if (author.aliases !== void 0) result2.aliases = strings(author.aliases, "author aliases");
      if (author.orcid !== void 0) {
        const orcid = text$1(author.orcid, "ORCID", 1e3).replace(/^https?:\/\/orcid\.org\//i, "");
        if (orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(orcid)) throw new Error("Enter an ORCID such as 0000-0002-1825-0097.");
        result2.orcid = orcid ? `https://orcid.org/${orcid.toUpperCase()}` : "";
      }
      return result2;
    });
  }
  if (value.keywords !== void 0) result.keywords = strings(value.keywords, "keywords");
  if (value.doi !== void 0) {
    if (!value.doi || typeof value.doi !== "object" || Array.isArray(value.doi)) throw new Error("Invalid metadata DOI.");
    result.doi = {};
    if (value.doi.conceptDoi !== void 0) result.doi.conceptDoi = metadataDoi(value.doi.conceptDoi);
    if (value.doi.provenance !== void 0) result.doi.provenance = text$1(value.doi.provenance, "DOI provenance", 3e3);
  }
  return result;
}
function mergeWorkMetadata(project, overrides) {
  return { ...project, ...overrides, ...project.doi || overrides.doi ? { doi: { ...project.doi, ...overrides.doi } } : {} };
}
function projectMetadata(config2) {
  const pdf = config2?.pdf || {}, legacy = {};
  for (const field of WORK_METADATA_TEXT_FIELDS) if (pdf[field]) legacy[field] = pdf[field];
  if (pdf.lang) legacy.language = pdf.lang;
  if (Array.isArray(pdf.authors) && pdf.authors.length) legacy.authors = pdf.authors;
  else if (pdf.author) legacy.authors = [{ name: pdf.author, ...pdf.authorNative ? { nativeName: pdf.authorNative } : {}, ...pdf.authorAliases?.length ? { aliases: pdf.authorAliases } : {}, ...pdf.orcid ? { orcid: pdf.orcid } : {} }];
  if (pdf.keywords) legacy.keywords = pdf.keywords;
  if (pdf.workDoi) legacy.doi = { conceptDoi: pdf.workDoi };
  return mergeWorkMetadata(normalizeWorkMetadata(legacy), normalizeWorkMetadata(config2?.metadata));
}
class MarkdownFence {
  /** True for the opening/closing delimiter and every line inside the block. */
  consume(line) {
    const match2 = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (this.delimiter) {
      if (match2 && match2[1][0] === this.delimiter[0] && match2[1].length >= this.delimiter.length && !match2[2].trim()) this.delimiter = void 0;
      return true;
    }
    if (!match2 || match2[1][0] === "`" && match2[2].includes("`")) return false;
    this.delimiter = match2[1];
    return true;
  }
}
function maskFencedMarkdown(content) {
  const fence2 = new MarkdownFence();
  return content.split("\n").map((line) => fence2.consume(line) ? line.replace(/[^\r\n]/g, " ") : line).join("\n");
}
const FORMAL_KIND_POLICIES = {
  prop: { aliases: ["命题", "Proposition", "Prop", "Prop."], zh: "命题", en: "Proposition", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  lemma: { aliases: ["引理", "Lemma", "Lem", "Lem."], zh: "引理", en: "Lemma", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  theorem: { aliases: ["定理", "Theorem", "Thm", "Thm."], zh: "定理", en: "Theorem", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  cor: { aliases: ["推论", "Corollary", "Cor", "Cor."], zh: "推论", en: "Corollary", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  def: { aliases: ["定义", "Definition", "Def", "Def."], zh: "定义", en: "Definition" },
  remark: { aliases: ["注", "Remark", "Rem", "Rem."], zh: "注", en: "Remark", recall: true, dependency: "supplemental", lean: true },
  example: { aliases: ["例", "Example", "Ex", "Ex."], zh: "例", en: "Example", counter: "example", recall: true },
  counterexample: { aliases: ["反例", "Counterexample"], zh: "反例", en: "Counterexample", counter: "example", recall: true },
  exercise: { aliases: ["习题", "练习", "Exercise"], zh: "习题", en: "Exercise", counter: "exercise", recall: true, dependency: "pedagogical", lean: true },
  solution: { aliases: ["解答", "答案", "Solution", "Answer"], zh: "解答", en: "Solution", recall: true, dependency: "pedagogical" },
  section: { aliases: [], zh: "§", en: "§", counter: "section" },
  equation: { aliases: ["公式", "方程", "Equation", "Eq", "Eq.", "Formula"], zh: "公式", en: "Equation", counter: "equation" },
  figure: { aliases: ["图", "图示", "Figure", "Fig", "Fig."], zh: "图", en: "Figure", counter: "figure" },
  table: { aliases: ["表", "表格", "Table", "Tab", "Tab."], zh: "表", en: "Table", counter: "table" }
};
const FORMAL_TYPES = Object.keys(FORMAL_KIND_POLICIES);
new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].counter === "theorem"));
const DEPENDENCY_NODE_TYPES = new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].dependency));
const RECALL_TYPES = new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].recall));
const DEFAULT_LEAN_COVERAGE_TYPES = FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].lean);
const HASH_ID_RE = /^h-[a-f0-9]{16,32}$/;
const TMP_ID_RE = /^tmp-[A-Za-z0-9_-]+$/;
const FORMAL_ID_PATTERN = "(?:h-[a-f0-9]{16,32}|tmp-[A-Za-z0-9_-]+)";
const aliases = new Map(FORMAL_TYPES.flatMap((kind) => FORMAL_KIND_POLICIES[kind].aliases.map((alias) => [alias.toLowerCase(), kind])));
const FORMAL_TYPE_PATTERN = [...aliases.keys()].sort((a, b) => b.length - a.length).map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
function normalizeFormalKind(alias) {
  return aliases.get(alias.toLowerCase());
}
function formalDictionary(language) {
  return Object.fromEntries(FORMAL_TYPES.map((kind) => [kind, FORMAL_KIND_POLICIES[kind][language]]));
}
function isPedagogicalKind(kind) {
  return FORMAL_KIND_POLICIES[kind]?.dependency === "pedagogical";
}
function isMainlineKind(kind) {
  return FORMAL_KIND_POLICIES[kind]?.dependency === "mainline";
}
function stripSolutionAssociation(text2) {
  return text2.replace(
    new RegExp(`\\s*[（(](?:对应|for)\\s+@${FORMAL_ID_PATTERN}(?:\\s*[；;]\\s*([^）)]*))?[）)]`, "i"),
    (_match, title) => title ? `（${title.trim()}）` : ""
  );
}
function exerciseSupportKind(line) {
  const text2 = line.trim().replace(/^>\s*/, "").replace(/^(?:\*\*|__)(.*?)(?:\*\*|__)/, "$1").trim();
  if (/^(?:提示|Hint)\s*(?:[：:.]|$)/i.test(text2)) return "hint";
  if (/^(?:解答|答案|Solution|Answer)\s*(?:[：:.]|$)/i.test(text2)) return "solution";
  return void 0;
}
function solutionTarget(title) {
  const match2 = title.match(new RegExp(`^(?:对应|for)\\s+@(${FORMAL_ID_PATTERN})(?:\\s*[；;]\\s*(.*))?$`, "i"));
  return match2 ? { id: match2[1], title: (match2[2] || "").trim() } : void 0;
}
function collectExerciseContent(lines, startLine, marker2, parseMarker) {
  let end = startLine;
  const bodyFence = new MarkdownFence();
  for (let i = startLine + 1; i < lines.length; i++) {
    if (!bodyFence.consume(lines[i]) && (/^#{1,6}\s+/.test(lines[i]) || parseMarker(lines[i]) || /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(lines[i]))) break;
    end = i;
  }
  while (end > startLine && !lines[end].trim()) end--;
  const support = [];
  const supportFence = new MarkdownFence();
  if (marker2.type === "exercise") for (let i = startLine + 1; i <= end; i++) {
    const kind = !supportFence.consume(lines[i]) && exerciseSupportKind(lines[i]);
    if (!kind) continue;
    if (support.length) support[support.length - 1].endLine = i - 1;
    support.push({ kind, startLine: i, endLine: end });
  }
  let promptEnd = support.length ? support[0].startLine - 1 : end;
  while (promptEnd > startLine && !lines[promptEnd].trim()) promptEnd--;
  const contentLines = lines.slice(startLine, promptEnd + 1);
  contentLines[0] = contentLines[0].replace(marker2.markerText, marker2.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, ""));
  return { contentLines, endLine: promptEnd, support, bodyEndLine: end };
}
function connectExerciseSolutions(definitions, labels) {
  const issues = [];
  for (const definition of definitions) {
    if (definition.type !== "solution" || !definition.id) continue;
    const targetId = definition.label.solutionOf;
    const target = targetId && labels[targetId];
    if (!target || target.type !== "exercise") {
      issues.push({
        severity: "error",
        code: "solution-target-invalid",
        file: definition.file,
        line: definition.line,
        message: targetId ? `Solution target @${targetId} must resolve to an exercise.` : "A solution needs an explicit target: 解答 #tmp-s（对应 @tmp-e） / Solution #tmp-s (for @tmp-e)."
      });
      continue;
    }
    if (target.bookKey !== definition.label.bookKey) {
      issues.push({
        severity: "error",
        code: "solution-target-cross-book",
        file: definition.file,
        line: definition.line,
        message: "An exercise and its solution must belong to the same book."
      });
      continue;
    }
    definition.label.number = target.number;
    definition.label.solutionExerciseNumber = target.unitLabel && target.number !== void 0 ? `${target.unitLabel}.${target.number}` : "";
    definition.label.solutionExerciseTitle = target.title;
    (target.solutions ||= []).push(definition.id);
  }
  for (const label of Object.values(labels)) if (label.solutions) label.solutions.sort();
  return issues;
}
function associatedProofContent(label, labels) {
  return JSON.stringify({
    question: label.solutionOf ? { id: label.solutionOf, content: labels[label.solutionOf]?.content || "" } : void 0,
    local: label.proofContent || "",
    support: label.supportContent || "",
    solutions: (label.solutions || []).map((id) => ({ id, content: labels[id]?.proofContent || "", target: labels[id]?.solutionOf || "" }))
  });
}
function isPageLabelType(type) {
  return typeof type === "string" && ["chapter", "appendix", "intro", "summary", "front-matter", "back-matter", "continued"].includes(type);
}
function isManuscriptMatterKind(kind) {
  return kind === "front-matter" || kind === "back-matter" || kind === "continued";
}
function unnumberedPageKind(filePath) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const basename = parts.pop() || "";
  if (!/\.md$/i.test(basename)) return;
  if (/^(?:\d+[-_\s]+)?to-be-continued\.md$/i.test(basename)) return "continued";
  const directory = [...parts].reverse().find((part) => /^(?:front|back)-matter$/i.test(part));
  if (directory) return directory.toLowerCase();
  if (/^(?:00[-_\s]?)?(?:intro|introduction)\.md$/i.test(basename)) return "intro";
  if (/^summary\.md$/i.test(basename)) return "summary";
}
function compareNumber(a, b, missing) {
  const left = Number.isFinite(a) ? a : missing;
  const right = Number.isFinite(b) ? b : missing;
  return left === right ? 0 : left - right;
}
function legacyPageOrder(page, context) {
  if (context === "reader") return page.order;
  if (page.kind === "intro") return -1e5;
  if (page.kind === "summary") return 9e4;
  if (page.kind === "appendix") return page.unitOrder ?? 1e5;
  return page.unitOrder ?? page.order;
}
function sortManuscriptPages(pages, context = "reader") {
  const missing = context === "reader" ? 0 : Number.MAX_SAFE_INTEGER;
  const compareLegacy = (a, b) => context === "workspace" ? a.filePath.localeCompare(b.filePath) : compareNumber(a.bookOrder, b.bookOrder, missing) || compareNumber(a.volumeOrder, b.volumeOrder, missing) || compareNumber(legacyPageOrder(a, context), legacyPageOrder(b, context), missing) || a.filePath.localeCompare(b.filePath);
  let ordered = [...pages].sort(compareLegacy);
  const scopes = /* @__PURE__ */ new Map();
  for (const page of ordered) {
    if (!isManuscriptMatterKind(page.kind)) continue;
    const key = JSON.stringify([page.bookKey, page.volumeKey]);
    if (!scopes.has(key)) scopes.set(key, []);
    scopes.get(key).push(page);
  }
  const groups = [...scopes.values()].sort((a, b) => Number(a[0].volumeKey === void 0) - Number(b[0].volumeKey === void 0));
  for (const matter of groups) {
    const scope = matter[0];
    const withinScope = (page) => page.bookKey === scope.bookKey && (scope.volumeKey === void 0 || page.volumeKey === scope.volumeKey);
    const group = new Set(matter);
    const remaining = ordered.filter((page) => !group.has(page));
    const first = remaining.findIndex(withinScope);
    let last = -1;
    for (let index = 0; index < remaining.length; index++) if (withinScope(remaining[index])) last = index;
    const rank = (page) => page.kind === "front-matter" ? 0 : page.kind === "back-matter" ? 1 : 2;
    const sortedMatter = [...matter].sort((a, b) => rank(a) - rank(b) || compareNumber(a.order, b.order, Number.MAX_SAFE_INTEGER) || a.filePath.localeCompare(b.filePath));
    if (first < 0) {
      const next = remaining.findIndex((page) => compareLegacy(scope, page) < 0);
      remaining.splice(next < 0 ? remaining.length : next, 0, ...sortedMatter);
      ordered = remaining;
      continue;
    }
    const front = sortedMatter.filter((page) => page.kind === "front-matter");
    const back = sortedMatter.filter((page) => page.kind !== "front-matter");
    ordered = [...remaining.slice(0, first), ...front, ...remaining.slice(first, last + 1), ...back, ...remaining.slice(last + 1)];
  }
  return ordered;
}
const GLOSSARY_NAME_RE = /(?:^|[^a-z])(?:glossary|terminology)(?:$|[^a-z])|术语/i;
const SUMMARY_NAME_RE = /(?:^|[-_])summary(?:$|[-_])|总结|小结/i;
const GENERIC_HEADING_RE = /^(?:附录\s*[A-Z0-9]*\s*[:：-]?\s*)?(?:概念|术语|定义|符号|记号|约定|目录|索引|说明|范围|总览|概览|引言|导言|参考文献|references?|introduction|overview|scope|notes?)$/i;
const APPENDIX_PREFIX_RE = /^(?:appendix(?=$|[\s_:：.、–—-])|附录)[\s_:：.、–—-]*/i;
const CONCEPT_TITLE_RE = /^(?:(?:core|key|basic|fundamental|main|common|project|mathematical)\s+)*(?:concepts?|definitions?)(?:\s+(?:index|table|list|overview|summary|reference))?$|^(?:(?:核心|基本|基础|关键|主要|常用|本书|全书|全卷|项目)\s*)*(?:概念|定义)(?:表|总表|一览表?|汇总|索引|总览|概览|速查表?|说明|清单)?$/i;
const NOTATION_TITLE_RE = /^(?:(?:core|key|basic|fundamental|main|common|project|mathematical)\s+)*(?:symbols?|notations?|conventions?)(?:\s+(?:index|table|list|overview|summary|reference|conventions))?$|^(?:table|list|index)\s+of\s+(?:symbols?|notation|conventions?)$|^(?:(?:核心|基本|基础|关键|主要|常用|本书|全书|全卷|项目)\s*)*(?:符号|记号|约定|符号约定|记号约定)(?:表|总表|一览表?|汇总|索引|总览|概览|速查表?|说明|清单)?$/i;
function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}
function fileStem(filePath) {
  const basename = normalizePath(filePath).split("/").pop() || "";
  return basename.replace(/\.md$/i, "");
}
function normalizeTerm(value) {
  return String(value || "").replace(/#[-A-Za-z0-9_]+\b/g, "").replace(/\{#[^}]+\}/g, "").replace(/[`*_~]/g, "").replace(/^\s*(?:\d+(?:\.\d+)*|[A-Z])\s*[.、:：-]\s*/, "").replace(/^\s*(?:定义|Definition)\s*[（(]([^）)]+)[）)]\s*[:：]?\s*$/i, "$1").replace(/\s+/g, " ").trim();
}
function unfencedLines(content) {
  let fence2;
  return String(content || "").split(/\r?\n/).map((line) => {
    const match2 = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence2) {
      if (match2 && match2[1][0] === fence2.marker && match2[1].length >= fence2.length && !match2[2].trim()) fence2 = void 0;
      return "";
    }
    if (match2) {
      fence2 = { marker: match2[1][0], length: match2[1].length };
      return "";
    }
    return line;
  });
}
function parseHeadings(content) {
  const headings = [];
  unfencedLines(content).forEach((line, index) => {
    const match2 = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!match2) return;
    const title = normalizeTerm(match2[2].replace(/\s+#+\s*$/, ""));
    if (title) headings.push({ level: match2[1].length, line: index + 1, title });
  });
  return headings;
}
function knowledgeRoles(value) {
  const name = normalizeTerm(value.replace(/_/g, " "));
  const appendix = APPENDIX_PREFIX_RE.test(name);
  const descriptor = name.replace(APPENDIX_PREFIX_RE, "").replace(/[-_:：.–—]+/g, " ").replace(/^\d+\s+/, "").trim();
  const candidates = appendix ? [descriptor, descriptor.replace(/^[^\s、]+[\s、]+/, "")] : [descriptor];
  const roles = { concept: false, glossary: false, notation: false };
  for (const candidate of candidates) {
    const glossary = GLOSSARY_NAME_RE.test(candidate);
    const parts = candidate.split(/\s+(?:and|with)\s+|[&/+,、与和及暨]/i).map((part) => part.trim()).filter(Boolean);
    const partRoles = parts.map((part) => ({ concept: CONCEPT_TITLE_RE.test(part) || GLOSSARY_NAME_RE.test(part), notation: NOTATION_TITLE_RE.test(part) }));
    const dedicated = partRoles.length > 0 && partRoles.every((part) => part.concept || part.notation);
    roles.glossary ||= glossary;
    roles.concept ||= glossary || dedicated && partRoles.some((part) => part.concept);
    roles.notation ||= dedicated && partRoles.some((part) => part.notation);
  }
  return roles;
}
function sourceKind(document, headings) {
  if (isManuscriptMatterKind(unnumberedPageKind(document.filePath))) return;
  const stem = fileStem(document.filePath);
  const topTitle = headings.length > 0 ? headings.filter((heading2) => heading2.level === Math.min(...headings.map((item) => item.level)))[0]?.title || "" : "";
  const appendix = APPENDIX_PREFIX_RE.test(stem) || APPENDIX_PREFIX_RE.test(topTitle) || /(?:^|\/)附录/.test(normalizePath(document.filePath));
  const names = [knowledgeRoles(stem), knowledgeRoles(topTitle)];
  const concept = names.some((name) => name.concept);
  const glossary = names.some((name) => name.glossary);
  const notation = names.some((name) => name.notation);
  const summary = SUMMARY_NAME_RE.test(stem) || SUMMARY_NAME_RE.test(topTitle);
  const kinds = [];
  const historicalGlossary = /glossary|术语/i.test(`${stem} ${topTitle}`) || !appendix && (glossary || /概念表|核心概念/.test(`${stem} ${topTitle}`));
  if (concept) kinds.push(historicalGlossary ? "glossary" : "concept-appendix");
  if (notation) kinds.push("notation-appendix");
  if (summary) kinds.push("summary-page");
  if (!kinds.length) return void 0;
  if (summary && !appendix && !historicalGlossary) kinds.unshift(...kinds.splice(kinds.indexOf("summary-page"), 1));
  return { kind: kinds[0], kinds, filePath: normalizePath(document.filePath), title: topTitle || stem, confidence: appendix && (concept || notation) ? "high" : "medium" };
}
function conceptDocument(document) {
  const lines = unfencedLines(document.content);
  const headings = parseHeadings(document.content);
  const sections = [];
  headings.forEach((heading2, index) => {
    while (sections.length && sections[sections.length - 1].level >= heading2.level) sections.pop();
    const roles = knowledgeRoles(heading2.title);
    const include = roles.concept || !roles.notation && (sections[sections.length - 1]?.include ?? true);
    sections.push({ level: heading2.level, include });
    if (!include) lines.fill("", heading2.line - 1, headings[index + 1] ? headings[index + 1].line - 1 : lines.length);
  });
  return { ...document, content: lines.join("\n") };
}
function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return [];
  const body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let escaped2 = false;
  for (const char of body) {
    if (escaped2) {
      current += char;
      escaped2 = false;
    } else if (char === "\\") {
      current += char;
      escaped2 = true;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}
function isTableDivider(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}
function isTermColumn(value) {
  return /^(?:术语|概念|名称|名词|term|concept|name)$/i.test(normalizeTerm(value));
}
function isDefinitionColumn(value) {
  return /^(?:定义|说明|释义|描述|definition|meaning|description|note)$/i.test(normalizeTerm(value));
}
function candidateContent(lines, heading2, nextHeading) {
  const end = nextHeading ? nextHeading.line - 1 : lines.length;
  const content = lines.slice(heading2.line, end).filter((line) => !/^\s{0,3}#{1,6}\s+/.test(line)).join("\n").trim();
  return content;
}
function headingDefinitions(document, source) {
  const lines = String(document.content || "").split(/\r?\n/);
  const headings = parseHeadings(document.content);
  if (headings.length < 2) return [];
  const pageLevel = Math.min(...headings.map((heading2) => heading2.level));
  const entryHeadings = headings.filter((heading2) => {
    const roles = knowledgeRoles(heading2.title);
    return heading2.level > pageLevel && !GENERIC_HEADING_RE.test(heading2.title) && !roles.concept && !roles.notation;
  });
  const itemLevel = Math.max(...entryHeadings.map((heading2) => heading2.level));
  if (!Number.isFinite(itemLevel)) return [];
  return entryHeadings.filter((heading2) => heading2.level === itemLevel).flatMap((heading2) => {
    const title = normalizeTerm(heading2.title);
    if (!title || GENERIC_HEADING_RE.test(title)) return [];
    const nextHeading = headings.find((candidate) => candidate.line > heading2.line && candidate.level <= heading2.level);
    const content = candidateContent(lines, heading2, nextHeading);
    if (content.replace(/\s+/g, "").length < 16) return [];
    return [{
      title,
      filePath: source.filePath,
      line: heading2.line,
      content,
      origin: source.kind === "glossary" ? "glossary" : "concept-appendix"
    }];
  });
}
function tableDefinitions(document, source) {
  const lines = unfencedLines(document.content);
  const definitions = [];
  for (let index = 0; index < lines.length - 2; index++) {
    const headers = tableCells(lines[index]);
    const divider = tableCells(lines[index + 1]);
    if (/^(?: {4}|\t)/.test(lines[index]) || !headers.length || headers.length !== divider.length || !isTableDivider(divider)) continue;
    const termIndex = headers.findIndex(isTermColumn);
    const definitionIndex = headers.findIndex(isDefinitionColumn);
    if (termIndex < 0 || definitionIndex < 0 || termIndex === definitionIndex) continue;
    for (let row = index + 2; row < lines.length; row++) {
      const cells = tableCells(lines[row]);
      if (cells.length !== headers.length) break;
      const title = normalizeTerm(cells[termIndex]);
      const content = cells[definitionIndex]?.trim() || "";
      if (!title || !content || isTableDivider(cells)) continue;
      definitions.push({
        title,
        filePath: source.filePath,
        line: row + 1,
        content,
        origin: source.kind === "glossary" ? "glossary" : "concept-appendix"
      });
    }
    index++;
  }
  return definitions;
}
function definitionKey(definition) {
  return `${normalizePath(definition.filePath)}:${normalizeTerm(definition.title).toLocaleLowerCase()}`;
}
function uniqueDefinitions(definitions, existing = []) {
  const existingKeys = new Set(existing.map((definition) => definitionKey({ filePath: definition.file || "", title: definition.title || "" })));
  const seen = /* @__PURE__ */ new Set();
  return definitions.filter((definition) => {
    const key = definitionKey(definition);
    if (!definition.title || existingKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function analyzeProjectKnowledge(documents, existingDefinitions = []) {
  const sourceDocuments = documents.map((document) => ({ document, headings: parseHeadings(document.content) })).map(({ document, headings }) => ({ document, source: sourceKind(document, headings) })).filter((item) => !!item.source).sort((left, right) => left.source.filePath.localeCompare(right.source.filePath));
  const rawDefinitions = sourceDocuments.flatMap(({ document, source }) => {
    const completed = { ...source };
    if (!(completed.kinds || [completed.kind]).some((kind) => kind === "concept-appendix" || kind === "glossary")) return [];
    const concepts = conceptDocument(document);
    return [...tableDefinitions(concepts, completed), ...headingDefinitions(concepts, completed)];
  });
  const definitions = uniqueDefinitions(rawDefinitions, existingDefinitions);
  const definitionCountBySource = /* @__PURE__ */ new Map();
  definitions.forEach((definition) => definitionCountBySource.set(definition.filePath, (definitionCountBySource.get(definition.filePath) || 0) + 1));
  const sources = sourceDocuments.map(({ source }) => ({
    ...source,
    extractedDefinitions: definitionCountBySource.get(source.filePath) || 0
  }));
  const summary = {
    conceptSources: sources.filter((source) => (source.kinds || [source.kind]).some((kind) => kind === "concept-appendix" || kind === "glossary")).length,
    notationSources: sources.filter((source) => (source.kinds || [source.kind]).includes("notation-appendix")).length,
    summaryPages: sources.filter((source) => (source.kinds || [source.kind]).includes("summary-page")).length,
    extractedDefinitions: definitions.length
  };
  return {
    project: { schemaVersion: 1, generatedBy: "math-workspace", sources, summary },
    definitions
  };
}
const SYMBOL_PLACEHOLDER_RE = /\$\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const SYMBOL_SAMPLE_VALUES = {
  operator: "T",
  ellipticOperator: "D",
  parameter: "\\lambda",
  param: "\\lambda",
  time: "t",
  index: "i",
  base: "U",
  object: "E",
  space: "X",
  radius: "R",
  mesh: "h",
  left: "x",
  right: "y"
};
const STRUCTURED_NUMBERED_TYPES = /* @__PURE__ */ new Set(["equation", "figure", "table"]);
const DEFAULT_CONFIG = {
  language: "zh",
  dictionary: {
    zh: formalDictionary("zh"),
    en: formalDictionary("en")
  },
  ui: {
    zh: {
      back: "返回",
      toc: "目录",
      emptyToc: "暂无目录数据",
      units: "章节",
      chapter: "第 {number} 章",
      appendix: "附录 {label}",
      intro: "导读",
      summary: "小结",
      introBadge: "导",
      summaryBadge: "结",
      unvolumed: "未分卷",
      volume: "第 {number} 卷",
      book: "第 {number} 本",
      workspace: "工作区"
    },
    en: {
      back: "Back",
      toc: "Contents",
      emptyToc: "No outline",
      units: "Sections",
      chapter: "Chapter {number}",
      appendix: "Appendix {label}",
      intro: "Intro",
      summary: "Summary",
      introBadge: "I",
      summaryBadge: "S",
      unvolumed: "Unvolumed",
      volume: "Volume {number}",
      book: "Book {number}",
      workspace: "Workspace"
    }
  },
  scan: {
    exclude: [
      ".git/**",
      ".math-workspace/**",
      "node_modules/**",
      "out/**",
      "dist/**"
    ]
  },
  lookup: {
    bookDependencies: {}
  },
  lean: {
    projects: [],
    coverageTypes: DEFAULT_LEAN_COVERAGE_TYPES
  },
  render: {
    pageHeadingStyle: "label-title"
  },
  metadata: {},
  pdf: {
    pdfEngine: "xelatex",
    paper: "a4",
    margin: "2.5cm",
    toc: true,
    tocDepth: 2,
    lang: "",
    tocTitle: "",
    title: "",
    subtitle: "",
    author: "",
    authorNative: "",
    authorAliases: [],
    orcid: "",
    repository: "",
    license: "",
    licenseUrl: "",
    preferredCitation: "",
    date: "",
    releaseVersion: "",
    releaseTag: "",
    releaseCommit: "",
    doi: "",
    showVersionOnCover: false,
    metadataPage: false,
    documentClass: "",
    titlePage: false,
    coverStyle: "simple",
    titleSize: "32pt",
    subtitleSize: "18pt",
    authorSize: "12pt",
    dateSize: "12pt",
    tocPageBreak: true,
    frontMatter: [],
    variables: []
  },
  debug: {
    markerTraceIds: []
  }
};
function toPosix(filePath) {
  return filePath.split(path__namespace.sep).join("/");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function unique$1(values) {
  return [...new Set(values.filter(Boolean))];
}
function normalizePdfFrontMatter(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    source: typeof item.source === "string" ? item.source : "",
    content: typeof item.content === "string" ? item.content : "",
    toc: item.toc === true,
    pageBreakAfter: item.pageBreakAfter === false ? false : true
  })).filter((item) => item.title || item.source || item.content);
}
function mergeConfig(config2) {
  const existing = config2 && typeof config2 === "object" ? config2 : {};
  const { preview: _legacyPreview, debug: rawDebug, ...baseConfig } = existing;
  const { previewLog: _legacyPreviewLog, ...debugConfig } = rawDebug && typeof rawDebug === "object" ? rawDebug : {};
  return {
    ...baseConfig,
    language: existing.language === "en" ? "en" : "zh",
    dictionary: {
      zh: { ...DEFAULT_CONFIG.dictionary.zh, ...existing.dictionary?.zh || {} },
      en: { ...DEFAULT_CONFIG.dictionary.en, ...existing.dictionary?.en || {} }
    },
    ui: {
      zh: { ...DEFAULT_CONFIG.ui.zh, ...existing.ui?.zh || {} },
      en: { ...DEFAULT_CONFIG.ui.en, ...existing.ui?.en || {} }
    },
    scan: {
      ...DEFAULT_CONFIG.scan,
      ...existing.scan || {},
      exclude: unique$1([
        ...DEFAULT_CONFIG.scan.exclude,
        ...Array.isArray(existing.scan?.exclude) ? existing.scan.exclude.filter((item) => typeof item === "string") : []
      ])
    },
    lookup: {
      ...DEFAULT_CONFIG.lookup,
      ...existing.lookup || {},
      bookDependencies: existing.lookup?.bookDependencies && typeof existing.lookup.bookDependencies === "object" ? existing.lookup.bookDependencies : {}
    },
    lean: {
      ...DEFAULT_CONFIG.lean,
      ...existing.lean || {},
      projects: (Array.isArray(existing.lean?.projects) ? existing.lean.projects : []).filter((project) => project && typeof project === "object").map((project) => ({
        ...project,
        key: typeof project.key === "string" ? project.key : "",
        root: typeof project.root === "string" ? project.root : "",
        sourceRoots: unique$1((Array.isArray(project.sourceRoots) ? project.sourceRoots : ["."]).filter((item) => typeof item === "string")),
        target: typeof project.target === "string" ? project.target : "",
        anchorPrefix: typeof project.anchorPrefix === "string" && project.anchorPrefix.trim() ? project.anchorPrefix.trim() : "Math Workspace anchor:"
      })),
      coverageTypes: unique$1((Array.isArray(existing.lean?.coverageTypes) ? existing.lean.coverageTypes : DEFAULT_CONFIG.lean.coverageTypes).filter((item) => typeof item === "string"))
    },
    render: {
      ...DEFAULT_CONFIG.render,
      ...existing.render || {},
      pageHeadingStyle: ["title", "number-title", "label-title"].includes(existing.render?.pageHeadingStyle) ? existing.render.pageHeadingStyle : DEFAULT_CONFIG.render.pageHeadingStyle
    },
    pdf: {
      ...DEFAULT_CONFIG.pdf,
      ...existing.pdf || {},
      pdfEngine: typeof existing.pdf?.pdfEngine === "string" && existing.pdf.pdfEngine ? existing.pdf.pdfEngine : DEFAULT_CONFIG.pdf.pdfEngine,
      paper: typeof existing.pdf?.paper === "string" && existing.pdf.paper ? existing.pdf.paper : DEFAULT_CONFIG.pdf.paper,
      margin: typeof existing.pdf?.margin === "string" && existing.pdf.margin ? existing.pdf.margin : DEFAULT_CONFIG.pdf.margin,
      toc: existing.pdf?.toc === false ? false : DEFAULT_CONFIG.pdf.toc,
      tocDepth: Number.isFinite(Number(existing.pdf?.tocDepth)) && Number(existing.pdf.tocDepth) >= 1 ? Math.floor(Number(existing.pdf.tocDepth)) : DEFAULT_CONFIG.pdf.tocDepth,
      lang: typeof existing.pdf?.lang === "string" ? existing.pdf.lang : DEFAULT_CONFIG.pdf.lang,
      tocTitle: typeof existing.pdf?.tocTitle === "string" ? existing.pdf.tocTitle : DEFAULT_CONFIG.pdf.tocTitle,
      title: typeof existing.pdf?.title === "string" ? existing.pdf.title : DEFAULT_CONFIG.pdf.title,
      subtitle: typeof existing.pdf?.subtitle === "string" ? existing.pdf.subtitle : DEFAULT_CONFIG.pdf.subtitle,
      author: typeof existing.pdf?.author === "string" ? existing.pdf.author : DEFAULT_CONFIG.pdf.author,
      authorNative: typeof existing.pdf?.authorNative === "string" ? existing.pdf.authorNative : DEFAULT_CONFIG.pdf.authorNative,
      authorAliases: unique$1(Array.isArray(existing.pdf?.authorAliases) ? existing.pdf.authorAliases.filter((item) => typeof item === "string") : []),
      orcid: typeof existing.pdf?.orcid === "string" ? existing.pdf.orcid : DEFAULT_CONFIG.pdf.orcid,
      repository: typeof existing.pdf?.repository === "string" ? existing.pdf.repository : DEFAULT_CONFIG.pdf.repository,
      license: typeof existing.pdf?.license === "string" ? existing.pdf.license : DEFAULT_CONFIG.pdf.license,
      licenseUrl: typeof existing.pdf?.licenseUrl === "string" ? existing.pdf.licenseUrl : DEFAULT_CONFIG.pdf.licenseUrl,
      preferredCitation: typeof existing.pdf?.preferredCitation === "string" ? existing.pdf.preferredCitation : DEFAULT_CONFIG.pdf.preferredCitation,
      date: typeof existing.pdf?.date === "string" ? existing.pdf.date : DEFAULT_CONFIG.pdf.date,
      releaseVersion: typeof existing.pdf?.releaseVersion === "string" ? existing.pdf.releaseVersion : DEFAULT_CONFIG.pdf.releaseVersion,
      releaseTag: typeof existing.pdf?.releaseTag === "string" ? existing.pdf.releaseTag : DEFAULT_CONFIG.pdf.releaseTag,
      releaseCommit: typeof existing.pdf?.releaseCommit === "string" ? existing.pdf.releaseCommit : DEFAULT_CONFIG.pdf.releaseCommit,
      doi: typeof existing.pdf?.doi === "string" ? existing.pdf.doi : DEFAULT_CONFIG.pdf.doi,
      showVersionOnCover: existing.pdf?.showVersionOnCover === true,
      metadataPage: existing.pdf?.metadataPage === true,
      documentClass: typeof existing.pdf?.documentClass === "string" ? existing.pdf.documentClass : DEFAULT_CONFIG.pdf.documentClass,
      titlePage: existing.pdf?.titlePage === true,
      coverStyle: typeof existing.pdf?.coverStyle === "string" && existing.pdf.coverStyle ? existing.pdf.coverStyle : DEFAULT_CONFIG.pdf.coverStyle,
      titleSize: typeof existing.pdf?.titleSize === "string" && existing.pdf.titleSize ? existing.pdf.titleSize : DEFAULT_CONFIG.pdf.titleSize,
      subtitleSize: typeof existing.pdf?.subtitleSize === "string" && existing.pdf.subtitleSize ? existing.pdf.subtitleSize : DEFAULT_CONFIG.pdf.subtitleSize,
      authorSize: typeof existing.pdf?.authorSize === "string" && existing.pdf.authorSize ? existing.pdf.authorSize : DEFAULT_CONFIG.pdf.authorSize,
      dateSize: typeof existing.pdf?.dateSize === "string" && existing.pdf.dateSize ? existing.pdf.dateSize : DEFAULT_CONFIG.pdf.dateSize,
      tocPageBreak: existing.pdf?.tocPageBreak === false ? false : DEFAULT_CONFIG.pdf.tocPageBreak,
      frontMatter: normalizePdfFrontMatter(existing.pdf?.frontMatter),
      variables: unique$1(Array.isArray(existing.pdf?.variables) ? existing.pdf.variables.filter((item) => typeof item === "string") : [])
    },
    debug: {
      ...DEFAULT_CONFIG.debug,
      ...debugConfig,
      markerTraceIds: unique$1(Array.isArray(existing.debug?.markerTraceIds) ? existing.debug.markerTraceIds.filter((item) => typeof item === "string") : [])
    }
  };
}
function normalizeScanPath(value) {
  return toPosix(String(value || "")).replace(/^\/+/, "").replace(/\/+$/, "");
}
function globPatternToRegExp(pattern) {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        source += ".*";
        i++;
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += escapeRegExp(char);
  }
  return new RegExp(`^${source}$`);
}
function scanPatternMatches(filePath, pattern) {
  const file = normalizeScanPath(filePath);
  const normalizedPattern = normalizeScanPath(pattern);
  if (!file || !normalizedPattern) return false;
  if (!/[*?]/.test(normalizedPattern)) {
    if (!normalizedPattern.includes("/")) {
      return file.split("/").includes(normalizedPattern);
    }
    return file === normalizedPattern || file.startsWith(`${normalizedPattern}/`);
  }
  if (normalizedPattern.endsWith("/**")) {
    const base2 = normalizeScanPath(normalizedPattern.slice(0, -3));
    if (file === base2 || file.startsWith(`${base2}/`)) return true;
  }
  const direct = globPatternToRegExp(normalizedPattern);
  if (direct.test(file)) return true;
  if (!normalizedPattern.startsWith("**/") && !normalizedPattern.includes("/")) {
    return file.split("/").some((segment) => direct.test(segment));
  }
  return false;
}
function pathPatternMatches(filePath, pattern) {
  return scanPatternMatches(filePath, pattern);
}
function scanExcludePatterns(config2) {
  const merged = mergeConfig(config2);
  return Array.isArray(merged.scan?.exclude) ? merged.scan.exclude : [];
}
function shouldExcludeScanPath(filePath, config2) {
  return scanExcludePatterns(config2).some((pattern) => scanPatternMatches(filePath, pattern));
}
function getLanguage(config2) {
  return config2 && config2.language === "en" ? "en" : "zh";
}
function formatTemplate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => values[key] || "");
}
function uiText(config2, key, values = {}) {
  const language = getLanguage(config2);
  const text2 = config2?.ui?.[language]?.[key] || DEFAULT_CONFIG.ui[language]?.[key] || DEFAULT_CONFIG.ui.zh[key] || "";
  return formatTemplate(text2, values);
}
function typeName(config2, type) {
  const language = getLanguage(config2);
  return config2?.dictionary?.[language]?.[type] || DEFAULT_CONFIG.dictionary[language]?.[type] || type;
}
function normalizeFormalPagePath(target, sourceFilePath = "") {
  let value = toPosix(String(target || "").trim()).replace(/^\/+/, "");
  if (!value) return "";
  if (/^\.\.?\//.test(value)) {
    const baseDir = sourceFilePath ? path__namespace.posix.dirname(toPosix(sourceFilePath)) : "";
    value = path__namespace.posix.join(baseDir, value);
  }
  return path__namespace.posix.normalize(value).replace(/^\.\/+/, "").replace(/^\/+/, "");
}
function formatPageReference(page, config2, mode = "default") {
  const title = page.title || page.filePath;
  let label = title;
  if (page.kind === "chapter" && page.chapter !== void 0) {
    label = uiText(config2, "chapter", { number: String(page.chapter) });
  } else if (page.kind === "appendix" && page.appendix) {
    label = uiText(config2, "appendix", { label: page.appendix });
  } else if (page.kind === "intro") {
    label = uiText(config2, "intro");
  } else if (page.kind === "summary") {
    label = uiText(config2, "summary");
  }
  if (mode === "title") return title;
  if (mode === "full") {
    if (!title || title === label) return label;
    const colon = getLanguage(config2) === "en" ? ": " : "：";
    return `${label}${colon}${title}`;
  }
  return label;
}
function pageHeadingStyle(config2) {
  const style = config2?.render?.pageHeadingStyle;
  return style === "title" || style === "number-title" || style === "label-title" ? style : "label-title";
}
function pageHeadingLabel(page, config2, style) {
  if (page.kind === "chapter") {
    const number = page.unitLabel || (page.chapter !== void 0 ? String(page.chapter) : "");
    if (!number) return "";
    return style === "number-title" ? number : uiText(config2, "chapter", { number });
  }
  if (page.kind === "appendix") {
    const label = page.unitLabel || page.appendix || "";
    if (!label) return "";
    return style === "number-title" ? label : uiText(config2, "appendix", { label });
  }
  return "";
}
function startsWithPageHeadingLabel(title, label) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const normalizedLabel = label.replace(/\s+/g, " ").trim();
  if (!normalizedTitle || !normalizedLabel) return false;
  if (normalizedTitle === normalizedLabel) return true;
  if (normalizedTitle.startsWith(normalizedLabel)) {
    const next2 = normalizedTitle.slice(normalizedLabel.length, normalizedLabel.length + 1);
    if (!next2 || /[\s:：,，.．、\-]/.test(next2)) return true;
  }
  const compactTitle = normalizedTitle.replace(/\s+/g, "");
  const compactLabel = normalizedLabel.replace(/\s+/g, "");
  if (!compactTitle || !compactLabel || !compactTitle.startsWith(compactLabel)) return false;
  const next = compactTitle.slice(compactLabel.length, compactLabel.length + 1);
  return !next || !/[A-Za-z0-9]/.test(next);
}
function formatPageHeadingPrefix(page, config2) {
  const style = pageHeadingStyle(config2);
  if (style === "title") return "";
  const label = pageHeadingLabel(page, config2, style);
  if (!label) return "";
  const title = page.title || "";
  if (startsWithPageHeadingLabel(title, label)) return "";
  return label;
}
function formatPageHeading(page, config2) {
  const title = page.title || page.filePath;
  const prefix = formatPageHeadingPrefix(page, config2);
  return prefix ? `${prefix} ${title}` : title;
}
function normalizeLatexSymbol(value) {
  return String(value || "").trim().replace(/^\$+|\$+$/g, "").replace(/\\left\s*/g, "").replace(/\\right\s*/g, "").replace(/\\operatorname\s*\{([^{}]+)\}/g, "\\$1").replace(/\\([A-Za-z]+)\s+\{([^{}]+)\}/g, "\\$1{$2}").replace(/\s+/g, "").replace(/([_^])([A-Za-z0-9\\])(?![A-Za-z0-9{])/g, "$1{$2}");
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function compileSymbolPattern(pattern) {
  const normalizedPattern = normalizeLatexSymbol(pattern);
  const captures = [];
  let regex2 = "^";
  let cursor = 0;
  let match2;
  SYMBOL_PLACEHOLDER_RE.lastIndex = 0;
  while (match2 = SYMBOL_PLACEHOLDER_RE.exec(normalizedPattern)) {
    regex2 += escapeRegex(normalizedPattern.slice(cursor, match2.index));
    captures.push(match2[1]);
    regex2 += "(.+?)";
    cursor = match2.index + match2[0].length;
  }
  regex2 += escapeRegex(normalizedPattern.slice(cursor));
  regex2 += "$";
  return { normalizedPattern, regex: regex2, captures };
}
function isEscapedMarkdownCharacter(value, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor--) slashes++;
  return slashes % 2 === 1;
}
function findInlineDollarEnd(value, start) {
  for (let cursor = start; cursor < value.length; cursor++) {
    if (value[cursor] === "$" && value[cursor + 1] !== "$" && !isEscapedMarkdownCharacter(value, cursor)) return cursor;
  }
  return -1;
}
function collectInlineLatex(value, formulas) {
  for (let cursor = 0; cursor < value.length; cursor++) {
    if (value[cursor] === "\\" && value[cursor + 1] === "(" && !isEscapedMarkdownCharacter(value, cursor)) {
      const end2 = value.indexOf("\\)", cursor + 2);
      if (end2 >= 0) {
        formulas.push({ latex: value.slice(cursor + 2, end2).trim(), display: false });
        cursor = end2 + 1;
      }
      continue;
    }
    if (value[cursor] !== "$" || value[cursor + 1] === "$" || isEscapedMarkdownCharacter(value, cursor)) continue;
    const end = findInlineDollarEnd(value, cursor + 1);
    if (end >= 0) {
      formulas.push({ latex: value.slice(cursor + 1, end).trim(), display: false });
      cursor = end;
    }
  }
}
function extractLatexFormulas(content) {
  const formulas = [];
  const codeFence = new MarkdownFence();
  let blockDelimiter = "";
  let blockBuffer = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    if (codeFence.consume(line)) continue;
    if (blockDelimiter) {
      const close2 = line.indexOf(blockDelimiter);
      if (close2 < 0) {
        blockBuffer.push(line);
        continue;
      }
      const delimiter22 = blockDelimiter;
      blockBuffer.push(line.slice(0, close2));
      formulas.push({ latex: blockBuffer.join("\n").trim(), display: true });
      blockDelimiter = "";
      blockBuffer = [];
      collectInlineLatex(line.slice(close2 + delimiter22.length), formulas);
      continue;
    }
    const blockStart = line.search(/(?:\$\$|\\\[)/);
    if (blockStart < 0) {
      collectInlineLatex(line, formulas);
      continue;
    }
    const delimiter2 = line.slice(blockStart, blockStart + 2);
    const closeDelimiter = delimiter2 === "$$" ? "$$" : "\\]";
    const close = line.indexOf(closeDelimiter, blockStart + 2);
    collectInlineLatex(line.slice(0, blockStart), formulas);
    if (close >= 0) {
      formulas.push({ latex: line.slice(blockStart + 2, close).trim(), display: true });
      collectInlineLatex(line.slice(close + 2), formulas);
      continue;
    }
    blockDelimiter = closeDelimiter;
    blockBuffer = [line.slice(blockStart + 2)];
  }
  return formulas.filter((formula) => formula.latex);
}
function makeUnanchoredSymbolRegex(symbol) {
  const source = String(symbol.regex || "").replace(/^\^/, "").replace(/\$$/, "");
  if (!source || source === "(.+?)") return void 0;
  try {
    return new RegExp(source);
  } catch (_err) {
    return void 0;
  }
}
function symbolMatchesLatex(symbol, latex) {
  const normalized = normalizeLatexSymbol(latex);
  if (!normalized) return false;
  const regex2 = makeUnanchoredSymbolRegex(symbol);
  if (regex2?.test(normalized)) return true;
  const pattern = normalizeLatexSymbol(symbol.pattern);
  if (pattern && !pattern.includes("${") && normalized.includes(pattern)) return true;
  const display = normalizeLatexSymbol(symbol.display);
  return Boolean(display && normalized.includes(display));
}
function findSymbolsInMarkdown(content, symbols) {
  const formulas = extractLatexFormulas(content);
  const matches = symbols.map((symbol, index) => ({
    index,
    symbol,
    formulaIndex: formulas.findIndex((formula) => symbolMatchesLatex(symbol, formula.latex))
  })).filter((match2) => match2.formulaIndex >= 0);
  return matches.sort((left, right) => left.formulaIndex - right.formulaIndex || `${left.symbol.sourceFilePath || ""}:${left.symbol.sourceLine || 0}`.localeCompare(`${right.symbol.sourceFilePath || ""}:${right.symbol.sourceLine || 0}`) || left.symbol.pattern.localeCompare(right.symbol.pattern));
}
function hasBalancedSymbolDelimiters(value) {
  const pairs = { ")": "(", "]": "[" };
  const stack = [];
  for (const char of value) {
    if (char === "(" || char === "[") {
      stack.push(char);
      continue;
    }
    if (char === ")" || char === "]") {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0;
}
function parseSourceLocation(source) {
  if (!source) return {};
  const match2 = String(source).match(/^(.+?)(?::(\d+))?$/);
  if (!match2) return {};
  return {
    sourceFilePath: toPosix(match2[1]).replace(/^\/+/, ""),
    sourceLine: match2[2] ? Number(match2[2]) : void 0
  };
}
function symbolSampleValue(name) {
  return SYMBOL_SAMPLE_VALUES[name] || "x";
}
function makeSymbolDisplay(pattern) {
  return `$${pattern.replace(/\$\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_match, name) => symbolSampleValue(name))}$`;
}
function normalizeSymbolDocuments(documents) {
  return documents.map(
    (document) => typeof document === "string" ? { filePath: document, content: "" } : document
  );
}
function parseFormalSymbols(input, documents = []) {
  const issues = [];
  const rawSymbols = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray(input.symbols) ? input.symbols : [];
  if (input !== void 0 && input !== null && !Array.isArray(input) && !(typeof input === "object" && Array.isArray(input.symbols))) {
    issues.push({
      severity: "error",
      code: "invalid-symbols-file",
      file: ".math-workspace/symbols.json",
      message: ".math-workspace/symbols.json must be an array, or an object with a symbols array."
    });
    return { symbols: [], issues };
  }
  const normalizedDocuments = normalizeSymbolDocuments(documents);
  const fileSet = new Set(normalizedDocuments.map((document) => toPosix(document.filePath).replace(/^\/+/, "")));
  const lineCounts = new Map(normalizedDocuments.map((document) => [
    toPosix(document.filePath).replace(/^\/+/, ""),
    document.content ? document.content.split(/\r\n|\r|\n/).length : 0
  ]));
  const seen = /* @__PURE__ */ new Map();
  const symbols = [];
  rawSymbols.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push({
        severity: "error",
        code: "invalid-symbol-entry",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: "Symbol entry must be an object."
      });
      return;
    }
    const pattern = typeof item.pattern === "string" ? item.pattern.trim() : "";
    const meaning = typeof item.meaning === "string" ? item.meaning.trim() : "";
    const source = typeof item.source === "string" && item.source.trim() ? item.source.trim() : "";
    if (!pattern || !meaning || !source) {
      issues.push({
        severity: "error",
        code: "invalid-symbol-entry",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: "Symbol entry requires non-empty source, pattern, and meaning."
      });
      return;
    }
    const compiled = compileSymbolPattern(pattern);
    const display = typeof item.display === "string" && item.display.trim() ? item.display.trim() : makeSymbolDisplay(pattern);
    const scope = typeof item.scope === "string" && item.scope.trim() ? item.scope.trim() : "book";
    const parsedSource = parseSourceLocation(source);
    if (!parsedSource.sourceFilePath || parsedSource.sourceLine === void 0) {
      issues.push({
        severity: "error",
        code: "symbol-source-invalid",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} must use path.md:line format.`
      });
      return;
    }
    if (fileSet.size > 0 && !fileSet.has(parsedSource.sourceFilePath)) {
      issues.push({
        severity: "error",
        code: "symbol-source-missing",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} does not point to a known Markdown file.`
      });
      return;
    }
    const lineCount = lineCounts.get(parsedSource.sourceFilePath) || 0;
    if (lineCount > 0 && (parsedSource.sourceLine < 1 || parsedSource.sourceLine > lineCount)) {
      issues.push({
        severity: "error",
        code: "symbol-source-line-missing",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} points outside the source file.`
      });
      return;
    }
    if (!new RegExp(compiled.regex).test(normalizeLatexSymbol(display))) {
      issues.push({
        severity: "warn",
        code: "symbol-display-mismatch",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol display ${display} does not match pattern ${pattern}.`
      });
    }
    if (/^\$\{[A-Za-z][A-Za-z0-9_]*\}$/.test(compiled.normalizedPattern)) {
      issues.push({
        severity: "warn",
        code: "symbol-pattern-too-broad",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern ${pattern} is only a placeholder and may match unrelated formulas.`
      });
    }
    if (!hasBalancedSymbolDelimiters(compiled.normalizedPattern)) {
      issues.push({
        severity: "warn",
        code: "symbol-pattern-unbalanced-delimiter",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern ${pattern} has unbalanced parentheses or brackets and may match a surrounding formula instead of the notation itself.`
      });
    }
    const duplicateKey = `${scope}:${compiled.normalizedPattern}:${parsedSource.sourceFilePath}`;
    const previousIndex = seen.get(duplicateKey);
    if (previousIndex !== void 0) {
      issues.push({
        severity: "warn",
        code: "duplicate-symbol-pattern",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern duplicates entry ${previousIndex + 1} in the same scope and source file.`
      });
    }
    seen.set(duplicateKey, index);
    symbols.push({
      pattern,
      normalizedPattern: compiled.normalizedPattern,
      regex: compiled.regex,
      captures: compiled.captures,
      display,
      meaning,
      scope,
      source,
      ...parsedSource
    });
  });
  return { symbols, issues };
}
function normalizeDefinitionAliases(value) {
  if (!Array.isArray(value)) return [];
  return unique$1(value.filter((alias) => typeof alias === "string").map((alias) => alias.trim()).filter(Boolean));
}
function normalizeDefinitionContentForMatch(value) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}
function parseFormalDefinitions(input, documents = [], configInput = DEFAULT_CONFIG) {
  const issues = [];
  const rawDefinitions = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray(input.definitions) ? input.definitions : [];
  if (input !== void 0 && input !== null && !Array.isArray(input) && !(typeof input === "object" && Array.isArray(input.definitions))) {
    issues.push({
      severity: "error",
      code: "invalid-definitions-file",
      file: ".math-workspace/definitions.json",
      message: ".math-workspace/definitions.json must be an array, or an object with a definitions array."
    });
    return { definitions: [], issues };
  }
  const config2 = mergeConfig(configInput);
  const normalizedDocuments = normalizeSymbolDocuments(documents);
  const documentMap = new Map(normalizedDocuments.map((document) => [
    toPosix(document.filePath).replace(/^\/+/, ""),
    document.content || ""
  ]));
  const seen = /* @__PURE__ */ new Map();
  const definitions = [];
  rawDefinitions.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push({
        severity: "error",
        code: "invalid-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: "Definition entry must be an object."
      });
      return;
    }
    const title = typeof item.term === "string" && item.term.trim() ? item.term.trim() : typeof item.title === "string" && item.title.trim() ? item.title.trim() : "";
    const source = typeof item.source === "string" && item.source.trim() ? item.source.trim() : "";
    const aliases2 = normalizeDefinitionAliases(item.aliases).filter((alias) => alias !== title);
    if (!title || !source) {
      issues.push({
        severity: "error",
        code: "invalid-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: "Definition entry requires non-empty term/title and source."
      });
      return;
    }
    const parsedSource = parseSourceLocation(source);
    if (!parsedSource.sourceFilePath || parsedSource.sourceLine === void 0) {
      issues.push({
        severity: "error",
        code: "definition-source-invalid",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} must use path.md:line format.`
      });
      return;
    }
    const documentContent = documentMap.get(parsedSource.sourceFilePath);
    if (documentContent === void 0) {
      issues.push({
        severity: "error",
        code: "definition-source-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} does not point to a known Markdown file.`
      });
      return;
    }
    const lines = documentContent.split(/\r\n|\r|\n/);
    if (parsedSource.sourceLine < 1 || parsedSource.sourceLine > lines.length) {
      issues.push({
        severity: "error",
        code: "definition-source-line-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} points outside the source file.`
      });
      return;
    }
    const extracted = sourceLineRangeContent(lines, parsedSource.sourceLine);
    const explicitContent = typeof item.content === "string" && item.content.trim() ? item.content.trim() : "";
    if (!explicitContent) {
      issues.push({
        severity: "warn",
        code: "definition-content-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry ${title} should include AI-maintained content; falling back to source extraction.`
      });
    } else if (!normalizeDefinitionContentForMatch(documentContent).includes(normalizeDefinitionContentForMatch(explicitContent))) {
      issues.push({
        severity: "warn",
        code: "definition-content-stale",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry ${title} content is not found in its source file near ${source}; update content after editing the source.`
      });
    }
    const content = explicitContent || extracted.content;
    const duplicateKey = `${title}:${parsedSource.sourceFilePath}:${parsedSource.sourceLine}`;
    const previousIndex = seen.get(duplicateKey);
    if (previousIndex !== void 0) {
      issues.push({
        severity: "warn",
        code: "duplicate-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry duplicates entry ${previousIndex + 1}.`
      });
    }
    seen.set(duplicateKey, index);
    const book = inferBookInfo(parsedSource.sourceFilePath, config2);
    const volume = inferVolumeInfo(parsedSource.sourceFilePath, config2);
    const label = {
      type: "def",
      title,
      filePath: parsedSource.sourceFilePath,
      bookKey: book.key,
      bookTitle: book.title,
      bookOrder: book.order,
      content,
      startLine: extracted.startLine,
      endLine: extracted.endLine
    };
    if (volume) {
      label.volumeKey = volume.key;
      label.volumeTitle = volume.title;
      label.volumeOrder = volume.order;
    }
    definitions.push({
      type: "def",
      title,
      aliases: aliases2,
      file: parsedSource.sourceFilePath,
      line: parsedSource.sourceLine,
      label
    });
  });
  return { definitions, issues };
}
function stripIgnoredMarkdown(content) {
  const blank2 = (text2) => text2.replace(/[^\r\n]/g, " ");
  return maskFencedMarkdown(content).replace(/<!--[\s\S]*?-->/g, blank2).replace(/`[^`\n]*`/g, blank2);
}
function cleanMarkerTitle(title) {
  const trimmed = title.trim();
  const strong = trimmed.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1$/);
  return strong ? strong[2].trim() : trimmed;
}
function unwrapLeadingStrong(text2) {
  const strong = text2.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1([\s\S]*)$/);
  if (!strong) return void 0;
  return `${strong[2].trim()}${strong[3] || ""}`.trim();
}
function parseParenMarkerTitle(text2, requireSeparator) {
  const paren = text2.match(/^[（(]([^）)]+)[）)]\s*([：:]?)/);
  if (!paren) return "";
  if (requireSeparator && !paren[2]) return "";
  return cleanMarkerTitle(paren[1]);
}
function extractMarkerTitle(type, rest) {
  const trimmed = rest.trim();
  if (!trimmed) return "";
  const strongPrefix = unwrapLeadingStrong(trimmed);
  if (strongPrefix) {
    const strongTitle = parseParenMarkerTitle(strongPrefix, true);
    if (strongTitle) return strongTitle;
  }
  const parenTitle = parseParenMarkerTitle(trimmed, false);
  if (parenTitle) return parenTitle;
  if (type === "def") {
    const term = trimmed.match(/^([^：:\n，,。.;；]+)[：:]/);
    if (term) return term[1].trim();
  }
  return "";
}
function normalizeLeadingMarkerEmphasis(text2) {
  const trimmed = text2.trim().replace(/^(?:>\s*)+/, "").trim();
  return unwrapLeadingStrong(trimmed) || trimmed;
}
function parseFormalMarkerLine(line) {
  const heading2 = line.match(/^(#{1,6})\s+#([A-Za-z0-9_-]+)\s+(.+?)\s*$/);
  if (heading2) {
    return {
      type: "section",
      id: heading2[2],
      title: heading2[3].trim(),
      markerText: `#${heading2[2]}`,
      rest: heading2[3].trim(),
      level: heading2[1].length
    };
  }
  const text2 = normalizeLeadingMarkerEmphasis(line);
  const typePattern = FORMAL_TYPE_PATTERN;
  const typed = text2.match(new RegExp(`^(${typePattern})\\s*([\\s\\S]*)$`, "i"));
  if (!typed) return void 0;
  const type = normalizeFormalKind(typed[1]);
  if (!type) return void 0;
  if (type === "def") {
    const rest2 = typed[2] || "";
    if (!/^\s*[（(]/.test(rest2)) return void 0;
    const title = extractMarkerTitle(type, rest2);
    if (!title) return void 0;
    return {
      type,
      title,
      markerText: typed[1],
      rest: rest2
    };
  }
  const match2 = text2.match(new RegExp(`^(${typePattern})\\s+#([A-Za-z0-9_-]+)\\b\\s*([\\s\\S]*)$`, "i"));
  if (!match2) return void 0;
  const rest = match2[3] || "";
  const parsedTitle = extractMarkerTitle(type, rest);
  const solution = type === "solution" ? solutionTarget(parsedTitle) : void 0;
  return {
    type,
    id: match2[2],
    title: solution ? solution.title : parsedTitle,
    solutionOf: solution?.id,
    markerText: `${match2[1]} #${match2[2]}`,
    rest
  };
}
function parseVolumeOrder(value) {
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const roman = value.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return Number.MAX_SAFE_INTEGER;
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1e3 };
  let total = 0;
  let previous = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const current = values[roman[i]] || 0;
    total += current < previous ? -current : current;
    previous = Math.max(previous, current);
  }
  return total || Number.MAX_SAFE_INTEGER;
}
function inferBookInfo(filePath, config2) {
  const segment = filePath.split("/").slice(0, -1).find((part) => /^book[-_\s]?(?:\d+|[a-z0-9]+)(?:[-_\s].*)?$/i.test(part));
  if (!segment) {
    return { key: "__workspace__", title: uiText(config2, "workspace"), order: 0 };
  }
  const match2 = segment.match(/^book[-_\s]?(\d+|[ivxlcdm]+)?(?:[-_\s].*)?$/i);
  const order = match2 && match2[1] ? parseVolumeOrder(match2[1]) : Number.MAX_SAFE_INTEGER;
  const title = order === Number.MAX_SAFE_INTEGER ? segment.replace(/[-_]+/g, " ") : uiText(config2, "book", { number: String(order) });
  return { key: segment.toLowerCase(), title, order };
}
function inferVolumeInfo(filePath, config2) {
  const segment = filePath.split("/").slice(0, -1).find((part) => /^(?:vol|volume)[-_\s]?(?:\d+|[ivxlcdm]+)(?:[-_\s].*)?$/i.test(part));
  if (!segment) return void 0;
  const match2 = segment.match(/^(?:vol|volume)[-_\s]?(\d+|[ivxlcdm]+)(?:[-_\s].*)?$/i);
  const order = match2 ? parseVolumeOrder(match2[1]) : Number.MAX_SAFE_INTEGER;
  const title = order === Number.MAX_SAFE_INTEGER ? segment.replace(/[-_]+/g, " ") : uiText(config2, "volume", { number: String(order) });
  return { key: segment.toLowerCase(), title, order };
}
function getAlphaOrder(value) {
  return value.toUpperCase().split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}
function parseNumberingUnit(basename) {
  const chapterMatch = basename.match(/^(\d+)-.*\.md$/i);
  if (chapterMatch) {
    const chapter = parseInt(chapterMatch[1], 10);
    if (chapter === 0) return void 0;
    return {
      kind: "chapter",
      key: `chapter-${chapter}`,
      label: String(chapter),
      order: chapter,
      chapter
    };
  }
  const appendixMatch = basename.match(/^appendix[-_\s]?([a-z]+|\d+)(?:[-_\s].*)?\.md$/i);
  if (!appendixMatch) return void 0;
  const raw = appendixMatch[1];
  const label = /^\d+$/.test(raw) ? raw : raw.toUpperCase();
  const appendixOrder = /^\d+$/.test(raw) ? parseInt(raw, 10) : getAlphaOrder(raw);
  return {
    kind: "appendix",
    key: `appendix-${label.toLowerCase()}`,
    label,
    order: 1e5 + appendixOrder,
    appendix: label
  };
}
function parseMarkdownHeadingLine(line) {
  const match2 = line.match(/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)\s*$/);
  if (!match2) return void 0;
  let title = match2[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
  if (!title) return void 0;
  const idMatch = title.match(/^#([A-Za-z0-9_-]+)\b\s*(.*)$/);
  if (idMatch) {
    title = idMatch[2].trim();
    if (!title) return void 0;
    return {
      level: match2[1].length,
      id: idMatch[1],
      title
    };
  }
  return {
    level: match2[1].length,
    title
  };
}
function getPageTitleHeading(content, fallback) {
  const headings = [];
  const codeFence = new MarkdownFence();
  let lineNumber = 0;
  for (const line of String(content || "").split(/\r?\n/)) {
    lineNumber++;
    if (codeFence.consume(line)) continue;
    const heading2 = parseMarkdownHeadingLine(line);
    if (!heading2) continue;
    headings.push({ ...heading2, line: lineNumber });
  }
  if (headings.length === 0) {
    return { title: fallback, line: 1, level: 1 };
  }
  const topLevel = Math.min(...headings.map((heading2) => heading2.level));
  const topHeadings = headings.filter((heading2) => heading2.level === topLevel);
  if (topHeadings.length !== 1) {
    return { title: fallback, line: 1, level: topLevel };
  }
  return topHeadings[0];
}
function fallbackPageTitle(filePath) {
  return path__namespace.posix.basename(filePath, ".md").replace(/^\d+-/, "").replace(/^appendix[-_\s]?[a-z0-9]+[-_\s]?/i, "").replace(/[-_]+/g, " ");
}
function getPageOrder(kind, unit, filePath = "") {
  if (kind === "intro") return -1e5;
  if (kind === "summary") return 2e5;
  if (isManuscriptMatterKind(kind)) return Math.min(Number(path__namespace.posix.basename(filePath).match(/^(\d+)[-_\s]+/)?.[1] ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  return unit ? unit.order : 0;
}
function markerLineContent(line, marker2) {
  if (marker2.type === "section") return marker2.title;
  return line.trim().replace(marker2.markerText, sourceMarkerLabel(marker2)).trim();
}
function sourceMarkerLabel(marker2) {
  return marker2.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, "").trim();
}
function normalizeProofBoundaryLine(line) {
  return line.trim().replace(/^>\s*/, "").replace(/^\s*[-+*]\s+/, "").replace(/^\*\*(.+?)\*\*/, "$1").replace(/^__(.+?)__/, "$1").replace(/^\*(.+?)\*/, "$1").replace(/^_(.+?)_/, "$1").trim();
}
function isProofBoundaryLine(line) {
  const text2 = normalizeProofBoundaryLine(line);
  return /^(?:证明(?:概要|草图|思路|如下|在此略去)?|Proof(?:\s+sketch)?|Sketch of proof)\s*(?:[：:。.．.]|$|\s)/i.test(text2);
}
function isProofTerminatorLine(line) {
  const text2 = normalizeProofBoundaryLine(line);
  return /(?:证毕|Q\.?E\.?D\.?|∎|□)\s*[。.．.]?\s*$/i.test(text2) || /\$\s*\\square\s*\$\s*[。.．.]?\s*$/.test(text2) || /\\\[\s*\\square\s*\\\]\s*[。.．.]?\s*$/.test(text2);
}
function isMarkerBoundaryLine(line) {
  return /^#{1,6}\s+/.test(line) || !!parseFormalMarkerLine(line);
}
function isDisplayMathLine(line) {
  const text2 = line.trim();
  return text2.startsWith("$$") || text2.startsWith("\\[") || text2.startsWith("\\]") || /^\\(?:begin|end)\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2);
}
function isStructuredDefinitionContinuation(line) {
  const text2 = line.trim();
  return isDisplayMathLine(line) || /^>\s*/.test(text2) || /^\|.*\|$/.test(text2) || /^[-+*]\s+/.test(text2) || /^\d+[.)]\s+/.test(text2) || /^(\*\*|__)?\s*[（(]?(?:[ivxlcdm]+|[a-z]|\d+)[）).、]\s*/i.test(text2);
}
function isDisplayMathStartLine(line) {
  const text2 = line.trim();
  return text2.startsWith("$$") || text2.startsWith("\\[") || /^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2);
}
function updateDisplayMathState(line, inDisplayMath) {
  const text2 = line.trim();
  const dollarCount = (text2.match(/\$\$/g) || []).length;
  if (dollarCount % 2 === 1) return !inDisplayMath;
  if (text2.startsWith("\\[")) return true;
  if (text2.startsWith("\\]")) return false;
  if (/^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2)) return true;
  if (/^\\end\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2)) return false;
  return inDisplayMath;
}
function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
  return trimmed;
}
function collectRecallMarkerContent(lines, startLine, marker2) {
  const contentLines = [markerLineContent(lines[startLine], marker2)];
  let endLine = startLine;
  if (FORMAL_KIND_POLICIES[marker2.type]?.counter === "example") {
    const codeFence = new MarkdownFence();
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!codeFence.consume(line) && (isMarkerBoundaryLine(line) || /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line))) break;
      contentLines.push(line);
    }
    const trimmed = trimTrailingBlankLines(contentLines);
    return { contentLines: trimmed, endLine: startLine + trimmed.length - 1 };
  }
  let proofLine = -1;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isMarkerBoundaryLine(line)) break;
    if (isProofBoundaryLine(line)) {
      proofLine = i;
      break;
    }
  }
  if (proofLine >= 0) {
    for (let i = startLine + 1; i < proofLine; i++) {
      contentLines.push(lines[i]);
      endLine = i;
    }
    return { contentLines: trimTrailingBlankLines(contentLines), endLine };
  }
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isMarkerBoundaryLine(line)) break;
    contentLines.push(line);
    endLine = i;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function nextNonBlankLineIndex(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim()) return i;
  }
  return -1;
}
function collectDefinitionContent(lines, startLine, marker2) {
  const contentLines = [marker2 ? markerLineContent(lines[startLine], marker2) : lines[startLine].trim()];
  let endLine = startLine;
  let inDisplayMath = updateDisplayMathState(lines[startLine], false);
  let previousNonBlankWasDisplayMath = isDisplayMathLine(lines[startLine]);
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isMarkerBoundaryLine(line)) break;
    if (!line.trim()) {
      const nextNonBlank = nextNonBlankLineIndex(lines, i + 1);
      if (nextNonBlank < 0 || isMarkerBoundaryLine(lines[nextNonBlank])) break;
      if (!inDisplayMath && !previousNonBlankWasDisplayMath && !isStructuredDefinitionContinuation(lines[nextNonBlank])) break;
      contentLines.push(line);
      endLine = i;
      previousNonBlankWasDisplayMath = false;
      continue;
    }
    const lineWasDisplayMath = inDisplayMath || isDisplayMathLine(line);
    contentLines.push(line);
    endLine = i;
    inDisplayMath = updateDisplayMathState(line, inDisplayMath);
    previousNonBlankWasDisplayMath = lineWasDisplayMath;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function collectMarkerContent(lines, startLine, marker2) {
  if (RECALL_TYPES.has(marker2.type)) {
    return collectRecallMarkerContent(lines, startLine, marker2);
  }
  if (marker2.type === "def") {
    return collectDefinitionContent(lines, startLine, marker2);
  }
  const contentLines = [markerLineContent(lines[startLine], marker2)];
  let endLine = startLine;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isMarkerBoundaryLine(line)) break;
    contentLines.push(line);
    endLine = i;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function sourceLineRangeContent(lines, sourceLine) {
  const sourceIndex = Math.max(0, Math.min(lines.length - 1, sourceLine - 1));
  const marker2 = parseFormalMarkerLine(lines[sourceIndex]);
  if (marker2) {
    const collected2 = collectMarkerContent(lines, sourceIndex, marker2);
    return {
      content: collected2.contentLines.join("\n"),
      startLine: sourceIndex,
      endLine: collected2.endLine
    };
  }
  const isBoundary = (line) => !line.trim() || /^#{1,6}\s+/.test(line) || !!parseFormalMarkerLine(line);
  let startLine = sourceIndex;
  while (startLine > 0 && !isBoundary(lines[startLine - 1])) startLine--;
  const collected = collectDefinitionContent(lines, startLine);
  return {
    content: collected.contentLines.join("\n").trim(),
    startLine,
    endLine: collected.endLine
  };
}
function makeLabelData(marker2, unitFile, startLine, contentLines, markerNumber, endLine) {
  const content = RECALL_TYPES.has(marker2.type) ? contentLines.join("\n") : void 0;
  const label = {
    type: marker2.type,
    title: marker2.title,
    filePath: unitFile.filePath,
    bookKey: unitFile.book.key,
    bookTitle: unitFile.book.title,
    bookOrder: unitFile.book.order,
    unitKind: unitFile.unit.kind,
    unitKey: unitFile.unit.key,
    unitLabel: unitFile.unit.label,
    unitOrder: unitFile.unit.order,
    startLine,
    endLine
  };
  if (content) label.content = content;
  if (unitFile.unit.chapter !== void 0) label.chapter = unitFile.unit.chapter;
  if (unitFile.unit.appendix !== void 0) label.appendix = unitFile.unit.appendix;
  if (markerNumber !== void 0) label.number = markerNumber;
  if (unitFile.volume) {
    label.volumeKey = unitFile.volume.key;
    label.volumeTitle = unitFile.volume.title;
    label.volumeOrder = unitFile.volume.order;
  }
  return label;
}
function makeDefinitionLabelData(marker2, document, book, volume, startLine, contentLines, endLine) {
  const content = contentLines.join("\n");
  const label = {
    type: marker2.type,
    title: marker2.title,
    filePath: document.filePath,
    bookKey: book.key,
    bookTitle: book.title,
    bookOrder: book.order,
    content,
    startLine,
    endLine
  };
  if (volume) {
    label.volumeKey = volume.key;
    label.volumeTitle = volume.title;
    label.volumeOrder = volume.order;
  }
  return label;
}
function makePageLabelData(page) {
  const label = {
    type: page.kind,
    title: page.title,
    filePath: page.filePath,
    bookKey: page.bookKey,
    bookTitle: page.bookTitle,
    bookOrder: page.bookOrder,
    volumeKey: page.volumeKey,
    volumeTitle: page.volumeTitle,
    volumeOrder: page.volumeOrder,
    unitKind: page.unitKind,
    unitKey: page.unitKey,
    unitLabel: page.unitLabel,
    unitOrder: page.unitOrder,
    chapter: page.chapter,
    appendix: page.appendix,
    startLine: page.line !== void 0 ? page.line - 1 : void 0,
    endLine: page.line !== void 0 ? page.line - 1 : void 0
  };
  return label;
}
function previousNonBlankLineIndex(lines, startIndex) {
  for (let i = startIndex; i >= 0; i--) {
    if (lines[i].trim()) return i;
  }
  return -1;
}
function isMarkdownImageLine(line) {
  return /!\[[^\]\n]*\]\([^)]+\)/.test(line.trim());
}
function isMarkdownTableRow(line) {
  const text2 = line.trim();
  return text2.includes("|") && text2.split("|").filter((part) => part.trim()).length >= 2;
}
function isMarkdownTableDelimiter(line) {
  const text2 = line.trim();
  if (!text2.includes("|")) return false;
  const cells = text2.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
function isMarkdownTableStart(lines, lineIndex) {
  return lineIndex >= 0 && lineIndex + 1 < lines.length && isMarkdownTableRow(lines[lineIndex]) && isMarkdownTableDelimiter(lines[lineIndex + 1]);
}
function lintStructuredNumberedMarker(marker2, lines, lineIndex, filePath) {
  if (!STRUCTURED_NUMBERED_TYPES.has(marker2.type)) return [];
  const issues = [];
  const next = nextNonBlankLineIndex(lines, lineIndex + 1);
  const previous = previousNonBlankLineIndex(lines, lineIndex - 1);
  if (marker2.type === "equation") {
    if (next < 0 || !isDisplayMathStartLine(lines[next])) {
      issues.push({
        severity: "error",
        code: "equation-target-missing",
        file: filePath,
        line: lineIndex + 1,
        message: "Equation marker must be followed by a display math block."
      });
    }
    return issues;
  }
  if (!marker2.title) {
    issues.push({
      severity: "warn",
      code: `${marker2.type}-caption-missing`,
      file: filePath,
      line: lineIndex + 1,
      message: `${marker2.type === "figure" ? "Figure" : "Table"} marker should include a caption title.`
    });
  }
  if (marker2.type === "figure") {
    const hasNearbyImage = previous >= 0 && isMarkdownImageLine(lines[previous]) || next >= 0 && isMarkdownImageLine(lines[next]);
    if (!hasNearbyImage) {
      issues.push({
        severity: "error",
        code: "figure-target-missing",
        file: filePath,
        line: lineIndex + 1,
        message: "Figure marker should be adjacent to a Markdown image."
      });
    }
    return issues;
  }
  if (marker2.type === "table" && (next < 0 || !isMarkdownTableStart(lines, next))) {
    issues.push({
      severity: "error",
      code: "table-target-missing",
      file: filePath,
      line: lineIndex + 1,
      message: "Table marker must be followed by a Markdown table."
    });
  }
  return issues;
}
function scanFormalDocuments(documents, configInput, symbolsInput, definitionsInput) {
  const config2 = mergeConfig(configInput);
  const files = [...documents].sort((a, b) => a.filePath.localeCompare(b.filePath));
  const labels = {};
  const definitions = [];
  const references = [];
  const pageReferences = [];
  const pages = [];
  const issues = [];
  const unitFiles = /* @__PURE__ */ new Map();
  const anchorsByFile = /* @__PURE__ */ new Map();
  for (const document of files) {
    const filePath = toPosix(document.filePath);
    const basename = path__namespace.posix.basename(filePath);
    const content = document.content;
    const book = inferBookInfo(filePath, config2);
    const volume = inferVolumeInfo(filePath, config2);
    const specialKind = unnumberedPageKind(filePath);
    const unit = specialKind ? void 0 : parseNumberingUnit(basename);
    const pageAnchor = unit || specialKind ? getPageTitleHeading(content, fallbackPageTitle(filePath)) : void 0;
    if (unit || specialKind) {
      const kind = unit ? unit.kind : specialKind;
      const page = {
        id: pageAnchor?.id,
        kind,
        filePath,
        title: pageAnchor?.title || fallbackPageTitle(filePath),
        order: getPageOrder(kind, unit, filePath),
        bookKey: book.key,
        bookTitle: book.title,
        bookOrder: book.order,
        line: pageAnchor?.line,
        level: pageAnchor?.level
      };
      if (volume) {
        page.volumeKey = volume.key;
        page.volumeTitle = volume.title;
        page.volumeOrder = volume.order;
      }
      if (unit) {
        page.unitKind = unit.kind;
        page.unitKey = unit.key;
        page.unitLabel = unit.label;
        page.unitOrder = unit.order;
        if (unit.chapter !== void 0) page.chapter = unit.chapter;
        if (unit.appendix !== void 0) page.appendix = unit.appendix;
      }
      pages.push(page);
      if (page.id) {
        const label = makePageLabelData(page);
        labels[page.id] = label;
        definitions.push({
          id: page.id,
          type: page.kind,
          title: page.title,
          file: filePath,
          line: page.line || 1,
          label
        });
      }
    }
    collectReferences(content, filePath, references, pageReferences);
    const allMarkerStarts = collectMarkerStarts(content, filePath);
    anchorsByFile.set(filePath, {
      stable: allMarkerStarts.filter((marker2) => typeof marker2.id === "string" && marker2.id.startsWith("h-")).length,
      temporary: allMarkerStarts.filter((marker2) => typeof marker2.id === "string" && marker2.id.startsWith("tmp-")).length
    });
    const markerStarts = allMarkerStarts.filter((marker2) => !isPageAnchorMarker(marker2, pageAnchor));
    if (markerStarts.some((marker2) => marker2.type !== "def") && !unit) {
      issues.push({
        severity: "warn",
        code: "formal-marker-outside-numbered-file",
        file: filePath,
        message: "Numbered markers are only numbered in NN-title.md or appendix-a-title.md files."
      });
    }
    const lines = content.split(/\r?\n/);
    const codeFence = new MarkdownFence();
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (codeFence.consume(line)) continue;
      const marker2 = parseFormalMarkerLine(line);
      if (!marker2 || marker2.type !== "def") continue;
      const collected = collectMarkerContent(lines, lineIndex, marker2);
      const label = makeDefinitionLabelData(marker2, { filePath }, book, volume, lineIndex, collected.contentLines, collected.endLine);
      definitions.push({
        type: marker2.type,
        title: marker2.title,
        file: filePath,
        line: lineIndex + 1,
        label
      });
    }
    if (!unit) continue;
    const volumeKey = volume?.key || "__root__";
    const scopeKey = unit.kind === "appendix" ? `${book.key}:${volumeKey}:${unit.key}` : `${book.key}:${unit.key}`;
    if (!unitFiles.has(scopeKey)) unitFiles.set(scopeKey, []);
    unitFiles.get(scopeKey).push({ filePath, content, book, volume, unit, pageAnchor });
  }
  for (const groupFiles of unitFiles.values()) {
    groupFiles.sort((a, b) => a.filePath.localeCompare(b.filePath));
    const counters = {};
    for (const unitFile of groupFiles) {
      const lines = unitFile.content.split(/\r?\n/);
      const codeFence = new MarkdownFence();
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (codeFence.consume(line)) continue;
        const marker2 = parseFormalMarkerLine(line);
        if (!marker2) continue;
        if (isPageAnchorMarker({ ...marker2, line: lineIndex + 1 }, unitFile.pageAnchor)) continue;
        if (marker2.type === "def") continue;
        issues.push(...lintStructuredNumberedMarker(marker2, lines, lineIndex, unitFile.filePath));
        const counter = FORMAL_KIND_POLICIES[marker2.type]?.counter;
        const markerNumber = counter ? counters[counter] = (counters[counter] || 0) + 1 : void 0;
        const exerciseContent = isPedagogicalKind(marker2.type) ? collectExerciseContent(lines, lineIndex, marker2, parseFormalMarkerLine) : void 0;
        const content = exerciseContent || collectMarkerContent(lines, lineIndex, marker2);
        const label = makeLabelData(marker2, unitFile, lineIndex, content.contentLines, markerNumber, content.endLine);
        if (exerciseContent) {
          label.bodyEndLine = exerciseContent.bodyEndLine;
          label.supportRanges = exerciseContent.support;
          label.supportContent = exerciseContent.support.map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
          label.solutionOf = marker2.solutionOf;
          if (marker2.type === "solution") label.proofContent = lines.slice(lineIndex, exerciseContent.bodyEndLine + 1).join("\n");
          else label.proofContent = exerciseContent.support.filter((range) => range.kind === "solution").map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
        } else {
          const proof = findProofRange(lines, lineIndex + 1, content.endLine + 1);
          if (proof.proofStartLine !== void 0 && proof.proofEndLine !== void 0) {
            label.proofContent = lines.slice(proof.proofStartLine - 1, proof.proofEndLine).join("\n");
          }
        }
        labels[marker2.id] = label;
        definitions.push({
          id: marker2.id,
          type: marker2.type,
          title: marker2.title,
          file: unitFile.filePath,
          line: lineIndex + 1,
          label
        });
      }
    }
  }
  issues.push(...connectExerciseSolutions(definitions, labels));
  const customDefinitionResult = parseFormalDefinitions(definitionsInput, files, config2);
  for (const customDefinition of customDefinitionResult.definitions) {
    customDefinition.origin = "manual";
    customDefinition.label.definitionOrigin = "manual";
    const existing = definitions.find((def) => def.type === "def" && def.file === customDefinition.file && def.line === customDefinition.line && def.title === customDefinition.title);
    if (existing) {
      existing.aliases = unique$1([...existing.aliases || [], ...customDefinition.aliases || []]);
      continue;
    }
    definitions.push(customDefinition);
  }
  issues.push(...customDefinitionResult.issues);
  const projectKnowledge = analyzeProjectKnowledge(files, definitions);
  const knowledgeOrigins = /* @__PURE__ */ new Map();
  for (const source of projectKnowledge.project.sources) {
    const conceptKind = (source.kinds || [source.kind]).find((kind) => kind === "concept-appendix" || kind === "glossary");
    if (conceptKind) knowledgeOrigins.set(source.filePath, conceptKind);
  }
  for (const definition of definitions) {
    if (definition.type !== "def" || definition.origin) continue;
    const origin = knowledgeOrigins.get(definition.file);
    definition.origin = origin || "standard";
    definition.label.definitionOrigin = definition.origin;
  }
  for (const candidate of projectKnowledge.definitions) {
    const book = inferBookInfo(candidate.filePath, config2);
    const volume = inferVolumeInfo(candidate.filePath, config2);
    const label = {
      type: "def",
      title: candidate.title,
      filePath: candidate.filePath,
      bookKey: book.key,
      bookTitle: book.title,
      bookOrder: book.order,
      content: candidate.content,
      startLine: candidate.line - 1,
      endLine: candidate.line - 1,
      definitionOrigin: candidate.origin
    };
    if (volume) {
      label.volumeKey = volume.key;
      label.volumeTitle = volume.title;
      label.volumeOrder = volume.order;
    }
    definitions.push({
      type: "def",
      title: candidate.title,
      file: candidate.filePath,
      line: candidate.line,
      label,
      origin: candidate.origin
    });
  }
  const symbolResult = parseFormalSymbols(symbolsInput, files);
  issues.push(...symbolResult.issues);
  issues.push(...lintDefinitions(definitions));
  issues.push(...lintReferences(references, labels, definitions, config2));
  issues.push(...lintPageReferences(pageReferences, pages, config2));
  issues.push(...lintPages(pages));
  for (const page of pages) {
    const anchors = anchorsByFile.get(page.filePath) || { stable: 0, temporary: 0 };
    const issueCount = issues.filter((issue) => issue.file === page.filePath).length;
    const hasStablePageAnchor = typeof page.id === "string" && page.id.startsWith("h-");
    page.integration = {
      status: anchors.temporary > 0 || issueCount > 0 ? "attention" : hasStablePageAnchor ? "managed" : anchors.stable > 0 ? "segmented" : "unmanaged",
      stableAnchorCount: anchors.stable,
      temporaryAnchorCount: anchors.temporary,
      issueCount
    };
  }
  definitions.sort(compareDefinitionRecords);
  pages.splice(0, pages.length, ...sortManuscriptPages(pages));
  const dependencyGraph = buildDependencyGraph({ config: config2, labels, definitions, references }, files);
  return { config: config2, files: files.map((file) => file.filePath), labels, pages, definitions, references, pageReferences, symbols: symbolResult.symbols, issues, dependencyGraph, projectAnalysis: projectKnowledge.project };
}
function collectMarkerStarts(content, filePath) {
  const starts = [];
  const lines = content.split(/\r?\n/);
  const codeFence = new MarkdownFence();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (codeFence.consume(line)) continue;
    const marker2 = parseFormalMarkerLine(line);
    if (marker2) starts.push({ ...marker2, file: filePath, line: i + 1 });
  }
  return starts;
}
function isPageAnchorMarker(marker2, pageAnchor) {
  return Boolean(
    pageAnchor?.id && marker2?.id === pageAnchor.id && marker2?.line === pageAnchor.line && marker2?.type === "section"
  );
}
function collectReferences(content, filePath, references, pageReferences) {
  const stripped = stripIgnoredMarkdown(content);
  const lineStarts = [0];
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "\n") lineStarts.push(i + 1);
  }
  const pageRefRe = /(^|[^A-Za-z0-9_])@(chapter|page):([^\s<>"'`，。；;！？]+?\.md)(?:\.(title|full))?(?=$|[\s,，。；;:：.!！?？)\]}])/g;
  let pageMatch;
  while (pageMatch = pageRefRe.exec(stripped)) {
    const offset = pageMatch.index + pageMatch[1].length;
    const line = findLineForOffset(lineStarts, offset);
    pageReferences.push({
      kind: pageMatch[2],
      rawTarget: pageMatch[3],
      target: normalizeFormalPagePath(pageMatch[3], filePath),
      mode: pageMatch[4],
      file: filePath,
      line
    });
  }
  const refRe = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_-]+)(?:\.(?:title|full))?\b(?!:)/g;
  let match2;
  while (match2 = refRe.exec(stripped)) {
    const offset = match2.index + match2[1].length;
    const line = findLineForOffset(lineStarts, offset);
    references.push({ id: match2[2], file: filePath, line });
  }
}
function findLineForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}
function lintDefinitions(definitions) {
  const issues = [];
  const byId = /* @__PURE__ */ new Map();
  for (const def of definitions) {
    if (!def.id) continue;
    if (!byId.has(def.id)) byId.set(def.id, []);
    byId.get(def.id).push(def);
    if (TMP_ID_RE.test(def.id)) {
      issues.push({
        severity: "error",
        code: "tmp-id-left",
        file: def.file,
        line: def.line,
        message: `Temporary marker #${def.id} remains. Run npm run workspace -- finish <file>.`
      });
    } else if (!HASH_ID_RE.test(def.id)) {
      issues.push({
        severity: "warn",
        code: "non-hash-id",
        file: def.file,
        line: def.line,
        message: `Marker id #${def.id} is not a pure hash id.`
      });
    }
  }
  for (const [id, defs] of byId) {
    if (defs.length <= 1) continue;
    defs.forEach((def) => {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        file: def.file,
        line: def.line,
        message: `Duplicate marker id #${id}.`
      });
    });
  }
  return issues;
}
function normalizeBookDependencyKey(value) {
  return String(value || "").trim().toLowerCase();
}
function directBookDependencies(config2, sourceBookKey) {
  const dependencies = config2?.lookup?.bookDependencies;
  if (!dependencies || typeof dependencies !== "object") return [];
  const source = normalizeBookDependencyKey(sourceBookKey);
  for (const [key, value] of Object.entries(dependencies)) {
    if (normalizeBookDependencyKey(key) !== source) continue;
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").map(normalizeBookDependencyKey).filter(Boolean) : [];
  }
  return [];
}
function canReferenceBook(sourceBookKey, targetBookKey, config2, seen = /* @__PURE__ */ new Set()) {
  const source = normalizeBookDependencyKey(sourceBookKey);
  const target = normalizeBookDependencyKey(targetBookKey);
  if (!source || !target || source === target) return true;
  if (seen.has(source)) return false;
  seen.add(source);
  const dependencies = directBookDependencies(config2, source);
  if (dependencies.includes(target)) return true;
  return dependencies.some((dependency) => canReferenceBook(dependency, target, config2, seen));
}
function lintReferences(references, labels, definitions, config2) {
  const issues = [];
  const definedIds = new Set(Object.keys(labels));
  const tmpDefs = new Set(definitions.filter((def) => def.id && TMP_ID_RE.test(def.id)).map((def) => def.id));
  for (const ref of references) {
    if (TMP_ID_RE.test(ref.id)) {
      issues.push({
        severity: tmpDefs.has(ref.id) ? "error" : "error",
        code: "tmp-ref-left",
        file: ref.file,
        line: ref.line,
        message: `Temporary reference @${ref.id} remains. Run finish before committing.`
      });
      continue;
    }
    if (!definedIds.has(ref.id)) {
      issues.push({
        severity: "error",
        code: "missing-ref",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} has no matching marker.`
      });
      continue;
    }
    const target = labels[ref.id];
    const sourceBook = inferBookInfo(ref.file, config2);
    const targetBookKey = target.bookKey || inferBookInfo(target.filePath || "", config2).key;
    if (!canReferenceBook(sourceBook.key, targetBookKey, config2)) {
      issues.push({
        severity: "error",
        code: "cross-book-ref-disallowed",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} crosses from ${sourceBook.title} to ${target.bookTitle || targetBookKey}; add lookup.bookDependencies if this dependency is intentional.`
      });
    }
  }
  return issues;
}
function lintPageReferences(pageReferences, pages, config2) {
  const issues = [];
  const pageByPath = new Map(pages.map((page) => [page.filePath, page]));
  for (const ref of pageReferences) {
    const target = pageByPath.get(ref.target);
    if (!target) {
      issues.push({
        severity: "error",
        code: "missing-page-ref",
        file: ref.file,
        line: ref.line,
        message: `Page reference @${ref.kind}:${ref.rawTarget} resolves to ${ref.target || "(empty)"}, but no scanned page matches that path.`
      });
      continue;
    }
    if (ref.kind === "chapter" && target.kind !== "chapter") {
      issues.push({
        severity: "error",
        code: "page-ref-kind-mismatch",
        file: ref.file,
        line: ref.line,
        message: `@chapter:${ref.rawTarget} points to a ${target.kind} page. Use @page:${target.filePath} for non-chapter pages.`
      });
    }
    const sourceBook = inferBookInfo(ref.file, config2);
    const targetBookKey = target.bookKey || inferBookInfo(target.filePath || "", config2).key;
    if (!canReferenceBook(sourceBook.key, targetBookKey, config2)) {
      issues.push({
        severity: "error",
        code: "cross-book-page-ref-disallowed",
        file: ref.file,
        line: ref.line,
        message: `Page reference @${ref.kind}:${ref.rawTarget} crosses from ${sourceBook.title} to ${target.bookTitle || targetBookKey}; add lookup.bookDependencies if this dependency is intentional.`
      });
    }
  }
  return issues;
}
function lintPages(pages) {
  const issues = [];
  const chaptersByBook = /* @__PURE__ */ new Map();
  const specialByScope = /* @__PURE__ */ new Map();
  for (const page of pages) {
    if (page.kind === "chapter" && typeof page.chapter === "number") {
      if (!chaptersByBook.has(page.bookKey || "")) chaptersByBook.set(page.bookKey || "", []);
      chaptersByBook.get(page.bookKey || "").push(page);
    }
    if (page.kind === "intro" || page.kind === "summary") {
      const key = `${page.bookKey}:${page.volumeKey || "__root__"}:${page.kind}`;
      if (!specialByScope.has(key)) specialByScope.set(key, []);
      specialByScope.get(key).push(page);
    }
  }
  for (const chapterPages of chaptersByBook.values()) {
    const sorted2 = [...chapterPages].sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
    for (let i = 1; i < sorted2.length; i++) {
      if (sorted2[i].chapter === sorted2[i - 1].chapter) {
        issues.push({
          severity: "error",
          code: "duplicate-chapter",
          file: sorted2[i].filePath,
          message: `Chapter ${sorted2[i].chapter} is duplicated in ${sorted2[i].bookTitle}.`
        });
      }
      if ((sorted2[i].chapter || 0) !== (sorted2[i - 1].chapter || 0) + 1) {
        issues.push({
          severity: "warn",
          code: "chapter-gap",
          file: sorted2[i].filePath,
          message: `${sorted2[i].bookTitle} jumps from chapter ${sorted2[i - 1].chapter} to ${sorted2[i].chapter}.`
        });
      }
    }
  }
  for (const entries of specialByScope.values()) {
    if (entries.length <= 1) continue;
    entries.slice(1).forEach((page) => {
      issues.push({
        severity: "warn",
        code: "duplicate-special-page",
        file: page.filePath,
        message: `Duplicate ${page.kind}.md in the same book/volume scope.`
      });
    });
  }
  return issues;
}
function compareDefinitionRecords(a, b) {
  const la = a.label;
  const lb = b.label;
  if ((la.bookOrder || 0) !== (lb.bookOrder || 0)) return (la.bookOrder || 0) - (lb.bookOrder || 0);
  if ((la.volumeOrder || 0) !== (lb.volumeOrder || 0)) return (la.volumeOrder || 0) - (lb.volumeOrder || 0);
  if ((la.unitOrder || 0) !== (lb.unitOrder || 0)) return (la.unitOrder || 0) - (lb.unitOrder || 0);
  return a.file.localeCompare(b.file) || a.line - b.line;
}
function formatLabelNumber(label) {
  if (label.type === "solution") return label.solutionExerciseNumber || "";
  if (label.type === "remark" || isPageLabelType(label.type)) return "";
  const prefix = label.unitLabel || (label.chapter !== void 0 ? String(label.chapter) : label.appendix || "");
  return prefix && label.number !== void 0 ? `${prefix}.${label.number}` : "";
}
function formatDisplayNumber(label) {
  const number = formatLabelNumber(label);
  return label.type === "equation" && number ? `(${number})` : number;
}
function displayLabel(def, config2) {
  const name = typeName(config2, def.type);
  if (def.type === "solution") {
    const number2 = formatLabelNumber(def.label);
    return getLanguage(config2) === "en" ? `Solution to Exercise ${number2}`.trim() : `习题 ${number2} 的解答`;
  }
  if (def.type === "section") {
    const number2 = formatLabelNumber(def.label);
    return number2 ? `${name} ${number2}` : name;
  }
  const number = formatDisplayNumber(def.label);
  return number ? `${name} ${number}` : name;
}
function displayNumber(def) {
  return formatLabelNumber(def.label);
}
function renderReferenceMap(definitions, config2, pages = []) {
  const lines = [
    "# Reference Map",
    "",
    "Generated by `npm run workspace -- prepare`. Read this file to map human display numbers and unnumbered anchors to stable hash IDs.",
    ""
  ];
  if (pages.length > 0) {
    lines.push("## Pages", "");
    lines.push("| Display | Ref | Path Ref | Title | Location |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const page of sortManuscriptPages(pages)) {
      const prefix = page.kind === "chapter" ? "chapter" : "page";
      const pathRef = `@${prefix}:${page.filePath}`;
      const ref = page.id ? `@${page.id}` : pathRef;
      lines.push(`| ${escapeTable(formatPageReference(page, config2))} | \`${ref}\` | \`${pathRef}\` | ${escapeTable(page.title || "")} | \`${page.filePath}\` |`);
    }
    lines.push("");
  }
  const numberedDefinitions = definitions.filter((def) => def.id && displayNumber(def));
  let currentBook = "";
  for (const def of numberedDefinitions) {
    const book = def.label.bookTitle || "Workspace";
    if (book !== currentBook) {
      currentBook = book;
      lines.push(`## ${book}`, "");
      lines.push("| Display | ID | Title | Location |");
      lines.push("| --- | --- | --- | --- |");
    }
    const title = def.title || "";
    lines.push(`| ${displayLabel(def, config2)} | \`${def.id}\` | ${escapeTable(title)} | \`${def.file}:${def.line}\` |`);
  }
  const unnumberedAnchors = definitions.filter((def) => def.id && !displayNumber(def) && def.type === "remark");
  if (unnumberedAnchors.length > 0) {
    lines.push("", "## Unnumbered Anchors", "");
    lines.push("| Display | ID | Title | Location |");
    lines.push("| --- | --- | --- | --- |");
    for (const def of unnumberedAnchors) {
      const title = def.title || "";
      lines.push(`| ${displayLabel(def, config2)} | \`${def.id}\` | ${escapeTable(title)} | \`${def.file}:${def.line}\` |`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}
`;
}
function buildRuntimeDefinitions(definitions) {
  return definitions.filter((def) => def.type === "def").map((def) => ({
    title: def.title,
    aliases: def.aliases && def.aliases.length > 0 ? def.aliases : void 0,
    filePath: def.file,
    line: def.line,
    content: def.label.content || "",
    bookKey: def.label.bookKey,
    bookTitle: def.label.bookTitle,
    bookOrder: def.label.bookOrder,
    volumeKey: def.label.volumeKey,
    volumeTitle: def.label.volumeTitle,
    volumeOrder: def.label.volumeOrder,
    origin: def.origin || def.label.definitionOrigin || "standard"
  }));
}
function buildReaderIndex(state) {
  return {
    entries: state.labels,
    pages: state.pages,
    definitions: buildRuntimeDefinitions(state.definitions || []),
    symbols: state.symbols || [],
    projectAnalysis: state.projectAnalysis || void 0
  };
}
function renderProjectAnalysis(analysis) {
  const project = analysis || {
    sources: [],
    summary: { conceptSources: 0, notationSources: 0, summaryPages: 0, extractedDefinitions: 0 }
  };
  const lines = [
    "# Project Knowledge Analysis",
    "",
    "Generated from file names, page structure, concept tables, and concept-entry headings. It is a derived reading aid, not source content.",
    "",
    `- Concept or glossary sources: ${project.summary.conceptSources}`,
    `- Notation sources: ${project.summary.notationSources}`,
    `- Summary pages: ${project.summary.summaryPages}`,
    `- Supplemental definitions extracted from concept sources: ${project.summary.extractedDefinitions}`,
    ""
  ];
  if (project.sources.length === 0) {
    lines.push("No dedicated knowledge pages were detected. Standard definition markers remain indexed automatically.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("## Detected Sources", "");
  lines.push("| Kinds | File | Title | Confidence | Derived definitions |");
  lines.push("| --- | --- | --- | --- | ---: |");
  project.sources.forEach((source) => lines.push(`| ${(source.kinds || [source.kind]).join(", ")} | \`${source.filePath}\` | ${escapeTable(source.title)} | ${source.confidence} | ${source.extractedDefinitions} |`));
  lines.push("", "## Maintenance Boundary", "");
  lines.push("- The scanner and Reader refresh this analysis when Markdown or the optional definition/symbol source tables change.", "- A detected page may supply multiple roles; each role is counted once per page.", "- Do not copy ordinary definitions into `.math-workspace/definitions.json` just to keep this index fresh.", "- Use `.math-workspace/definitions.json` only for deliberate lookup overrides: nonstandard wording, aliases, bilingual lookup, or a boundary the deterministic extractor cannot represent.", "- Detected notation pages are supplied as project context; symbol patterns and meanings still require an explicit reviewed source entry.", "");
  return `${lines.join("\n")}
`;
}
function buildDocumentMap(documents) {
  return new Map(documents.map((document) => [toPosix(document.filePath), document.content || ""]));
}
function findProofRange(lines, startLine, statementEndLine) {
  const startIndex = Math.max(0, startLine - 1);
  const statementEndIndex = Math.max(startIndex, statementEndLine - 1);
  let proofStartIndex = -1;
  for (let i = statementEndIndex + 1; i < lines.length; i++) {
    if (isMarkerBoundaryLine(lines[i])) break;
    if (isProofBoundaryLine(lines[i])) {
      proofStartIndex = i;
      break;
    }
  }
  if (proofStartIndex < 0) {
    return { endLine: statementEndLine };
  }
  let proofEndIndex = proofStartIndex;
  for (let i = proofStartIndex; i < lines.length; i++) {
    if (isMarkerBoundaryLine(lines[i])) break;
    proofEndIndex = i;
    if (isProofTerminatorLine(lines[i])) break;
  }
  return {
    proofStartLine: proofStartIndex + 1,
    proofEndLine: proofEndIndex + 1,
    endLine: proofEndIndex + 1
  };
}
function dependencySourceBlocks(definitions, documents) {
  const documentMap = buildDocumentMap(documents);
  const blocksByFile = /* @__PURE__ */ new Map();
  for (const def of definitions) {
    if (!def.id || !DEPENDENCY_NODE_TYPES.has(def.type)) continue;
    const content = documentMap.get(def.file);
    if (content === void 0) continue;
    const lines = content.split(/\r?\n/);
    const startLine = def.line;
    const labelEndLine = typeof def.label.endLine === "number" ? def.label.endLine + 1 : startLine;
    const statementEndLine = Math.max(startLine, labelEndLine);
    const pedagogical = isPedagogicalKind(def.type);
    const bodyEndLine = (def.label.bodyEndLine ?? def.label.endLine ?? startLine - 1) + 1;
    const proofRange = pedagogical ? {
      proofStartLine: def.type === "solution" ? startLine : statementEndLine + 1,
      proofEndLine: bodyEndLine,
      endLine: bodyEndLine
    } : findProofRange(lines, startLine, statementEndLine);
    const block2 = {
      id: def.id,
      file: def.file,
      startLine,
      statementEndLine: def.type === "solution" ? startLine - 1 : statementEndLine,
      proofStartLine: proofRange.proofStartLine,
      proofEndLine: proofRange.proofEndLine,
      endLine: Math.max(statementEndLine, proofRange.endLine)
    };
    if (!blocksByFile.has(def.file)) blocksByFile.set(def.file, []);
    blocksByFile.get(def.file).push(block2);
  }
  for (const blocks of blocksByFile.values()) {
    blocks.sort((a, b) => a.startLine - b.startLine);
  }
  return blocksByFile;
}
function findDependencySourceBlock(blocks, line) {
  if (!blocks) return void 0;
  return blocks.find((block2) => block2.startLine <= line && line <= block2.endLine);
}
function dependencyEdgeWhere(block2, line) {
  if (line <= block2.statementEndLine) return "statement";
  if (block2.proofStartLine !== void 0 && block2.proofEndLine !== void 0 && block2.proofStartLine <= line && line <= block2.proofEndLine) {
    return "proof";
  }
  return "body";
}
function dependencyEdgeRelation(line, id) {
  const reference2 = `@${escapeRegExp(id)}(?:\\.(?:title|full))?`;
  const explanatoryLead = "(?:见|参见|详见|参阅|请参见|另见|see(?:\\s+also)?|cf\\.?)";
  return new RegExp(`${explanatoryLead}\\s*${reference2}`, "i").test(line) ? "explanatory" : "strict";
}
function dependencyGraphNode(def, config2) {
  const label = def.label;
  const node = {
    id: def.id,
    kind: def.type,
    display: displayLabel(def, config2),
    title: def.title || "",
    path: def.file,
    line: def.line,
    endLine: typeof label.endLine === "number" ? label.endLine + 1 : void 0,
    bookKey: label.bookKey,
    bookTitle: label.bookTitle,
    bookOrder: label.bookOrder,
    volumeKey: label.volumeKey,
    volumeTitle: label.volumeTitle,
    volumeOrder: label.volumeOrder,
    unitKind: label.unitKind,
    unitKey: label.unitKey,
    unitLabel: label.unitLabel,
    unitOrder: label.unitOrder,
    chapter: label.chapter,
    appendix: label.appendix,
    number: label.number
  };
  Object.keys(node).forEach((key) => {
    if (node[key] === void 0) delete node[key];
  });
  return node;
}
function dependencyGraphCycles(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = /* @__PURE__ */ new Map();
  for (const node of nodes) adjacency.set(node.id, /* @__PURE__ */ new Set());
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).add(edge.to);
    }
  }
  let index = 0;
  const indexes = /* @__PURE__ */ new Map();
  const lowlinks = /* @__PURE__ */ new Map();
  const stack = [];
  const onStack = /* @__PURE__ */ new Set();
  const cycles = [];
  const strongConnect = (id) => {
    indexes.set(id, index);
    lowlinks.set(id, index);
    index++;
    stack.push(id);
    onStack.add(id);
    for (const next of adjacency.get(id) || []) {
      if (!indexes.has(next)) {
        strongConnect(next);
        lowlinks.set(id, Math.min(lowlinks.get(id) || 0, lowlinks.get(next) || 0));
      } else if (onStack.has(next)) {
        lowlinks.set(id, Math.min(lowlinks.get(id) || 0, indexes.get(next) || 0));
      }
    }
    if (lowlinks.get(id) !== indexes.get(id)) return;
    const component = [];
    while (stack.length > 0) {
      const item = stack.pop();
      onStack.delete(item);
      component.push(item);
      if (item === id) break;
    }
    const hasSelfLoop = component.length === 1 && (adjacency.get(component[0]) || /* @__PURE__ */ new Set()).has(component[0]);
    if (component.length > 1 || hasSelfLoop) {
      const ids = component.sort((a, b) => (nodeById.get(a)?.display || a).localeCompare(nodeById.get(b)?.display || b));
      cycles.push({
        ids,
        displays: ids.map((item) => nodeById.get(item)?.display || item)
      });
    }
  };
  for (const node of nodes) {
    if (!indexes.has(node.id)) strongConnect(node.id);
  }
  return cycles.sort((a, b) => a.displays.join(" -> ").localeCompare(b.displays.join(" -> ")));
}
function buildDependencyGraph(state, documents) {
  const config2 = state.config || mergeConfig(DEFAULT_CONFIG);
  const definitions = state.definitions || [];
  const references = state.references || [];
  const dependencyDefinitions = definitions.filter((def) => def.id && DEPENDENCY_NODE_TYPES.has(def.type)).sort(compareDefinitionRecords);
  const nodeById = new Map(dependencyDefinitions.map((def) => [def.id, dependencyGraphNode(def, config2)]));
  const blocksByFile = dependencySourceBlocks(dependencyDefinitions, documents);
  const linesByFile = new Map(documents.map((document) => [toPosix(document.filePath), (document.content || "").split(/\r?\n/)]));
  const sourceReferences = /* @__PURE__ */ new Map();
  const edges = [];
  const ambientReferences = [];
  const diagnostics = [];
  const pedagogicalLinks = dependencyDefinitions.filter((def) => def.type === "solution" && state.labels?.[def.label.solutionOf || ""]?.type === "exercise").map((def) => ({ solution: def.id, exercise: def.label.solutionOf }));
  for (const ref of references) {
    const sourceBlock = findDependencySourceBlock(blocksByFile.get(ref.file), ref.line);
    if (sourceBlock && ref.line === sourceBlock.startLine && pedagogicalLinks.some((link2) => link2.solution === sourceBlock.id && link2.exercise === ref.id)) continue;
    if (sourceBlock) {
      const targets = sourceReferences.get(sourceBlock.id) || /* @__PURE__ */ new Set();
      targets.add(ref.id);
      sourceReferences.set(sourceBlock.id, targets);
    }
    const target = nodeById.get(ref.id);
    if (!target) continue;
    if (!sourceBlock) {
      ambientReferences.push({ to: ref.id, path: ref.file, line: ref.line });
      diagnostics.push({
        severity: "info",
        code: "ambient-dependency-ref",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} targets a dependency node but is outside a dependency statement/proof block.`
      });
      continue;
    }
    const sourceNode = nodeById.get(sourceBlock.id);
    const pedagogical = isPedagogicalKind(sourceNode?.kind || "") || isPedagogicalKind(target.kind);
    if (isMainlineKind(sourceNode?.kind || "") && isPedagogicalKind(target.kind)) {
      diagnostics.push({
        severity: "warn",
        code: "mainline-references-exercise",
        file: ref.file,
        line: ref.line,
        message: "A mainline result references an exercise or solution. Keep any required claim and proof in the main text."
      });
    }
    const where = dependencyEdgeWhere(sourceBlock, ref.line);
    const sourceLine = linesByFile.get(ref.file)?.[ref.line - 1] || "";
    edges.push({
      from: sourceBlock.id,
      to: ref.id,
      kind: "explicit_ref",
      layer: pedagogical ? "pedagogical" : "mathematical",
      where,
      relation: where === "body" ? "explanatory" : dependencyEdgeRelation(sourceLine, ref.id),
      path: ref.file,
      line: ref.line
    });
  }
  for (const [id, targets] of sourceReferences) {
    const node = nodeById.get(id);
    if (node) node.sourceReferenceCount = targets.size;
  }
  const nodes = [...nodeById.values()].sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0) || (a.volumeOrder || 0) - (b.volumeOrder || 0) || (a.unitOrder || 0) - (b.unitOrder || 0) || a.path.localeCompare(b.path) || a.line - b.line);
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
  }
  const cycles = dependencyGraphCycles(nodes, edges);
  const isCrossBook = (edge) => (nodeById.get(edge.from)?.bookKey || "") !== (nodeById.get(edge.to)?.bookKey || "");
  const isCrossVolume = (edge) => (nodeById.get(edge.from)?.volumeKey || "") !== (nodeById.get(edge.to)?.volumeKey || "");
  const isCrossChapter = (edge) => (nodeById.get(edge.from)?.unitKey || "") !== (nodeById.get(edge.to)?.unitKey || "");
  const isTheoremLikeEdge = (edge) => isMainlineKind(nodeById.get(edge.from)?.kind || "") && isMainlineKind(nodeById.get(edge.to)?.kind || "");
  return {
    schemaVersion: 1,
    generatedBy: "math-workspace",
    nodes,
    edges,
    pedagogicalLinks,
    ambientReferences,
    cycles,
    diagnostics,
    summary: {
      nodes: nodes.length,
      theoremLikeNodes: nodes.filter((node) => isMainlineKind(node.kind)).length,
      pedagogicalNodes: nodes.filter((node) => isPedagogicalKind(node.kind)).length,
      pedagogicalEdges: edges.filter((edge) => edge.layer === "pedagogical").length,
      supplementalRemarkNodes: nodes.filter((node) => node.kind === "remark").length,
      edges: edges.length,
      theoremLikeEdges: edges.filter(isTheoremLikeEdge).length,
      supplementalRemarkEdges: edges.filter((edge) => edge.layer !== "pedagogical" && !isTheoremLikeEdge(edge)).length,
      isolated: nodes.filter((node) => (incoming.get(node.id) || 0) === 0 && (outgoing.get(node.id) || 0) === 0).length,
      cycles: cycles.length,
      crossBookEdges: edges.filter(isCrossBook).length,
      crossVolumeEdges: edges.filter(isCrossVolume).length,
      crossChapterEdges: edges.filter(isCrossChapter).length,
      statementEdges: edges.filter((edge) => edge.where === "statement").length,
      proofEdges: edges.filter((edge) => edge.where === "proof").length,
      bodyEdges: edges.filter((edge) => edge.where === "body").length
    }
  };
}
function dependencyNodeById(graph) {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}
function dependencyDegreeRows(graph, direction, edges = graph.edges) {
  const nodeById = dependencyNodeById(graph);
  const counts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    const id = direction === "incoming" ? edge.to : edge.from;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ node: nodeById.get(id), count })).filter((row) => row.node && row.count > 0).sort((a, b) => b.count - a.count || a.node.display.localeCompare(b.node.display));
}
function dependencyNodeLocation(node) {
  return `${node.path}:${node.line}`;
}
function dependencyNodeTitle(node) {
  return `${node.display}${node.title ? ` ${node.title}` : ""}`;
}
function isSupplementalRemarkNode(node) {
  return node?.kind === "remark";
}
function dependencyNodeKindLabel(node) {
  return isPedagogicalKind(node.kind) ? node.kind === "exercise" ? "Exercise" : "Solution" : isSupplementalRemarkNode(node) ? "Supplemental remark" : "Theorem-like";
}
function pushLimitedRows(lines, rows, limit, render, moreRow) {
  rows.slice(0, limit).forEach((row) => lines.push(render(row)));
  if (rows.length > limit) {
    const remaining = rows.length - limit;
    lines.push(moreRow ? moreRow(remaining) : `| ... | ... | ${remaining} more |`);
  }
}
function renderDependencyReport(graph) {
  const nodeById = dependencyNodeById(graph);
  const lines = [
    "# Dependency Graph Report",
    "",
    "Generated by `npm run workspace -- prepare`. The canonical data is `.math-workspace/dependency-graph.json`.",
    "",
    "## Summary",
    "",
    `- Nodes: ${graph.summary.nodes}`,
    `- Theorem-like nodes: ${graph.summary.theoremLikeNodes}`,
    `- Supplemental fact remarks: ${graph.summary.supplementalRemarkNodes}`,
    `- Exercises and solutions: ${graph.summary.pedagogicalNodes || 0}`,
    `- Pedagogical reference edges: ${graph.summary.pedagogicalEdges || 0}`,
    `- Solution associations (excluded from proof cycles): ${graph.pedagogicalLinks?.length || 0}`,
    `- Explicit edges: ${graph.summary.edges}`,
    `- Mainline theorem-like edges: ${graph.summary.theoremLikeEdges}`,
    `- Edges involving supplemental remarks: ${graph.summary.supplementalRemarkEdges}`,
    `- Statement edges: ${graph.summary.statementEdges}`,
    `- Proof edges: ${graph.summary.proofEdges}`,
    `- Body edges: ${graph.summary.bodyEdges}`,
    `- Cross-chapter edges: ${graph.summary.crossChapterEdges}`,
    `- Cross-volume edges: ${graph.summary.crossVolumeEdges}`,
    `- Cross-book edges: ${graph.summary.crossBookEdges}`,
    `- Isolated nodes: ${graph.summary.isolated}`,
    `- Cycles: ${graph.summary.cycles}`,
    ""
  ];
  const mathematicalEdges = graph.edges.filter((edge) => edge.layer !== "pedagogical");
  const outgoing = dependencyDegreeRows(graph, "outgoing", mathematicalEdges);
  lines.push("## High Outgoing Dependencies", "");
  if (outgoing.length === 0) {
    lines.push("No outgoing dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(lines, outgoing, 20, (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(row.node.display)} ${escapeTable(row.node.title || "")} | \`${dependencyNodeLocation(row.node)}\` |`);
    lines.push("");
  }
  const incoming = dependencyDegreeRows(graph, "incoming", mathematicalEdges);
  lines.push("## High Incoming Dependencies", "");
  if (incoming.length === 0) {
    lines.push("No incoming dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(lines, incoming, 20, (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(row.node.display)} ${escapeTable(row.node.title || "")} | \`${dependencyNodeLocation(row.node)}\` |`);
    lines.push("");
  }
  const crossScopeEdges = graph.edges.filter((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    return from && to && ((from.bookKey || "") !== (to.bookKey || "") || (from.volumeKey || "") !== (to.volumeKey || "") || (from.unitKey || "") !== (to.unitKey || ""));
  });
  lines.push("## Cross-Scope Edges", "");
  if (crossScopeEdges.length === 0) {
    lines.push("No cross-scope dependency edges.", "");
  } else {
    lines.push("| Where | From | To | Reference |");
    lines.push("| --- | --- | --- | --- |");
    pushLimitedRows(lines, crossScopeEdges, 50, (edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      return `| ${edge.where} | ${escapeTable(from?.display || edge.from)} ${escapeTable(from?.title || "")} | ${escapeTable(to?.display || edge.to)} ${escapeTable(to?.title || "")} | \`${edge.path}:${edge.line}\` |`;
    });
    lines.push("");
  }
  lines.push("## Cycles", "");
  if (graph.cycles.length === 0) {
    lines.push("No dependency cycles found.", "");
  } else {
    lines.push("| Cycle |");
    lines.push("| --- |");
    pushLimitedRows(lines, graph.cycles, 50, (cycle) => `| ${escapeTable(cycle.displays.join(" -> "))} |`, (remaining) => `| ... ${remaining} more |`);
    lines.push("");
  }
  const incomingCounts = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoingCounts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) {
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) || 0) + 1);
    outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) || 0) + 1);
  }
  const isolated = graph.nodes.filter((node) => (incomingCounts.get(node.id) || 0) === 0 && (outgoingCounts.get(node.id) || 0) === 0);
  const isolatedTheoremLike = isolated.filter((node) => isMainlineKind(node.kind));
  const isolatedRemarks = isolated.filter(isSupplementalRemarkNode);
  lines.push("## Isolated Nodes", "");
  lines.push(`- Mainline theorem-like: ${isolatedTheoremLike.length}`);
  lines.push(`- Supplemental remarks: ${isolatedRemarks.length}`, "");
  if (isolated.length === 0) {
    lines.push("No isolated dependency nodes.", "");
  } else {
    lines.push("| Kind | Node | Location |");
    lines.push("| --- | --- | --- |");
    pushLimitedRows(lines, isolated, 100, (node) => `| ${dependencyNodeKindLabel(node)} | ${escapeTable(node.display)} ${escapeTable(node.title || "")} | \`${dependencyNodeLocation(node)}\` |`);
    lines.push("");
  }
  if (graph.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    lines.push("| Code | Location | Message |");
    lines.push("| --- | --- | --- |");
    pushLimitedRows(lines, graph.diagnostics, 100, (diagnostic) => {
      const location = diagnostic.file ? `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""}` : "workspace";
      return `| ${diagnostic.code} | \`${location}\` | ${escapeTable(diagnostic.message)} |`;
    });
    lines.push("");
  }
  return `${lines.join("\n")}
`;
}
function dependencyWhereMatches(edge, where = "all") {
  return where === "all" || edge.where === where;
}
function filteredDependencyEdges(graph, where = "all") {
  return graph.edges.filter((edge) => dependencyWhereMatches(edge, where));
}
function dependencyWhereSuffix(where = "all") {
  return where === "all" ? "" : ` (${where} edges only)`;
}
function dependencyFilteredSummary(graph, where = "all") {
  const edges = filteredDependencyEdges(graph, where);
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, 0]));
  const nodeById = dependencyNodeById(graph);
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
  }
  const isCrossBook = (edge) => (nodeById.get(edge.from)?.bookKey || "") !== (nodeById.get(edge.to)?.bookKey || "");
  const isCrossVolume = (edge) => (nodeById.get(edge.from)?.volumeKey || "") !== (nodeById.get(edge.to)?.volumeKey || "");
  const isCrossChapter = (edge) => (nodeById.get(edge.from)?.unitKey || "") !== (nodeById.get(edge.to)?.unitKey || "");
  const isTheoremLikeEdge = (edge) => isMainlineKind(nodeById.get(edge.from)?.kind || "") && isMainlineKind(nodeById.get(edge.to)?.kind || "");
  const cycles = dependencyGraphCycles(graph.nodes, edges);
  return {
    edges,
    incoming,
    outgoing,
    cycles,
    isolated: graph.nodes.filter((node) => (incoming.get(node.id) || 0) === 0 && (outgoing.get(node.id) || 0) === 0),
    theoremLikeEdges: edges.filter(isTheoremLikeEdge).length,
    supplementalRemarkEdges: edges.filter((edge) => edge.layer !== "pedagogical" && !isTheoremLikeEdge(edge)).length,
    crossBookEdges: edges.filter(isCrossBook).length,
    crossVolumeEdges: edges.filter(isCrossVolume).length,
    crossChapterEdges: edges.filter(isCrossChapter).length,
    statementEdges: edges.filter((edge) => edge.where === "statement").length,
    proofEdges: edges.filter((edge) => edge.where === "proof").length,
    bodyEdges: edges.filter((edge) => edge.where === "body").length
  };
}
function pushDependencyEdgeTable(lines, graph, edges, limit = 100) {
  const nodeById = dependencyNodeById(graph);
  if (edges.length === 0) {
    lines.push("No dependency edges.", "");
    return;
  }
  lines.push("| Where | From | To | Reference |");
  lines.push("| --- | --- | --- | --- |");
  const sorted2 = [...edges].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || (nodeById.get(a.from)?.display || a.from).localeCompare(nodeById.get(b.from)?.display || b.from) || (nodeById.get(a.to)?.display || a.to).localeCompare(nodeById.get(b.to)?.display || b.to));
  pushLimitedRows(lines, sorted2, limit, (edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    return `| ${edge.where} | ${escapeTable(from ? dependencyNodeTitle(from) : edge.from)} | ${escapeTable(to ? dependencyNodeTitle(to) : edge.to)} | \`${edge.path}:${edge.line}\` |`;
  });
  lines.push("");
}
function renderDependencyGraphSummary(graph, where = "all") {
  const summary = dependencyFilteredSummary(graph, where);
  const lines = [
    `# Dependency Graph Summary${dependencyWhereSuffix(where)}`,
    "",
    `- Nodes: ${graph.nodes.length}`,
    `- Theorem-like nodes: ${graph.summary.theoremLikeNodes}`,
    `- Supplemental fact remarks: ${graph.summary.supplementalRemarkNodes}`,
    `- Exercises and solutions: ${graph.summary.pedagogicalNodes || 0}`,
    `- Pedagogical reference edges: ${graph.summary.pedagogicalEdges || 0}`,
    `- Solution associations (excluded from proof cycles): ${graph.pedagogicalLinks?.length || 0}`,
    `- Explicit edges: ${summary.edges.length}`,
    `- Mainline theorem-like edges: ${summary.theoremLikeEdges}`,
    `- Edges involving supplemental remarks: ${summary.supplementalRemarkEdges}`,
    `- Statement edges: ${summary.statementEdges}`,
    `- Proof edges: ${summary.proofEdges}`,
    `- Body edges: ${summary.bodyEdges}`,
    `- Cross-chapter edges: ${summary.crossChapterEdges}`,
    `- Cross-volume edges: ${summary.crossVolumeEdges}`,
    `- Cross-book edges: ${summary.crossBookEdges}`,
    `- Isolated nodes: ${summary.isolated.length}`,
    `- Cycles: ${summary.cycles.length}`,
    ""
  ];
  const outgoing = dependencyDegreeRows(graph, "outgoing", summary.edges);
  lines.push("## Top Outgoing", "");
  if (outgoing.length === 0) {
    lines.push("No outgoing dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(
      lines,
      outgoing,
      10,
      (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`,
      (remaining) => `| ... | ... | ... | ${remaining} more |`
    );
    lines.push("");
  }
  const incoming = dependencyDegreeRows(graph, "incoming", summary.edges);
  lines.push("## Top Incoming", "");
  if (incoming.length === 0) {
    lines.push("No incoming dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(
      lines,
      incoming,
      10,
      (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`,
      (remaining) => `| ... | ... | ... | ${remaining} more |`
    );
    lines.push("");
  }
  return `${lines.join("\n")}
`;
}
function dependencyReachable(graph, rootId, direction, where = "all", maxDepth = Number.POSITIVE_INFINITY) {
  const nodeById = dependencyNodeById(graph);
  if (!nodeById.has(rootId)) return [];
  const adjacency = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) adjacency.set(node.id, /* @__PURE__ */ new Set());
  for (const edge of filteredDependencyEdges(graph, where)) {
    if (direction === "upstream") {
      adjacency.get(edge.from)?.add(edge.to);
    } else {
      adjacency.get(edge.to)?.add(edge.from);
    }
  }
  if (direction === "impact") for (const link2 of graph.pedagogicalLinks || []) {
    adjacency.get(link2.exercise)?.add(link2.solution);
    adjacency.get(link2.solution)?.add(link2.exercise);
  }
  const visited = /* @__PURE__ */ new Map([[rootId, 0]]);
  const queue = [rootId];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const currentDepth = visited.get(current) || 0;
    if (currentDepth >= maxDepth) continue;
    for (const next of adjacency.get(current) || []) {
      if (visited.has(next)) continue;
      visited.set(next, currentDepth + 1);
      queue.push(next);
    }
  }
  return [...visited.entries()].filter(([id]) => id !== rootId).map(([id, depth]) => ({ node: nodeById.get(id), depth })).filter((row) => row.node).sort((a, b) => a.depth - b.depth || dependencyNodeLocation(a.node).localeCompare(dependencyNodeLocation(b.node)));
}
function renderDependencyNodeHeader(title, graph, id, where) {
  const node = dependencyNodeById(graph).get(id);
  const lines = [`# ${title}${dependencyWhereSuffix(where)}`, ""];
  if (!node) {
    lines.push(`Node \`${id}\` was not found in dependency graph.`, "");
    return lines;
  }
  lines.push(`- Node: ${dependencyNodeTitle(node)}`);
  lines.push(`- ID: \`${node.id}\``);
  lines.push(`- Location: \`${dependencyNodeLocation(node)}\``);
  lines.push("");
  return lines;
}
function pushDependencyNodeRows(lines, rows) {
  if (rows.length === 0) {
    lines.push("No nodes.", "");
    return;
  }
  lines.push("| Depth | Node | Location |");
  lines.push("| ---: | --- | --- |");
  pushLimitedRows(lines, rows, 200, (row) => `| ${row.depth} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`);
  lines.push("");
}
function renderDependencyGraphImpact(graph, id, where = "all") {
  const lines = renderDependencyNodeHeader("Dependency Impact Closure", graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const rows = dependencyReachable(graph, id, "impact", where);
  lines.push(`Downstream impacted nodes: ${rows.length}`, "");
  pushDependencyNodeRows(lines, rows);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphUpstream(graph, id, where = "all") {
  const lines = renderDependencyNodeHeader("Dependency Upstream Closure", graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const rows = dependencyReachable(graph, id, "upstream", where);
  lines.push(`Upstream dependency nodes: ${rows.length}`, "");
  pushDependencyNodeRows(lines, rows);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphFocus(graph, id, depth = 2, where = "all") {
  const safeDepth = Math.max(1, Math.floor(depth || 2));
  const lines = renderDependencyNodeHeader(`Dependency Focus Depth ${safeDepth}`, graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const upstream = dependencyReachable(graph, id, "upstream", where, safeDepth);
  const impact = dependencyReachable(graph, id, "impact", where, safeDepth);
  lines.push("## Upstream", "");
  pushDependencyNodeRows(lines, upstream);
  lines.push("## Downstream Impact", "");
  pushDependencyNodeRows(lines, impact);
  const focusIds = /* @__PURE__ */ new Set([id, ...upstream.map((row) => row.node.id), ...impact.map((row) => row.node.id)]);
  const focusEdges = filteredDependencyEdges(graph, where).filter((edge) => focusIds.has(edge.from) && focusIds.has(edge.to));
  lines.push("## Local Edges", "");
  pushDependencyEdgeTable(lines, graph, focusEdges, 200);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphIsolated(graph, where = "all") {
  const summary = dependencyFilteredSummary(graph, where);
  const theoremLike = summary.isolated.filter((node) => isMainlineKind(node.kind));
  const remarks = summary.isolated.filter(isSupplementalRemarkNode);
  const lines = [
    `# Isolated Dependency Nodes${dependencyWhereSuffix(where)}`,
    "",
    `Isolated nodes: ${summary.isolated.length}`,
    `- Mainline theorem-like: ${theoremLike.length}`,
    `- Supplemental remarks: ${remarks.length}`,
    ""
  ];
  if (summary.isolated.length === 0) {
    lines.push("No isolated dependency nodes.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Kind | Node | Location |");
  lines.push("| --- | --- | --- |");
  pushLimitedRows(lines, summary.isolated, 500, (node) => `| ${dependencyNodeKindLabel(node)} | ${escapeTable(dependencyNodeTitle(node))} | \`${dependencyNodeLocation(node)}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphCycles(graph, where = "all") {
  const cycles = dependencyGraphCycles(graph.nodes, filteredDependencyEdges(graph, where));
  const lines = [`# Dependency Cycles${dependencyWhereSuffix(where)}`, "", `Cycles: ${cycles.length}`, ""];
  if (cycles.length === 0) {
    lines.push("No dependency cycles found.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Cycle | IDs |");
  lines.push("| --- | --- |");
  pushLimitedRows(lines, cycles, 200, (cycle) => `| ${escapeTable(cycle.displays.join(" -> "))} | \`${cycle.ids.join(" -> ")}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function dependencyScopeLabel(node, scope) {
  const book = node.bookTitle || node.bookKey || "Workspace";
  if (scope === "book") return book;
  const volume = node.volumeTitle || node.volumeKey || "No volume";
  if (scope === "volume") return `${book} / ${volume}`;
  const unit = node.unitKind === "appendix" ? `Appendix ${node.unitLabel || node.appendix || "?"}` : node.unitLabel ? `Chapter ${node.unitLabel}` : node.unitKey || node.path;
  return `${book} / ${volume} / ${unit}`;
}
function renderDependencyGraphMatrix(graph, scope, where = "all") {
  const nodeById = dependencyNodeById(graph);
  const edges = filteredDependencyEdges(graph, where);
  const rowTotals = /* @__PURE__ */ new Map();
  const columnTotals = /* @__PURE__ */ new Map();
  const counts = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const row = dependencyScopeLabel(from, scope);
    const column = dependencyScopeLabel(to, scope);
    rowTotals.set(row, (rowTotals.get(row) || 0) + 1);
    columnTotals.set(column, (columnTotals.get(column) || 0) + 1);
    counts.set(`${row}	${column}`, (counts.get(`${row}	${column}`) || 0) + 1);
  }
  const rows = [...rowTotals.keys()].sort((a, b) => a.localeCompare(b));
  const columns = [...columnTotals.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [`# Dependency Matrix By ${scope}${dependencyWhereSuffix(where)}`, "", `Edges: ${edges.length}`, ""];
  if (rows.length === 0 || columns.length === 0) {
    lines.push("No dependency edges.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push(`| From → To | ${columns.map(escapeTable).join(" | ")} | Total |`);
  lines.push(`| --- | ${columns.map(() => "---:").join(" | ")} | ---: |`);
  for (const row of rows) {
    const values = columns.map((column) => counts.get(`${row}	${column}`) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    lines.push(`| ${escapeTable(row)} | ${values.join(" | ")} | ${total} |`);
  }
  lines.push(`| Total | ${columns.map((column) => columnTotals.get(column) || 0).join(" | ")} | ${edges.length} |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphBridges(graph, where = "all") {
  const edges = filteredDependencyEdges(graph, where).filter((edge) => edge.layer !== "pedagogical");
  const nodeById = dependencyNodeById(graph);
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, 0]));
  const crossScope = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
    if (from && to && ((from.bookKey || "") !== (to.bookKey || "") || (from.volumeKey || "") !== (to.volumeKey || "") || (from.unitKey || "") !== (to.unitKey || ""))) {
      crossScope.set(edge.from, (crossScope.get(edge.from) || 0) + 1);
      crossScope.set(edge.to, (crossScope.get(edge.to) || 0) + 1);
    }
  }
  const rows = graph.nodes.map((node) => ({
    node,
    incoming: incoming.get(node.id) || 0,
    outgoing: outgoing.get(node.id) || 0,
    crossScope: crossScope.get(node.id) || 0
  })).filter((row) => row.incoming > 0 && row.outgoing > 0).sort((a, b) => b.crossScope - a.crossScope || b.incoming + b.outgoing - (a.incoming + a.outgoing) || dependencyNodeTitle(a.node).localeCompare(dependencyNodeTitle(b.node)));
  const theoremLikeRows = rows.filter((row) => isMainlineKind(row.node.kind));
  const remarkRows = rows.filter((row) => isSupplementalRemarkNode(row.node));
  const lines = [
    `# Bridge Candidates${dependencyWhereSuffix(where)}`,
    "",
    "A bridge candidate has both incoming and outgoing explicit dependencies. This is structural only, not a domain judgment.",
    "",
    `Candidates: ${rows.length}`,
    `- Mainline theorem-like: ${theoremLikeRows.length}`,
    `- Supplemental remarks: ${remarkRows.length}`,
    ""
  ];
  if (rows.length === 0) {
    lines.push("No bridge candidates.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Cross-scope | Incoming | Outgoing | Kind | Node | Location |");
  lines.push("| ---: | ---: | ---: | --- | --- | --- |");
  pushLimitedRows(lines, rows, 200, (row) => `| ${row.crossScope} | ${row.incoming} | ${row.outgoing} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderAgentGuide(state) {
  const errors2 = state.issues.filter((issue) => issue.severity === "error").length;
  const warnings = state.issues.filter((issue) => issue.severity !== "error").length;
  const lines = [
    "# Agent Guide",
    "",
    "Generated by `prepare`. This is the compact workflow card for AI agents.",
    "Choose one tool provider: projects installed through Codex use the installed plugin's CLI, Reader and generic skills; independent environments use their selected standalone CLI/npm installation. Keep project configuration, source, review/build evidence and project-specific rules in the project. Do not copy runtime or generic rules merely for Codex integration.",
    "Command examples use `math-workspace` as shorthand for that selected CLI. Prefer the exact Node/CLI entry and working directory supplied by the Reader, or a verified project wrapper; do not silently add another installation, rewrite scripts, or replace native AI rules.",
    "",
    `Current index: ${Object.keys(state.labels).length} formal entries, ${state.pages.length} pages, ${(state.symbols || []).length} symbols, ${errors2} errors, ${warnings} warnings.`,
    "",
    "## Working Loop",
    "",
    "1. Read the target Markdown source. For an existing target outside current context, retrieve only its matching row from `.math-workspace/reference-map.md`.",
    "2. Declare new numbered objects with `#tmp-*`; reference existing objects and pages with `@h-...`, `@h-....title`, or `@h-....full`. Definitions never receive hashes or refs.",
    "3. Preserve Markdown and LaTeX. Do not write display numbers as references or hand-edit generated artifacts.",
    "4. Run `math-workspace finish <file-or-dir>` after editing. It finalizes temporary IDs and verifies the workspace. Use a separate `verify` only after direct `finalize`, migration, or as an explicit release gate.",
    "5. Read `project-analysis.md` only for terminology, concept appendices, or notation work. It is derived context, not a source to maintain.",
    "",
    "## Create a Manuscript Page",
    "",
    "- Read native project rules and check existing manuscripts. Choose `chapter`, `front-matter`, `back-matter`, or `continued` and an exact project-relative book/volume container (`.` for the project root); do not infer a path from a display title.",
    "- Use the same CLI entry for `create-page --kind <kind> --container <container> --title <title> --dry-run --json`. Inspect `filePath`, `exists`, and `stateToken`; create with the same options without `--dry-run`, adding `--expect-state <stateToken>`. Optional `--slug` sets the filename stem except for the fixed-name `continued` page. Refresh an outdated plan; if project, kind, title, container, and filePath are unchanged, continue with its new token. Review a changed destination or reuse an existing manuscript before proceeding.",
    "- The helper assigns the path, order, and stable page ID and refuses overwrites. Write content into the returned file, preserve its page ID, and run `finish <filePath>`. Do not handwrite chapter numbers or hashes, or create a duplicate to bypass an existing manuscript.",
    "- `front-matter/` and `back-matter/` hold multiple independent Markdown pages with any title or genre; their role comes from placement. An AI retirement note may remain titled that way in back matter. `to-be-continued.md` is an independent continued page. Legacy intro/summary pages remain supported.",
    "- The Reader's “＋” reviews a read-only plan and adds a request to the conversation input without sending it; without host support, copy the request. Creation does not select a page for publication. Keep one Markdown source, then explicitly reference it through `frontMatter[].file`, `backMatter[].file`, or `continued.file` when publishing.",
    "",
    "## Extended Reference",
    "",
    "- Sections: `## #h-... Title` renders as the current section number plus title, and links jump to the section without hover recall.",
    "- Numbered objects: `命题 #h-...（Title）：...`, `引理 #h-...`, `定理 #h-...`, `推论 #h-...` share the theorem counter per chapter or appendix.",
    "- Equations, figures, and tables: `公式 #h-...：` binds the next display formula as a numbered equation, `图 #h-...（Title）：...` captions an adjacent standalone image paragraph before or after it, and `表 #h-...（Title）：` captions the following table. Keep a blank line between image and caption; Reader/PDF group them in source order. Static and interactive versions of one figure share its number. They have separate counters per chapter or appendix; equations render as `(1.1)`, appendices as `(A.1)`.",
    "- Chapter/page anchors: put `#h-...` / `#tmp-*` on the file's unique highest-level heading when the page needs stable refs. The hash is hidden in preview and does not create a section number. Use `@h-...`, `@h-....title`, or `@h-....full` from `reference-map.md` to reference the page.",
    "- Compatibility chapter/page refs: `@chapter:book1/02-main.md`, `@chapter:book1/02-main.md.title`, or `@chapter:book1/02-main.md.full` still work; paths are relative to the formal root that owns `.math-workspace/`. `@page:path.md` is for unnumbered pages (including front matter, back matter, continued, intro, and summary) and appendix pages. Prefer page hashes when available. `finish` normalizes `./` and `../` input sugar to root-relative paths.",
    "- Theorem-like recall captures the statement before `证明` / `Proof`; keep proofs after an explicit proof marker.",
    "- Dependency graph: `.math-workspace/dependency-graph.json` is the canonical explicit reference graph. It uses only `@h-...` references between mainline claims, proof-backed hash remarks, exercises and solutions; pedagogical references carry `layer: pedagogical`, while `pedagogicalLinks` keeps solution ownership separate from proof cycles, and marks edges as `statement`, `proof`, or `body`. Edges introduced as explanatory navigation (`见 @h-...`, `参见 @h-...`, or `see @h-...`) are preserved with relation `explanatory`; the Reader relation map excludes them, body references, and self-references from its strict dependency view. `.math-workspace/dependency-report.md` separates mainline theorem-like and supplemental remark statistics. Use `math-workspace graph summary`, `graph impact <h-id>`, `graph upstream <h-id>`, `graph focus <h-id> --depth 2`, `graph bridges`, `graph isolated`, `graph cycles`, or `graph matrix chapter|volume|book` for Markdown analysis. Add `--where statement|proof|body` to filter edge placement. These are structural graph tools, not domain interpretation.",
    "- Definitions and project knowledge: lookup is a tool-first, AI-exception workflow. The tool scans standard `定义（Term）：...` / `Definition (Term): ...` definitions and dedicated concept/glossary pages named by filename or main title; `.math-workspace/project-analysis.md` records detected concept, notation, and summary roles, including combined pages. Prefer the book’s final appendix for concept and notation summaries; reuse existing dedicated pages and follow the book’s appendix order without reserving fixed letters. This placement guidance does not change lookup priority. Do not refresh `.math-workspace/definitions.json` after ordinary edits. Use it only for nonstandard phrases, aliases/bilingual lookup, stable multi-paragraph previews, or a boundary the deterministic extractor cannot represent; include Markdown `content` for those entries. Codex MCP queries return narrow source locators and previews, including all detected roles for a source. Full rendered lookup previews are only guaranteed for definitions in the currently previewed file; cross-file search is primarily for locating and jumping.",
    "- Exercises use `习题 #tmp-e（Title）：...` / `Exercise #tmp-e (Title): ...`, with an independent chapter counter. Solutions use a separate ID and `解答 #tmp-s（对应 @tmp-e）：...` / `Solution #tmp-s (for @tmp-e): ...`; they may live in an appendix near the end of the same book and retain the original exercise number. Order solutions and concept/notation summaries according to the book’s structure. Separate hint/answer paragraphs from the prompt with a blank line. Prompt recall excludes hints and answers; exports include them. Keep stable IDs and Lean declarations when converting existing results; required mainline claims and proofs stay in the main text.",
    "- Explanatory remarks stay plain: `注（Title）：...` / `Remark (Title): ...`, without hash. Non-mainline fact remarks that need a proof or later citation use `注 #tmp-*（Title）：...`; `> 注 #tmp-*（Title）：...` is also recognized inside standard blockquotes. A hash remark is an unnumbered supplemental dependency node and supports recall; a plain remark never enters the dependency graph or Reader dependency markers.",
    "- Independent examples and counterexamples may use `例 #tmp-*` / `Example #tmp-*` and `反例 #tmp-*` / `Counterexample #tmp-*` even without later citations. They share a separate chapter/appendix example counter and never consume theorem numbers. Incidental in-text examples stay plain. Their recall includes all paragraphs, calculations and proof text up to the next formal object, Markdown heading or thematic break; fenced code stays literal. Separate following ordinary prose with a thematic break when needed.",
    "- Symbols: maintain only project-specific `source`, `pattern`, and `meaning` entries in `.math-workspace/symbols.json` when explicit notation semantics change; patterns describe the notation itself with balanced delimiters, not whole equations or open-ended formula fragments. Dedicated notation pages are recognized by filename or main title and supply context only; they do not infer symbol meanings. The navigation symbol table lists symbols matched in the current preview file. Symbols are not inline formula refs and are not searched through the definition search box.",
    "- Appendices use the appendix file prefix, so markers in `appendix-a-*.md` render as `A.1`, `A.2`, etc. `00-introduction.md`, `intro.md`, and `introduction.md` are intro pages, not chapter 0.",
    "- Shared publication metadata belongs in `.math-workspace/config.json.metadata`: work title, structured authors with ORCID/affiliation, website, repository, license and work DOI. Read with `publication metadata`, save with `publication save-metadata <metadata.json> --expected-revision SHA256`, or edit in Reader. Edition profiles store only explicit overrides plus edition version/date/DOI; missing fields inherit, old PDF identity fields are a compatibility fallback. Review and rebuild after metadata changes; frozen PDF, citation and Zenodo values stay bound to that edition.",
    "- New Reader publication plans automatically include matching structural front/back matter and appendices; CLI profiles use `matter.automatic: true` and optional `matter.exclude` paths. Existing plans keep their selection until enabled. Keep volume matter in its volume, preserve appendix numbering and author titles, and review the resolved selection rather than guessing roles from arbitrary prose. Page creation does not rewrite a saved plan; automatic discovery runs during planning.",
    "- Export: do not compile formal source Markdown directly. Use `math-workspace export-md <file-or-dir> --out dist/book.md` to produce one portable Markdown file, `math-workspace export-md-split <file-or-dir> --out dist/public` to produce compiled Markdown files while preserving the source tree, `math-workspace export-pdf <file-or-dir> --out dist/book.pdf` to call local pandoc after Markdown export, or `math-workspace render-pdf dist/book.md --out dist/book.pdf` when a project release flow has already postprocessed the compiled Markdown. PDF rendering reads `.math-workspace/config.json` `pdf` defaults when present: A4, 2.5cm margins, TOC depth 2, language-aware TOC title, separate TOC page, optional title page metadata, optional publication metadata page, and optional front matter pages. `author` is the cover/PDF metadata author; fuller identity fields are `authorNative`, `authorAliases`, `orcid`, `repository`, `license`, `licenseUrl`, `preferredCitation`, `releaseTag`, `releaseCommit`, and `doi`. When `metadataPage` is true, the generated metadata page is unnumbered, unlisted, and placed after the title page but before the table of contents. Longer AI, license, citation, or provenance statements belong in `frontMatter`, placed after metadata and before the TOC; front matter entries use `source` or `content`, default to `toc: false`, and default to page breaks. Override with `--title`, `--subtitle`, `--author`, `--author-native`, `--author-alias`, `--orcid`, `--repository`, `--license`, `--license-url`, `--preferred-citation`, `--date`, `--release-version`, `--release-tag`, `--release-commit`, `--doi`, `--metadata-page`, `--front-matter`, `--front-matter-title`, `--front-matter-toc`, `--documentclass`, `--title-page`, `--margin`, `--no-toc`, `--toc-depth`, `--paper`, or Pandoc `-V key:value`. No PDF engine is bundled.",
    "",
    "## Generated Files",
    "",
    "- `.math-workspace/reference-map.md`: compact display-number, page-anchor, and unnumbered-anchor to hash-ID table.",
    "- `.math-workspace/workspace-index.json`: machine-readable formal entry, page, definition, and symbol snapshot for local reader tooling.",
    "- `.math-workspace/dependency-graph.json`: canonical graph for theorem-like objects and proof-backed hash remarks, from explicit `@h-...` references.",
    "- `.math-workspace/dependency-report.md`: human/AI dependency graph review report.",
    "- `.math-workspace/project-analysis.json` / `.math-workspace/project-analysis.md`: generated detection of concept/glossary, notation, and summary pages, plus supplemental concept entries. This is derived context, not a hand-maintained source table.",
    "- `.math-workspace/report.md`: lint/verify details.",
    "- `.math-workspace/audit.md`: advisory AI cleanup list generated by `audit`.",
    "- `.math-workspace/text-ref-migration.md`: generated only after text-reference migration.",
    "- `.math-workspace/definitions.json` / `.math-workspace/symbols.json`: optional reviewed source tables for definition lookup overrides and project-specific notation.",
    "- `.math-workspace/config.json`: explicit formal-project configuration. Use `scan.exclude` when project-root scans must ignore build, draft, context, or generated Markdown directories; use `lookup.bookDependencies` to permit intentional cross-book lookups and refs. The Reader scans project content in memory and remains opt-in through this config.",
    "",
    "## Migration",
    "",
    "- Use `math-workspace migrate-text-refs <file-or-dir>` before applying old numbered prose migration; migration commands are dry-run by default.",
    "- `migrate-text-refs` rewrites typed old references such as `定理 2.1`, `命题2.2`, `Theorem 2.1`, `公式 (2.1)`, `Figure 2.1`, `表 2.1`, `§2.1`, or `第 2.1 节`. It intentionally does not rewrite bare `2.1`, bare `(2.1)`, or handwritten chapter refs such as `第 2 章`; decide those by reading context and convert chapter refs to page hashes `@h-...` when available, otherwise to compatibility `@chapter:path.md`. Matching is bounded so `2.1` is not replaced inside `2.12`, `2.1.3`, or `22.1`.",
    "- Scoped migrations update target files plus incoming references by default. Use `--target-only` only when intentionally restricting rewrites to the target files.",
    ""
  ];
  return `${lines.join("\n")}
`;
}
function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function renderReport(state) {
  const errors2 = state.issues.filter((issue) => issue.severity === "error");
  const warnings = state.issues.filter((issue) => issue.severity !== "error");
  const lines = [
    "# math-workspace Report",
    "",
    `Labels: ${Object.keys(state.labels).length}`,
    `Pages: ${state.pages.length}`,
    `Symbols: ${(state.symbols || []).length}`,
    `Errors: ${errors2.length}`,
    `Warnings: ${warnings.length}`,
    ""
  ];
  if (errors2.length > 0) {
    lines.push("## Errors", "");
    errors2.forEach((issue) => lines.push(formatIssue(issue)));
    lines.push("");
  }
  if (warnings.length > 0) {
    lines.push("## Warnings", "");
    warnings.forEach((issue) => lines.push(formatIssue(issue)));
    lines.push("");
  }
  if (errors2.length === 0 && warnings.length === 0) {
    lines.push("No issues found.", "");
  }
  return `${lines.join("\n")}
`;
}
function formatIssue(issue) {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file || "workspace";
  return `- [${issue.code}] ${location}: ${issue.message}`;
}
const fs$7 = require("node:fs/promises");
const sha256 = (value) => crypto__namespace.createHash("sha256").update(value).digest("hex");
function canonical(value) {
  const sort = (item) => Array.isArray(item) ? item.map(sort) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().filter((key) => item[key] !== void 0).map((key) => [key, sort(item[key])])) : item;
  return `${JSON.stringify(sort(value), null, 2)}
`;
}
function publicationId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) throw new Error("Invalid publication identity.");
  return value;
}
function buildId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/.test(value)) throw new Error("Invalid publication build identity.");
  return value;
}
function relativeInput(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || /[\u0000-\u001f]/.test(value) || path__namespace.isAbsolute(value) || value.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Publication paths must be normalized files inside the project.");
  return value;
}
async function safePath(root, relative) {
  relativeInput(relative);
  let current = root;
  for (const component of relative.split("/")) {
    current = path__namespace.join(current, component);
    try {
      if ((await fs$7.lstat(current)).isSymbolicLink()) throw new Error("Publication paths cannot follow symbolic links.");
    } catch (error2) {
      if (error2.code !== "ENOENT") throw error2;
    }
  }
  return current;
}
async function optionalJson(file) {
  try {
    return JSON.parse(await fs$7.readFile(file, "utf8"));
  } catch (error2) {
    if (error2.code === "ENOENT") return null;
    throw error2;
  }
}
async function atomicJson$1(root, relative, value) {
  const destination = await safePath(root, relative);
  await fs$7.mkdir(path__namespace.dirname(destination), { recursive: true });
  await safePath(root, relative);
  const temporary2 = `${destination}.tmp-${crypto__namespace.randomBytes(12).toString("hex")}`;
  try {
    await fs$7.writeFile(temporary2, canonical(value), { flag: "wx", mode: 384 });
    await fs$7.rename(temporary2, destination);
  } finally {
    await fs$7.rm(temporary2, { force: true });
  }
}
class PublicationStore {
  constructor(root) {
    this.relativeDirectory = ".math-workspace/publications";
    this.root = path__namespace.resolve(root);
  }
  async directory(relative = "") {
    return safePath(this.root, `${this.relativeDirectory}${relative ? `/${relative}` : ""}`);
  }
  async locked(id, action, namespace = "profile") {
    publicationId(id);
    const parent = await this.directory(`locks/${namespace}`);
    await fs$7.mkdir(parent, { recursive: true });
    const lock = await this.directory(`locks/${namespace}/${id}`);
    try {
      await fs$7.mkdir(lock);
    } catch (error2) {
      if (error2.code !== "EEXIST") throw error2;
      const recovery = await this.directory(`lock-recovery/${namespace}/${id}`);
      await fs$7.mkdir(path__namespace.dirname(recovery), { recursive: true });
      try {
        await fs$7.mkdir(recovery);
      } catch {
        throw new Error("This publication has an active operation or lock recovery. Retry after it finishes.");
      }
      let stale;
      try {
        const owner = await optionalJson(await safePath(lock, "owner.json"));
        if (!Number.isInteger(owner?.pid) || owner.pid < 1) throw new Error("The publication lock has no valid owner. Inspect the interrupted local operation before recovering its lock.");
        try {
          process.kill(owner.pid, 0);
          throw new Error("This publication has an active operation. Retry after it finishes.");
        } catch (probe) {
          if (probe.code !== "ESRCH") throw probe;
        }
        stale = `${lock}.stale-${crypto__namespace.randomBytes(12).toString("hex")}`;
        await fs$7.rename(lock, stale);
        try {
          await fs$7.mkdir(lock);
        } catch {
          throw new Error("Another publication operation acquired the recovered lock. Retry after it finishes.");
        }
      } finally {
        if (stale) await fs$7.rm(stale, { recursive: true, force: true });
        await fs$7.rm(recovery, { recursive: true, force: true });
      }
    }
    try {
      await fs$7.writeFile(path__namespace.join(lock, "owner.json"), canonical({ pid: process.pid, startedAt: (/* @__PURE__ */ new Date()).toISOString() }), { flag: "wx", mode: 384 });
      return await action();
    } finally {
      await fs$7.rm(lock, { recursive: true, force: true });
    }
  }
  async profile(id) {
    const value = await optionalJson(await this.directory(`profiles/${publicationId(id)}.json`));
    if (value && (value.profile?.id !== id || !Number.isInteger(value.revision) || value.revision < 1)) throw new Error("Invalid publication profile record.");
    return value;
  }
  async profiles() {
    const directory = await this.directory("profiles");
    let names;
    try {
      names = await fs$7.readdir(directory);
    } catch (error2) {
      if (error2.code === "ENOENT") return [];
      throw error2;
    }
    const records = [];
    for (const name of names.sort()) if (/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}\.json$/.test(name)) records.push(await this.profile(name.slice(0, -5)));
    return records.filter(Boolean);
  }
  async expectProfile(id, revision) {
    const value = await this.profile(id);
    if (!value || value.revision !== revision) throw new Error("The publication profile changed. Reload and review it again.");
    return value;
  }
  async save(profile, expectedRevision) {
    return this.locked(profile.id, async () => {
      const previous = await this.profile(profile.id);
      if ((previous?.revision ?? null) !== expectedRevision) throw new Error("The publication profile changed. Reload and review it again.");
      if (previous && previous.profile.workId !== profile.workId) throw new Error("A publication profile must retain the stable work identity.");
      const remote = await this.remote(profile.id);
      if (remote && remote.environment !== (profile.zenodo?.environment || "sandbox")) throw new Error("The existing work is bound to another Zenodo environment. Keep this profile on its established work entry.");
      const record = { profile, revision: (previous?.revision || 0) + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await atomicJson$1(this.root, `${this.relativeDirectory}/profiles/${profile.id}.json`, record);
      return record;
    });
  }
  async remote(id) {
    const value = await optionalJson(await this.directory(`remote/${publicationId(id)}.json`));
    if (value && (value.schema !== "math-workspace.publication-zenodo/v1" || !Number.isInteger(value.revision) || value.revision < 1)) throw new Error("Invalid publication provider record.");
    return value;
  }
  async writeRemote(id, value) {
    const previous = await this.remote(id);
    const next = { ...value, revision: (previous?.revision || 0) + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await atomicJson$1(this.root, `${this.relativeDirectory}/remote/${publicationId(id)}.json`, next);
    return next;
  }
  async verifications(id) {
    const directory = await this.directory(`verifications/${publicationId(id)}`);
    let names;
    try {
      names = await fs$7.readdir(directory);
    } catch (error2) {
      if (error2.code === "ENOENT") return [];
      throw error2;
    }
    const values = [];
    for (const name of names.sort()) if (/^[a-f0-9]{32}\.json$/.test(name)) {
      const value = await optionalJson(await safePath(directory, name));
      if (value?.schema !== "math-workspace.publication-verification/v1" || value.profileId !== id || value.buildId !== name.slice(0, -5)) throw new Error("Invalid publication verification record.");
      values.push(value);
    }
    return values.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }
  async writeVerification(value) {
    await atomicJson$1(this.root, `${this.relativeDirectory}/verifications/${publicationId(value.profileId)}/${buildId(value.buildId)}.json`, value);
  }
  async builds(id) {
    const directory = await this.directory(`builds/${publicationId(id)}`);
    let names;
    try {
      names = await fs$7.readdir(directory);
    } catch (error2) {
      if (error2.code === "ENOENT") return [];
      throw error2;
    }
    const values = [];
    for (const name of names.sort()) if (/^[a-f0-9]{32}$/.test(name)) values.push(await this.build(id, name));
    return values.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async build(id, release) {
    const file = await this.directory(`builds/${publicationId(id)}/${buildId(release)}/build.json`);
    const value = await optionalJson(file);
    if (!value || value.schema !== "math-workspace.publication-build/v1" || value.id !== release || value.profileId !== id) throw new Error("Publication build not found.");
    return value;
  }
  async artifact(id, release, name) {
    const build = await this.build(id, release);
    if (!["publication.pdf", "compiled.md", "manifest.json", "citation.json"].includes(name) && !build.publicArtifacts?.includes(name)) throw new Error("Unknown publication artifact.");
    const bytes = await fs$7.readFile(await this.directory(`builds/${publicationId(id)}/${buildId(release)}/${name}`));
    const expected = name === "publication.pdf" ? build.pdfSha256 : name === "compiled.md" ? build.markdownSha256 : name === "manifest.json" ? build.manifestSha256 : name === "checksums.sha256" ? build.checksumsSha256 : void 0;
    if (expected && sha256(bytes) !== expected) throw new Error("The immutable publication artifact changed.");
    if (!expected) {
      const manifest = JSON.parse((await this.artifact(id, release, "manifest.json")).toString("utf8"));
      if (sha256(bytes) !== manifest.artifacts[name]?.sha256) throw new Error("The immutable publication artifact changed.");
    }
    return bytes;
  }
  async repository(id, release) {
    const value = await optionalJson(await this.directory(`repositories/${publicationId(id)}/${buildId(release)}.json`));
    if (value && (value.schema !== "math-workspace.publication-repository/v1" || value.profileId !== id || value.buildId !== release)) throw new Error("Invalid repository publication state.");
    return value;
  }
  async writeRepository(value) {
    await atomicJson$1(this.root, `${this.relativeDirectory}/repositories/${publicationId(value.profileId)}/${buildId(value.buildId)}.json`, value);
  }
  async packageRebuilds(id) {
    const directory = await this.directory(`package-rebuilds/${publicationId(id)}`);
    let builds;
    try {
      builds = await fs$7.readdir(directory);
    } catch (error2) {
      if (error2.code === "ENOENT") return [];
      throw error2;
    }
    const receipts = [];
    for (const release of builds) if (/^[a-f0-9]{32}$/.test(release)) {
      const folder = await safePath(directory, release);
      for (const name of await fs$7.readdir(folder)) if (/^[a-f0-9]{32}\.json$/.test(name)) {
        const value = await optionalJson(await safePath(folder, name));
        if (value?.schema !== "math-workspace.publication-package-rebuild/v1" || value.profileId !== id || value.buildId !== release || value.id !== name.slice(0, -5)) throw new Error("Invalid package rebuild receipt.");
        receipts.push(value);
      }
    }
    return receipts.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  async writePackageRebuild(value) {
    if (!/^[a-f0-9]{32}$/.test(value.id)) throw new Error("Invalid package rebuild identity.");
    await atomicJson$1(this.root, `${this.relativeDirectory}/package-rebuilds/${publicationId(value.profileId)}/${buildId(value.buildId)}/${value.id}.json`, value);
  }
}
const fs$6 = require("node:fs/promises");
const markdown = new MarkdownIt({ html: true });
const blank = (text2) => text2.replace(/[^\r\n]/g, " ");
const lineAt$1 = (text2, offset) => text2.slice(0, offset).split("\n").length;
const escaped = (text2, at) => {
  let count = 0;
  while (at > 0 && text2[--at] === "\\") count++;
  return count % 2 === 1;
};
function literalMarkdownMask(content) {
  const fence2 = new MarkdownFence();
  let masked = content.split("\n").map((line) => fence2.consume(line) ? blank(line) : line).join("\n");
  masked = masked.replace(/<!--[\s\S]*?-->/g, blank);
  masked = masked.replace(/(?<!`)(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`)/g, (text2, _run, _body, offset) => escaped(masked, offset) ? text2 : blank(text2));
  const lines = masked.split("\n");
  for (const token of markdown.parse(masked, {})) if (token.type === "code_block" && token.map) {
    for (let line = token.map[0]; line < token.map[1]; line++) lines[line] = blank(lines[line]);
  }
  return lines.join("\n");
}
function mathPairs(content, source) {
  const masked = literalMarkdownMask(content), pairs = [];
  let open;
  for (let at = 0; at < masked.length - 1; at++) {
    if (masked.slice(at, at + 2) !== "$$" || escaped(masked, at) || masked[at - 1] === "$" || masked[at + 2] === "$") continue;
    if (open === void 0) open = at;
    else {
      pairs.push([open, at]);
      open = void 0;
    }
    at++;
  }
  if (open !== void 0) throw new Error(`${source}:${lineAt$1(content, open)}: Unclosed display math delimiter ($$).`);
  return pairs;
}
function normalizeDisplayMath(content, source = "Markdown") {
  const edits = [];
  for (const [open, close] of mathPairs(content, source)) {
    if (!content.slice(open + 2, close).includes("\n")) continue;
    for (const at of [open, close]) {
      const start = content.lastIndexOf("\n", at - 1) + 1;
      const before = content.slice(start, at), quote = /^(?:[ \t]*>[ \t]*)*/.exec(before)[0];
      if (before.slice(quote.length).trim()) edits.push({ at, text: "\n" + quote });
      if (content[at + 2] !== "\n" && content[at + 2] !== "\r" && at + 2 < content.length) edits.push({ at: at + 2, text: "\n" + quote });
    }
  }
  for (const edit of edits.sort((a, b) => b.at - a.at)) content = content.slice(0, edit.at) + edit.text + content.slice(edit.at);
  return content;
}
function resourceMask(content) {
  let masked = literalMarkdownMask(content);
  masked = masked.replace(/(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<![\\$])\$(?!\$)[^\n]*?(?<!\\)\$(?!\$)/g, blank);
  return masked;
}
function destinations(content) {
  const found = [];
  const add2 = (at) => {
    const result = markdown.helpers.parseLinkDestination(content, at, content.length);
    if (result.ok) found.push({ target: markdown.normalizeLink(result.str), start: at + (content[at] === "<" ? 1 : 0), end: result.pos - (content[at] === "<" ? 1 : 0) });
  };
  for (const match2 of content.matchAll(/\]\(\s*|^[ \t]*(?:>[ \t]*)*(?:(?:[-+*]|\d+[.)])[ \t]+)?\[[^\]\n]+\]:\s*/gm)) add2(match2.index + match2[0].length);
  for (const tag of content.matchAll(/<(?:img|audio|video|source|a|link|image|use)\b[^>]*>/gi)) {
    if (/\bsrcset\s*=/i.test(tag[0])) throw new Error(`Markdown:${lineAt$1(content, tag.index)}: Media needs explicit src paths; srcset is not supported.`);
    for (const attr of tag[0].matchAll(/\b(?:src|poster|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const raw = attr[1] ?? attr[2] ?? attr[3], offset = attr[0].indexOf("=") + 1;
      const valueStart = offset + attr[0].slice(offset).search(/\S/) + (attr[1] !== void 0 || attr[2] !== void 0 ? 1 : 0);
      const start = tag.index + attr.index + valueStart;
      found.push({ target: markdown.utils.unescapeAll(raw), start, end: start + raw.length, html: true, image: !/^<a\b/i.test(tag[0]) });
    }
  }
  return found;
}
function resourceTargets(content) {
  const masked = resourceMask(content), spans = destinations(masked), found = [];
  if (/<(?:script|iframe|object|embed|base)\b/i.test(masked)) throw new Error("Static Markdown cannot embed executable HTML; declare an interactive figure with a static poster.");
  const definitions = /* @__PURE__ */ new Map();
  for (const match2 of masked.matchAll(/^[ \t]*(?:>[ \t]*)*(?:(?:[-+*]|\d+[.)])[ \t]+)?\[([^\]\n]+)\]:\s*/gm)) {
    const destination = markdown.helpers.parseLinkDestination(masked, match2.index + match2[0].length, masked.length);
    const key = markdown.utils.normalizeReference(match2[1]);
    if (destination.ok) {
      const target = markdown.normalizeLink(destination.str);
      if (definitions.has(key) && definitions.get(key) !== target) throw new Error(`Conflicting reference definition at line ${lineAt$1(content, match2.index)}: ${match2[1]}`);
      definitions.set(key, target);
    }
  }
  const add2 = (target, image2, line, interactive = false) => {
    const span = spans.find((item) => item.target === target);
    found.push({ target, image: image2, line: span ? lineAt$1(masked, span.start) : line, ...interactive ? { interactive } : {} });
  };
  const visit = (tokens, line = 1) => {
    const figure = interactiveFigureReference(tokens);
    if (figure) add2(figure.source, false, line, true);
    for (const token of tokens) {
      const here = token.map ? token.map[0] + 1 : line;
      if (token.type === "image") add2(token.attrGet("src"), true, here);
      if (token.type === "link_open") add2(token.attrGet("href"), false, here);
      if (token.type === "html_inline" || token.type === "html_block") {
        for (const ref of destinations(token.content)) add2(ref.target, ref.image === true, here);
      }
      if (token.children && token.type !== "image") visit(token.children, here);
    }
  };
  const environment = {};
  visit(markdown.parse(masked, environment));
  for (const match2 of masked.matchAll(/!\[/g)) {
    if (escaped(masked, match2.index)) continue;
    const tokens = markdown.parseInline(masked.slice(match2.index), environment)[0]?.children;
    if (tokens?.[0]?.type !== "image") throw new Error(`Unresolved or malformed image reference at line ${lineAt$1(content, match2.index)}.`);
  }
  return found;
}
function localResource(source, target) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return void 0;
  let clean;
  try {
    clean = decodeURIComponent(target.split(/[?#]/)[0]);
  } catch {
    throw new Error("Invalid percent encoding in resource path.");
  }
  if (!clean || path__namespace.posix.isAbsolute(clean) || /[\\\u0000-\u001f\u007f]/.test(clean)) throw new Error("Resources must use paths inside the project.");
  return relativeInput(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(source), clean)));
}
function publicResourcePath(value) {
  relativeInput(value);
  if (value.split("/").some((part) => [".git", ".dev-mesh", ".codex", ".agents", ".lake", ".math-workspace", ".aws", ".ssh", ".gnupg", ".npmrc", ".netrc", ".git-credentials", "node_modules"].includes(part.toLowerCase()) || /^\.env(?:\.|$)/i.test(part)) || /\.(?:pem|key|p12|pfx)$/i.test(value)) throw new Error(`This file is not eligible for public delivery: ${value}`);
  return value;
}
function checkReference(source, ref) {
  const local = localResource(source, ref.target);
  if (!local) {
    if (ref.image && !/^(?:#|data:image\/)/i.test(ref.target)) throw new Error(`Publication media must use local frozen resources. Unfrozen publication media: ${ref.target}; remote media is not downloaded.`);
    return;
  }
  if (/\.md$/i.test(local)) {
    if (ref.image) throw new Error("An image cannot refer to an omitted manuscript.");
    return;
  }
  publicResourcePath(local);
  if (/\.(?:[cm]?js|tsx?|jsx|py|sh|bash|zsh|lean)$/i.test(local)) throw new Error(`Executable sources are not automatic static resources: ${local}`);
  return local;
}
function assertSelfContainedFigure(content, name) {
  const resourceAttributes = /\b(?:src|poster)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))|<(?:link|image|use)\b[^>]*?\b(?:href|xlink:href)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))|url\(\s*["']?([^)'"\s]+)/gi;
  for (const match2 of content.matchAll(resourceAttributes)) {
    const value = markdown.utils.unescapeAll(match2[1] || match2[2] || match2[3] || match2[4] || match2[5] || match2[6] || match2[7]);
    if (!/^(?:data:|#)/i.test(value)) throw new Error(`Interactive figure must be self-contained: ${name} references ${value}`);
  }
  if (/<(?:iframe|object|embed|base)\b|@import\b|\bsrcset\s*=/i.test(content)) throw new Error(`Interactive figure must be self-contained: ${name}`);
}
function assertResourceBytes(name, bytes) {
  if (!bytes.length) throw new Error(`Empty resource: ${name}`);
  if (/\.(?:html?|svg|css)$/i.test(name)) assertSelfContainedFigure(bytes.toString("utf8"), name);
}
function assertPortablePaths(names) {
  const seen = /* @__PURE__ */ new Map();
  for (const name of names) {
    relativeInput(name);
    const key = name.normalize("NFC").toLowerCase();
    if (seen.has(key) && seen.get(key) !== name) throw new Error(`Conflicting output paths: ${seen.get(key)} and ${name}`);
    seen.set(key, name);
  }
  for (const [key, name] of seen) {
    const components = key.split("/");
    components.pop();
    while (components.length) {
      if (seen.has(components.join("/"))) throw new Error(`Conflicting file/directory paths: ${name}`);
      components.pop();
    }
  }
}
function texTargets(content) {
  const found = [];
  for (const match2 of literalMarkdownMask(content).matchAll(/\\(includegraphics|input|include|bibliography|addbibresource)(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
    if (/[\\#$]/.test(match2[2])) throw new Error(`Dynamic LaTeX resource path at line ${lineAt$1(content, match2.index)} cannot be frozen.`);
    found.push({ target: relativeInput(match2[2]), command: match2[1], line: lineAt$1(content, match2.index) });
  }
  return found;
}
function texNames(ref) {
  return path__namespace.posix.extname(ref.target) ? [ref.target] : (ref.command === "includegraphics" ? [".pdf", ".png", ".jpg", ".jpeg", ".svg"] : /bibliography|addbibresource/.test(ref.command) ? [".bib"] : [".tex"]).map((ext) => ref.target + ext);
}
async function collectResources(root, documents, options = {}) {
  const files = /* @__PURE__ */ new Map();
  let total = 0;
  const add2 = async (name) => {
    publicResourcePath(name);
    if (/\.(?:[cm]?js|tsx?|jsx|py|sh|bash|zsh|lean)$/i.test(name)) throw new Error(`Executable sources are not automatic static resources: ${name}`);
    if (files.has(name)) return;
    const file = await safePath(root, name), stat = await fs$6.stat(file);
    if (!stat.isFile() || stat.size > 160 * 1024 * 1024) throw new Error(`Resource is not an eligible regular file: ${name}`);
    const bytes = options.read ? await options.read(name) : await fs$6.readFile(file);
    if (bytes.length > 160 * 1024 * 1024 || (total += bytes.length) > 160 * 1024 * 1024 || files.size >= 1e4) throw new Error("Resource file/byte limit exceeded.");
    assertResourceBytes(name, bytes);
    files.set(name, bytes);
    if (/\.tex$/i.test(name)) await inspect(bytes.toString("utf8"), name, true);
  };
  const inspect = async (content, source, texOnly = false) => {
    let refs;
    try {
      refs = texOnly ? [] : resourceTargets(content);
    } catch (error2) {
      throw new Error(`${source}: ${error2.message}`);
    }
    for (const ref of refs) try {
      const name = checkReference(source, ref);
      if (name) await add2(name);
    } catch (error2) {
      throw new Error(`${source}:${ref.line}: ${ref.target}: ${error2.message}`);
    }
    for (const ref of texTargets(content)) try {
      let name;
      for (const candidate of texNames(ref)) {
        try {
          await fs$6.access(await safePath(root, candidate));
          name = candidate;
          break;
        } catch (error2) {
          if (error2.code !== "ENOENT") throw error2;
        }
      }
      if (!name) throw new Error("LaTeX resource is unavailable.");
      await add2(name);
    } catch (error2) {
      throw new Error(`${source}:${ref.line}: ${ref.target}: ${error2.message}`);
    }
  };
  for (const [source, content] of documents) await inspect(content, source);
  assertPortablePaths([...documents.keys(), ...files.keys()]);
  return files;
}
function rebaseMarkdownResources(content, source, output = "compiled.md") {
  const masked = resourceMask(content), targets = new Set(resourceTargets(content).map((ref) => ref.target));
  for (const span of destinations(masked).sort((a, b) => b.start - a.start)) {
    if (!targets.has(span.target)) continue;
    const local = localResource(source, span.target);
    if (!local) continue;
    const suffix = span.target.slice(span.target.split(/[?#]/)[0].length);
    const target = path__namespace.posix.relative(path__namespace.posix.dirname(output), local).split("/").map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase())).join("/") + suffix;
    const value = span.html ? target.replace(/&/g, "&amp;") : target;
    content = content.slice(0, span.start) + value + content.slice(span.end);
  }
  return content;
}
function validatePublicationMedia(files, manuscripts, options = {}) {
  assertPortablePaths(files.keys());
  let checkedReferences = 0;
  for (const source of manuscripts) {
    const bytes = files.get(source);
    if (!bytes) throw new Error(`Missing public manuscript: ${source}`);
    const content = bytes.toString("utf8");
    if (options.normalizedMath && normalizeDisplayMath(content, source) !== content) throw new Error(`${source}: Display math delimiters must be on separate lines.`);
    for (const ref of resourceTargets(content)) try {
      const local = checkReference(options.contexts?.get(source) || source, ref);
      if (!local) continue;
      if (!files.has(local)) throw new Error(`Unresolved public media reference: ${source} → ${local}`);
      assertResourceBytes(local, files.get(local));
      checkedReferences++;
    } catch (error2) {
      throw new Error(`${source}:${ref.line}: ${ref.target}: ${error2.message}`);
    }
  }
  const texSources = /* @__PURE__ */ new Set([...manuscripts, ...[...files.keys()].filter((name) => /\.tex$/i.test(name))]);
  for (const source of texSources) for (const ref of texTargets(files.get(source).toString("utf8"))) {
    const name = texNames(ref).find((candidate) => files.has(candidate));
    if (!name) throw new Error(`${source}:${ref.line}: Unresolved LaTeX resource: ${ref.target}`);
    publicResourcePath(name);
    assertResourceBytes(name, files.get(name));
    checkedReferences++;
  }
  return { checkedReferences };
}
const MAX_INPUTS = 4e4;
const nodeFs$3 = require("node:fs/promises");
async function identity(file) {
  try {
    const stat = await nodeFs$3.lstat(file, { bigint: true });
    if (stat.isSymbolicLink()) return "symlink";
    return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");
  } catch (error2) {
    if (error2.code === "ENOENT" || error2.code === "ENOTDIR") return "missing";
    throw error2;
  }
}
class ReadInputs {
  constructor(maximumFiles = MAX_INPUTS, maximumBytes = 16 * 1024 * 1024) {
    this.maximumFiles = maximumFiles;
    this.maximumBytes = maximumBytes;
    this.inputs = /* @__PURE__ */ new Map();
    this.reusable = true;
    this.retainedBytes = 0;
  }
  disable() {
    this.reusable = false;
  }
  get bytes() {
    return this.retainedBytes;
  }
  async track(file) {
    if (!this.inputs.has(file)) {
      const cost = file.length * 2 + 320;
      if (this.inputs.size >= this.maximumFiles || this.retainedBytes + cost > this.maximumBytes) {
        this.reusable = false;
        return identity(file);
      }
      this.retainedBytes += cost;
      this.inputs.set(file, identity(file));
    }
    const value = await this.inputs.get(file);
    if (value === "symlink") this.reusable = false;
    return value;
  }
  async current() {
    if (!this.reusable) return false;
    const entries = [...this.inputs];
    let next = 0, same = true;
    await Promise.all(Array.from({ length: Math.min(32, entries.length) }, async () => {
      while (same && next < entries.length) {
        const [file, previous] = entries[next++];
        try {
          if (await previous !== await identity(file)) same = false;
        } catch {
          same = false;
        }
      }
    }));
    return same;
  }
  async fingerprint() {
    if (!await this.current()) return void 0;
    const values = await Promise.all([...this.inputs].map(async ([file, stamp]) => [file, await stamp]));
    values.sort(([a], [b]) => a.localeCompare(b));
    return crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex");
  }
}
class FileHashCache {
  constructor(maximum = 3e4) {
    this.maximum = maximum;
    this.values = /* @__PURE__ */ new Map();
    this.bytes = 0;
  }
  clear() {
    this.values.clear();
    this.bytes = 0;
  }
  drop(key) {
    const previous = this.values.get(key);
    if (previous) this.bytes -= key.length * 2 + previous.identity.length * 2 + 256;
    this.values.delete(key);
  }
  async read(file, text2 = false, inputs) {
    const key = JSON.stringify([file, text2]), before = inputs ? await inputs.track(file) : await identity(file);
    const cached = this.values.get(key);
    if (cached?.identity === before && before !== "symlink" && before !== "missing") {
      this.values.delete(key);
      this.values.set(key, cached);
      return cached;
    }
    const data = text2 ? await fs__namespace.readFile(file, "utf8") : await fs__namespace.readFile(file);
    const value = { identity: before, hash: crypto.createHash("sha256").update(data).digest("hex"), length: data.length };
    if (before !== "symlink" && before === await identity(file)) {
      this.drop(key);
      this.values.set(key, value);
      this.bytes += key.length * 2 + before.length * 2 + 256;
      while (this.values.size > this.maximum || this.bytes > 16 * 1024 * 1024) this.drop(this.values.keys().next().value);
    }
    return value;
  }
}
class ValidatedReadCache {
  constructor(weigh = () => 256, maxBytes = 64 * 1024 * 1024, maxEntries = 4, inputFiles = MAX_INPUTS, inputBytes = 16 * 1024 * 1024) {
    this.weigh = weigh;
    this.maxBytes = maxBytes;
    this.maxEntries = maxEntries;
    this.inputFiles = inputFiles;
    this.inputBytes = inputBytes;
    this.entries = /* @__PURE__ */ new Map();
    this.pending = /* @__PURE__ */ new Map();
    this.generation = 0;
  }
  clear() {
    this.generation++;
    this.entries.clear();
    this.pending.clear();
  }
  get(key, read) {
    const running = this.pending.get(key);
    if (running) return running;
    const generation = this.generation;
    const pending = (async () => {
      const previous = this.entries.get(key);
      if (previous && await previous.inputs.current()) {
        this.entries.delete(key);
        this.entries.set(key, previous);
        return previous.value;
      }
      this.entries.delete(key);
      const inputs = new ReadInputs(this.inputFiles, this.inputBytes), value = await read(inputs);
      const bytes = this.weigh(value) + inputs.bytes;
      if (generation === this.generation && bytes <= this.maxBytes && await inputs.current()) {
        this.entries.set(key, { value, inputs, bytes });
        while (this.entries.size > this.maxEntries || [...this.entries.values()].reduce((n, item) => n + item.bytes, 0) > this.maxBytes) {
          this.entries.delete(this.entries.keys().next().value);
        }
      }
      return value;
    })();
    this.pending.set(key, pending);
    void pending.finally(() => {
      if (this.pending.get(key) === pending) this.pending.delete(key);
    }).catch(() => {
    });
    return pending;
  }
}
const { spawnSync: spawnSync$2 } = require("node:child_process");
const nodeFs$2 = require("node:fs/promises");
const MAX_CACHE_BYTES = 48 * 1024 * 1024;
function completeDependencyRecords(records, names) {
  if (!Array.isArray(records) || records.length !== names.length * 2) return false;
  const requested = new Set(names), seen = /* @__PURE__ */ new Set();
  for (const record of records) {
    if (!record || !requested.has(record.source) || !["type", "proof"].includes(record.where) || !Array.isArray(record.targets) || record.targets.some((target) => typeof target !== "string" || !requested.has(target) || target === record.source)) return false;
    const key = JSON.stringify([record.source, record.where]);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
async function dependencyQueryKey(root, project, names) {
  try {
    const { inputFingerprint: inputFingerprint2, trackLeanBuildOutputs: trackLeanBuildOutputs2, installedToolchainRoot: installedToolchainRoot2 } = await Promise.resolve().then(() => leanEvidence);
    const input = await inputFingerprint2(root, project);
    if (input.diagnostic) return void 0;
    const cwd = path__namespace.resolve(root, project.root);
    const environment = spawnSync$2(
      "lake",
      ["env", process.execPath, "-e", 'console.log(JSON.stringify(process.env.LEAN_PATH || ""))'],
      { cwd, encoding: "utf8", timeout: 1e4, killSignal: "SIGKILL", maxBuffer: 1024 * 1024 }
    );
    if (environment.error || environment.status !== 0) return void 0;
    const paths = JSON.parse(environment.stdout.trim().split(/\r?\n/).at(-1) || "").split(require("node:path").delimiter).filter(Boolean).map((file) => path__namespace.resolve(cwd, file));
    if (!paths.length) return void 0;
    const inputs = new ReadInputs(12e4, 64 * 1024 * 1024);
    await trackLeanBuildOutputs2(root, paths, inputs, installedToolchainRoot2(input.toolchain));
    const compiled = await inputs.fingerprint();
    if (!compiled) return void 0;
    return crypto.createHash("sha256").update(JSON.stringify({ version: 1, root, project, input: input.fingerprint, compiled, names })).digest("hex");
  } catch {
    return void 0;
  }
}
async function readDependencyQueryCache(root) {
  const file = path__namespace.join(root, ".math-workspace/lean-dependency-cache.json");
  try {
    const stat = await fs__namespace.stat(file);
    if (!stat.isFile() || stat.size > MAX_CACHE_BYTES) return {};
    const value = JSON.parse(await fs__namespace.readFile(file, "utf8"));
    return value?.version === 1 && value.projects && typeof value.projects === "object" && !Array.isArray(value.projects) ? value.projects : {};
  } catch {
    return {};
  }
}
async function writeDependencyQueryCache(root, projects) {
  const bytes = JSON.stringify({ version: 1, projects }) + "\n";
  if (Buffer.byteLength(bytes) > MAX_CACHE_BYTES) return;
  const directory = path__namespace.join(root, ".math-workspace"), file = path__namespace.join(directory, "lean-dependency-cache.json");
  const temporary2 = file + "." + crypto.randomBytes(8).toString("hex");
  try {
    await fs__namespace.mkdir(directory, { recursive: true });
    await fs__namespace.writeFile(temporary2, bytes);
    await nodeFs$2.rename(temporary2, file);
  } catch {
  } finally {
    await fs__namespace.rm(temporary2, { force: true }).catch(() => {
    });
  }
}
const { spawnSync: spawnSync$1 } = require("node:child_process");
const RECORD_PREFIX$1 = "MW_LEAN_DEPENDENCY	";
const NAME_SEPARATOR = "";
const MAX_QUERY_NAMES = 1e5;
const MAX_PROBE_BYTES = 8 * 1024 * 1024;
const MAX_QUERY_OUTPUT_BYTES = 32 * 1024 * 1024;
const QUERY_TIMEOUT_MS = 12e4;
function fingerprint$2(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function dependencyPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", "lean-dependency-graph.json");
}
function reportPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", "lean-dependency-report.md");
}
function explicitStrictEdges(graph) {
  return (Array.isArray(graph?.edges) ? graph.edges : []).filter((edge) => edge && edge.relation !== "explanatory" && (edge.where === "statement" || edge.where === "proof") && typeof edge.from === "string" && typeof edge.to === "string" && edge.from !== edge.to).map((edge) => ({ from: edge.from, to: edge.to }));
}
function solutionDependencies(graph) {
  return explicitStrictEdges(graph).flatMap((edge) => (graph?.pedagogicalLinks || []).filter((link2) => link2.solution === edge.from && link2.exercise !== edge.to).map((link2) => ({ exercise: link2.exercise, solution: link2.solution, to: edge.to })));
}
function strictMarkdownEdges(graph, index) {
  const edges = explicitStrictEdges(graph).flatMap((edge) => {
    const owners = (graph?.pedagogicalLinks || []).filter((link2) => link2.solution === edge.from);
    if (!owners.length) return [edge];
    return [
      ...index.anchors[edge.from] ? [edge] : [],
      ...owners.filter((link2) => link2.exercise !== edge.to).map((link2) => ({ from: link2.exercise, to: edge.to }))
    ];
  });
  const projected = graph?.pedagogicalLinks?.length ? [...new Map(edges.map((edge) => [`${edge.from}:${edge.to}`, edge])).values()] : edges;
  return projected.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}
function leanDependencyInputFingerprint(index, graph) {
  return fingerprint$2(JSON.stringify({
    projects: Object.entries(index.projectSources).map(([key, source]) => ({ key, fingerprint: source.fingerprint, module: source.module || "" })).sort((left, right) => left.key.localeCompare(right.key)),
    markdownEdges: strictMarkdownEdges(graph, index)
  }));
}
async function readLeanDependencyArtifact(workspaceRoot) {
  try {
    const value = JSON.parse(await fs__namespace.readFile(dependencyPath(workspaceRoot), "utf8"));
    return value?.schemaVersion === 1 && Array.isArray(value.edges) && value.comparisons ? value : void 0;
  } catch (error2) {
    if (error2?.code === "ENOENT") return void 0;
    return void 0;
  }
}
function leanModule(project) {
  const value = project.module || project.target;
  return typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_'.]*$/.test(value) ? value : void 0;
}
function queryInputDiagnostic(names) {
  if (names.length > MAX_QUERY_NAMES) return `Lean dependency query exceeds the ${MAX_QUERY_NAMES} declaration limit; no declarations were queried.`;
  if (names.some((name) => !/^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/.test(name))) return "Lean dependency query contains an unsupported declaration name; no declarations were queried.";
  if (names.reduce((bytes, name) => bytes + Buffer.byteLength(name) + 2, 0) > MAX_PROBE_BYTES) return `Lean dependency probe exceeds the ${MAX_PROBE_BYTES} byte input limit; no declarations were queried.`;
}
function generatedDependencyProbe(module2, names) {
  const requested = JSON.stringify(names.join("\n"));
  return `import Lean
import ${module2}

open Lean Elab Command

def math_workspace_requested_names : Array Lean.Name :=
  (${requested}).splitOn "\\n" |>.toArray.map String.toName

def math_workspace_names_text (names : Array Lean.Name) : String :=
  String.intercalate "${NAME_SEPARATOR}" (names.toList.map Lean.Name.toString)

elab "math_workspace_emit_dependencies" : command => do
  let env ← getEnv
  let requestedSet := Std.HashSet.ofArray math_workspace_requested_names
  for source in math_workspace_requested_names do
    match env.find? source with
    | none =>
      logError m!"Math Workspace dependency query could not resolve {source}"
    | some info =>
      let type_dependencies := (info.type.getUsedConstants).filter fun name =>
        name != source && requestedSet.contains name
      let proof_dependencies : Array Lean.Name := match info.value? true with
        | some value => (value.getUsedConstants).filter fun name =>
          name != source && requestedSet.contains name
        | none => #[]
      logInfo m!"${RECORD_PREFIX$1}{source}\\ttype\\t{math_workspace_names_text type_dependencies}"
      logInfo m!"${RECORD_PREFIX$1}{source}\\tproof\\t{math_workspace_names_text proof_dependencies}"

math_workspace_emit_dependencies
`;
}
function queryProjectDependencies(workspaceRoot, project, names, outputRoot = workspaceRoot) {
  const module2 = leanModule(project);
  if (!module2) return { records: [], diagnostic: `Lean project ${project.key} needs a valid module or target name to inspect declaration dependencies.` };
  if (names.length === 0) return { records: [] };
  const diagnostic = queryInputDiagnostic(names);
  if (diagnostic) return { records: [], diagnostic };
  const token = crypto__namespace.randomBytes(8).toString("hex");
  const probePath = path__namespace.join(outputRoot, ".math-workspace", `lean-dependencies-${token}.lean`);
  const projectRoot = path__namespace.resolve(workspaceRoot, project.root);
  const source = generatedDependencyProbe(module2, names);
  if (Buffer.byteLength(source, "utf8") > MAX_PROBE_BYTES) {
    return { records: [], diagnostic: `Lean dependency probe exceeds the ${MAX_PROBE_BYTES} byte input limit; no declarations were queried.` };
  }
  try {
    require("node:fs").mkdirSync(path__namespace.dirname(probePath), { recursive: true });
    require("node:fs").writeFileSync(probePath, source, "utf8");
    const result = spawnSync$1("lake", ["env", "lean", probePath], {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: MAX_QUERY_OUTPUT_BYTES,
      timeout: QUERY_TIMEOUT_MS,
      killSignal: "SIGKILL"
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    if (result.error || result.status !== 0) {
      const tail = output.trim().slice(-4e3);
      const reason = result.error?.code === "ETIMEDOUT" ? `Lean dependency query exceeded ${QUERY_TIMEOUT_MS} ms.` : result.error?.code === "ENOBUFS" ? `Lean dependency query exceeded the ${MAX_QUERY_OUTPUT_BYTES} byte output limit.` : String(result.error?.message || `Lake exited with ${result.status}${result.signal ? ` (${result.signal})` : ""}.`);
      return { records: [], diagnostic: [reason, tail].filter(Boolean).join("\n") };
    }
    const requested = new Set(names), seen = /* @__PURE__ */ new Set();
    const records = [];
    for (const line of output.split(/\r?\n/)) {
      const offset = line.indexOf(RECORD_PREFIX$1);
      if (offset < 0) continue;
      const parts = line.slice(offset + RECORD_PREFIX$1.length).split("	");
      const [sourceName, where, rawTargets] = parts;
      const targets = rawTargets ? rawTargets.split(NAME_SEPARATOR).filter(Boolean) : [];
      const key = `${sourceName}\0${where}`;
      if (parts.length !== 3 || !requested.has(sourceName) || where !== "type" && where !== "proof" || seen.has(key) || targets.some((target) => !requested.has(target) || target === sourceName)) {
        return { records: [], diagnostic: "Lean dependency query returned malformed, duplicate, or unexpected records; its partial edges were discarded." };
      }
      seen.add(key);
      records.push({ source: sourceName, where, targets });
    }
    if (records.length !== names.length * 2) {
      const missing = names.flatMap((name) => ["type", "proof"].filter((where) => !seen.has(`${name}\0${where}`)).map((where) => `${name} (${where})`));
      return { records: [], diagnostic: `Incomplete Lean dependency query: received ${records.length} of ${names.length * 2} records. Missing: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? ", …" : ""}. Partial edges were discarded.` };
    }
    return { records };
  } finally {
    try {
      require("node:fs").rmSync(probePath, { force: true });
    } catch (_error) {
    }
  }
}
function setFor(map2, id) {
  const existing = map2.get(id);
  if (existing) return existing;
  const created = /* @__PURE__ */ new Set();
  map2.set(id, created);
  return created;
}
function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}
function renderLeanDependencyReport(artifact) {
  const lines = [
    "# Lean dependency comparison",
    "",
    "> This report compares explicit strict Markdown dependencies with direct references in elaborated Lean declaration types and proof values. Markdown-only edges merit direct review; Lean-only edges often record implementation detail or reusable support and are shown as supplemental context. Neither difference by itself establishes a mathematical conflict.",
    "",
    ...artifact.diagnostics.length ? ["**Query incomplete:** affected projects are unavailable and excluded from dependency comparisons. Their missing query results are not Markdown-only review candidates.", ""] : [],
    "| Metric | Count |",
    "| --- | ---: |",
    `| Strict Markdown edges | ${artifact.summary.markdownEdges} |`,
    `| Comparable Markdown edges | ${artifact.summary.comparableMarkdownEdges} |`,
    `| Lean edges | ${artifact.summary.leanEdges} |`,
    `| Shared edges | ${artifact.summary.sharedEdges} |`,
    `| Markdown-only review candidates | ${artifact.summary.markdownOnlyEdges} |`,
    `| Additional Lean support edges | ${artifact.summary.leanOnlyEdges} |`,
    `| Unmapped Markdown edges | ${artifact.summary.unmappedMarkdownEdges} |`,
    ""
  ];
  if (artifact.solutionDependencies?.length) {
    lines.push("## Premises in linked solutions", "", "Explicit references in a linked solution are compared as premises of its exercise; the ownership link itself is not a premise.", "");
    artifact.solutionDependencies.forEach((item) => lines.push(`- \`${item.exercise}\` → \`${item.to}\` via solution \`${item.solution}\``));
    lines.push("");
  }
  if (artifact.diagnostics.length > 0) {
    lines.push("## Query diagnostics", "");
    artifact.diagnostics.forEach((diagnostic) => lines.push(`- **${diagnostic.projectKey}**: ${diagnostic.message}`));
    lines.push("");
  }
  const candidates = Object.entries(artifact.comparisons).filter(([, comparison]) => comparison.markdownOnly.length > 0 || comparison.leanOnly.length > 0).sort(([left], [right]) => left.localeCompare(right));
  if (candidates.length > 0) {
    lines.push("## Per-anchor comparison", "");
    for (const [id, comparison] of candidates) {
      lines.push(`### \`${id}\``, "");
      if (comparison.markdownOnly.length > 0) lines.push(`- Markdown-only review: ${comparison.markdownOnly.map((value) => `\`${value}\``).join(", ")}`);
      if (comparison.leanOnly.length > 0) lines.push(`- Additional Lean support: ${comparison.leanOnly.map((value) => `\`${value}\``).join(", ")}`);
      lines.push("");
    }
  }
  if (artifact.unmappedMarkdownEdges.length > 0) {
    lines.push("## Markdown edges not comparable yet", "");
    artifact.unmappedMarkdownEdges.forEach((edge) => lines.push(`- \`${edge.from}\` → \`${edge.to}\``));
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}
`;
}
async function collectLeanDependencies(workspaceRoot, index, graph, options = {}) {
  workspaceRoot = await fs__namespace.realpath(workspaceRoot);
  const outputRoot = options.outputRoot || workspaceRoot;
  const cached = options.cache === false ? {} : await readDependencyQueryCache(outputRoot);
  const nameToAnchors = /* @__PURE__ */ new Map();
  const declarationsByProject = /* @__PURE__ */ new Map();
  for (const [id, anchor] of Object.entries(index.anchors)) {
    for (const declaration2 of anchor.declarations) {
      const name = declaration2.qualifiedName || declaration2.name;
      if (!name) continue;
      setFor(nameToAnchors, name).add(id);
      const names = declarationsByProject.get(declaration2.projectKey) || [];
      names.push(name);
      declarationsByProject.set(declaration2.projectKey, names);
    }
  }
  const edges = /* @__PURE__ */ new Map();
  const diagnostics = [];
  const unavailableProjects = /* @__PURE__ */ new Set();
  for (const project of index.projects) {
    const names = sorted(new Set(declarationsByProject.get(project.key) || []));
    const key = options.cache !== false && names.length > 0 && !queryInputDiagnostic(names) && leanModule(project) ? await dependencyQueryKey(workspaceRoot, project, names) : void 0;
    const previous = Object.prototype.hasOwnProperty.call(cached, project.key) ? cached[project.key] : void 0;
    const query = key && previous?.key === key && completeDependencyRecords(previous.records, names) ? { records: previous.records } : queryProjectDependencies(workspaceRoot, project, names, outputRoot);
    if (key && !query.diagnostic) Object.defineProperty(cached, project.key, { value: { key, records: query.records }, enumerable: true, configurable: true, writable: true });
    else delete cached[project.key];
    if (query.diagnostic) {
      diagnostics.push({ projectKey: project.key, message: query.diagnostic });
      unavailableProjects.add(project.key);
    }
    for (const record of query.records) {
      const fromIds = nameToAnchors.get(record.source) || /* @__PURE__ */ new Set();
      for (const targetName of record.targets) {
        const toIds = nameToAnchors.get(targetName) || /* @__PURE__ */ new Set();
        for (const from of fromIds) for (const to of toIds) {
          if (from === to) continue;
          const edge = {
            from,
            to,
            projectKey: project.key,
            declaration: record.source,
            where: record.where
          };
          edges.set([edge.from, edge.to, edge.projectKey, edge.declaration, edge.where].join("\0"), edge);
        }
      }
    }
  }
  const markdownEdges = strictMarkdownEdges(graph, index);
  const anchoredIds = new Set(Object.keys(index.anchors));
  const availableIds = new Set(Object.entries(index.anchors).filter(([, anchor]) => !anchor.declarations.some((declaration2) => unavailableProjects.has(declaration2.projectKey))).map(([id]) => id));
  const comparableMarkdownEdges = markdownEdges.filter((edge) => availableIds.has(edge.from) && availableIds.has(edge.to));
  const unmappedMarkdownEdges = markdownEdges.filter((edge) => !anchoredIds.has(edge.from) || !anchoredIds.has(edge.to));
  const markdownBySource = /* @__PURE__ */ new Map();
  comparableMarkdownEdges.forEach((edge) => setFor(markdownBySource, edge.from).add(edge.to));
  const leanBySource = /* @__PURE__ */ new Map();
  edges.forEach((edge) => {
    if (availableIds.has(edge.from) && availableIds.has(edge.to)) setFor(leanBySource, edge.from).add(edge.to);
  });
  const comparisons = {};
  let sharedEdges = 0;
  let markdownOnlyEdges = 0;
  let leanOnlyEdges = 0;
  const candidateIds = /* @__PURE__ */ new Set([...markdownBySource.keys(), ...leanBySource.keys()]);
  for (const id of sorted(candidateIds)) {
    const markdown2 = markdownBySource.get(id) || /* @__PURE__ */ new Set();
    const lean = leanBySource.get(id) || /* @__PURE__ */ new Set();
    const shared = sorted([...markdown2].filter((target) => lean.has(target)));
    const markdownOnly = sorted([...markdown2].filter((target) => !lean.has(target)));
    const leanOnly = sorted([...lean].filter((target) => !markdown2.has(target)));
    sharedEdges += shared.length;
    markdownOnlyEdges += markdownOnly.length;
    leanOnlyEdges += leanOnly.length;
    comparisons[id] = { markdownOnly, leanOnly, shared };
  }
  const artifact = {
    schemaVersion: 1,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    inputFingerprint: leanDependencyInputFingerprint(index, graph),
    edges: [...edges.values()].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.projectKey.localeCompare(right.projectKey) || left.declaration.localeCompare(right.declaration) || left.where.localeCompare(right.where)),
    comparisons,
    ...solutionDependencies(graph).length ? { solutionDependencies: solutionDependencies(graph) } : {},
    unmappedMarkdownEdges,
    diagnostics,
    summary: {
      markdownEdges: markdownEdges.length,
      comparableMarkdownEdges: comparableMarkdownEdges.length,
      leanEdges: new Set([...edges.values()].map((edge) => `${edge.from}\0${edge.to}`)).size,
      sharedEdges,
      markdownOnlyEdges,
      leanOnlyEdges,
      unmappedMarkdownEdges: unmappedMarkdownEdges.length
    }
  };
  await fs__namespace.mkdir(path__namespace.join(outputRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(dependencyPath(outputRoot), `${JSON.stringify(artifact, null, 2)}
`, "utf8");
  await fs__namespace.writeFile(reportPath(outputRoot), renderLeanDependencyReport(artifact), "utf8");
  if (options.cache !== false) await writeDependencyQueryCache(outputRoot, cached);
  return artifact;
}
const { spawnSync } = require("node:child_process");
const LEAN_CONTRACTS_FILE = "lean-contracts.json";
const LEAN_BUILD_FILE = "lean-build.json";
function fingerprint$1(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function normalizeContractContent(value) {
  return String(value || "").normalize("NFKC").replace(/<!--[\s\S]*?-->/g, " ").replace(/#(?:h-[0-9a-f]{16,32}|tmp-[A-Za-z0-9_-]+)/gi, "#id").replace(/\s+/g, " ").trim();
}
function formalFingerprint(label) {
  return fingerprint$1(JSON.stringify({
    type: label.type,
    title: normalizeContractContent(label.title),
    content: normalizeContractContent(label.content || label.title)
  }));
}
function declarationFingerprint(index, id) {
  const declarations = index.anchors[id]?.declarations || [];
  return fingerprint$1(JSON.stringify(declarations.map((declaration2) => ({
    projectKey: declaration2.projectKey,
    qualifiedName: declaration2.qualifiedName || declaration2.name,
    kind: declaration2.kind,
    signatureFingerprint: declaration2.signatureFingerprint
  })).sort((left, right) => left.projectKey.localeCompare(right.projectKey) || left.qualifiedName.localeCompare(right.qualifiedName) || left.signatureFingerprint.localeCompare(right.signatureFingerprint))));
}
function contractsPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", LEAN_CONTRACTS_FILE);
}
function buildPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", LEAN_BUILD_FILE);
}
async function readJson$1(filePath) {
  try {
    return JSON.parse(await fs__namespace.readFile(filePath, "utf8"));
  } catch (error2) {
    if (error2?.code === "ENOENT") return void 0;
    return void 0;
  }
}
function isContractsArtifact(value) {
  return value?.schemaVersion === 1 && !!value.anchors && typeof value.anchors === "object";
}
function isBuildArtifact(value) {
  return value?.schemaVersion === 1 && !!value.projects && typeof value.projects === "object";
}
async function readLeanContracts(workspaceRoot) {
  const artifact = await readJson$1(contractsPath(workspaceRoot));
  return isContractsArtifact(artifact) ? artifact : void 0;
}
async function readLeanBuild(workspaceRoot) {
  const artifact = await readJson$1(buildPath(workspaceRoot));
  return isBuildArtifact(artifact) ? artifact : void 0;
}
function captureLeanContracts(index, labels) {
  const anchors = {};
  for (const id of Object.keys(index.anchors).sort()) {
    const label = labels[id];
    if (!label) continue;
    anchors[id] = {
      formalFingerprint: formalFingerprint(label),
      proofFingerprint: fingerprint$1(normalizeContractContent(associatedProofContent(label, labels))),
      declarationFingerprint: declarationFingerprint(index, id)
    };
  }
  return { schemaVersion: 1, capturedAt: (/* @__PURE__ */ new Date()).toISOString(), anchors };
}
async function writeLeanContracts(workspaceRoot, contracts) {
  await fs__namespace.mkdir(path__namespace.join(workspaceRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(contractsPath(workspaceRoot), `${JSON.stringify(contracts, null, 2)}
`, "utf8");
}
async function applyLeanWorkspaceStatus(workspaceRoot, index, labels, dependencyGraph) {
  const [contracts, build, dependencies] = await Promise.all([
    readLeanContracts(workspaceRoot),
    readLeanBuild(workspaceRoot),
    readLeanDependencyArtifact(workspaceRoot)
  ]);
  const dependenciesCurrent = !!dependencies && dependencies.inputFingerprint === leanDependencyInputFingerprint(index, dependencyGraph);
  const contractsSummary = {
    current: 0,
    untracked: 0,
    "markdown-drifted": 0,
    "declaration-drifted": 0,
    drifted: 0
  };
  const buildsSummary = {
    passed: 0,
    failed: 0,
    stale: 0,
    unverified: 0
  };
  const dependenciesSummary = {
    matched: 0,
    "markdown-gap": 0,
    supplemental: 0,
    unavailable: 0,
    stale: 0
  };
  const projectBuildStates = {};
  for (const project of index.projects) {
    const result = build?.projects?.[project.key];
    const current = index.projectSources[project.key]?.fingerprint;
    projectBuildStates[project.key] = !result ? "unverified" : !current || result.sourceFingerprint !== current ? "stale" : result.passed ? "passed" : "failed";
  }
  for (const [id, anchor] of Object.entries(index.anchors)) {
    const label = labels[id];
    const baseline = contracts?.anchors?.[id];
    const statementChanged = !!baseline && !!label && baseline.formalFingerprint !== formalFingerprint(label);
    const proofChanged = !!baseline?.proofFingerprint && !!label && baseline.proofFingerprint !== fingerprint$1(normalizeContractContent(associatedProofContent(label, labels)));
    const markdownChanged = statementChanged || proofChanged;
    const declarationChanged = !!baseline && baseline.declarationFingerprint !== declarationFingerprint(index, id);
    const contract = !baseline || baseline.proofFingerprint === void 0 ? "untracked" : markdownChanged && declarationChanged ? "drifted" : markdownChanged ? "markdown-drifted" : declarationChanged ? "declaration-drifted" : "current";
    const projects = [...new Set(anchor.declarations.map((declaration2) => declaration2.projectKey))];
    const buildStates = projects.map((projectKey) => projectBuildStates[projectKey] || "unverified");
    const buildState = buildStates.includes("failed") ? "failed" : buildStates.includes("stale") ? "stale" : buildStates.length > 0 && buildStates.every((state) => state === "passed") ? "passed" : "unverified";
    const comparison = dependencies?.comparisons?.[id];
    const queryFailed = dependencies?.diagnostics?.some((diagnostic) => projects.includes(diagnostic.projectKey));
    const dependencyState = !dependencies || queryFailed ? "unavailable" : !dependenciesCurrent ? "stale" : comparison?.markdownOnly.length ? "markdown-gap" : comparison?.leanOnly.length ? "supplemental" : "matched";
    anchor.status = {
      contract,
      build: buildState,
      dependencies: dependencyState,
      ...markdownChanged ? { markdownChanges: [...statementChanged ? ["statement"] : [], ...proofChanged ? ["proof"] : []] } : {}
    };
    contractsSummary[contract]++;
    buildsSummary[buildState]++;
    dependenciesSummary[dependencyState]++;
  }
  index.statusSummary = { contracts: contractsSummary, builds: buildsSummary, dependencies: dependenciesSummary, projects: projectBuildStates };
}
function boundedOutput(result) {
  const output = `${result?.stdout || ""}${result?.stderr || ""}`.trim();
  return output.length <= 12e3 ? output : output.slice(-12e3);
}
async function buildLeanWorkspace(workspaceRoot, index, projectKey) {
  const selected = index.projects.filter((project) => !projectKey || project.key === projectKey);
  if (projectKey && selected.length === 0) throw new Error(`Unknown Lean project: ${projectKey}`);
  const previous = await readLeanBuild(workspaceRoot);
  const projects = { ...previous?.projects || {} };
  for (const project of selected) {
    const root = path__namespace.resolve(workspaceRoot, project.root);
    const sourceFingerprint = index.projectSources[project.key]?.fingerprint || "";
    const command = ["lake", "build", ...project.target ? [project.target] : []];
    const started = /* @__PURE__ */ new Date();
    const result = spawnSync(command[0], command.slice(1), {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    const finished = /* @__PURE__ */ new Date();
    projects[project.key] = {
      command,
      ...project.target ? { target: project.target } : {},
      sourceFingerprint,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      durationMs: Math.max(0, finished.getTime() - started.getTime()),
      exitCode: typeof result.status === "number" ? result.status : null,
      passed: !result.error && result.status === 0,
      output: result.error ? String(result.error.message || result.error) : boundedOutput(result)
    };
  }
  const artifact = { schemaVersion: 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), projects };
  await fs__namespace.mkdir(path__namespace.join(workspaceRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(buildPath(workspaceRoot), `${JSON.stringify(artifact, null, 2)}
`, "utf8");
  return artifact;
}
const LEAN_ID_RE = /\bh-[0-9a-f]{16,32}\b/gi;
const LEAN_DECLARATION_RE = /^\s*(?:@\[[^\]]*\]\s*)*(?:(?:private|protected|noncomputable|unsafe|opaque|partial)\s+)*(def|abbrev|theorem|lemma|structure|class|inductive|instance|axiom)\s+([A-Za-z_][A-Za-z0-9_'.]*)/;
const DEFAULT_ANCHOR_PREFIX = "Math Workspace anchor:";
const DEFAULT_COVERAGE_TYPES = DEFAULT_LEAN_COVERAGE_TYPES;
function fingerprint(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
function normalizedRelativePath$1(value) {
  return toPosix(String(value || "").trim()).replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
}
function pathInside(rootPath, candidatePath) {
  const relative = path__namespace.relative(rootPath, candidatePath);
  return relative === "" || !!relative && !relative.startsWith("..") && !path__namespace.isAbsolute(relative);
}
function leanProjects(config2) {
  const projects = Array.isArray(config2?.lean?.projects) ? config2.lean.projects : [];
  return projects.filter((project) => project && typeof project === "object").map((project, index) => {
    const root = normalizedRelativePath$1(project.root);
    const sourceRoots = unique((Array.isArray(project.sourceRoots) ? project.sourceRoots : ["."]).map(normalizedRelativePath$1).map((value) => value || "."));
    return {
      key: String(project.key || root || `lean-${index + 1}`),
      root,
      sourceRoots: sourceRoots.length > 0 ? sourceRoots : ["."],
      target: typeof project.target === "string" && project.target.trim() ? project.target.trim() : void 0,
      module: typeof project.module === "string" && project.module.trim() ? project.module.trim() : void 0,
      anchorPrefix: typeof project.anchorPrefix === "string" && project.anchorPrefix.trim() ? project.anchorPrefix.trim() : DEFAULT_ANCHOR_PREFIX
    };
  });
}
function namespaceForOffset(source, offset) {
  const scopes = [];
  const before = source.slice(0, offset).split(/\r?\n/);
  for (const line of before) {
    const namespace = line.match(/^\s*namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)\b/);
    if (namespace) {
      scopes.push({ kind: "namespace", name: namespace[1] });
      continue;
    }
    if (/^\s*(?:noncomputable\s+)?section(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*(?:--.*)?$/.test(line)) {
      scopes.push({ kind: "section" });
      continue;
    }
    if (/^\s*end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*(?:--.*)?$/.test(line)) {
      scopes.pop();
    }
  }
  return scopes.filter((scope) => scope.kind === "namespace" && !!scope.name).map((scope) => scope.name).join(".");
}
function declarationSignature(source, offset) {
  const head = source.slice(offset, offset + 16e3);
  const terminator = head.search(/\s(?::=|where)\b/);
  const signature = (terminator >= 0 ? head.slice(0, terminator) : head).replace(/\/--[\s\S]*?-\//g, " ").replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim();
  return fingerprint(signature);
}
function isLeanSourcePath(config2, filePath) {
  const normalized = normalizedRelativePath$1(filePath);
  if (!normalized) return false;
  return leanProjects(config2).some((project) => {
    const projectRoot = project.root === "." ? "" : project.root;
    if (projectRoot && normalized !== projectRoot && !normalized.startsWith(`${projectRoot}/`)) return false;
    if (normalized === path__namespace.posix.join(projectRoot, "lakefile.toml") || normalized === path__namespace.posix.join(projectRoot, "lean-toolchain")) return true;
    if (!normalized.toLowerCase().endsWith(".lean")) return false;
    return project.sourceRoots.some((sourceRoot) => {
      const base2 = normalizedRelativePath$1(path__namespace.posix.join(projectRoot, sourceRoot));
      if (!base2 || base2 === ".") return true;
      return normalized === base2 || normalized.startsWith(`${base2}/`);
    });
  });
}
async function collectLeanFiles(directory, files = [], inputs) {
  await inputs?.track(directory);
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".lake") continue;
    const absolutePath = path__namespace.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectLeanFiles(absolutePath, files, inputs);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".lean")) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(left).localeCompare(toPosix(right)));
}
function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index++) {
    if (source.charCodeAt(index) === 10) line++;
  }
  return line;
}
function anchorsInDocstring(content, prefix) {
  const ids = [];
  for (const line of content.split(/\r?\n/)) {
    const prefixIndex = line.indexOf(prefix);
    if (prefixIndex < 0) continue;
    const matches = line.slice(prefixIndex + prefix.length).match(LEAN_ID_RE) || [];
    matches.forEach((id) => ids.push(id.toLowerCase()));
  }
  return unique(ids);
}
function declarationsFromLeanSource(source, project, filePath, diagnostics) {
  const declarations = [];
  const docstring = /\/--([\s\S]*?)-\//g;
  let match2;
  while (match2 = docstring.exec(source)) {
    const ids = anchorsInDocstring(match2[1], project.anchorPrefix);
    if (ids.length === 0) continue;
    const declarationSource2 = source.slice(docstring.lastIndex, docstring.lastIndex + 2e3);
    const declaration2 = declarationSource2.match(LEAN_DECLARATION_RE);
    if (!declaration2) {
      const line = lineAt(source, match2.index);
      diagnostics.push({
        severity: "error",
        code: "lean-anchor-declaration-missing",
        file: filePath,
        line,
        message: `Lean docstring anchor is not followed by a supported named declaration (${ids.join(", ")}).`
      });
      continue;
    }
    const declarationOffset = docstring.lastIndex + (declaration2.index || 0) + declaration2[0].indexOf(declaration2[1]);
    const anchoredDeclaration = {
      projectKey: project.key,
      filePath,
      line: lineAt(source, declarationOffset),
      kind: declaration2[1],
      name: declaration2[2],
      qualifiedName: [namespaceForOffset(source, declarationOffset), declaration2[2]].filter(Boolean).join("."),
      signatureFingerprint: declarationSignature(source, declarationOffset)
    };
    ids.forEach((id) => declarations.push({ id, declaration: anchoredDeclaration }));
  }
  return declarations;
}
async function scanLeanWorkspace(workspaceRoot, config2, labels = {}, dependencyGraph, inputs) {
  const projects = leanProjects(config2);
  const diagnostics = [];
  const anchors = /* @__PURE__ */ new Map();
  const projectSources = {};
  const scannedFiles = /* @__PURE__ */ new Set();
  const anchoredFiles = /* @__PURE__ */ new Set();
  for (const project of projects) {
    const projectSourceParts = [];
    if (!project.root) {
      diagnostics.push({
        severity: "error",
        code: "lean-project-root-missing",
        message: `Lean project ${project.key} must declare a workspace-relative root.`
      });
      continue;
    }
    const projectRoot = path__namespace.resolve(workspaceRoot, project.root);
    if (!pathInside(workspaceRoot, projectRoot)) {
      diagnostics.push({
        severity: "error",
        code: "lean-project-root-outside-workspace",
        message: `Lean project ${project.key} resolves outside the Math Workspace root.`
      });
      continue;
    }
    for (const sourceRoot of project.sourceRoots) {
      const absoluteSourceRoot = path__namespace.resolve(projectRoot, sourceRoot);
      const sourceDisplay = toPosix(path__namespace.relative(workspaceRoot, absoluteSourceRoot));
      if (!pathInside(projectRoot, absoluteSourceRoot)) {
        diagnostics.push({
          severity: "error",
          code: "lean-source-root-outside-project",
          file: sourceDisplay,
          message: `Lean source root for ${project.key} resolves outside its project root.`
        });
        continue;
      }
      let files;
      try {
        files = await collectLeanFiles(absoluteSourceRoot, [], inputs);
      } catch (error2) {
        diagnostics.push({
          severity: "error",
          code: "lean-source-root-unreadable",
          file: sourceDisplay,
          message: `Cannot scan Lean source root for ${project.key}: ${error2?.message || error2}`
        });
        continue;
      }
      for (const absoluteFile of files) {
        const filePath = toPosix(path__namespace.relative(workspaceRoot, absoluteFile));
        if (scannedFiles.has(filePath)) continue;
        scannedFiles.add(filePath);
        await inputs?.track(absoluteFile);
        const source = await fs__namespace.readFile(absoluteFile, "utf8");
        projectSourceParts.push(`${filePath}\0${source}`);
        const declarations = declarationsFromLeanSource(source, project, filePath, diagnostics);
        if (declarations.length > 0) anchoredFiles.add(filePath);
        for (const item of declarations) {
          const entry = anchors.get(item.id) || { id: item.id, declarations: [] };
          entry.declarations.push(item.declaration);
          anchors.set(item.id, entry);
        }
      }
    }
    projectSources[project.key] = {
      fingerprint: fingerprint(projectSourceParts.sort().join("\0")),
      module: project.module || project.target
    };
  }
  for (const [id, entry] of anchors) {
    const label = labels[id];
    if (!label) {
      const first = entry.declarations[0];
      diagnostics.push({
        severity: "error",
        code: "lean-anchor-unknown",
        file: first?.filePath,
        line: first?.line,
        message: `Lean anchor ${id} does not resolve to a Math Workspace formal object.`
      });
      continue;
    }
    entry.formal = {
      type: label.type,
      title: label.title,
      filePath: label.filePath,
      line: label.startLine === void 0 ? void 0 : label.startLine + 1
    };
    entry.declarations.sort((left, right) => left.filePath.localeCompare(right.filePath) || left.line - right.line || left.name.localeCompare(right.name));
  }
  const coverageTypes = new Set(Array.isArray(config2?.lean?.coverageTypes) ? config2.lean.coverageTypes.filter((value) => typeof value === "string") : DEFAULT_COVERAGE_TYPES);
  const eligible = projects.length === 0 ? [] : Object.entries(labels).filter(([id, label]) => HASH_ID_RE.test(id) && (coverageTypes.has(label.type) || label.type === "exercise" && anchors.has(id))).map(([id, label]) => ({
    id,
    type: label.type,
    title: label.title,
    filePath: label.filePath,
    line: label.startLine === void 0 ? void 0 : label.startLine + 1
  })).sort((left, right) => left.filePath.localeCompare(right.filePath) || (left.line || 0) - (right.line || 0) || left.id.localeCompare(right.id));
  const unanchoredFormalObjects = eligible.filter((item) => !anchors.has(item.id));
  const anchorObject = Object.fromEntries([...anchors.entries()].sort(([left], [right]) => left.localeCompare(right)));
  const declarationCount = [...anchors.values()].reduce((total, entry) => total + entry.declarations.length, 0);
  const unknownAnchors = [...anchors.values()].filter((entry) => !entry.formal).length;
  const index = {
    schemaVersion: 2,
    generatedBy: "math-workspace",
    projects,
    projectSources,
    anchors: anchorObject,
    unanchoredFormalObjects,
    diagnostics,
    summary: {
      projects: projects.length,
      leanFiles: scannedFiles.size,
      anchoredLeanFiles: anchoredFiles.size,
      anchors: anchors.size,
      declarations: declarationCount,
      matchedAnchors: anchors.size - unknownAnchors,
      unknownAnchors,
      eligibleFormalObjects: eligible.length,
      anchoredEligibleFormalObjects: eligible.length - unanchoredFormalObjects.length
    }
  };
  await applyLeanWorkspaceStatus(workspaceRoot, index, labels, dependencyGraph);
  return index;
}
function renderLeanReport(index) {
  const contracts = index.statusSummary?.contracts;
  const builds = index.statusSummary?.builds;
  const dependencies = index.statusSummary?.dependencies;
  const lines = [
    "# Lean anchor report",
    "",
    "> An anchor records a deterministic link to one or more Lean declarations. It does not by itself claim complete formalization or proof coverage.",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Projects | ${index.summary.projects} |`,
    `| Lean files | ${index.summary.leanFiles} |`,
    `| Anchored Lean files | ${index.summary.anchoredLeanFiles} |`,
    `| Unique anchors | ${index.summary.anchors} |`,
    `| Lean declarations | ${index.summary.declarations} |`,
    `| Matched formal anchors | ${index.summary.matchedAnchors} |`,
    `| Unknown anchors | ${index.summary.unknownAnchors} |`,
    `| Eligible formal objects | ${index.summary.eligibleFormalObjects} |`,
    `| Eligible objects with anchors | ${index.summary.anchoredEligibleFormalObjects} |`,
    ""
  ];
  if (contracts && builds && dependencies) {
    lines.push(
      "## Review status",
      "",
      "> `current` means that the captured Markdown statement, associated proof/solution content and anchored Lean declaration signatures are unchanged. It is a drift check, not a semantic-equivalence proof.",
      "",
      "| Contract state | Anchors |",
      "| --- | ---: |",
      `| Current | ${contracts.current} |`,
      `| Untracked | ${contracts.untracked} |`,
      `| Markdown drifted | ${contracts["markdown-drifted"]} |`,
      `| Declaration drifted | ${contracts["declaration-drifted"]} |`,
      `| Both drifted | ${contracts.drifted} |`,
      "",
      "| Build state | Anchors |",
      "| --- | ---: |",
      `| Passed | ${builds.passed} |`,
      `| Failed | ${builds.failed} |`,
      `| Stale | ${builds.stale} |`,
      `| Unverified | ${builds.unverified} |`,
      "",
      "| Dependency state | Anchors |",
      "| --- | ---: |",
      `| Matched | ${dependencies.matched} |`,
      `| Markdown-only review | ${dependencies["markdown-gap"]} |`,
      `| Additional Lean support | ${dependencies.supplemental} |`,
      `| Stale comparison | ${dependencies.stale} |`,
      `| Comparison unavailable | ${dependencies.unavailable} |`,
      ""
    );
  }
  if (index.projects.length > 0) {
    lines.push("## Projects", "");
    index.projects.forEach((project) => {
      const target = project.target ? `; build target \`${project.target}\`` : "";
      lines.push(`- **${project.key}**: \`${project.root}\`; sources ${project.sourceRoots.map((root) => `\`${root}\``).join(", ")}${target}`);
    });
    lines.push("");
  }
  if (index.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    index.diagnostics.forEach((diagnostic) => {
      const location = diagnostic.file ? ` (${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""})` : "";
      lines.push(`- **${diagnostic.severity.toUpperCase()} ${diagnostic.code}**${location}: ${diagnostic.message}`);
    });
    lines.push("");
  }
  if (index.unanchoredFormalObjects.length > 0) {
    lines.push("## Eligible formal objects without a Lean anchor", "");
    index.unanchoredFormalObjects.forEach((item) => {
      lines.push(`- \`${item.id}\` ${item.type} — ${item.title || "(untitled)"} (${item.filePath}${item.line ? `:${item.line}` : ""})`);
    });
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}
`;
}
const documentHash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const historyId = (value) => documentHash(JSON.stringify(value)).slice(0, 32);
const MAX_SNAPSHOT_BYTES$1 = 8 * 1024 * 1024;
const nodeFs$1 = require("node:fs/promises");
async function documentSafePath(root, relative) {
  if (!relative || path__namespace.isAbsolute(relative) || /[\\\x00-\x1f]/.test(relative) || relative.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Invalid document history path.");
  let file = root;
  for (const part of relative.split("/")) {
    file = path__namespace.join(file, part);
    try {
      if ((await nodeFs$1.lstat(file)).isSymbolicLink()) throw new Error("Document history cannot follow symbolic links.");
    } catch (error2) {
      if (error2.code !== "ENOENT") throw error2;
    }
  }
  return file;
}
function normalizeMilestone(value) {
  if (!value || !/^[a-f0-9]{32}$/.test(value.id) || typeof value.label !== "string" || !value.label.trim() || value.label.length > 80 || !/^[a-f0-9]{64}$/i.test(value.contentHash) || typeof value.recordedAt !== "string" || value.recordedAt.length > 80 || !["milestone", "publication", "git-tag"].includes(value.kind)) return;
  const source = value.source && typeof value.source === "object" ? Object.fromEntries(
    ["tag", "commit", "sourceTag", "sourceCommit", "profileId", "buildId", "recordId", "doi"].filter((key) => typeof value.source[key] === "string" && value.source[key].length <= 256).map((key) => [key, value.source[key]])
  ) : void 0;
  return { id: value.id, label: value.label.trim(), contentHash: value.contentHash.toLowerCase(), recordedAt: value.recordedAt, kind: value.kind, ...source ? { source } : {} };
}
async function saveDocumentSnapshot(root, content) {
  if (Buffer.byteLength(content) > MAX_SNAPSHOT_BYTES$1) throw new Error("This document exceeds the 8 MiB milestone snapshot limit.");
  const hash = documentHash(content), relative = `.math-workspace/document-snapshots/${hash}.md`;
  const file = await documentSafePath(root, relative);
  await fs__namespace.mkdir(path__namespace.dirname(file), { recursive: true });
  await documentSafePath(root, relative);
  const temporary2 = await documentSafePath(root, relative + ".tmp-" + crypto.randomBytes(12).toString("hex"));
  try {
    await fs__namespace.writeFile(temporary2, content, { encoding: "utf8", flag: "wx", mode: 384 });
    try {
      await nodeFs$1.link(temporary2, file);
    } catch (error2) {
      if (error2.code !== "EEXIST") throw error2;
    }
  } finally {
    await fs__namespace.rm(temporary2, { force: true });
  }
  if (documentHash(await fs__namespace.readFile(file, "utf8")) !== hash) throw new Error("The stored milestone snapshot changed.");
  return hash;
}
async function readDocumentSnapshot(root, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("Invalid milestone snapshot identity.");
  const file = await documentSafePath(root, `.math-workspace/document-snapshots/${hash}.md`);
  try {
    const stat = await fs__namespace.stat(file);
    if (!stat.isFile() || stat.size > MAX_SNAPSHOT_BYTES$1) throw new Error("Invalid milestone snapshot.");
    const content = await fs__namespace.readFile(file, "utf8");
    if (documentHash(content) !== hash) throw new Error("The stored milestone snapshot changed.");
    return content;
  } catch (error2) {
    if (error2.code === "ENOENT") return;
    throw error2;
  }
}
async function withDocumentStateLock(root, action) {
  const relative = ".math-workspace/document-state.lock", lock = await documentSafePath(root, relative);
  await fs__namespace.mkdir(path__namespace.dirname(lock), { recursive: true });
  try {
    await fs__namespace.mkdir(lock);
  } catch (error2) {
    if (error2.code !== "EEXIST") throw error2;
    const recovery = await documentSafePath(root, relative + ".recovery");
    try {
      await fs__namespace.mkdir(recovery);
    } catch {
      throw new Error("Document history lock recovery is active. Retry shortly.");
    }
    let stale;
    try {
      const owner = JSON.parse(await fs__namespace.readFile(await documentSafePath(root, relative + "/owner.json"), "utf8"));
      if (!Number.isInteger(owner?.pid) || owner.pid < 1) throw new Error("The document history lock requires inspection.");
      try {
        process.kill(owner.pid, 0);
        throw new Error("Another document-stage or milestone operation is active. Retry after it finishes.");
      } catch (probe) {
        if (probe.code !== "ESRCH") throw probe;
      }
      stale = lock + ".stale-" + crypto.randomBytes(8).toString("hex");
      await nodeFs$1.rename(lock, stale);
      await fs__namespace.mkdir(lock);
    } finally {
      if (stale) await fs__namespace.rm(stale, { recursive: true, force: true });
      await fs__namespace.rm(recovery, { recursive: true, force: true });
    }
  }
  try {
    await fs__namespace.writeFile(path__namespace.join(lock, "owner.json"), JSON.stringify({ pid: process.pid }), { flag: "wx", mode: 384 });
    return await action();
  } finally {
    await fs__namespace.rm(lock, { recursive: true, force: true });
  }
}
async function writeDocumentRecords(root, relative, records) {
  const file = await documentSafePath(root, relative), temporaryRelative = relative + ".tmp-" + crypto.randomBytes(12).toString("hex");
  const temporary2 = await documentSafePath(root, temporaryRelative);
  const bytes = JSON.stringify({ schemaVersion: 2, documents: records }, null, 2) + "\n";
  if (Buffer.byteLength(bytes) > 16 * 1024 * 1024) throw new Error("The document history exceeds the 16 MiB metadata limit.");
  await fs__namespace.mkdir(path__namespace.dirname(file), { recursive: true });
  try {
    await fs__namespace.writeFile(temporary2, bytes, { flag: "wx", mode: 384 });
    await nodeFs$1.rename(temporary2, file);
  } finally {
    await fs__namespace.rm(temporary2, { force: true });
  }
}
const STATE_FILE = ".math-workspace/documents.json";
const STAGES = /* @__PURE__ */ new Set(["draft", "revising", "stable"]);
const HARD_IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  ".lake",
  ".math-workspace",
  "node_modules",
  "out",
  "dist",
  ".vscode-test"
]);
function normalizedRelativePath(value) {
  if (typeof value !== "string") return "";
  const normalized = toPosix(value).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("../") || normalized.includes("/../") || path__namespace.posix.isAbsolute(normalized)) return "";
  return normalized;
}
function normalizedStage(value) {
  return typeof value === "string" && STAGES.has(value) ? value : void 0;
}
function normalizedCheckpoint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const raw = value;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const contentHash = typeof raw.contentHash === "string" ? raw.contentHash.trim() : "";
  const recordedAt = typeof raw.recordedAt === "string" ? raw.recordedAt.trim() : "";
  if (!label || label.length > 80 || !/^[a-f0-9]{64}$/i.test(contentHash) || !recordedAt || recordedAt.length > 80) return void 0;
  return { label, contentHash: contentHash.toLowerCase(), recordedAt, ...typeof raw.id === "string" && /^[a-f0-9]{32}$/.test(raw.id) ? { id: raw.id } : {} };
}
function normalizedRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const raw = value;
  const stage = normalizedStage(raw.stage);
  const stableContentHash = typeof raw.stableContentHash === "string" && /^[a-f0-9]{64}$/i.test(raw.stableContentHash) ? raw.stableContentHash.toLowerCase() : void 0;
  const checkpoint = normalizedCheckpoint(raw.checkpoint);
  if (raw.history !== void 0 && (!Array.isArray(raw.history) || raw.history.some((item) => !normalizeMilestone(item)))) throw new Error("Document milestone history is invalid; existing history was preserved.");
  const history = Array.isArray(raw.history) ? raw.history.map(normalizeMilestone) : [];
  if (new Set(history.map((item) => item.id)).size !== history.length) throw new Error("Document milestone history contains duplicate identities.");
  const selected = checkpoint?.id ? history.find((item) => item.id === checkpoint.id) : void 0;
  if (selected && (selected.label !== checkpoint.label || selected.contentHash !== checkpoint.contentHash || selected.recordedAt !== checkpoint.recordedAt)) throw new Error("The selected milestone conflicts with its immutable history.");
  if (checkpoint && !history.some((item) => item.id === checkpoint.id || item.label === checkpoint.label && item.contentHash === checkpoint.contentHash && item.recordedAt === checkpoint.recordedAt)) {
    history.push({ ...checkpoint, id: checkpoint.id || historyId(checkpoint), kind: "milestone" });
  }
  const updatedAt = typeof raw.updatedAt === "string" && raw.updatedAt.length <= 80 ? raw.updatedAt : void 0;
  if (!stage && !checkpoint && !history.length) return void 0;
  return {
    ...stage ? { stage } : {},
    ...stage === "stable" && stableContentHash ? { stableContentHash } : {},
    ...checkpoint ? { checkpoint } : {},
    ...history.length ? { history } : {},
    ...updatedAt ? { updatedAt } : {}
  };
}
function sourceHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
function configuredCollections(config2) {
  const raw = Array.isArray(config2?.documents?.collections) ? config2.documents.collections : [];
  const used = /* @__PURE__ */ new Set();
  const collections = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const item = candidate;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const mode = item.mode;
    const include = Array.isArray(item.include) ? item.include.map(normalizedRelativePath).filter(Boolean) : [];
    if (!id || id.length > 80 || used.has(id) || mode !== "draft" || include.length === 0) continue;
    used.add(id);
    const title = typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 120) : id;
    collections.push({ id, title, mode, include: [...new Set(include)] });
  }
  return collections;
}
function documentCollectionForPath(filePath, config2) {
  const normalized = normalizedRelativePath(filePath);
  if (!normalized) return void 0;
  return configuredCollections(config2).find((collection) => collection.include.some((pattern) => pathPatternMatches(normalized, pattern)));
}
function collectionMayContainPath(directoryPath, collection) {
  const directory = normalizedRelativePath(directoryPath);
  if (!directory) return true;
  return collection.include.some((pattern) => {
    const prefix = normalizedRelativePath(pattern.split(/[?*]/, 1)[0]);
    if (!prefix) return true;
    return prefix === directory || prefix.startsWith(`${directory}/`) || directory.startsWith(`${prefix}/`);
  });
}
function isHardIgnoredDirectory(name) {
  return HARD_IGNORED_DIRECTORIES.has(name);
}
function documentStateRelativePath(config2) {
  const configured = normalizedRelativePath(config2?.documents?.stateFile);
  return configured || STATE_FILE;
}
function emptyState(stateFile) {
  return { schemaVersion: 2, stateFile, records: {}, lifecycles: {}, orphaned: [] };
}
async function readRecords(rootPath, config2) {
  const stateFile = documentStateRelativePath(config2);
  const absolute = path__namespace.join(rootPath, stateFile);
  let parsed;
  try {
    await documentSafePath(rootPath, stateFile);
    if ((await fs__namespace.stat(absolute)).size > 16 * 1024 * 1024) throw new Error("Document state exceeds the metadata limit.");
    parsed = JSON.parse(await fs__namespace.readFile(absolute, "utf8"));
  } catch (error2) {
    if (error2?.code === "ENOENT") return { stateFile, records: {} };
    throw new Error(`Could not read ${stateFile}: ${error2 instanceof Error ? error2.message : String(error2)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${stateFile} must contain an object.`);
  }
  if (![1, 2].includes(parsed.schemaVersion ?? 1)) throw new Error("This document history schema is not supported.");
  const rawRecords = parsed.documents;
  if (!rawRecords || typeof rawRecords !== "object" || Array.isArray(rawRecords)) return { stateFile, records: {} };
  const records = {};
  for (const [filePath, value] of Object.entries(rawRecords)) {
    const normalized = normalizedRelativePath(filePath);
    const record = normalizedRecord(value);
    if (normalized && record) records[normalized] = record;
  }
  return { stateFile, records };
}
async function readDocumentState(rootPath, config2, documents) {
  const { stateFile, records } = await readRecords(rootPath, config2);
  const state = emptyState(stateFile);
  state.records = records;
  documents.forEach((content, filePath) => {
    const collection = documentCollectionForPath(filePath, config2);
    const record = collection ? void 0 : records[filePath];
    const checkpoint = record?.checkpoint;
    const contentHash = sourceHash(content);
    const changedSinceStable = record?.stage === "stable" && !!record.stableContentHash && record.stableContentHash !== contentHash;
    const stableBaselineMissing = record?.stage === "stable" && !record.stableContentHash;
    const publication = (record?.history || []).filter((item) => item.kind === "publication").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    state.lifecycles[filePath] = {
      mode: collection ? "draft" : "formal",
      ...collection ? { collectionId: collection.id, collectionTitle: collection.title } : {},
      ...collection ? {} : { stage: changedSinceStable ? "revising" : record?.stage || "draft", changedSinceStable, stableBaselineMissing },
      ...checkpoint ? { checkpoint } : {},
      milestoneCount: record?.history?.length || 0,
      ...publication ? { publication, changedSincePublication: publication.contentHash !== contentHash } : {},
      changedSinceCheckpoint: !!checkpoint && checkpoint.contentHash !== contentHash
    };
  });
  state.orphaned = Object.keys(records).filter((filePath) => !documents.has(filePath)).sort();
  return state;
}
async function updateDocumentState(rootPath, config2, documents, update) {
  const filePath = normalizedRelativePath(update.filePath);
  const content = documents.get(filePath);
  if (!filePath || content === void 0) throw new Error("The document is not part of the bound Math Workspace project.");
  const stage = update.stage === void 0 ? void 0 : normalizedStage(update.stage);
  if (documentCollectionForPath(filePath, config2)) throw new Error("Draft collections do not use formal document stages or milestones.");
  if (update.stage !== void 0 && !stage) throw new Error("The document stage is invalid.");
  if (update.checkpointLabel !== void 0 || update.checkpointId !== void 0) throw new Error("Milestones are created by successful publication. Use the publication workflow.");
  if (update.milestone && update.milestone.entry?.kind !== "publication") throw new Error("Only a published edition can create or restore a milestone.");
  if (!stage && !update.clearCheckpoint && !update.milestone) throw new Error("Choose a document stage or restore a published edition.");
  return withDocumentStateLock(rootPath, async () => {
    if (update.expectedContentHash !== void 0) {
      if (update.expectedContentHash !== sourceHash(content) || documentHash(await fs__namespace.readFile(await documentSafePath(rootPath, filePath), "utf8")) !== update.expectedContentHash) throw new Error("The document changed. Reload before recording its stage or milestone.");
    }
    const { stateFile, records } = await readRecords(rootPath, config2);
    const previous = records[filePath] || {};
    const next = {
      ...previous,
      ...stage ? { stage } : {},
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (stage === "stable") next.stableContentHash = sourceHash(content);
    else if (stage) delete next.stableContentHash;
    if (update.milestone) {
      const { entry, content: priorContent } = update.milestone;
      if (!normalizeMilestone(entry) || documentHash(priorContent) !== entry.contentHash) throw new Error("Historical snapshot identity changed.");
      await saveDocumentSnapshot(rootPath, priorContent);
      const known = (previous.history || []).find((item) => item.id === entry.id);
      if (known && JSON.stringify(known) !== JSON.stringify(normalizeMilestone(entry))) throw new Error("The immutable milestone record changed.");
      next.history = known ? previous.history : [...previous.history || [], entry];
      next.checkpoint = { id: entry.id, label: entry.label, recordedAt: entry.recordedAt, contentHash: entry.contentHash };
    }
    if (update.clearCheckpoint) delete next.checkpoint;
    records[filePath] = next;
    const sorted2 = Object.fromEntries(Object.entries(records).sort(([left], [right]) => left.localeCompare(right)));
    await writeDocumentRecords(rootPath, stateFile, sorted2);
    return readDocumentState(rootPath, config2, documents);
  });
}
const documentState = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  collectionMayContainPath,
  documentCollectionForPath,
  documentStateRelativePath,
  isHardIgnoredDirectory,
  readDocumentState,
  updateDocumentState
}, Symbol.toStringTag, { value: "Module" }));
const nodeFs = require("node:fs");
const REFRESH_DELAY_MS = 160;
const SOURCE_EVENT_MAX_ENTRIES = 4096;
const SOURCE_EVENT_MAX_BYTES = 8 * 1024 * 1024;
function isLeanReviewMetadataPath(filePath) {
  return /^\.math-workspace\/(?:lean-audits|lean-reviews|lean-review-evidence|lean-assistance)\/h-[0-9a-f]{16,32}\.json$/i.test(toPosix(filePath));
}
function pathExists(filePath) {
  return fs__namespace.access(filePath).then(() => true, () => false);
}
async function readConfig(rootPath) {
  const configPath2 = path__namespace.join(rootPath, ".math-workspace", "config.json");
  if (!await pathExists(configPath2)) {
    throw new Error("Math Workspace requires .math-workspace/config.json in the project root. Run `math-workspace init` first.");
  }
  return mergeConfig(JSON.parse(await fs__namespace.readFile(configPath2, "utf8")));
}
async function collectMarkdownFiles(rootPath, config2, directory = rootPath, files = [], budget, inputs) {
  await inputs?.track(directory);
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (budget && --budget.entries < 0) throw new Error("Source watcher inspection limit reached.");
    const absolutePath = path__namespace.join(directory, entry.name);
    const relativePath = toPosix(path__namespace.relative(rootPath, absolutePath));
    if (entry.isDirectory()) {
      if (entry.name !== ".lake" && !shouldExcludeScanPath(relativePath, config2)) {
        await collectMarkdownFiles(rootPath, config2, absolutePath, files, budget, inputs);
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !shouldExcludeScanPath(relativePath, config2)) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(path__namespace.relative(rootPath, left)).localeCompare(toPosix(path__namespace.relative(rootPath, right))));
}
async function collectDraftMarkdownFiles(rootPath, config2, directory = rootPath, files = [], budget, inputs) {
  const collections = Array.isArray(config2?.documents?.collections) ? config2.documents.collections : [];
  if (!collections.length) return files;
  await inputs?.track(directory);
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (budget && --budget.entries < 0) throw new Error("Source watcher inspection limit reached.");
    if (entry.isDirectory() && isHardIgnoredDirectory(entry.name)) continue;
    const absolutePath = path__namespace.join(directory, entry.name);
    const relativePath = toPosix(path__namespace.relative(rootPath, absolutePath));
    if (entry.isDirectory()) {
      const collectionCouldContain = collections.some((collection) => collectionMayContainPath(relativePath, collection));
      if (collectionCouldContain) {
        await collectDraftMarkdownFiles(rootPath, config2, absolutePath, files, budget, inputs);
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && documentCollectionForPath(relativePath, config2)) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(path__namespace.relative(rootPath, left)).localeCompare(toPosix(path__namespace.relative(rootPath, right))));
}
function draftTitle(content, filePath) {
  const heading2 = content.split(/\r?\n/).find((line) => /^\s{0,3}#\s+/.test(line));
  if (heading2) return heading2.replace(/^\s{0,3}#\s+/, "").trim();
  return path__namespace.posix.basename(filePath).replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || filePath;
}
async function readIndex(rootPath, name) {
  try {
    return JSON.parse(await fs__namespace.readFile(path__namespace.join(rootPath, ".math-workspace", `${name}.json`), "utf8"));
  } catch (error2) {
    if (error2?.code === "ENOENT") return void 0;
    throw error2;
  }
}
async function loadWorkspaceSnapshot(rootPath, revision = 1, options = {}) {
  const resolvedRoot = path__namespace.resolve(rootPath);
  const inputs = options.inputs;
  await inputs?.track(path__namespace.join(resolvedRoot, ".math-workspace/config.json"));
  const config2 = await readConfig(resolvedRoot);
  await Promise.all(["definitions.json", "symbols.json", "lean-contracts.json", "lean-build.json", "lean-dependency-graph.json"].map((file) => inputs?.track(path__namespace.join(resolvedRoot, ".math-workspace", file))));
  await inputs?.track(path__namespace.join(resolvedRoot, documentStateRelativePath(config2)));
  const [formalFiles, draftFiles] = await Promise.all([
    collectMarkdownFiles(resolvedRoot, config2, resolvedRoot, [], void 0, inputs),
    collectDraftMarkdownFiles(resolvedRoot, config2, resolvedRoot, [], void 0, inputs)
  ]);
  await Promise.all([...formalFiles, ...draftFiles].map((file) => inputs?.track(file)));
  const formalDocuments = await Promise.all(formalFiles.map(async (absolutePath) => ({
    filePath: toPosix(path__namespace.relative(resolvedRoot, absolutePath)),
    content: await fs__namespace.readFile(absolutePath, "utf8")
  })));
  const draftDocuments = await Promise.all(draftFiles.map(async (absolutePath) => ({
    filePath: toPosix(path__namespace.relative(resolvedRoot, absolutePath)),
    content: await fs__namespace.readFile(absolutePath, "utf8")
  })));
  const documents = [...formalDocuments, ...draftDocuments].sort((left, right) => left.filePath.localeCompare(right.filePath));
  const [definitions, symbols] = await Promise.all([
    readIndex(resolvedRoot, "definitions"),
    readIndex(resolvedRoot, "symbols")
  ]);
  const formalState = scanFormalDocuments(formalDocuments, config2, symbols, definitions);
  formalState.pages.forEach((page) => {
    page.documentMode = "formal";
  });
  const draftPages = draftDocuments.map((document, order) => {
    const collection = documentCollectionForPath(document.filePath, config2);
    return {
      kind: "draft",
      filePath: document.filePath,
      title: draftTitle(document.content, document.filePath),
      order,
      documentMode: "draft",
      documentCollectionId: collection?.id,
      documentCollectionTitle: collection?.title
    };
  });
  formalState.pages = sortManuscriptPages([...formalState.pages, ...draftPages], "workspace");
  const analysisPending = options.deferLean && config2.lean?.projects?.length > 0;
  const leanIndex = analysisPending ? void 0 : await scanLeanWorkspace(resolvedRoot, config2, formalState.labels, formalState.dependencyGraph, inputs);
  formalState.issues.push(...(leanIndex?.diagnostics || []).map((diagnostic) => ({
    severity: diagnostic.severity,
    code: diagnostic.code,
    file: diagnostic.file,
    line: diagnostic.line,
    message: diagnostic.message
  })));
  return {
    revision,
    refreshedAt: (/* @__PURE__ */ new Date()).toISOString(),
    state: {
      ...formalState,
      analysisPending: !!analysisPending,
      leanIndex,
      documentState: await readDocumentState(resolvedRoot, config2, new Map(documents.map((document) => [document.filePath, document.content])))
    },
    documents: new Map(documents.map((document) => [document.filePath, document.content]))
  };
}
class ReaderWorkspace {
  constructor(rootPath, options = {}) {
    this.rootPath = rootPath;
    this.options = options;
    this.refreshing = false;
    this.closed = false;
    this.refreshQueued = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.pendingChangedPaths = /* @__PURE__ */ new Set();
    this.pendingMetadataPaths = /* @__PURE__ */ new Set();
  }
  async start() {
    this.closed = false;
    await this.refresh();
    this.watcher = nodeFs.watch(this.rootPath, { recursive: true }, (_event, fileName) => {
      const relativePath = typeof fileName === "string" ? toPosix(fileName) : "";
      if (isLeanReviewMetadataPath(relativePath)) {
        if (this.pendingMetadataPaths.size < 256) this.pendingMetadataPaths.add(relativePath);
        if (this.metadataTimer) clearTimeout(this.metadataTimer);
        this.metadataTimer = setTimeout(() => {
          this.metadataTimer = void 0;
          const changedPaths = [...this.pendingMetadataPaths].sort();
          this.pendingMetadataPaths.clear();
          this.notifyMetadataChange(changedPaths);
        }, REFRESH_DELAY_MS);
        return;
      }
      const stateFile = documentStateRelativePath(this.snapshot?.state.config || mergeConfig({}));
      if (relativePath && relativePath === stateFile) {
        void this.refreshDocumentState(relativePath).catch((error2) => console.error(`[math-workspace] Document state refresh failed: ${error2.message || error2}`));
        return;
      }
      if (relativePath && !this.shouldRefresh(relativePath)) return;
      void this.sourcePathChanged(relativePath).then((changed) => {
        if (changed && !this.closed) this.scheduleRefresh(relativePath);
      }).catch(() => {
        if (!this.closed) this.scheduleRefresh(relativePath);
      });
    });
    this.watcher.on?.("error", (error2) => {
      console.warn(`[math-workspace] Math Workspace watcher error: ${error2.message}`);
    });
  }
  async close() {
    this.closed = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.metadataTimer) clearTimeout(this.metadataTimer);
    this.refreshTimer = void 0;
    this.metadataTimer = void 0;
    this.pendingMetadataPaths.clear();
    this.watcher?.close?.();
    this.listeners.clear();
  }
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  current() {
    if (!this.snapshot) throw new Error("Math Workspace is not ready.");
    return this.snapshot;
  }
  /** Optional Lean facts share the source snapshot, without delaying the first readable page.
   * A source refresh owns a new document map; an older analysis can never replace it. */
  async completeLeanAnalysis() {
    const source = this.current();
    if (this.closed || !source.state.analysisPending) return source;
    if (this.leanAnalysis?.documents === source.documents) return this.leanAnalysis.promise;
    const job = { documents: source.documents, promise: void 0 };
    job.promise = (async () => {
      const leanIndex = await scanLeanWorkspace(this.rootPath, source.state.config, source.state.labels, source.state.dependencyGraph);
      const current = this.current();
      if (!this.closed && current.documents === source.documents) {
        this.snapshot = { ...current, state: {
          ...current.state,
          leanIndex,
          analysisPending: false,
          issues: [...current.state.issues, ...leanIndex.diagnostics.map((diagnostic) => ({
            severity: diagnostic.severity,
            code: diagnostic.code,
            file: diagnostic.file,
            line: diagnostic.line,
            message: diagnostic.message
          }))]
        } };
      }
      return this.current();
    })().finally(() => {
      if (this.leanAnalysis === job) this.leanAnalysis = void 0;
    });
    this.leanAnalysis = job;
    return job.promise;
  }
  async reload() {
    await this.refresh();
    return this.current();
  }
  applyDocumentState(documentState2, changedPaths = []) {
    const current = this.current();
    const snapshot = {
      ...current,
      revision: current.revision + 1,
      refreshedAt: (/* @__PURE__ */ new Date()).toISOString(),
      state: { ...current.state, documentState: documentState2 }
    };
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener({ snapshot, changedPaths }));
    return snapshot;
  }
  /** Review and assistance metadata live in their own stores. Notify controllers to reload them while
   * retaining the scanned source, document maps and Lean index byte-for-byte. */
  notifyMetadataChange(changedPaths) {
    const paths = [...new Set(changedPaths.filter(isLeanReviewMetadataPath))].slice(0, 256).sort();
    const current = this.current();
    if (!paths.length) return current;
    const snapshot = { ...current, revision: current.revision + 1, refreshedAt: (/* @__PURE__ */ new Date()).toISOString() };
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener({ snapshot, changedPaths: paths }));
    return snapshot;
  }
  async refreshDocumentState(filePath) {
    const current = this.current();
    const documentState2 = await readDocumentState(this.rootPath, current.state.config, current.documents);
    this.applyDocumentState(documentState2, [filePath]);
  }
  scheduleRefresh(filePath = "") {
    if (filePath) this.pendingChangedPaths.add(filePath.replace(/^\/+/, ""));
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = void 0;
      void this.refresh().catch((error2) => console.error(`[math-workspace] Math Workspace refresh failed: ${error2.message || error2}`));
    }, REFRESH_DELAY_MS);
  }
  /** FSEvents may deliver pre-watch source creation events together with a later metadata
   * write. Compare the affected inputs to the current snapshot before parsing them again.
   * Unknown, oversized and genuine source changes keep the conservative refresh path. */
  async sourcePathChanged(filePath) {
    const normalized = toPosix(filePath).replace(/^\/+/, "");
    if (!normalized || !this.snapshot) return true;
    if (isLeanSourcePath(this.snapshot.state.config, normalized)) return true;
    const candidate = path__namespace.resolve(this.rootPath, normalized);
    if (normalized === ".math-workspace/config.json") {
      const stat2 = await fs__namespace.stat(candidate);
      if (stat2.size > SOURCE_EVENT_MAX_BYTES) return true;
      const config22 = mergeConfig(JSON.parse(await fs__namespace.readFile(candidate, "utf8")));
      return JSON.stringify(config22) !== JSON.stringify(this.current().state.config);
    }
    if (this.snapshot.documents.has(normalized)) {
      const stat2 = await require("node:fs/promises").lstat(candidate);
      if (!stat2.isFile() || stat2.size > SOURCE_EVENT_MAX_BYTES) return true;
      const content = await fs__namespace.readFile(candidate, "utf8");
      return content !== this.current().documents.get(normalized);
    }
    let stat, directory = candidate, prefix = normalized + "/";
    if (normalized === path__namespace.basename(this.rootPath)) {
      if (this.current().state.config?.lean?.projects?.length) return true;
      if (await this.sourcePathChanged(".math-workspace/config.json")) return true;
      directory = this.rootPath;
      prefix = "";
      stat = await require("node:fs/promises").lstat(directory);
    } else {
      try {
        stat = await require("node:fs/promises").lstat(candidate);
      } catch (_error) {
        return true;
      }
    }
    if (!stat.isDirectory() || isLeanSourcePath(this.snapshot.state.config, normalized + "/source.lean")) return true;
    const config2 = this.snapshot.state.config, budget = { entries: SOURCE_EVENT_MAX_ENTRIES };
    const files = [.../* @__PURE__ */ new Set([
      ...await collectMarkdownFiles(this.rootPath, config2, directory, [], budget),
      ...await collectDraftMarkdownFiles(this.rootPath, config2, directory, [], budget)
    ])];
    const current = this.current();
    const expected = [...current.documents.keys()].filter((key) => key.startsWith(prefix));
    if (files.length !== expected.length) return true;
    let bytes = 0;
    for (const file of files) {
      const relative = toPosix(path__namespace.relative(this.rootPath, file));
      if (!this.current().documents.has(relative)) return true;
      bytes += (await fs__namespace.stat(file)).size;
      if (bytes > SOURCE_EVENT_MAX_BYTES) return true;
      if (await fs__namespace.readFile(file, "utf8") !== this.current().documents.get(relative)) return true;
    }
    return config2 !== this.current().state.config;
  }
  shouldRefresh(filePath) {
    const normalized = toPosix(filePath).replace(/^\/+/, "");
    if (!normalized) return true;
    if (normalized === ".math-workspace/config.json") return true;
    if (normalized === ".math-workspace/definitions.json") return true;
    if (normalized === ".math-workspace/symbols.json") return true;
    if (normalized === ".math-workspace/lean-build.json") return true;
    if (normalized === ".math-workspace/lean-contracts.json") return true;
    if (normalized === ".math-workspace/lean-dependency-graph.json") return true;
    if (normalized === documentStateRelativePath(this.snapshot?.state.config || mergeConfig({}))) return true;
    if (normalized === ".math-workspace" || normalized.startsWith(".math-workspace/")) return false;
    if (isLeanSourcePath(this.snapshot?.state.config || mergeConfig({}), normalized)) return true;
    return !shouldExcludeScanPath(normalized, this.snapshot?.state.config || mergeConfig({}));
  }
  async refresh() {
    if (this.refreshing) {
      this.refreshQueued = true;
      return;
    }
    this.refreshing = true;
    try {
      do {
        this.refreshQueued = false;
        const changedPaths = Array.from(this.pendingChangedPaths).sort();
        this.pendingChangedPaths.clear();
        const refreshed = await loadWorkspaceSnapshot(this.rootPath, (this.snapshot?.revision || 0) + 1, this.options);
        refreshed.revision = (this.snapshot?.revision || 0) + 1;
        this.snapshot = refreshed;
        this.listeners.forEach((listener) => listener({ snapshot: this.snapshot, changedPaths }));
      } while (this.refreshQueued);
    } finally {
      this.refreshing = false;
    }
  }
}
const fs$5 = require("node:fs/promises");
const configPath = ".math-workspace/config.json";
async function readPublicationMetadata(root) {
  let bytes;
  try {
    bytes = await fs$5.readFile(await safePath(root, configPath));
  } catch (error2) {
    if (error2.code !== "ENOENT") throw error2;
  }
  const config2 = bytes ? JSON.parse(bytes.toString("utf8")) : {};
  if (!config2 || typeof config2 !== "object" || Array.isArray(config2)) throw new Error("Invalid project configuration.");
  return { config: config2, record: { value: projectMetadata(config2), revision: sha256(bytes || "") } };
}
function publicationCover(cover, config2) {
  const image2 = cover?.image ?? config2?.pdf?.coverImage;
  return { ...cover, ...image2 === void 0 ? {} : { image: image2 === "" ? "" : relativeInput(image2) } };
}
function resolvePublicationMetadata(profile, config2) {
  const value = mergeWorkMetadata(projectMetadata(config2), normalizeWorkMetadata(profile));
  if (!value.title) throw new Error("Publication title is required in project metadata or this edition.");
  return { ...profile, ...value, cover: publicationCover(profile.cover, config2), authors: value.authors || [], language: value.language || (config2.language === "en" ? "en-US" : "zh-CN"), license: value.license || "cc-by-4.0", doi: { ...value.doi, ...profile.doi } };
}
async function savePublicationMetadata(store, input, expectedRevision) {
  const value = normalizeWorkMetadata(input);
  return store.locked("project-metadata", async () => {
    const { config: config2, record } = await readPublicationMetadata(store.root);
    if (record.revision !== expectedRevision) throw new Error("Project metadata changed. Reload it before saving.");
    await atomicJson$1(store.root, configPath, { ...config2, metadata: value });
    return (await readPublicationMetadata(store.root)).record;
  }, "metadata");
}
function discoverPublicationMatter(profile, pages) {
  const chosen = pages.filter((page) => profile.chapters.includes(page.path) && page.kind !== "appendix");
  const anchors = chosen.length ? chosen : pages.filter((page) => profile.chapters.includes(page.path));
  const excluded = new Set(profile.matter?.exclude || []);
  const manual = profile.matter?.automatic ? [] : [...profile.frontMatter || [], ...profile.backMatter || []];
  const explicit = new Set(manual.map((entry) => entry.file).filter(Boolean));
  if (!profile.matter?.automatic && profile.continued?.file) explicit.add(profile.continued.file);
  const inScope = (page) => {
    if (!anchors.length || explicit.has(page.path) || excluded.has(page.path)) return false;
    const scope = profile.scope;
    if (scope && (scope.books?.length || scope.volumes?.length || scope.paths?.length)) {
      if (!(scope.books?.includes(page.book) || scope.volumes?.includes(page.volume) || scope.paths?.some((name) => page.path === name || page.path.startsWith(`${name}/`)))) return false;
    }
    return anchors.some((anchor) => page.book === anchor.book && (page.volume === void 0 || page.volume === anchor.volume));
  };
  const found = pages.filter(inScope);
  return {
    frontMatter: found.filter((page) => page.volume === void 0 && ["front-matter", "intro"].includes(page.kind)),
    backMatter: found.filter((page) => page.volume === void 0 && ["back-matter", "summary", "continued"].includes(page.kind)),
    volumeMatter: found.filter((page) => page.volume !== void 0 && ["front-matter", "intro", "back-matter", "summary", "continued"].includes(page.kind)),
    appendices: found.filter((page) => page.kind === "appendix"),
    continued: found.filter((page) => page.kind === "continued")
  };
}
function hasPublicationContinuedManuscript(profile, pages) {
  if (profile.matter?.automatic) return discoverPublicationMatter({ ...profile, matter: { ...profile.matter, exclude: [] } }, pages).continued.length > 0;
  const manuscripts = /* @__PURE__ */ new Set([...profile.chapters, ...(profile.backMatter || []).map((entry) => entry.file)]);
  return !profile.continued?.file && pages.some((page) => page.kind === "continued" && manuscripts.has(page.path));
}
function resolvePublicationMatter(profile, pages) {
  if (!profile.matter?.automatic) return profile;
  const found = discoverPublicationMatter(profile, pages);
  const entry = (page) => ({ file: page.path, includeInToc: true });
  const available = profile.matter.exclude?.length ? discoverPublicationMatter({ ...profile, matter: { ...profile.matter, exclude: [] } }, pages) : found;
  const included = (page) => page.kind !== "continued" || profile.continued?.enabled !== false;
  const assigned = new Set([...available.frontMatter, ...available.backMatter, ...available.volumeMatter].map((page) => page.path));
  const continued = { enabled: profile.continued?.enabled };
  return { ...profile, frontMatter: found.frontMatter.map(entry), backMatter: found.backMatter.filter(included).map(entry), chapters: [.../* @__PURE__ */ new Set([...profile.chapters.filter((file) => !assigned.has(file)), ...found.volumeMatter.filter(included).map((page) => page.path), ...found.appendices.map((page) => page.path)])], continued };
}
require("node:fs/promises");
const { spawn } = require("node:child_process");
const { homedir } = require("node:os");
const MAX_TEXT = 24e3;
const MAX_INPUT_FILES = 3e4;
const MAX_INPUT_BYTES = 512 * 1024 * 1024;
const RECORD_PREFIX = "MW_LEAN_REVIEW	";
const LEAN_NAME = /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/;
function reviewHash(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function formalReviewId(value) {
  const id = String(value || "").replace(/^[@#]/, "").trim().toLowerCase();
  if (!HASH_ID_RE.test(id)) throw new LeanReviewError(400, "A stable formal h-* ID is required.");
  return id;
}
class LeanReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function reviewPathInside(root, candidate) {
  const relative = path__namespace.relative(root, candidate);
  return !path__namespace.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path__namespace.sep}`);
}
async function reviewSafePath(root, relative, optional = false) {
  if (typeof relative !== "string" || path__namespace.isAbsolute(relative) || relative.includes("\0")) {
    throw new LeanReviewError(400, "Review paths must be project-relative.");
  }
  const candidate = path__namespace.resolve(root, relative);
  if (!reviewPathInside(root, candidate)) throw new LeanReviewError(400, "Review path is outside the prepared project.");
  try {
    const resolved = await fs__namespace.realpath(candidate);
    if (!reviewPathInside(root, resolved)) throw new LeanReviewError(400, "Review path escapes the project through a symlink.");
    return resolved;
  } catch (error2) {
    if (optional && error2?.code === "ENOENT") return void 0;
    throw error2;
  }
}
async function validateReviewWorkspace(root) {
  const canonical2 = await fs__namespace.realpath(root);
  const configPath2 = await reviewSafePath(canonical2, ".math-workspace/config.json");
  const config2 = JSON.parse(await fs__namespace.readFile(configPath2, "utf8"));
  for (const project of leanProjects(config2)) {
    const projectRoot = await reviewSafePath(canonical2, project.root);
    if (!projectRoot) continue;
    for (const source of project.sourceRoots) await reviewSafePath(projectRoot, source);
  }
  return canonical2;
}
function bounded(value) {
  return value.length > MAX_TEXT ? { content: value.slice(0, MAX_TEXT), truncated: true } : { content: value };
}
function snippet(filePath, lines, start, end, role, context = false) {
  const startLine = Math.max(1, Math.min(lines.length, start));
  const endLine = Math.max(startLine, Math.min(lines.length, end));
  const source = lines.slice(startLine - 1, endLine).join("\n");
  return {
    filePath,
    startLine,
    endLine,
    ...bounded(source),
    fingerprint: reviewHash(source),
    role,
    ...context ? { rangeKind: "context" } : { rangeKind: "source" }
  };
}
function matchingSnippet(snapshot, label, text2, role) {
  const source = snapshot.documents.get(label.filePath);
  if (source === void 0 || !text2) return void 0;
  const lines = source.split(/\r?\n/);
  const contentLines = text2.split(/\r?\n/);
  const from = Math.max(0, label.startLine || 0);
  for (let index = from; index < lines.length; index++) {
    if (lines.slice(index, index + contentLines.length).join("\n") === contentLines.join("\n")) {
      return snippet(label.filePath, lines, index + 1, index + contentLines.length, role);
    }
  }
  return void 0;
}
async function readReviewSourceLines(root, filePath, inputs) {
  const read = async () => (await fs__namespace.readFile(await reviewSafePath(root, filePath), "utf8")).split(/\r?\n/);
  if (!inputs) return read();
  if (!inputs.has(filePath)) inputs.set(filePath, read());
  return inputs.get(filePath);
}
function declarationReviewKey(projectKey, qualifiedName) {
  return `${projectKey}:${qualifiedName}`;
}
async function declarationSource(root, declaration2, inputs) {
  const lines = await readReviewSourceLines(root, declaration2.filePath, inputs);
  const start = Math.max(1, declaration2.line);
  let end = lines.length;
  for (let index = start; index < lines.length; index++) {
    if (/^\s*(?:\/--|(?:private |protected |noncomputable |unsafe |opaque |partial )*(?:def|abbrev|theorem|lemma|structure|class|inductive|instance|axiom)\s|namespace\s|section\b|end\b)/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return snippet(declaration2.filePath, lines, start, end, "declaration", true);
}
async function manifestDependencies(root, projectRoot, inputs) {
  await inputs?.track(path__namespace.join(projectRoot, "lake-manifest.json"));
  const manifestPath = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.join(projectRoot, "lake-manifest.json"))), true);
  if (!manifestPath) return [];
  const manifest = JSON.parse(await fs__namespace.readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.packages)) throw new Error("Lake manifest package entries are unavailable.");
  const packagesDir = typeof manifest.packagesDir === "string" ? manifest.packagesDir : ".lake/packages";
  const dependencies = [];
  for (const entry of manifest.packages) {
    let dependency;
    if (entry.type === "path" && typeof entry.dir === "string") dependency = path__namespace.resolve(projectRoot, entry.dir);
    else if (entry.type === "git" && typeof entry.name === "string" && /^[A-Za-z0-9_.-]+$/.test(entry.name)) {
      dependency = path__namespace.resolve(projectRoot, packagesDir, entry.name, typeof entry.subDir === "string" ? entry.subDir : ".");
    } else throw new Error("Unsupported Lake manifest dependency format; initialize dependencies deliberately outside the Reader.");
    if (!reviewPathInside(root, dependency)) throw new Error("A Lake dependency is outside the prepared Math Workspace; its input boundary cannot be tracked.");
    const resolved = await reviewSafePath(root, toPosix(path__namespace.relative(root, dependency)), true);
    if (!resolved) throw new Error(`Lake dependency is not installed locally: ${toPosix(path__namespace.relative(root, dependency))}.`);
    dependencies.push({ directory: resolved, ...entry.type === "git" ? { gitRevision: entry.rev } : {} });
  }
  return dependencies;
}
async function inputFingerprint(root, project, inputs, hashes) {
  const projectRoot = await reviewSafePath(root, project.root);
  const files = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  let diagnostic;
  let bytes = 0;
  const visit = async (directory, packages = false) => {
    if (visited.has(directory)) return;
    visited.add(directory);
    await inputs?.track(directory);
    const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if ([".git", "node_modules", ".math-workspace"].includes(entry.name)) continue;
      const candidate = path__namespace.join(directory, entry.name);
      const isInput = entry.name.endsWith(".lean") || ["lakefile.toml", "lake-manifest.json", "lean-toolchain"].includes(entry.name);
      if (entry.isSymbolicLink()) {
        await inputs?.track(candidate);
        const resolved = await reviewSafePath(root, toPosix(path__namespace.relative(root, candidate)));
        if (!isInput && (await fs__namespace.stat(resolved)).isFile()) continue;
        throw new LeanReviewError(400, `Lean input symlink is not supported for review evidence: ${toPosix(path__namespace.relative(root, candidate))}`);
      }
      if (entry.isDirectory()) {
        if (entry.name !== ".lake") await visit(candidate, packages);
      } else if (entry.isFile() && isInput) {
        await inputs?.track(candidate);
        const value = hashes ? await hashes.read(candidate, true, inputs) : void 0;
        const text2 = value ? void 0 : await fs__namespace.readFile(candidate, "utf8");
        bytes += value ? value.length : text2.length;
        if (files.size >= MAX_INPUT_FILES || bytes > MAX_INPUT_BYTES) throw new LeanReviewError(413, "Lean project inputs exceed the bounded review evidence limit.");
        files.set(toPosix(path__namespace.relative(root, candidate)), value ? value.hash : reviewHash(text2));
      }
    }
  };
  await visit(projectRoot);
  try {
    for (const dependency of await manifestDependencies(root, projectRoot, inputs)) await visit(dependency.directory, true);
    const manifestFile = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.join(projectRoot, "lake-manifest.json"))), true);
    const manifest = manifestFile ? JSON.parse(await fs__namespace.readFile(manifestFile, "utf8")) : {};
    const lakeDir = typeof manifest.lakeDir === "string" ? manifest.lakeDir : ".lake";
    await inputs?.track(path__namespace.resolve(projectRoot, lakeDir, "package-overrides.json"));
    const override = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.resolve(projectRoot, lakeDir, "package-overrides.json"))), true);
    if (override) {
      files.set(toPosix(path__namespace.relative(root, override)), reviewHash(await fs__namespace.readFile(override, "utf8")));
      diagnostic = "Lake package overrides require deliberate external resolution; override dependencies are not admitted by the Reader.";
    }
  } catch (error2) {
    diagnostic = error2.message || String(error2);
  }
  const toolchainFile = await reviewSafePath(projectRoot, "lean-toolchain", true);
  const toolchain = toolchainFile ? (await fs__namespace.readFile(toolchainFile, "utf8")).trim() : "";
  const toolchainRoot = installedToolchainRoot(toolchain);
  let binaryIdentity = "unavailable";
  if (toolchainRoot) {
    try {
      await inputs?.track(path__namespace.join(toolchainRoot, "bin", "lean"));
      const stat = await fs__namespace.stat(path__namespace.join(toolchainRoot, "bin", "lean"));
      binaryIdentity = { path: toolchainRoot, size: stat.size, mtimeMs: stat.mtimeMs };
    } catch (_error) {
    }
  }
  return { toolchain, diagnostic, fingerprint: reviewHash(JSON.stringify({
    project,
    binaryIdentity,
    diagnostic,
    inputs: [...files.entries()].sort(([left], [right]) => left.localeCompare(right))
  })) };
}
function installedToolchainRoot(toolchain) {
  if (!/^[A-Za-z0-9_.:/-]+$/.test(toolchain) || toolchain.includes("..")) return void 0;
  const directory = toolchain.replace(/\//g, "--").replace(/:/g, "---");
  return path__namespace.join(process.env.ELAN_HOME || path__namespace.join(homedir(), ".elan"), "toolchains", directory);
}
async function readReviewContext(rootInput, idInput, reusableSnapshot, projectInputs = /* @__PURE__ */ new Map(), validated = false, sourceInputs) {
  const root = validated ? rootInput : await validateReviewWorkspace(rootInput);
  const id = formalReviewId(idInput);
  const snapshot = reusableSnapshot || await loadWorkspaceSnapshot(root);
  const labels = snapshot.state.labels || {};
  const label = labels[id];
  if (!label) throw new LeanReviewError(404, "Formal object not found in the prepared project.");
  await reviewSafePath(root, label.filePath);
  const lines = snapshot.documents.get(label.filePath)?.split(/\r?\n/) || [];
  const statement = snippet(label.filePath, lines, (label.startLine || 0) + 1, (label.endLine ?? label.startLine ?? 0) + 1, "statement");
  const proofs = [];
  const localProof = matchingSnippet(snapshot, label, label.proofContent || "", "proof");
  if (localProof) proofs.push(localProof);
  for (const range of label.supportRanges || []) proofs.push(snippet(label.filePath, lines, range.startLine + 1, range.endLine + 1, "support"));
  for (const solution of label.solutions || []) {
    const linked = labels[solution];
    if (!linked) continue;
    await reviewSafePath(root, linked.filePath);
    const proof = matchingSnippet(snapshot, linked, linked.proofContent || linked.content || "", "proof");
    if (proof) proofs.push(proof);
  }
  if (label.solutionOf && labels[label.solutionOf]) {
    const question = labels[label.solutionOf];
    await reviewSafePath(root, question.filePath);
    const questionLines = snapshot.documents.get(question.filePath)?.split(/\r?\n/) || [];
    proofs.push(snippet(question.filePath, questionLines, (question.startLine || 0) + 1, (question.endLine ?? question.startLine ?? 0) + 1, "question"));
  }
  const contexts = [];
  const start = label.startLine || 0;
  let heading2 = start - 1;
  while (heading2 >= 0 && !/^\s{0,3}#{1,6}\s/.test(lines[heading2])) heading2--;
  if (start > 0) contexts.push(snippet(label.filePath, lines, Math.max(heading2 + 1, start - 80, 1), start, "context"));
  const visitedReferences = /* @__PURE__ */ new Set([id]);
  const referenceQueue = [statement.content, ...proofs.map((item) => item.content), ...contexts.map((item) => item.content)];
  let contextOverflow = [statement, ...proofs, ...contexts].some((item) => item.truncated);
  while (referenceQueue.length) {
    const text2 = referenceQueue.shift();
    for (const reference2 of text2.match(/@h-[0-9a-f]{16,32}\b/gi) || []) {
      const targetId = reference2.slice(1).toLowerCase();
      if (visitedReferences.has(targetId)) continue;
      visitedReferences.add(targetId);
      if (visitedReferences.size > 25) {
        contextOverflow = true;
        continue;
      }
      const target = labels[targetId];
      if (!target) {
        contextOverflow = true;
        continue;
      }
      await reviewSafePath(root, target.filePath);
      const targetLines = snapshot.documents.get(target.filePath)?.split(/\r?\n/) || [];
      const targetStart = target.startLine || 0;
      let targetEnd = target.endLine ?? targetStart;
      if (/^\s{0,3}#{1,6}\s/.test(targetLines[targetStart] || "")) {
        const depth = targetLines[targetStart].match(/^\s{0,3}(#{1,6})\s/)[1].length;
        targetEnd = targetLines.length - 1;
        for (let lineIndex = targetStart + 1; lineIndex < targetLines.length; lineIndex++) {
          const boundary = targetLines[lineIndex].match(/^\s{0,3}(#{1,6})\s/);
          if (boundary && boundary[1].length <= depth) {
            targetEnd = lineIndex - 1;
            break;
          }
        }
      }
      const source = snippet(target.filePath, targetLines, targetStart + 1, targetEnd + 1, "context");
      contexts.push(source);
      referenceQueue.push(source.content);
      if (source.truncated) contextOverflow = true;
    }
  }
  const anchors = snapshot.state.leanIndex?.anchors?.[id]?.declarations || [];
  const declarations = [];
  for (const anchor of anchors) declarations.push({
    key: declarationReviewKey(anchor.projectKey, anchor.qualifiedName || anchor.name),
    projectKey: anchor.projectKey,
    name: anchor.name,
    qualifiedName: anchor.qualifiedName || anchor.name,
    kind: anchor.kind,
    source: await declarationSource(root, anchor, sourceInputs),
    typeDependencies: [],
    proofDependencies: [],
    axioms: [],
    evidenceState: "unavailable",
    diagnostic: "Elaborated evidence has not been refreshed for this declaration."
  });
  const keys = new Set(anchors.map((anchor) => anchor.projectKey));
  const projectConfigs = leanProjects(snapshot.state.config).filter((project) => keys.has(project.key));
  const projects = [];
  for (const project of projectConfigs) {
    if (!projectInputs.has(project.key)) projectInputs.set(project.key, inputFingerprint(root, project));
    const input = await projectInputs.get(project.key);
    projects.push({
      projectKey: project.key,
      inputFingerprint: input.fingerprint,
      toolchain: input.toolchain,
      target: project.target,
      module: project.module,
      diagnostic: input.diagnostic,
      freshnessPolicy: "project-inputs",
      build: { state: "unverified" }
    });
  }
  const displayNumber2 = formatDisplayNumber(label);
  const evidence = {
    fingerprint: "",
    statement,
    proofs: [...new Map(proofs.map((proof) => [`${proof.filePath}:${proof.startLine}:${proof.endLine}`, proof])).values()],
    contexts,
    contextPolicy: contextOverflow ? "workspace-markdown" : "explicit-references",
    ...contextOverflow ? { contextInputFingerprint: reviewHash(JSON.stringify([...snapshot.documents.entries()].map(([file, content]) => [file, reviewHash(content)]))) } : {},
    declarations,
    definitions: [],
    projects,
    state: "unavailable",
    diagnostics: contextOverflow ? ["Explicit reference context exceeds the bounded snapshot; review freshness conservatively tracks all workspace Markdown inputs."] : []
  };
  evidence.fingerprint = evidenceFingerprint(evidence);
  const displayName = typeName(snapshot.state.config, label.type);
  return { root, id, snapshot, projectConfigs, formal: {
    id,
    type: label.type,
    title: label.title,
    display: displayNumber2 ? `${displayName} ${displayNumber2}` : displayName,
    filePath: label.filePath,
    line: statement.startLine
  }, evidence };
}
function evidenceFingerprint(evidence) {
  const snippets = (items) => items.map((item) => [item.filePath, item.startLine, item.endLine, item.fingerprint]);
  const declarations = (items) => items.map((item) => ({
    key: item.key,
    source: item.source?.fingerprint,
    type: item.elaboratedType,
    value: item.value,
    axioms: item.axioms,
    typeDependencies: item.typeDependencies,
    proofDependencies: item.proofDependencies,
    compiledSource: item.compiledSource,
    state: item.evidenceState,
    truncated: item.truncated
  }));
  return reviewHash(JSON.stringify({
    statement: snippets([evidence.statement]),
    proofs: snippets(evidence.proofs),
    contexts: snippets(evidence.contexts),
    contextInputFingerprint: evidence.contextInputFingerprint,
    contextPolicy: evidence.contextPolicy,
    declarations: declarations(evidence.declarations),
    definitions: declarations(evidence.definitions),
    projects: evidence.projects.map((item) => [item.projectKey, item.inputFingerprint, item.build.state, item.build.inputFingerprint]),
    state: evidence.state
  }));
}
async function trackBuiltEnvironment(root, cwd, lake, control, inputs) {
  const result = await runBounded(lake, ["env", process.execPath, "-e", 'console.log(JSON.stringify(process.env.LEAN_PATH || ""))'], cwd, control);
  let paths;
  try {
    paths = JSON.parse(result.output.trim().split(/\r?\n/).at(-1) || "").split(require("node:path").delimiter).filter(Boolean).map((file) => path__namespace.resolve(cwd, file));
  } catch {
    inputs.disable();
    return;
  }
  if (result.exitCode !== 0 || !paths.length) {
    inputs.disable();
    return;
  }
  await trackLeanBuildOutputs(root, paths, inputs, path__namespace.dirname(path__namespace.dirname(lake)));
}
async function trackLeanBuildOutputs(root, paths, inputs, toolchainRoot) {
  const visited = /* @__PURE__ */ new Set();
  const visit = async (directory) => {
    if (visited.has(directory)) return;
    visited.add(directory);
    if (!reviewPathInside(root, directory) && !(toolchainRoot && reviewPathInside(toolchainRoot, directory))) {
      inputs.disable();
      return;
    }
    await inputs.track(directory);
    let entries;
    try {
      entries = await fs__namespace.readdir(directory, { withFileTypes: true });
    } catch (error2) {
      if (error2.code !== "ENOENT" && error2.code !== "ENOTDIR") inputs.disable();
      return;
    }
    for (const entry of entries) {
      const file = path__namespace.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        await inputs.track(file);
        continue;
      }
      if (entry.isDirectory()) await visit(file);
      else if (/\.(?:olean(?:\.[\w]+)?|ir|so|dylib|dll)$/.test(entry.name)) await inputs.track(file);
    }
  };
  for (const directory of paths) {
    await visit(directory);
    if (path__namespace.basename(directory) === "lean" && reviewPathInside(root, directory)) await visit(path__namespace.dirname(directory));
  }
}
async function runBounded(command, args, cwd, control) {
  if (control.cancelled()) throw new Error("Review evidence refresh cancelled.");
  return new Promise((resolve, reject) => {
    const toolchainRoot = ["lake", "lean"].includes(path__namespace.basename(command)) ? path__namespace.dirname(path__namespace.dirname(command)) : void 0;
    const child = spawn(command, args, { cwd, env: {
      ...process.env,
      ELAN_TOOLCHAIN: void 0,
      LEAN: toolchainRoot ? path__namespace.join(toolchainRoot, "bin", "lean") : void 0,
      LAKE: toolchainRoot ? path__namespace.join(toolchainRoot, "bin", "lake") : void 0,
      PATH: toolchainRoot ? `${path__namespace.join(toolchainRoot, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}` : process.env.PATH,
      LAKE_HOME: void 0,
      LEAN_PATH: void 0,
      LEAN_SRC_PATH: void 0,
      LEAN_SYSROOT: toolchainRoot,
      LEAN_GITHASH: void 0,
      LAKE_NO_CACHE: "true",
      LAKE_ARTIFACT_CACHE: "false",
      LAKE_RESTORE_ARTIFACTS: "false"
    }, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    control.onProcess(child);
    let output = "";
    let bytes = 0;
    let failure = "";
    const kill = () => {
      try {
        if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch (_error) {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      failure = "Lean evidence command exceeded its 120-second limit.";
      kill();
    }, 12e4);
    const receive = (chunk) => {
      const text2 = String(chunk);
      bytes += Buffer.byteLength(text2);
      if (bytes > 8 * 1024 * 1024) {
        failure = "Lean evidence command output exceeded 8 MiB.";
        kill();
        return;
      }
      output += text2;
    };
    child.stdout.on("data", receive);
    child.stderr.on("data", receive);
    child.once("error", (error2) => {
      clearTimeout(timer);
      control.onProcess(void 0);
      reject(error2);
    });
    child.once("close", (exitCode) => {
      clearTimeout(timer);
      control.onProcess(void 0);
      if (failure) reject(new Error(failure));
      else if (control.cancelled()) reject(new Error("Review evidence refresh cancelled."));
      else resolve({ exitCode, output });
    });
  });
}
function generatedReviewProbe(module2, names) {
  const modules = Array.isArray(module2) ? [...new Set(module2)] : [module2];
  if (!modules.length || modules.some((item) => !LEAN_NAME.test(item)) || names.some((name) => !LEAN_NAME.test(name))) throw new LeanReviewError(400, "Unsupported Lean module or declaration identifier.");
  return `import Lean
${modules.map((item) => `import ${item}`).join("\n")}

open Lean Elab Command Meta
set_option pp.explicit true
set_option pp.universes true
set_option pp.fullNames true
set_option format.width 120

def mw_review_names : Array Name := (${JSON.stringify(names.join("\n"))}).splitOn "\\n" |>.toArray.map String.toName
def mw_review_strings (names : Array Name) : Json := toJson (names.toList.map Name.toString)

elab "mw_review_emit" : command => do
  let env ← getEnv
  let mut requested := mw_review_names
  for name in mw_review_names do
    if let some info := env.find? name then
      for dependency in info.type.getUsedConstants do
        if !requested.contains dependency && requested.size < 80 then
          requested := requested.push dependency
  for name in requested do
    match env.find? name with
    | none => logWarning m!"Unresolved review declaration: {name}"
    | some info =>
      let typeText ← liftTermElabM do return (← ppExpr info.type).pretty
      let valueText ← liftTermElabM do
        match info with
        | .defnInfo _ | .opaqueInfo _ =>
          match info.value? true with
          | some value => return (← ppExpr value).pretty
          | none => return ""
        | _ => return ""
      let typeDeps := info.type.getUsedConstants
      let proofDeps := match info.value? true with
        | some value => value.getUsedConstants
        | none => #[]
      let axioms ← collectAxioms name
      let moduleName ← findModuleOf? name
      let sourcePath ← liftIO do
        match moduleName with
        | none => pure ""
        | some mod =>
          try pure (← findLean (← getSrcSearchPath) mod).toString
          catch _ => pure ""
      let oleanPath ← liftIO do
        match moduleName with
        | none => pure ""
        | some mod =>
          try pure (← findOLean mod).toString
          catch _ => pure ""
      let ranges ← findDeclarationRanges? name
      let startLine := ranges.map (·.range.pos.line) |>.getD 0
      let endLine := ranges.map (·.range.endPos.line) |>.getD 0
      let kind := match info with
        | .axiomInfo _ => "axiom"
        | .thmInfo _ => "theorem"
        | .defnInfo _ => "def"
        | .opaqueInfo _ => "opaque"
        | .inductInfo _ => "inductive"
        | .ctorInfo _ => "constructor"
        | .recInfo _ => "recursor"
        | .quotInfo _ => "quotient"
      let result := Json.mkObj [
        ("name", toJson name.toString), ("type", toJson typeText), ("value", toJson valueText),
        ("kind", toJson kind), ("module", toJson (moduleName.map Name.toString |>.getD "")),
        ("sourcePath", toJson sourcePath), ("oleanPath", toJson oleanPath),
        ("startLine", toJson startLine), ("endLine", toJson endLine),
        ("typeDependencies", mw_review_strings typeDeps), ("proofDependencies", mw_review_strings proofDeps),
        ("axioms", mw_review_strings axioms)]
      logInfo m!"${RECORD_PREFIX}{result.compress}"

mw_review_emit
`;
}
async function refreshReviewEvidence(context, control, expansion) {
  const evidence = JSON.parse(JSON.stringify(context.evidence));
  evidence.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const compiledFingerprints = /* @__PURE__ */ new Map();
  for (const project of context.projectConfigs) {
    if (expansion && expansion.projectKey !== project.key) continue;
    const current = evidence.projects.find((item) => item.projectKey === project.key);
    const module2 = project.module || project.target || "";
    if (!LEAN_NAME.test(module2)) {
      current.diagnostic = "A valid configured Lean module or target is required to inspect the environment.";
      continue;
    }
    const toolchainRoot = installedToolchainRoot(current.toolchain);
    const lake = toolchainRoot && path__namespace.join(toolchainRoot, "bin", "lake");
    const lean = toolchainRoot && path__namespace.join(toolchainRoot, "bin", "lean");
    try {
      if (!lake || !lean) throw new Error("The configured Lean toolchain is unavailable. Install it deliberately outside the Reader.");
      await fs__namespace.access(lake);
      await fs__namespace.access(lean);
      const cwd = await reviewSafePath(context.root, project.root);
      if (current.diagnostic) throw new Error(current.diagnostic);
      const manifest = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, path__namespace.join(cwd, "lake-manifest.json"))), true);
      if (!manifest) throw new Error("Lake manifest is missing. Initialize dependencies deliberately outside the Reader before refreshing evidence.");
      const dependencies = await manifestDependencies(context.root, cwd);
      for (const dependency of dependencies) if (dependency.gitRevision) {
        const revision = await runBounded("git", ["-C", dependency.directory, "rev-parse", "HEAD"], cwd, control);
        if (revision.exitCode !== 0 || revision.output.trim() !== dependency.gitRevision) {
          throw new Error("A local Lake dependency is not at its locked Git revision. Resolve it deliberately outside the Reader; no fetch or checkout was attempted.");
        }
      }
      const args = ["--offline", "--no-cache", "--rehash", "build", ...project.target ? [project.target] : [module2]];
      if (project.target?.startsWith("-")) throw new Error("A Lean build target cannot be an option.");
      const perform = async (inputs) => {
        control.phase(`Building ${project.key} with installed toolchain (offline)`);
        const startedAt = (/* @__PURE__ */ new Date()).toISOString(), result = await runBounded(lake, args, cwd, control);
        const receipt = {
          state: result.exitCode === 0 ? "passed" : "failed",
          command: [lake, ...args],
          startedAt,
          finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
          exitCode: result.exitCode,
          output: result.output.slice(-12e3),
          inputFingerprint: current.inputFingerprint
        };
        if (inputs && receipt.state === "passed") {
          if ((await inputFingerprint(context.root, project)).fingerprint !== current.inputFingerprint) throw new Error("Lean inputs changed during build.");
          await trackBuiltEnvironment(context.root, cwd, lake, control, inputs);
        }
        return receipt;
      };
      current.build = control.build ? await control.build(JSON.stringify([context.root, project, current.inputFingerprint]), perform) : await perform();
      if (current.build.state !== "passed") throw new Error(`Local Lean build failed. ${current.build.output?.trim().slice(-2e3)}`);
      if (current.build.reused) control.phase(`Reusing verified ${project.key} build; reading Lean evidence`);
      control.phase(`Reading elaborated types and recursive axioms for ${project.key}`);
      const names = evidence.declarations.filter((item) => item.projectKey === project.key).map((item) => item.qualifiedName);
      if (expansion) names.push(expansion.name);
      const probePath = path__namespace.join(context.root, ".math-workspace", `lean-review-probe-${crypto__namespace.randomBytes(8).toString("hex")}.lean`);
      try {
        await fs__namespace.writeFile(probePath, generatedReviewProbe(control.imports?.[project.key] || module2, [...new Set(names)]), "utf8");
        const probe = await runBounded(lake, ["--offline", "--no-cache", "env", lean, probePath], cwd, control);
        if (probe.exitCode !== 0) throw new Error(`Lean evidence probe failed. ${probe.output.trim().slice(-3e3)}`);
        const seen = /* @__PURE__ */ new Set();
        for (const line of probe.output.split(/\r?\n/)) {
          const index = line.indexOf(RECORD_PREFIX);
          if (index < 0) continue;
          const row = JSON.parse(line.slice(index + RECORD_PREFIX.length));
          if (!LEAN_NAME.test(row.name) || typeof row.type !== "string" || !Array.isArray(row.axioms)) continue;
          const key = declarationReviewKey(project.key, row.name);
          if (seen.has(key)) continue;
          seen.add(key);
          const anchor = evidence.declarations.find((item) => item.key === key);
          let source = anchor?.source;
          let actualFile;
          if (typeof row.sourcePath === "string" && row.sourcePath) {
            const candidate = path__namespace.resolve(cwd, row.sourcePath);
            const tracked = [cwd, ...dependencies.map((item) => item.directory)].some((directory) => reviewPathInside(directory, candidate));
            if (tracked && reviewPathInside(context.root, candidate)) {
              const sourceFile = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, candidate)), true);
              if (sourceFile) {
                actualFile = toPosix(path__namespace.relative(context.root, sourceFile));
                if (row.startLine > 0 && row.endLine >= row.startLine) {
                  source = snippet(actualFile, (await fs__namespace.readFile(sourceFile, "utf8")).split(/\r?\n/), row.startLine, row.endLine, "declaration");
                }
              }
            }
          }
          if (anchor && (!actualFile || actualFile !== anchor.source?.filePath)) {
            anchor.diagnostic = `The environment defines ${row.name} in ${row.module || "an unknown module"}, which cannot be verified as the anchored source ${anchor.source?.filePath || ""}.`;
            continue;
          }
          const definition = {
            key,
            projectKey: project.key,
            name: row.name.split(".").pop(),
            qualifiedName: row.name,
            kind: row.kind,
            source,
            module: row.module,
            elaboratedType: bounded(row.type).content,
            ...row.value ? { value: bounded(row.value).content } : {},
            typeDependencies: row.typeDependencies || [],
            proofDependencies: row.proofDependencies || [],
            axioms: row.axioms,
            evidenceState: "available",
            ...row.type.length > MAX_TEXT || row.value?.length > MAX_TEXT ? { truncated: true } : {}
          };
          if (!source) definition.diagnostic = "The elaborated type is available; definition source/fields could not be read inside the tracked project boundary.";
          if (typeof row.oleanPath === "string" && row.oleanPath) {
            const compiled = path__namespace.resolve(cwd, row.oleanPath);
            if (reviewPathInside(context.root, compiled)) {
              const compiledFile = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, compiled)), true);
              if (compiledFile) {
                if (!compiledFingerprints.has(compiledFile)) compiledFingerprints.set(compiledFile, fs__namespace.readFile(compiledFile).then(reviewHash));
                definition.compiledSource = {
                  filePath: toPosix(path__namespace.relative(context.root, compiledFile)),
                  fingerprint: await compiledFingerprints.get(compiledFile)
                };
              }
            }
          }
          if (anchor) Object.assign(anchor, definition, { diagnostic: void 0 });
          else evidence.definitions.push(definition);
        }
        const missing = names.filter((name) => !seen.has(declarationReviewKey(project.key, name)));
        if (missing.length) throw new Error(`Lean did not return evidence for ${missing.join(", ")}.`);
      } finally {
        await fs__namespace.rm(probePath, { force: true });
      }
      const after = await inputFingerprint(context.root, project);
      if (after.fingerprint !== current.inputFingerprint) throw new Error("Lean inputs changed during refresh; refresh again before relying on this evidence.");
    } catch (error2) {
      if (control.cancelled()) throw error2;
      current.diagnostic = error2.message || String(error2);
      evidence.diagnostics.push(`${project.key}: ${current.diagnostic}`);
      for (const declaration2 of evidence.declarations.filter((item) => item.projectKey === project.key)) {
        declaration2.evidenceState = "unavailable";
        declaration2.diagnostic = current.diagnostic;
      }
    }
  }
  const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
  evidence.state = available === evidence.declarations.length && available > 0 ? "current" : available > 0 ? "partial" : "unavailable";
  if (!evidence.declarations.length) evidence.diagnostics.push("This formal object has no anchored Lean declarations.");
  evidence.fingerprint = evidenceFingerprint(evidence);
  return evidence;
}
const leanEvidence = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  LeanReviewError,
  declarationReviewKey,
  evidenceFingerprint,
  formalReviewId,
  generatedReviewProbe,
  inputFingerprint,
  installedToolchainRoot,
  manifestDependencies,
  readReviewContext,
  readReviewSourceLines,
  refreshReviewEvidence,
  reviewHash,
  reviewPathInside,
  reviewSafePath,
  trackLeanBuildOutputs,
  validateReviewWorkspace
}, Symbol.toStringTag, { value: "Module" }));
const fileSystem$1 = require("node:fs/promises");
const VERDICTS = ["aligned", "partial", "difference", "undecided"];
const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
async function metadataDirectory(root, name, create = false) {
  const parent = await reviewSafePath(root, ".math-workspace");
  const directory = path__namespace.join(parent, name);
  if (create) await fs__namespace.mkdir(directory, { recursive: true });
  const resolved = await reviewSafePath(root, path__namespace.relative(root, directory), true);
  if (resolved && !reviewPathInside(parent, resolved)) throw new LeanReviewError(400, "Lean review metadata cannot escape .math-workspace.");
  return resolved;
}
async function readJson(root, directoryName, id) {
  const directory = await metadataDirectory(root, directoryName);
  if (!directory) return void 0;
  const file = await reviewSafePath(root, path__namespace.relative(root, path__namespace.join(directory, `${formalReviewId(id)}.json`)), true);
  if (!file) return void 0;
  const stat = await fs__namespace.stat(file);
  if (stat.size > MAX_SNAPSHOT_BYTES) throw new LeanReviewError(413, "Lean review metadata exceeds its bounded size.");
  try {
    return JSON.parse(await fs__namespace.readFile(file, "utf8"));
  } catch (_error) {
    throw new LeanReviewError(409, "Lean review metadata is unreadable; preserve it and repair it before saving.");
  }
}
async function atomicJson(directory, id, value) {
  const content = JSON.stringify(value, null, 2) + "\n";
  if (Buffer.byteLength(content) > MAX_SNAPSHOT_BYTES) throw new LeanReviewError(413, "This review snapshot exceeds 4 MiB.");
  const temporary2 = path__namespace.join(directory, `.${id}-${crypto__namespace.randomBytes(8).toString("hex")}.tmp`);
  try {
    const file = await fileSystem$1.open(temporary2, "wx", 384);
    try {
      await file.writeFile(content, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    await fileSystem$1.rename(temporary2, path__namespace.join(directory, `${id}.json`));
  } finally {
    await fs__namespace.rm(temporary2, { force: true });
  }
}
async function readReviewRecord(root, id) {
  const value = await readJson(root, "lean-reviews", id);
  if (value === void 0) return void 0;
  if (value.schemaVersion !== 1 || value.formalId !== formalReviewId(id) || !Number.isInteger(value.revision) || value.revision < 1 || !reviewEvidenceShape(value.snapshot) || !decisionShape(value) || value.evidenceFingerprint !== value.snapshot.fingerprint || value.history !== void 0 && (!Array.isArray(value.history) || value.history.length > 50 || value.history.length === 0 || value.history.some((item, index) => !decisionShape(item) || item.revision > value.revision || index > 0 && item.revision <= value.history[index - 1].revision) || JSON.stringify(decision(value.history[value.history.length - 1])) !== JSON.stringify(decision(value))) || value.historyDropped !== void 0 && (!Number.isSafeInteger(value.historyDropped) || value.historyDropped < 0)) {
    throw new LeanReviewError(409, "Lean review record has an unsupported format; it was preserved.");
  }
  return value;
}
function decisionShape(value) {
  const claims = value?.subclaims;
  return !!value && Number.isSafeInteger(value.revision) && value.revision > 0 && VERDICTS.includes(value.verdict) && typeof value.scope === "string" && !!value.scope.trim() && value.scope.length <= 8e3 && typeof value.note === "string" && value.note.length <= 16e3 && typeof value.reviewer === "string" && value.reviewer.length <= 300 && typeof value.reviewedAt === "string" && Number.isFinite(Date.parse(value.reviewedAt)) && /^[0-9a-f]{64}$/.test(value.evidenceFingerprint) && Array.isArray(claims) && claims.length <= 80 && new Set(claims.map((claim) => claim?.id)).size === claims.length && claims.every((claim) => !!claim && typeof claim.id === "string" && !!claim.id.trim() && claim.id.length <= 100 && typeof claim.text === "string" && !!claim.text.trim() && claim.text.length <= 8e3 && typeof claim.note === "string" && claim.note.length <= 8e3 && VERDICTS.includes(claim.verdict) && Array.isArray(claim.declarationKeys) && claim.declarationKeys.length <= 100 && claim.declarationKeys.every((key) => typeof key === "string" && key.length <= 500));
}
function decision(record) {
  return {
    revision: record.revision,
    verdict: record.verdict,
    scope: record.scope,
    note: record.note,
    reviewer: record.reviewer,
    reviewedAt: record.reviewedAt,
    subclaims: record.subclaims,
    evidenceFingerprint: record.evidenceFingerprint
  };
}
function appendDecision(record, previous) {
  const history = [...previous?.history || (previous ? [decision(previous)] : []), decision(record)];
  let dropped = previous?.historyDropped || 0;
  while (history.length > 1 && (history.length > 50 || Buffer.byteLength(JSON.stringify(history)) > 1572864)) {
    history.shift();
    dropped++;
  }
  record.history = history;
  record.historyDropped = dropped;
}
function reviewEvidenceShape(value) {
  return !!value && typeof value.fingerprint === "string" && !!value.statement && typeof value.statement.content === "string" && Array.isArray(value.proofs) && Array.isArray(value.contexts) && Array.isArray(value.projects) && Array.isArray(value.declarations) && Array.isArray(value.definitions) && Array.isArray(value.diagnostics);
}
async function readReviewEvidenceCache(root, id) {
  const value = await readJson(root, "lean-review-evidence", id);
  if (value === void 0) return void 0;
  if (value.schemaVersion !== 1 || value.formalId !== formalReviewId(id) || !reviewEvidenceShape(value.evidence)) {
    throw new LeanReviewError(409, "Lean evidence cache has an unsupported format; refresh it deliberately.");
  }
  return value.evidence;
}
async function writeReviewEvidenceCache(root, id, evidence) {
  const directory = await metadataDirectory(root, "lean-review-evidence", true);
  await atomicJson(directory, formalReviewId(id), { schemaVersion: 1, formalId: formalReviewId(id), evidence });
}
function text(value, label, maximum, required = false) {
  if (typeof value !== "string" || value.length > maximum || required && !value.trim()) {
    throw new LeanReviewError(400, `${label} must be ${required ? "non-empty " : ""}text of at most ${maximum} characters.`);
  }
  return value;
}
function reviewSaveInput(value) {
  const id = formalReviewId(value?.id);
  if (!Number.isInteger(value?.expectedRevision) || value.expectedRevision < 0) throw new LeanReviewError(400, "An expected review revision is required.");
  if (typeof value?.evidenceFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.evidenceFingerprint)) throw new LeanReviewError(400, "The displayed evidence fingerprint is required.");
  if (!VERDICTS.includes(value?.verdict)) throw new LeanReviewError(400, "Choose a valid human verdict.");
  if (!Array.isArray(value?.subclaims) || value.subclaims.length > 80) throw new LeanReviewError(400, "Provide at most 80 human-defined subclaims.");
  const ids = /* @__PURE__ */ new Set();
  const subclaims = value.subclaims.map((claim) => {
    const claimId = text(claim?.id, "Subclaim ID", 100, true);
    if (ids.has(claimId)) throw new LeanReviewError(400, "Subclaim IDs must be unique within an object.");
    ids.add(claimId);
    if (!VERDICTS.includes(claim?.verdict) || !Array.isArray(claim?.declarationKeys) || claim.declarationKeys.length > 100 || claim.declarationKeys.some((key) => typeof key !== "string" || key.length > 500)) throw new LeanReviewError(400, "A subclaim needs a verdict and bounded declaration mappings.");
    return {
      id: claimId,
      text: text(claim.text, "Subclaim text", 8e3, true),
      declarationKeys: [...new Set(claim.declarationKeys)],
      verdict: claim.verdict,
      note: text(claim.note ?? "", "Subclaim note", 8e3)
    };
  });
  return {
    id,
    expectedRevision: value.expectedRevision,
    evidenceFingerprint: value.evidenceFingerprint,
    verdict: value.verdict,
    scope: text(value.scope, "Review scope", 8e3, true),
    note: text(value.note ?? "", "Review note", 16e3),
    reviewer: text(value.reviewer ?? "", "Reviewer", 300),
    subclaims
  };
}
async function saveReviewRecord(root, input, freshEvidence) {
  const directory = await metadataDirectory(root, "lean-reviews", true);
  const lockPath = path__namespace.join(directory, `${input.id}.lock`);
  let lock;
  try {
    lock = await fileSystem$1.open(lockPath, "wx", 384);
  } catch (error2) {
    if (error2?.code === "EEXIST") throw new LeanReviewError(409, "Another save owns this object. Reload before retrying; a crashed save may leave a local .lock file.");
    throw error2;
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: (/* @__PURE__ */ new Date()).toISOString() }));
    const previous = await readReviewRecord(root, input.id);
    if ((previous?.revision || 0) !== input.expectedRevision) throw new LeanReviewError(409, "The review changed in another window. Reload it before saving.");
    const evidence = await freshEvidence();
    if (evidence.fingerprint !== input.evidenceFingerprint) throw new LeanReviewError(409, "The displayed evidence changed. Reload and review the current source before saving.");
    const declarations = new Set(evidence.declarations.map((declaration2) => declaration2.key));
    for (const claim of input.subclaims) for (const key of claim.declarationKeys) {
      if (!declarations.has(key)) throw new LeanReviewError(400, "Subclaim mapping references a declaration outside this formal object.");
    }
    const record = {
      schemaVersion: 1,
      formalId: input.id,
      revision: (previous?.revision || 0) + 1,
      verdict: input.verdict,
      scope: input.scope,
      note: input.note,
      reviewer: input.reviewer,
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      subclaims: input.subclaims,
      evidenceFingerprint: evidence.fingerprint,
      snapshot: evidence
    };
    appendDecision(record, previous);
    await atomicJson(directory, input.id, record);
    return record;
  } finally {
    await lock.close();
    await fs__namespace.rm(lockPath, { force: true });
  }
}
const fileSystem = require("node:fs/promises");
function projectCurrent(context, cached, projectKey) {
  const current = context.evidence.projects.find((item) => item.projectKey === projectKey);
  const previous = cached.projects.find((item) => item.projectKey === projectKey);
  return !!current && !!previous && current.inputFingerprint === previous.inputFingerprint;
}
function projectReviewEvidence(context, cached) {
  if (!cached) return context.evidence;
  const evidence = {
    ...context.evidence,
    generatedAt: cached.generatedAt,
    diagnostics: [.../* @__PURE__ */ new Set([...context.evidence.diagnostics, ...cached.diagnostics])],
    definitions: cached.definitions.map((item) => ({
      ...item,
      evidenceState: projectCurrent(context, cached, item.projectKey) ? item.evidenceState : "stale"
    }))
  };
  evidence.projects = context.evidence.projects.map((current) => {
    const previous = cached.projects.find((item) => item.projectKey === current.projectKey);
    if (!previous) return current;
    const fresh = projectCurrent(context, cached, current.projectKey);
    return { ...current, diagnostic: current.diagnostic || previous.diagnostic, build: {
      ...previous.build,
      state: fresh ? previous.build.state : "stale"
    } };
  });
  evidence.declarations = context.evidence.declarations.map((current) => {
    const previous = cached.declarations.find((item) => item.key === current.key);
    if (!previous) return current;
    const fresh = projectCurrent(context, cached, current.projectKey);
    return {
      ...previous,
      source: fresh && previous.source?.filePath === current.source?.filePath ? previous.source : current.source,
      evidenceState: fresh ? previous.evidenceState : "stale",
      diagnostic: fresh ? previous.diagnostic : "Project Lean or build-environment inputs changed since this evidence was collected."
    };
  });
  const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
  const stale = evidence.declarations.some((item) => item.evidenceState === "stale");
  evidence.state = stale ? "stale" : available === evidence.declarations.length && available > 0 ? "current" : available > 0 ? "partial" : "unavailable";
  evidence.fingerprint = evidenceFingerprint(evidence);
  return evidence;
}
function change(kind, key, label, previous, current) {
  const maximum = 24e3;
  return {
    kind,
    key,
    label,
    previous: previous?.slice(0, maximum),
    current: current?.slice(0, maximum),
    ...(previous?.length || 0) > maximum || (current?.length || 0) > maximum ? { truncated: true } : {}
  };
}
function reviewChanges(previous, current) {
  const changes = [];
  const snippets = (kind, before, after) => {
    if (JSON.stringify(before.map((item) => [item.filePath, item.fingerprint])) !== JSON.stringify(after.map((item) => [item.filePath, item.fingerprint]))) {
      changes.push(change(
        kind,
        kind,
        `${kind} source`,
        before.map((item) => `${item.filePath}:${item.startLine}
${item.content}`).join("\n\n"),
        after.map((item) => `${item.filePath}:${item.startLine}
${item.content}`).join("\n\n")
      ));
    }
  };
  snippets("statement", [previous.statement], [current.statement]);
  snippets("proof", previous.proofs, current.proofs);
  snippets("context", previous.contexts || [], current.contexts || []);
  if (previous.contextInputFingerprint !== current.contextInputFingerprint) changes.push(change(
    "context",
    "markdown-context",
    "Conservative workspace Markdown context",
    previous.contextInputFingerprint,
    current.contextInputFingerprint
  ));
  const declarations = (kind, before, after) => {
    const keys = /* @__PURE__ */ new Set([...before.map((item) => item.key), ...after.map((item) => item.key)]);
    for (const key of keys) {
      const a = before.find((item) => item.key === key);
      const b = after.find((item) => item.key === key);
      if (!a || !b || a.source?.fingerprint !== b.source?.fingerprint) changes.push(change(kind, key, key, a?.source?.content, b?.source?.content));
      if (a?.elaboratedType !== b?.elaboratedType) changes.push(change(kind === "definition" ? "definition" : "type", `${key}:type`, `${key} elaborated type`, a?.elaboratedType, b?.elaboratedType));
      if (a?.value !== b?.value) changes.push(change(kind, `${key}:value`, `${key} elaborated value`, a?.value, b?.value));
      if (JSON.stringify(a?.compiledSource) !== JSON.stringify(b?.compiledSource)) changes.push(change(
        "environment",
        `${key}:compiled`,
        `${key} compiled module`,
        a?.compiledSource?.currentFingerprint || a?.compiledSource?.fingerprint,
        b?.compiledSource?.currentFingerprint || b?.compiledSource?.fingerprint
      ));
    }
  };
  declarations("declaration", previous.declarations, current.declarations);
  declarations("definition", previous.definitions || [], current.definitions || []);
  for (const project of current.projects) {
    const before = previous.projects.find((item) => item.projectKey === project.projectKey);
    if (before?.inputFingerprint !== project.inputFingerprint) changes.push(change(
      "environment",
      project.projectKey,
      `${project.projectKey}: conservative project input invalidation`,
      before?.inputFingerprint,
      project.inputFingerprint
    ));
  }
  if (!changes.length && previous.fingerprint !== current.fingerprint) changes.push(change("evidence", "evidence", "Evidence collection or freshness changed", previous.fingerprint, current.fingerprint));
  return changes;
}
function reviewProjection(record, evidence) {
  return {
    ...record ? { record } : {},
    freshness: !record ? "unreviewed" : record.evidenceFingerprint === evidence.fingerprint ? "current" : "stale",
    expectedRevision: record?.revision || 0,
    changes: record && record.evidenceFingerprint !== evidence.fingerprint ? reviewChanges(record.snapshot, evidence) : []
  };
}
class LeanReviewService {
  constructor(onChange) {
    this.onChange = onChange;
    this.jobs = /* @__PURE__ */ new Map();
    this.preparingReads = /* @__PURE__ */ new Map();
    this.snapshots = new ValidatedReadCache((value) => Buffer.byteLength(JSON.stringify(value.state)) + [...value.documents.values()].reduce((n, text2) => n + Buffer.byteLength(text2), 0));
    this.inputResults = new ValidatedReadCache();
    this.fileHashes = new FileHashCache();
    this.builds = new ValidatedReadCache(
      (value) => value.state === "passed" ? 2048 : 65 * 1024 * 1024,
      64 * 1024 * 1024,
      2,
      12e4,
      64 * 1024 * 1024
    );
    this.closed = false;
  }
  async readBatch(rootInput) {
    const root = await fs__namespace.realpath(rootInput);
    let pending = this.preparingReads.get(root);
    if (!pending) {
      pending = (async () => {
        await validateReviewWorkspace(root);
        return {
          root,
          snapshot: await this.snapshots.get(root, (inputs) => loadWorkspaceSnapshot(root, 1, { inputs })),
          projectInputs: /* @__PURE__ */ new Map(),
          compiledInputs: /* @__PURE__ */ new Map(),
          sourceInputs: /* @__PURE__ */ new Map(),
          objects: /* @__PURE__ */ new Map()
        };
      })();
      this.preparingReads.set(root, pending);
    }
    try {
      return await pending;
    } finally {
      if (this.preparingReads.get(root) === pending) this.preparingReads.delete(root);
    }
  }
  async readObject(batch, idInput) {
    const id = formalReviewId(idInput);
    if (!batch.objects.has(id)) batch.objects.set(id, (async () => {
      const keys = new Set((batch.snapshot.state.leanIndex?.anchors?.[id]?.declarations || []).map((item) => item.projectKey));
      const projects = (batch.snapshot.state.leanIndex?.projects || []).filter((project) => keys.has(project.key));
      for (const project of projects) if (!batch.projectInputs.has(project.key)) batch.projectInputs.set(
        project.key,
        this.inputResults.get(JSON.stringify([batch.root, project]), (inputs) => inputFingerprint(batch.root, project, inputs, this.fileHashes))
      );
      const context = await readReviewContext(batch.root, id, batch.snapshot, batch.projectInputs, true, batch.sourceInputs);
      return this.response(context, batch.compiledInputs, batch.sourceInputs, this.fileHashes);
    })());
    const pending = batch.objects.get(id);
    try {
      return await pending;
    } finally {
      if (batch.objects.get(id) === pending) batch.objects.delete(id);
    }
  }
  async get(root, id, fresh = false) {
    if (fresh) return this.response(await readReviewContext(root, id));
    return this.readObject(await this.readBatch(root), id);
  }
  async response(context, compiledInputs, sourceInputs, hashes) {
    const [evidence, record] = await Promise.all([this.currentEvidence(context, compiledInputs, sourceInputs, hashes), readReviewRecord(context.root, context.id)]);
    const active = [...this.jobs.values()].reverse().find((item) => item.root === context.root && item.job.formalId === context.id);
    return {
      id: context.id,
      projectToken: reviewHash(context.root),
      formal: context.formal,
      evidence,
      review: reviewProjection(record, evidence),
      ...active ? { job: { ...active.job } } : {}
    };
  }
  async currentEvidence(context, compiledInputs = /* @__PURE__ */ new Map(), sourceInputs, hashes) {
    const evidence = projectReviewEvidence(context, await readReviewEvidenceCache(context.root, context.id));
    for (const declaration2 of [...evidence.declarations, ...evidence.definitions]) {
      if (!declaration2.compiledSource) continue;
      const compiled = declaration2.compiledSource;
      if (!compiledInputs.has(compiled.filePath)) compiledInputs.set(compiled.filePath, (async () => {
        const file = await reviewSafePath(context.root, compiled.filePath, true);
        return file ? hashes ? (await hashes.read(file)).hash : reviewHash(await fs__namespace.readFile(file)) : void 0;
      })());
      const current = await compiledInputs.get(compiled.filePath);
      if (current !== compiled.fingerprint) {
        declaration2.evidenceState = "stale";
        declaration2.diagnostic = "The compiled defining module changed since this evidence was collected.";
        declaration2.compiledSource = { ...compiled, currentFingerprint: current || "missing" };
        const project = evidence.projects.find((item) => item.projectKey === declaration2.projectKey);
        if (project) project.build.state = "stale";
      }
    }
    for (const definition of evidence.definitions) {
      if (!definition.source) continue;
      const sourceFile = await reviewSafePath(context.root, definition.source.filePath, true);
      if (!sourceFile) {
        definition.evidenceState = "stale";
        definition.diagnostic = "The previously located definition source is no longer available.";
        continue;
      }
      const lines = await readReviewSourceLines(context.root, definition.source.filePath, sourceInputs);
      const previous = definition.source;
      const content = lines.slice(previous.startLine - 1, previous.endLine).join("\n");
      const fingerprint2 = reviewHash(content);
      definition.source = {
        ...previous,
        content: content.slice(0, 24e3),
        fingerprint: fingerprint2,
        ...content.length > 24e3 ? { truncated: true } : {},
        ...fingerprint2 !== previous.fingerprint ? { rangeKind: "context" } : {}
      };
    }
    if ([...evidence.declarations, ...evidence.definitions].some((item) => item.evidenceState === "stale")) evidence.state = "stale";
    evidence.fingerprint = evidenceFingerprint(evidence);
    return evidence;
  }
  async queue(rootInput, filePath, wholeProject = false, includeFirstObject = false) {
    const batch = await this.readBatch(rootInput);
    const { root, snapshot } = batch;
    if (!wholeProject && !snapshot.state.pages.some((page2) => page2.filePath === filePath)) throw new LeanReviewError(404, "Review queue requires a current Markdown page.");
    const page = snapshot.state.pages.find((item) => item.filePath === filePath);
    const paths = new Set(snapshot.state.pages.filter((item) => wholeProject || item.filePath === filePath || page.unitKey && item.bookKey === page.bookKey && item.volumeKey === page.volumeKey && item.unitKey === page.unitKey).map((item) => item.filePath));
    const coverageTypes = new Set(snapshot.state.config?.lean?.coverageTypes || DEFAULT_LEAN_COVERAGE_TYPES);
    const ids = Object.entries(snapshot.state.labels || {}).filter(([id, label]) => HASH_ID_RE.test(id) && paths.has(label.filePath) && (coverageTypes.has(label.type) || !!snapshot.state.leanIndex?.anchors?.[id])).sort(([, a], [, b]) => a.filePath.localeCompare(b.filePath) || (a.startLine || 0) - (b.startLine || 0)).map(([id]) => id);
    if (ids.length > (wholeProject ? 3e3 : 1e3)) throw new LeanReviewError(413, wholeProject ? "Project review overview is limited to 3000 objects; no partial completeness is claimed." : "Review queue is limited to 1000 objects in a chapter.");
    const items = [];
    let firstObject;
    for (const id of ids) {
      const object = await this.readObject(batch, id);
      if (includeFirstObject && (!firstObject || firstObject.review.freshness === "current" && object.review.freshness !== "current")) firstObject = object;
      const record = object.review.record;
      items.push({
        ...object.formal,
        anchored: object.evidence.declarations.length > 0,
        declarationCount: object.evidence.declarations.length,
        reviewFreshness: object.review.freshness,
        evidenceFingerprint: object.evidence.fingerprint,
        ...record ? { verdict: record.verdict, reviewer: record.reviewer, reviewedAt: record.reviewedAt } : {}
      });
    }
    const counts = { total: items.length, unreviewed: 0, current: 0, stale: 0, unanchored: 0 };
    for (const item of items) {
      counts[item.reviewFreshness]++;
      if (!item.anchored) counts.unanchored++;
    }
    return { projectToken: reviewHash(root), items, counts, ...firstObject ? { firstObject } : {} };
  }
  async definition(root, id, projectKey, name) {
    const response = await this.get(root, id);
    const key = declarationReviewKey(projectKey, name);
    const definition = [...response.evidence.declarations, ...response.evidence.definitions].find((item) => item.key === key);
    return definition ? { definition, state: definition.evidenceState, diagnostic: definition.diagnostic } : { state: "unavailable", diagnostic: "This definition has no cached elaborated evidence. Expand it explicitly after refreshing the object." };
  }
  async job(rootInput, id) {
    const active = this.jobs.get(id);
    if (!active || await fs__namespace.realpath(rootInput) !== active.root) throw new LeanReviewError(404, "Lean review job not found in this project.");
    return { job: { ...active.job } };
  }
  async action(rootInput, body) {
    const root = await validateReviewWorkspace(rootInput);
    if (body?.action === "save") {
      const input = reviewSaveInput(body);
      const running2 = [...this.jobs.values()].some((item) => item.root === root && item.job.formalId === input.id && ["queued", "running"].includes(item.job.status));
      if (running2) throw new LeanReviewError(409, "Evidence is refreshing. Wait and review the refreshed evidence before saving.");
      await saveReviewRecord(root, input, async () => {
        const context2 = await readReviewContext(root, input.id);
        return this.currentEvidence(context2);
      });
      this.onChange?.(root, input.id);
      return { status: 200, value: await this.get(root, input.id) };
    }
    if (body?.action === "cancel") {
      const active2 = this.jobs.get(body.jobId);
      if (!active2 || active2.root !== root) throw new LeanReviewError(404, "Lean review job not found in this project.");
      if (["queued", "running"].includes(active2.job.status)) {
        active2.cancelled = true;
        this.kill(active2.child);
      }
      return { status: 200, value: { job: { ...active2.job } } };
    }
    if (!["refresh", "expand"].includes(body?.action)) throw new LeanReviewError(400, "Lean review action must be refresh, expand, cancel, or save.");
    if (this.closed) throw new LeanReviewError(409, "The Reader is closing.");
    const context = await readReviewContext(root, body.id);
    let previous;
    try {
      previous = await readReviewEvidenceCache(root, context.id);
    } catch (error2) {
      if (body.action !== "refresh") throw error2;
      const directory = await reviewSafePath(root, ".math-workspace/lean-review-evidence", true);
      const bad = directory && await reviewSafePath(root, path__namespace.relative(root, path__namespace.join(directory, `${context.id}.json`)), true);
      if (bad) await fs__namespace.copyFile(bad, path__namespace.join(directory, `.${context.id}-invalid-${crypto__namespace.randomBytes(8).toString("hex")}.json`));
    }
    let expansion;
    if (body.action === "expand") {
      if (typeof body.projectKey !== "string" || typeof body.name !== "string") throw new LeanReviewError(400, "Definition expansion requires a project key and declaration name.");
      const current = projectReviewEvidence(context, previous);
      const allowed = current.declarations.concat(current.definitions).filter((item) => item.projectKey === body.projectKey).flatMap((item) => [item.qualifiedName, ...item.typeDependencies, ...item.proofDependencies]);
      if (!allowed.includes(body.name) || current.state === "stale") throw new LeanReviewError(400, "Refresh the object and choose a declaration from its actual dependency evidence.");
      expansion = { projectKey: body.projectKey, name: body.name };
    }
    const running = [...this.jobs.values()].find((item) => item.root === root && ["queued", "running"].includes(item.job.status));
    if (running) throw new LeanReviewError(409, "Another Lean evidence job is running in this project.");
    if (this.jobs.size >= 32) {
      const old = [...this.jobs.entries()].find(([, item]) => !["queued", "running"].includes(item.job.status));
      if (old) this.jobs.delete(old[0]);
      else throw new LeanReviewError(409, "Too many Lean review jobs are active.");
    }
    const job = {
      id: crypto__namespace.randomBytes(16).toString("hex"),
      formalId: context.id,
      status: "queued",
      phase: "Preparing local Lean evidence",
      startedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const active = { root, job, cancelled: false };
    this.jobs.set(job.id, active);
    active.promise = new Promise((resolve) => setTimeout(() => {
      void this.run(active, context, previous, expansion).finally(resolve);
    }, 0));
    return { status: 202, value: { job: { ...job } } };
  }
  async run(active, context, previous, expansion) {
    let lock;
    const lockPath = path__namespace.join(context.root, ".math-workspace", "lean-review-refresh.lock");
    try {
      lock = await fileSystem.open(lockPath, "wx", 384);
      await lock.writeFile(JSON.stringify({ pid: process.pid, jobId: active.job.id }));
      if (active.cancelled) throw new Error("Review evidence refresh cancelled.");
      active.job.status = "running";
      const imports = {};
      if (previous) for (const project of context.projectConfigs) {
        if (!projectCurrent(context, previous, project.key)) continue;
        const names = context.evidence.declarations.filter((item) => item.projectKey === project.key).map((item) => item.qualifiedName);
        if (expansion?.projectKey === project.key) names.push(expansion.name);
        const rows = names.map((name) => [...previous.declarations, ...previous.definitions].find((item) => item.projectKey === project.key && item.qualifiedName === name));
        if (rows.length && rows.every((item) => item?.evidenceState === "available" && item.module)) imports[project.key] = [...new Set(rows.map((item) => item.module))];
      }
      const evidence = await refreshReviewEvidence(context, {
        cancelled: () => active.cancelled,
        onProcess: (child) => {
          active.child = child;
        },
        phase: (phase) => {
          active.job.phase = phase;
        },
        imports,
        build: async (key, perform) => {
          let executed = false;
          const receipt = await this.builds.get(key, (inputs) => {
            executed = true;
            return perform(inputs);
          });
          return { ...receipt, reused: !executed };
        }
      }, expansion);
      if (expansion && previous) {
        for (const project of evidence.projects.filter((item) => item.projectKey !== expansion.projectKey)) {
          const saved = previous.projects.find((item) => item.projectKey === project.projectKey);
          if (saved && projectCurrent(context, previous, project.projectKey)) Object.assign(project, saved);
        }
        for (const declaration2 of evidence.declarations.filter((item) => item.projectKey !== expansion.projectKey)) {
          const saved = previous.declarations.find((item) => item.key === declaration2.key);
          if (saved && projectCurrent(context, previous, declaration2.projectKey)) Object.assign(declaration2, saved);
        }
        evidence.definitions = [...new Map([...previous.definitions, ...evidence.definitions].map((item) => [item.key, item])).values()];
        const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
        evidence.state = evidence.declarations.some((item) => item.evidenceState === "stale") ? "stale" : available > 0 && available === evidence.declarations.length ? "current" : available > 0 ? "partial" : "unavailable";
        evidence.fingerprint = evidenceFingerprint(evidence);
      }
      if (active.cancelled) throw new Error("Review evidence refresh cancelled.");
      await writeReviewEvidenceCache(context.root, context.id, evidence);
      active.job.status = evidence.state === "current" ? "completed" : "failed";
      active.job.phase = evidence.state === "current" ? "Evidence ready for human review" : "Evidence incomplete";
      if (active.job.status === "failed") active.job.error = evidence.diagnostics.join("\n") || "No complete elaborated evidence was obtained.";
      this.onChange?.(context.root, context.id);
    } catch (error2) {
      active.job.status = active.cancelled ? "cancelled" : "failed";
      active.job.phase = active.cancelled ? "Cancelled" : "Evidence refresh failed";
      active.job.error = error2?.code === "EEXIST" ? "Another Reader owns the local evidence refresh lock; wait for it, or inspect a lock left by a crashed process." : error2.message || String(error2);
    } finally {
      active.job.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      active.child = void 0;
      if (lock) {
        await lock.close();
        await fs__namespace.rm(lockPath, { force: true });
      }
    }
  }
  kill(child) {
    if (!child) return;
    try {
      if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch (_error) {
      child.kill("SIGKILL");
    }
  }
  async close() {
    this.closed = true;
    this.snapshots.clear();
    this.inputResults.clear();
    this.fileHashes.clear();
    this.builds.clear();
    for (const active of this.jobs.values()) if (["queued", "running"].includes(active.job.status)) {
      active.cancelled = true;
      this.kill(active.child);
    }
    await Promise.all([...this.jobs.values()].map((active) => active.promise));
  }
}
const version = "0.11.0";
const MAX_BYTES$1 = 200 * 1024 * 1024;
function publicationZip(files, modes = /* @__PURE__ */ new Map()) {
  if (files.size > 1e4) throw new Error("The publication package exceeds 10,000 files.");
  const table2 = Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    return value >>> 0;
  });
  const local = [], central = [];
  let offset = 0, total = 0;
  for (const [name, value] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!name || name.startsWith("/") || /[\\\u0000-\u001f]/.test(name) || name.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Invalid publication package path.");
    const bytes = Buffer.from(value), encoded = Buffer.from(name, "utf8");
    total += bytes.length;
    if (total > MAX_BYTES$1 || encoded.length > 65535) throw new Error("The publication package exceeds its size limit.");
    let checksum = 4294967295;
    for (const byte of bytes) checksum = table2[(checksum ^ byte) & 255] ^ checksum >>> 8;
    checksum = (checksum ^ 4294967295) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(67324752);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(2048, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(bytes.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(encoded.length, 26);
    local.push(header, encoded, bytes);
    const directory2 = Buffer.alloc(46);
    directory2.writeUInt32LE(33639248);
    directory2.writeUInt16LE(788, 4);
    directory2.writeUInt16LE(20, 6);
    directory2.writeUInt16LE(2048, 8);
    directory2.writeUInt32LE((32768 | (modes.get(name) || 420)) << 16 >>> 0, 38);
    directory2.writeUInt16LE(33, 14);
    directory2.writeUInt32LE(checksum, 16);
    directory2.writeUInt32LE(bytes.length, 20);
    directory2.writeUInt32LE(bytes.length, 24);
    directory2.writeUInt16LE(encoded.length, 28);
    directory2.writeUInt32LE(offset, 42);
    central.push(directory2, encoded);
    offset += header.length + encoded.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(101010256);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function publicationZipFiles(bytes) {
  const files = /* @__PURE__ */ new Map();
  let offset = 0, total = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 67324752) {
    if (bytes.readUInt16LE(offset + 6) !== 2048 || bytes.readUInt16LE(offset + 8) !== 0) throw new Error("Unsupported publication ZIP entry.");
    const size = bytes.readUInt32LE(offset + 18), nameSize = bytes.readUInt16LE(offset + 26), extraSize = bytes.readUInt16LE(offset + 28);
    const start = offset + 30 + nameSize + extraSize, end = start + size;
    if (end > bytes.length || total + size > MAX_BYTES$1 || files.size >= 1e4) throw new Error("Invalid publication ZIP bounds.");
    const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString("utf8");
    if (!name || name.startsWith("/") || /[\\\u0000-\u001f]/.test(name) || name.split("/").some((part) => !part || part === "." || part === "..") || files.has(name)) throw new Error("Invalid publication ZIP path.");
    files.set(name, bytes.subarray(start, end));
    total += size;
    offset = end;
  }
  if (!files.size || offset + 4 > bytes.length || bytes.readUInt32LE(offset) !== 33639248) throw new Error("Invalid publication ZIP directory.");
  return files;
}
const fs$4 = require("node:fs/promises");
const modulePattern = /^[\p{L}_][\p{L}\p{N}_']*(?:\.[\p{L}_][\p{L}\p{N}_']*)*$/u;
function normalizeLeanScopes(value) {
  if (value === void 0) return;
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 100) throw new Error("Invalid Lean publication scopes.");
  const result = /* @__PURE__ */ Object.create(null);
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[A-Za-z0-9._-]+$/.test(key) || !raw || typeof raw !== "object") throw new Error("Invalid Lean publication scope key.");
    const array = (items, name) => {
      if (!Array.isArray(items) || !items.length || items.length > 1e3 || items.some((x) => typeof x !== "string" || !x || x.length > 1e3)) throw new Error(`Provide explicit Lean publication ${name}.`);
      return [...new Set(items)];
    };
    const modules = array(raw.modules, "entry modules"), allowedPaths = array(raw.allowedPaths, "approved workspace paths");
    const externalModules = raw.externalModules === void 0 || raw.externalModules.length === 0 ? [] : array(raw.externalModules, "external module prefixes");
    if ([...modules, ...externalModules].some((x) => !modulePattern.test(x))) throw new Error("Lean publication modules must be explicit qualified module names.");
    result[key] = { modules, allowedPaths, externalModules };
  }
  return result;
}
function uncomment(source) {
  let out = "", depth = 0, string = false, lineStarted = false;
  for (let i = 0; i < source.length; i++) {
    const a = source[i], b = source[i + 1];
    if (a === "\n") lineStarted = false;
    if (!depth && !string && !lineStarted && !/\s/.test(a) && !(a === "/" && b === "-") && !(a === "-" && b === "-")) {
      if (/^(?:#|@\[|(?:(?:public|private|protected|unsafe|noncomputable)\s+)*(?:open|namespace|section|end|set_option|universe|variable|def|theorem|lemma|instance|class|structure|inductive|abbrev|opaque|axiom|attribute|export|example|syntax|macro|elab|notation|infix|prefix|postfix)\b)/.test(source.slice(i, i + 200))) return out;
      lineStarted = true;
    }
    if (!string && a === "/" && b === "-") {
      depth++;
      out += "  ";
      i++;
    } else if (depth && a === "-" && b === "/") {
      depth--;
      out += "  ";
      i++;
    } else if (depth) out += a === "\n" ? "\n" : " ";
    else if (!string && a === "-" && b === "-") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i++;
      }
      out += "\n";
    } else if (a === '"') {
      string = !string;
      out += " ";
    } else if (string && a === "\\") {
      out += "  ";
      i++;
    } else out += string && a !== "\n" ? " " : a;
  }
  if (depth || string) throw new Error("Unterminated Lean comment/string in publication source.");
  return out;
}
function publicationImports(source) {
  const imports = [];
  let continuation = false;
  for (const line of uncomment(source).split(/\r?\n/)) {
    const text2 = line.trim();
    if (!text2 || text2 === "prelude" || text2 === "module") continue;
    const match2 = /^(?:(?:public|private|meta)\s+)*import(?:\s+all)?(?:\s+(.*))?$/.exec(text2);
    if (/^(?:public|private|meta)(?:\s+(?:public|private|meta))*$/.test(text2)) throw new Error("Put Lean import modifiers and import on the same line for scoped publication.");
    if (match2) {
      if (!match2[1]) {
        continuation = true;
        continue;
      }
      const names = match2[1].trim().split(/\s+/);
      if (names.some((x) => !modulePattern.test(x))) throw new Error(`Unsupported Lean import header: ${text2}`);
      imports.push(...names);
      continuation = true;
      continue;
    }
    if (continuation && text2.split(/\s+/).every((x) => modulePattern.test(x)) && !/^(?:open|namespace|section|end|set_option|noncomputable|universe|variable|def|theorem|lemma|instance|class|structure|inductive|abbrev|opaque|axiom|attribute|export)\b/.test(text2)) {
      imports.push(...text2.split(/\s+/));
      continue;
    }
    break;
  }
  return [...new Set(imports)];
}
function packageConfig(text2) {
  if (/'''|"""/.test(text2)) throw new Error("Scoped Lean publication requires a simple declarative TOML configuration (no multiline strings).");
  const sections = text2.split(/(?=^\s*\[)/m);
  const keep = [];
  const dirs = /* @__PURE__ */ new Set();
  for (const section of sections) {
    const head = /^\s*(\[+[^\]\n]+\]+)/.exec(section)?.[1] || "";
    if (head.startsWith("[[lean_lib")) {
      const src2 = /^\s*srcDir\s*=\s*["']([^"']+)["']/m.exec(section);
      if (src2 && src2[1] !== ".") dirs.add(src2[1]);
      if (/^\s*(?:leanOptions|moreLeanArgs|plugins|dynlibs|needs|extraDepTargets)\b/m.test(section)) throw new Error("Scoped Lean publication cannot discard library-specific build options.");
      continue;
    }
    if (head && head !== "[leanOptions]" && head !== "[[require]]" && !/^\[require\./.test(head)) throw new Error(`Unsupported scoped Lake TOML section: ${head}`);
    keep.push(section);
  }
  if (dirs.size) throw new Error('Scoped Lean publication currently requires library srcDir = "."; use whole-project mode for custom library layouts.');
  let base2 = keep.join("");
  const src = /^\s*srcDir\s*=\s*["']([^"']+)["']/m.exec(sections[0]);
  if (/^\s*defaultTargets\s*=/m.test(base2) && !/^\s*defaultTargets\s*=\s*\[[^\n]*\]\s*(?:#.*)?$/m.test(base2)) throw new Error("Use a single-line Lake defaultTargets list for scoped publication.");
  base2 = base2.replace(/^\s*defaultTargets\s*=.*$/gm, "");
  return { sourceDir: src?.[1] || ".", base: base2 };
}
async function scopedLeanFiles(root, projectRoot, scope, approve) {
  const packages = /* @__PURE__ */ new Map(), files = /* @__PURE__ */ new Map(), index = /* @__PURE__ */ new Map(), owners = /* @__PURE__ */ new Map();
  const relative = (base22, value) => {
    const name = path__namespace.posix.normalize(path__namespace.posix.join(base22 || ".", value));
    return name === "." ? "" : approve(name);
  };
  let readBytes = 0;
  const read = async (name) => {
    const file = await safePath(root, approve(name)), stat = await fs$4.stat(file);
    if (!stat.isFile() || readBytes + stat.size > 160 * 1024 * 1024) throw new Error("Scoped Lean inputs exceed publication limits.");
    const bytes = await fs$4.readFile(file);
    readBytes += bytes.length;
    return bytes;
  };
  const discover = async (directory) => {
    if (packages.has(directory)) return;
    const configPath2 = relative(directory, "lakefile.toml");
    let config2;
    try {
      config2 = (await read(configPath2)).toString("utf8");
    } catch {
      throw new Error(`Scoped Lean publication needs lakefile.toml: ${directory || "."}`);
    }
    try {
      await fs$4.access(await safePath(root, relative(directory, "lakefile.lean")));
      throw new Error("Scoped Lean publication refuses ambiguous TOML/Lean build configurations.");
    } catch (error2) {
      if (error2.code !== "ENOENT") throw error2;
    }
    const parsed = packageConfig(config2), manifestPath = relative(directory, "lake-manifest.json"), manifest = JSON.parse((await read(manifestPath)).toString("utf8"));
    if (!Array.isArray(manifest.packages)) throw new Error("A scoped Lean package needs a locked dependency manifest.");
    const sourceDir = relative(directory, parsed.sourceDir);
    packages.set(directory, { root: directory, config: config2, sourceDir, manifest });
    for (const name of ["lakefile.toml", "lake-manifest.json", "lean-toolchain", "LICENSE", "LICENSE.md", "LICENSE.txt"]) {
      const file = relative(directory, name);
      try {
        files.set(file, await read(file));
      } catch (error2) {
        if (error2.code !== "ENOENT") throw error2;
      }
    }
    if (directory === projectRoot && !files.has(relative(directory, "lean-toolchain"))) throw new Error(`Missing pinned toolchain in ${directory}`);
    for (const dep of manifest.packages) {
      if (dep.type === "path" && typeof dep.dir === "string") {
        if (dep.configFile && dep.configFile !== "lakefile.toml" || dep.manifestFile && dep.manifestFile !== "lake-manifest.json") throw new Error("Scoped local dependencies require standard TOML config and lock filenames.");
        await discover(relative(directory, dep.dir));
      } else if (!(dep.type === "git" && /^(?:https:\/\/[^/@\s]+\/|git@[^:\s]+:)/.test(dep.url || "") && /^[a-f0-9]{40,64}$/i.test(dep.rev || ""))) throw new Error("Dependencies need workspace-local paths or exact public Git commits.");
    }
    const walk = async (dir) => {
      for (const entry of await fs$4.readdir(dir ? await safePath(root, dir) : root, { withFileTypes: true })) {
        if (entry.name.startsWith(".") || ["node_modules", "out", "dist", "build"].includes(entry.name)) continue;
        const name = relative(dir, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Lean publication cannot follow symlinks: ${name}`);
        if (entry.isDirectory()) await walk(name);
        else if (entry.isFile() && entry.name.endsWith(".lean") && entry.name !== "lakefile.lean") {
          const module2 = path__namespace.posix.relative(sourceDir || ".", name).slice(0, -5).replace(/\//g, ".");
          if (!modulePattern.test(module2)) throw new Error(`Unsupported Lean module path: ${name}`);
          if (index.has(module2) && index.get(module2) !== name) throw new Error(`Ambiguous local Lean module: ${module2}`);
          index.set(module2, name);
          owners.set(module2, directory);
          if (index.size > 1e4) throw new Error("Lean module index exceeds publication limits.");
        }
      }
    };
    await walk(sourceDir);
  };
  await discover(projectRoot);
  if ((scope.externalModules || []).length && ![...packages.values()].some((p) => p.manifest.packages.some((dep) => dep.type === "git"))) throw new Error("External Lean modules need pinned Git dependencies.");
  for (const prefix of scope.externalModules || []) if ([...index.keys()].some((module2) => module2 === prefix || module2.startsWith(prefix + "."))) throw new Error(`External prefix overlaps a local module namespace: ${prefix}`);
  const allowed = scope.allowedPaths.map(approve), modules = /* @__PURE__ */ new Set(), external = /* @__PURE__ */ new Set();
  const visit = async (module2, parent) => {
    if (modules.has(module2)) return;
    const file = index.get(module2);
    if (!file) {
      if (["Init", "Lean", "Std", "Lake", ...scope.externalModules || []].some((prefix) => module2 === prefix || module2.startsWith(prefix + ".")) && parent) {
        external.add(module2);
        return;
      }
      throw new Error(`Unresolved Lean module ${module2} imported by ${parent || "publication entry"}. Declare pinned external module prefixes explicitly.`);
    }
    if (!allowed.some((prefix) => file === prefix || file.startsWith(prefix + "/"))) throw new Error(`Lean public scope excludes required module ${module2}: ${file} (imported by ${parent || "publication entry"})`);
    modules.add(module2);
    const bytes = await read(file);
    files.set(file, bytes);
    for (const dependency of publicationImports(bytes.toString("utf8"))) await visit(dependency, module2);
  };
  for (const module2 of scope.modules) await visit(module2, "");
  const pkg = packages.get(projectRoot);
  const base2 = packageConfig(pkg.config).base;
  const roots = [...new Set([...modules].filter((m) => owners.get(m) === projectRoot).map((m) => m.split(".")[0]))];
  const generated = `${base2.trim()}

[[lean_lib]]
name = "MathWorkspacePublication"
roots = ${JSON.stringify(roots)}
globs = ${JSON.stringify([...modules].filter((m) => owners.get(m) === projectRoot).sort())}
`;
  files.set(relative(projectRoot, "lakefile.toml"), Buffer.from(generated));
  return { files, modules: [...modules].sort(), externalImports: [...external].sort(), localDependencies: [...packages.keys()].filter((x) => x !== projectRoot).sort(), derivedConfigSha256: sha256(Buffer.from(pkg.config)) };
}
const fs$3 = require("node:fs/promises");
const childProcess$3 = require("node:child_process");
const MAX_BYTES = 160 * 1024 * 1024;
const PUBLIC_ARTIFACTS = ["publication.pdf", "compiled.md", "source.zip", "verification.json", "CITATION.cff", "citation.json", "release.json", "checksums.sha256"];
function publicPath(value) {
  return publicResourcePath(value);
}
function repositoryTarget(input) {
  if (!input || typeof input !== "object") throw new Error("A repository publication target is required.");
  const url2 = String(input.url || "").trim();
  if (!url2 || url2.length > 2e3 || /[\s\u0000-\u001f]/.test(url2) || url2.startsWith("-")) throw new Error("Invalid publication repository URL.");
  const provider = input.provider || "git";
  if (!["github", "gitlab", "git"].includes(provider)) throw new Error("Unknown repository publication provider.");
  const https = /^https:\/\/([^/@?#]+)\/([^?#]+)$/.exec(url2), ssh = /^git@([^:]+):(.+)$/.exec(url2);
  if (!https && !ssh && !/^file:\/\/\//.test(url2)) throw new Error("Use an HTTPS, git@host:path, or local file repository URL.");
  if (provider !== "git" && (!https && !ssh || (https?.[1] || ssh?.[1]) !== (provider === "github" ? "github.com" : "gitlab.com"))) throw new Error("The hosted publication provider must match its repository host.");
  const ref = (value, name) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,180}$/.test(value) || /\.\.|@\{|\/\//.test(value) || value.endsWith("/") || value.endsWith(".") || value.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"))) throw new Error(`Invalid publication ${name}.`);
    return value;
  };
  const tokenEnv = input.tokenEnv || (provider === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN");
  if (!/^[A-Z_][A-Z0-9_]{0,100}$/.test(tokenEnv)) throw new Error("Invalid repository credential environment variable name.");
  return { url: url2, provider, branch: ref(input.branch || "main", "branch"), tag: ref(input.tag, "tag"), directory: publicPath(input.directory), ...provider !== "git" ? { tokenEnv } : {} };
}
function normalizeDelivery(input) {
  if (input === void 0) return void 0;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid publication delivery configuration.");
  const strings2 = (value) => {
    if (value === void 0) return [];
    if (!Array.isArray(value) || value.length > 1e3 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 1e3)) throw new Error("Invalid publication delivery selection.");
    return [...new Set(value)];
  };
  return { extraFiles: strings2(input.extraFiles).map(publicPath), leanProjects: strings2(input.leanProjects), ...input.leanScopes === void 0 ? {} : { leanScopes: normalizeLeanScopes(input.leanScopes) }, ...input.repository ? { repository: repositoryTarget(input.repository) } : {} };
}
async function prepareDelivery(root, profile, config2, context) {
  const files = /* @__PURE__ */ new Map(), roles = /* @__PURE__ */ new Map(), modes = /* @__PURE__ */ new Map();
  let total = 0;
  const add2 = async (name, role) => {
    publicPath(name);
    if (files.has(name)) {
      if (role === "lean") roles.set(name, role);
      return;
    }
    const file = await safePath(root, name), stat = await fs$3.stat(file);
    if (!stat.isFile() || stat.size > MAX_BYTES || total + stat.size > MAX_BYTES || files.size >= 1e4) throw new Error("Public sources exceed the file or byte limit.");
    const bytes = context.files.get(name) ?? await fs$3.readFile(file);
    total += bytes.length;
    files.set(name, bytes);
    roles.set(name, role);
    modes.set(name, stat.mode & 73 ? 493 : 420);
  };
  const manuscripts = /* @__PURE__ */ new Set([...context.selected.map((page) => page.path), ...context.matter.map((entry) => entry.file).filter(Boolean)]);
  for (const name of manuscripts) await add2(name, "manuscript");
  for (const name of context.assets) if (!/\.md$/i.test(name) || manuscripts.has(name)) await add2(name, "resource");
  for (const name of profile.delivery.extraFiles || []) await add2(name, "extra");
  const projects = leanProjects(config2), selectedKeys = new Set(profile.delivery.leanProjects || []);
  if ([...selectedKeys].some((key) => !projects.some((project) => project.key === key))) throw new Error("A selected Lean project is not configured in this workspace.");
  const lean = [], visited = /* @__PURE__ */ new Set();
  const inside = (base2, value) => {
    const relative = path__namespace.relative(root, path__namespace.resolve(root, base2, value)).split(path__namespace.sep).join("/");
    if (relative === "") return "";
    return publicPath(relative);
  };
  const collect = async (directory, dependencies) => {
    if (visited.has(directory)) return;
    visited.add(directory);
    const join = (name) => directory ? `${directory}/${name}` : name;
    const walk = async (name) => {
      const entries = await fs$3.readdir(name ? await safePath(root, name) : root, { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith(".") || ["node_modules", "out", "dist", "build"].includes(entry.name)) continue;
        const child = name ? `${name}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) throw new Error("Lean publication sources cannot follow symbolic links.");
        if (entry.isDirectory()) await walk(child);
        else if (entry.isFile() && (/\.lean$/i.test(entry.name) || ["lean-toolchain", "lakefile.toml", "lake-manifest.json", "LICENSE", "LICENSE.md", "LICENSE.txt"].includes(entry.name))) await add2(child, "lean");
      }
    };
    await walk(directory);
    const toolchain = join("lean-toolchain"), manifestFile = join("lake-manifest.json");
    if (!files.has(toolchain) || !files.has(manifestFile) || !files.has(join("lakefile.lean")) && !files.has(join("lakefile.toml"))) throw new Error(`Lean project ${directory || "."} needs lean-toolchain, lakefile and lake-manifest.json.`);
    const manifest = JSON.parse(files.get(manifestFile).toString("utf8"));
    if (!Array.isArray(manifest.packages)) throw new Error("A Lean publication requires an existing dependency lock manifest.");
    for (const dependency of manifest.packages) {
      if (dependency.type === "path" && typeof dependency.dir === "string") {
        const target = inside(directory, dependency.dir);
        dependencies.push(target || ".");
        await collect(target, dependencies);
      } else if (dependency.type === "git" && typeof dependency.url === "string" && /^[a-f0-9]{40,64}$/i.test(dependency.rev || "") && /^(?:https:\/\/[^/@\s]+\/|git@[^:\s]+:)/.test(dependency.url)) ;
      else throw new Error("Lean dependencies must use workspace-local paths or public Git URLs pinned to exact commits.");
    }
  };
  for (const project of projects.filter((item) => selectedKeys.has(item.key))) {
    const dependencies = [], scope = profile.delivery.leanScopes?.[project.key];
    const scoped = scope ? await scopedLeanFiles(root, project.root, scope, publicPath) : void 0;
    if (scoped) {
      dependencies.push(...scoped.localDependencies);
      for (const [name, bytes] of scoped.files) {
        if (files.has(name)) {
          if (!files.get(name).equals(bytes)) throw new Error(`Conflicting Lean publication projection: ${name}`);
          continue;
        }
        if (total + bytes.length > MAX_BYTES || files.size >= 1e4) throw new Error("Public Lean sources exceed publication limits.");
        total += bytes.length;
        files.set(name, bytes);
        roles.set(name, "lean");
        modes.set(name, 420);
      }
    } else await collect(project.root, dependencies);
    const toolchainPath = project.root ? `${project.root}/lean-toolchain` : "lean-toolchain";
    const toolchain = files.get(toolchainPath).toString("utf8").trim();
    if (toolchain.includes("..") || !/^[A-Za-z0-9._/-]+:(?:v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?|nightly-\d{4}-\d{2}-\d{2}|[a-f0-9]{40,64})$/.test(toolchain)) throw new Error("Pin the Lean toolchain to an exact release, dated nightly or commit.");
    if (project.target && (/^\s*-/.test(project.target) || /[\u0000-\u001f]/.test(project.target))) throw new Error("A Lean publication target cannot be a command-line option.");
    lean.push({ key: project.key, root: project.root || ".", toolchain, target: scoped ? "MathWorkspacePublication" : project.target, localDependencies: [...new Set(dependencies)].sort(), ...scoped ? { modules: scoped.modules, externalImports: scoped.externalImports, derivedConfigSha256: scoped.derivedConfigSha256 } : {} });
  }
  assertPortablePaths(files.keys());
  const reserved = ["compiled.md", "build-pdf.mjs", "rebuild-lean.mjs", "PUBLICATION.json", "PUBLICATION-README.md", "verification.json", "CITATION.cff", "release.json", "SOURCE-CHECKSUMS.sha256"];
  if (reserved.some((name) => files.has(name))) throw new Error("A public source path conflicts with a generated publication file.");
  const reviews = new LeanReviewService(), objects = [], builds = /* @__PURE__ */ new Map();
  const coverageTypes = new Set(config2.lean?.coverageTypes || DEFAULT_LEAN_COVERAGE_TYPES);
  for (const [id, label] of Object.entries(context.labels)) {
    if (!manuscripts.has(label.filePath) || !coverageTypes.has(label.type)) continue;
    if (!selectedKeys.size) {
      objects.push({ id, coverage: "not-included", declarations: [], humanReview: "unreviewed" });
      continue;
    }
    try {
      const response = await reviews.get(root, id), evidence = response.evidence;
      const declarations = evidence.declarations.filter((item) => selectedKeys.has(item.projectKey) && (!lean.find((project) => project.key === item.projectKey)?.modules || !!item.source?.filePath && files.has(item.source.filePath))).map((item) => ({ project: item.projectKey, name: item.qualifiedName, state: item.evidenceState, axioms: item.evidenceState === "available" ? item.axioms : void 0 }));
      objects.push({ id, coverage: declarations.length ? "anchored" : "unanchored", declarations, humanReview: declarations.length !== evidence.declarations.filter((item) => selectedKeys.has(item.projectKey)).length ? "scope-changed" : response.review.freshness, verdict: response.review.freshness === "current" && declarations.length === evidence.declarations.filter((item) => selectedKeys.has(item.projectKey)).length ? response.review.record?.verdict : void 0 });
      for (const project of evidence.projects.filter((item) => selectedKeys.has(item.projectKey))) builds.set(project.projectKey, { key: project.projectKey, inputFingerprint: project.inputFingerprint, toolchain: project.toolchain, target: project.target, state: project.build.state, finishedAt: project.build.finishedAt });
    } catch {
      objects.push({ id, coverage: "unavailable", declarations: [], humanReview: "unreviewed" });
    }
  }
  const report = {
    schema: "math-workspace.publication-evidence/v1",
    mathematicalCorrectnessAssessed: false,
    coverageTypes: [...coverageTypes],
    packageRebuild: { state: "unverified", command: "node rebuild-lean.mjs", meaning: "Saved project build evidence is distinct from a fresh rebuild of the distributed package." },
    buildPolicy: "Current saved project-input-bound build evidence is reused; preparation never executes Lean or installs dependencies.",
    projects: lean.map((project) => builds.get(project.key) || { key: project.key, state: "unverified" }),
    objects
  };
  let source;
  try {
    const git2 = (args, input) => childProcess$3.spawnSync("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "-C", root, ...args], { input, timeout: 3e3, maxBuffer: MAX_BYTES, env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))), GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1" } });
    const head = git2(["rev-parse", "--verify", "HEAD"]);
    if (head.status === 0 && /^[a-f0-9]{40,64}$/.test(head.stdout.toString().trim())) {
      let matches = true;
      for (const [name, bytes] of files) {
        const blob = git2(["show", `HEAD:./${name}`]);
        if (blob.status !== 0 || !blob.stdout.equals(bytes)) {
          matches = false;
          break;
        }
      }
      source = { commit: head.stdout.toString().trim(), matchesPublicInputs: matches };
    }
  } catch {
  }
  return { plan: { files: [...files].map(([name, bytes]) => ({ path: name, sha256: sha256(bytes), bytes: bytes.length, mode: modes.get(name), role: roles.get(name) })), lean, report, ...source ? { source } : {} }, files };
}
async function writeDelivery(directory, frozen, plan, renderArgs, createdAt, buildId2) {
  if (!plan.delivery) return [];
  const source = /* @__PURE__ */ new Map(), lean = /* @__PURE__ */ new Map();
  const modes = new Map(plan.delivery.files.map((file) => [file.path, file.mode]));
  for (const file of plan.delivery.files) {
    const bytes = await fs$3.readFile(await safePath(frozen, file.path));
    if (sha256(bytes) !== file.sha256) throw new Error("A frozen public source changed.");
    source.set(file.path, bytes);
    if (file.role === "lean") lean.set(file.path, bytes);
  }
  const compiled = await fs$3.readFile(path__namespace.join(directory, "compiled.md"));
  if (source.has("compiled.md") || source.has("build-pdf.mjs") || source.has("rebuild-lean.mjs") || source.has("PUBLICATION.json")) throw new Error("A public source path conflicts with a generated publication file.");
  source.set("compiled.md", compiled);
  const args = renderArgs.map((arg) => arg === "../compiled.md" ? "compiled.md" : arg === "--out=../publication.pdf" ? "--out=publication.pdf" : arg);
  for (const arg of args.filter((item) => item.startsWith("--front-matter="))) {
    const name = arg.slice("--front-matter=".length);
    source.set(name, await fs$3.readFile(await safePath(frozen, name)));
  }
  source.set(".math-workspace/config.json", Buffer.from(canonical({ language: plan.profile.language, lean: { projects: [] } })));
  const credentialNames = [...new Set(["ZENODO_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "GITLAB_TOKEN", plan.profile.zenodo?.tokenEnv, plan.profile.delivery?.repository?.tokenEnv].filter(Boolean))];
  const cleanEnv = `const env={...process.env};for(const key of ${JSON.stringify(credentialNames)})delete env[key];
`;
  source.set("build-pdf.mjs", Buffer.from(`import {spawnSync} from 'node:child_process';
${cleanEnv}const result=spawnSync(process.env.MATH_WORKSPACE_COMMAND||'math-workspace',${JSON.stringify(args)},{cwd:new URL('.',import.meta.url),stdio:'inherit',env});
if(result.error)throw result.error;process.exit(result.status??1);
`));
  const rebuild = `import {spawnSync} from 'node:child_process';
${cleanEnv}const projects=${JSON.stringify(plan.delivery.lean)};
for(const p of projects){const r=spawnSync('elan',['run',p.toolchain,'lake','build',...(p.target?[p.target]:[])],{cwd:new URL(p.root.replace(/\\/$/,'')+'/',import.meta.url),stdio:'inherit',env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
`;
  const identity2 = {
    schema: "math-workspace.publication-source/v1",
    buildId: buildId2,
    workId: plan.profile.workId,
    version: plan.profile.version,
    title: plan.profile.title,
    doi: plan.doi.versionDoi,
    conceptDoi: plan.doi.conceptDoi,
    selected: plan.selected.map((page) => page.path),
    lean: plan.delivery.lean,
    source: plan.delivery.source,
    tools: { ...plan.tools, mathWorkspace: version },
    numbering: "compiled.md retains the reviewed edition numbering. Rebuild the PDF from compiled.md rather than rescanning a partial manuscript."
  };
  source.set("PUBLICATION.json", Buffer.from(canonical(identity2)));
  const readme = Buffer.from(`# ${plan.profile.title} — ${plan.profile.version}

Public sources for this edition only. See PUBLICATION.json. The accompanying release checksums.sha256 authenticates the downloaded archive.

PDF: install the Math Workspace CLI version recorded in PUBLICATION.json and the recorded Pandoc/TeX tools, then run node build-pdf.mjs. compiled.md retains this edition's numbering.

Lean: install the pinned toolchain deliberately, then run node rebuild-lean.mjs. Lake may fetch Git dependencies at the exact commits in lake-manifest.json. Local path dependencies are included. Build caches are omitted.

verification.json reports saved build evidence, formal anchors and human review separately. Unverified, stale or missing evidence does not assert proof coverage or mathematical correctness.
`);
  validatePublicationMedia(source, [...source.keys()].filter((name) => /\.md$/i.test(name) && !name.startsWith(".math-workspace/")));
  validatePublicationMedia(source, ["compiled.md"], { normalizedMath: true });
  const fragments = [...source.keys()].filter((name) => /^\.math-workspace\/publication-front-\d+\.md$/.test(name));
  validatePublicationMedia(source, fragments, { normalizedMath: true, contexts: new Map(fragments.map((name) => [name, "front.md"])) });
  source.set("PUBLICATION-README.md", readme);
  if (!source.has("README.md")) source.set("README.md", readme);
  source.set("rebuild-lean.mjs", Buffer.from(rebuild));
  const result = ["source.zip", "verification.json", "CITATION.cff"];
  if (lean.size) {
    lean.set("rebuild-lean.mjs", Buffer.from(rebuild));
    lean.set("PUBLICATION.json", Buffer.from(canonical(identity2)));
    lean.set("README.md", readme);
    await fs$3.writeFile(path__namespace.join(directory, "lean.zip"), publicationZip(lean, modes), { flag: "wx" });
    result.push("lean.zip");
  }
  source.set("verification.json", Buffer.from(canonical(plan.delivery.report)));
  await fs$3.writeFile(path__namespace.join(directory, "source.zip"), publicationZip(source, modes), { flag: "wx" });
  await fs$3.writeFile(path__namespace.join(directory, "verification.json"), canonical(plan.delivery.report), { flag: "wx" });
  const q = (value) => JSON.stringify(String(value || ""));
  const citation = `cff-version: 1.2.0
message: ${q(plan.profile.preferredCitation || "Please cite this edition.")}
type: dataset
title: ${q(plan.profile.title)}
version: ${q(plan.profile.version)}
date-released: ${q(plan.profile.publicationDate || createdAt.slice(0, 10))}
authors:
${(plan.profile.authors || []).map((author) => `  - name: ${q(author.name)}${author.orcid ? `
    orcid: ${q(author.orcid.startsWith("http") ? author.orcid : "https://orcid.org/" + author.orcid)}` : ""}`).join("\n")}
${plan.doi.versionDoi ? `doi: ${q(plan.doi.versionDoi)}
` : ""}${plan.profile.license ? `license: ${q(/^cc[-0]/i.test(plan.profile.license) ? plan.profile.license.toUpperCase() : plan.profile.license)}
` : ""}`;
  const conceptIdentifier = plan.doi.conceptDoi ? `identifiers:
  - type: doi
    value: ${q(plan.doi.conceptDoi)}
` : "";
  const preferred = `preferred-citation:
  type: book
  title: ${q(plan.profile.title)}
  authors:
${(plan.profile.authors || []).map((author) => `    - name: ${q(author.name)}${author.orcid ? `
      orcid: ${q(author.orcid.startsWith("http") ? author.orcid : "https://orcid.org/" + author.orcid)}` : ""}`).join("\n")}
  year: ${q((plan.profile.publicationDate || createdAt).slice(0, 4))}
${plan.doi.versionDoi ? `  doi: ${q(plan.doi.versionDoi)}
` : ""}`;
  await fs$3.writeFile(path__namespace.join(directory, "CITATION.cff"), citation + conceptIdentifier + preferred, { flag: "wx" });
  return result;
}
const fs$2 = require("node:fs/promises");
const childProcess$2 = require("node:child_process");
const optionalText = (value, name, limit = 2e4) => {
  if (value === void 0 || value === "") return void 0;
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error(`Invalid publication ${name}.`);
  return value.trim() || void 0;
};
const list = (value, name, limit = 1e3) => {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid publication ${name}.`);
  return value;
};
function normalizeDoi(value) {
  return metadataDoi(value) || void 0;
}
function normalizeProfile(input) {
  if (!input || typeof input !== "object") throw new Error("A publication profile is required.");
  const automatic = input.matter?.automatic === true;
  const matter = (items, role) => list(items, role, 100).map((item) => {
    if (!item || typeof item !== "object") throw new Error(`Invalid ${role} entry.`);
    const value = { title: optionalText(item.title, `${role} title`, 1e3), file: item.file === void 0 ? void 0 : relativeInput(item.file), content: optionalText(item.content, `${role} content`, 1e6), includeInToc: item.includeInToc === true };
    if (value.file && !/\.md$/i.test(value.file)) throw new Error("Publication matter files must be Markdown files.");
    if (!automatic && !value.file && !value.content && !value.title) throw new Error(`An empty ${role} entry cannot be published.`);
    return value;
  });
  const metadata = normalizeWorkMetadata(input);
  const chapters = [...new Set(list(input.chapters, "chapter selection", 1e4).map(relativeInput))];
  if (!chapters.length) throw new Error("Select at least one chapter or page.");
  if (chapters.some((file) => !/\.md$/i.test(file))) throw new Error("Publication chapters must be Markdown files.");
  const version2 = optionalText(input.version, "version", 200);
  if (!version2) throw new Error("Publication version is required.");
  const engine = input.pdf?.engine || "xelatex";
  if (!["xelatex", "lualatex", "pdflatex", "tectonic"].includes(engine)) throw new Error("Unsupported publication PDF engine.");
  const paper = input.pdf?.paper || "a4", margin = input.pdf?.margin || "2.5cm";
  if (!/^[a-zA-Z0-9-]{1,30}$/.test(paper) || !/^\d+(?:\.\d+)?(?:cm|mm|in|pt)$/.test(margin)) throw new Error("Invalid publication paper or margin.");
  const documentClass = optionalText(input.pdf?.documentClass, "document class", 80);
  if (documentClass && !/^[a-zA-Z0-9_-]+$/.test(documentClass)) throw new Error("Invalid publication document class.");
  const depth = input.toc?.depth ?? 2;
  if (!Number.isInteger(depth) || depth < 1 || depth > 6) throw new Error("Contents depth must be between 1 and 6.");
  const tokenEnv = input.zenodo?.tokenEnv || "ZENODO_TOKEN";
  if (!/^[A-Z_][A-Z0-9_]{0,100}$/.test(tokenEnv)) throw new Error("Invalid Zenodo token environment variable name.");
  const environment = input.zenodo?.environment || "sandbox";
  if (!["sandbox", "production"].includes(environment)) throw new Error("Invalid Zenodo environment.");
  const scope = input.scope ? {
    books: list(input.scope.books, "book scope", 100).map((value) => optionalText(value, "book key", 200) || ""),
    volumes: list(input.scope.volumes, "volume scope", 100).map((value) => optionalText(value, "volume key", 200) || ""),
    paths: list(input.scope.paths, "work scope", 1e4).map(relativeInput)
  } : void 0;
  const continuedFile = input.continued?.file ? relativeInput(input.continued.file) : void 0;
  if (continuedFile && !/\.md$/i.test(continuedFile)) throw new Error("Publication continued notice files must be Markdown files.");
  const frontMatter = matter(input.frontMatter, "front matter"), backMatter = matter(input.backMatter, "back matter");
  const matterFiles = [...automatic ? [] : [...frontMatter, ...backMatter], ...input.continued?.enabled === false || !continuedFile ? [] : [{ file: continuedFile }]].map((entry) => entry.file).filter(Boolean);
  if (new Set(matterFiles).size !== matterFiles.length) throw new Error("A publication file can only fill one matter role.");
  return JSON.parse(canonical({
    ...metadata,
    id: publicationId(input.id),
    workId: publicationId(input.workId),
    version: version2,
    chapters,
    scope,
    delivery: normalizeDelivery(input.delivery),
    edition: optionalText(input.edition, "edition", 300),
    publicationDate: optionalText(input.publicationDate, "publication date", 100),
    releaseTag: optionalText(input.releaseTag, "release tag", 300),
    releaseCommit: optionalText(input.releaseCommit, "release commit", 300),
    cover: { image: input.cover?.image === "" ? "" : input.cover?.image === void 0 ? void 0 : relativeInput(input.cover.image), showVersion: input.cover?.showVersion !== false },
    frontMatter,
    backMatter,
    matter: input.matter ? { automatic: input.matter.automatic === true, exclude: [...new Set(list(input.matter.exclude, "excluded matter", 1e4).map(relativeInput))] } : void 0,
    toc: { enabled: input.toc?.enabled !== false, depth, title: optionalText(input.toc?.title, "contents title", 500) },
    continued: { enabled: typeof input.continued?.enabled === "boolean" ? input.continued.enabled : void 0, file: continuedFile, title: optionalText(input.continued?.title, "continued title", 1e3), text: optionalText(input.continued?.text, "continued notice", 1e5) },
    pdf: { engine, paper, margin, documentClass },
    doi: { ...metadata.doi, versionDoi: input.doi?.versionDoi === "" ? "" : normalizeDoi(input.doi?.versionDoi) },
    zenodo: { environment, tokenEnv }
  }));
}
async function probeTool(command) {
  return new Promise((resolve) => {
    let child, output = "", done = false;
    const finish = (available) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ available, ...available ? { identity: output.trim().split("\n").slice(0, 2).join("\n") } : {} });
    };
    const timer = setTimeout(() => {
      child?.kill("SIGTERM");
      finish(false);
    }, 5e3);
    try {
      child = childProcess$2.spawn(command, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
      const collect = (bytes) => {
        output = (output + bytes.toString()).slice(0, 65536);
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      child.on("error", () => finish(false));
      child.on("close", (code2) => finish(code2 === 0));
    } catch {
      finish(false);
    }
  });
}
async function publicationTools(profile, options = {}) {
  const probe = options.toolProbe || probeTool, engineName = profile?.pdf?.engine || "xelatex";
  const [pandoc, engine] = await Promise.all([probe("pandoc"), probe(engineName)]);
  const tools = { pandoc, engine, engineName };
  if (process.platform === "darwin" && profile?.language?.toLowerCase().startsWith("zh") && !profile.pdf?.documentClass) {
    const file = "/System/Library/Fonts/Supplemental/Songti.ttc";
    try {
      await fs$2.access(file, require("node:fs").constants.R_OK);
      const stat = await fs$2.stat(file);
      if (stat.isFile()) tools.chineseFonts = { family: "Songti SC", source: "macos", bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    } catch {
    }
  }
  return tools;
}
async function readSnapshot(root) {
  const files = /* @__PURE__ */ new Map(), inputs = [];
  const capture = async (name, role, required = false) => {
    try {
      const bytes = await fs$2.readFile(await safePath(root, name));
      files.set(name, bytes);
      inputs.push({ path: name, sha256: sha256(bytes), role });
      return bytes;
    } catch (error2) {
      if (!required && error2.code === "ENOENT") return void 0;
      throw error2;
    }
  };
  const rawConfig = await capture(".math-workspace/config.json", "config");
  const config2 = mergeConfig(rawConfig ? JSON.parse(rawConfig.toString("utf8")) : {});
  const documents = [];
  const walk = async (directory, relative = "") => {
    const entries = await fs$2.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (shouldExcludeScanPath(name, config2)) continue;
      if (entry.isSymbolicLink()) {
        if (/\.md$/i.test(entry.name) || entry.isDirectory()) throw new Error(`Publication input cannot be a symbolic link: ${name}`);
        continue;
      }
      if (entry.isDirectory()) await walk(await safePath(root, name), name);
      else if (entry.isFile() && /\.md$/i.test(name)) documents.push({ filePath: name, content: (await capture(name, "source", true)).toString("utf8") });
    }
  };
  await walk(root);
  const symbols = await capture(".math-workspace/symbols.json", "metadata"), definitions = await capture(".math-workspace/definitions.json", "metadata");
  const state = scanFormalDocuments(documents, config2, symbols ? JSON.parse(symbols.toString("utf8")) : void 0, definitions ? JSON.parse(definitions.toString("utf8")) : void 0);
  const pages = sortManuscriptPages(state.pages, "export").map((page) => ({ path: page.filePath, title: formatPageHeading(page, config2), kind: page.kind, number: formatPageReference(page, config2), book: page.bookKey, bookTitle: page.bookTitle, volume: page.volumeKey, volumeTitle: page.volumeTitle }));
  for (const document of documents) if (!pages.some((page) => page.path === document.filePath)) pages.push({ path: document.filePath, title: /^#\s+(.+)$/m.exec(document.content)?.[1] || path__namespace.basename(document.filePath), kind: "page", number: void 0, book: void 0, bookTitle: void 0, volume: void 0, volumeTitle: void 0 });
  return { state, pages, files, inputs, config: config2 };
}
async function publicationCatalog(root) {
  const snapshot = await readSnapshot(root);
  return { pages: snapshot.pages, language: snapshot.config.language === "en" ? "en-US" : "zh-CN" };
}
async function makePublicationPlan(root, input, doiInput, options = {}) {
  const profileOverrides = normalizeProfile(input), snapshot = await readSnapshot(root);
  const profile = normalizeProfile(resolvePublicationMatter(resolvePublicationMetadata(profileOverrides, snapshot.config), snapshot.pages)), selectedPaths = new Set(profile.chapters);
  if (profile.delivery && !profile.authors?.length) throw new Error("Complete publication files require at least one named author in the work or edition metadata.");
  const doi = typeof doiInput === "function" ? await doiInput(profile) : doiInput;
  for (const name of selectedPaths) if (!snapshot.files.has(name) || !snapshot.pages.some((page) => page.path === name)) throw new Error(`Selected publication page is unavailable or excluded: ${name}`);
  const matters = /* @__PURE__ */ new Set();
  const resolveMatter = async (entry, role) => {
    let content2 = entry.content || "";
    if (entry.file) {
      await safePath(root, entry.file);
      if (!/\.md$/i.test(entry.file)) throw new Error("Publication matter files must be Markdown files.");
      if (!snapshot.files.has(entry.file) || !snapshot.pages.some((page) => page.path === entry.file)) throw new Error(`Publication matter file is unavailable or excluded: ${entry.file}`);
      if (matters.has(entry.file)) throw new Error(`A publication file can only fill one matter role: ${entry.file}`);
      matters.add(entry.file);
      selectedPaths.delete(entry.file);
      snapshot.inputs.find((item) => item.path === entry.file).role = role;
      content2 = snapshot.files.get(entry.file).toString("utf8");
    }
    const pageTitle = entry.file ? snapshot.state.pages.find((page) => page.filePath === entry.file)?.title : void 0;
    return { file: entry.file, title: entry.title || (entry.file ? pageTitle || firstHeadingTitle(content2) : void 0), content: content2, includeInToc: entry.includeInToc === true };
  };
  const frontMatter = [], backMatter = [];
  for (const entry of profile.frontMatter) frontMatter.push(await resolveMatter(entry, "front-matter"));
  for (const entry of profile.backMatter) backMatter.push(await resolveMatter(entry, "back-matter"));
  const continuedFile = profile.continued.file && profile.continued.enabled !== false ? await resolveMatter({ file: profile.continued.file }, "continued") : void 0;
  const selected = snapshot.pages.filter((page) => selectedPaths.has(page.path));
  if (!selected.length) throw new Error("Select at least one chapter or page outside the referenced front matter, back matter, and continued notice.");
  const selectedBooks = new Set(selected.map((page) => page.book).filter(Boolean));
  const scope = profile.scope;
  const inWork = (page) => {
    if (scope && (scope.books?.length || scope.volumes?.length || scope.paths?.length)) return !!(scope.books?.includes(page.book) || scope.volumes?.includes(page.volume) || scope.paths?.some((item) => page.path === item || page.path.startsWith(`${item}/`)));
    return selectedBooks.size ? selectedBooks.has(page.book) : true;
  };
  if (selected.some((page) => !inWork(page))) throw new Error("Selected pages must belong to the declared work scope.");
  const omitted = snapshot.pages.filter((page) => inWork(page) && !selectedPaths.has(page.path) && !matters.has(page.path));
  const externalReferences = [];
  const inspectReferences = (state, onlySelected = false) => {
    for (const reference2 of state.references) {
      if (onlySelected && !selectedPaths.has(reference2.file)) continue;
      const label = snapshot.state.labels[reference2.id];
      if (!label) throw new Error(`Unresolved publication reference in ${reference2.file}:${reference2.line}: @${reference2.id}`);
      if (!selectedPaths.has(label.filePath) && !matters.has(label.filePath)) externalReferences.push({ source: reference2.file, line: reference2.line, target: label.filePath, label: reference2.id, kind: "formal" });
    }
    for (const reference2 of state.pageReferences) {
      if (onlySelected && !selectedPaths.has(reference2.file)) continue;
      if (!snapshot.pages.some((page) => page.path === reference2.target)) throw new Error(`Unresolved publication page reference in ${reference2.file}:${reference2.line}: ${reference2.target}`);
      if (!selectedPaths.has(reference2.target) && !matters.has(reference2.target)) externalReferences.push({ source: reference2.file, line: reference2.line, target: reference2.target, label: reference2.rawTarget, kind: "page" });
    }
  };
  inspectReferences(snapshot.state, true);
  const addInput = async (name, role) => {
    if (snapshot.files.has(name)) return;
    const bytes = await fs$2.readFile(await safePath(root, name));
    snapshot.files.set(name, bytes);
    snapshot.inputs.push({ path: name, sha256: sha256(bytes), role });
  };
  const addResources = async (content2, source) => {
    const resources = await collectResources(root, /* @__PURE__ */ new Map([[source, content2]]), { read: async (name) => {
      await addInput(name, "asset");
      return snapshot.files.get(name);
    } });
    for (const name of resources.keys()) await addInput(name, "asset");
  };
  for (const page of selected) {
    const content2 = snapshot.files.get(page.path).toString("utf8");
    await addResources(content2, page.path);
    for (const match2 of content2.matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+\.md(?:#[^>]*)?)>|([^\s)]+\.md(?:#[^\s)]*)?))/g)) {
      const target = match2[1] || match2[2];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const name = toPosix(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(page.path), target.split("#")[0])));
      if (!selectedPaths.has(name) && !matters.has(name)) externalReferences.push({ source: page.path, line: content2.slice(0, match2.index).split("\n").length, target: name, kind: "link" });
    }
  }
  for (const [entries, role] of [[frontMatter, "front-matter"], [backMatter, "back-matter"], [continuedFile ? [continuedFile] : [], "continued"]]) for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const content2 = entry.content;
    inspectReferences(scanFormalDocuments([{ filePath: entry.file || `${role}-${index + 1}.md`, content: content2 }], snapshot.config));
    await addResources(content2, entry.file || "inline.md");
    for (const match2 of stripIgnoredMarkdown(content2).matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+\.md(?:#[^>]*)?)>|([^\s)]+\.md(?:#[^\s)]*)?))/g)) {
      const target = match2[1] || match2[2];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const name = toPosix(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(entry.file || "inline.md"), target.split("#")[0])));
      relativeInput(name);
      if (!selectedPaths.has(name) && !matters.has(name)) externalReferences.push({ source: entry.file || `${role}-${index + 1}.md`, line: 0, target: name, kind: "link" });
    }
  }
  if (profile.cover.image) {
    const image2 = profile.cover.image;
    if (!/\.(?:png|jpe?g|pdf)$/i.test(image2)) throw new Error("Publication cover images must be PNG, JPEG or PDF files supported by the PDF engine.");
    await addResources(`![Cover](<${image2.split("/").map((part) => encodeURIComponent(part)).join("/")}>)`, "publication-cover.md");
  }
  const english = (profile.language || snapshot.config.language).startsWith("en");
  const continuedNotice = { enabled: !hasPublicationContinuedManuscript(profile, snapshot.pages) && (profile.continued.enabled ?? (!!continuedFile || omitted.length > 0)), file: continuedFile?.file, title: continuedFile?.title || profile.continued.title || (english ? "To be continued" : "未完待续"), text: continuedFile?.content ?? (profile.continued.text || (english ? "This is a partial edition of a continuing work. Further chapters and revisions will appear in later versions of the same work." : "本版为持续更新作品的部分内容。后续章节与修订将在同一作品的后续版本中继续发布。")) };
  const warnings = externalReferences.length ? [`${externalReferences.length} reference(s) point outside this edition; omitted pages are not added automatically.`] : [];
  const tools = await publicationTools(profile, options);
  const delivery = profile.delivery ? await prepareDelivery(root, profile, snapshot.config, {
    selected,
    matter: [...frontMatter, ...backMatter, ...continuedFile ? [continuedFile] : []],
    assets: snapshot.inputs.filter((item) => item.role === "asset").map((item) => item.path),
    files: snapshot.files,
    labels: snapshot.state.labels
  }) : void 0;
  if (delivery) {
    for (const [name, bytes] of delivery.files) if (!snapshot.files.has(name)) {
      snapshot.files.set(name, bytes);
      snapshot.inputs.push({ path: name, sha256: sha256(bytes), role: "delivery" });
    }
  }
  const content = { schema: "math-workspace.publication-plan/v1", profile, profileOverrides, projectMetadata: projectMetadata(snapshot.config), selected, omitted, externalReferences, partial: omitted.length > 0, frontMatter, backMatter, continuedNotice, doi, inputs: snapshot.inputs.sort((a, b) => a.path.localeCompare(b.path)), tools, warnings, ...delivery ? { delivery: delivery.plan } : {} };
  return { plan: { ...content, fingerprint: sha256(canonical(content)) }, snapshot };
}
function firstHeadingTitle(content) {
  return /^#\s+(.+?)\s*$/m.exec(stripIgnoredMarkdown(content))?.[1].replace(/[ \t]+#+[ \t]*$/, "").replace(/^#h-[a-f0-9]{16}\s+/i, "").replace(/\s+\{[^}]*\}\s*$/, "").trim();
}
function unnumbered(content, listed, clearTitleMarks = false) {
  let fence2 = false, clearedTitleMarks = false;
  return content.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence2 = !fence2;
      return line;
    }
    if (fence2) return line;
    const heading2 = line.replace(/^(#{1,6}\s+)(.+?)\s*$/, (_match, prefix, title) => {
      const attributes = /\s*\{([^}]*)\}\s*$/.exec(title), body = attributes ? title.slice(0, attributes.index) : title;
      const kept = (attributes?.[1] || "").split(/\s+/).filter((item) => item && item !== ".unnumbered" && item !== ".unlisted" && item !== "-");
      return `${prefix}${body} {${[...kept, ".unnumbered", ...!listed ? [".unlisted"] : []].join(" ")}}`;
    });
    if (clearTitleMarks && !clearedTitleMarks && /^#\s+/.test(line)) {
      clearedTitleMarks = true;
      return `${heading2}

\\markboth{}{}
`;
    }
    return heading2;
  }).join("\n");
}
async function runPublicationCli(cliPath, args, options) {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env };
    for (const key of ["ZENODO_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "GITLAB_TOKEN", options.credentialEnv, ...options.credentialEnvs || []].filter(Boolean)) delete environment[key];
    const child = childProcess$2.spawn(process.execPath, [cliPath, ...args], { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"], env: environment });
    let stdout = "", stderr = "", done = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, 10 * 60 * 1e3);
    const collect = (channel, value) => {
      if (channel === "stdout") stdout = (stdout + value.toString()).slice(-1024 * 1024);
      else stderr = (stderr + value.toString()).slice(-1024 * 1024);
    };
    child.stdout.on("data", (value) => collect("stdout", value));
    child.stderr.on("data", (value) => collect("stderr", value));
    child.on("error", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error("Unable to start the bundled PDF export runtime."));
    });
    child.on("close", (code2) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code2 !== 0) reject(new Error(`Publication export failed: ${(stderr || stdout || `process exit ${code2}`).trim().slice(-12e3)}`));
      else resolve({ stdout, stderr });
    });
  });
}
async function renderPublication(store, plan, snapshot, recheck, options, progress = {}) {
  return store.locked(plan.profile.id, async () => {
    if ((await recheck().catch(() => null))?.fingerprint !== plan.fingerprint) throw new Error("Publication sources changed. Review a fresh plan before building.");
    const id = crypto__namespace.randomBytes(16).toString("hex"), profile = plan.profile, createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const temporary2 = await store.directory(`pending/${profile.id}-${id}`);
    await fs$2.mkdir(temporary2, { recursive: true });
    const frozen = path__namespace.join(temporary2, "inputs");
    await fs$2.mkdir(frozen);
    try {
      progress.onProgress?.("Freezing selected sources, formal numbering inputs, and local resources");
      const configName = ".math-workspace/config.json";
      for (const [name, bytes] of snapshot.files) {
        if (name === configName) continue;
        const destination2 = await safePath(frozen, name);
        await fs$2.mkdir(path__namespace.dirname(destination2), { recursive: true });
        await fs$2.writeFile(destination2, bytes, { flag: "wx" });
      }
      const sourceConfig = snapshot.files.has(configName) ? JSON.parse(snapshot.files.get(configName).toString("utf8")) : snapshot.config;
      const exportConfig = { ...sourceConfig, lean: { ...sourceConfig?.lean, projects: [] } };
      await fs$2.mkdir(path__namespace.join(frozen, ".math-workspace"), { recursive: true });
      await fs$2.writeFile(path__namespace.join(frozen, configName), canonical(exportConfig), { flag: "wx" });
      const invoke = options.runCli || ((args2, runtimeOptions) => runPublicationCli(options.cliPath || path__namespace.resolve(__dirname, "math-workspace.js"), args2, { ...runtimeOptions, credentialEnvs: [profile.zenodo.tokenEnv, profile.delivery?.repository?.tokenEnv].filter(Boolean) }));
      progress.onProgress?.("Compiling selected chapters with their original formal numbering");
      await invoke(["export-md", ...plan.selected.map((page) => page.path), "--out=../compiled.md", "--read-only"], { cwd: frozen, onProgress: progress.onProgress });
      const markdownPath = path__namespace.join(temporary2, "compiled.md");
      let markdown2 = await fs$2.readFile(markdownPath, "utf8");
      const matterContent = async (entry, key, fallbackTitle, clearTitleMarks = false) => {
        const raw = entry.file ? snapshot.files.get(entry.file).toString("utf8") : entry.content || "";
        const inputName = `.math-workspace/publication-${key}-raw.md`, outputName = `.math-workspace/publication-${key}.md`;
        await fs$2.writeFile(await safePath(frozen, inputName), raw, { flag: "wx" });
        await invoke(["_publication-fragment", inputName, entry.file || "inline.md", outputName], { cwd: frozen, onProgress: progress.onProgress });
        let compiled = await fs$2.readFile(await safePath(frozen, outputName), "utf8");
        if (entry.file) {
          let found = false, fence2 = false;
          const pageId = snapshot.state.pages.find((page) => page.filePath === entry.file)?.id;
          compiled = compiled.split(/\r?\n/).map((line) => {
            if (/^\s*(```|~~~)/.test(line)) {
              fence2 = !fence2;
              return line;
            }
            if (fence2 || found || !/^#\s+/.test(line)) return line;
            found = true;
            const attributes = /\s*\{([^}]*)\}\s*$/.exec(line);
            const heading2 = (attributes ? line.slice(0, attributes.index) : line).replace(/^#\s+/, "");
            let kept = attributes?.[1] || "";
            if (pageId && !/(?:^|\s)#[^\s]+/.test(kept)) kept = `${kept} #${pageId}`.trim();
            return `# ${entry.title || heading2}${kept ? ` {${kept}}` : ""}`;
          }).join("\n");
          if (!found && (entry.title || fallbackTitle)) compiled = `# ${entry.title || fallbackTitle}

${compiled}`;
        }
        return unnumbered(compiled, entry.includeInToc, clearTitleMarks);
      };
      for (let index = 0; index < profile.backMatter.length; index++) {
        const entry = profile.backMatter[index];
        const title = !entry.file && entry.title ? `# ${entry.title} {.unnumbered${entry.includeInToc ? "" : " .unlisted"}}

\\markboth{}{}

` : "";
        markdown2 += `

\\clearpage
\\markboth{}{}

${title}${await matterContent(entry, `back-${index}`, void 0, !title)}
`;
      }
      if (plan.continuedNotice.enabled) {
        const notice = plan.continuedNotice;
        const content = notice.file ? await matterContent({ file: notice.file, includeInToc: false }, "continued", notice.title) : `# ${notice.title} {.unnumbered .unlisted}

${notice.text}`;
        markdown2 += `

\\clearpage
\\markboth{}{}

${content}
`;
      }
      markdown2 = normalizeDisplayMath(markdown2, "compiled.md");
      const resourceFiles = new Map(plan.inputs.filter((input) => input.role === "asset").map((input) => [input.path, snapshot.files.get(input.path)]));
      resourceFiles.set("compiled.md", Buffer.from(markdown2));
      validatePublicationMedia(resourceFiles, ["compiled.md"], { normalizedMath: true });
      await fs$2.writeFile(markdownPath, markdown2, "utf8");
      const language = profile.language || (snapshot.config.language === "en" ? "en-US" : "zh-CN");
      const defaultChineseClass = !profile.pdf.documentClass && language.toLowerCase().startsWith("zh");
      const documentClass = profile.pdf.documentClass || (defaultChineseClass ? "ctexart" : void 0);
      const args = ["render-pdf", "../compiled.md", "--out=../publication.pdf", "--no-project-pdf-defaults", "--title-page", "--cover-style=simple", "--metadata-page", "--toc-page-break", `--title=${profile.title}`, `--release-version=${profile.version}`, `--author=${profile.authors.map((author) => author.name).join("; ")}`, `--pdf-engine=${profile.pdf.engine}`, `--paper=${profile.pdf.paper}`, `--margin=${profile.pdf.margin}`, `--lang=${language}`, `--toc-depth=${profile.toc.depth}`, `--toc-title=${profile.toc.title || (snapshot.config.language === "en" ? "Contents" : "目录")}`];
      args.push(`--authors-json=${JSON.stringify(profile.authors)}`);
      args.push(profile.toc.enabled ? "--toc" : "--no-toc", profile.cover.showVersion ? "--show-version-on-cover" : "--no-show-version-on-cover");
      if (profile.subtitle || profile.edition) args.push(`--subtitle=${[profile.subtitle, profile.edition].filter(Boolean).join(" · ")}`);
      if (profile.cover.image) args.push(`--cover-image=${profile.cover.image}`);
      if (documentClass) args.push(`--documentclass=${documentClass}`);
      if (defaultChineseClass) {
        const family = plan.tools.chineseFonts?.family;
        if (family) args.push("--variable=classoption:fontset=none", `--variable=CJKmainfont:${family}`, `--variable=CJKsansfont:${family}`, `--variable=CJKmonofont:${family}`);
        else args.push("--variable=classoption:fontset=fandol");
      }
      if (profile.license) args.push(`--license=${profile.license}`);
      if (profile.repository) args.push(`--repository=${profile.repository}`);
      if (profile.website) args.push(`--website=${profile.website}`);
      if (profile.licenseUrl) args.push(`--license-url=${profile.licenseUrl}`);
      if (profile.preferredCitation) args.push(`--preferred-citation=${profile.preferredCitation}`);
      if (profile.releaseTag) args.push(`--release-tag=${profile.releaseTag}`);
      if (profile.releaseCommit) args.push(`--release-commit=${profile.releaseCommit}`);
      if (profile.description) args.push(`--description=${profile.description}`);
      for (const keyword of profile.keywords || []) args.push(`--keyword=${keyword}`);
      const publicationDate = profile.publicationDate || createdAt.slice(0, 10);
      args.push(`--date=${publicationDate}`);
      if (plan.doi.versionDoi) args.push(`--doi=${plan.doi.versionDoi}`);
      if (plan.doi.conceptDoi) args.push(`--work-doi=${plan.doi.conceptDoi}`);
      if (plan.doi.versionDoi || plan.doi.conceptDoi) {
        const chinese = (profile.language || snapshot.config.language).toLowerCase().startsWith("zh");
        const note = plan.doi.source === "manual" ? chinese ? "DOI 由作者提供；注册信息以 DOI 服务平台记录为准。" : "DOI supplied by the author; registration details follow the DOI provider record." : plan.doi.source === "zenodo" ? chinese ? "DOI 由 Zenodo 分配；注册信息以 DOI 服务平台记录为准。" : "DOI assigned through Zenodo; registration details follow the DOI provider record." : chinese ? "DOI 信息以 DOI 服务平台记录为准。" : "DOI information follows the DOI provider record.";
        args.push(`--doi-state=${[note, profile.doi?.provenance].filter(Boolean).join(" ")}`);
      }
      for (let index = 0; index < profile.frontMatter.length; index++) {
        const entry = profile.frontMatter[index], name = `.math-workspace/publication-front-${index}.md`;
        const normalized = normalizeDisplayMath(await matterContent(entry, `front-${index}`), name);
        const frontFiles = new Map(resourceFiles);
        frontFiles.set("front.md", Buffer.from(normalized));
        validatePublicationMedia(frontFiles, ["front.md"], { normalizedMath: true });
        await fs$2.writeFile(await safePath(frozen, name), normalized, "utf8");
        args.push(`--front-matter=${name}`);
        if (!entry.file && entry.title) args.push(`--front-matter-title=${entry.title}`);
        if (entry.includeInToc) args.push("--front-matter-toc");
      }
      progress.onProgress?.("Rendering cover, publication pages, contents, chapters, and conclusion");
      await invoke(args, { cwd: frozen, onProgress: progress.onProgress });
      if (await fs$2.readFile(markdownPath, "utf8") !== markdown2) throw new Error("The compiled publication Markdown changed during rendering. This build was not saved.");
      const pdf = await fs$2.readFile(path__namespace.join(temporary2, "publication.pdf"));
      if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The PDF renderer did not produce a valid PDF file.");
      if ((await recheck().catch(() => null))?.fingerprint !== plan.fingerprint) throw new Error("Publication sources changed during PDF rendering. This build was not saved.");
      const pdfSha256 = sha256(pdf), markdownBytes = Buffer.from(markdown2);
      const citation = {
        type: "book",
        title: profile.title,
        subtitle: profile.subtitle,
        author: profile.authors.map((author) => ({ literal: author.name, ORCID: author.orcid, affiliation: author.affiliation, nativeName: author.nativeName, aliases: author.aliases })),
        language: profile.language,
        abstract: profile.description,
        URL: profile.website || profile.repository,
        website: profile.website,
        repository: profile.repository,
        license: profile.license,
        licenseUrl: profile.licenseUrl,
        keyword: profile.keywords?.join(", "),
        note: profile.preferredCitation,
        .../^\d{4}-\d{2}-\d{2}$/.test(publicationDate) ? { issued: { "date-parts": [publicationDate.split("-").map(Number)] } } : {},
        version: profile.version,
        edition: profile.edition,
        sourceTag: profile.releaseTag,
        sourceCommit: profile.releaseCommit,
        DOI: plan.doi.versionDoi,
        conceptDOI: plan.doi.conceptDoi,
        doiProvenance: plan.doi,
        workId: profile.workId,
        partial: plan.partial,
        selectedPages: plan.selected.map((page) => page.path)
      };
      await fs$2.writeFile(path__namespace.join(temporary2, "citation.json"), canonical(citation), { flag: "wx" });
      const citationBytes = await fs$2.readFile(path__namespace.join(temporary2, "citation.json"));
      const extra = await writeDelivery(temporary2, frozen, plan, args, createdAt, id);
      const extraHashes = {};
      for (const name of extra) {
        const bytes = await fs$2.readFile(path__namespace.join(temporary2, name));
        extraHashes[name] = { sha256: sha256(bytes), bytes: bytes.length };
      }
      const publicArtifacts = plan.delivery ? [...PUBLIC_ARTIFACTS, ...extra.includes("lean.zip") ? ["lean.zip"] : []] : void 0;
      if (plan.delivery) {
        const release = {
          schema: "math-workspace.publication-release/v1",
          buildId: id,
          workId: profile.workId,
          version: profile.version,
          title: profile.title,
          createdAt,
          doi: plan.doi,
          source: plan.delivery.source,
          selected: plan.selected,
          partial: plan.partial,
          metadata: {
            title: profile.title,
            subtitle: profile.subtitle,
            authors: profile.authors,
            language: profile.language,
            license: profile.license,
            licenseUrl: profile.licenseUrl,
            description: profile.description,
            keywords: profile.keywords,
            website: profile.website,
            repository: profile.repository,
            publicationDate,
            edition: profile.edition
          },
          sources: plan.delivery.files,
          tools: { ...plan.tools, mathWorkspace: version },
          artifacts: { "publication.pdf": { sha256: pdfSha256, bytes: pdf.length }, "compiled.md": { sha256: sha256(markdownBytes), bytes: markdownBytes.length }, "citation.json": { sha256: sha256(citationBytes), bytes: citationBytes.length }, ...extraHashes }
        };
        const bytes = Buffer.from(canonical(release));
        await fs$2.writeFile(path__namespace.join(temporary2, "release.json"), bytes, { flag: "wx" });
        extraHashes["release.json"] = { sha256: sha256(bytes), bytes: bytes.length };
      }
      const manifest = { schema: "math-workspace.publication-manifest/v1", buildId: id, createdAt, plan, artifacts: { "publication.pdf": { sha256: pdfSha256, bytes: pdf.length }, "compiled.md": { sha256: sha256(markdownBytes), bytes: markdownBytes.length }, "citation.json": { sha256: sha256(citationBytes), bytes: citationBytes.length } }, layout: ["cover", "publication metadata", "front matter", ...profile.toc.enabled ? ["generated table of contents"] : [], "selected chapters in original order and numbering", "back matter", ...plan.continuedNotice.enabled ? ["to be continued"] : []], mathematicalCorrectnessAssessed: false, sourceArchiveSignatureAsserted: false };
      Object.assign(manifest.artifacts, extraHashes);
      const manifestBytes = canonical(manifest);
      await fs$2.writeFile(path__namespace.join(temporary2, "manifest.json"), manifestBytes, { flag: "wx" });
      const build = { schema: "math-workspace.publication-build/v1", id, profileId: profile.id, workId: profile.workId, version: profile.version, fingerprint: plan.fingerprint, createdAt, pdfSha256, markdownSha256: sha256(markdownBytes), manifestSha256: sha256(manifestBytes), files: { pdf: "publication.pdf", markdown: "compiled.md", manifest: "manifest.json", citation: "citation.json" } };
      const checksums = `${Object.entries(publicArtifacts ? manifest.artifacts : { ...manifest.artifacts, "manifest.json": { sha256: build.manifestSha256 } }).map(([name, value]) => `${value.sha256}  ${name}`).join("\n")}
`;
      await fs$2.writeFile(path__namespace.join(temporary2, "checksums.sha256"), checksums, { flag: "wx" });
      if (publicArtifacts) {
        build.publicArtifacts = publicArtifacts;
        build.checksumsSha256 = sha256(checksums);
      }
      await fs$2.writeFile(path__namespace.join(temporary2, "build.json"), canonical(build), { flag: "wx" });
      const destination = await store.directory(`builds/${profile.id}/${id}`);
      await fs$2.mkdir(path__namespace.dirname(destination), { recursive: true });
      await fs$2.rename(temporary2, destination);
      progress.onProgress?.("Immutable PDF edition saved");
      return build;
    } finally {
      await fs$2.rm(temporary2, { recursive: true, force: true });
    }
  });
}
async function publicArtifactBytes(store, build) {
  const names = build.publicArtifacts || ["publication.pdf"];
  if (new Set(names).size !== names.length || names.includes("manifest.json") || !names.includes("publication.pdf")) throw new Error("Invalid public artifact set.");
  const files = [];
  for (const artifact of names) {
    const bytes = await store.artifact(build.profileId, build.id, artifact);
    files.push({ artifact, bytes, sha256: sha256(bytes) });
  }
  return files;
}
const numericId = (value) => {
  const id = String(value ?? "");
  if (!/^[1-9][0-9]{0,24}$/.test(id)) throw new Error("Invalid Zenodo record or draft identity.");
  return id;
};
const submitted = (record) => record?.submitted === true || record?.state === "done";
const md5 = (bytes) => crypto__namespace.createHash("md5").update(bytes).digest("hex");
const checksumIdentity = (value) => {
  const text2 = String(value || "").toLowerCase();
  if (/^(?:md5:)?[a-f0-9]{32}$/.test(text2)) return `md5:${text2.replace(/^md5:/, "")}`;
  if (/^(?:sha256:)?[a-f0-9]{64}$/.test(text2)) return `sha256:${text2.replace(/^sha256:/, "")}`;
  return void 0;
};
const sameChecksum = (left, right) => !!checksumIdentity(left) && checksumIdentity(left) === checksumIdentity(right);
const checksumMatches = (value, bytes) => {
  const text2 = String(value || "").toLowerCase();
  return text2 === `md5:${md5(bytes)}` || text2 === md5(bytes) || text2 === `sha256:${sha256(bytes)}` || text2 === sha256(bytes);
};
function zenodoFileName(profile) {
  return `${profile.id}-${profile.version.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
}
function zenodoArtifactName(profile, artifact) {
  return profile.delivery ? artifact : zenodoFileName(profile);
}
function zenodoLanguage(value) {
  if (!value) return void 0;
  const language = value.toLowerCase();
  if (/^[a-z]{3}$/.test(language)) return language;
  const known = { zh: "zho", en: "eng", de: "deu", fr: "fra", es: "spa", ja: "jpn", ko: "kor", ru: "rus", it: "ita", pt: "por", ar: "ara" };
  const result = known[language.split("-")[0]];
  if (!result) throw new Error("Zenodo language must be a supported language tag or an ISO 639-2/639-3 three-letter code.");
  return result;
}
function zenodoPublicationMetadata(profile, build) {
  if (!profile.authors?.length) throw new Error("Zenodo publication requires at least one named author.");
  if (!profile.description) throw new Error("Zenodo publication requires a description in the saved profile.");
  const date = profile.publicationDate || build?.createdAt.slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Zenodo publication date must use YYYY-MM-DD.");
  const language = zenodoLanguage(profile.language);
  const related = [profile.website ? { identifier: profile.website, relation: "isDescribedBy", scheme: "url" } : void 0, profile.repository ? { identifier: profile.repository, relation: "isDerivedFrom", scheme: "url" } : void 0].filter(Boolean);
  const notes = [
    profile.subtitle ? `Subtitle: ${profile.subtitle}` : "",
    profile.edition ? `Edition: ${profile.edition}` : "",
    profile.licenseUrl ? `License URL: ${profile.licenseUrl}` : "",
    profile.preferredCitation ? `Preferred citation: ${profile.preferredCitation}` : "",
    profile.releaseTag ? `Source tag: ${profile.releaseTag}` : "",
    profile.releaseCommit ? `Source commit: ${profile.releaseCommit}` : "",
    profile.doi?.provenance ? `DOI source note: ${profile.doi.provenance}` : "",
    ...profile.authors.flatMap((author) => [author.nativeName ? `${author.name} — native name: ${author.nativeName}` : "", author.aliases?.length ? `${author.name} — aliases: ${author.aliases.join("; ")}` : ""])
  ].filter(Boolean);
  const escape2 = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return { upload_type: "publication", publication_type: "book", title: profile.title, creators: profile.authors.map((author) => ({ name: author.name, ...author.orcid ? { orcid: author.orcid.replace(/^https?:\/\/orcid.org\//i, "") } : {}, ...author.affiliation ? { affiliation: author.affiliation } : {} })), description: profile.description, version: profile.version, publication_date: date, access_right: "open", license: profile.license || "cc-by-4.0", ...language ? { language } : {}, keywords: profile.keywords || [], related_identifiers: related, notes: notes.map((note) => `<p>${escape2(note)}</p>`).join(""), ...profile.doi?.versionDoi ? { doi: profile.doi.versionDoi } : {} };
}
function zenodoMetadataMatches(record, expected) {
  const metadata = record?.metadata || {}, native = !!metadata.resource_type || metadata.creators?.some((author) => author.person_or_org);
  const actual = {
    ...metadata,
    license: typeof metadata.license === "string" ? metadata.license : metadata.license?.id || metadata.rights?.[0]?.id,
    creators: (metadata.creators || []).map((author) => native ? { name: author.person_or_org?.name, orcid: author.person_or_org?.identifiers?.find((item) => item.scheme === "orcid")?.identifier, affiliation: author.affiliations?.map((item) => item.name).join("; ") || void 0 } : author),
    keywords: metadata.keywords || metadata.subjects?.map((item) => item.subject) || [],
    related_identifiers: (metadata.related_identifiers || []).map((item) => ({ identifier: item.identifier, scheme: item.scheme, relation: (item.relation || item.relation_type?.id || "").toLowerCase() })),
    notes: metadata.notes || metadata.additional_descriptions?.filter((item) => item.type?.id === "notes").map((item) => item.description).join("") || "",
    ...native ? {
      upload_type: "publication",
      publication_type: metadata.resource_type?.id === "publication-book" ? "book" : void 0,
      access_right: record.access?.record === "public" || record.access?.status === "open" ? "open" : void 0,
      language: metadata.languages?.[0]?.id,
      license: metadata.rights?.[0]?.id
    } : {}
  };
  const value = (input) => Array.isArray(input) ? input.map(value) : input && typeof input === "object" ? Object.fromEntries(Object.entries(input).filter(([, item]) => item !== null && item !== void 0).map(([key, item]) => [key, value(item)])) : input;
  const ordered = (key, input) => key === "keywords" || key === "related_identifiers" ? (input || []).map((item) => key === "related_identifiers" ? { identifier: item.identifier, scheme: item.scheme, relation: (item.relation || item.relation_type?.id || "").toLowerCase() } : item).sort((a, b) => canonical(a).localeCompare(canonical(b))) : input;
  return Object.entries(expected).every(([key, item]) => canonical(value(ordered(key, actual[key]))) === canonical(value(ordered(key, item))));
}
class ZenodoHttpError extends Error {
  constructor(status) {
    super(`Zenodo request failed (HTTP ${status}); no response body or credential is retained.`);
    this.status = status;
  }
}
class ZenodoPublication {
  constructor(store, options, plan) {
    this.store = store;
    this.options = options;
    this.plan = plan;
  }
  credential(profile) {
    const tokenEnv = profile.zenodo?.tokenEnv || "ZENODO_TOKEN";
    return { tokenEnv, configured: !!(this.options.environment || process.env)[tokenEnv] };
  }
  client(profile) {
    const environment = profile.zenodo?.environment || "sandbox", origin = environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const token = (this.options.environment || process.env)[profile.zenodo?.tokenEnv || "ZENODO_TOKEN"];
    if (!token) throw new Error(`Zenodo credential is unavailable in the server process environment (${profile.zenodo?.tokenEnv || "ZENODO_TOKEN"}).`);
    const secureUrl = (input) => {
      const URLConstructor2 = require("node:url").URL, url2 = new URLConstructor2(input, origin);
      if (url2.origin !== origin || url2.protocol !== "https:" || url2.username || url2.password || url2.search || url2.hash || !url2.pathname.startsWith("/api/")) throw new Error("Zenodo returned an untrusted API URL.");
      return url2.toString();
    };
    const request = async (input, method = "GET", body, binary = false, native = false) => {
      const url2 = secureUrl(input), fetcher = this.options.fetch || globalThis.fetch;
      if (!fetcher) throw new Error("This Node.js runtime does not provide fetch for Zenodo.");
      let response;
      try {
        response = await fetcher(url2, { method, redirect: "error", headers: { Authorization: `Bearer ${token}`, ...native ? { Accept: "application/vnd.inveniordm.v1+json" } : {}, ...body !== void 0 ? { "Content-Type": binary ? "application/octet-stream" : "application/json" } : {} }, ...body !== void 0 ? { body: binary ? body : JSON.stringify(body) } : {} });
      } catch {
        throw new Error("Zenodo request result is unknown. Reconcile the existing draft or record before retrying a creation or publication.");
      }
      if (!response.ok) throw new ZenodoHttpError(response.status);
      if (response.status === 204) return null;
      try {
        return await response.json();
      } catch {
        throw new Error("Zenodo returned an invalid JSON acknowledgement. Reconcile its existing draft before retrying.");
      }
    };
    return { environment, origin, secureUrl, request };
  }
  async nativeDraft(client2, id) {
    const draft = await client2.request(`/api/records/${numericId(id)}/draft`, "GET", void 0, false, true);
    if (String(draft?.id) !== id || draft.is_published === true || draft.is_draft !== true) throw new Error("Zenodo did not return the expected editable native draft.");
    return draft;
  }
  authoritativeDraft(record, native) {
    const doi = normalizeDoi(native.pids?.doi?.identifier);
    const nativeConcept = normalizeDoi(native.parent?.pids?.doi?.identifier);
    const legacyConcept = normalizeDoi(record.conceptdoi || record.concept_doi || record.parent?.pids?.doi?.identifier);
    if (nativeConcept && legacyConcept && nativeConcept !== legacyConcept) throw new Error("Zenodo returned conflicting native and compatibility concept DOIs. Reconcile the work binding.");
    const nativeParent = native.parent?.id, legacyParent = record.conceptrecid || record.parent?.id;
    if (nativeParent && legacyParent && numericId(nativeParent) !== numericId(legacyParent)) throw new Error("Zenodo returned conflicting parent work record identities.");
    return { ...record, doi, conceptdoi: nativeConcept || legacyConcept, conceptrecid: nativeParent || legacyParent, metadata: { ...record.metadata, doi, prereserve_doi: doi ? { doi, recid: String(record.id) } : void 0 } };
  }
  nextState(profile, record, previous) {
    const id = numericId(record.id), published = submitted(record), doi = normalizeDoi(record.doi || record.metadata?.doi || (published ? record.metadata?.prereserve_doi?.doi : previous?.versionDoi)), conceptDoi = normalizeDoi(record.conceptdoi || record.concept_doi || record.parent?.pids?.doi?.identifier || previous?.conceptDoi);
    const parentId = record.conceptrecid || record.parent?.id;
    const conceptRecordId = parentId ? numericId(parentId) : previous?.conceptRecordId;
    if (previous?.conceptRecordId && conceptRecordId && previous.conceptRecordId !== conceptRecordId) throw new Error("Zenodo returned a different work record identity. The existing binding is retained.");
    if (previous?.conceptDoi && conceptDoi && previous.conceptDoi !== conceptDoi) throw new Error("Zenodo returned a different work DOI. The existing work binding is retained.");
    if (profile.doi?.versionDoi && doi && profile.doi.versionDoi !== doi) throw new Error("The manually entered version DOI differs from this Zenodo draft. Reconcile the DOI before proceeding.");
    if (profile.doi?.conceptDoi && conceptDoi && profile.doi.conceptDoi !== conceptDoi) throw new Error("The manually entered work DOI differs from the bound Zenodo work.");
    const origin = profile.zenodo?.environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const ownedFiles = (previous?.ownedFiles || []).filter((file) => file.draftId === id);
    const owned = [previous?.upload, ...previous?.upload?.files || [], ...previous?.history || [], ...(previous?.history || []).flatMap((item) => item.files || []), ...ownedFiles].filter(Boolean);
    const draftFiles = (record.files || []).map((file) => ({ name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && sameChecksum(item.remoteChecksum, file.checksum)) }));
    const expected = previous?.upload?.files || (previous?.upload ? [previous.upload] : []);
    const uploadMatches = previous?.upload && (previous.draftId === id || previous.recordId === id) && draftFiles.length === expected.length && expected.every((item) => draftFiles.some((file) => file.name === item.fileName && sameChecksum(file.checksum, item.remoteChecksum)));
    return { schema: "math-workspace.publication-zenodo/v1", environment: profile.zenodo?.environment || "sandbox", status: published ? "published" : "draft", ...published ? { recordId: id } : { draftId: id }, conceptRecordId, versionDoi: doi, conceptDoi, recordUrl: `${origin}/${published ? "records" : "deposit"}/${id}`, history: previous?.history || [], draftFiles, ownedFiles, ...uploadMatches ? { upload: previous.upload } : {} };
  }
  metadata(profile, build) {
    return zenodoPublicationMetadata(profile, build);
  }
  metadataMatches(record, expected) {
    return zenodoMetadataMatches(record, expected);
  }
  nativeMetadata(native, expected) {
    const creators = expected.creators.map((author) => {
      const [family, ...given] = author.name.split(",");
      return { person_or_org: { type: "personal", name: author.name, family_name: family.trim(), ...given.length ? { given_name: given.join(",").trim() } : {}, ...author.orcid ? { identifiers: [{ scheme: "orcid", identifier: author.orcid }] } : {} }, ...author.affiliation ? { affiliations: [{ name: author.affiliation }] } : {} };
    });
    return {
      metadata: {
        ...native.metadata,
        resource_type: { id: "publication-book" },
        title: expected.title,
        creators,
        description: expected.description,
        version: expected.version,
        publication_date: expected.publication_date,
        publisher: native.metadata?.publisher || "Zenodo",
        rights: [{ id: expected.license }],
        subjects: (expected.keywords || []).map((subject) => ({ subject })),
        related_identifiers: (expected.related_identifiers || []).map((item) => ({ identifier: item.identifier, scheme: item.scheme, relation_type: { id: item.relation.toLowerCase() } })),
        languages: expected.language ? [{ id: expected.language }] : [],
        additional_descriptions: [...(native.metadata?.additional_descriptions || []).filter((item) => item.type?.id !== "notes"), ...expected.notes ? [{ description: expected.notes, type: { id: "notes" } }] : []]
      },
      pids: native.pids,
      access: { record: "public", files: "public" },
      ...native.custom_fields ? { custom_fields: native.custom_fields } : {}
    };
  }
  checkBinding(profile, remote) {
    if (remote && remote.environment !== (profile.zenodo?.environment || "sandbox")) throw new Error("This publication is already bound to a different Zenodo environment.");
  }
  bucket(client2, record) {
    if (!record.links?.bucket) throw new Error("Zenodo did not provide an editable draft upload bucket.");
    const bucket = client2.secureUrl(record.links.bucket).replace(/\/$/, "");
    if (!/^\/api\/files\/[a-zA-Z0-9-]+$/.test(new (require("node:url")).URL(bucket).pathname)) throw new Error("Zenodo returned an untrusted upload bucket.");
    return bucket;
  }
  async checkOtherWorkBinding(profile) {
    for (const saved of await this.store.profiles()) if (saved.profile.id !== profile.id && saved.profile.workId === profile.workId && (saved.profile.zenodo?.environment || "sandbox") === profile.zenodo.environment && await this.store.remote(saved.profile.id)) throw new Error(`This work already has a Zenodo binding in publication profile ${saved.profile.id}. Continue its existing profile instead of creating a disconnected record.`);
  }
  async reserve(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = resolvePublicationMetadata(normalizeProfile(raw), (await readPublicationMetadata(this.store.root)).config), client2 = this.client(profile);
      let remote = await this.store.remote(profileId);
      this.checkBinding(profile, remote);
      if (remote?.pending) throw new Error("A previous Zenodo operation has an unresolved result. Attach its existing draft or record to reconcile it before continuing.");
      if (options.mode === "new-version") {
        if (remote?.status !== "published" || remote.recordId !== numericId(options.expectedRecordId)) throw new Error("Creating a new version requires the reviewed latest published record identity.");
        if (profile.doi?.versionDoi) throw new Error("Remove the manually entered version DOI before reserving a new Zenodo version DOI. The stable work DOI can be retained.");
        const record = await client2.request(`/api/deposit/depositions/${remote.recordId}`);
        if (!submitted(record)) throw new Error("The bound Zenodo record is not published. Reconcile its status first.");
        const prior = remote;
        remote = await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.recordId } });
        const result = await client2.request(`/api/deposit/depositions/${prior.recordId}/actions/newversion`, "POST");
        const latest = result?.links?.latest_draft;
        if (!latest) throw new Error("Zenodo did not acknowledge a latest draft. Attach the existing new-version draft explicitly.");
        const verified = client2.secureUrl(latest), idMatch = /\/api\/deposit\/depositions\/([1-9][0-9]*)\/?$/.exec(verified);
        if (!idMatch) throw new Error("Zenodo returned an invalid latest draft identity.");
        remote = await this.store.writeRemote(profileId, { ...prior, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: idMatch[1] }, recordId: void 0, draftId: idMatch[1], versionDoi: void 0, upload: void 0, history: [...prior.history || [], { recordId: prior.recordId, versionDoi: prior.versionDoi, buildId: prior.upload?.buildId, pdfSha256: prior.upload?.pdfSha256, fileName: prior.upload?.fileName, remoteChecksum: prior.upload?.remoteChecksum, ...prior.upload?.files ? { files: prior.upload.files } : {} }] });
        const draft2 = await client2.request(verified);
        if (submitted(draft2)) throw new Error("Zenodo returned a published record instead of an editable new-version draft.");
        remote = await this.store.writeRemote(profileId, this.nextState(profile, draft2, remote));
      } else if (options.mode !== "reuse-or-create") throw new Error("Choose draft reuse or an explicit new version.");
      else if (remote?.status === "published") throw new Error("This edition is published and immutable. Use the explicit new-version action to continue the same work.");
      if (!remote) {
        if (profile.doi?.versionDoi || profile.doi?.conceptDoi) throw new Error("A manual version or work DOI is already present. Attach its existing Zenodo record before continuing the same work, or remove the manual DOI before creating a new Zenodo work.");
        this.metadata(profile);
        const marker2 = await this.store.locked("zenodo-work-bindings", async () => {
          await this.checkOtherWorkBinding(profile);
          return this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client2.environment, status: "unknown", pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString() } });
        }, "provider");
        let created;
        try {
          created = await client2.request("/api/deposit/depositions", "POST", {});
        } catch (error2) {
          if (error2 instanceof ZenodoHttpError && [401, 403].includes(error2.status)) {
            const current = await this.store.remote(profileId);
            if (current?.revision === marker2.revision && current.pending?.action === "create" && !current.draftId && !current.recordId && !current.conceptRecordId && !current.versionDoi && !current.conceptDoi && !current.pending.recordId && !current.pending.buildId) {
              await require("node:fs/promises").unlink(await this.store.directory(`remote/${profileId}.json`));
            }
          }
          throw error2;
        }
        if (submitted(created)) throw new Error("Zenodo returned an unexpected published record.");
        await this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client2.environment, status: "unknown", draftId: numericId(created.id), pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: numericId(created.id) } });
        remote = await this.store.writeRemote(profileId, this.nextState(profile, created));
      }
      if (!remote.draftId || remote.status !== "draft") throw new Error("Attach a known editable Zenodo draft before reserving a DOI.");
      const draft = await client2.request(`/api/deposit/depositions/${numericId(remote.draftId)}`);
      if (submitted(draft)) throw new Error("Published Zenodo files and metadata cannot be overwritten. Reconcile the record and create a new version.");
      let native = await this.nativeDraft(client2, remote.draftId);
      if (!native.pids?.doi?.identifier) {
        if (profile.doi?.versionDoi) throw new Error("The existing Zenodo draft has no native DOI binding matching the manually supplied DOI. Reconcile it in Zenodo before continuing.");
        await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "reserve-doi", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId } });
        await client2.request(`/api/records/${remote.draftId}/draft/pids/doi`, "POST", void 0, false, true);
        native = await this.nativeDraft(client2, remote.draftId);
      }
      remote = await this.store.writeRemote(profileId, this.nextState(profile, this.authoritativeDraft(draft, native), remote));
      if (!remote.versionDoi) throw new Error("Zenodo has not acknowledged a reserved version DOI. The draft is retained for reconciliation.");
      return remote;
    });
  }
  async attach(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = resolvePublicationMetadata(normalizeProfile(raw), (await readPublicationMetadata(this.store.root)).config), client2 = this.client(profile), previous = await this.store.remote(profileId);
      this.checkBinding(profile, previous);
      if (!["draft", "record"].includes(options.kind)) throw new Error("Choose draft or published record.");
      let record = await client2.request(`/api/deposit/depositions/${numericId(options.id)}`);
      if (submitted(record) !== (options.kind === "record")) throw new Error("The selected Zenodo identity has a different publication status.");
      if (!submitted(record)) record = this.authoritativeDraft(record, await this.nativeDraft(client2, String(record.id)));
      const sameKnownRecord = previous && [previous.draftId, previous.recordId, ...(previous.history || []).map((item) => item.recordId)].includes(String(record.id));
      if (previous && !sameKnownRecord && (previous.conceptRecordId || previous.conceptDoi) && !record.conceptrecid && !record.conceptdoi && !record.concept_doi) throw new Error("Zenodo did not provide the work identity needed to reconcile this different record.");
      let recovered = previous;
      if (!submitted(record) && previous?.pending?.action === "upload" && previous.pending.buildId && (previous.draftId || previous.pending.recordId) === String(record.id)) {
        const build = await this.store.build(profileId, previous.pending.buildId);
        await this.store.artifact(profileId, build.id, "publication.pdf");
        const manifest = JSON.parse((await this.store.artifact(profileId, build.id, "manifest.json")).toString("utf8"));
        const builtProfile = normalizeProfile(manifest.plan.profile);
        if (build.workId !== profile.workId || builtProfile.id !== profile.id || builtProfile.workId !== profile.workId) throw new Error("The interrupted upload build belongs to a different work.");
        const ownedFiles = [...previous.ownedFiles || []];
        for (const expected of await publicArtifactBytes(this.store, build)) {
          const name = zenodoArtifactName(builtProfile, expected.artifact), file = (record.files || []).find((file2) => (file2.filename || file2.key) === name && checksumMatches(file2.checksum, expected.bytes) && (!(file2.filesize || file2.size) || Number(file2.filesize || file2.size) === expected.bytes.length));
          if (file) {
            const old = ownedFiles.findIndex((item) => item.draftId === String(record.id) && item.fileName === name);
            if (old >= 0) ownedFiles.splice(old, 1);
            ownedFiles.push({ draftId: String(record.id), buildId: build.id, pdfSha256: build.pdfSha256, fileName: name, remoteChecksum: String(file.checksum) });
          }
        }
        recovered = { ...previous, ownedFiles };
      }
      const next = this.nextState(profile, record, recovered);
      if (previous && previous.draftId !== next.draftId && previous.recordId !== next.recordId && previous.conceptRecordId && next.conceptRecordId !== previous.conceptRecordId) throw new Error("The selected Zenodo record belongs to a different work.");
      return this.store.locked("zenodo-work-bindings", async () => {
        await this.checkOtherWorkBinding(profile);
        return this.store.writeRemote(profileId, next);
      }, "provider");
    });
  }
  async reviewed(profileId, buildId2, review) {
    const saved = await this.store.profile(profileId);
    if (!saved) throw new Error("Save the publication profile first.");
    const currentPlan = await this.plan(saved.profile).catch(() => null);
    if (!currentPlan) throw new Error("The selected sources, profile, or DOI binding changed. Build and review a fresh edition before uploading or publishing.");
    const profile = currentPlan.profile, build = await this.store.build(profileId, buildId2), remote = await this.store.remote(profileId);
    this.checkBinding(profile, remote);
    if (!remote || remote.revision !== review.remoteRevision) throw new Error("The Zenodo draft state changed. Reload and review it again.");
    if (remote.pending) throw new Error("Reconcile the unresolved Zenodo operation before continuing.");
    if (remote.status !== "draft" || !remote.draftId) throw new Error("Only an editable Zenodo draft can receive this edition; published records are immutable.");
    if (build.pdfSha256 !== review.pdfSha256) throw new Error("The reviewed PDF digest does not match this build.");
    if (build.publicArtifacts && review.manifestSha256 !== build.manifestSha256) throw new Error("Review the complete edition manifest before delivering its files.");
    const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    if (canonical(normalizeProfile(manifest.plan.profile)) !== canonical(profile) || currentPlan.fingerprint !== build.fingerprint) throw new Error("The selected sources, profile, or DOI binding changed. Build and review a fresh edition before uploading or publishing.");
    const client2 = this.client(profile), native = await this.nativeDraft(client2, remote.draftId);
    if (!native.pids?.doi?.identifier || normalizeDoi(native.pids.doi.identifier) !== manifest.plan.doi.versionDoi || manifest.plan.doi.source === "zenodo" && native.pids.doi.provider !== "datacite") throw new Error("The native Zenodo DOI reservation differs from this PDF or lost its registration provider. Reconcile the actual DOI before uploading or publishing.");
    const bytes = await this.store.artifact(profileId, buildId2, "publication.pdf");
    return { profile, profileInput: saved.profile, build, remote, bytes, files: await publicArtifactBytes(this.store, build), client: client2, native, metadata: this.metadata(profile, build) };
  }
  exactFiles(record, profile, expected) {
    return Array.isArray(record?.files) && record.files.length === expected.length && expected.every((item) => record.files.filter((file) => (file.filename || file.key) === zenodoArtifactName(profile, item.artifact) && checksumMatches(file.checksum, item.bytes) && Number(file.filesize ?? file.size) === item.bytes.length).length === 1);
  }
  uploadPlan(profile, build, remote, record, metadata) {
    if (submitted(record)) throw new Error("The Zenodo draft was already published. Its files cannot be overwritten.");
    const names = (build.publicArtifacts || ["publication.pdf"]).map((artifact) => zenodoArtifactName(profile, artifact)), owned = [remote.upload, ...remote.upload?.files || [], ...remote.history || [], ...(remote.history || []).flatMap((item) => item.files || []), ...(remote.ownedFiles || []).filter((file) => file.draftId === remote.draftId)].filter(Boolean);
    const files = (record.files || []).map((file) => ({ id: String(file.id || ""), name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && sameChecksum(item.remoteChecksum, file.checksum)) })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const content = { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, files, metadataSha256: sha256(canonical(metadata)), target: names, manifestSha256: build.manifestSha256, bucket: String(record.links?.bucket || "") };
    return { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, fingerprint: sha256(canonical(content)), files: files.map(({ id, ...file }) => file), add: names.filter((name) => !files.some((file) => file.name === name)), replace: files.filter((file) => names.includes(file.name) && file.owned).map((file) => file.name), remove: files.filter((file) => !names.includes(file.name) && file.owned).map((file) => file.name), blocked: files.filter((file) => !file.owned).map((file) => file.name) };
  }
  async reviewUpload(profileId, buildId2, review) {
    const { profile, build, remote, client: client2, metadata } = await this.reviewed(profileId, buildId2, review);
    const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
    this.bucket(client2, draft);
    return this.uploadPlan(profile, build, remote, draft, metadata);
  }
  async upload(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, profileInput, build, remote, files, client: client2, native, metadata } = await this.reviewed(profileId, buildId2, review), name = zenodoArtifactName(profile, "publication.pdf");
      const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      const bucket = this.bucket(client2, draft);
      const preflight = this.uploadPlan(profile, build, remote, draft, metadata);
      if (!review.uploadFingerprint || review.uploadFingerprint !== preflight.fingerprint) throw new Error("The Zenodo upload file plan changed or was not reviewed. Review its exact file changes before uploading.");
      if (preflight.blocked.length) throw new Error(`The Zenodo draft contains files not owned by this publication workflow (${preflight.blocked.join(", ")}). Review them in Zenodo before uploading this edition.`);
      await this.store.writeRemote(profileId, { ...remote, pending: { action: "upload", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      for (const file of draft.files || []) {
        const id = String(file.id || "");
        if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Zenodo returned an invalid draft file identity.");
        await client2.request(`/api/deposit/depositions/${remote.draftId}/files/${id}`, "DELETE");
      }
      const delivered = [];
      for (const file of files) {
        const fileName = zenodoArtifactName(profile, file.artifact), acknowledgement = await client2.request(`${bucket}/${encodeURIComponent(fileName)}`, "PUT", file.bytes, true);
        if (!checksumMatches(acknowledgement?.checksum, file.bytes)) throw new Error("Zenodo did not acknowledge an exact artifact checksum. Reconcile the draft before publishing.");
        delivered.push({ artifact: file.artifact, fileName, sha256: file.sha256, bytes: file.bytes.length, remoteChecksum: String(acknowledgement.checksum) });
      }
      await client2.request(`/api/records/${remote.draftId}/draft`, "PUT", this.nativeMetadata(native, metadata), false, true);
      const observed = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(observed) || !this.exactFiles(observed, profile, files)) throw new Error("The Zenodo draft file set differs from this exact edition.");
      if ((await this.plan(profileInput)).fingerprint !== build.fingerprint) throw new Error("Publication inputs changed during upload. The draft remains unpublished; build and review a fresh edition.");
      const upload = { buildId: buildId2, pdfSha256: build.pdfSha256, metadataSha256: sha256(canonical(metadata)), fileName: name, remoteChecksum: delivered.find((file) => file.artifact === "publication.pdf").remoteChecksum, uploadedAt: (/* @__PURE__ */ new Date()).toISOString(), ...build.publicArtifacts ? { files: delivered, manifestSha256: build.manifestSha256 } : {} };
      return this.store.writeRemote(profileId, this.nextState(profile, observed, { ...remote, upload }));
    });
  }
  async publish(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, profileInput, build, remote, files, client: client2, metadata } = await this.reviewed(profileId, buildId2, review);
      if (remote.draftId !== numericId(review.recordId) || remote.upload?.buildId !== buildId2 || remote.upload?.pdfSha256 !== build.pdfSha256 || remote.upload?.metadataSha256 !== sha256(canonical(metadata))) throw new Error("Publication requires the reviewed record identity and the exact uploaded edition.");
      const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(draft) || !this.exactFiles(draft, profile, files)) throw new Error("The Zenodo draft changed after upload. Review and upload the exact edition again.");
      if (!this.metadataMatches(draft, metadata)) throw new Error("The Zenodo publication metadata changed after review. Upload the reviewed edition again.");
      if ((await this.plan(profileInput).catch(() => null))?.fingerprint !== build.fingerprint) throw new Error("Publication inputs changed before publication. Build and review a fresh edition; the draft remains unpublished.");
      await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "publish", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      const result = await client2.request(`/api/deposit/depositions/${remote.draftId}/actions/publish`, "POST");
      if (!submitted(result)) throw new Error("Zenodo has not confirmed publication. Attach the existing record to reconcile the result.");
      const returnedDoi = normalizeDoi(result.doi || result.metadata?.doi || result.metadata?.prereserve_doi?.doi);
      const metadataMatches = this.metadataMatches(result, metadata);
      if (String(result.id) !== remote.draftId || !this.exactFiles(result, profile, files) || !metadataMatches || returnedDoi !== remote.versionDoi) throw new Error("Zenodo publication acknowledgement differs from the reviewed edition. The remote result requires reconciliation before claiming publication success.");
      return this.store.writeRemote(profileId, this.nextState(profile, result, remote));
    });
  }
}
const URLConstructor = require("node:url").URL;
class VerificationProblem extends Error {
  constructor(status, message, httpStatus) {
    super(message);
    this.status = status;
    this.httpStatus = httpStatus;
  }
}
const problem = (message) => {
  throw new VerificationProblem("failed", message);
};
const observation = (error2, url2) => error2 instanceof VerificationProblem ? { status: error2.status, detail: error2.message, url: url2, ...error2.httpStatus ? { httpStatus: error2.httpStatus } : {} } : { status: "pending", detail: "The public request could not be completed. Retry verification; publication is not repeated.", url: url2 };
class PublicReader {
  constructor(options, origin) {
    this.options = options;
    this.origin = origin;
  }
  url(value, kind) {
    let url2;
    try {
      url2 = new URLConstructor(value);
    } catch {
      return problem("The public service returned an invalid URL.");
    }
    const resolver = kind === "doi" && ["https://doi.org", "https://handle.test.datacite.org"].includes(url2.origin);
    if (url2.protocol !== "https:" || url2.username || url2.password || url2.hash || url2.origin !== this.origin && !resolver) problem("The public service returned an untrusted URL.");
    if (url2.search && !(kind === "file" && url2.search === "?download=1")) problem("The public service returned an untrusted URL query.");
    if (kind === "record" && !/^\/api\/records\/[1-9][0-9]*$/.test(url2.pathname)) problem("Invalid public record URL.");
    if (kind === "file" && !/^\/(?:api\/files\/[a-zA-Z0-9-]+\/[^/]+|api\/records\/[1-9][0-9]*\/files\/[^/]+\/content|records?\/[1-9][0-9]*\/files\/[^/]+)$/.test(url2.pathname)) problem("Invalid public file URL.");
    return url2;
  }
  async open(value, kind) {
    const url2 = this.url(value, kind).toString(), controller = new globalThis.AbortController();
    const timer = setTimeout(() => controller.abort(), 3e4), close = () => clearTimeout(timer);
    try {
      const response = await (this.options.fetch || globalThis.fetch)(url2, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: { Accept: kind === "record" ? "application/json" : kind === "file" ? "*/*" : "text/html", "User-Agent": "math-workspace publication verification (https://github.com/glenzli/math-workspace)" }
      });
      return { response, url: url2, close };
    } catch {
      close();
      throw new VerificationProblem("pending", "The public request could not be completed. Retry verification; publication is not repeated.");
    }
  }
  async bytes(response, limit, consume) {
    const length = response.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) problem("The public response exceeded the expected size.");
    const reader = response.body?.getReader();
    if (!reader) problem("The public response did not provide a readable body.");
    let size = 0;
    try {
      for (; ; ) {
        const item = await reader.read();
        if (item.done) break;
        const bytes = Buffer.from(item.value);
        size += bytes.length;
        if (size > limit) problem("The public response exceeded the expected size.");
        consume(bytes);
      }
    } finally {
      await reader.cancel().catch(() => void 0);
      reader.releaseLock();
    }
    return size;
  }
  checkHttp(response) {
    if (response.status !== 200) throw new VerificationProblem([404, 408, 409, 425, 429].includes(response.status) || response.status >= 500 ? "pending" : "failed", "The public endpoint is not available with HTTP 200. Retry after checking its public availability.", response.status);
  }
  async record(id) {
    const opened = await this.open(`${this.origin}/api/records/${id}`, "record");
    try {
      this.checkHttp(opened.response);
      const parts = [];
      await this.bytes(opened.response, 2 * 1024 * 1024, (bytes) => parts.push(bytes));
      try {
        return JSON.parse(Buffer.concat(parts).toString("utf8"));
      } catch {
        return problem("The public record response is not valid JSON.");
      }
    } finally {
      await opened.response.body?.cancel().catch(() => void 0);
      opened.close();
    }
  }
  async download(value, expectedBytes) {
    for (let hop = 0; hop < 6; hop++) {
      const opened = await this.open(value, "file");
      try {
        if ([301, 302, 303, 307, 308].includes(opened.response.status)) {
          const next = opened.response.headers.get("location");
          if (!next) problem("The public file redirect has no destination.");
          value = this.url(new URLConstructor(next, opened.url).toString(), "file").toString();
          continue;
        }
        this.checkHttp(opened.response);
        const digest2 = crypto__namespace.createHash("sha256");
        const bytes = await this.bytes(opened.response, expectedBytes, (part) => digest2.update(part));
        return { bytes, sha256: digest2.digest("hex"), url: opened.url };
      } finally {
        await opened.response.body?.cancel().catch(() => void 0);
        opened.close();
      }
    }
    return problem("The public file has too many redirects.");
  }
  async resolve(value, recordId) {
    for (let hop = 0; hop < 6; hop++) {
      const opened = await this.open(value, "doi");
      try {
        if ([301, 302, 303, 307, 308].includes(opened.response.status)) {
          const next = opened.response.headers.get("location");
          if (!next) problem("The DOI redirect has no destination.");
          value = this.url(new URLConstructor(next, opened.url).toString(), "doi").toString();
          continue;
        }
        this.checkHttp(opened.response);
        const url2 = this.url(opened.url, "doi");
        if (url2.origin !== this.origin || !new RegExp(`^/records?/${recordId}/?$`).test(url2.pathname)) problem("The DOI does not resolve to this exact published edition.");
        return opened.url;
      } finally {
        await opened.response.body?.cancel().catch(() => void 0);
        opened.close();
      }
    }
    return problem("The DOI has too many redirects.");
  }
}
function publicRecord(record, profile, id, doi, conceptDoi, name, bytes, expectedMetadata, expectedFiles) {
  if (String(record?.id) !== id || record.is_published === false || ["draft", "unsubmitted"].includes(record.status || record.state)) problem("The public record identity or publication status differs from this edition.");
  const metadata = record.metadata || {};
  const recordDoi = (value) => {
    try {
      return normalizeDoi(value);
    } catch {
      return problem("The public record contains an invalid DOI.");
    }
  };
  const actualDoi = recordDoi(record.doi || record.pids?.doi?.identifier || metadata.doi);
  let parentDoi;
  if (record.links?.parent_doi) {
    let link2;
    try {
      link2 = new URLConstructor(record.links.parent_doi);
    } catch {
      return problem("The public work DOI link is invalid.");
    }
    if (!["https://doi.org", "https://handle.test.datacite.org"].includes(link2.origin) || link2.username || link2.password || link2.search || link2.hash) problem("The public work DOI link is untrusted.");
    parentDoi = decodeURIComponent(link2.pathname.slice(1));
  }
  const actualConcept = recordDoi(record.conceptdoi || record.concept_doi || record.parent?.pids?.doi?.identifier || parentDoi);
  if (actualDoi !== doi || conceptDoi && actualConcept !== conceptDoi) problem("The public record DOI differs from the bound edition or work.");
  if (!Array.isArray(metadata.creators)) problem("The public creators are invalid.");
  const authors = metadata.creators.map((author) => author?.name || author?.person_or_org?.name);
  const license = typeof metadata.license === "string" ? metadata.license : metadata.license?.id || metadata.rights?.[0]?.id;
  if (metadata.title !== profile.title || metadata.version !== profile.version || canonical(authors) !== canonical(profile.authors.map((author) => author.name)) || license !== (profile.license || "cc-by-4.0")) problem("The public title, version, creators or license differs from the frozen edition.");
  if (expectedMetadata && !zenodoMetadataMatches(record, expectedMetadata)) problem("The public author identities, source links or publication metadata differ from the frozen edition.");
  const files = Array.isArray(record.files) ? record.files : Object.entries(record.files?.entries || {}).map(([key, file]) => ({ ...file, key }));
  const expected = expectedFiles || [{ artifact: "publication.pdf", bytes, sha256: sha256(bytes) }];
  if (files.length !== expected.length) problem("The public file set differs from this edition.");
  const observed = expected.map((item) => {
    const target = expectedFiles ? zenodoArtifactName(profile, item.artifact) : name;
    const matches = files.filter((file2) => (file2.key || file2.filename) === target);
    if (matches.length !== 1) problem("The public file set contains a missing or repeated filename.");
    const file = matches[0], checksum = String(file.checksum || "").toLowerCase(), md52 = crypto__namespace.createHash("md5").update(item.bytes).digest("hex");
    if (Number(file.size ?? file.filesize) !== item.bytes.length || ![md52, `md5:${md52}`, item.sha256, `sha256:${item.sha256}`].includes(checksum)) problem("The public filename, size or checksum differs from a frozen artifact.");
    return { artifact: item.artifact, name: target, size: item.bytes.length, checksum, fileUrl: file.links?.content || file.links?.download || file.links?.self };
  });
  return { snapshot: { id, doi: actualDoi, conceptDoi: actualConcept, title: metadata.title, version: metadata.version, authors, license, ...expectedMetadata ? { expectedMetadata } : {}, files: observed }, fileUrl: observed.find((file) => file.artifact === "publication.pdf")?.fileUrl, files: observed };
}
async function verifyPublishedEdition(store, options, profileId, buildId2, request) {
  return store.locked(profileId, async () => {
    const id = String(request.recordId || "");
    if (!/^[1-9][0-9]{0,24}$/.test(id)) throw new Error("Invalid published record identity.");
    const saved = await store.profile(profileId), build = await store.build(profileId, buildId2), remote = await store.remote(profileId);
    if (!saved || build.workId !== saved.profile.workId || build.pdfSha256 !== request.pdfSha256) throw new Error("The verification request does not match the frozen PDF and work.");
    const binding = remote?.status === "published" && remote.recordId === id ? { ...remote.upload, versionDoi: remote.versionDoi } : remote?.history?.find((item) => item.recordId === id);
    if (!remote || !binding || binding.buildId && binding.buildId !== buildId2 || binding.pdfSha256 && binding.pdfSha256 !== build.pdfSha256) throw new Error("Verify a published record bound to this exact edition, or attach the existing published record first.");
    const bytes = await store.artifact(profileId, buildId2, "publication.pdf"), manifest = JSON.parse((await store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    const profile = normalizeProfile(manifest.plan.profile), doi = normalizeDoi(manifest.plan.doi.versionDoi), conceptDoi = normalizeDoi(manifest.plan.doi.conceptDoi || remote.conceptDoi);
    if (profile.id !== profileId || profile.workId !== build.workId || profile.version !== build.version || !doi || binding.versionDoi !== doi) throw new Error("The frozen edition DOI does not match the bound published record.");
    const origin = remote.environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const resolver = remote.environment === "production" ? "doi.org" : "handle.test.datacite.org";
    const recordUrl = `${origin}/api/records/${id}`, doiUrl = `https://${resolver}/${doi.split("/").map(encodeURIComponent).join("/")}`;
    const notChecked = { status: "pending", detail: "Not yet checked." };
    const result = {
      schema: "math-workspace.publication-verification/v1",
      profileId,
      workId: build.workId,
      buildId: buildId2,
      recordId: id,
      environment: remote.environment,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      versionDoi: doi,
      pdfSha256: build.pdfSha256,
      record: { ...notChecked, url: recordUrl },
      file: { ...notChecked, expectedBytes: bytes.length },
      doi: { ...notChecked, url: doiUrl, resolver }
    };
    const client2 = new PublicReader(options, origin);
    const expectedMetadata = manifest.plan.projectMetadata !== void 0 ? zenodoPublicationMetadata(profile, build) : void 0;
    const artifacts = build.publicArtifacts ? await publicArtifactBytes(store, build) : void 0;
    try {
      const first = publicRecord(await client2.record(id), profile, id, doi, conceptDoi, zenodoFileName(profile), bytes, expectedMetadata, artifacts);
      result.record = { status: "passed", detail: "The anonymous public record matches the edition DOI, work DOI, title, version, creators, license and PDF file metadata.", url: recordUrl, httpStatus: 200 };
      try {
        const fileUrl = first.fileUrl || `${origin}/records/${id}/files/${encodeURIComponent(zenodoArtifactName(profile, "publication.pdf"))}`;
        const downloaded = await client2.download(fileUrl, bytes.length);
        result.file = { status: downloaded.sha256 === build.pdfSha256 && downloaded.bytes === bytes.length ? "passed" : "failed", detail: downloaded.sha256 === build.pdfSha256 && downloaded.bytes === bytes.length ? "The anonymously downloaded PDF matches the frozen PDF byte count and SHA-256." : "The anonymously downloaded PDF differs from the frozen edition.", url: downloaded.url, expectedBytes: bytes.length, observedBytes: downloaded.bytes, observedSha256: downloaded.sha256, httpStatus: 200 };
      } catch (error2) {
        result.file = { ...result.file, ...observation(error2, result.file.url), expectedBytes: bytes.length };
      }
      if (artifacts) {
        result.files = [];
        for (const artifact of artifacts) {
          const name = zenodoArtifactName(profile, artifact.artifact);
          const item = { artifact: artifact.artifact, fileName: name, expectedSha256: artifact.sha256 };
          if (artifact.artifact === "publication.pdf") {
            result.files.push({ ...item, ...result.file });
            continue;
          }
          const url2 = first.files.find((file) => file.artifact === artifact.artifact)?.fileUrl || `${origin}/records/${id}/files/${encodeURIComponent(name)}`;
          try {
            const downloaded = await client2.download(url2, artifact.bytes.length), passed = downloaded.sha256 === artifact.sha256 && downloaded.bytes === artifact.bytes.length;
            result.files.push({ ...item, status: passed ? "passed" : "failed", detail: passed ? "The anonymously downloaded artifact matches its frozen byte count and SHA-256." : "The publicly downloaded artifact differs from this edition.", observedSha256: downloaded.sha256, url: downloaded.url });
          } catch (error2) {
            result.files.push({ ...item, ...observation(error2, url2) });
          }
        }
      }
      if (result.file.status === "passed") try {
        const after = publicRecord(await client2.record(id), profile, id, doi, conceptDoi, zenodoFileName(profile), bytes, expectedMetadata, artifacts);
        if (canonical(first.snapshot) !== canonical(after.snapshot)) problem("The public record changed during the PDF download. Retry verification.");
      } catch (error2) {
        result.record = observation(error2, recordUrl);
      }
      try {
        const target = await client2.resolve(doiUrl, id);
        result.doi = { status: "passed", detail: "The DOI resolver reaches this exact public edition.", url: target, resolver, httpStatus: 200 };
      } catch (error2) {
        result.doi = { ...observation(error2, doiUrl), resolver };
      }
      if (remote.environment === "sandbox" && result.doi.httpStatus === 404) result.doi.detail = "Zenodo sandbox states that test DOIs are not real and do not resolve. This test DOI does not establish production DOI registration or resolution.";
    } catch (error2) {
      result.record = observation(error2, recordUrl);
    }
    const states = [result.record, result.file, result.doi, ...result.files || []].map((item) => item.status);
    result.status = states.includes("failed") ? "failed" : states.every((state) => state === "passed") ? "verified" : "pending";
    result.checkedAt = (/* @__PURE__ */ new Date()).toISOString();
    await store.writeVerification(result);
    return result;
  });
}
const fs$1 = require("node:fs/promises"), os$1 = require("node:os"), childProcess$1 = require("node:child_process");
const digest = (value) => /^[a-f0-9]{64}$/.test(value || "");
class PublicationPackageRebuilder {
  constructor(store, options) {
    this.store = store;
    this.options = options;
    this.active = /* @__PURE__ */ new Map();
  }
  async receipts(profileId) {
    return (await this.store.packageRebuilds(profileId)).map((receipt) => {
      if (receipt.state !== "running") return receipt;
      try {
        process.kill(receipt.runnerPid, 0);
        return receipt;
      } catch (error2) {
        return error2.code === "ESRCH" ? { ...receipt, state: "interrupted", recoveredFromInterruptedProcess: true, detail: "The recorded rebuild process exited without a terminal acknowledgement." } : receipt;
      }
    });
  }
  cancel(profileId, buildId2, manifestSha256) {
    const active = this.active.get(profileId);
    if (!active || active.buildId !== buildId2 || active.manifestSha256 !== manifestSha256) throw new Error("No matching active package rebuild.");
    active.controller.abort();
  }
  async validate(profileId, buildId2, request, options = {}) {
    if (!["lean.zip", "source.zip"].includes(request.artifact) || !digest(request.manifestSha256) || !digest(request.packageSha256)) throw new Error("Review the exact frozen package and manifest digests.");
    const timeoutMs = request.timeoutMs ?? 10 * 60 * 1e3;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 20 || timeoutMs > 60 * 60 * 1e3) throw new Error("Invalid package rebuild timeout.");
    if (this.active.has(profileId)) throw new Error("A package rebuild is already active for this profile.");
    const controller = new globalThis.AbortController(), abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    this.active.set(profileId, { buildId: buildId2, manifestSha256: request.manifestSha256, controller });
    try {
      return await this.store.locked(profileId, async () => {
        const build = await this.store.build(profileId, buildId2);
        if (build.manifestSha256 !== request.manifestSha256 || !build.publicArtifacts?.includes(request.artifact)) throw new Error("The frozen publication manifest or package changed.");
        const bytes = await this.store.artifact(profileId, buildId2, request.artifact);
        if (sha256(bytes) !== request.packageSha256) throw new Error("The package digest differs from the reviewed artifact.");
        const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
        const targets = manifest.plan.delivery?.lean;
        if (!Array.isArray(targets) || !targets.length) throw new Error("This package has no Lean build targets.");
        const files = publicationZipFiles(bytes), identity2 = JSON.parse(files.get("PUBLICATION.json")?.toString("utf8") || "{}");
        if (identity2.buildId !== buildId2 || canonical(identity2.lean) !== canonical(targets)) throw new Error("The package build targets differ from the frozen manifest.");
        const receipt = {
          schema: "math-workspace.publication-package-rebuild/v1",
          id: crypto.randomBytes(16).toString("hex"),
          profileId,
          buildId: buildId2,
          artifact: request.artifact,
          manifestSha256: request.manifestSha256,
          packageSha256: request.packageSha256,
          state: "running",
          startedAt: (/* @__PURE__ */ new Date()).toISOString(),
          runnerPid: process.pid,
          allowDependencies: request.allowDependencies === true,
          targets: targets.map(({ key, root, toolchain, target }) => ({ key, root, toolchain, target })),
          locks: [],
          results: []
        };
        let directory;
        try {
          await this.store.writePackageRebuild(receipt);
          for (const [name, value] of files) if (name.endsWith("lake-manifest.json")) {
            const lock = JSON.parse(value.toString("utf8"));
            receipt.locks.push({ path: name, sha256: sha256(value) });
            if (!Array.isArray(lock.packages)) throw new Error("Missing locked package dependency list.");
            for (const dependency of lock.packages) {
              if (dependency.type === "git") {
                if (!/^[a-f0-9]{40,64}$/i.test(dependency.rev || "") || !/^(?:https:\/\/[^/@\s]+\/|git@[^:\s]+:)/.test(dependency.url || "")) throw new Error("Rebuild dependencies must use exact public Git commits.");
                if (!receipt.allowDependencies) {
                  receipt.state = "blocked";
                  receipt.detail = "A clean rebuild needs pinned Git dependencies. Explicitly approve dependency downloads before executing it.";
                }
              } else if (dependency.type === "path" && typeof dependency.dir === "string") {
                const target = path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(name), dependency.dir));
                if (target === ".." || target.startsWith("../") || path__namespace.posix.isAbsolute(target) || !files.has(path__namespace.posix.join(target, "lake-manifest.json"))) throw new Error("A local dependency escapes or is absent from this package.");
              } else throw new Error("Unsupported package dependency in frozen bundle.");
            }
          }
          if (controller.signal.aborted) receipt.state = "cancelled";
          if (receipt.state !== "running") return receipt;
          directory = await fs$1.mkdtemp(path__namespace.join(os$1.tmpdir(), "math-publication-rebuild-"));
          for (const [name, value] of files) {
            const destination = await safePath(directory, name);
            await fs$1.mkdir(path__namespace.dirname(destination), { recursive: true });
            await fs$1.writeFile(destination, value, { flag: "wx" });
          }
          const env = { ...process.env, ...this.options.environment };
          for (const key of Object.keys(env)) if (/^(?:LEAN_|LAKE_|GIT_)/.test(key) || /(?:TOKEN|SECRET|PASSWORD)$/.test(key) || key === "ELAN_TOOLCHAIN") delete env[key];
          for (const key of [manifest.plan.profile.zenodo?.tokenEnv, manifest.plan.profile.delivery?.repository?.tokenEnv].filter(Boolean)) delete env[key];
          env.LAKE_CACHE_DIR = "";
          env.XDG_CACHE_HOME = path__namespace.join(directory, ".cache");
          env.GIT_TERMINAL_PROMPT = "0";
          env.GIT_CONFIG_COUNT = "1";
          env.GIT_CONFIG_KEY_0 = "core.hooksPath";
          env.GIT_CONFIG_VALUE_0 = "/dev/null";
          const started = Date.now();
          for (const target of receipt.targets) {
            const cwd = target.root === "." ? directory : await safePath(directory, target.root);
            const toolchain = (await fs$1.readFile(path__namespace.join(cwd, "lean-toolchain"), "utf8")).trim();
            if (toolchain !== target.toolchain || toolchain.includes("..") || !/^[A-Za-z0-9._/-]+:(?:v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?|nightly-\d{4}-\d{2}-\d{2}|[a-f0-9]{40,64})$/.test(toolchain) || target.target?.startsWith("-") || /[\u0000-\u001f]/.test(target.target || "")) throw new Error("The package toolchain or target is not pinned to the reviewed identity.");
            options.onProgress?.(`Rebuilding frozen Lean package: ${target.key}`);
            let killTimer;
            let cause, output = "", worker;
            const command = ["elan", "run", toolchain, "lake", "--no-cache", "build", ...target.target ? [target.target] : []];
            const stop = (state) => {
              cause ||= state;
              try {
                process.platform === "win32" ? worker?.kill("SIGTERM") : process.kill(-worker.pid, "SIGTERM");
              } catch {
              }
              killTimer ||= setTimeout(() => {
                try {
                  process.platform === "win32" ? worker?.kill("SIGKILL") : process.kill(-worker.pid, "SIGKILL");
                } catch {
                }
              }, 1500);
            };
            const interrupted = () => stop("cancelled");
            controller.signal.addEventListener("abort", interrupted, { once: true });
            const timer = setTimeout(() => stop("timed-out"), Math.max(1, timeoutMs - (Date.now() - started)));
            const completed = new Promise((resolve) => {
              try {
                worker = childProcess$1.spawn(command[0], command.slice(1), { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
                const append = (bytes2) => {
                  output = (output + bytes2.toString()).slice(-1024 * 1024);
                };
                worker.stdout.on("data", append);
                worker.stderr.on("data", append);
                worker.once("error", (error2) => {
                  output += String(error2.message);
                  resolve({ code: null });
                });
                worker.once("close", (code2, signal) => resolve({ code: code2, signal: signal || void 0 }));
              } catch (error2) {
                output += String(error2);
                resolve({ code: null });
              }
            });
            receipt.workerPid = worker?.pid;
            await this.store.writePackageRebuild(receipt);
            if (controller.signal.aborted) stop("cancelled");
            const result = await completed;
            clearTimeout(timer);
            if (killTimer) clearTimeout(killTimer);
            controller.signal.removeEventListener("abort", interrupted);
            receipt.results.push({ key: target.key, command, exitCode: result.code, signal: result.signal, output });
            delete receipt.workerPid;
            if (cause || result.code !== 0) {
              receipt.state = cause || (result.signal ? "interrupted" : "failed");
              break;
            }
          }
          if (receipt.state === "running") {
            receipt.resolvedLocks = [];
            const identities = (lock) => canonical(lock.packages.map((p) => ({ name: p.name, type: p.type, url: p.url, rev: p.rev, dir: p.dir, subDir: p.subDir, configFile: p.configFile, manifestFile: p.manifestFile })).sort((a, b) => String(a.name).localeCompare(String(b.name))));
            for (const lock of receipt.locks) {
              const resolved = await fs$1.readFile(await safePath(directory, lock.path));
              if (identities(JSON.parse(resolved.toString("utf8"))) !== identities(JSON.parse(files.get(lock.path).toString("utf8")))) throw new Error(`The rebuild changed pinned dependency identities: ${lock.path}`);
              receipt.resolvedLocks.push({ path: lock.path, sha256: sha256(resolved) });
            }
            receipt.state = "passed";
          }
          receipt.detail = receipt.state === "passed" ? "The exact frozen package rebuilt in a fresh directory; this is independent of saved project builds and human correspondence review." : "The frozen package rebuild did not complete successfully. Inspect the per-target result.";
        } catch (error2) {
          receipt.state = controller.signal.aborted ? "cancelled" : "failed";
          receipt.detail = error2 instanceof Error ? error2.message : String(error2);
        } finally {
          receipt.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
          try {
            await this.store.writePackageRebuild(receipt);
          } finally {
            if (directory) await fs$1.rm(directory, { recursive: true, force: true });
          }
        }
        return receipt;
      });
    } finally {
      this.active.delete(profileId);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}
const URL = require("node:url").URL;
function host(state) {
  const target = state.target, github = target.provider === "github";
  const repository = (target.url.startsWith("git@") ? target.url.split(":").slice(1).join(":") : new URL(target.url).pathname.slice(1)).replace(/\.git\/?$/, "").replace(/\/$/, "");
  if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(repository) || repository.split("/").some((part) => part === "." || part === "..") || github && repository.split("/").length !== 2) throw new Error("Invalid hosted publication repository path.");
  return {
    github,
    repository,
    origin: github ? "https://github.com" : "https://gitlab.com",
    api: github ? `https://api.github.com/repos/${repository}` : `https://gitlab.com/api/v4/projects/${encodeURIComponent(repository)}`
  };
}
function marker(state) {
  return `Math Workspace publication

Build: ${state.buildId}
Manifest-SHA256: ${state.manifestSha256}
Source-commit: ${state.commit}
`;
}
async function bodyBytes(response, limit) {
  const length = response.headers?.get("content-length");
  if (length && Number(length) > limit) throw new Error("The release service exceeded the expected artifact size.");
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new Error("The release service exceeded the expected artifact size.");
    return bytes;
  }
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (; ; ) {
      const part = await reader.read();
      if (part.done) break;
      const bytes = Buffer.from(part.value);
      size += bytes.length;
      if (size > limit) throw new Error("The release service exceeded the expected artifact size.");
      chunks.push(bytes);
    }
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
function client(state, options, anonymous = false) {
  const provider = host(state), token = !anonymous && (options.environment || process.env)[state.target.tokenEnv];
  const request = async (url2, method = "GET", body, binary = false, allowMissing = false) => {
    const parsed = new URL(url2), allowed = new URL(provider.api);
    const upload = provider.github && parsed.origin === "https://uploads.github.com" && parsed.pathname.startsWith(`/repos/${provider.repository}/releases/`);
    if (!(parsed.origin === allowed.origin && (parsed.pathname === allowed.pathname || parsed.pathname.startsWith(allowed.pathname + "/")) || upload) || parsed.username || parsed.password || parsed.hash) throw new Error("The release API destination is not trusted.");
    if (!anonymous && !token) throw new Error(`Configure ${state.target.tokenEnv} in the server process.`);
    const controller = new globalThis.AbortController(), timer = setTimeout(() => controller.abort(), 6e4);
    try {
      const multipart = body instanceof globalThis.FormData;
      const response = await (options.fetch || globalThis.fetch)(url2, {
        method,
        redirect: "error",
        credentials: "omit",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...!anonymous ? provider.github ? { Authorization: `Bearer ${token}` } : { "PRIVATE-TOKEN": token } : {},
          ...body !== void 0 && !multipart ? { "Content-Type": binary ? "application/octet-stream" : "application/json" } : {}
        },
        ...body !== void 0 ? { body: binary || multipart ? body : JSON.stringify(body) } : {}
      });
      if (allowMissing && response.status === 404) {
        await response.body?.cancel().catch(() => void 0);
        return null;
      }
      if (!response.ok) throw new Error(`The release API returned HTTP ${response.status}. Read its state before retrying.`);
      const bytes = await bodyBytes(response, 2 * 1024 * 1024);
      return JSON.parse(bytes.toString("utf8"));
    } catch (error2) {
      if (error2 instanceof Error && /HTTP|trusted|size/.test(error2.message)) throw error2;
      throw new Error("The hosted release result is unknown. Read the existing release before retrying.");
    } finally {
      clearTimeout(timer);
    }
  };
  return { ...provider, request };
}
function assetUrl(state, name, value) {
  const provider = host(state), parsed = new URL(value, provider.origin);
  const prefix = provider.github ? `/${provider.repository}/releases/download/${encodeURIComponent(state.target.tag)}/` : `/${provider.repository}/uploads/`;
  const projectPrefix = !provider.github && /^[1-9][0-9]*$/.test(state.hostedProjectId || "") ? `/-/project/${state.hostedProjectId}/uploads/` : void 0;
  if (parsed.origin !== provider.origin || !(parsed.pathname.startsWith(prefix) || projectPrefix && parsed.pathname.startsWith(projectPrefix)) || parsed.username || parsed.password || parsed.hash || parsed.search || decodeURIComponent(parsed.pathname.split("/").pop() || "") !== name) throw new Error("The release asset URL differs from this repository and filename.");
  return parsed.toString();
}
async function download(state, url2, file, options, authenticated = false) {
  const provider = host(state), token = (options.environment || process.env)[state.target.tokenEnv];
  for (let hop = 0; hop < 6; hop++) {
    const parsed = new URL(url2);
    const allowed = parsed.origin === provider.origin || provider.github && ["https://api.github.com", "https://release-assets.githubusercontent.com", "https://objects.githubusercontent.com"].includes(parsed.origin) || !provider.github && parsed.origin === "https://storage.googleapis.com";
    if (!allowed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) throw new Error("Untrusted release download destination.");
    const controller = new globalThis.AbortController(), timer = setTimeout(() => controller.abort(), 6e4);
    try {
      const response = await (options.fetch || globalThis.fetch)(url2, { method: "GET", redirect: "manual", credentials: "omit", signal: controller.signal, headers: {
        Accept: "application/octet-stream",
        ...authenticated && parsed.origin === "https://api.github.com" ? { Authorization: `Bearer ${token}` } : {}
      } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get("location");
        if (!next) throw new Error("The asset redirect is missing.");
        url2 = new URL(next, url2).toString();
        await response.body?.cancel().catch(() => void 0);
        continue;
      }
      if (response.status !== 200) throw new Error(`The public release artifact returned HTTP ${response.status}.`);
      const bytes = await bodyBytes(response, file.bytes.length);
      if (bytes.length !== file.bytes.length || sha256(bytes) !== file.sha256) throw new Error("A release artifact differs from this edition.");
      return;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many release artifact redirects.");
}
function releaseMatches(state, release) {
  if (!release || release.tag_name !== state.target.tag || (release.body ?? release.description) !== marker(state)) throw new Error("The existing hosted release is not bound to this exact edition.");
}
async function inspectHostedRepository(target, options, anonymous = false) {
  if (target.provider === "git") return;
  const configured = !!(options.environment || process.env)[target.tokenEnv];
  const api = client({ target }, options, anonymous || !configured), project = await api.request(api.api);
  const matches = api.github ? project.private === false && String(project.full_name).toLowerCase() === api.repository.toLowerCase() : project.visibility === "public" && project.path_with_namespace === api.repository;
  if (!matches) throw new Error("Choose a public repository with the reviewed identity. Repository visibility is never changed automatically.");
}
async function publishHostedRelease(state, files, profile, options, save) {
  const api = client(state, options), tag = encodeURIComponent(state.target.tag);
  await inspectHostedRepository(state.target, options);
  if (!api.github) {
    const project = await api.request(api.api);
    if (!Number.isSafeInteger(project.id) || project.id < 1 || project.path_with_namespace !== api.repository) throw new Error("The GitLab project identity differs from this repository.");
    state = { ...state, hostedProjectId: String(project.id) };
    await save(state);
  }
  let release = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`, "GET", void 0, false, true);
  if (!release && api.github) {
    const drafts = await api.request(`${api.api}/releases?per_page=100`);
    const matches = drafts.filter((item) => item.tag_name === state.target.tag);
    if (matches.length > 1) throw new Error("More than one draft uses this release tag. Reconcile the hosted releases.");
    release = matches[0];
  }
  if (release) releaseMatches(state, release);
  if (api.github) {
    if (!release) release = await api.request(`${api.api}/releases`, "POST", { tag_name: state.target.tag, target_commitish: state.commit, name: `${profile.title} ${profile.version}`, body: marker(state), draft: true });
    releaseMatches(state, release);
    if (!Number.isSafeInteger(release.id) || release.id < 1) throw new Error("Invalid hosted release identity.");
    state = { ...state, releaseId: String(release.id), releaseUrl: `${api.origin}/${api.repository}/releases/tag/${tag}` };
    await save(state);
    let assets2 = await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`);
    if (!Array.isArray(assets2) || assets2.some((asset) => !files.some((file) => file.artifact === asset.name)) || new Set(assets2.map((asset) => asset.name)).size !== assets2.length) throw new Error("The hosted release has unexpected or repeated assets. Existing files are preserved.");
    const receipts = [];
    for (const file of files) {
      let asset = assets2.find((item) => item.name === file.artifact);
      if (!asset) {
        if (!release.draft) throw new Error("A published release is missing a reviewed artifact.");
        asset = await api.request(`https://uploads.github.com/repos/${api.repository}/releases/${release.id}/assets?name=${encodeURIComponent(file.artifact)}`, "POST", file.bytes, true);
      }
      if (asset.name !== file.artifact || asset.size !== file.bytes.length || asset.digest && asset.digest !== `sha256:${file.sha256}` || !Number.isSafeInteger(asset.id)) throw new Error("A hosted asset differs from the reviewed file.");
      if (!asset.digest) await download(state, `${api.api}/releases/assets/${asset.id}`, file, options, true);
      receipts.push({ artifact: file.artifact, name: file.artifact, url: assetUrl(state, file.artifact, asset.browser_download_url) });
    }
    assets2 = await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`);
    if (assets2.length !== files.length || !files.every((file) => assets2.filter((asset) => asset.name === file.artifact && asset.size === file.bytes.length && (!asset.digest || asset.digest === `sha256:${file.sha256}`)).length === 1)) throw new Error("The hosted release file set changed during upload.");
    state = { ...state, assets: receipts };
    await save(state);
    if (release.draft) {
      release = await api.request(`${api.api}/releases/${release.id}`, "PATCH", { draft: false });
      releaseMatches(state, release);
      if (release.draft) throw new Error("The release service did not acknowledge publication.");
    }
    return state;
  }
  if (release) {
    const links = release.assets?.links || [];
    if (links.length !== files.length || !files.every((file) => links.filter((link2) => link2.name === file.artifact).length === 1)) throw new Error("The existing release file set differs from this edition.");
    state = { ...state, releaseId: state.target.tag, releaseUrl: `${api.origin}/${api.repository}/-/releases/${tag}`, assets: links.map((link2) => ({ artifact: link2.name, name: link2.name, url: assetUrl(state, link2.name, link2.url) })) };
    for (const file of files) await download(state, state.assets.find((asset) => asset.artifact === file.artifact).url, file, options);
    return state;
  }
  const assets = [...state.assets || []];
  for (const file of files) {
    const known = assets.find((asset) => asset.artifact === file.artifact);
    if (known) {
      await download(state, assetUrl(state, file.artifact, known.url), file, options);
      continue;
    }
    const form = new globalThis.FormData();
    form.append("file", new globalThis.Blob([file.bytes]), file.artifact);
    const uploaded = await api.request(`${api.api}/uploads`, "POST", form);
    const url2 = assetUrl(state, file.artifact, uploaded.full_path || `/${api.repository}${uploaded.url}`);
    assets.push({ artifact: file.artifact, name: file.artifact, url: url2 });
    state = { ...state, assets };
    await save(state);
  }
  release = await api.request(`${api.api}/releases`, "POST", { name: `${profile.title} ${profile.version}`, tag_name: state.target.tag, description: marker(state), assets: { links: assets.map((asset) => ({ name: asset.name, url: asset.url, link_type: "other" })) } });
  releaseMatches(state, release);
  return { ...state, releaseId: state.target.tag, releaseUrl: `${api.origin}/${api.repository}/-/releases/${tag}` };
}
async function verifyHostedRelease(state, files, options) {
  await inspectHostedRepository(state.target, options, true);
  const api = client(state, options, true), tag = encodeURIComponent(state.target.tag);
  const release = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`);
  releaseMatches(state, release);
  if (release.draft) throw new Error("The hosted release is not public yet.");
  const assets = api.github ? await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`) : release.assets?.links;
  if (!Array.isArray(assets) || assets.length !== files.length) throw new Error("The public release file set differs from this edition.");
  for (const file of files) {
    const matches = assets.filter((asset) => asset.name === file.artifact);
    if (matches.length !== 1) throw new Error("A public release artifact is missing or repeated.");
    const url2 = assetUrl(state, file.artifact, api.github ? matches[0].browser_download_url : matches[0].url);
    await download(state, url2, file, options);
  }
  const after = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`);
  releaseMatches(state, after);
}
const fs = require("node:fs/promises");
const os = require("node:os");
const childProcess = require("node:child_process");
function gitCredentials(target, options) {
  if (target.provider === "git" || !target.url.startsWith("https://")) return {};
  const token = (options.environment || process.env)[target.tokenEnv];
  if (!token) return {};
  const host2 = target.provider === "github" ? "github.com" : "gitlab.com";
  const authorization = Buffer.from(`${target.provider === "github" ? "x-access-token" : "oauth2"}:${token}`).toString("base64");
  return { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: `http.https://${host2}/.extraHeader`, GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${authorization}` };
}
async function git(cwd, args, input, identity2 = false, credential = {}) {
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_") && !/(?:TOKEN|SECRET|PASSWORD)$/.test(key))),
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_LAZY_FETCH: "1",
    ...identity2 ? { GIT_AUTHOR_NAME: "Math Workspace", GIT_AUTHOR_EMAIL: "publication@localhost", GIT_COMMITTER_NAME: "Math Workspace", GIT_COMMITTER_EMAIL: "publication@localhost" } : {},
    ...credential
  };
  return new Promise((resolve, reject) => {
    const child = childProcess.execFile(
      "git",
      ["--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "commit.gpgSign=false", "-c", "protocol.ext.allow=never", ...args],
      { cwd, env, timeout: 6e4, maxBuffer: 200 * 1024 * 1024, encoding: "buffer" },
      (error2, stdout) => error2 ? reject(new Error("The Git publication operation did not complete. Read the target state before retrying.")) : resolve(stdout)
    );
    child.stdin.on("error", () => void 0);
    child.stdin.end(input);
  });
}
async function heads(target, options = {}) {
  const output = (await git(os.tmpdir(), ["ls-remote", "--", target.url, `refs/heads/${target.branch}`, `refs/tags/${target.tag}`, `refs/tags/${target.tag}^{}`], void 0, false, gitCredentials(target, options))).toString("utf8");
  const refs = /* @__PURE__ */ new Map();
  for (const line of output.trim().split("\n").filter(Boolean)) {
    const [hash, ref] = line.split(/\s+/);
    if (!/^[a-f0-9]{40,64}$/.test(hash)) throw new Error("Invalid remote Git revision.");
    refs.set(ref, hash);
  }
  return { baseCommit: refs.get(`refs/heads/${target.branch}`) || null, tagCommit: refs.get(`refs/tags/${target.tag}^{}`) || refs.get(`refs/tags/${target.tag}`) || null };
}
async function temporary(action) {
  const directory = await fs.mkdtemp(path__namespace.join(os.tmpdir(), "math-publication-git-"));
  try {
    await git(directory, ["init", "--bare", "--quiet"]);
    return await action(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
class PublicationRepository {
  constructor(store, options, current) {
    this.store = store;
    this.options = options;
    this.current = current;
  }
  async edition(profileId, buildId2, manifestSha256, fresh = true) {
    const build = await this.store.build(profileId, buildId2);
    if (!build.publicArtifacts || build.manifestSha256 !== manifestSha256) throw new Error("Review the exact complete publication manifest before repository delivery.");
    const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    const target = repositoryTarget(manifest.plan.profile.delivery?.repository);
    if (fresh) {
      const saved = await this.store.profile(profileId);
      const current = saved && await this.current(saved.profile), frozenDoi = manifest.plan.doi;
      const sameDoiProgress = current?.doi.source === "zenodo" && frozenDoi.source === "zenodo" && current.doi.state === "published" && frozenDoi.state === "reserved" && current.doi.versionDoi === frozenDoi.versionDoi && current.doi.recordId === frozenDoi.recordId && (!current.doi.conceptDoi || !frozenDoi.conceptDoi || current.doi.conceptDoi === frozenDoi.conceptDoi);
      const fingerprint2 = sameDoiProgress ? sha256(canonical({ ...current, fingerprint: void 0, doi: frozenDoi })) : current?.fingerprint;
      if (!saved || fingerprint2 !== build.fingerprint) throw new Error("The publication sources or target changed. Build and review the current edition.");
    }
    const files = await publicArtifactBytes(this.store, build), sources = publicationZipFiles(await this.store.artifact(profileId, buildId2, "source.zip"));
    for (const file of files.filter((item) => ["CITATION.cff", "release.json"].includes(item.artifact))) sources.set(file.artifact, file.bytes);
    const checksums = [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => `${sha256(bytes)}  ${name}`).join("\n") + "\n";
    if (sources.has("SOURCE-CHECKSUMS.sha256")) throw new Error("A source file conflicts with the repository checksum manifest.");
    sources.set("SOURCE-CHECKSUMS.sha256", Buffer.from(checksums));
    const projected = /* @__PURE__ */ new Map();
    for (const [name, bytes] of sources) projected.set(`${target.directory}/${name}`, bytes);
    if (target.provider === "git") for (const file of files) projected.set(`${target.directory}/artifacts/${file.artifact}`, file.bytes);
    const modes = new Map((manifest.plan.delivery.files || []).map((file) => [`${target.directory}/${file.path}`, file.mode || 420]));
    return { build, manifest, target, projected, files, modes };
  }
  async review(profileId, buildId2, manifestSha256) {
    const edition = await this.edition(profileId, buildId2, manifestSha256), state = await this.store.repository(profileId, buildId2);
    await inspectHostedRepository(edition.target, this.options);
    const remote = await heads(edition.target, this.options);
    if (state && (state.manifestSha256 !== manifestSha256 || canonical(state.target) !== canonical(edition.target))) throw new Error("This edition is already bound to another repository target.");
    if (remote.tagCommit && state?.commit !== remote.tagCommit) throw new Error("This release tag already exists and is not bound to this reviewed edition. Choose a new version and tag.");
    const content = {
      profileId,
      buildId: buildId2,
      manifestSha256,
      target: edition.target,
      ...remote,
      files: [...edition.projected].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: sha256(bytes), mode: edition.modes.get(name) || 420 })),
      alreadyPublished: !!state?.commit && remote.tagCommit === state.commit
    };
    return { ...content, fingerprint: sha256(canonical(content)) };
  }
  async publish(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const plan = await this.review(profileId, buildId2, review.manifestSha256);
      if (plan.fingerprint !== review.fingerprint) throw new Error("The public repository changed after review. Review its file and ref changes again.");
      const edition = await this.edition(profileId, buildId2, review.manifestSha256);
      if (edition.target.provider !== "git" && !(this.options.environment || process.env)[edition.target.tokenEnv]) throw new Error(`Configure ${edition.target.tokenEnv} in the server process before publishing hosted release assets.`);
      let state = await this.store.repository(profileId, buildId2) || { schema: "math-workspace.publication-repository/v1", profileId, buildId: buildId2, manifestSha256: review.manifestSha256, target: edition.target, status: "prepared", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (!plan.alreadyPublished) {
        state = await temporary(async (directory) => {
          if (plan.baseCommit) {
            await git(directory, ["fetch", "--quiet", "--no-tags", "--", plan.target.url, `refs/heads/${plan.target.branch}`], void 0, false, gitCredentials(plan.target, this.options));
            const fetched = (await git(directory, ["rev-parse", "FETCH_HEAD"])).toString().trim();
            if (fetched !== plan.baseCommit) throw new Error("The repository branch changed after review.");
            await git(directory, ["read-tree", fetched]);
            const prior = await git(directory, ["ls-tree", "-r", "-z", fetched, "--", plan.target.directory]);
            if (prior.length) throw new Error("The edition directory already contains files. Existing repository files are never replaced; choose a new version directory.");
          } else await git(directory, ["read-tree", "--empty"]);
          const index = [];
          for (const [name, bytes] of edition.projected) {
            const hash = (await git(directory, ["hash-object", "-w", "--stdin"], bytes)).toString().trim();
            index.push(Buffer.from(`${edition.modes.get(name) === 493 ? "100755" : "100644"} ${hash}	${name}\0`));
          }
          await git(directory, ["update-index", "-z", "--index-info"], Buffer.concat(index));
          const tree = (await git(directory, ["write-tree"])).toString().trim();
          const commit = (await git(directory, ["commit-tree", tree, ...plan.baseCommit ? ["-p", plan.baseCommit] : []], `Publish ${edition.manifest.plan.profile.title} ${edition.build.version}

Manifest-SHA256: ${review.manifestSha256}
`, true)).toString().trim();
          const pending = { ...state, commit, baseCommit: plan.baseCommit, fingerprint: plan.fingerprint, status: "unknown", pending: "push", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          await this.store.writeRepository(pending);
          await git(directory, ["push", "--atomic", "--", plan.target.url, `${commit}:refs/heads/${plan.target.branch}`, `${commit}:refs/tags/${plan.target.tag}`], void 0, false, gitCredentials(plan.target, this.options));
          const observed = await heads(plan.target, this.options);
          if (observed.baseCommit !== commit || observed.tagCommit !== commit) throw new Error("Read back the repository refs before claiming a successful push.");
          return pending;
        });
      }
      if (!state.commit) throw new Error("The repository publication has no acknowledged source commit.");
      state = { ...state, status: "unknown", pending: "release", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.store.writeRepository(state);
      if (state.target.provider !== "git") state = await publishHostedRelease(state, edition.files, edition.manifest.plan.profile, this.options, async (value) => this.store.writeRepository(value));
      state = { ...state, status: "published", pending: void 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.store.writeRepository(state);
      return state;
    });
  }
  async verify(profileId, buildId2, manifestSha256) {
    return this.store.locked(profileId, async () => {
      const edition = await this.edition(profileId, buildId2, manifestSha256, false), state = await this.store.repository(profileId, buildId2);
      if (!state?.commit || canonical(state.target) !== canonical(edition.target)) throw new Error("There is no repository receipt bound to this edition.");
      let status = "pending", detail = "Repository verification has not completed.";
      try {
        const remote = await heads(state.target);
        if (remote.tagCommit !== state.commit) {
          status = "failed";
          detail = "The public release tag differs from this edition.";
        } else {
          await temporary(async (directory) => {
            await git(directory, ["fetch", "--quiet", "--no-tags", "--", state.target.url, `refs/tags/${state.target.tag}`]);
            const rows = (await git(directory, ["ls-tree", "-r", "-z", state.commit, "--", state.target.directory])).toString().split("\0").filter(Boolean);
            if (rows.length !== edition.projected.size) throw new Error("The public source file set differs from this edition.");
            for (const row of rows) {
              const match2 = /^(100644|100755) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(row);
              if (!match2 || !edition.projected.has(match2[3])) throw new Error("The public source tree has an unexpected file or mode.");
              if (match2[1] !== (edition.modes.get(match2[3]) === 493 ? "100755" : "100644")) throw new Error("A public source mode differs from this edition.");
              const bytes = await git(directory, ["cat-file", "blob", match2[2]]);
              if (!bytes.equals(edition.projected.get(match2[3]))) throw new Error("A public source file differs from the frozen edition.");
            }
          });
          if (state.target.provider !== "git") await verifyHostedRelease(state, edition.files, this.options);
          status = "verified";
          detail = "The public tag, exact source file set and every release artifact match this edition.";
        }
      } catch (error2) {
        detail = error2 instanceof Error ? error2.message : "The public verification could not finish.";
        status = /differs|unexpected|missing|changed/.test(detail) ? "failed" : "pending";
      }
      const result = { ...state, verification: { checkedAt: (/* @__PURE__ */ new Date()).toISOString(), status, detail } };
      await this.store.writeRepository(result);
      return result;
    });
  }
}
class PublicationService {
  constructor(root, options = {}) {
    this.options = options;
    this.store = new PublicationStore(root);
    this.zenodo = new ZenodoPublication(this.store, options, (profile) => this.plan(profile));
    this.packageRebuilder = new PublicationPackageRebuilder(this.store, options);
    this.repository = new PublicationRepository(this.store, options, (profile) => this.plan(profile));
  }
  async inspect() {
    const catalog = await publicationCatalog(this.store.root), profiles = await this.store.profiles(), { record: metadata, config: config2 } = await readPublicationMetadata(this.store.root);
    const defaultProfile = { id: "publication", workId: path__namespace.basename(this.store.root).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[^a-zA-Z0-9]+/, "").slice(0, 79) || "work", version: "0.1.0", chapters: [], frontMatter: [], backMatter: [], matter: { automatic: true }, toc: { enabled: true, depth: 2 }, cover: publicationCover({ showVersion: true }, config2), zenodo: { environment: "sandbox", tokenEnv: "ZENODO_TOKEN" } };
    defaultProfile.delivery = {};
    return { ...catalog, metadata, profiles, tools: await publicationTools(void 0, this.options), defaultProfile, leanProjects: leanProjects(config2).map(({ key, root }) => ({ key, root })), credentialStatus: profiles.map(({ profile }) => ({ profileId: profile.id, environment: profile.zenodo?.environment || "sandbox", ...this.zenodo.credential(profile) })) };
  }
  async save(input, expectedRevision) {
    const profile = normalizeProfile(input), { config: config2 } = await readPublicationMetadata(this.store.root);
    resolvePublicationMetadata(profile, config2);
    return this.store.save(profile, expectedRevision);
  }
  async metadata() {
    return (await readPublicationMetadata(this.store.root)).record;
  }
  saveMetadata(input, expectedRevision) {
    return savePublicationMetadata(this.store, input, expectedRevision);
  }
  async doi(profile) {
    const remote = await this.store.remote(profile.id);
    if (remote?.conceptDoi && profile.doi?.conceptDoi && remote.conceptDoi !== profile.doi.conceptDoi) throw new Error("The project or edition work DOI differs from the bound Zenodo work. Reconcile it before continuing.");
    if (profile.doi?.versionDoi || !remote?.versionDoi && profile.doi?.conceptDoi) return { source: "manual", state: "unverified", versionDoi: profile.doi.versionDoi, conceptDoi: profile.doi.conceptDoi, provenance: profile.doi.provenance || "Manually entered in the publication profile; provider registration is not asserted." };
    if (remote?.versionDoi) return { source: "zenodo", state: remote.status === "published" ? "published" : "reserved", versionDoi: remote.versionDoi, conceptDoi: remote.conceptDoi || profile.doi?.conceptDoi, recordId: remote.draftId || remote.recordId, provenance: remote.status === "published" ? "Zenodo publication acknowledgement" : "Zenodo draft DOI reservation; not registered until publication" };
    return { source: "none", state: "none", conceptDoi: profile.doi?.conceptDoi };
  }
  async plan(input) {
    const profile = normalizeProfile(input);
    return (await makePublicationPlan(this.store.root, profile, (value) => this.doi(value), this.options)).plan;
  }
  async build(input, expectedFingerprint, options = {}) {
    const profile = normalizeProfile(input), result = await makePublicationPlan(this.store.root, profile, (value) => this.doi(value), this.options);
    if (!/^[a-f0-9]{64}$/.test(expectedFingerprint) || result.plan.fingerprint !== expectedFingerprint) throw new Error("The publication plan changed. Review a fresh plan before building.");
    return renderPublication(this.store, result.plan, result.snapshot, () => this.plan(profile), this.options, options);
  }
  async status(profileId) {
    const profile = await this.store.profile(profileId);
    if (!profile) throw new Error("Publication profile not found.");
    const builds = await this.store.builds(profileId), repositories = (await Promise.all(builds.map((build) => this.store.repository(profileId, build.id)))).filter(Boolean);
    const target = profile.profile.delivery?.repository;
    return {
      profile,
      metadata: await this.metadata(),
      builds,
      repositories,
      packageRebuilds: await this.packageRebuilder.receipts(profileId),
      repositoryCredential: target ? { configured: target.provider === "git" || !!(this.options.environment || process.env)[target.tokenEnv || (target.provider === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN")], tokenEnv: target.tokenEnv } : void 0,
      remote: await this.store.remote(profileId),
      credential: this.zenodo.credential(profile.profile),
      verifications: await this.store.verifications(profileId)
    };
  }
  async readArtifact(profileId, buildId2, artifact) {
    const bytes = await this.store.artifact(profileId, buildId2, artifact);
    return { bytes, contentType: artifact === "publication.pdf" ? "application/pdf" : artifact.endsWith(".zip") ? "application/zip" : artifact.endsWith(".json") ? "application/json; charset=utf-8" : artifact === "compiled.md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8", fileName: artifact };
  }
  validatePackage(profileId, buildId2, request, options = {}) {
    return this.packageRebuilder.validate(profileId, buildId2, request, options);
  }
  cancelPackageRebuild(profileId, buildId2, manifestSha256) {
    this.packageRebuilder.cancel(profileId, buildId2, manifestSha256);
  }
  reserveDoi(profileId, expectedRevision, options = { mode: "reuse-or-create" }) {
    return this.zenodo.reserve(profileId, expectedRevision, options);
  }
  attachZenodo(profileId, expectedRevision, options) {
    return this.zenodo.attach(profileId, expectedRevision, options);
  }
  reviewUpload(profileId, buildId2, review) {
    return this.zenodo.reviewUpload(profileId, buildId2, review);
  }
  upload(profileId, buildId2, review) {
    return this.zenodo.upload(profileId, buildId2, review);
  }
  async publish(profileId, buildId2, review) {
    const result = await this.zenodo.publish(profileId, buildId2, review);
    return this.withDocumentMilestones(result, profileId, buildId2);
  }
  async withDocumentMilestones(result, profileId, buildId2) {
    try {
      const { recordPublishedDocumentMilestones } = await Promise.resolve().then(() => require("./document-history-sources-LN5AmIT4.js"));
      await recordPublishedDocumentMilestones(this.store.root, profileId, buildId2);
    } catch (error2) {
      return { ...result, milestoneWarning: error2 instanceof Error ? error2.message : String(error2) };
    }
    return result;
  }
  verifyPublished(profileId, buildId2, request) {
    return verifyPublishedEdition(this.store, this.options, profileId, buildId2, request);
  }
  reviewRepository(profileId, buildId2, manifestSha256) {
    return this.repository.review(profileId, buildId2, manifestSha256);
  }
  async publishRepository(profileId, buildId2, review) {
    return this.withDocumentMilestones(await this.repository.publish(profileId, buildId2, review), profileId, buildId2);
  }
  verifyRepository(profileId, buildId2, manifestSha256) {
    return this.repository.verify(profileId, buildId2, manifestSha256);
  }
}
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.FORMAL_KIND_POLICIES = FORMAL_KIND_POLICIES;
exports.FORMAL_TYPE_PATTERN = FORMAL_TYPE_PATTERN;
exports.HASH_ID_RE = HASH_ID_RE;
exports.LeanReviewError = LeanReviewError;
exports.LeanReviewService = LeanReviewService;
exports.MAX_SNAPSHOT_BYTES = MAX_SNAPSHOT_BYTES$1;
exports.MarkdownFence = MarkdownFence;
exports.MarkdownIt = MarkdownIt;
exports.PublicationService = PublicationService;
exports.PublicationStore = PublicationStore;
exports.ReaderWorkspace = ReaderWorkspace;
exports.TMP_ID_RE = TMP_ID_RE;
exports.assertPortablePaths = assertPortablePaths;
exports.buildLeanWorkspace = buildLeanWorkspace;
exports.buildReaderIndex = buildReaderIndex;
exports.buildRuntimeDefinitions = buildRuntimeDefinitions;
exports.captureLeanContracts = captureLeanContracts;
exports.collectLeanDependencies = collectLeanDependencies;
exports.collectResources = collectResources;
exports.displayLabel = displayLabel;
exports.displayNumber = displayNumber;
exports.documentCollectionForPath = documentCollectionForPath;
exports.documentHash = documentHash;
exports.documentSafePath = documentSafePath;
exports.documentState = documentState;
exports.escapeRegExp = escapeRegExp;
exports.findSymbolsInMarkdown = findSymbolsInMarkdown;
exports.formalReviewId = formalReviewId;
exports.formatDisplayNumber = formatDisplayNumber;
exports.formatPageHeading = formatPageHeading;
exports.formatPageReference = formatPageReference;
exports.historyId = historyId;
exports.installedToolchainRoot = installedToolchainRoot;
exports.isHardIgnoredDirectory = isHardIgnoredDirectory;
exports.isPageLabelType = isPageLabelType;
exports.isPedagogicalKind = isPedagogicalKind;
exports.leanProjects = leanProjects;
exports.literalMarkdownMask = literalMarkdownMask;
exports.loadWorkspaceSnapshot = loadWorkspaceSnapshot;
exports.manifestDependencies = manifestDependencies;
exports.maskFencedMarkdown = maskFencedMarkdown;
exports.mergeConfig = mergeConfig;
exports.normalizeDisplayMath = normalizeDisplayMath;
exports.normalizeFormalPagePath = normalizeFormalPagePath;
exports.normalizeLatexSymbol = normalizeLatexSymbol;
exports.normalizeWorkMetadata = normalizeWorkMetadata;
exports.parseFormalMarkerLine = parseFormalMarkerLine;
exports.projectMetadata = projectMetadata;
exports.readDocumentSnapshot = readDocumentSnapshot;
exports.readDocumentState = readDocumentState;
exports.readLeanBuild = readLeanBuild;
exports.readLeanDependencyArtifact = readLeanDependencyArtifact;
exports.readReviewRecord = readReviewRecord;
exports.rebaseMarkdownResources = rebaseMarkdownResources;
exports.relativeInput = relativeInput;
exports.renderAgentGuide = renderAgentGuide;
exports.renderDependencyGraphBridges = renderDependencyGraphBridges;
exports.renderDependencyGraphCycles = renderDependencyGraphCycles;
exports.renderDependencyGraphFocus = renderDependencyGraphFocus;
exports.renderDependencyGraphImpact = renderDependencyGraphImpact;
exports.renderDependencyGraphIsolated = renderDependencyGraphIsolated;
exports.renderDependencyGraphMatrix = renderDependencyGraphMatrix;
exports.renderDependencyGraphSummary = renderDependencyGraphSummary;
exports.renderDependencyGraphUpstream = renderDependencyGraphUpstream;
exports.renderDependencyReport = renderDependencyReport;
exports.renderLeanReport = renderLeanReport;
exports.renderProjectAnalysis = renderProjectAnalysis;
exports.renderReferenceMap = renderReferenceMap;
exports.renderReport = renderReport;
exports.reviewHash = reviewHash;
exports.reviewPathInside = reviewPathInside;
exports.reviewSafePath = reviewSafePath;
exports.safePath = safePath;
exports.saveDocumentSnapshot = saveDocumentSnapshot;
exports.scanFormalDocuments = scanFormalDocuments;
exports.scanLeanWorkspace = scanLeanWorkspace;
exports.shouldExcludeScanPath = shouldExcludeScanPath;
exports.sortManuscriptPages = sortManuscriptPages;
exports.staticFigureMarkdown = staticFigureMarkdown;
exports.stripSolutionAssociation = stripSolutionAssociation;
exports.toPosix = toPosix;
exports.typeName = typeName;
exports.unique = unique$1;
exports.updateDocumentState = updateDocumentState;
exports.validatePublicationMedia = validatePublicationMedia;
exports.validateReviewWorkspace = validateReviewWorkspace;
exports.writeLeanContracts = writeLeanContracts;
