'use strict';

var require$$0$2 = require('path');
var http$1 = require('node:http');
var https = require('node:https');
var zlib = require('node:zlib');
var Stream = require('node:stream');
var node_buffer = require('node:buffer');
var node_util = require('node:util');
var node_url = require('node:url');
var node_net = require('node:net');
require('node:fs');
require('node:path');
var require$$6 = require('crypto');
var require$$0$3 = require('events');
var require$$1$3 = require('util');
var require$$2$2 = require('http');
var require$$3 = require('url');
var require$$1$1 = require('fs');
var require$$1$2 = require('child_process');
var require$$0$1 = require('os');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var require$$0__default$1 = /*#__PURE__*/_interopDefaultLegacy(require$$0$2);
var http__default = /*#__PURE__*/_interopDefaultLegacy(http$1);
var https__default = /*#__PURE__*/_interopDefaultLegacy(https);
var zlib__default = /*#__PURE__*/_interopDefaultLegacy(zlib);
var Stream__default = /*#__PURE__*/_interopDefaultLegacy(Stream);
var require$$6__default = /*#__PURE__*/_interopDefaultLegacy(require$$6);
var require$$0__default$2 = /*#__PURE__*/_interopDefaultLegacy(require$$0$3);
var require$$1__default$2 = /*#__PURE__*/_interopDefaultLegacy(require$$1$3);
var require$$2__default = /*#__PURE__*/_interopDefaultLegacy(require$$2$2);
var require$$3__default = /*#__PURE__*/_interopDefaultLegacy(require$$3);
var require$$1__default = /*#__PURE__*/_interopDefaultLegacy(require$$1$1);
var require$$1__default$1 = /*#__PURE__*/_interopDefaultLegacy(require$$1$2);
var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0$1);

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  var f = n.default;
	if (typeof f == "function") {
		var a = function () {
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var build = {};

// Blake2B, adapted from the reference implementation in RFC7693
// Ported to Javascript by DC - https://github.com/dcposch
// Then ported to typescript by https://github.com/DavidVorick
// 64-bit unsigned addition
// Sets v[a,a+1] += v[b,b+1]
// v should be a Uint32Array
function ADD64AA(v, a, b) {
    const o0 = v[a] + v[b];
    let o1 = v[a + 1] + v[b + 1];
    if (o0 >= 0x100000000) {
        o1++;
    }
    v[a] = o0;
    v[a + 1] = o1;
}
// 64-bit unsigned addition
// Sets v[a,a+1] += b
// b0 is the low 32 bits of b, b1 represents the high 32 bits
function ADD64AC(v, a, b0, b1) {
    let o0 = v[a] + b0;
    if (b0 < 0) {
        o0 += 0x100000000;
    }
    let o1 = v[a + 1] + b1;
    if (o0 >= 0x100000000) {
        o1++;
    }
    v[a] = o0;
    v[a + 1] = o1;
}
// Little-endian byte access
function B2B_GET32(arr, i) {
    return arr[i] ^ (arr[i + 1] << 8) ^ (arr[i + 2] << 16) ^ (arr[i + 3] << 24);
}
// G Mixing function
// The ROTRs are inlined for speed
function B2B_G(a, b, c, d, ix, iy, m, v) {
    const x0 = m[ix];
    const x1 = m[ix + 1];
    const y0 = m[iy];
    const y1 = m[iy + 1];
    ADD64AA(v, a, b); // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
    ADD64AC(v, a, x0, x1); // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits
    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
    let xor0 = v[d] ^ v[a];
    let xor1 = v[d + 1] ^ v[a + 1];
    v[d] = xor1;
    v[d + 1] = xor0;
    ADD64AA(v, c, d);
    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
    xor0 = v[b] ^ v[c];
    xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor0 >>> 24) ^ (xor1 << 8);
    v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);
    ADD64AA(v, a, b);
    ADD64AC(v, a, y0, y1);
    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
    xor0 = v[d] ^ v[a];
    xor1 = v[d + 1] ^ v[a + 1];
    v[d] = (xor0 >>> 16) ^ (xor1 << 16);
    v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);
    ADD64AA(v, c, d);
    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
    xor0 = v[b] ^ v[c];
    xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor1 >>> 31) ^ (xor0 << 1);
    v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
}
// Initialization Vector
const BLAKE2B_IV32 = new Uint32Array([
    0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a, 0xade682d1,
    0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);
const SIGMA8 = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12,
    0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10,
    15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0,
    7, 6, 3, 9, 2, 8, 11, 13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7,
    1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
];
// These are offsets into a uint64 buffer.
// Multiply them all by 2 to make them offsets into a uint32 buffer,
// because this is Javascript and we don't have uint64s
const SIGMA82 = new Uint8Array(SIGMA8.map(function (x) {
    return x * 2;
}));
// Compression function. 'last' flag indicates last block.
// Note we're representing 16 uint64s as 32 uint32s
function blake2bCompress(ctx, last) {
    const v = new Uint32Array(32);
    const m = new Uint32Array(32);
    let i = 0;
    // init work variables
    for (i = 0; i < 16; i++) {
        v[i] = ctx.h[i];
        v[i + 16] = BLAKE2B_IV32[i];
    }
    // low 64 bits of offset
    v[24] = v[24] ^ ctx.t;
    v[25] = v[25] ^ (ctx.t / 0x100000000);
    // high 64 bits not supported, offset may not be higher than 2**53-1
    // last block flag set ?
    if (last) {
        v[28] = ~v[28];
        v[29] = ~v[29];
    }
    // get little-endian words
    for (i = 0; i < 32; i++) {
        m[i] = B2B_GET32(ctx.b, 4 * i);
    }
    // twelve rounds of mixing
    for (i = 0; i < 12; i++) {
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1], m, v);
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3], m, v);
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5], m, v);
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7], m, v);
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9], m, v);
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11], m, v);
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13], m, v);
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15], m, v);
    }
    for (i = 0; i < 16; i++) {
        ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
    }
}
// Creates a BLAKE2b hashing context
// Requires an output length between 1 and 64 bytes
function blake2bInit() {
    // state, 'param block'
    const ctx = {
        b: new Uint8Array(128),
        h: new Uint32Array(16),
        t: 0,
        c: 0,
        outlen: 32, // output length in bytes
    };
    // initialize hash state
    for (let i = 0; i < 16; i++) {
        ctx.h[i] = BLAKE2B_IV32[i];
    }
    ctx.h[0] ^= 0x01010000 ^ 32;
    return ctx;
}
// Updates a BLAKE2b streaming hash
// Requires hash context and Uint8Array (byte array)
function blake2bUpdate(ctx, input) {
    for (let i = 0; i < input.length; i++) {
        if (ctx.c === 128) {
            // buffer full ?
            ctx.t += ctx.c; // add counters
            blake2bCompress(ctx, false); // compress (not last)
            ctx.c = 0; // counter to zero
        }
        ctx.b[ctx.c++] = input[i];
    }
}
// Completes a BLAKE2b streaming hash
// Returns a Uint8Array containing the message digest
function blake2bFinal(ctx) {
    ctx.t += ctx.c; // mark last block offset
    while (ctx.c < 128) {
        // fill up with zeros
        ctx.b[ctx.c++] = 0;
    }
    blake2bCompress(ctx, true); // final block flag = 1
    // little endian convert and store
    const out = new Uint8Array(ctx.outlen);
    for (let i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
    }
    return out;
}
// Computes the blake2b hash of the input. Returns 32 bytes.
let blake2b = function (input) {
    const ctx = blake2bInit();
    blake2bUpdate(ctx, input);
    return blake2bFinal(ctx);
};

const defaultPortalList = ["https://siasky.net", "https://web3portal.com"];

// DICTIONARY_UNIQUE_PREFIX defines the number of characters that are
// guaranteed to be unique for each word in the dictionary. The seed code only
// looks at these three characters when parsing a word, allowing users to make
// substitutions for words if they prefer or find it easier to memorize.
const DICTIONARY_UNIQUE_PREFIX = 3;
// dictionary contains the word list for the mysky seed.
const dictionary = [
    "abbey",
    "ablaze",
    "abort",
    "absorb",
    "abyss",
    "aces",
    "aching",
    "acidic",
    "across",
    "acumen",
    "adapt",
    "adept",
    "adjust",
    "adopt",
    "adult",
    "aerial",
    "afar",
    "affair",
    "afield",
    "afloat",
    "afoot",
    "afraid",
    "after",
    "agenda",
    "agile",
    "aglow",
    "agony",
    "agreed",
    "ahead",
    "aided",
    "aisle",
    "ajar",
    "akin",
    "alarms",
    "album",
    "alerts",
    "alley",
    "almost",
    "aloof",
    "alpine",
    "also",
    "alumni",
    "always",
    "amaze",
    "ambush",
    "amidst",
    "ammo",
    "among",
    "amply",
    "amused",
    "anchor",
    "angled",
    "ankle",
    "antics",
    "anvil",
    "apart",
    "apex",
    "aphid",
    "aplomb",
    "apply",
    "archer",
    "ardent",
    "arena",
    "argue",
    "arises",
    "army",
    "around",
    "arrow",
    "ascend",
    "aside",
    "asked",
    "asleep",
    "aspire",
    "asylum",
    "atlas",
    "atom",
    "atrium",
    "attire",
    "auburn",
    "audio",
    "august",
    "aunt",
    "autumn",
    "avatar",
    "avidly",
    "avoid",
    "awful",
    "awning",
    "awoken",
    "axes",
    "axis",
    "axle",
    "aztec",
    "azure",
    "baby",
    "bacon",
    "badge",
    "bailed",
    "bakery",
    "bamboo",
    "banjo",
    "basin",
    "batch",
    "bawled",
    "bays",
    "beer",
    "befit",
    "begun",
    "behind",
    "being",
    "below",
    "bested",
    "bevel",
    "beware",
    "beyond",
    "bias",
    "bids",
    "bikini",
    "birth",
    "bite",
    "blip",
    "boat",
    "bodies",
    "bogeys",
    "boil",
    "boldly",
    "bomb",
    "border",
    "boss",
    "both",
    "bovine",
    "boxes",
    "broken",
    "brunt",
    "bubble",
    "budget",
    "buffet",
    "bugs",
    "bulb",
    "bumper",
    "bunch",
    "butter",
    "buying",
    "buzzer",
    "byline",
    "bypass",
    "cabin",
    "cactus",
    "cadets",
    "cafe",
    "cage",
    "cajun",
    "cake",
    "camp",
    "candy",
    "casket",
    "catch",
    "cause",
    "cease",
    "cedar",
    "cell",
    "cement",
    "cent",
    "chrome",
    "cider",
    "cigar",
    "cinema",
    "circle",
    "claim",
    "click",
    "clue",
    "coal",
    "cobra",
    "cocoa",
    "code",
    "coffee",
    "cogs",
    "coils",
    "colony",
    "comb",
    "cool",
    "copy",
    "cousin",
    "cowl",
    "cube",
    "cuffs",
    "custom",
    "dads",
    "daft",
    "dagger",
    "daily",
    "damp",
    "dapper",
    "darted",
    "dash",
    "dating",
    "dawn",
    "dazed",
    "debut",
    "decay",
    "deftly",
    "deity",
    "dented",
    "depth",
    "desk",
    "devoid",
    "dice",
    "diet",
    "digit",
    "dilute",
    "dime",
    "dinner",
    "diode",
    "ditch",
    "divers",
    "dizzy",
    "doctor",
    "dodge",
    "does",
    "dogs",
    "doing",
    "donuts",
    "dosage",
    "dotted",
    "double",
    "dove",
    "down",
    "dozen",
    "dreams",
    "drinks",
    "drunk",
    "drying",
    "dual",
    "dubbed",
    "dude",
    "duets",
    "duke",
    "dummy",
    "dunes",
    "duplex",
    "dusted",
    "duties",
    "dwarf",
    "dwelt",
    "dying",
    "each",
    "eagle",
    "earth",
    "easy",
    "eating",
    "echo",
    "eden",
    "edgy",
    "edited",
    "eels",
    "eggs",
    "eight",
    "either",
    "eject",
    "elapse",
    "elbow",
    "eldest",
    "eleven",
    "elite",
    "elope",
    "else",
    "eluded",
    "emails",
    "ember",
    "emerge",
    "emit",
    "empty",
    "energy",
    "enigma",
    "enjoy",
    "enlist",
    "enmity",
    "enough",
    "ensign",
    "envy",
    "epoxy",
    "equip",
    "erase",
    "error",
    "estate",
    "etched",
    "ethics",
    "excess",
    "exhale",
    "exit",
    "exotic",
    "extra",
    "exult",
    "fading",
    "faked",
    "fall",
    "family",
    "fancy",
    "fatal",
    "faulty",
    "fawns",
    "faxed",
    "fazed",
    "feast",
    "feel",
    "feline",
    "fences",
    "ferry",
    "fever",
    "fewest",
    "fiat",
    "fibula",
    "fidget",
    "fierce",
    "fight",
    "films",
    "firm",
    "five",
    "fixate",
    "fizzle",
    "fleet",
    "flying",
    "foamy",
    "focus",
    "foes",
    "foggy",
    "foiled",
    "fonts",
    "fossil",
    "fowls",
    "foxes",
    "foyer",
    "framed",
    "frown",
    "fruit",
    "frying",
    "fudge",
    "fuel",
    "fully",
    "fuming",
    "fungal",
    "future",
    "fuzzy",
    "gables",
    "gadget",
    "gags",
    "gained",
    "galaxy",
    "gambit",
    "gang",
    "gasp",
    "gather",
    "gauze",
    "gave",
    "gawk",
    "gaze",
    "gecko",
    "geek",
    "gels",
    "germs",
    "geyser",
    "ghetto",
    "ghost",
    "giant",
    "giddy",
    "gifts",
    "gills",
    "ginger",
    "girth",
    "giving",
    "glass",
    "glide",
    "gnaw",
    "gnome",
    "goat",
    "goblet",
    "goes",
    "going",
    "gone",
    "gopher",
    "gossip",
    "gotten",
    "gown",
    "grunt",
    "guest",
    "guide",
    "gulp",
    "guru",
    "gusts",
    "gutter",
    "guys",
    "gypsy",
    "gyrate",
    "hairy",
    "having",
    "hawk",
    "hazard",
    "heels",
    "hefty",
    "height",
    "hence",
    "heron",
    "hiding",
    "hijack",
    "hiker",
    "hills",
    "hinder",
    "hippo",
    "hire",
    "hive",
    "hoax",
    "hobby",
    "hockey",
    "hold",
    "honked",
    "hookup",
    "hope",
    "hornet",
    "hotel",
    "hover",
    "howls",
    "huddle",
    "huge",
    "hull",
    "humid",
    "hunter",
    "huts",
    "hybrid",
    "hyper",
    "icing",
    "icon",
    "idiom",
    "idled",
    "idols",
    "igloo",
    "ignore",
    "iguana",
    "impel",
    "incur",
    "injury",
    "inline",
    "inmate",
    "input",
    "insult",
    "invoke",
    "ionic",
    "irate",
    "iris",
    "irony",
    "island",
    "issued",
    "itches",
    "items",
    "itself",
    "ivory",
    "jabbed",
    "jaded",
    "jagged",
    "jailed",
    "jargon",
    "jaunt",
    "jaws",
    "jazz",
    "jeans",
    "jeers",
    "jester",
    "jewels",
    "jigsaw",
    "jingle",
    "jive",
    "jobs",
    "jockey",
    "jogger",
    "joking",
    "jolted",
    "jostle",
    "joyous",
    "judge",
    "juicy",
    "july",
    "jump",
    "junk",
    "jury",
    "karate",
    "keep",
    "kennel",
    "kept",
    "kettle",
    "king",
    "kiosk",
    "kisses",
    "kiwi",
    "knee",
    "knife",
    "koala",
    "ladder",
    "lagoon",
    "lair",
    "lakes",
    "lamb",
    "laptop",
    "large",
    "last",
    "later",
    "lava",
    "layout",
    "lazy",
    "ledge",
    "leech",
    "left",
    "legion",
    "lemon",
    "lesson",
    "liar",
    "licks",
    "lids",
    "lied",
    "light",
    "lilac",
    "limits",
    "linen",
    "lion",
    "liquid",
    "listen",
    "lively",
    "loaded",
    "locker",
    "lodge",
    "lofty",
    "logic",
    "long",
    "lopped",
    "losing",
    "loudly",
    "love",
    "lower",
    "loyal",
    "lucky",
    "lumber",
    "lunar",
    "lurk",
    "lush",
    "luxury",
    "lymph",
    "lynx",
    "lyrics",
    "macro",
    "mailed",
    "major",
    "makeup",
    "malady",
    "mammal",
    "maps",
    "match",
    "maul",
    "mayor",
    "maze",
    "meant",
    "memoir",
    "menu",
    "merger",
    "mesh",
    "metro",
    "mews",
    "mice",
    "midst",
    "mighty",
    "mime",
    "mirror",
    "misery",
    "moat",
    "mobile",
    "mocked",
    "mohawk",
    "molten",
    "moment",
    "money",
    "moon",
    "mops",
    "morsel",
    "mostly",
    "mouth",
    "mowing",
    "much",
    "muddy",
    "muffin",
    "mugged",
    "mullet",
    "mumble",
    "muppet",
    "mural",
    "muzzle",
    "myriad",
    "myth",
    "nagged",
    "nail",
    "names",
    "nanny",
    "napkin",
    "nasty",
    "navy",
    "nearby",
    "needed",
    "neon",
    "nephew",
    "nerves",
    "nestle",
    "never",
    "newt",
    "nexus",
    "nibs",
    "niche",
    "niece",
    "nifty",
    "nimbly",
    "nobody",
    "nodes",
    "noises",
    "nomad",
    "noted",
    "nouns",
    "nozzle",
    "nuance",
    "nudged",
    "nugget",
    "null",
    "number",
    "nuns",
    "nurse",
    "nylon",
    "oaks",
    "oars",
    "oasis",
    "object",
    "occur",
    "ocean",
    "odds",
    "offend",
    "often",
    "okay",
    "older",
    "olive",
    "omega",
    "onion",
    "online",
    "onto",
    "onward",
    "oozed",
    "opened",
    "opus",
    "orange",
    "orbit",
    "orchid",
    "orders",
    "organs",
    "origin",
    "oscar",
    "otter",
    "ouch",
    "ought",
    "ounce",
    "oust",
    "oval",
    "oven",
    "owed",
    "owls",
    "owner",
    "oxygen",
    "oyster",
    "ozone",
    "pact",
    "pager",
    "palace",
    "paper",
    "pastry",
    "patio",
    "pause",
    "peeled",
    "pegs",
    "pencil",
    "people",
    "pepper",
    "pests",
    "petals",
    "phase",
    "phone",
    "piano",
    "picked",
    "pierce",
    "pimple",
    "pirate",
    "pivot",
    "pixels",
    "pizza",
    "pledge",
    "pliers",
    "plus",
    "poetry",
    "point",
    "poker",
    "polar",
    "ponies",
    "pool",
    "potato",
    "pouch",
    "powder",
    "pram",
    "pride",
    "pruned",
    "prying",
    "public",
    "puck",
    "puddle",
    "puffin",
    "pulp",
    "punch",
    "puppy",
    "purged",
    "push",
    "putty",
    "pylons",
    "python",
    "queen",
    "quick",
    "quote",
    "radar",
    "rafts",
    "rage",
    "raking",
    "rally",
    "ramped",
    "rapid",
    "rarest",
    "rash",
    "rated",
    "ravine",
    "rays",
    "razor",
    "react",
    "rebel",
    "recipe",
    "reduce",
    "reef",
    "refer",
    "reheat",
    "relic",
    "remedy",
    "repent",
    "reruns",
    "rest",
    "return",
    "revamp",
    "rewind",
    "rhino",
    "rhythm",
    "ribbon",
    "richly",
    "ridges",
    "rift",
    "rigid",
    "rims",
    "riots",
    "ripped",
    "rising",
    "ritual",
    "river",
    "roared",
    "robot",
    "rodent",
    "rogue",
    "roles",
    "roomy",
    "roped",
    "roster",
    "rotate",
    "rover",
    "royal",
    "ruby",
    "rudely",
    "rugged",
    "ruined",
    "ruling",
    "rumble",
    "runway",
    "rural",
    "sack",
    "safety",
    "saga",
    "sailor",
    "sake",
    "salads",
    "sample",
    "sanity",
    "sash",
    "satin",
    "saved",
    "scenic",
    "school",
    "scoop",
    "scrub",
    "scuba",
    "second",
    "sedan",
    "seeded",
    "setup",
    "sewage",
    "sieve",
    "silk",
    "sipped",
    "siren",
    "sizes",
    "skater",
    "skew",
    "skulls",
    "slid",
    "slower",
    "slug",
    "smash",
    "smog",
    "snake",
    "sneeze",
    "sniff",
    "snout",
    "snug",
    "soapy",
    "sober",
    "soccer",
    "soda",
    "soggy",
    "soil",
    "solved",
    "sonic",
    "soothe",
    "sorry",
    "sowed",
    "soya",
    "space",
    "speedy",
    "sphere",
    "spout",
    "sprig",
    "spud",
    "spying",
    "square",
    "stick",
    "subtly",
    "suede",
    "sugar",
    "summon",
    "sunken",
    "surfer",
    "sushi",
    "suture",
    "swept",
    "sword",
    "swung",
    "system",
    "taboo",
    "tacit",
    "tagged",
    "tail",
    "taken",
    "talent",
    "tamper",
    "tanks",
    "tasked",
    "tattoo",
    "taunts",
    "tavern",
    "tawny",
    "taxi",
    "tell",
    "tender",
    "tepid",
    "tether",
    "thaw",
    "thorn",
    "thumbs",
    "thwart",
    "ticket",
    "tidy",
    "tiers",
    "tiger",
    "tilt",
    "timber",
    "tinted",
    "tipsy",
    "tirade",
    "tissue",
    "titans",
    "today",
    "toffee",
    "toilet",
    "token",
    "tonic",
    "topic",
    "torch",
    "tossed",
    "total",
    "touchy",
    "towel",
    "toxic",
    "toyed",
    "trash",
    "trendy",
    "tribal",
    "truth",
    "trying",
    "tubes",
    "tucks",
    "tudor",
    "tufts",
    "tugs",
    "tulips",
    "tunnel",
    "turnip",
    "tusks",
    "tutor",
    "tuxedo",
    "twang",
    "twice",
    "tycoon",
    "typist",
    "tyrant",
    "ugly",
    "ulcers",
    "umpire",
    "uncle",
    "under",
    "uneven",
    "unfit",
    "union",
    "unmask",
    "unrest",
    "unsafe",
    "until",
    "unveil",
    "unwind",
    "unzip",
    "upbeat",
    "update",
    "uphill",
    "upkeep",
    "upload",
    "upon",
    "upper",
    "urban",
    "urgent",
    "usage",
    "useful",
    "usher",
    "using",
    "usual",
    "utmost",
    "utopia",
    "vague",
    "vain",
    "value",
    "vane",
    "vary",
    "vats",
    "vaults",
    "vector",
    "veered",
    "vegan",
    "vein",
    "velvet",
    "vessel",
    "vexed",
    "vials",
    "victim",
    "video",
    "viking",
    "violin",
    "vipers",
    "vitals",
    "vivid",
    "vixen",
    "vocal",
    "vogue",
    "voice",
    "vortex",
    "voted",
    "vowels",
    "voyage",
    "wade",
    "waffle",
    "waist",
    "waking",
    "wanted",
    "warped",
    "water",
    "waxing",
    "wedge",
    "weird",
    "went",
    "wept",
    "were",
    "whale",
    "when",
    "whole",
    "width",
    "wield",
    "wife",
    "wiggle",
    "wildly",
    "winter",
    "wiring",
    "wise",
    "wives",
    "wizard",
    "wobbly",
    "woes",
    "woken",
    "wolf",
    "woozy",
    "worry",
    "woven",
    "wrap",
    "wrist",
    "wrong",
    "yacht",
    "yahoo",
    "yanks",
];

var dictionary$1 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	DICTIONARY_UNIQUE_PREFIX: DICTIONARY_UNIQUE_PREFIX,
	dictionary: dictionary
});

// tryStringify will try to turn the provided input into a string. If the input
// object is already a string, the input object will be returned. If the input
// object has a toString method, the toString method will be called. If that
// fails, we try to call JSON.stringify on the object. And if that fails, we
// set the return value to "[stringify failed]".
function tryStringify$1(obj) {
    // Check for undefined input.
    if (obj === undefined) {
        return "[cannot stringify undefined input]";
    }
    if (obj === null) {
        return "[null]";
    }
    // Parse the error into a string.
    if (typeof obj === "string") {
        return obj;
    }
    // Check if the object has a 'toString' method defined on it. To ensure
    // that we don't crash or throw, check that the toString is a function, and
    // also that the return value of toString is a string.
    if (Object.prototype.hasOwnProperty.call(obj, "toString")) {
        if (typeof obj.toString === "function") {
            let str = obj.toString();
            if (typeof str === "string") {
                return str;
            }
        }
    }
    // If the object does not have a custom toString, attempt to perform a
    // JSON.stringify.
    try {
        return JSON.stringify(obj);
    }
    catch {
        return "[stringify failed]";
    }
}

// addContextToErr is a helper function that standardizes the formatting of
// adding context to an error. Within the world of go we discovered that being
// persistent about layering context onto errors is helpful when debugging,
// even though it often creates rather verbose error messages.
//
// addContextToErr will return null if the input err is null.
//
// NOTE: To protect against accidental situations where an Error type or some
// other type is provided instead of a string, we wrap both of the inputs with
// tryStringify before returning them. This prevents runtime failures.
function addContextToErr$1(err, context) {
    if (err === null) {
        err = "[no error provided]";
    }
    err = tryStringify$1(err);
    return tryStringify$1(context) + ": " + tryStringify$1(err);
}
// composeErr takes a series of inputs and composes them into a single string.
// Each element will be separated by a newline. If the input is not a string,
// it will be transformed into a string with JSON.stringify.
//
// Any object that cannot be stringified will be skipped, though an error will
// be logged.
function composeErr$1(...inputs) {
    let result = "";
    let resultEmpty = true;
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] === null) {
            continue;
        }
        if (resultEmpty) {
            resultEmpty = false;
        }
        else {
            result += "\n";
        }
        result += tryStringify$1(inputs[i]);
    }
    if (resultEmpty) {
        return null;
    }
    return result;
}

// Helper consts to make it easy to return empty values alongside errors.
const nu8$7 = new Uint8Array(0);
// b64ToBuf will take an untrusted base64 string and convert it into a
// Uin8Array, returning an error if the input is not valid base64.
function b64ToBuf(b64) {
    // Check that the final string is valid base64.
    let b64regex = /^[0-9a-zA-Z-_/+=]*$/;
    if (!b64regex.test(b64)) {
        return [nu8$7, "provided string is not valid base64"];
    }
    // Swap any '-' characters for '+', and swap any '_' characters for '/'
    // for use in the atob function.
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    // Perform the conversion.
    let binStr = atob(b64);
    let len = binStr.length;
    let buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = binStr.charCodeAt(i);
    }
    return [buf, null];
}
// bufToHex takes a Uint8Array as input and returns the hex encoding of those
// bytes as a string.
function bufToHex(buf) {
    return [...buf].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// bufToB64 will convert a Uint8Array to a base64 string with URL encoding and
// no padding characters.
function bufToB64$1(buf) {
    let b64Str = btoa(String.fromCharCode.apply(null, buf));
    return b64Str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
// bufToStr takes an ArrayBuffer as input and returns a text string. bufToStr
// will check for invalid characters.
function bufToStr(buf) {
    try {
        let text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
        return [text, null];
    }
    catch (err) {
        return ["", addContextToErr$1(err.toString(), "unable to decode ArrayBuffer to string")];
    }
}
// decodeBigint will take an 8 byte Uint8Array and decode it as a bigint.
function decodeBigint(buf) {
    if (buf.length !== 8) {
        return [0n, "a number is expected to be 8 bytes"];
    }
    let num = 0n;
    for (let i = 7; i >= 0; i--) {
        num *= 256n;
        num += BigInt(buf[i]);
    }
    return [num, null];
}
// encodePrefixedBytes takes a Uint8Array as input and returns a Uint8Array
// that has the length prefixed as an 8 byte prefix. The input can be at most 4
// GiB.
function encodePrefixedBytes(bytes) {
    let len = bytes.length;
    if (len > 4294968295) {
        return [nu8$7, "input is too large to be encoded"];
    }
    let buf = new ArrayBuffer(8 + len);
    let view = new DataView(buf);
    view.setUint32(0, len, true);
    let uint8Bytes = new Uint8Array(buf);
    uint8Bytes.set(bytes, 8);
    return [uint8Bytes, null];
}
// encodeU64 will encode a bigint in the range of a uint64 to an 8 byte
// Uint8Array.
function encodeU64$1(num) {
    // Check the bounds on the bigint.
    if (num < 0) {
        return [nu8$7, "expected a positive integer"];
    }
    if (num > 18446744073709551615n) {
        return [nu8$7, "expected a number no larger than a uint64"];
    }
    // Encode the bigint into a Uint8Array.
    let encoded = new Uint8Array(8);
    for (let i = 0; i < encoded.length; i++) {
        let byte = Number(num & 0xffn);
        encoded[i] = byte;
        num = num >> 8n;
    }
    return [encoded, null];
}
// hexToBuf takes an untrusted string as input, verifies that the string is
// valid hex, and then converts the string to a Uint8Array.
function hexToBuf(hex) {
    // Check that the length makes sense.
    if (hex.length % 2 != 0) {
        return [nu8$7, "input has incorrect length"];
    }
    // Check that all of the characters are legal.
    let match = /[0-9A-Fa-f]*/g;
    if (!match.test(hex)) {
        return [nu8$7, "input has invalid character"];
    }
    // Create the buffer and fill it.
    let matches = hex.match(/.{1,2}/g);
    if (matches === null) {
        return [nu8$7, "input is incomplete"];
    }
    let u8 = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    return [u8, null];
}

// Helper values for cleanly returning errors.
const nu8$6 = new Uint8Array(0);
// blake2bAddSubtreeToProofStack will add a subtree to a proof stack.
function blake2bAddSubtreeToProofStack(ps, subtreeRoot, subtreeHeight) {
    // Input checking.
    if (subtreeRoot.length !== 32) {
        return "cannot add subtree because root is wrong length";
    }
    // If the proofStack has no elements in it yet, add the subtree
    // with no further checks.
    if (ps.subtreeRoots.length === 0) {
        ps.subtreeRoots.push(subtreeRoot);
        ps.subtreeHeights.push(subtreeHeight);
        return null;
    }
    // Check the height of the new subtree against the height of the smallest
    // subtree in the proofStack. If the new subtree is larger, the subtree
    // cannot be added.
    let maxHeight = ps.subtreeHeights[ps.subtreeHeights.length - 1];
    if (subtreeHeight > maxHeight) {
        return `cannot add a subtree that is taller ${subtreeHeight} than the smallest ${maxHeight} subtree in the stack`;
    }
    // If the new subtreeHeight is smaller than the max height, we can just
    // append the subtree height without doing anything more.
    if (subtreeHeight < maxHeight) {
        ps.subtreeRoots.push(subtreeRoot);
        ps.subtreeHeights.push(subtreeHeight);
        return null;
    }
    // If the new subtree is the same height as the smallest subtree, we
    // have to pull the smallest subtree out, combine it with the new
    // subtree, and push the result.
    let oldSTR = ps.subtreeRoots.pop();
    ps.subtreeHeights.pop(); // We already have the height.
    let combinedRoot = new Uint8Array(65);
    combinedRoot[0] = 1;
    combinedRoot.set(oldSTR, 1);
    combinedRoot.set(subtreeRoot, 33);
    let newSubtreeRoot = blake2b(combinedRoot);
    return blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, subtreeHeight + 1n);
}
// blake2bAddLeafBytesToProofStack will add a leaf to a proof stack.
function blake2bAddLeafBytesToProofStack(ps, leafBytes) {
    if (leafBytes.length !== 64) {
        return "proofStack expects leafByte objects to be exactly 64 bytes";
    }
    let taggedBytes = new Uint8Array(65);
    taggedBytes.set(leafBytes, 1);
    let subtreeRoot = blake2b(taggedBytes);
    return blake2bAddSubtreeToProofStack(ps, subtreeRoot, 1n);
}
// blake2bProofStackRoot returns the final Merkle root of the data in the
// current proof stack.
function blake2bProofStackRoot(ps) {
    // Input checking.
    if (ps.subtreeRoots.length === 0) {
        return [nu8$6, "cannot compute the Merkle root of an empty data set"];
    }
    // Algorithm is pretty basic, start with the final tree, and then add
    // it to the previous tree. Repeat until there are no more trees.
    let baseSubtreeRoot = ps.subtreeRoots.pop();
    while (ps.subtreeRoots.length !== 0) {
        let nextSubtreeRoot = ps.subtreeRoots.pop();
        let combinedRoot = new Uint8Array(65);
        combinedRoot[0] = 1;
        combinedRoot.set(baseSubtreeRoot, 1);
        combinedRoot.set(nextSubtreeRoot, 33);
        baseSubtreeRoot = blake2b(combinedRoot);
    }
    return [baseSubtreeRoot, null];
}
// nextSubtreeHeight returns the height of the largest subtree that contains
// 'start', contains no elements prior to 'start', and also does not contain
// 'end'.
function nextSubtreeHeight(start, end) {
    // Input checking.
    if (end <= start) {
        return [0n, 0n, `end (${end}) must be strictly larger than start (${start})`];
    }
    // Merkle trees have a nice mathematical property that the largest tree
    // which contains a particular node and no nodes prior to it will have
    // a height that is equal to the number of trailing zeroes in the base
    // 2 representation of the index of that node.
    //
    // We are exploiting that property to compute the 'idealTreeHeight'. If
    // 'start' is zero, the ideal tree height will just keep counting up
    // forever, so we cut it off at 53.
    let idealTreeHeight = 1n;
    let idealTreeSize = 1n;
    // The conditional inside the loop tests if the next ideal tree size is
    // acceptable. If it is, we increment the height and double the size.
    while (start % (idealTreeSize * 2n) === 0n) {
        idealTreeHeight++;
        idealTreeSize = idealTreeSize * 2n;
    }
    // To compute the max tree height, we essentially just find the largest
    // power of 2 that is smaller than or equal to the gap between start
    // and end.
    let maxTreeHeight = 1n;
    let maxTreeSize = 1n;
    let range = end - start + 1n;
    while (maxTreeSize * 2n < range) {
        maxTreeHeight++;
        maxTreeSize = maxTreeSize * 2n;
    }
    // Return the smaller of the ideal height and the max height, as each
    // of them is an upper bound on how large things are allowed to be.
    if (idealTreeHeight < maxTreeHeight) {
        return [idealTreeHeight, idealTreeSize, null];
    }
    return [maxTreeHeight, maxTreeSize, null];
}
// blake2bMerkleRoot computes the merkle root of the provided data using a leaf
// size of 64 bytes and blake2b as the hashing function.
function blake2bMerkleRoot(data) {
    // Check that the input is an acceptable length.
    if (data.length % 64 !== 0) {
        return [nu8$6, "cannot take the merkle root of data that is not a multiple of 64 bytes"];
    }
    // Compute the Merkle root.
    let ps = {
        subtreeRoots: [],
        subtreeHeights: [],
    };
    for (let i = 0; i < data.length; i += 64) {
        blake2bAddLeafBytesToProofStack(ps, data.slice(i, i + 64));
    }
    return blake2bProofStackRoot(ps);
}
// blake2bVerifySectorRangeProof will verify a merkle proof that the provided
// data exists within the provided sector at the provided range.
//
// NOTE: This implementation only handles a single range, but the transition to
// doing mulit-range proofs is not very large. The main reason I didn't extend
// this function was because it made the inputs a lot messier. The Sia merkle
// tree repo uses the same techniques and has the full implementation, use that
// as a reference if you need to extend this function to support multi-range
// proofs.
function blake2bVerifySectorRangeProof(root, data, rangeStart, rangeEnd, proof) {
    // Verify the inputs.
    if (root.length !== 32) {
        return "provided root is not a blake2b sector root";
    }
    if (rangeEnd <= rangeStart) {
        return "provided has no data";
    }
    if (rangeStart < 0n) {
        return "cannot use negative ranges";
    }
    if (rangeEnd > 4194304n) {
        return "range is out of bounds";
    }
    if (proof.length % 32 !== 0) {
        return "merkle proof has invalid length";
    }
    if (data.length !== Number(rangeEnd - rangeStart)) {
        return "data length does not match provided range";
    }
    if (data.length % 64 !== 0) {
        return "data must have a multiple of 64 bytes";
    }
    // We will consume proof elements until we get to the rangeStart of the
    // data.
    let ps = {
        subtreeRoots: [],
        subtreeHeights: [],
    };
    let currentOffset = 0n;
    let proofOffset = 0;
    while (currentOffset < rangeStart) {
        if (proof.length < proofOffset + 32) {
            return "merkle proof has insufficient data";
        }
        let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64n, rangeStart / 64n);
        if (errNST !== null) {
            return addContextToErr$1(errNST, "error computing subtree height of initial proof stack");
        }
        let newSubtreeRoot = new Uint8Array(32);
        newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
        proofOffset += 32;
        let errSPS = blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, height);
        if (errSPS !== null) {
            return addContextToErr$1(errSPS, "error adding subtree to initial proof stack");
        }
        currentOffset += size * 64n;
    }
    // We will consume data elements until we get to the end of the data.
    let dataOffset = 0;
    while (data.length > dataOffset) {
        let errLBPS = blake2bAddLeafBytesToProofStack(ps, data.slice(dataOffset, dataOffset + 64));
        if (errLBPS !== null) {
            return addContextToErr$1(errLBPS, "error adding leaves to proof stack");
        }
        dataOffset += 64;
        currentOffset += 64n;
    }
    // Consume proof elements until the entire sector is proven.
    let sectorEnd = 4194304n;
    while (currentOffset < sectorEnd) {
        if (proof.length < proofOffset + 32) {
            return "merkle proof has insufficient data";
        }
        let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64n, sectorEnd / 64n);
        if (errNST !== null) {
            return addContextToErr$1(errNST, "error computing subtree height of trailing proof stack");
        }
        let newSubtreeRoot = new Uint8Array(32);
        newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
        proofOffset += 32;
        let errSPS = blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, height);
        if (errSPS !== null) {
            return addContextToErr$1(errSPS, "error adding subtree to trailing proof stack");
        }
        currentOffset += size * 64n;
    }
    return null;
}

// Helper consts to make it easier to return empty values in the event of an
// error.
const nu8$5 = new Uint8Array(0);
// verifyDownload will verify a download response from a portal. The input is
// essentially components of a skylink - the offset, length, and merkle root.
// The output is the raw file data.
//
// The 'buf' input should match the standard response body of a verified
// download request to a portal, which is the skylink raw data followed by a
// merkle proof. The offset and length provided as input indicate the offset
// and length of the skylink raw data - not the offset and length of the
// request within the file (that would be a different set of params).
//
// The skylink raw data itself breaks down into a metadata component and a file
// component. The metadata component will contain information like the length
// of the real file, and any fanout structure for large files. The first step
// we need to take is verifying the Merkel proof, which will appear at the end
// of the buffer. We'll have to hash the data we received and then compare it
// against the Merkle proof and ensure it matches the data we are expecting.
// Then we'll have to look at the layout to figure out which pieces of the data
// are the full file, while also checking for corruption as the file can be
// malicious independent of the portal operator.
//
// As long as the Merkle proof matches the root, offset, and length that we
// have as input, the portal is considered non-malicious. Any additional errors
// we find after that can be considered malice or incompetence on the part of
// the person who uploaded the file.
function verifyDownload(root, offset, fetchSize, buf) {
    let u8 = new Uint8Array(buf);
    // Input checking. If any of this is incorrect, its safe to blame the
    // server because the skylink format fundamentally should enable these
    // to be correct.
    if (u8.length < fetchSize) {
        return [nu8$5, true, "provided data is not large enough to cover fetchSize"];
    }
    if (u8.length < 99) {
        return [nu8$5, true, "provided data is not large enough to contain a skyfile"];
    }
    // Grab the skylinkData and Merkle proof from the array, and then
    // verify the Merkle proof.
    let skylinkData = u8.slice(0, Number(fetchSize));
    let merkleProof = u8.slice(Number(fetchSize), u8.length);
    let errVBSRP = blake2bVerifySectorRangeProof(root, skylinkData, offset, fetchSize, merkleProof);
    if (errVBSRP !== null) {
        return [nu8$5, true, addContextToErr$1(errVBSRP, "provided Merkle proof is not valid")];
    }
    // Up until this point, an error indicated that the portal was at fault for
    // either returning the wrong data or otherwise providing a malformed
    // repsonse. The remaining checks relate to the consistency of the file
    // itself, if the file is corrupt but the hash matches, there will be an
    // error and the portal will not be at fault.
    // The organization of the skylinkData is always:
    // 	layoutBytes || fanoutBytes || metadataBytes || fileBytes
    //
    // The layout is always exactly 99 bytes. Bytes [1,8] of the layout
    // contain the exact size of the fileBytes. Bytes [9, 16] of the layout
    // contain the exact size of the metadata. And bytes [17,24] of the
    // layout contain the exact size of the fanout. To get the offset of
    // the fileData, we need to extract the sizes of the metadata and
    // fanout, and then add those values to 99 to get the fileData offset.
    let fileSizeBytes = skylinkData.slice(1, 9);
    let mdSizeBytes = skylinkData.slice(9, 17);
    let fanoutSizeBytes = skylinkData.slice(17, 25);
    let [fileSize, errFSDN] = decodeBigint(fileSizeBytes);
    if (errFSDN !== null) {
        return [nu8$5, false, addContextToErr$1(errFSDN, "unable to decode filesize")];
    }
    let [mdSize, errMDDN] = decodeBigint(mdSizeBytes);
    if (errMDDN !== null) {
        return [nu8$5, false, addContextToErr$1(errMDDN, "unable to decode metadata size")];
    }
    let [fanoutSize, errFODN] = decodeBigint(fanoutSizeBytes);
    if (errFODN !== null) {
        return [nu8$5, false, addContextToErr$1(errFODN, "unable to decode fanout size")];
    }
    if (BigInt(skylinkData.length) < 99n + fileSize + mdSize + fanoutSize) {
        return [nu8$5, false, "provided data is too short to contain the full skyfile"];
    }
    let fileData = skylinkData.slice(Number(99n + mdSize + fanoutSize), Number(99n + mdSize + fanoutSize + fileSize));
    return [fileData, false, null];
}

// @ts-nocheck
// json_parse extracted from the json-bigint npm library
// regexpxs extracted from
// (c) BSD-3-Clause
// https://github.com/fastify/secure-json-parse/graphs/contributors and https://github.com/hapijs/bourne/graphs/contributors
const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
const suspectConstructorRx = /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;
let json_parse = function (options) {
    // This is a function that can parse a JSON text, producing a JavaScript
    // data structure. It is a simple, recursive descent parser. It does not use
    // eval or regular expressions, so it can be used as a model for implementing
    // a JSON parser in other languages.
    // We are defining the function inside of another function to avoid creating
    // global variables.
    // Default options one can override by passing options to the parse()
    let _options = {
        strict: false,
        storeAsString: false,
        alwaysParseAsBig: false,
        protoAction: "error",
        constructorAction: "error",
    };
    // If there are options, then use them to override the default _options
    if (options !== undefined && options !== null) {
        if (options.strict === true) {
            _options.strict = true;
        }
        if (options.storeAsString === true) {
            _options.storeAsString = true;
        }
        _options.alwaysParseAsBig = options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
        if (typeof options.constructorAction !== "undefined") {
            if (options.constructorAction === "error" ||
                options.constructorAction === "ignore" ||
                options.constructorAction === "preserve") {
                _options.constructorAction = options.constructorAction;
            }
            else {
                throw new Error(`Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`);
            }
        }
        if (typeof options.protoAction !== "undefined") {
            if (options.protoAction === "error" || options.protoAction === "ignore" || options.protoAction === "preserve") {
                _options.protoAction = options.protoAction;
            }
            else {
                throw new Error(`Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`);
            }
        }
    }
    let at, // The index of the current character
    ch, // The current character
    escapee = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
    }, text, error = function (m) {
        // Call error when something is wrong.
        throw {
            name: "SyntaxError",
            message: m,
            at: at,
            text: text,
        };
    }, next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        // Get the next character. When there are no more characters,
        // return the empty string.
        ch = text.charAt(at);
        at += 1;
        return ch;
    }, number = function () {
        // Parse a number value.
        let number, string = "";
        if (ch === "-") {
            string = "-";
            next("-");
        }
        while (ch >= "0" && ch <= "9") {
            string += ch;
            next();
        }
        if (ch === ".") {
            string += ".";
            while (next() && ch >= "0" && ch <= "9") {
                string += ch;
            }
        }
        if (ch === "e" || ch === "E") {
            string += ch;
            next();
            if (ch === "-" || ch === "+") {
                string += ch;
                next();
            }
            while (ch >= "0" && ch <= "9") {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        }
        else {
            if (Number.isSafeInteger(number))
                return !_options.alwaysParseAsBig ? number : BigInt(number);
            // Number with fractional part should be treated as number(double) including big integers in scientific notation, i.e 1.79e+308
            else
                return _options.storeAsString ? string : /[.eE]/.test(string) ? number : BigInt(string);
        }
    }, string = function () {
        // Parse a string value.
        let hex, i, string = "", uffff;
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            let startAt = at;
            while (next()) {
                if (ch === '"') {
                    if (at - 1 > startAt)
                        string += text.substring(startAt, at - 1);
                    next();
                    return string;
                }
                if (ch === "\\") {
                    if (at - 1 > startAt)
                        string += text.substring(startAt, at - 1);
                    next();
                    if (ch === "u") {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    }
                    else if (typeof escapee[ch] === "string") {
                        string += escapee[ch];
                    }
                    else {
                        break;
                    }
                    startAt = at;
                }
            }
        }
        error("Bad string");
    }, white = function () {
        // Skip whitespace.
        while (ch && ch <= " ") {
            next();
        }
    }, word = function () {
        // true, false, or null.
        switch (ch) {
            case "t":
                next("t");
                next("r");
                next("u");
                next("e");
                return true;
            case "f":
                next("f");
                next("a");
                next("l");
                next("s");
                next("e");
                return false;
            case "n":
                next("n");
                next("u");
                next("l");
                next("l");
                return null;
        }
        error("Unexpected '" + ch + "'");
    }, value, // Place holder for the value function.
    array = function () {
        // Parse an array value.
        let array = [];
        if (ch === "[") {
            next("[");
            white();
            if (ch === "]") {
                next("]");
                return array; // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === "]") {
                    next("]");
                    return array;
                }
                next(",");
                white();
            }
        }
        error("Bad array");
    }, object = function () {
        // Parse an object value.
        let key, object = Object.create(null);
        if (ch === "{") {
            next("{");
            white();
            if (ch === "}") {
                next("}");
                return object; // empty object
            }
            while (ch) {
                key = string();
                white();
                next(":");
                if (_options.strict === true && Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                if (suspectProtoRx.test(key) === true) {
                    if (_options.protoAction === "error") {
                        error("Object contains forbidden prototype property");
                    }
                    else if (_options.protoAction === "ignore") {
                        value();
                    }
                    else {
                        object[key] = value();
                    }
                }
                else if (suspectConstructorRx.test(key) === true) {
                    if (_options.constructorAction === "error") {
                        error("Object contains forbidden constructor property");
                    }
                    else if (_options.constructorAction === "ignore") {
                        value();
                    }
                    else {
                        object[key] = value();
                    }
                }
                else {
                    object[key] = value();
                }
                white();
                if (ch === "}") {
                    next("}");
                    return object;
                }
                next(",");
                white();
            }
        }
        error("Bad object");
    };
    value = function () {
        // Parse a JSON value. It could be an object, an array, a string, a number,
        // or a word.
        white();
        switch (ch) {
            case "{":
                return object();
            case "[":
                return array();
            case '"':
                return string();
            case "-":
                return number();
            default:
                return ch >= "0" && ch <= "9" ? number() : word();
        }
    };
    // Return the json_parse function. It will have access to all of the above
    // functions and variables.
    return function (source, reviver) {
        let result;
        text = source + "";
        at = 0;
        ch = " ";
        result = value();
        white();
        if (ch) {
            error("Syntax error");
        }
        // If there is a reviver function, we recursively walk the new structure,
        // passing each name/value pair to the reviver function for possible
        // transformation, starting with a temporary root object that holds the result
        // in an empty key. If there is not a reviver function, we simply return the
        // result.
        return typeof reviver === "function"
            ? (function walk(holder, key) {
                let v, value = holder[key];
                if (value && typeof value === "object") {
                    Object.keys(value).forEach(function (k) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        }
                        else {
                            delete value[k];
                        }
                    });
                }
                return reviver.call(holder, key, value);
            })({ "": result }, "")
            : result;
    };
};
// parseJSON is a wrapper for JSONbig.parse that returns an error rather than
// throwing an error. JSONbig is an alternative to JSON.parse that decodes
// every number as a bigint. This is required when working with the skyd API
// because the skyd API uses 64 bit precision for all of its numbers, and
// therefore cannot be parsed losslessly by javascript. The skyd API is
// cryptographic, therefore full precision is required.
function parseJSON(json) {
    try {
        let obj = json_parse({ alwaysParseAsBig: true })(json);
        return [obj, null];
    }
    catch (err) {
        return [{}, tryStringify$1(err)];
    }
}

// Helper consts that make it easier to return empty values when returning an
// error inside of a function.
const nu8$4 = new Uint8Array(0);
// parseSkylinkBitfield parses a skylink bitfield and returns the corresponding
// version, offset, and fetchSize.
function parseSkylinkBitfield(skylink) {
    // Validate the input.
    if (skylink.length !== 34) {
        return [0n, 0n, 0n, "provided skylink has incorrect length"];
    }
    // Extract the bitfield.
    let bitfield = new DataView(skylink.buffer).getUint16(0, true);
    // Extract the version.
    let version = (bitfield & 3) + 1;
    // Only versions 1 and 2 are recognized.
    if (version !== 1 && version !== 2) {
        return [0n, 0n, 0n, "provided skylink has unrecognized version"];
    }
    // If the skylink is set to version 2, we only recognize the link if
    // the rest of the bits in the bitfield are empty.
    if (version === 2) {
        if ((bitfield & 3) !== bitfield) {
            return [0n, 0n, 0n, "provided skylink has unrecognized version"];
        }
        return [BigInt(version), 0n, 0n, null];
    }
    // Verify that the mode is valid, then fetch the mode.
    bitfield = bitfield >> 2;
    if ((bitfield & 255) === 255) {
        return [0n, 0n, 0n, "provided skylink has an unrecognized version"];
    }
    let mode = 0;
    for (let i = 0; i < 8; i++) {
        if ((bitfield & 1) === 0) {
            bitfield = bitfield >> 1;
            break;
        }
        bitfield = bitfield >> 1;
        mode++;
    }
    // If the mode is greater than 7, this is not a valid v1 skylink.
    if (mode > 7) {
        return [0n, 0n, 0n, "provided skylink has an invalid v1 bitfield"];
    }
    // Determine the offset and fetchSize increment.
    let offsetIncrement = 4096 << mode;
    let fetchSizeIncrement = 4096;
    let fetchSizeStart = 0;
    if (mode > 0) {
        fetchSizeIncrement = fetchSizeIncrement << (mode - 1);
        fetchSizeStart = (1 << 15) << (mode - 1);
    }
    // The next three bits decide the fetchSize.
    let fetchSizeBits = bitfield & 7;
    fetchSizeBits++; // semantic upstep, range should be [1,8] not [0,8).
    let fetchSize = fetchSizeBits * fetchSizeIncrement + fetchSizeStart;
    bitfield = bitfield >> 3;
    // The remaining bits determine the offset.
    let offset = bitfield * offsetIncrement;
    if (offset + fetchSize > 1 << 22) {
        return [0n, 0n, 0n, "provided skylink has an invalid v1 bitfield"];
    }
    // Return what we learned.
    return [BigInt(version), BigInt(offset), BigInt(fetchSize), null];
}
// skylinkV1Bitfield sets the bitfield of a V1 skylink. It assumes the version
// is 1 and the offset is 0. It will determine the appropriate fetchSize from
// the provided dataSize.
function skylinkV1Bitfield(dataSizeBI) {
    // Check that the dataSize is not too large.
    if (dataSizeBI > 1 << 22) {
        return [nu8$4, "dataSize must be less than the sector size"];
    }
    let dataSize = Number(dataSizeBI);
    // Determine the mode for the file. The mode is determined by the
    // dataSize.
    let mode = 0;
    for (let i = 1 << 15; i < dataSize; i *= 2) {
        mode += 1;
    }
    // Determine the download number.
    let downloadNumber = 0;
    if (mode === 0) {
        if (dataSize !== 0) {
            downloadNumber = Math.floor((dataSize - 1) / (1 << 12));
        }
    }
    else {
        let step = 1 << (11 + mode);
        let target = dataSize - (1 << (14 + mode));
        if (target !== 0) {
            downloadNumber = Math.floor((target - 1) / step);
        }
    }
    // Create the Uint8Array and fill it out. The main reason I switch over
    // the 7 modes like this is because I wasn't sure how to make a uint16
    // in javascript. If we could treat the uint8array as a uint16 and then
    // later convert it over, we could use basic bitshifiting and really
    // simplify the code here.
    let bitfield = new Uint8Array(2);
    if (mode === 7) {
        // 0 0 0 X X X 0 1|1 1 1 1 1 1 0 0
        bitfield[0] = downloadNumber;
        bitfield[0] *= 4;
        bitfield[0] += 1;
        bitfield[1] = 4 + 8 + 16 + 32 + 64 + 128;
    }
    if (mode === 6) {
        // 0 0 0 0 X X X 0|1 1 1 1 1 1 0 0
        bitfield[0] = downloadNumber;
        bitfield[0] *= 2;
        bitfield[1] = 4 + 8 + 16 + 32 + 64 + 128;
    }
    if (mode === 5) {
        // 0 0 0 0 0 X X X|0 1 1 1 1 1 0 0
        bitfield[0] = downloadNumber;
        bitfield[1] = 4 + 8 + 16 + 32 + 64;
    }
    if (mode === 4) {
        // 0 0 0 0 0 0 X X|X 0 1 1 1 1 0 0
        bitfield[0] = downloadNumber;
        bitfield[0] /= 2;
        bitfield[1] = (downloadNumber & 1) * 128;
        bitfield[1] += 4 + 8 + 16 + 32;
    }
    if (mode === 3) {
        // 0 0 0 0 0 0 0 X|X X 0 1 1 1 0 0
        bitfield[0] = downloadNumber;
        bitfield[0] /= 4;
        bitfield[1] = (downloadNumber & 3) * 64;
        bitfield[1] += 4 + 8 + 16;
    }
    if (mode === 2) {
        // 0 0 0 0 0 0 0 0|X X X 0 1 1 0 0
        bitfield[0] = 0;
        bitfield[1] = downloadNumber * 32;
        bitfield[1] += 4 + 8;
    }
    if (mode === 1) {
        // 0 0 0 0 0 0 0 0|0 X X X 0 1 0 0
        bitfield[0] = 0;
        bitfield[1] = downloadNumber * 16;
        bitfield[1] += 4;
    }
    if (mode === 0) {
        // 0 0 0 0 0 0 0 0|0 0 X X X 0 0 0
        bitfield[0] = 0;
        bitfield[1] = downloadNumber * 8;
    }
    // Swap the byte order.
    let zero = bitfield[0];
    bitfield[0] = bitfield[1];
    bitfield[1] = zero;
    return [bitfield, null];
}

const HASH_SIZE = 64;
const K = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b,
    0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242,
    0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe,
    0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc,
    0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f,
    0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967,
    0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1,
    0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218,
    0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08,
    0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814,
    0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915,
    0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f,
    0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be,
    0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817,
];
function ts64(x, i, h, l) {
    x[i] = (h >> 24) & 0xff;
    x[i + 1] = (h >> 16) & 0xff;
    x[i + 2] = (h >> 8) & 0xff;
    x[i + 3] = h & 0xff;
    x[i + 4] = (l >> 24) & 0xff;
    x[i + 5] = (l >> 16) & 0xff;
    x[i + 6] = (l >> 8) & 0xff;
    x[i + 7] = l & 0xff;
}
function crypto_hashblocks_hl(hh, hl, m, n) {
    let wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
    let ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
    let pos = 0;
    while (n >= 128) {
        for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = (m[j + 0] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
            wl[i] = (m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7];
        }
        for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            // add
            h = ah7;
            l = al7;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma1
            h =
                ((ah4 >>> 14) | (al4 << (32 - 14))) ^
                    ((ah4 >>> 18) | (al4 << (32 - 18))) ^
                    ((al4 >>> (41 - 32)) | (ah4 << (32 - (41 - 32))));
            l =
                ((al4 >>> 14) | (ah4 << (32 - 14))) ^
                    ((al4 >>> 18) | (ah4 << (32 - 18))) ^
                    ((ah4 >>> (41 - 32)) | (al4 << (32 - (41 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Ch
            h = (ah4 & ah5) ^ (~ah4 & ah6);
            l = (al4 & al5) ^ (~al4 & al6);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // K
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // w
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = (c & 0xffff) | (d << 16);
            tl = (a & 0xffff) | (b << 16);
            // add
            h = th;
            l = tl;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma0
            h =
                ((ah0 >>> 28) | (al0 << (32 - 28))) ^
                    ((al0 >>> (34 - 32)) | (ah0 << (32 - (34 - 32)))) ^
                    ((al0 >>> (39 - 32)) | (ah0 << (32 - (39 - 32))));
            l =
                ((al0 >>> 28) | (ah0 << (32 - 28))) ^
                    ((ah0 >>> (34 - 32)) | (al0 << (32 - (34 - 32)))) ^
                    ((ah0 >>> (39 - 32)) | (al0 << (32 - (39 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Maj
            h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
            l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = (c & 0xffff) | (d << 16);
            bl7 = (a & 0xffff) | (b << 16);
            // add
            h = bh3;
            l = bl3;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = (c & 0xffff) | (d << 16);
            bl3 = (a & 0xffff) | (b << 16);
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
                for (j = 0; j < 16; j++) {
                    // add
                    h = wh[j];
                    l = wl[j];
                    a = l & 0xffff;
                    b = l >>> 16;
                    c = h & 0xffff;
                    d = h >>> 16;
                    h = wh[(j + 9) % 16];
                    l = wl[(j + 9) % 16];
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma0
                    th = wh[(j + 1) % 16];
                    tl = wl[(j + 1) % 16];
                    h = ((th >>> 1) | (tl << (32 - 1))) ^ ((th >>> 8) | (tl << (32 - 8))) ^ (th >>> 7);
                    l = ((tl >>> 1) | (th << (32 - 1))) ^ ((tl >>> 8) | (th << (32 - 8))) ^ ((tl >>> 7) | (th << (32 - 7)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma1
                    th = wh[(j + 14) % 16];
                    tl = wl[(j + 14) % 16];
                    h = ((th >>> 19) | (tl << (32 - 19))) ^ ((tl >>> (61 - 32)) | (th << (32 - (61 - 32)))) ^ (th >>> 6);
                    l =
                        ((tl >>> 19) | (th << (32 - 19))) ^
                            ((th >>> (61 - 32)) | (tl << (32 - (61 - 32)))) ^
                            ((tl >>> 6) | (th << (32 - 6)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    b += a >>> 16;
                    c += b >>> 16;
                    d += c >>> 16;
                    wh[j] = (c & 0xffff) | (d << 16);
                    wl[j] = (a & 0xffff) | (b << 16);
                }
            }
        }
        // add
        h = ah0;
        l = al0;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[0];
        l = hl[0];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[0] = ah0 = (c & 0xffff) | (d << 16);
        hl[0] = al0 = (a & 0xffff) | (b << 16);
        h = ah1;
        l = al1;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[1];
        l = hl[1];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[1] = ah1 = (c & 0xffff) | (d << 16);
        hl[1] = al1 = (a & 0xffff) | (b << 16);
        h = ah2;
        l = al2;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[2];
        l = hl[2];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[2] = ah2 = (c & 0xffff) | (d << 16);
        hl[2] = al2 = (a & 0xffff) | (b << 16);
        h = ah3;
        l = al3;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[3];
        l = hl[3];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[3] = ah3 = (c & 0xffff) | (d << 16);
        hl[3] = al3 = (a & 0xffff) | (b << 16);
        h = ah4;
        l = al4;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[4];
        l = hl[4];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[4] = ah4 = (c & 0xffff) | (d << 16);
        hl[4] = al4 = (a & 0xffff) | (b << 16);
        h = ah5;
        l = al5;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[5];
        l = hl[5];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[5] = ah5 = (c & 0xffff) | (d << 16);
        hl[5] = al5 = (a & 0xffff) | (b << 16);
        h = ah6;
        l = al6;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[6];
        l = hl[6];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[6] = ah6 = (c & 0xffff) | (d << 16);
        hl[6] = al6 = (a & 0xffff) | (b << 16);
        h = ah7;
        l = al7;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[7];
        l = hl[7];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[7] = ah7 = (c & 0xffff) | (d << 16);
        hl[7] = al7 = (a & 0xffff) | (b << 16);
        pos += 128;
        n -= 128;
    }
    return n;
}
const sha512internal = function (out, m, n) {
    let hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
    hh[0] = 0x6a09e667;
    hh[1] = 0xbb67ae85;
    hh[2] = 0x3c6ef372;
    hh[3] = 0xa54ff53a;
    hh[4] = 0x510e527f;
    hh[5] = 0x9b05688c;
    hh[6] = 0x1f83d9ab;
    hh[7] = 0x5be0cd19;
    hl[0] = 0xf3bcc908;
    hl[1] = 0x84caa73b;
    hl[2] = 0xfe94f82b;
    hl[3] = 0x5f1d36f1;
    hl[4] = 0xade682d1;
    hl[5] = 0x2b3e6c1f;
    hl[6] = 0xfb41bd6b;
    hl[7] = 0x137e2179;
    crypto_hashblocks_hl(hh, hl, m, n);
    n %= 128;
    for (i = 0; i < n; i++)
        x[i] = m[b - n + i];
    x[n] = 128;
    n = 256 - 128 * (n < 112 ? 1 : 0);
    x[n - 9] = 0;
    ts64(x, n - 8, (b / 0x20000000) | 0, b << 3);
    crypto_hashblocks_hl(hh, hl, x, n);
    for (i = 0; i < 8; i++)
        ts64(out, 8 * i, hh[i], hl[i]);
    return 0;
};
// sha512 is the standard sha512 cryptographic hash function. This is the
// default choice for Skynet operations, though many of the Sia protocol
// standards use blake2b instead, so you will see both.
function sha512(m) {
    const out = new Uint8Array(HASH_SIZE);
    sha512internal(out, m, m.length);
    return out;
}

let crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32;
let gf = function () {
    let r = new Float64Array(16);
    return r;
};
let gfi$1 = function (init) {
    let i, r = new Float64Array(16);
    if (init)
        for (i = 0; i < init.length; i++)
            r[i] = init[i];
    return r;
};
let gf0 = gf(), gf1 = gfi$1([1]), D = gfi$1([
    0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f,
    0x6cee, 0x5203,
]), D2 = gfi$1([
    0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df,
    0xd9dc, 0x2406,
]), X = gfi$1([
    0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e,
    0x36d3, 0x2169,
]), Y = gfi$1([
    0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666,
    0x6666, 0x6666,
]), I = gfi$1([
    0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1,
    0x2480, 0x2b83,
]);
function vn(x, xi, y, yi, n) {
    let i, d = 0;
    for (i = 0; i < n; i++)
        d |= x[xi + i] ^ y[yi + i];
    return (1 & ((d - 1) >>> 8)) - 1;
}
function crypto_verify_32(x, xi, y, yi) {
    return vn(x, xi, y, yi, 32);
}
function set25519(r, a) {
    let i;
    for (i = 0; i < 16; i++)
        r[i] = a[i] | 0;
}
function car25519(o) {
    let i, v, c = 1;
    for (i = 0; i < 16; i++) {
        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
    }
    o[0] += c - 1 + 37 * (c - 1);
}
function sel25519(p, q, b) {
    let t, c = ~(b - 1);
    for (let i = 0; i < 16; i++) {
        t = c & (p[i] ^ q[i]);
        p[i] ^= t;
        q[i] ^= t;
    }
}
function pack25519(o, n) {
    let i, j, b;
    let m = gf(), t = gf();
    for (i = 0; i < 16; i++)
        t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
        m[0] = t[0] - 0xffed;
        for (i = 1; i < 15; i++) {
            m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
            m[i - 1] &= 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
        b = (m[15] >> 16) & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
    }
    for (i = 0; i < 16; i++) {
        o[2 * i] = t[i] & 0xff;
        o[2 * i + 1] = t[i] >> 8;
    }
}
function neq25519(a, b) {
    let c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
}
function par25519(a) {
    let d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
}
function unpack25519(o, n) {
    let i;
    for (i = 0; i < 16; i++)
        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
    o[15] &= 0x7fff;
}
function A$1(o, a, b) {
    for (let i = 0; i < 16; i++)
        o[i] = a[i] + b[i];
}
function Z$1(o, a, b) {
    for (let i = 0; i < 16; i++)
        o[i] = a[i] - b[i];
}
function M(o, a, b) {
    let v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    v = a[0];
    t0 += v * b0;
    t1 += v * b1;
    t2 += v * b2;
    t3 += v * b3;
    t4 += v * b4;
    t5 += v * b5;
    t6 += v * b6;
    t7 += v * b7;
    t8 += v * b8;
    t9 += v * b9;
    t10 += v * b10;
    t11 += v * b11;
    t12 += v * b12;
    t13 += v * b13;
    t14 += v * b14;
    t15 += v * b15;
    v = a[1];
    t1 += v * b0;
    t2 += v * b1;
    t3 += v * b2;
    t4 += v * b3;
    t5 += v * b4;
    t6 += v * b5;
    t7 += v * b6;
    t8 += v * b7;
    t9 += v * b8;
    t10 += v * b9;
    t11 += v * b10;
    t12 += v * b11;
    t13 += v * b12;
    t14 += v * b13;
    t15 += v * b14;
    t16 += v * b15;
    v = a[2];
    t2 += v * b0;
    t3 += v * b1;
    t4 += v * b2;
    t5 += v * b3;
    t6 += v * b4;
    t7 += v * b5;
    t8 += v * b6;
    t9 += v * b7;
    t10 += v * b8;
    t11 += v * b9;
    t12 += v * b10;
    t13 += v * b11;
    t14 += v * b12;
    t15 += v * b13;
    t16 += v * b14;
    t17 += v * b15;
    v = a[3];
    t3 += v * b0;
    t4 += v * b1;
    t5 += v * b2;
    t6 += v * b3;
    t7 += v * b4;
    t8 += v * b5;
    t9 += v * b6;
    t10 += v * b7;
    t11 += v * b8;
    t12 += v * b9;
    t13 += v * b10;
    t14 += v * b11;
    t15 += v * b12;
    t16 += v * b13;
    t17 += v * b14;
    t18 += v * b15;
    v = a[4];
    t4 += v * b0;
    t5 += v * b1;
    t6 += v * b2;
    t7 += v * b3;
    t8 += v * b4;
    t9 += v * b5;
    t10 += v * b6;
    t11 += v * b7;
    t12 += v * b8;
    t13 += v * b9;
    t14 += v * b10;
    t15 += v * b11;
    t16 += v * b12;
    t17 += v * b13;
    t18 += v * b14;
    t19 += v * b15;
    v = a[5];
    t5 += v * b0;
    t6 += v * b1;
    t7 += v * b2;
    t8 += v * b3;
    t9 += v * b4;
    t10 += v * b5;
    t11 += v * b6;
    t12 += v * b7;
    t13 += v * b8;
    t14 += v * b9;
    t15 += v * b10;
    t16 += v * b11;
    t17 += v * b12;
    t18 += v * b13;
    t19 += v * b14;
    t20 += v * b15;
    v = a[6];
    t6 += v * b0;
    t7 += v * b1;
    t8 += v * b2;
    t9 += v * b3;
    t10 += v * b4;
    t11 += v * b5;
    t12 += v * b6;
    t13 += v * b7;
    t14 += v * b8;
    t15 += v * b9;
    t16 += v * b10;
    t17 += v * b11;
    t18 += v * b12;
    t19 += v * b13;
    t20 += v * b14;
    t21 += v * b15;
    v = a[7];
    t7 += v * b0;
    t8 += v * b1;
    t9 += v * b2;
    t10 += v * b3;
    t11 += v * b4;
    t12 += v * b5;
    t13 += v * b6;
    t14 += v * b7;
    t15 += v * b8;
    t16 += v * b9;
    t17 += v * b10;
    t18 += v * b11;
    t19 += v * b12;
    t20 += v * b13;
    t21 += v * b14;
    t22 += v * b15;
    v = a[8];
    t8 += v * b0;
    t9 += v * b1;
    t10 += v * b2;
    t11 += v * b3;
    t12 += v * b4;
    t13 += v * b5;
    t14 += v * b6;
    t15 += v * b7;
    t16 += v * b8;
    t17 += v * b9;
    t18 += v * b10;
    t19 += v * b11;
    t20 += v * b12;
    t21 += v * b13;
    t22 += v * b14;
    t23 += v * b15;
    v = a[9];
    t9 += v * b0;
    t10 += v * b1;
    t11 += v * b2;
    t12 += v * b3;
    t13 += v * b4;
    t14 += v * b5;
    t15 += v * b6;
    t16 += v * b7;
    t17 += v * b8;
    t18 += v * b9;
    t19 += v * b10;
    t20 += v * b11;
    t21 += v * b12;
    t22 += v * b13;
    t23 += v * b14;
    t24 += v * b15;
    v = a[10];
    t10 += v * b0;
    t11 += v * b1;
    t12 += v * b2;
    t13 += v * b3;
    t14 += v * b4;
    t15 += v * b5;
    t16 += v * b6;
    t17 += v * b7;
    t18 += v * b8;
    t19 += v * b9;
    t20 += v * b10;
    t21 += v * b11;
    t22 += v * b12;
    t23 += v * b13;
    t24 += v * b14;
    t25 += v * b15;
    v = a[11];
    t11 += v * b0;
    t12 += v * b1;
    t13 += v * b2;
    t14 += v * b3;
    t15 += v * b4;
    t16 += v * b5;
    t17 += v * b6;
    t18 += v * b7;
    t19 += v * b8;
    t20 += v * b9;
    t21 += v * b10;
    t22 += v * b11;
    t23 += v * b12;
    t24 += v * b13;
    t25 += v * b14;
    t26 += v * b15;
    v = a[12];
    t12 += v * b0;
    t13 += v * b1;
    t14 += v * b2;
    t15 += v * b3;
    t16 += v * b4;
    t17 += v * b5;
    t18 += v * b6;
    t19 += v * b7;
    t20 += v * b8;
    t21 += v * b9;
    t22 += v * b10;
    t23 += v * b11;
    t24 += v * b12;
    t25 += v * b13;
    t26 += v * b14;
    t27 += v * b15;
    v = a[13];
    t13 += v * b0;
    t14 += v * b1;
    t15 += v * b2;
    t16 += v * b3;
    t17 += v * b4;
    t18 += v * b5;
    t19 += v * b6;
    t20 += v * b7;
    t21 += v * b8;
    t22 += v * b9;
    t23 += v * b10;
    t24 += v * b11;
    t25 += v * b12;
    t26 += v * b13;
    t27 += v * b14;
    t28 += v * b15;
    v = a[14];
    t14 += v * b0;
    t15 += v * b1;
    t16 += v * b2;
    t17 += v * b3;
    t18 += v * b4;
    t19 += v * b5;
    t20 += v * b6;
    t21 += v * b7;
    t22 += v * b8;
    t23 += v * b9;
    t24 += v * b10;
    t25 += v * b11;
    t26 += v * b12;
    t27 += v * b13;
    t28 += v * b14;
    t29 += v * b15;
    v = a[15];
    t15 += v * b0;
    t16 += v * b1;
    t17 += v * b2;
    t18 += v * b3;
    t19 += v * b4;
    t20 += v * b5;
    t21 += v * b6;
    t22 += v * b7;
    t23 += v * b8;
    t24 += v * b9;
    t25 += v * b10;
    t26 += v * b11;
    t27 += v * b12;
    t28 += v * b13;
    t29 += v * b14;
    t30 += v * b15;
    t0 += 38 * t16;
    t1 += 38 * t17;
    t2 += 38 * t18;
    t3 += 38 * t19;
    t4 += 38 * t20;
    t5 += 38 * t21;
    t6 += 38 * t22;
    t7 += 38 * t23;
    t8 += 38 * t24;
    t9 += 38 * t25;
    t10 += 38 * t26;
    t11 += 38 * t27;
    t12 += 38 * t28;
    t13 += 38 * t29;
    t14 += 38 * t30;
    // t15 left as is
    // first car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    // second car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    o[0] = t0;
    o[1] = t1;
    o[2] = t2;
    o[3] = t3;
    o[4] = t4;
    o[5] = t5;
    o[6] = t6;
    o[7] = t7;
    o[8] = t8;
    o[9] = t9;
    o[10] = t10;
    o[11] = t11;
    o[12] = t12;
    o[13] = t13;
    o[14] = t14;
    o[15] = t15;
}
function S$1(o, a) {
    M(o, a, a);
}
function inv25519(o, i) {
    let c = gf();
    let a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 253; a >= 0; a--) {
        S$1(c, c);
        if (a !== 2 && a !== 4)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function pow2523(o, i) {
    let c = gf();
    let a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 250; a >= 0; a--) {
        S$1(c, c);
        if (a !== 1)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function add(p, q) {
    let a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
    Z$1(a, p[1], p[0]);
    Z$1(t, q[1], q[0]);
    M(a, a, t);
    A$1(b, p[0], p[1]);
    A$1(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A$1(d, d, d);
    Z$1(e, b, a);
    Z$1(f, d, c);
    A$1(g, d, c);
    A$1(h, b, a);
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
}
function cswap(p, q, b) {
    let i;
    for (i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
    }
}
function pack(r, p) {
    let tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
}
function scalarmult(p, q, s) {
    let b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
        b = (s[(i / 8) | 0] >> (i & 7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
    }
}
function scalarbase(p, s) {
    let q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
}
let L = new Float64Array([
    0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0x10,
]);
function modL(r, x) {
    let carry, i, j, k;
    for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
    }
    for (j = 0; j < 32; j++)
        x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
    }
}
function unpackneg(r, p) {
    let t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S$1(num, r[1]);
    M(den, num, D);
    Z$1(num, num, r[2]);
    A$1(den, r[2], den);
    S$1(den2, den);
    S$1(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);
    S$1(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        M(r[0], r[0], I);
    S$1(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        return -1;
    if (par25519(r[0]) === p[31] >> 7)
        Z$1(r[0], gf0, r[0]);
    M(r[3], r[0], r[1]);
    return 0;
}
function reduce(r) {
    let x = new Float64Array(64), i;
    for (i = 0; i < 64; i++)
        x[i] = r[i];
    for (i = 0; i < 64; i++)
        r[i] = 0;
    modL(r, x);
}
function crypto_sign_keypair(pk, sk) {
    let d = new Uint8Array(64);
    let p = [gf(), gf(), gf(), gf()];
    let i;
    sha512internal(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    for (i = 0; i < 32; i++)
        sk[i + 32] = pk[i];
    return 0;
}
function crypto_sign_open(m, sm, n, pk) {
    let i;
    let t = new Uint8Array(32), h = new Uint8Array(64);
    let p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
    if (n < 64)
        return -1;
    if (unpackneg(q, pk))
        return -1;
    for (i = 0; i < n; i++)
        m[i] = sm[i];
    for (i = 0; i < 32; i++)
        m[i + 32] = pk[i];
    sha512internal(h, m, n);
    reduce(h);
    scalarmult(p, q, h);
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++)
            m[i] = 0;
        return -1;
    }
    for (i = 0; i < n; i++)
        m[i] = sm[i + 64];
    return n;
}
// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
    let d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
    let i, j, x = new Float64Array(64);
    let p = [gf(), gf(), gf(), gf()];
    sha512internal(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    let smlen = n + 64;
    for (i = 0; i < n; i++)
        sm[64 + i] = m[i];
    for (i = 0; i < 32; i++)
        sm[32 + i] = d[32 + i];
    sha512internal(r, sm.subarray(32), n + 32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
    for (i = 32; i < 64; i++)
        sm[i] = sk[i];
    sha512internal(h, sm, n + 64);
    reduce(h);
    for (i = 0; i < 64; i++)
        x[i] = 0;
    for (i = 0; i < 32; i++)
        x[i] = r[i];
    for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
        }
    }
    modL(sm.subarray(32), x);
    return smlen;
}
// Zero types to make error returns more convenient.
const nu8$3 = new Uint8Array(0);
const nkp$1 = { publicKey: nu8$3, secretKey: nu8$3 };
// checkAllUint8Array is a helper function to perform input checking on the
// crypto API functions. Because the kernel is often hot-loading untrusted
// code, we cannot depend on typescript to provide type safety.
function checkAllUint8Array(...args) {
    for (let i = 0; i < args.length; i++) {
        if (!(args[i] instanceof Uint8Array)) {
            return "unexpected type, use Uint8Array";
        }
    }
    return null;
}
// ed25519KeypairFromEntropy is a function that generates an ed25519 keypair
// from the provided entropy.
function ed25519KeypairFromEntropy(seed) {
    // Input checking.
    let errU8 = checkAllUint8Array(seed);
    if (errU8 !== null) {
        return [nkp$1, addContextToErr$1(errU8, "seed is invalid")];
    }
    if (seed.length !== crypto_sign_SEEDBYTES) {
        return [nkp$1, "bad seed size"];
    }
    // Build the keypair.
    let pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    let sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    for (let i = 0; i < 32; i++) {
        sk[i] = seed[i];
    }
    crypto_sign_keypair(pk, sk);
    return [
        {
            publicKey: pk,
            secretKey: sk,
        },
        null,
    ];
}
// ed25519Sign will produce an ed25519 signature of a given input.
function ed25519Sign(msg, secretKey) {
    // Input checking.
    let errU8 = checkAllUint8Array(msg, secretKey);
    if (errU8 !== null) {
        return [nu8$3, addContextToErr$1(errU8, "inputs are invalid")];
    }
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES) {
        return [nu8$3, "bad secret key size"];
    }
    // Build the signature.
    let signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
    crypto_sign(signedMsg, msg, msg.length, secretKey);
    let sig = new Uint8Array(crypto_sign_BYTES);
    for (let i = 0; i < sig.length; i++) {
        sig[i] = signedMsg[i];
    }
    return [sig, null];
}
// ed25519Verify will check whether a signature is valid against the given
// publicKey and message.
function ed25519Verify(msg, sig, publicKey) {
    let errU8 = checkAllUint8Array(msg, sig, publicKey);
    if (errU8 !== null) {
        return false;
    }
    if (sig.length !== crypto_sign_BYTES) {
        return false;
    }
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES) {
        return false;
    }
    let sm = new Uint8Array(crypto_sign_BYTES + msg.length);
    let m = new Uint8Array(crypto_sign_BYTES + msg.length);
    let i;
    for (i = 0; i < crypto_sign_BYTES; i++) {
        sm[i] = sig[i];
    }
    for (i = 0; i < msg.length; i++) {
        sm[i + crypto_sign_BYTES] = msg[i];
    }
    return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
}

// Define the number of entropy words used when generating the seed.
const SEED_ENTROPY_WORDS = 13;
const SEED_BYTES = 16;
// deriveChildSeed is a helper function to derive a child seed from a parent
// seed using a string as the path.
function deriveChildSeed(parentSeed, derivationTag) {
    let tagU8 = new TextEncoder().encode(" - " + derivationTag);
    let preimage = new Uint8Array(parentSeed.length + tagU8.length);
    preimage.set(parentSeed, 0);
    preimage.set(tagU8, parentSeed.length);
    let hash = sha512(preimage);
    return hash.slice(0, SEED_BYTES);
}
// deriveMyskyRoot is a helper function to derive the root mysky seed of the
// provided user seed.
//
// NOTE: This is code is to provide legacy compatibility with the MySky
// ecosystem. Compatibility cannot be broken here.
function deriveMyskyRootKeypair(userSeed) {
    let saltBytes = new TextEncoder().encode("root discoverable key");
    let saltHash = sha512(saltBytes);
    let userSeedHash = sha512(userSeed);
    let mergedHash = sha512(new Uint8Array([...saltHash, ...userSeedHash]));
    let keyEntropy = mergedHash.slice(0, 32);
    // Error is ignored because it should not be possible with the provided
    // inputs.
    let [keypair] = ed25519KeypairFromEntropy(keyEntropy);
    return keypair;
}
// generateSeedPhraseDeterministic will generate and verify a seed phrase for
// the user.
function generateSeedPhraseDeterministic(password) {
    let u8 = new TextEncoder().encode(password);
    let buf = sha512(u8);
    let randNums = Uint16Array.from(buf);
    // Generate the seed phrase from the randNums.
    let seedWords = [];
    for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
        let wordIndex = randNums[i] % dictionary.length;
        if (i == SEED_ENTROPY_WORDS - 1) {
            wordIndex = randNums[i] % (dictionary.length / 4);
        }
        seedWords.push(dictionary[wordIndex]);
    }
    // Convert the seedWords to a seed.
    let [seed, err1] = seedWordsToSeed(seedWords);
    if (err1 !== null) {
        return ["", err1];
    }
    // Compute the checksum.
    let [checksumOne, checksumTwo, err2] = seedToChecksumWords(seed);
    if (err2 !== null) {
        return ["", err2];
    }
    // Assemble the final seed phrase and set the text field.
    let allWords = [...seedWords, checksumOne, checksumTwo];
    let seedPhrase = allWords.join(" ");
    return [seedPhrase, null];
}
// seedToChecksumWords will compute the two checksum words for the provided
// seed. The two return values are the two checksum words.
function seedToChecksumWords(seed) {
    // Input validation.
    if (seed.length !== SEED_BYTES) {
        return ["", "", `seed has the wrong length: ${seed.length}`];
    }
    // Get the hash.
    let h = sha512(seed);
    // Turn the hash into two words.
    let word1 = h[0] << 8;
    word1 += h[1];
    word1 >>= 6;
    let word2 = h[1] << 10;
    word2 &= 0xffff;
    word2 += h[2] << 2;
    word2 >>= 6;
    return [dictionary[word1], dictionary[word2], null];
}
// validSeedPhrase checks whether the provided seed phrase is valid, returning
// an error if not. If the seed phrase is valid, the full seed will be returned
// as a Uint8Array.
function validSeedPhrase(seedPhrase) {
    // Create a helper function to make the below code more readable.
    let prefix = function (s) {
        return s.slice(0, DICTIONARY_UNIQUE_PREFIX);
    };
    // Pull the seed into its respective parts.
    let seedWordsAndChecksum = seedPhrase.split(" ");
    let seedWords = seedWordsAndChecksum.slice(0, SEED_ENTROPY_WORDS);
    let checksumOne = seedWordsAndChecksum[SEED_ENTROPY_WORDS];
    let checksumTwo = seedWordsAndChecksum[SEED_ENTROPY_WORDS + 1];
    // Convert the seedWords to a seed.
    let [seed, err1] = seedWordsToSeed(seedWords);
    if (err1 !== null) {
        return [new Uint8Array(0), addContextToErr$1(err1, "unable to parse seed phrase")];
    }
    let [checksumOneVerify, checksumTwoVerify, err2] = seedToChecksumWords(seed);
    if (err2 !== null) {
        return [new Uint8Array(0), addContextToErr$1(err2, "could not compute checksum words")];
    }
    if (prefix(checksumOne) !== prefix(checksumOneVerify)) {
        return [new Uint8Array(0), "first checksum word is invalid"];
    }
    if (prefix(checksumTwo) !== prefix(checksumTwoVerify)) {
        return [new Uint8Array(0), "second checksum word is invalid"];
    }
    return [seed, null];
}
// seedWordsToSeed will convert a provided seed phrase to to a Uint8Array that
// represents the cryptographic seed in bytes.
function seedWordsToSeed(seedWords) {
    // Input checking.
    if (seedWords.length !== SEED_ENTROPY_WORDS) {
        return [new Uint8Array(0), `Seed words should have length ${SEED_ENTROPY_WORDS} but has length ${seedWords.length}`];
    }
    // We are getting 16 bytes of entropy.
    let bytes = new Uint8Array(SEED_BYTES);
    let curByte = 0;
    let curBit = 0;
    for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
        // Determine which number corresponds to the next word.
        let word = -1;
        for (let j = 0; j < dictionary.length; j++) {
            if (seedWords[i].slice(0, DICTIONARY_UNIQUE_PREFIX) === dictionary[j].slice(0, DICTIONARY_UNIQUE_PREFIX)) {
                word = j;
                break;
            }
        }
        if (word === -1) {
            return [new Uint8Array(0), `word '${seedWords[i]}' at index ${i} not found in dictionary`];
        }
        let wordBits = 10;
        if (i === SEED_ENTROPY_WORDS - 1) {
            wordBits = 8;
        }
        // Iterate over the bits of the 10- or 8-bit word.
        for (let j = 0; j < wordBits; j++) {
            let bitSet = (word & (1 << (wordBits - j - 1))) > 0;
            if (bitSet) {
                bytes[curByte] |= 1 << (8 - curBit - 1);
            }
            curBit += 1;
            if (curBit >= 8) {
                // Current byte has 8 bits, go to the next byte.
                curByte += 1;
                curBit = 0;
            }
        }
    }
    return [bytes, null];
}
// seedPhraseToSeed will take a seed phrase and return the corresponding seed,
// providing an error if the seed phrase is invalid. This is an alias of
// validSeedPhrase.
function seedPhraseToSeed(seedPhrase) {
    return validSeedPhrase(seedPhrase);
}

var seed = /*#__PURE__*/Object.freeze({
	__proto__: null,
	deriveChildSeed: deriveChildSeed,
	deriveMyskyRootKeypair: deriveMyskyRootKeypair,
	generateSeedPhraseDeterministic: generateSeedPhraseDeterministic,
	seedToChecksumWords: seedToChecksumWords,
	seedPhraseToSeed: seedPhraseToSeed,
	validSeedPhrase: validSeedPhrase,
	SEED_BYTES: SEED_BYTES
});

// Define some empty values to make our return statements more concise.
const nu8$2 = new Uint8Array(0);
const nkp = { publicKey: nu8$2, secretKey: nu8$2 };
// computeRegistrySignature will take a secret key and the required fields of a
// registry entry and use them to compute a registry signature, returning both
// the signature and the encoded data for the registry entry.
function computeRegistrySignature(secretKey, dataKey, data, revision) {
    // Check that the data is the right size.
    if (data.length > 86) {
        return [nu8$2, "registry data must be at most 86 bytes"];
    }
    // Build the encoded data.
    let [encodedData, errEPB] = encodePrefixedBytes(data);
    if (errEPB !== null) {
        return [nu8$2, addContextToErr$1(errEPB, "unable to encode provided registry data")];
    }
    let [encodedRevision, errEU64] = encodeU64$1(revision);
    if (errEU64 !== null) {
        return [nu8$2, addContextToErr$1(errEU64, "unable to encode the revision number")];
    }
    // Build the signing data.
    let dataToSign = new Uint8Array(32 + 8 + data.length + 8);
    dataToSign.set(dataKey, 0);
    dataToSign.set(encodedData, 32);
    dataToSign.set(encodedRevision, 32 + 8 + data.length);
    let sigHash = blake2b(dataToSign);
    // Sign the data.
    let [sig, errS] = ed25519Sign(sigHash, secretKey);
    if (errS !== null) {
        return [nu8$2, addContextToErr$1(errS, "unable to sign registry entry")];
    }
    return [sig, null];
}
// deriveRegistryEntryID derives a registry entry ID from a provided pubkey and
// datakey.
function deriveRegistryEntryID(pubkey, datakey) {
    // Check the lengths of the inputs.
    if (pubkey.length !== 32) {
        return [nu8$2, "pubkey is invalid, length is wrong"];
    }
    if (datakey.length !== 32) {
        return [nu8$2, "datakey is not a valid hash, length is wrong"];
    }
    // Establish the encoding. First 16 bytes is a specifier, second 8
    // bytes declares the length of the pubkey, the next 32 bytes is the
    // pubkey and the final 32 bytes is the datakey. This encoding is
    // determined by the Sia protocol.
    let encoding = new Uint8Array(16 + 8 + 32 + 32);
    // Set the specifier.
    encoding[0] = "e".charCodeAt(0);
    encoding[1] = "d".charCodeAt(0);
    encoding[2] = "2".charCodeAt(0);
    encoding[3] = "5".charCodeAt(0);
    encoding[4] = "5".charCodeAt(0);
    encoding[5] = "1".charCodeAt(0);
    encoding[6] = "9".charCodeAt(0);
    // Set the pubkey.
    let [encodedLen, errU64] = encodeU64$1(32n);
    if (errU64 !== null) {
        return [nu8$2, addContextToErr$1(errU64, "unable to encode pubkey length")];
    }
    encoding.set(encodedLen, 16);
    encoding.set(pubkey, 16 + 8);
    encoding.set(datakey, 16 + 8 + 32);
    // Get the final ID by hashing the encoded data.
    let id = blake2b(encoding);
    return [id, null];
}
// entryIDToSkylink converts a registry entry id to a resolver skylink.
function entryIDToSkylink(entryID) {
    let v2Skylink = new Uint8Array(34);
    v2Skylink.set(entryID, 2);
    v2Skylink[0] = 1;
    return bufToB64$1(v2Skylink);
}
// resolverLink will take a registryEntryID and return the corresponding
// resolver link.
function resolverLink(entryID) {
    if (entryID.length !== 32) {
        return ["", "provided entry ID has the wrong length"];
    }
    let v2Skylink = new Uint8Array(34);
    v2Skylink.set(entryID, 2);
    v2Skylink[0] = 1;
    let skylink = bufToB64$1(v2Skylink);
    return [skylink, null];
}
// registryEntryKeys will use the user's seed to derive a keypair and a datakey
// using the provided seed and tags. The keypairTag is a tag which salts the
// keypair. If you change the input keypairTag, the resulting public key and
// secret key will be different. The dataKey tag is the salt for the datakey,
// if you provide a different datakey tag, the resulting datakey will be
// different.
//
// Note that changing the keypair tag will also change the resulting datakey.
// The purpose of the keypair tag is to obfuscate the fact that two registry
// entries are owned by the same identity. This obfuscation would break if two
// different public keys were using the same datakey. Changing the datakey does
// not change the public key.
function taggedRegistryEntryKeys(seed, keypairTagStr, datakeyTagStr) {
    if (seed.length !== SEED_BYTES) {
        return [nkp, nu8$2, "seed has the wrong length"];
    }
    if (keypairTagStr.length > 255) {
        return [nkp, nu8$2, "keypairTag must be less than 256 characters"];
    }
    // If no datakey tag was provided, use the empty string.
    if (datakeyTagStr === undefined) {
        datakeyTagStr = "";
    }
    // Generate a unique set of entropy using the seed and keypairTag.
    let keypairTag = new TextEncoder().encode(keypairTagStr);
    let entropyInput = new Uint8Array(keypairTag.length + seed.length);
    entropyInput.set(seed, 0);
    entropyInput.set(keypairTag, seed.length);
    let keypairEntropy = sha512(entropyInput);
    // Use the seed to dervie the datakey for the registry entry. We use
    // a different tag to ensure that the datakey is independently random, such
    // that the registry entry looks like it could be any other registry entry.
    //
    // We don't want it to be possible for two different combinations of
    // tags to end up with the same datakey. If you don't use a length
    // prefix, for example the tags ["123", "456"] and ["12", "3456"] would
    // have the same datakey. You have to add the length prefix to the
    // first tag otherwise you can get pairs like ["6", "4321"] and ["65",
    // "321"] which could end up with the same datakey.
    let datakeyTag = new TextEncoder().encode(datakeyTagStr);
    let datakeyInput = new Uint8Array(seed.length + 1 + keypairTag.length + datakeyTag.length);
    let keypairLen = new Uint8Array(1);
    keypairLen[0] = keypairTag.length;
    datakeyInput.set(seed);
    datakeyInput.set(keypairLen, seed.length);
    datakeyInput.set(keypairTag, seed.length + 1);
    datakeyInput.set(datakeyTag, seed.length + 1 + keypairTag.length);
    let datakeyEntropy = sha512(datakeyInput);
    // Create the private key for the registry entry.
    let [keypair, errKPFE] = ed25519KeypairFromEntropy(keypairEntropy.slice(0, 32));
    if (errKPFE !== null) {
        return [nkp, nu8$2, addContextToErr$1(errKPFE, "unable to derive keypair")];
    }
    let datakey = datakeyEntropy.slice(0, 32);
    return [keypair, datakey, null];
}
// verifyRegistrySignature will verify the signature of a registry entry.
function verifyRegistrySignature(pubkey, datakey, data, revision, sig) {
    let [encodedData, errEPB] = encodePrefixedBytes(data);
    if (errEPB !== null) {
        return false;
    }
    let [encodedRevision, errU64] = encodeU64$1(revision);
    if (errU64 !== null) {
        return false;
    }
    let dataToVerify = new Uint8Array(32 + 8 + data.length + 8);
    dataToVerify.set(datakey, 0);
    dataToVerify.set(encodedData, 32);
    dataToVerify.set(encodedRevision, 32 + 8 + data.length);
    let sigHash = blake2b(dataToVerify);
    return ed25519Verify(sigHash, sig, pubkey);
}

// validateSkyfilePath checks whether the provided path is a valid path for a
// file in a skylink.
function validateSkyfilePath(path) {
    if (path === "") {
        return "path cannot be blank";
    }
    if (path === "..") {
        return "path cannot be ..";
    }
    if (path === ".") {
        return "path cannot be .";
    }
    if (path.startsWith("/")) {
        return "metdata.Filename cannot start with /";
    }
    if (path.startsWith("../")) {
        return "metdata.Filename cannot start with ../";
    }
    if (path.startsWith("./")) {
        return "metdata.Filename cannot start with ./";
    }
    let pathElems = path.split("/");
    for (let i = 0; i < pathElems.length; i++) {
        if (pathElems[i] === ".") {
            return "path cannot have a . element";
        }
        if (pathElems[i] === "..") {
            return "path cannot have a .. element";
        }
        if (pathElems[i] === "") {
            return "path cannot have an empty element, cannot contain //";
        }
    }
    return null;
}
// validateSkyfileMetadata checks whether the provided metadata is valid
// metadata for a skyfile.
function validateSkyfileMetadata(metadata) {
    // Check that the filename is valid.
    if (!("Filename" in metadata)) {
        return "metadata.Filename does not exist";
    }
    if (typeof metadata.Filename !== "string") {
        return "metadata.Filename is not a string";
    }
    let errVSP = validateSkyfilePath(metadata.Filename);
    if (errVSP !== null) {
        return addContextToErr$1(errVSP, "metadata.Filename does not have a valid path");
    }
    // Check that there are no subfiles.
    if ("Subfiles" in metadata) {
        // TODO: Fill this out using code from
        // skymodules.ValidateSkyfileMetadata to support subfiles.
        return "cannot upload files that have subfiles";
    }
    // Check that the default path rules are being respected.
    if ("DisableDefaultPath" in metadata && "DefaultPath" in metadata) {
        return "cannot set both a DefaultPath and also DisableDefaultPath";
    }
    if ("DefaultPath" in metadata) {
        // TODO: Fill this out with code from
        // skymodules.validateDefaultPath to support subfiles and
        // default paths.
        return "cannot set a default path if there are no subfiles";
    }
    if ("TryFiles" in metadata) {
        if (!metadata.TryFiles.IsArray()) {
            return "metadata.TryFiles must be an array";
        }
        if (metadata.TryFiles.length === 0) {
            return "metadata.TryFiles should not be empty";
        }
        if ("DefaultPath" in metadata) {
            return "metadata.TryFiles cannot be used alongside DefaultPath";
        }
        if ("DisableDefaultPath" in metadata) {
            return "metadata.TryFiles cannot be used alongside DisableDefaultPath";
        }
        // TODO: finish the TryFiles checking using skymodules.ValidateTryFiles
        return "TryFiles is not supported at this time";
    }
    if ("ErrorPages" in metadata) {
        // TODO: finish using skymodules.ValidateErrorPages
        return "ErrorPages is not supported at this time";
    }
    return null;
}
// validSkylink returns true if the provided Uint8Array is a valid skylink.
// This is an alias for 'parseSkylinkBitfield', as both perform the same
// validation.
function validSkylink(skylink) {
    if (skylink.length !== 34) {
        return false;
    }
    let [, , , errPSB] = parseSkylinkBitfield(skylink);
    if (errPSB !== null) {
        return false;
    }
    return true;
}

// Helper consts to make returning empty values alongside errors more
// convenient.
const nu8$1 = new Uint8Array(0);
// verifyResolverLinkProof will check that the given resolver proof matches the
// provided skylink. If the proof is correct and the signature matches, the
// data will be returned. The returned link will be a verified skylink.
function verifyResolverLinkProof(skylink, proof) {
    // Verify the presented skylink is formatted correctly.
    if (skylink.length !== 34) {
        return [nu8$1, "skylink is malformed, expecting 34 bytes"];
    }
    // Verify that all of the required fields are present in the proof.
    if (!("data" in proof) ||
        !("datakey" in proof) ||
        !("publickey" in proof) ||
        !("signature" in proof) ||
        !("type" in proof) ||
        !("revision" in proof)) {
        return [nu8$1, "proof is malformed, fields are missing"];
    }
    if (!("algorithm" in proof.publickey) || !("key" in proof.publickey)) {
        return [nu8$1, "pubkey is malformed"];
    }
    // Verify the typing of the fields.
    if (typeof proof.data !== "string") {
        return [nu8$1, "data is malformed"];
    }
    let dataStr = proof.data;
    if (typeof proof.datakey !== "string") {
        return [nu8$1, "datakey is malformed"];
    }
    let datakeyStr = proof.datakey;
    if (proof.publickey.algorithm !== "ed25519") {
        return [nu8$1, "pubkey has unrecognized algorithm"];
    }
    if (typeof proof.publickey.key !== "string") {
        return [nu8$1, "pubkey key is malformed"];
    }
    let pubkeyStr = proof.publickey.key;
    if (typeof proof.signature !== "string") {
        return [nu8$1, "signature is malformed"];
    }
    if (proof.type !== 1n) {
        return [nu8$1, "registry entry has unrecognized type: " + tryStringify$1(proof.type)];
    }
    let sigStr = proof.signature;
    if (typeof proof.revision !== "bigint") {
        return [nu8$1, "revision is malformed"];
    }
    let revision = proof.revision;
    // Decode all of the fields. They are presented in varied types and
    // encodings.
    let [data, errD] = hexToBuf(dataStr);
    if (errD !== null) {
        return [nu8$1, addContextToErr$1(errD, "data is invalid hex")];
    }
    let [datakey, errDK] = hexToBuf(datakeyStr);
    if (errDK !== null) {
        return [nu8$1, addContextToErr$1(errDK, "datakey is invalid hex")];
    }
    let [pubkey, errPK] = b64ToBuf(pubkeyStr);
    if (errPK !== null) {
        return [nu8$1, addContextToErr$1(errPK, "pubkey key is invalid base64")];
    }
    let [sig, errS] = hexToBuf(sigStr);
    if (errS !== null) {
        return [nu8$1, addContextToErr$1(errS, "signature is invalid hex")];
    }
    // Verify that the data is a skylink - this is a proof for a resolver,
    // which means the proof is pointing to a specific skylink.
    if (!validSkylink(data)) {
        return [nu8$1, "this skylink does not resolve to another skylink"];
    }
    // Verify that the combination of the datakey and the public key match
    // the skylink.
    let [entryID, errREID] = deriveRegistryEntryID(pubkey, datakey);
    if (errREID !== null) {
        return [nu8$1, addContextToErr$1(errREID, "proof pubkey is malformed")];
    }
    let linkID = skylink.slice(2, 34);
    for (let i = 0; i < entryID.length; i++) {
        if (entryID[i] !== linkID[i]) {
            return [nu8$1, "proof pubkey and datakey do not match the skylink root"];
        }
    }
    // Verify the signature.
    if (!verifyRegistrySignature(pubkey, datakey, data, revision, sig)) {
        return [nu8$1, "signature does not match"];
    }
    return [data, null];
}
// verifyResolverLinkProofs will verify a set of resolver link proofs provided
// by a portal after performing a resolver link lookup. Each proof corresponds
// to one level of resolution. The final value returned will be the V1 skylink
// at the end of the chain.
//
// This function treats the proof as untrusted data and will verify all of the
// fields that are provided.
function verifyResolverLinkProofs(skylink, proof) {
    // Check that the proof is an array.
    if (!Array.isArray(proof)) {
        return [nu8$1, "provided proof is not an array: " + tryStringify$1(proof)];
    }
    if (proof.length === 0) {
        return [nu8$1, "proof array is empty"];
    }
    // Check each proof in the chain, returning the final skylink.
    for (let i = 0; i < proof.length; i++) {
        let errVRLP;
        [skylink, errVRLP] = verifyResolverLinkProof(skylink, proof[i]);
        if (errVRLP !== null) {
            return [nu8$1, addContextToErr$1(errVRLP, "one of the resolution proofs is invalid")];
        }
    }
    // Though it says 'skylink', the verifier is actually just returning
    // whatever the registry data is. We need to check that the final value
    // is a V1 skylink.
    if (skylink.length !== 34) {
        return [nu8$1, "final value returned by the resolver link is not a skylink"];
    }
    let [version, , , errPSB] = parseSkylinkBitfield(skylink);
    if (errPSB !== null) {
        return [nu8$1, addContextToErr$1(errPSB, "final value returned by resolver link is not a valid skylink")];
    }
    if (version !== 1n) {
        return [nu8$1, "final value returned by resolver link is not a v1 skylink"];
    }
    return [skylink, null];
}

// Establish the function that verifies the result is correct.
//
// The fileDataPtr input is an empty object that verifyDownloadResponse will
// fill with the fileData. It basically allows the verify function to
// communicate back to the caller. Note that the verify function might be
// called multiple times in a row if early portals fail to retrieve the data,
// but the verify function doesn't write to the fileDataPtr until it knows that
// the download is final.
function verifyDownloadResponse(response, u8Link, fileDataPtr) {
    return new Promise((resolve) => {
        // Currently the only valid successful response for a download is a
        // 200. Anything else is unexpected and counts as an error.
        if (response.status !== 200) {
            resolve("unrecognized response status " + tryStringify$1(response.status) + ", expecting 200");
            return;
        }
        // Break the input link into its components.
        let [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
        if (errBF !== null) {
            resolve(addContextToErr$1(errBF, "skylink bitfield could not be parsed"));
            return;
        }
        // If this is a resolver skylink, we need to verify the resolver
        // proofs. This conditional will update the value of 'u8Link' to be the
        // value of the fully resolved link.
        if (version === 2n) {
            // Verify the resolver proofs and update the link to the correct
            // link.
            let proofJSON = response.headers.get("skynet-proof");
            if (proofJSON === null || proofJSON === undefined) {
                resolve("response did not include resolver proofs");
                return;
            }
            let [proof, errPJ] = parseJSON(proofJSON);
            if (errPJ !== null) {
                resolve(addContextToErr$1(errPJ, "unable to parse resolver link proofs"));
                return;
            }
            // We need to update the u8Link in-place so that the rest of the
            // function doesn't need special handling.
            let errVRLP;
            [u8Link, errVRLP] = verifyResolverLinkProofs(u8Link, proof);
            if (errVRLP !== null) {
                resolve(addContextToErr$1(errVRLP, "unable to verify resolver link proofs"));
                return;
            }
            // We also need to update the parsed bitfield, because the link has
            // changed.
            [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
            if (errBF !== null) {
                resolve(addContextToErr$1(errBF, "fully resolved link has invalid bitfield"));
                return;
            }
            if (version !== 1n) {
                resolve("fully resolved link does not have version 1");
                return;
            }
        }
        response
            .arrayBuffer()
            .then((buf) => {
            let [fileData, portalAtFault, errVD] = verifyDownload(u8Link.slice(2, 34), offset, fetchSize, buf);
            if (errVD !== null && portalAtFault) {
                resolve("received invalid download from portal");
                return;
            }
            if (errVD !== null) {
                fileDataPtr.fileData = new Uint8Array(0);
                fileDataPtr.err = addContextToErr$1(errVD, "file is corrupt");
            }
            else {
                fileDataPtr.fileData = fileData;
                fileDataPtr.err = null;
            }
            // If the portal is not at fault, we tell progressiveFetch that
            // the download was a success. The caller will have to check
            // the fileDataPtr
            resolve(null);
        })
            .catch((err) => {
            resolve(addContextToErr$1(err, "unable to read response body"));
        });
    });
}

// progressiveFetchHelper is the full progressiveFetch function, split out into
// a helper because the inptus/api is more complicated but only necessary for
// internal use.
function progressiveFetchHelper$1(pfm, resolve, verifyFunction) {
    // If we run out of portals, return an error.
    if (pfm.remainingPortals.length === 0) {
        let newLog = "query failed because all portals have been tried";
        pfm.logs.push(newLog);
        resolve({
            success: false,
            portal: null,
            response: null,
            portalsFailed: pfm.portalsFailed,
            responsesFailed: pfm.responsesFailed,
            messagesFailed: pfm.messagesFailed,
            remainingPortals: null,
            logs: pfm.logs,
        });
        return;
    }
    // Grab the portal and query.
    let portal = pfm.remainingPortals.shift();
    let query = portal + pfm.endpoint;
    // Create a helper function for trying the next portal.
    let nextPortal = function (response, log) {
        if (response !== null) {
            response
                .clone()
                .text()
                .then((t) => {
                pfm.logs.push(log);
                pfm.portalsFailed.push(portal);
                pfm.responsesFailed.push(response);
                pfm.messagesFailed.push(t);
                progressiveFetchHelper$1(pfm, resolve, verifyFunction);
            });
        }
        else {
            pfm.logs.push(log);
            pfm.portalsFailed.push(portal);
            pfm.responsesFailed.push(response);
            pfm.messagesFailed.push("");
            progressiveFetchHelper$1(pfm, resolve, verifyFunction);
        }
    };
    // Try sending the query to the portal.
    fetch(query, pfm.fetchOpts)
        .then((response) => {
        // Check for a 5XX error.
        if (!("status" in response) || typeof response.status !== "number") {
            nextPortal(response, "portal has returned invalid response\n" + tryStringify$1({ portal, query }));
            return;
        }
        if (response.status < 200 || response.status >= 300) {
            nextPortal(response, "portal has returned error status\n" + tryStringify$1({ portal, query }));
            return;
        }
        // Check the result against the verify function.
        verifyFunction(response.clone()).then((errVF) => {
            if (errVF !== null) {
                nextPortal(response, "verify function has returned an error from portal " + portal + " - " + errVF);
                return;
            }
            // Success! Return the response.
            resolve({
                success: true,
                portal,
                response,
                portalsFailed: pfm.portalsFailed,
                responsesFailed: pfm.responsesFailed,
                remainingPortals: pfm.remainingPortals,
                messagesFailed: pfm.messagesFailed,
                logs: pfm.logs,
            });
        });
    })
        .catch((err) => {
        // This portal failed, try again with the next portal.
        nextPortal(null, "fetch returned an error\n" + tryStringify$1(err) + tryStringify$1(pfm.fetchOpts));
        return;
    });
}
// progressiveFetch will query multiple portals until one returns with a
// non-error response. In the event of a 4XX response, progressiveFetch will
// keep querying additional portals to try and find a working 2XX response. In
// the event that no working 2XX response is found, the first 4XX response will
// be returned.
//
// If progressiveFetch returns a 2XX response, it merely means that the portal
// returned a 2XX response. progressiveFetch cannot be confident that the
// portal has returned a correct/honest message, the verification has to be
// handled by the caller. The response (progressiveFetchResult) contains the
// list of portals that progressiveFetch hasn't tried yet. In the event that
// the 2XX response is not correct, the progressiveFetchResult contains the
// list of failover portals that have not been used yet, allowing
// progressiveFetch to be called again.
//
// This progressive method of querying portals helps prevent queries from
// failing, but if the first portal is not a good portal it introduces
// substantial latency. progressiveFetch does not do anything to make sure the
// portals are the best portals, it just queries them in order. The caller
// should make a best attempt to always have the best, most reliable and
// fastest portal as the first portal in the list.
//
// The reason that we don't blindly accept a 4XX response from a portal is that
// we have no way of verifying that the 4XX is legitimate. We don't trust the
// portal, and we can't give a rogue portal the opportunity to interrupt our
// user experience simply by returning a dishonest 404. So we need to keep
// querying more portals and gain confidence that the 404 a truthful response.
function progressiveFetch$1(endpoint, fetchOpts, portals, verifyFunction) {
    let portalsCopy = [...portals];
    return new Promise((resolve) => {
        let pfm = {
            endpoint,
            fetchOpts,
            remainingPortals: portalsCopy,
            portalsFailed: [],
            responsesFailed: [],
            messagesFailed: [],
            logs: [],
        };
        progressiveFetchHelper$1(pfm, resolve, verifyFunction);
    });
}

// downloadSkylink will download the provided skylink.
function downloadSkylink(skylink) {
    return new Promise((resolve) => {
        // Get the Uint8Array of the input skylink.
        let [u8Link, errBTB] = b64ToBuf(skylink);
        if (errBTB !== null) {
            resolve([new Uint8Array(0), addContextToErr$1(errBTB, "unable to decode skylink")]);
            return;
        }
        if (!validSkylink(u8Link)) {
            resolve([new Uint8Array(0), "skylink appears to be invalid"]);
            return;
        }
        // Prepare the download call.
        let endpoint = "/skynet/trustless/basesector/" + skylink;
        let fileDataPtr = { fileData: new Uint8Array(0), err: null };
        let verifyFunction = function (response) {
            return verifyDownloadResponse(response, u8Link, fileDataPtr);
        };
        // Perform the download call.
        progressiveFetch$1(endpoint, null, defaultPortalList, verifyFunction).then((result) => {
            // Return an error if the call failed.
            if (result.success !== true) {
                // Check for a 404.
                for (let i = 0; i < result.responsesFailed.length; i++) {
                    if (result.responsesFailed[i].status === 404) {
                        resolve([new Uint8Array(0), "404"]);
                        return;
                    }
                }
                // Error is not a 404, return the logs as the error.
                let err = tryStringify$1(result.logs);
                resolve([new Uint8Array(0), addContextToErr$1(err, "unable to complete download")]);
                return;
            }
            // Check if the portal is honest but the download is corrupt.
            if (fileDataPtr.err !== null) {
                resolve([new Uint8Array(0), addContextToErr$1(fileDataPtr.err, "download is corrupt")]);
                return;
            }
            resolve([fileDataPtr.fileData, null]);
        });
    });
}

// verifyDecodedResp will verify the decoded response from a portal for a
// regRead call.
function verifyDecodedResp(resp, data, pubkey, datakey) {
    // Status is expected to be 200.
    if (resp.status !== 200) {
        return "expected 200 response status, got: " + tryStringify$1(resp.status);
    }
    // Verify that all required fields were provided.
    if (!("data" in data)) {
        return "expected data field in response";
    }
    if (typeof data.data !== "string") {
        return "expected data field to be a string";
    }
    if (!("revision" in data)) {
        return "expected revision in response";
    }
    if (typeof data.revision !== "bigint") {
        return "expected revision to be a number";
    }
    if (!("signature" in data)) {
        return "expected signature in response";
    }
    if (typeof data.signature !== "string") {
        return "expected signature to be a string";
    }
    // Parse out the fields we need.
    let [entryData, errHTB] = hexToBuf(data.data);
    if (errHTB !== null) {
        return "could not decode registry data from response";
    }
    let [sig, errHTB2] = hexToBuf(data.signature);
    if (errHTB2 !== null) {
        return "could not decode signature from response";
    }
    // Verify the signature.
    if (!verifyRegistrySignature(pubkey, datakey, entryData, data.revision, sig)) {
        return "signature mismatch";
    }
    // TODO: Need to be handling type 2 registry entries here otherwise we will
    // be flagging non malicious portals as malicious.
    return null;
}
// verifyRegistryReadResponse will verify that the registry read response from
// the portal was correct.
function verifyRegistryReadResponse(resp, pubkey, datakey) {
    return new Promise((resolve) => {
        resp
            .text()
            .then((str) => {
            let [obj, errPJ] = parseJSON(str);
            if (errPJ !== null) {
                resolve(addContextToErr$1(errPJ, "unable to parse registry response"));
                return;
            }
            let errVDR = verifyDecodedResp(resp, obj, pubkey, datakey);
            if (errVDR !== null) {
                resolve(addContextToErr$1(errVDR, "regRead response failed verification"));
                return;
            }
            resolve(null);
        })
            .catch((err) => {
            resolve(addContextToErr$1(tryStringify$1(err), "unable to decode response"));
        });
    });
}
// verifyRegistryWriteResponse will verify that the response from a
// registryWrite call is valid. There's not much to verify beyond looking for
// the right response code, as the portal is not providing us with data, just
// confirming that a write succeeded.
function verifyRegistryWriteResponse(resp) {
    return new Promise((resolve) => {
        if (resp.status === 204) {
            resolve(null);
        }
        resolve("expecting 200 status code for registry write, got:" + resp.status.toString());
    });
}

// stringifyjson.ts is split into a separate file to avoid a circular
// dependency. If you merge it with stringifytry.ts you have a circular import
// where err.js is importing stringify.js and stringify.js is importing err.js.
// Splitting the functions out resolves this issue.
// jsonStringify is a replacement for JSON.stringify that returns an error
// rather than throwing.
function jsonStringify(obj) {
    try {
        let str = JSON.stringify(obj);
        return [str, null];
    }
    catch (err) {
        return ["", addContextToErr$1(tryStringify$1(err), "unable to stringify object")];
    }
}

var dist$2 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	blake2b: blake2b,
	defaultPortalList: defaultPortalList,
	dictionary: dictionary,
	downloadSkylink: downloadSkylink,
	verifyDownload: verifyDownload,
	verifyDownloadResponse: verifyDownloadResponse,
	ed25519Sign: ed25519Sign,
	ed25519Verify: ed25519Verify,
	b64ToBuf: b64ToBuf,
	bufToB64: bufToB64$1,
	bufToHex: bufToHex,
	bufToStr: bufToStr,
	encodePrefixedBytes: encodePrefixedBytes,
	encodeU64: encodeU64$1,
	hexToBuf: hexToBuf,
	addContextToErr: addContextToErr$1,
	composeErr: composeErr$1,
	blake2bAddLeafBytesToProofStack: blake2bAddLeafBytesToProofStack,
	blake2bMerkleRoot: blake2bMerkleRoot,
	blake2bProofStackRoot: blake2bProofStackRoot,
	parseJSON: parseJSON,
	progressiveFetch: progressiveFetch$1,
	computeRegistrySignature: computeRegistrySignature,
	deriveRegistryEntryID: deriveRegistryEntryID,
	entryIDToSkylink: entryIDToSkylink,
	resolverLink: resolverLink,
	taggedRegistryEntryKeys: taggedRegistryEntryKeys,
	verifyRegistrySignature: verifyRegistrySignature,
	verifyRegistryReadResponse: verifyRegistryReadResponse,
	verifyRegistryWriteResponse: verifyRegistryWriteResponse,
	deriveChildSeed: deriveChildSeed,
	deriveMyskyRootKeypair: deriveMyskyRootKeypair,
	generateSeedPhraseDeterministic: generateSeedPhraseDeterministic,
	seedPhraseToSeed: seedPhraseToSeed,
	validSeedPhrase: validSeedPhrase,
	sha512: sha512,
	parseSkylinkBitfield: parseSkylinkBitfield,
	skylinkV1Bitfield: skylinkV1Bitfield,
	validateSkyfileMetadata: validateSkyfileMetadata,
	validateSkyfilePath: validateSkyfilePath,
	validSkylink: validSkylink,
	verifyResolverLinkProofs: verifyResolverLinkProofs,
	jsonStringify: jsonStringify,
	tryStringify: tryStringify$1
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(dist$2);

var require$$1 = /*@__PURE__*/getAugmentedNamespace(seed);

var require$$2$1 = /*@__PURE__*/getAugmentedNamespace(dictionary$1);

/**
 * Returns a `Buffer` instance from the given data URI `uri`.
 *
 * @param {String} uri Data URI to turn into a Buffer instance
 * @returns {Buffer} Buffer instance from Data URI
 * @api public
 */
function dataUriToBuffer(uri) {
    if (!/^data:/i.test(uri)) {
        throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
    }
    // strip newlines
    uri = uri.replace(/\r?\n/g, '');
    // split the URI up into the "metadata" and the "data" portions
    const firstComma = uri.indexOf(',');
    if (firstComma === -1 || firstComma <= 4) {
        throw new TypeError('malformed data: URI');
    }
    // remove the "data:" scheme and parse the metadata
    const meta = uri.substring(5, firstComma).split(';');
    let charset = '';
    let base64 = false;
    const type = meta[0] || 'text/plain';
    let typeFull = type;
    for (let i = 1; i < meta.length; i++) {
        if (meta[i] === 'base64') {
            base64 = true;
        }
        else {
            typeFull += `;${meta[i]}`;
            if (meta[i].indexOf('charset=') === 0) {
                charset = meta[i].substring(8);
            }
        }
    }
    // defaults to US-ASCII only if type is not provided
    if (!meta[0] && !charset.length) {
        typeFull += ';charset=US-ASCII';
        charset = 'US-ASCII';
    }
    // get the encoded data portion and decode URI-encoded chars
    const encoding = base64 ? 'base64' : 'ascii';
    const data = unescape(uri.substring(firstComma + 1));
    const buffer = Buffer.from(data, encoding);
    // set `.type` and `.typeFull` properties to MIME type
    buffer.type = type;
    buffer.typeFull = typeFull;
    // set the `.charset` property
    buffer.charset = charset;
    return buffer;
}

var ponyfill_es2018 = {exports: {}};

/**
 * web-streams-polyfill v3.2.1
 */

var hasRequiredPonyfill_es2018;

function requirePonyfill_es2018 () {
	if (hasRequiredPonyfill_es2018) return ponyfill_es2018.exports;
	hasRequiredPonyfill_es2018 = 1;
	(function (module, exports) {
		(function (global, factory) {
		    factory(exports) ;
		}(commonjsGlobal, (function (exports) {
		    /// <reference lib="es2015.symbol" />
		    const SymbolPolyfill = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ?
		        Symbol :
		        description => `Symbol(${description})`;

		    /// <reference lib="dom" />
		    function noop() {
		        return undefined;
		    }
		    function getGlobals() {
		        if (typeof self !== 'undefined') {
		            return self;
		        }
		        else if (typeof window !== 'undefined') {
		            return window;
		        }
		        else if (typeof commonjsGlobal !== 'undefined') {
		            return commonjsGlobal;
		        }
		        return undefined;
		    }
		    const globals = getGlobals();

		    function typeIsObject(x) {
		        return (typeof x === 'object' && x !== null) || typeof x === 'function';
		    }
		    const rethrowAssertionErrorRejection = noop;

		    const originalPromise = Promise;
		    const originalPromiseThen = Promise.prototype.then;
		    const originalPromiseResolve = Promise.resolve.bind(originalPromise);
		    const originalPromiseReject = Promise.reject.bind(originalPromise);
		    function newPromise(executor) {
		        return new originalPromise(executor);
		    }
		    function promiseResolvedWith(value) {
		        return originalPromiseResolve(value);
		    }
		    function promiseRejectedWith(reason) {
		        return originalPromiseReject(reason);
		    }
		    function PerformPromiseThen(promise, onFulfilled, onRejected) {
		        // There doesn't appear to be any way to correctly emulate the behaviour from JavaScript, so this is just an
		        // approximation.
		        return originalPromiseThen.call(promise, onFulfilled, onRejected);
		    }
		    function uponPromise(promise, onFulfilled, onRejected) {
		        PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), undefined, rethrowAssertionErrorRejection);
		    }
		    function uponFulfillment(promise, onFulfilled) {
		        uponPromise(promise, onFulfilled);
		    }
		    function uponRejection(promise, onRejected) {
		        uponPromise(promise, undefined, onRejected);
		    }
		    function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
		        return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
		    }
		    function setPromiseIsHandledToTrue(promise) {
		        PerformPromiseThen(promise, undefined, rethrowAssertionErrorRejection);
		    }
		    const queueMicrotask = (() => {
		        const globalQueueMicrotask = globals && globals.queueMicrotask;
		        if (typeof globalQueueMicrotask === 'function') {
		            return globalQueueMicrotask;
		        }
		        const resolvedPromise = promiseResolvedWith(undefined);
		        return (fn) => PerformPromiseThen(resolvedPromise, fn);
		    })();
		    function reflectCall(F, V, args) {
		        if (typeof F !== 'function') {
		            throw new TypeError('Argument is not a function');
		        }
		        return Function.prototype.apply.call(F, V, args);
		    }
		    function promiseCall(F, V, args) {
		        try {
		            return promiseResolvedWith(reflectCall(F, V, args));
		        }
		        catch (value) {
		            return promiseRejectedWith(value);
		        }
		    }

		    // Original from Chromium
		    // https://chromium.googlesource.com/chromium/src/+/0aee4434a4dba42a42abaea9bfbc0cd196a63bc1/third_party/blink/renderer/core/streams/SimpleQueue.js
		    const QUEUE_MAX_ARRAY_SIZE = 16384;
		    /**
		     * Simple queue structure.
		     *
		     * Avoids scalability issues with using a packed array directly by using
		     * multiple arrays in a linked list and keeping the array size bounded.
		     */
		    class SimpleQueue {
		        constructor() {
		            this._cursor = 0;
		            this._size = 0;
		            // _front and _back are always defined.
		            this._front = {
		                _elements: [],
		                _next: undefined
		            };
		            this._back = this._front;
		            // The cursor is used to avoid calling Array.shift().
		            // It contains the index of the front element of the array inside the
		            // front-most node. It is always in the range [0, QUEUE_MAX_ARRAY_SIZE).
		            this._cursor = 0;
		            // When there is only one node, size === elements.length - cursor.
		            this._size = 0;
		        }
		        get length() {
		            return this._size;
		        }
		        // For exception safety, this method is structured in order:
		        // 1. Read state
		        // 2. Calculate required state mutations
		        // 3. Perform state mutations
		        push(element) {
		            const oldBack = this._back;
		            let newBack = oldBack;
		            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
		                newBack = {
		                    _elements: [],
		                    _next: undefined
		                };
		            }
		            // push() is the mutation most likely to throw an exception, so it
		            // goes first.
		            oldBack._elements.push(element);
		            if (newBack !== oldBack) {
		                this._back = newBack;
		                oldBack._next = newBack;
		            }
		            ++this._size;
		        }
		        // Like push(), shift() follows the read -> calculate -> mutate pattern for
		        // exception safety.
		        shift() { // must not be called on an empty queue
		            const oldFront = this._front;
		            let newFront = oldFront;
		            const oldCursor = this._cursor;
		            let newCursor = oldCursor + 1;
		            const elements = oldFront._elements;
		            const element = elements[oldCursor];
		            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
		                newFront = oldFront._next;
		                newCursor = 0;
		            }
		            // No mutations before this point.
		            --this._size;
		            this._cursor = newCursor;
		            if (oldFront !== newFront) {
		                this._front = newFront;
		            }
		            // Permit shifted element to be garbage collected.
		            elements[oldCursor] = undefined;
		            return element;
		        }
		        // The tricky thing about forEach() is that it can be called
		        // re-entrantly. The queue may be mutated inside the callback. It is easy to
		        // see that push() within the callback has no negative effects since the end
		        // of the queue is checked for on every iteration. If shift() is called
		        // repeatedly within the callback then the next iteration may return an
		        // element that has been removed. In this case the callback will be called
		        // with undefined values until we either "catch up" with elements that still
		        // exist or reach the back of the queue.
		        forEach(callback) {
		            let i = this._cursor;
		            let node = this._front;
		            let elements = node._elements;
		            while (i !== elements.length || node._next !== undefined) {
		                if (i === elements.length) {
		                    node = node._next;
		                    elements = node._elements;
		                    i = 0;
		                    if (elements.length === 0) {
		                        break;
		                    }
		                }
		                callback(elements[i]);
		                ++i;
		            }
		        }
		        // Return the element that would be returned if shift() was called now,
		        // without modifying the queue.
		        peek() { // must not be called on an empty queue
		            const front = this._front;
		            const cursor = this._cursor;
		            return front._elements[cursor];
		        }
		    }

		    function ReadableStreamReaderGenericInitialize(reader, stream) {
		        reader._ownerReadableStream = stream;
		        stream._reader = reader;
		        if (stream._state === 'readable') {
		            defaultReaderClosedPromiseInitialize(reader);
		        }
		        else if (stream._state === 'closed') {
		            defaultReaderClosedPromiseInitializeAsResolved(reader);
		        }
		        else {
		            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
		        }
		    }
		    // A client of ReadableStreamDefaultReader and ReadableStreamBYOBReader may use these functions directly to bypass state
		    // check.
		    function ReadableStreamReaderGenericCancel(reader, reason) {
		        const stream = reader._ownerReadableStream;
		        return ReadableStreamCancel(stream, reason);
		    }
		    function ReadableStreamReaderGenericRelease(reader) {
		        if (reader._ownerReadableStream._state === 'readable') {
		            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
		        }
		        else {
		            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
		        }
		        reader._ownerReadableStream._reader = undefined;
		        reader._ownerReadableStream = undefined;
		    }
		    // Helper functions for the readers.
		    function readerLockException(name) {
		        return new TypeError('Cannot ' + name + ' a stream using a released reader');
		    }
		    // Helper functions for the ReadableStreamDefaultReader.
		    function defaultReaderClosedPromiseInitialize(reader) {
		        reader._closedPromise = newPromise((resolve, reject) => {
		            reader._closedPromise_resolve = resolve;
		            reader._closedPromise_reject = reject;
		        });
		    }
		    function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
		        defaultReaderClosedPromiseInitialize(reader);
		        defaultReaderClosedPromiseReject(reader, reason);
		    }
		    function defaultReaderClosedPromiseInitializeAsResolved(reader) {
		        defaultReaderClosedPromiseInitialize(reader);
		        defaultReaderClosedPromiseResolve(reader);
		    }
		    function defaultReaderClosedPromiseReject(reader, reason) {
		        if (reader._closedPromise_reject === undefined) {
		            return;
		        }
		        setPromiseIsHandledToTrue(reader._closedPromise);
		        reader._closedPromise_reject(reason);
		        reader._closedPromise_resolve = undefined;
		        reader._closedPromise_reject = undefined;
		    }
		    function defaultReaderClosedPromiseResetToRejected(reader, reason) {
		        defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
		    }
		    function defaultReaderClosedPromiseResolve(reader) {
		        if (reader._closedPromise_resolve === undefined) {
		            return;
		        }
		        reader._closedPromise_resolve(undefined);
		        reader._closedPromise_resolve = undefined;
		        reader._closedPromise_reject = undefined;
		    }

		    const AbortSteps = SymbolPolyfill('[[AbortSteps]]');
		    const ErrorSteps = SymbolPolyfill('[[ErrorSteps]]');
		    const CancelSteps = SymbolPolyfill('[[CancelSteps]]');
		    const PullSteps = SymbolPolyfill('[[PullSteps]]');

		    /// <reference lib="es2015.core" />
		    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite#Polyfill
		    const NumberIsFinite = Number.isFinite || function (x) {
		        return typeof x === 'number' && isFinite(x);
		    };

		    /// <reference lib="es2015.core" />
		    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc#Polyfill
		    const MathTrunc = Math.trunc || function (v) {
		        return v < 0 ? Math.ceil(v) : Math.floor(v);
		    };

		    // https://heycam.github.io/webidl/#idl-dictionaries
		    function isDictionary(x) {
		        return typeof x === 'object' || typeof x === 'function';
		    }
		    function assertDictionary(obj, context) {
		        if (obj !== undefined && !isDictionary(obj)) {
		            throw new TypeError(`${context} is not an object.`);
		        }
		    }
		    // https://heycam.github.io/webidl/#idl-callback-functions
		    function assertFunction(x, context) {
		        if (typeof x !== 'function') {
		            throw new TypeError(`${context} is not a function.`);
		        }
		    }
		    // https://heycam.github.io/webidl/#idl-object
		    function isObject(x) {
		        return (typeof x === 'object' && x !== null) || typeof x === 'function';
		    }
		    function assertObject(x, context) {
		        if (!isObject(x)) {
		            throw new TypeError(`${context} is not an object.`);
		        }
		    }
		    function assertRequiredArgument(x, position, context) {
		        if (x === undefined) {
		            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
		        }
		    }
		    function assertRequiredField(x, field, context) {
		        if (x === undefined) {
		            throw new TypeError(`${field} is required in '${context}'.`);
		        }
		    }
		    // https://heycam.github.io/webidl/#idl-unrestricted-double
		    function convertUnrestrictedDouble(value) {
		        return Number(value);
		    }
		    function censorNegativeZero(x) {
		        return x === 0 ? 0 : x;
		    }
		    function integerPart(x) {
		        return censorNegativeZero(MathTrunc(x));
		    }
		    // https://heycam.github.io/webidl/#idl-unsigned-long-long
		    function convertUnsignedLongLongWithEnforceRange(value, context) {
		        const lowerBound = 0;
		        const upperBound = Number.MAX_SAFE_INTEGER;
		        let x = Number(value);
		        x = censorNegativeZero(x);
		        if (!NumberIsFinite(x)) {
		            throw new TypeError(`${context} is not a finite number`);
		        }
		        x = integerPart(x);
		        if (x < lowerBound || x > upperBound) {
		            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
		        }
		        if (!NumberIsFinite(x) || x === 0) {
		            return 0;
		        }
		        // TODO Use BigInt if supported?
		        // let xBigInt = BigInt(integerPart(x));
		        // xBigInt = BigInt.asUintN(64, xBigInt);
		        // return Number(xBigInt);
		        return x;
		    }

		    function assertReadableStream(x, context) {
		        if (!IsReadableStream(x)) {
		            throw new TypeError(`${context} is not a ReadableStream.`);
		        }
		    }

		    // Abstract operations for the ReadableStream.
		    function AcquireReadableStreamDefaultReader(stream) {
		        return new ReadableStreamDefaultReader(stream);
		    }
		    // ReadableStream API exposed for controllers.
		    function ReadableStreamAddReadRequest(stream, readRequest) {
		        stream._reader._readRequests.push(readRequest);
		    }
		    function ReadableStreamFulfillReadRequest(stream, chunk, done) {
		        const reader = stream._reader;
		        const readRequest = reader._readRequests.shift();
		        if (done) {
		            readRequest._closeSteps();
		        }
		        else {
		            readRequest._chunkSteps(chunk);
		        }
		    }
		    function ReadableStreamGetNumReadRequests(stream) {
		        return stream._reader._readRequests.length;
		    }
		    function ReadableStreamHasDefaultReader(stream) {
		        const reader = stream._reader;
		        if (reader === undefined) {
		            return false;
		        }
		        if (!IsReadableStreamDefaultReader(reader)) {
		            return false;
		        }
		        return true;
		    }
		    /**
		     * A default reader vended by a {@link ReadableStream}.
		     *
		     * @public
		     */
		    class ReadableStreamDefaultReader {
		        constructor(stream) {
		            assertRequiredArgument(stream, 1, 'ReadableStreamDefaultReader');
		            assertReadableStream(stream, 'First parameter');
		            if (IsReadableStreamLocked(stream)) {
		                throw new TypeError('This stream has already been locked for exclusive reading by another reader');
		            }
		            ReadableStreamReaderGenericInitialize(this, stream);
		            this._readRequests = new SimpleQueue();
		        }
		        /**
		         * Returns a promise that will be fulfilled when the stream becomes closed,
		         * or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
		         */
		        get closed() {
		            if (!IsReadableStreamDefaultReader(this)) {
		                return promiseRejectedWith(defaultReaderBrandCheckException('closed'));
		            }
		            return this._closedPromise;
		        }
		        /**
		         * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
		         */
		        cancel(reason = undefined) {
		            if (!IsReadableStreamDefaultReader(this)) {
		                return promiseRejectedWith(defaultReaderBrandCheckException('cancel'));
		            }
		            if (this._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('cancel'));
		            }
		            return ReadableStreamReaderGenericCancel(this, reason);
		        }
		        /**
		         * Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
		         *
		         * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
		         */
		        read() {
		            if (!IsReadableStreamDefaultReader(this)) {
		                return promiseRejectedWith(defaultReaderBrandCheckException('read'));
		            }
		            if (this._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('read from'));
		            }
		            let resolvePromise;
		            let rejectPromise;
		            const promise = newPromise((resolve, reject) => {
		                resolvePromise = resolve;
		                rejectPromise = reject;
		            });
		            const readRequest = {
		                _chunkSteps: chunk => resolvePromise({ value: chunk, done: false }),
		                _closeSteps: () => resolvePromise({ value: undefined, done: true }),
		                _errorSteps: e => rejectPromise(e)
		            };
		            ReadableStreamDefaultReaderRead(this, readRequest);
		            return promise;
		        }
		        /**
		         * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
		         * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
		         * from now on; otherwise, the reader will appear closed.
		         *
		         * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
		         * the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
		         * do so will throw a `TypeError` and leave the reader locked to the stream.
		         */
		        releaseLock() {
		            if (!IsReadableStreamDefaultReader(this)) {
		                throw defaultReaderBrandCheckException('releaseLock');
		            }
		            if (this._ownerReadableStream === undefined) {
		                return;
		            }
		            if (this._readRequests.length > 0) {
		                throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
		            }
		            ReadableStreamReaderGenericRelease(this);
		        }
		    }
		    Object.defineProperties(ReadableStreamDefaultReader.prototype, {
		        cancel: { enumerable: true },
		        read: { enumerable: true },
		        releaseLock: { enumerable: true },
		        closed: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableStreamDefaultReader',
		            configurable: true
		        });
		    }
		    // Abstract operations for the readers.
		    function IsReadableStreamDefaultReader(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_readRequests')) {
		            return false;
		        }
		        return x instanceof ReadableStreamDefaultReader;
		    }
		    function ReadableStreamDefaultReaderRead(reader, readRequest) {
		        const stream = reader._ownerReadableStream;
		        stream._disturbed = true;
		        if (stream._state === 'closed') {
		            readRequest._closeSteps();
		        }
		        else if (stream._state === 'errored') {
		            readRequest._errorSteps(stream._storedError);
		        }
		        else {
		            stream._readableStreamController[PullSteps](readRequest);
		        }
		    }
		    // Helper functions for the ReadableStreamDefaultReader.
		    function defaultReaderBrandCheckException(name) {
		        return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
		    }

		    /// <reference lib="es2018.asynciterable" />
		    /* eslint-disable @typescript-eslint/no-empty-function */
		    const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () { }).prototype);

		    /// <reference lib="es2018.asynciterable" />
		    class ReadableStreamAsyncIteratorImpl {
		        constructor(reader, preventCancel) {
		            this._ongoingPromise = undefined;
		            this._isFinished = false;
		            this._reader = reader;
		            this._preventCancel = preventCancel;
		        }
		        next() {
		            const nextSteps = () => this._nextSteps();
		            this._ongoingPromise = this._ongoingPromise ?
		                transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) :
		                nextSteps();
		            return this._ongoingPromise;
		        }
		        return(value) {
		            const returnSteps = () => this._returnSteps(value);
		            return this._ongoingPromise ?
		                transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) :
		                returnSteps();
		        }
		        _nextSteps() {
		            if (this._isFinished) {
		                return Promise.resolve({ value: undefined, done: true });
		            }
		            const reader = this._reader;
		            if (reader._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('iterate'));
		            }
		            let resolvePromise;
		            let rejectPromise;
		            const promise = newPromise((resolve, reject) => {
		                resolvePromise = resolve;
		                rejectPromise = reject;
		            });
		            const readRequest = {
		                _chunkSteps: chunk => {
		                    this._ongoingPromise = undefined;
		                    // This needs to be delayed by one microtask, otherwise we stop pulling too early which breaks a test.
		                    // FIXME Is this a bug in the specification, or in the test?
		                    queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
		                },
		                _closeSteps: () => {
		                    this._ongoingPromise = undefined;
		                    this._isFinished = true;
		                    ReadableStreamReaderGenericRelease(reader);
		                    resolvePromise({ value: undefined, done: true });
		                },
		                _errorSteps: reason => {
		                    this._ongoingPromise = undefined;
		                    this._isFinished = true;
		                    ReadableStreamReaderGenericRelease(reader);
		                    rejectPromise(reason);
		                }
		            };
		            ReadableStreamDefaultReaderRead(reader, readRequest);
		            return promise;
		        }
		        _returnSteps(value) {
		            if (this._isFinished) {
		                return Promise.resolve({ value, done: true });
		            }
		            this._isFinished = true;
		            const reader = this._reader;
		            if (reader._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('finish iterating'));
		            }
		            if (!this._preventCancel) {
		                const result = ReadableStreamReaderGenericCancel(reader, value);
		                ReadableStreamReaderGenericRelease(reader);
		                return transformPromiseWith(result, () => ({ value, done: true }));
		            }
		            ReadableStreamReaderGenericRelease(reader);
		            return promiseResolvedWith({ value, done: true });
		        }
		    }
		    const ReadableStreamAsyncIteratorPrototype = {
		        next() {
		            if (!IsReadableStreamAsyncIterator(this)) {
		                return promiseRejectedWith(streamAsyncIteratorBrandCheckException('next'));
		            }
		            return this._asyncIteratorImpl.next();
		        },
		        return(value) {
		            if (!IsReadableStreamAsyncIterator(this)) {
		                return promiseRejectedWith(streamAsyncIteratorBrandCheckException('return'));
		            }
		            return this._asyncIteratorImpl.return(value);
		        }
		    };
		    if (AsyncIteratorPrototype !== undefined) {
		        Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
		    }
		    // Abstract operations for the ReadableStream.
		    function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
		        const reader = AcquireReadableStreamDefaultReader(stream);
		        const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
		        const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
		        iterator._asyncIteratorImpl = impl;
		        return iterator;
		    }
		    function IsReadableStreamAsyncIterator(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_asyncIteratorImpl')) {
		            return false;
		        }
		        try {
		            // noinspection SuspiciousTypeOfGuard
		            return x._asyncIteratorImpl instanceof
		                ReadableStreamAsyncIteratorImpl;
		        }
		        catch (_a) {
		            return false;
		        }
		    }
		    // Helper functions for the ReadableStream.
		    function streamAsyncIteratorBrandCheckException(name) {
		        return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
		    }

		    /// <reference lib="es2015.core" />
		    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN#Polyfill
		    const NumberIsNaN = Number.isNaN || function (x) {
		        // eslint-disable-next-line no-self-compare
		        return x !== x;
		    };

		    function CreateArrayFromList(elements) {
		        // We use arrays to represent lists, so this is basically a no-op.
		        // Do a slice though just in case we happen to depend on the unique-ness.
		        return elements.slice();
		    }
		    function CopyDataBlockBytes(dest, destOffset, src, srcOffset, n) {
		        new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
		    }
		    // Not implemented correctly
		    function TransferArrayBuffer(O) {
		        return O;
		    }
		    // Not implemented correctly
		    // eslint-disable-next-line @typescript-eslint/no-unused-vars
		    function IsDetachedBuffer(O) {
		        return false;
		    }
		    function ArrayBufferSlice(buffer, begin, end) {
		        // ArrayBuffer.prototype.slice is not available on IE10
		        // https://www.caniuse.com/mdn-javascript_builtins_arraybuffer_slice
		        if (buffer.slice) {
		            return buffer.slice(begin, end);
		        }
		        const length = end - begin;
		        const slice = new ArrayBuffer(length);
		        CopyDataBlockBytes(slice, 0, buffer, begin, length);
		        return slice;
		    }

		    function IsNonNegativeNumber(v) {
		        if (typeof v !== 'number') {
		            return false;
		        }
		        if (NumberIsNaN(v)) {
		            return false;
		        }
		        if (v < 0) {
		            return false;
		        }
		        return true;
		    }
		    function CloneAsUint8Array(O) {
		        const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
		        return new Uint8Array(buffer);
		    }

		    function DequeueValue(container) {
		        const pair = container._queue.shift();
		        container._queueTotalSize -= pair.size;
		        if (container._queueTotalSize < 0) {
		            container._queueTotalSize = 0;
		        }
		        return pair.value;
		    }
		    function EnqueueValueWithSize(container, value, size) {
		        if (!IsNonNegativeNumber(size) || size === Infinity) {
		            throw new RangeError('Size must be a finite, non-NaN, non-negative number.');
		        }
		        container._queue.push({ value, size });
		        container._queueTotalSize += size;
		    }
		    function PeekQueueValue(container) {
		        const pair = container._queue.peek();
		        return pair.value;
		    }
		    function ResetQueue(container) {
		        container._queue = new SimpleQueue();
		        container._queueTotalSize = 0;
		    }

		    /**
		     * A pull-into request in a {@link ReadableByteStreamController}.
		     *
		     * @public
		     */
		    class ReadableStreamBYOBRequest {
		        constructor() {
		            throw new TypeError('Illegal constructor');
		        }
		        /**
		         * Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
		         */
		        get view() {
		            if (!IsReadableStreamBYOBRequest(this)) {
		                throw byobRequestBrandCheckException('view');
		            }
		            return this._view;
		        }
		        respond(bytesWritten) {
		            if (!IsReadableStreamBYOBRequest(this)) {
		                throw byobRequestBrandCheckException('respond');
		            }
		            assertRequiredArgument(bytesWritten, 1, 'respond');
		            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, 'First parameter');
		            if (this._associatedReadableByteStreamController === undefined) {
		                throw new TypeError('This BYOB request has been invalidated');
		            }
		            if (IsDetachedBuffer(this._view.buffer)) ;
		            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
		        }
		        respondWithNewView(view) {
		            if (!IsReadableStreamBYOBRequest(this)) {
		                throw byobRequestBrandCheckException('respondWithNewView');
		            }
		            assertRequiredArgument(view, 1, 'respondWithNewView');
		            if (!ArrayBuffer.isView(view)) {
		                throw new TypeError('You can only respond with array buffer views');
		            }
		            if (this._associatedReadableByteStreamController === undefined) {
		                throw new TypeError('This BYOB request has been invalidated');
		            }
		            if (IsDetachedBuffer(view.buffer)) ;
		            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
		        }
		    }
		    Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
		        respond: { enumerable: true },
		        respondWithNewView: { enumerable: true },
		        view: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableStreamBYOBRequest',
		            configurable: true
		        });
		    }
		    /**
		     * Allows control of a {@link ReadableStream | readable byte stream}'s state and internal queue.
		     *
		     * @public
		     */
		    class ReadableByteStreamController {
		        constructor() {
		            throw new TypeError('Illegal constructor');
		        }
		        /**
		         * Returns the current BYOB pull request, or `null` if there isn't one.
		         */
		        get byobRequest() {
		            if (!IsReadableByteStreamController(this)) {
		                throw byteStreamControllerBrandCheckException('byobRequest');
		            }
		            return ReadableByteStreamControllerGetBYOBRequest(this);
		        }
		        /**
		         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
		         * over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
		         */
		        get desiredSize() {
		            if (!IsReadableByteStreamController(this)) {
		                throw byteStreamControllerBrandCheckException('desiredSize');
		            }
		            return ReadableByteStreamControllerGetDesiredSize(this);
		        }
		        /**
		         * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
		         * the stream, but once those are read, the stream will become closed.
		         */
		        close() {
		            if (!IsReadableByteStreamController(this)) {
		                throw byteStreamControllerBrandCheckException('close');
		            }
		            if (this._closeRequested) {
		                throw new TypeError('The stream has already been closed; do not close it again!');
		            }
		            const state = this._controlledReadableByteStream._state;
		            if (state !== 'readable') {
		                throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
		            }
		            ReadableByteStreamControllerClose(this);
		        }
		        enqueue(chunk) {
		            if (!IsReadableByteStreamController(this)) {
		                throw byteStreamControllerBrandCheckException('enqueue');
		            }
		            assertRequiredArgument(chunk, 1, 'enqueue');
		            if (!ArrayBuffer.isView(chunk)) {
		                throw new TypeError('chunk must be an array buffer view');
		            }
		            if (chunk.byteLength === 0) {
		                throw new TypeError('chunk must have non-zero byteLength');
		            }
		            if (chunk.buffer.byteLength === 0) {
		                throw new TypeError(`chunk's buffer must have non-zero byteLength`);
		            }
		            if (this._closeRequested) {
		                throw new TypeError('stream is closed or draining');
		            }
		            const state = this._controlledReadableByteStream._state;
		            if (state !== 'readable') {
		                throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
		            }
		            ReadableByteStreamControllerEnqueue(this, chunk);
		        }
		        /**
		         * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
		         */
		        error(e = undefined) {
		            if (!IsReadableByteStreamController(this)) {
		                throw byteStreamControllerBrandCheckException('error');
		            }
		            ReadableByteStreamControllerError(this, e);
		        }
		        /** @internal */
		        [CancelSteps](reason) {
		            ReadableByteStreamControllerClearPendingPullIntos(this);
		            ResetQueue(this);
		            const result = this._cancelAlgorithm(reason);
		            ReadableByteStreamControllerClearAlgorithms(this);
		            return result;
		        }
		        /** @internal */
		        [PullSteps](readRequest) {
		            const stream = this._controlledReadableByteStream;
		            if (this._queueTotalSize > 0) {
		                const entry = this._queue.shift();
		                this._queueTotalSize -= entry.byteLength;
		                ReadableByteStreamControllerHandleQueueDrain(this);
		                const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
		                readRequest._chunkSteps(view);
		                return;
		            }
		            const autoAllocateChunkSize = this._autoAllocateChunkSize;
		            if (autoAllocateChunkSize !== undefined) {
		                let buffer;
		                try {
		                    buffer = new ArrayBuffer(autoAllocateChunkSize);
		                }
		                catch (bufferE) {
		                    readRequest._errorSteps(bufferE);
		                    return;
		                }
		                const pullIntoDescriptor = {
		                    buffer,
		                    bufferByteLength: autoAllocateChunkSize,
		                    byteOffset: 0,
		                    byteLength: autoAllocateChunkSize,
		                    bytesFilled: 0,
		                    elementSize: 1,
		                    viewConstructor: Uint8Array,
		                    readerType: 'default'
		                };
		                this._pendingPullIntos.push(pullIntoDescriptor);
		            }
		            ReadableStreamAddReadRequest(stream, readRequest);
		            ReadableByteStreamControllerCallPullIfNeeded(this);
		        }
		    }
		    Object.defineProperties(ReadableByteStreamController.prototype, {
		        close: { enumerable: true },
		        enqueue: { enumerable: true },
		        error: { enumerable: true },
		        byobRequest: { enumerable: true },
		        desiredSize: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableByteStreamController',
		            configurable: true
		        });
		    }
		    // Abstract operations for the ReadableByteStreamController.
		    function IsReadableByteStreamController(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_controlledReadableByteStream')) {
		            return false;
		        }
		        return x instanceof ReadableByteStreamController;
		    }
		    function IsReadableStreamBYOBRequest(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_associatedReadableByteStreamController')) {
		            return false;
		        }
		        return x instanceof ReadableStreamBYOBRequest;
		    }
		    function ReadableByteStreamControllerCallPullIfNeeded(controller) {
		        const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
		        if (!shouldPull) {
		            return;
		        }
		        if (controller._pulling) {
		            controller._pullAgain = true;
		            return;
		        }
		        controller._pulling = true;
		        // TODO: Test controller argument
		        const pullPromise = controller._pullAlgorithm();
		        uponPromise(pullPromise, () => {
		            controller._pulling = false;
		            if (controller._pullAgain) {
		                controller._pullAgain = false;
		                ReadableByteStreamControllerCallPullIfNeeded(controller);
		            }
		        }, e => {
		            ReadableByteStreamControllerError(controller, e);
		        });
		    }
		    function ReadableByteStreamControllerClearPendingPullIntos(controller) {
		        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
		        controller._pendingPullIntos = new SimpleQueue();
		    }
		    function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
		        let done = false;
		        if (stream._state === 'closed') {
		            done = true;
		        }
		        const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
		        if (pullIntoDescriptor.readerType === 'default') {
		            ReadableStreamFulfillReadRequest(stream, filledView, done);
		        }
		        else {
		            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
		        }
		    }
		    function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
		        const bytesFilled = pullIntoDescriptor.bytesFilled;
		        const elementSize = pullIntoDescriptor.elementSize;
		        return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
		    }
		    function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
		        controller._queue.push({ buffer, byteOffset, byteLength });
		        controller._queueTotalSize += byteLength;
		    }
		    function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
		        const elementSize = pullIntoDescriptor.elementSize;
		        const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
		        const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
		        const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
		        const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
		        let totalBytesToCopyRemaining = maxBytesToCopy;
		        let ready = false;
		        if (maxAlignedBytes > currentAlignedBytes) {
		            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
		            ready = true;
		        }
		        const queue = controller._queue;
		        while (totalBytesToCopyRemaining > 0) {
		            const headOfQueue = queue.peek();
		            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
		            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
		            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
		            if (headOfQueue.byteLength === bytesToCopy) {
		                queue.shift();
		            }
		            else {
		                headOfQueue.byteOffset += bytesToCopy;
		                headOfQueue.byteLength -= bytesToCopy;
		            }
		            controller._queueTotalSize -= bytesToCopy;
		            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
		            totalBytesToCopyRemaining -= bytesToCopy;
		        }
		        return ready;
		    }
		    function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
		        pullIntoDescriptor.bytesFilled += size;
		    }
		    function ReadableByteStreamControllerHandleQueueDrain(controller) {
		        if (controller._queueTotalSize === 0 && controller._closeRequested) {
		            ReadableByteStreamControllerClearAlgorithms(controller);
		            ReadableStreamClose(controller._controlledReadableByteStream);
		        }
		        else {
		            ReadableByteStreamControllerCallPullIfNeeded(controller);
		        }
		    }
		    function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
		        if (controller._byobRequest === null) {
		            return;
		        }
		        controller._byobRequest._associatedReadableByteStreamController = undefined;
		        controller._byobRequest._view = null;
		        controller._byobRequest = null;
		    }
		    function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
		        while (controller._pendingPullIntos.length > 0) {
		            if (controller._queueTotalSize === 0) {
		                return;
		            }
		            const pullIntoDescriptor = controller._pendingPullIntos.peek();
		            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
		                ReadableByteStreamControllerShiftPendingPullInto(controller);
		                ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
		            }
		        }
		    }
		    function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
		        const stream = controller._controlledReadableByteStream;
		        let elementSize = 1;
		        if (view.constructor !== DataView) {
		            elementSize = view.constructor.BYTES_PER_ELEMENT;
		        }
		        const ctor = view.constructor;
		        // try {
		        const buffer = TransferArrayBuffer(view.buffer);
		        // } catch (e) {
		        //   readIntoRequest._errorSteps(e);
		        //   return;
		        // }
		        const pullIntoDescriptor = {
		            buffer,
		            bufferByteLength: buffer.byteLength,
		            byteOffset: view.byteOffset,
		            byteLength: view.byteLength,
		            bytesFilled: 0,
		            elementSize,
		            viewConstructor: ctor,
		            readerType: 'byob'
		        };
		        if (controller._pendingPullIntos.length > 0) {
		            controller._pendingPullIntos.push(pullIntoDescriptor);
		            // No ReadableByteStreamControllerCallPullIfNeeded() call since:
		            // - No change happens on desiredSize
		            // - The source has already been notified of that there's at least 1 pending read(view)
		            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
		            return;
		        }
		        if (stream._state === 'closed') {
		            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
		            readIntoRequest._closeSteps(emptyView);
		            return;
		        }
		        if (controller._queueTotalSize > 0) {
		            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
		                const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
		                ReadableByteStreamControllerHandleQueueDrain(controller);
		                readIntoRequest._chunkSteps(filledView);
		                return;
		            }
		            if (controller._closeRequested) {
		                const e = new TypeError('Insufficient bytes to fill elements in the given buffer');
		                ReadableByteStreamControllerError(controller, e);
		                readIntoRequest._errorSteps(e);
		                return;
		            }
		        }
		        controller._pendingPullIntos.push(pullIntoDescriptor);
		        ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
		        ReadableByteStreamControllerCallPullIfNeeded(controller);
		    }
		    function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
		        const stream = controller._controlledReadableByteStream;
		        if (ReadableStreamHasBYOBReader(stream)) {
		            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
		                const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
		                ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
		            }
		        }
		    }
		    function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
		        ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
		        if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
		            return;
		        }
		        ReadableByteStreamControllerShiftPendingPullInto(controller);
		        const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
		        if (remainderSize > 0) {
		            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
		            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
		            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
		        }
		        pullIntoDescriptor.bytesFilled -= remainderSize;
		        ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
		        ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
		    }
		    function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
		        const firstDescriptor = controller._pendingPullIntos.peek();
		        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
		        const state = controller._controlledReadableByteStream._state;
		        if (state === 'closed') {
		            ReadableByteStreamControllerRespondInClosedState(controller);
		        }
		        else {
		            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
		        }
		        ReadableByteStreamControllerCallPullIfNeeded(controller);
		    }
		    function ReadableByteStreamControllerShiftPendingPullInto(controller) {
		        const descriptor = controller._pendingPullIntos.shift();
		        return descriptor;
		    }
		    function ReadableByteStreamControllerShouldCallPull(controller) {
		        const stream = controller._controlledReadableByteStream;
		        if (stream._state !== 'readable') {
		            return false;
		        }
		        if (controller._closeRequested) {
		            return false;
		        }
		        if (!controller._started) {
		            return false;
		        }
		        if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
		            return true;
		        }
		        if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
		            return true;
		        }
		        const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
		        if (desiredSize > 0) {
		            return true;
		        }
		        return false;
		    }
		    function ReadableByteStreamControllerClearAlgorithms(controller) {
		        controller._pullAlgorithm = undefined;
		        controller._cancelAlgorithm = undefined;
		    }
		    // A client of ReadableByteStreamController may use these functions directly to bypass state check.
		    function ReadableByteStreamControllerClose(controller) {
		        const stream = controller._controlledReadableByteStream;
		        if (controller._closeRequested || stream._state !== 'readable') {
		            return;
		        }
		        if (controller._queueTotalSize > 0) {
		            controller._closeRequested = true;
		            return;
		        }
		        if (controller._pendingPullIntos.length > 0) {
		            const firstPendingPullInto = controller._pendingPullIntos.peek();
		            if (firstPendingPullInto.bytesFilled > 0) {
		                const e = new TypeError('Insufficient bytes to fill elements in the given buffer');
		                ReadableByteStreamControllerError(controller, e);
		                throw e;
		            }
		        }
		        ReadableByteStreamControllerClearAlgorithms(controller);
		        ReadableStreamClose(stream);
		    }
		    function ReadableByteStreamControllerEnqueue(controller, chunk) {
		        const stream = controller._controlledReadableByteStream;
		        if (controller._closeRequested || stream._state !== 'readable') {
		            return;
		        }
		        const buffer = chunk.buffer;
		        const byteOffset = chunk.byteOffset;
		        const byteLength = chunk.byteLength;
		        const transferredBuffer = TransferArrayBuffer(buffer);
		        if (controller._pendingPullIntos.length > 0) {
		            const firstPendingPullInto = controller._pendingPullIntos.peek();
		            if (IsDetachedBuffer(firstPendingPullInto.buffer)) ;
		            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
		        }
		        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
		        if (ReadableStreamHasDefaultReader(stream)) {
		            if (ReadableStreamGetNumReadRequests(stream) === 0) {
		                ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
		            }
		            else {
		                if (controller._pendingPullIntos.length > 0) {
		                    ReadableByteStreamControllerShiftPendingPullInto(controller);
		                }
		                const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
		                ReadableStreamFulfillReadRequest(stream, transferredView, false);
		            }
		        }
		        else if (ReadableStreamHasBYOBReader(stream)) {
		            // TODO: Ideally in this branch detaching should happen only if the buffer is not consumed fully.
		            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
		            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
		        }
		        else {
		            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
		        }
		        ReadableByteStreamControllerCallPullIfNeeded(controller);
		    }
		    function ReadableByteStreamControllerError(controller, e) {
		        const stream = controller._controlledReadableByteStream;
		        if (stream._state !== 'readable') {
		            return;
		        }
		        ReadableByteStreamControllerClearPendingPullIntos(controller);
		        ResetQueue(controller);
		        ReadableByteStreamControllerClearAlgorithms(controller);
		        ReadableStreamError(stream, e);
		    }
		    function ReadableByteStreamControllerGetBYOBRequest(controller) {
		        if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
		            const firstDescriptor = controller._pendingPullIntos.peek();
		            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
		            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
		            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
		            controller._byobRequest = byobRequest;
		        }
		        return controller._byobRequest;
		    }
		    function ReadableByteStreamControllerGetDesiredSize(controller) {
		        const state = controller._controlledReadableByteStream._state;
		        if (state === 'errored') {
		            return null;
		        }
		        if (state === 'closed') {
		            return 0;
		        }
		        return controller._strategyHWM - controller._queueTotalSize;
		    }
		    function ReadableByteStreamControllerRespond(controller, bytesWritten) {
		        const firstDescriptor = controller._pendingPullIntos.peek();
		        const state = controller._controlledReadableByteStream._state;
		        if (state === 'closed') {
		            if (bytesWritten !== 0) {
		                throw new TypeError('bytesWritten must be 0 when calling respond() on a closed stream');
		            }
		        }
		        else {
		            if (bytesWritten === 0) {
		                throw new TypeError('bytesWritten must be greater than 0 when calling respond() on a readable stream');
		            }
		            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
		                throw new RangeError('bytesWritten out of range');
		            }
		        }
		        firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
		        ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
		    }
		    function ReadableByteStreamControllerRespondWithNewView(controller, view) {
		        const firstDescriptor = controller._pendingPullIntos.peek();
		        const state = controller._controlledReadableByteStream._state;
		        if (state === 'closed') {
		            if (view.byteLength !== 0) {
		                throw new TypeError('The view\'s length must be 0 when calling respondWithNewView() on a closed stream');
		            }
		        }
		        else {
		            if (view.byteLength === 0) {
		                throw new TypeError('The view\'s length must be greater than 0 when calling respondWithNewView() on a readable stream');
		            }
		        }
		        if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
		            throw new RangeError('The region specified by view does not match byobRequest');
		        }
		        if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
		            throw new RangeError('The buffer of view has different capacity than byobRequest');
		        }
		        if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
		            throw new RangeError('The region specified by view is larger than byobRequest');
		        }
		        const viewByteLength = view.byteLength;
		        firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
		        ReadableByteStreamControllerRespondInternal(controller, viewByteLength);
		    }
		    function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
		        controller._controlledReadableByteStream = stream;
		        controller._pullAgain = false;
		        controller._pulling = false;
		        controller._byobRequest = null;
		        // Need to set the slots so that the assert doesn't fire. In the spec the slots already exist implicitly.
		        controller._queue = controller._queueTotalSize = undefined;
		        ResetQueue(controller);
		        controller._closeRequested = false;
		        controller._started = false;
		        controller._strategyHWM = highWaterMark;
		        controller._pullAlgorithm = pullAlgorithm;
		        controller._cancelAlgorithm = cancelAlgorithm;
		        controller._autoAllocateChunkSize = autoAllocateChunkSize;
		        controller._pendingPullIntos = new SimpleQueue();
		        stream._readableStreamController = controller;
		        const startResult = startAlgorithm();
		        uponPromise(promiseResolvedWith(startResult), () => {
		            controller._started = true;
		            ReadableByteStreamControllerCallPullIfNeeded(controller);
		        }, r => {
		            ReadableByteStreamControllerError(controller, r);
		        });
		    }
		    function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
		        const controller = Object.create(ReadableByteStreamController.prototype);
		        let startAlgorithm = () => undefined;
		        let pullAlgorithm = () => promiseResolvedWith(undefined);
		        let cancelAlgorithm = () => promiseResolvedWith(undefined);
		        if (underlyingByteSource.start !== undefined) {
		            startAlgorithm = () => underlyingByteSource.start(controller);
		        }
		        if (underlyingByteSource.pull !== undefined) {
		            pullAlgorithm = () => underlyingByteSource.pull(controller);
		        }
		        if (underlyingByteSource.cancel !== undefined) {
		            cancelAlgorithm = reason => underlyingByteSource.cancel(reason);
		        }
		        const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
		        if (autoAllocateChunkSize === 0) {
		            throw new TypeError('autoAllocateChunkSize must be greater than 0');
		        }
		        SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
		    }
		    function SetUpReadableStreamBYOBRequest(request, controller, view) {
		        request._associatedReadableByteStreamController = controller;
		        request._view = view;
		    }
		    // Helper functions for the ReadableStreamBYOBRequest.
		    function byobRequestBrandCheckException(name) {
		        return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
		    }
		    // Helper functions for the ReadableByteStreamController.
		    function byteStreamControllerBrandCheckException(name) {
		        return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
		    }

		    // Abstract operations for the ReadableStream.
		    function AcquireReadableStreamBYOBReader(stream) {
		        return new ReadableStreamBYOBReader(stream);
		    }
		    // ReadableStream API exposed for controllers.
		    function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
		        stream._reader._readIntoRequests.push(readIntoRequest);
		    }
		    function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
		        const reader = stream._reader;
		        const readIntoRequest = reader._readIntoRequests.shift();
		        if (done) {
		            readIntoRequest._closeSteps(chunk);
		        }
		        else {
		            readIntoRequest._chunkSteps(chunk);
		        }
		    }
		    function ReadableStreamGetNumReadIntoRequests(stream) {
		        return stream._reader._readIntoRequests.length;
		    }
		    function ReadableStreamHasBYOBReader(stream) {
		        const reader = stream._reader;
		        if (reader === undefined) {
		            return false;
		        }
		        if (!IsReadableStreamBYOBReader(reader)) {
		            return false;
		        }
		        return true;
		    }
		    /**
		     * A BYOB reader vended by a {@link ReadableStream}.
		     *
		     * @public
		     */
		    class ReadableStreamBYOBReader {
		        constructor(stream) {
		            assertRequiredArgument(stream, 1, 'ReadableStreamBYOBReader');
		            assertReadableStream(stream, 'First parameter');
		            if (IsReadableStreamLocked(stream)) {
		                throw new TypeError('This stream has already been locked for exclusive reading by another reader');
		            }
		            if (!IsReadableByteStreamController(stream._readableStreamController)) {
		                throw new TypeError('Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte ' +
		                    'source');
		            }
		            ReadableStreamReaderGenericInitialize(this, stream);
		            this._readIntoRequests = new SimpleQueue();
		        }
		        /**
		         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
		         * the reader's lock is released before the stream finishes closing.
		         */
		        get closed() {
		            if (!IsReadableStreamBYOBReader(this)) {
		                return promiseRejectedWith(byobReaderBrandCheckException('closed'));
		            }
		            return this._closedPromise;
		        }
		        /**
		         * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
		         */
		        cancel(reason = undefined) {
		            if (!IsReadableStreamBYOBReader(this)) {
		                return promiseRejectedWith(byobReaderBrandCheckException('cancel'));
		            }
		            if (this._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('cancel'));
		            }
		            return ReadableStreamReaderGenericCancel(this, reason);
		        }
		        /**
		         * Attempts to reads bytes into view, and returns a promise resolved with the result.
		         *
		         * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
		         */
		        read(view) {
		            if (!IsReadableStreamBYOBReader(this)) {
		                return promiseRejectedWith(byobReaderBrandCheckException('read'));
		            }
		            if (!ArrayBuffer.isView(view)) {
		                return promiseRejectedWith(new TypeError('view must be an array buffer view'));
		            }
		            if (view.byteLength === 0) {
		                return promiseRejectedWith(new TypeError('view must have non-zero byteLength'));
		            }
		            if (view.buffer.byteLength === 0) {
		                return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
		            }
		            if (IsDetachedBuffer(view.buffer)) ;
		            if (this._ownerReadableStream === undefined) {
		                return promiseRejectedWith(readerLockException('read from'));
		            }
		            let resolvePromise;
		            let rejectPromise;
		            const promise = newPromise((resolve, reject) => {
		                resolvePromise = resolve;
		                rejectPromise = reject;
		            });
		            const readIntoRequest = {
		                _chunkSteps: chunk => resolvePromise({ value: chunk, done: false }),
		                _closeSteps: chunk => resolvePromise({ value: chunk, done: true }),
		                _errorSteps: e => rejectPromise(e)
		            };
		            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
		            return promise;
		        }
		        /**
		         * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
		         * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
		         * from now on; otherwise, the reader will appear closed.
		         *
		         * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
		         * the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
		         * do so will throw a `TypeError` and leave the reader locked to the stream.
		         */
		        releaseLock() {
		            if (!IsReadableStreamBYOBReader(this)) {
		                throw byobReaderBrandCheckException('releaseLock');
		            }
		            if (this._ownerReadableStream === undefined) {
		                return;
		            }
		            if (this._readIntoRequests.length > 0) {
		                throw new TypeError('Tried to release a reader lock when that reader has pending read() calls un-settled');
		            }
		            ReadableStreamReaderGenericRelease(this);
		        }
		    }
		    Object.defineProperties(ReadableStreamBYOBReader.prototype, {
		        cancel: { enumerable: true },
		        read: { enumerable: true },
		        releaseLock: { enumerable: true },
		        closed: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableStreamBYOBReader',
		            configurable: true
		        });
		    }
		    // Abstract operations for the readers.
		    function IsReadableStreamBYOBReader(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_readIntoRequests')) {
		            return false;
		        }
		        return x instanceof ReadableStreamBYOBReader;
		    }
		    function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
		        const stream = reader._ownerReadableStream;
		        stream._disturbed = true;
		        if (stream._state === 'errored') {
		            readIntoRequest._errorSteps(stream._storedError);
		        }
		        else {
		            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
		        }
		    }
		    // Helper functions for the ReadableStreamBYOBReader.
		    function byobReaderBrandCheckException(name) {
		        return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
		    }

		    function ExtractHighWaterMark(strategy, defaultHWM) {
		        const { highWaterMark } = strategy;
		        if (highWaterMark === undefined) {
		            return defaultHWM;
		        }
		        if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
		            throw new RangeError('Invalid highWaterMark');
		        }
		        return highWaterMark;
		    }
		    function ExtractSizeAlgorithm(strategy) {
		        const { size } = strategy;
		        if (!size) {
		            return () => 1;
		        }
		        return size;
		    }

		    function convertQueuingStrategy(init, context) {
		        assertDictionary(init, context);
		        const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
		        const size = init === null || init === void 0 ? void 0 : init.size;
		        return {
		            highWaterMark: highWaterMark === undefined ? undefined : convertUnrestrictedDouble(highWaterMark),
		            size: size === undefined ? undefined : convertQueuingStrategySize(size, `${context} has member 'size' that`)
		        };
		    }
		    function convertQueuingStrategySize(fn, context) {
		        assertFunction(fn, context);
		        return chunk => convertUnrestrictedDouble(fn(chunk));
		    }

		    function convertUnderlyingSink(original, context) {
		        assertDictionary(original, context);
		        const abort = original === null || original === void 0 ? void 0 : original.abort;
		        const close = original === null || original === void 0 ? void 0 : original.close;
		        const start = original === null || original === void 0 ? void 0 : original.start;
		        const type = original === null || original === void 0 ? void 0 : original.type;
		        const write = original === null || original === void 0 ? void 0 : original.write;
		        return {
		            abort: abort === undefined ?
		                undefined :
		                convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
		            close: close === undefined ?
		                undefined :
		                convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
		            start: start === undefined ?
		                undefined :
		                convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
		            write: write === undefined ?
		                undefined :
		                convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
		            type
		        };
		    }
		    function convertUnderlyingSinkAbortCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (reason) => promiseCall(fn, original, [reason]);
		    }
		    function convertUnderlyingSinkCloseCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return () => promiseCall(fn, original, []);
		    }
		    function convertUnderlyingSinkStartCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (controller) => reflectCall(fn, original, [controller]);
		    }
		    function convertUnderlyingSinkWriteCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
		    }

		    function assertWritableStream(x, context) {
		        if (!IsWritableStream(x)) {
		            throw new TypeError(`${context} is not a WritableStream.`);
		        }
		    }

		    function isAbortSignal(value) {
		        if (typeof value !== 'object' || value === null) {
		            return false;
		        }
		        try {
		            return typeof value.aborted === 'boolean';
		        }
		        catch (_a) {
		            // AbortSignal.prototype.aborted throws if its brand check fails
		            return false;
		        }
		    }
		    const supportsAbortController = typeof AbortController === 'function';
		    /**
		     * Construct a new AbortController, if supported by the platform.
		     *
		     * @internal
		     */
		    function createAbortController() {
		        if (supportsAbortController) {
		            return new AbortController();
		        }
		        return undefined;
		    }

		    /**
		     * A writable stream represents a destination for data, into which you can write.
		     *
		     * @public
		     */
		    class WritableStream {
		        constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
		            if (rawUnderlyingSink === undefined) {
		                rawUnderlyingSink = null;
		            }
		            else {
		                assertObject(rawUnderlyingSink, 'First parameter');
		            }
		            const strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
		            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, 'First parameter');
		            InitializeWritableStream(this);
		            const type = underlyingSink.type;
		            if (type !== undefined) {
		                throw new RangeError('Invalid type is specified');
		            }
		            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
		            const highWaterMark = ExtractHighWaterMark(strategy, 1);
		            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
		        }
		        /**
		         * Returns whether or not the writable stream is locked to a writer.
		         */
		        get locked() {
		            if (!IsWritableStream(this)) {
		                throw streamBrandCheckException$2('locked');
		            }
		            return IsWritableStreamLocked(this);
		        }
		        /**
		         * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
		         * immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
		         * mechanism of the underlying sink.
		         *
		         * The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
		         * that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
		         * the stream) if the stream is currently locked.
		         */
		        abort(reason = undefined) {
		            if (!IsWritableStream(this)) {
		                return promiseRejectedWith(streamBrandCheckException$2('abort'));
		            }
		            if (IsWritableStreamLocked(this)) {
		                return promiseRejectedWith(new TypeError('Cannot abort a stream that already has a writer'));
		            }
		            return WritableStreamAbort(this, reason);
		        }
		        /**
		         * Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
		         * close behavior. During this time any further attempts to write will fail (without erroring the stream).
		         *
		         * The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
		         * successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
		         * a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
		         */
		        close() {
		            if (!IsWritableStream(this)) {
		                return promiseRejectedWith(streamBrandCheckException$2('close'));
		            }
		            if (IsWritableStreamLocked(this)) {
		                return promiseRejectedWith(new TypeError('Cannot close a stream that already has a writer'));
		            }
		            if (WritableStreamCloseQueuedOrInFlight(this)) {
		                return promiseRejectedWith(new TypeError('Cannot close an already-closing stream'));
		            }
		            return WritableStreamClose(this);
		        }
		        /**
		         * Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
		         * is locked, no other writer can be acquired until this one is released.
		         *
		         * This functionality is especially useful for creating abstractions that desire the ability to write to a stream
		         * without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
		         * the same time, which would cause the resulting written data to be unpredictable and probably useless.
		         */
		        getWriter() {
		            if (!IsWritableStream(this)) {
		                throw streamBrandCheckException$2('getWriter');
		            }
		            return AcquireWritableStreamDefaultWriter(this);
		        }
		    }
		    Object.defineProperties(WritableStream.prototype, {
		        abort: { enumerable: true },
		        close: { enumerable: true },
		        getWriter: { enumerable: true },
		        locked: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
		            value: 'WritableStream',
		            configurable: true
		        });
		    }
		    // Abstract operations for the WritableStream.
		    function AcquireWritableStreamDefaultWriter(stream) {
		        return new WritableStreamDefaultWriter(stream);
		    }
		    // Throws if and only if startAlgorithm throws.
		    function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
		        const stream = Object.create(WritableStream.prototype);
		        InitializeWritableStream(stream);
		        const controller = Object.create(WritableStreamDefaultController.prototype);
		        SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
		        return stream;
		    }
		    function InitializeWritableStream(stream) {
		        stream._state = 'writable';
		        // The error that will be reported by new method calls once the state becomes errored. Only set when [[state]] is
		        // 'erroring' or 'errored'. May be set to an undefined value.
		        stream._storedError = undefined;
		        stream._writer = undefined;
		        // Initialize to undefined first because the constructor of the controller checks this
		        // variable to validate the caller.
		        stream._writableStreamController = undefined;
		        // This queue is placed here instead of the writer class in order to allow for passing a writer to the next data
		        // producer without waiting for the queued writes to finish.
		        stream._writeRequests = new SimpleQueue();
		        // Write requests are removed from _writeRequests when write() is called on the underlying sink. This prevents
		        // them from being erroneously rejected on error. If a write() call is in-flight, the request is stored here.
		        stream._inFlightWriteRequest = undefined;
		        // The promise that was returned from writer.close(). Stored here because it may be fulfilled after the writer
		        // has been detached.
		        stream._closeRequest = undefined;
		        // Close request is removed from _closeRequest when close() is called on the underlying sink. This prevents it
		        // from being erroneously rejected on error. If a close() call is in-flight, the request is stored here.
		        stream._inFlightCloseRequest = undefined;
		        // The promise that was returned from writer.abort(). This may also be fulfilled after the writer has detached.
		        stream._pendingAbortRequest = undefined;
		        // The backpressure signal set by the controller.
		        stream._backpressure = false;
		    }
		    function IsWritableStream(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_writableStreamController')) {
		            return false;
		        }
		        return x instanceof WritableStream;
		    }
		    function IsWritableStreamLocked(stream) {
		        if (stream._writer === undefined) {
		            return false;
		        }
		        return true;
		    }
		    function WritableStreamAbort(stream, reason) {
		        var _a;
		        if (stream._state === 'closed' || stream._state === 'errored') {
		            return promiseResolvedWith(undefined);
		        }
		        stream._writableStreamController._abortReason = reason;
		        (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
		        // TypeScript narrows the type of `stream._state` down to 'writable' | 'erroring',
		        // but it doesn't know that signaling abort runs author code that might have changed the state.
		        // Widen the type again by casting to WritableStreamState.
		        const state = stream._state;
		        if (state === 'closed' || state === 'errored') {
		            return promiseResolvedWith(undefined);
		        }
		        if (stream._pendingAbortRequest !== undefined) {
		            return stream._pendingAbortRequest._promise;
		        }
		        let wasAlreadyErroring = false;
		        if (state === 'erroring') {
		            wasAlreadyErroring = true;
		            // reason will not be used, so don't keep a reference to it.
		            reason = undefined;
		        }
		        const promise = newPromise((resolve, reject) => {
		            stream._pendingAbortRequest = {
		                _promise: undefined,
		                _resolve: resolve,
		                _reject: reject,
		                _reason: reason,
		                _wasAlreadyErroring: wasAlreadyErroring
		            };
		        });
		        stream._pendingAbortRequest._promise = promise;
		        if (!wasAlreadyErroring) {
		            WritableStreamStartErroring(stream, reason);
		        }
		        return promise;
		    }
		    function WritableStreamClose(stream) {
		        const state = stream._state;
		        if (state === 'closed' || state === 'errored') {
		            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
		        }
		        const promise = newPromise((resolve, reject) => {
		            const closeRequest = {
		                _resolve: resolve,
		                _reject: reject
		            };
		            stream._closeRequest = closeRequest;
		        });
		        const writer = stream._writer;
		        if (writer !== undefined && stream._backpressure && state === 'writable') {
		            defaultWriterReadyPromiseResolve(writer);
		        }
		        WritableStreamDefaultControllerClose(stream._writableStreamController);
		        return promise;
		    }
		    // WritableStream API exposed for controllers.
		    function WritableStreamAddWriteRequest(stream) {
		        const promise = newPromise((resolve, reject) => {
		            const writeRequest = {
		                _resolve: resolve,
		                _reject: reject
		            };
		            stream._writeRequests.push(writeRequest);
		        });
		        return promise;
		    }
		    function WritableStreamDealWithRejection(stream, error) {
		        const state = stream._state;
		        if (state === 'writable') {
		            WritableStreamStartErroring(stream, error);
		            return;
		        }
		        WritableStreamFinishErroring(stream);
		    }
		    function WritableStreamStartErroring(stream, reason) {
		        const controller = stream._writableStreamController;
		        stream._state = 'erroring';
		        stream._storedError = reason;
		        const writer = stream._writer;
		        if (writer !== undefined) {
		            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
		        }
		        if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
		            WritableStreamFinishErroring(stream);
		        }
		    }
		    function WritableStreamFinishErroring(stream) {
		        stream._state = 'errored';
		        stream._writableStreamController[ErrorSteps]();
		        const storedError = stream._storedError;
		        stream._writeRequests.forEach(writeRequest => {
		            writeRequest._reject(storedError);
		        });
		        stream._writeRequests = new SimpleQueue();
		        if (stream._pendingAbortRequest === undefined) {
		            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
		            return;
		        }
		        const abortRequest = stream._pendingAbortRequest;
		        stream._pendingAbortRequest = undefined;
		        if (abortRequest._wasAlreadyErroring) {
		            abortRequest._reject(storedError);
		            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
		            return;
		        }
		        const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
		        uponPromise(promise, () => {
		            abortRequest._resolve();
		            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
		        }, (reason) => {
		            abortRequest._reject(reason);
		            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
		        });
		    }
		    function WritableStreamFinishInFlightWrite(stream) {
		        stream._inFlightWriteRequest._resolve(undefined);
		        stream._inFlightWriteRequest = undefined;
		    }
		    function WritableStreamFinishInFlightWriteWithError(stream, error) {
		        stream._inFlightWriteRequest._reject(error);
		        stream._inFlightWriteRequest = undefined;
		        WritableStreamDealWithRejection(stream, error);
		    }
		    function WritableStreamFinishInFlightClose(stream) {
		        stream._inFlightCloseRequest._resolve(undefined);
		        stream._inFlightCloseRequest = undefined;
		        const state = stream._state;
		        if (state === 'erroring') {
		            // The error was too late to do anything, so it is ignored.
		            stream._storedError = undefined;
		            if (stream._pendingAbortRequest !== undefined) {
		                stream._pendingAbortRequest._resolve();
		                stream._pendingAbortRequest = undefined;
		            }
		        }
		        stream._state = 'closed';
		        const writer = stream._writer;
		        if (writer !== undefined) {
		            defaultWriterClosedPromiseResolve(writer);
		        }
		    }
		    function WritableStreamFinishInFlightCloseWithError(stream, error) {
		        stream._inFlightCloseRequest._reject(error);
		        stream._inFlightCloseRequest = undefined;
		        // Never execute sink abort() after sink close().
		        if (stream._pendingAbortRequest !== undefined) {
		            stream._pendingAbortRequest._reject(error);
		            stream._pendingAbortRequest = undefined;
		        }
		        WritableStreamDealWithRejection(stream, error);
		    }
		    // TODO(ricea): Fix alphabetical order.
		    function WritableStreamCloseQueuedOrInFlight(stream) {
		        if (stream._closeRequest === undefined && stream._inFlightCloseRequest === undefined) {
		            return false;
		        }
		        return true;
		    }
		    function WritableStreamHasOperationMarkedInFlight(stream) {
		        if (stream._inFlightWriteRequest === undefined && stream._inFlightCloseRequest === undefined) {
		            return false;
		        }
		        return true;
		    }
		    function WritableStreamMarkCloseRequestInFlight(stream) {
		        stream._inFlightCloseRequest = stream._closeRequest;
		        stream._closeRequest = undefined;
		    }
		    function WritableStreamMarkFirstWriteRequestInFlight(stream) {
		        stream._inFlightWriteRequest = stream._writeRequests.shift();
		    }
		    function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
		        if (stream._closeRequest !== undefined) {
		            stream._closeRequest._reject(stream._storedError);
		            stream._closeRequest = undefined;
		        }
		        const writer = stream._writer;
		        if (writer !== undefined) {
		            defaultWriterClosedPromiseReject(writer, stream._storedError);
		        }
		    }
		    function WritableStreamUpdateBackpressure(stream, backpressure) {
		        const writer = stream._writer;
		        if (writer !== undefined && backpressure !== stream._backpressure) {
		            if (backpressure) {
		                defaultWriterReadyPromiseReset(writer);
		            }
		            else {
		                defaultWriterReadyPromiseResolve(writer);
		            }
		        }
		        stream._backpressure = backpressure;
		    }
		    /**
		     * A default writer vended by a {@link WritableStream}.
		     *
		     * @public
		     */
		    class WritableStreamDefaultWriter {
		        constructor(stream) {
		            assertRequiredArgument(stream, 1, 'WritableStreamDefaultWriter');
		            assertWritableStream(stream, 'First parameter');
		            if (IsWritableStreamLocked(stream)) {
		                throw new TypeError('This stream has already been locked for exclusive writing by another writer');
		            }
		            this._ownerWritableStream = stream;
		            stream._writer = this;
		            const state = stream._state;
		            if (state === 'writable') {
		                if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
		                    defaultWriterReadyPromiseInitialize(this);
		                }
		                else {
		                    defaultWriterReadyPromiseInitializeAsResolved(this);
		                }
		                defaultWriterClosedPromiseInitialize(this);
		            }
		            else if (state === 'erroring') {
		                defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
		                defaultWriterClosedPromiseInitialize(this);
		            }
		            else if (state === 'closed') {
		                defaultWriterReadyPromiseInitializeAsResolved(this);
		                defaultWriterClosedPromiseInitializeAsResolved(this);
		            }
		            else {
		                const storedError = stream._storedError;
		                defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
		                defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
		            }
		        }
		        /**
		         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
		         * the writer’s lock is released before the stream finishes closing.
		         */
		        get closed() {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                return promiseRejectedWith(defaultWriterBrandCheckException('closed'));
		            }
		            return this._closedPromise;
		        }
		        /**
		         * Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
		         * A producer can use this information to determine the right amount of data to write.
		         *
		         * It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
		         * queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
		         * the writer’s lock is released.
		         */
		        get desiredSize() {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                throw defaultWriterBrandCheckException('desiredSize');
		            }
		            if (this._ownerWritableStream === undefined) {
		                throw defaultWriterLockException('desiredSize');
		            }
		            return WritableStreamDefaultWriterGetDesiredSize(this);
		        }
		        /**
		         * Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
		         * from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
		         * back to zero or below, the getter will return a new promise that stays pending until the next transition.
		         *
		         * If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
		         * rejected.
		         */
		        get ready() {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                return promiseRejectedWith(defaultWriterBrandCheckException('ready'));
		            }
		            return this._readyPromise;
		        }
		        /**
		         * If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
		         */
		        abort(reason = undefined) {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                return promiseRejectedWith(defaultWriterBrandCheckException('abort'));
		            }
		            if (this._ownerWritableStream === undefined) {
		                return promiseRejectedWith(defaultWriterLockException('abort'));
		            }
		            return WritableStreamDefaultWriterAbort(this, reason);
		        }
		        /**
		         * If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
		         */
		        close() {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                return promiseRejectedWith(defaultWriterBrandCheckException('close'));
		            }
		            const stream = this._ownerWritableStream;
		            if (stream === undefined) {
		                return promiseRejectedWith(defaultWriterLockException('close'));
		            }
		            if (WritableStreamCloseQueuedOrInFlight(stream)) {
		                return promiseRejectedWith(new TypeError('Cannot close an already-closing stream'));
		            }
		            return WritableStreamDefaultWriterClose(this);
		        }
		        /**
		         * Releases the writer’s lock on the corresponding stream. After the lock is released, the writer is no longer active.
		         * If the associated stream is errored when the lock is released, the writer will appear errored in the same way from
		         * now on; otherwise, the writer will appear closed.
		         *
		         * Note that the lock can still be released even if some ongoing writes have not yet finished (i.e. even if the
		         * promises returned from previous calls to {@link WritableStreamDefaultWriter.write | write()} have not yet settled).
		         * It’s not necessary to hold the lock on the writer for the duration of the write; the lock instead simply prevents
		         * other producers from writing in an interleaved manner.
		         */
		        releaseLock() {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                throw defaultWriterBrandCheckException('releaseLock');
		            }
		            const stream = this._ownerWritableStream;
		            if (stream === undefined) {
		                return;
		            }
		            WritableStreamDefaultWriterRelease(this);
		        }
		        write(chunk = undefined) {
		            if (!IsWritableStreamDefaultWriter(this)) {
		                return promiseRejectedWith(defaultWriterBrandCheckException('write'));
		            }
		            if (this._ownerWritableStream === undefined) {
		                return promiseRejectedWith(defaultWriterLockException('write to'));
		            }
		            return WritableStreamDefaultWriterWrite(this, chunk);
		        }
		    }
		    Object.defineProperties(WritableStreamDefaultWriter.prototype, {
		        abort: { enumerable: true },
		        close: { enumerable: true },
		        releaseLock: { enumerable: true },
		        write: { enumerable: true },
		        closed: { enumerable: true },
		        desiredSize: { enumerable: true },
		        ready: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
		            value: 'WritableStreamDefaultWriter',
		            configurable: true
		        });
		    }
		    // Abstract operations for the WritableStreamDefaultWriter.
		    function IsWritableStreamDefaultWriter(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_ownerWritableStream')) {
		            return false;
		        }
		        return x instanceof WritableStreamDefaultWriter;
		    }
		    // A client of WritableStreamDefaultWriter may use these functions directly to bypass state check.
		    function WritableStreamDefaultWriterAbort(writer, reason) {
		        const stream = writer._ownerWritableStream;
		        return WritableStreamAbort(stream, reason);
		    }
		    function WritableStreamDefaultWriterClose(writer) {
		        const stream = writer._ownerWritableStream;
		        return WritableStreamClose(stream);
		    }
		    function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
		        const stream = writer._ownerWritableStream;
		        const state = stream._state;
		        if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {
		            return promiseResolvedWith(undefined);
		        }
		        if (state === 'errored') {
		            return promiseRejectedWith(stream._storedError);
		        }
		        return WritableStreamDefaultWriterClose(writer);
		    }
		    function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error) {
		        if (writer._closedPromiseState === 'pending') {
		            defaultWriterClosedPromiseReject(writer, error);
		        }
		        else {
		            defaultWriterClosedPromiseResetToRejected(writer, error);
		        }
		    }
		    function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error) {
		        if (writer._readyPromiseState === 'pending') {
		            defaultWriterReadyPromiseReject(writer, error);
		        }
		        else {
		            defaultWriterReadyPromiseResetToRejected(writer, error);
		        }
		    }
		    function WritableStreamDefaultWriterGetDesiredSize(writer) {
		        const stream = writer._ownerWritableStream;
		        const state = stream._state;
		        if (state === 'errored' || state === 'erroring') {
		            return null;
		        }
		        if (state === 'closed') {
		            return 0;
		        }
		        return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
		    }
		    function WritableStreamDefaultWriterRelease(writer) {
		        const stream = writer._ownerWritableStream;
		        const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
		        WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
		        // The state transitions to "errored" before the sink abort() method runs, but the writer.closed promise is not
		        // rejected until afterwards. This means that simply testing state will not work.
		        WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
		        stream._writer = undefined;
		        writer._ownerWritableStream = undefined;
		    }
		    function WritableStreamDefaultWriterWrite(writer, chunk) {
		        const stream = writer._ownerWritableStream;
		        const controller = stream._writableStreamController;
		        const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
		        if (stream !== writer._ownerWritableStream) {
		            return promiseRejectedWith(defaultWriterLockException('write to'));
		        }
		        const state = stream._state;
		        if (state === 'errored') {
		            return promiseRejectedWith(stream._storedError);
		        }
		        if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {
		            return promiseRejectedWith(new TypeError('The stream is closing or closed and cannot be written to'));
		        }
		        if (state === 'erroring') {
		            return promiseRejectedWith(stream._storedError);
		        }
		        const promise = WritableStreamAddWriteRequest(stream);
		        WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
		        return promise;
		    }
		    const closeSentinel = {};
		    /**
		     * Allows control of a {@link WritableStream | writable stream}'s state and internal queue.
		     *
		     * @public
		     */
		    class WritableStreamDefaultController {
		        constructor() {
		            throw new TypeError('Illegal constructor');
		        }
		        /**
		         * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
		         *
		         * @deprecated
		         *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
		         *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
		         */
		        get abortReason() {
		            if (!IsWritableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$2('abortReason');
		            }
		            return this._abortReason;
		        }
		        /**
		         * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
		         */
		        get signal() {
		            if (!IsWritableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$2('signal');
		            }
		            if (this._abortController === undefined) {
		                // Older browsers or older Node versions may not support `AbortController` or `AbortSignal`.
		                // We don't want to bundle and ship an `AbortController` polyfill together with our polyfill,
		                // so instead we only implement support for `signal` if we find a global `AbortController` constructor.
		                throw new TypeError('WritableStreamDefaultController.prototype.signal is not supported');
		            }
		            return this._abortController.signal;
		        }
		        /**
		         * Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
		         *
		         * This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
		         * sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
		         * normal lifecycle of interactions with the underlying sink.
		         */
		        error(e = undefined) {
		            if (!IsWritableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$2('error');
		            }
		            const state = this._controlledWritableStream._state;
		            if (state !== 'writable') {
		                // The stream is closed, errored or will be soon. The sink can't do anything useful if it gets an error here, so
		                // just treat it as a no-op.
		                return;
		            }
		            WritableStreamDefaultControllerError(this, e);
		        }
		        /** @internal */
		        [AbortSteps](reason) {
		            const result = this._abortAlgorithm(reason);
		            WritableStreamDefaultControllerClearAlgorithms(this);
		            return result;
		        }
		        /** @internal */
		        [ErrorSteps]() {
		            ResetQueue(this);
		        }
		    }
		    Object.defineProperties(WritableStreamDefaultController.prototype, {
		        abortReason: { enumerable: true },
		        signal: { enumerable: true },
		        error: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
		            value: 'WritableStreamDefaultController',
		            configurable: true
		        });
		    }
		    // Abstract operations implementing interface required by the WritableStream.
		    function IsWritableStreamDefaultController(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_controlledWritableStream')) {
		            return false;
		        }
		        return x instanceof WritableStreamDefaultController;
		    }
		    function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
		        controller._controlledWritableStream = stream;
		        stream._writableStreamController = controller;
		        // Need to set the slots so that the assert doesn't fire. In the spec the slots already exist implicitly.
		        controller._queue = undefined;
		        controller._queueTotalSize = undefined;
		        ResetQueue(controller);
		        controller._abortReason = undefined;
		        controller._abortController = createAbortController();
		        controller._started = false;
		        controller._strategySizeAlgorithm = sizeAlgorithm;
		        controller._strategyHWM = highWaterMark;
		        controller._writeAlgorithm = writeAlgorithm;
		        controller._closeAlgorithm = closeAlgorithm;
		        controller._abortAlgorithm = abortAlgorithm;
		        const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
		        WritableStreamUpdateBackpressure(stream, backpressure);
		        const startResult = startAlgorithm();
		        const startPromise = promiseResolvedWith(startResult);
		        uponPromise(startPromise, () => {
		            controller._started = true;
		            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		        }, r => {
		            controller._started = true;
		            WritableStreamDealWithRejection(stream, r);
		        });
		    }
		    function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
		        const controller = Object.create(WritableStreamDefaultController.prototype);
		        let startAlgorithm = () => undefined;
		        let writeAlgorithm = () => promiseResolvedWith(undefined);
		        let closeAlgorithm = () => promiseResolvedWith(undefined);
		        let abortAlgorithm = () => promiseResolvedWith(undefined);
		        if (underlyingSink.start !== undefined) {
		            startAlgorithm = () => underlyingSink.start(controller);
		        }
		        if (underlyingSink.write !== undefined) {
		            writeAlgorithm = chunk => underlyingSink.write(chunk, controller);
		        }
		        if (underlyingSink.close !== undefined) {
		            closeAlgorithm = () => underlyingSink.close();
		        }
		        if (underlyingSink.abort !== undefined) {
		            abortAlgorithm = reason => underlyingSink.abort(reason);
		        }
		        SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
		    }
		    // ClearAlgorithms may be called twice. Erroring the same stream in multiple ways will often result in redundant calls.
		    function WritableStreamDefaultControllerClearAlgorithms(controller) {
		        controller._writeAlgorithm = undefined;
		        controller._closeAlgorithm = undefined;
		        controller._abortAlgorithm = undefined;
		        controller._strategySizeAlgorithm = undefined;
		    }
		    function WritableStreamDefaultControllerClose(controller) {
		        EnqueueValueWithSize(controller, closeSentinel, 0);
		        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		    }
		    function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
		        try {
		            return controller._strategySizeAlgorithm(chunk);
		        }
		        catch (chunkSizeE) {
		            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
		            return 1;
		        }
		    }
		    function WritableStreamDefaultControllerGetDesiredSize(controller) {
		        return controller._strategyHWM - controller._queueTotalSize;
		    }
		    function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
		        try {
		            EnqueueValueWithSize(controller, chunk, chunkSize);
		        }
		        catch (enqueueE) {
		            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
		            return;
		        }
		        const stream = controller._controlledWritableStream;
		        if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === 'writable') {
		            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
		            WritableStreamUpdateBackpressure(stream, backpressure);
		        }
		        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		    }
		    // Abstract operations for the WritableStreamDefaultController.
		    function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
		        const stream = controller._controlledWritableStream;
		        if (!controller._started) {
		            return;
		        }
		        if (stream._inFlightWriteRequest !== undefined) {
		            return;
		        }
		        const state = stream._state;
		        if (state === 'erroring') {
		            WritableStreamFinishErroring(stream);
		            return;
		        }
		        if (controller._queue.length === 0) {
		            return;
		        }
		        const value = PeekQueueValue(controller);
		        if (value === closeSentinel) {
		            WritableStreamDefaultControllerProcessClose(controller);
		        }
		        else {
		            WritableStreamDefaultControllerProcessWrite(controller, value);
		        }
		    }
		    function WritableStreamDefaultControllerErrorIfNeeded(controller, error) {
		        if (controller._controlledWritableStream._state === 'writable') {
		            WritableStreamDefaultControllerError(controller, error);
		        }
		    }
		    function WritableStreamDefaultControllerProcessClose(controller) {
		        const stream = controller._controlledWritableStream;
		        WritableStreamMarkCloseRequestInFlight(stream);
		        DequeueValue(controller);
		        const sinkClosePromise = controller._closeAlgorithm();
		        WritableStreamDefaultControllerClearAlgorithms(controller);
		        uponPromise(sinkClosePromise, () => {
		            WritableStreamFinishInFlightClose(stream);
		        }, reason => {
		            WritableStreamFinishInFlightCloseWithError(stream, reason);
		        });
		    }
		    function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
		        const stream = controller._controlledWritableStream;
		        WritableStreamMarkFirstWriteRequestInFlight(stream);
		        const sinkWritePromise = controller._writeAlgorithm(chunk);
		        uponPromise(sinkWritePromise, () => {
		            WritableStreamFinishInFlightWrite(stream);
		            const state = stream._state;
		            DequeueValue(controller);
		            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === 'writable') {
		                const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
		                WritableStreamUpdateBackpressure(stream, backpressure);
		            }
		            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		        }, reason => {
		            if (stream._state === 'writable') {
		                WritableStreamDefaultControllerClearAlgorithms(controller);
		            }
		            WritableStreamFinishInFlightWriteWithError(stream, reason);
		        });
		    }
		    function WritableStreamDefaultControllerGetBackpressure(controller) {
		        const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
		        return desiredSize <= 0;
		    }
		    // A client of WritableStreamDefaultController may use these functions directly to bypass state check.
		    function WritableStreamDefaultControllerError(controller, error) {
		        const stream = controller._controlledWritableStream;
		        WritableStreamDefaultControllerClearAlgorithms(controller);
		        WritableStreamStartErroring(stream, error);
		    }
		    // Helper functions for the WritableStream.
		    function streamBrandCheckException$2(name) {
		        return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
		    }
		    // Helper functions for the WritableStreamDefaultController.
		    function defaultControllerBrandCheckException$2(name) {
		        return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
		    }
		    // Helper functions for the WritableStreamDefaultWriter.
		    function defaultWriterBrandCheckException(name) {
		        return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
		    }
		    function defaultWriterLockException(name) {
		        return new TypeError('Cannot ' + name + ' a stream using a released writer');
		    }
		    function defaultWriterClosedPromiseInitialize(writer) {
		        writer._closedPromise = newPromise((resolve, reject) => {
		            writer._closedPromise_resolve = resolve;
		            writer._closedPromise_reject = reject;
		            writer._closedPromiseState = 'pending';
		        });
		    }
		    function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
		        defaultWriterClosedPromiseInitialize(writer);
		        defaultWriterClosedPromiseReject(writer, reason);
		    }
		    function defaultWriterClosedPromiseInitializeAsResolved(writer) {
		        defaultWriterClosedPromiseInitialize(writer);
		        defaultWriterClosedPromiseResolve(writer);
		    }
		    function defaultWriterClosedPromiseReject(writer, reason) {
		        if (writer._closedPromise_reject === undefined) {
		            return;
		        }
		        setPromiseIsHandledToTrue(writer._closedPromise);
		        writer._closedPromise_reject(reason);
		        writer._closedPromise_resolve = undefined;
		        writer._closedPromise_reject = undefined;
		        writer._closedPromiseState = 'rejected';
		    }
		    function defaultWriterClosedPromiseResetToRejected(writer, reason) {
		        defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
		    }
		    function defaultWriterClosedPromiseResolve(writer) {
		        if (writer._closedPromise_resolve === undefined) {
		            return;
		        }
		        writer._closedPromise_resolve(undefined);
		        writer._closedPromise_resolve = undefined;
		        writer._closedPromise_reject = undefined;
		        writer._closedPromiseState = 'resolved';
		    }
		    function defaultWriterReadyPromiseInitialize(writer) {
		        writer._readyPromise = newPromise((resolve, reject) => {
		            writer._readyPromise_resolve = resolve;
		            writer._readyPromise_reject = reject;
		        });
		        writer._readyPromiseState = 'pending';
		    }
		    function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
		        defaultWriterReadyPromiseInitialize(writer);
		        defaultWriterReadyPromiseReject(writer, reason);
		    }
		    function defaultWriterReadyPromiseInitializeAsResolved(writer) {
		        defaultWriterReadyPromiseInitialize(writer);
		        defaultWriterReadyPromiseResolve(writer);
		    }
		    function defaultWriterReadyPromiseReject(writer, reason) {
		        if (writer._readyPromise_reject === undefined) {
		            return;
		        }
		        setPromiseIsHandledToTrue(writer._readyPromise);
		        writer._readyPromise_reject(reason);
		        writer._readyPromise_resolve = undefined;
		        writer._readyPromise_reject = undefined;
		        writer._readyPromiseState = 'rejected';
		    }
		    function defaultWriterReadyPromiseReset(writer) {
		        defaultWriterReadyPromiseInitialize(writer);
		    }
		    function defaultWriterReadyPromiseResetToRejected(writer, reason) {
		        defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
		    }
		    function defaultWriterReadyPromiseResolve(writer) {
		        if (writer._readyPromise_resolve === undefined) {
		            return;
		        }
		        writer._readyPromise_resolve(undefined);
		        writer._readyPromise_resolve = undefined;
		        writer._readyPromise_reject = undefined;
		        writer._readyPromiseState = 'fulfilled';
		    }

		    /// <reference lib="dom" />
		    const NativeDOMException = typeof DOMException !== 'undefined' ? DOMException : undefined;

		    /// <reference types="node" />
		    function isDOMExceptionConstructor(ctor) {
		        if (!(typeof ctor === 'function' || typeof ctor === 'object')) {
		            return false;
		        }
		        try {
		            new ctor();
		            return true;
		        }
		        catch (_a) {
		            return false;
		        }
		    }
		    function createDOMExceptionPolyfill() {
		        // eslint-disable-next-line no-shadow
		        const ctor = function DOMException(message, name) {
		            this.message = message || '';
		            this.name = name || 'Error';
		            if (Error.captureStackTrace) {
		                Error.captureStackTrace(this, this.constructor);
		            }
		        };
		        ctor.prototype = Object.create(Error.prototype);
		        Object.defineProperty(ctor.prototype, 'constructor', { value: ctor, writable: true, configurable: true });
		        return ctor;
		    }
		    // eslint-disable-next-line no-redeclare
		    const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();

		    function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
		        const reader = AcquireReadableStreamDefaultReader(source);
		        const writer = AcquireWritableStreamDefaultWriter(dest);
		        source._disturbed = true;
		        let shuttingDown = false;
		        // This is used to keep track of the spec's requirement that we wait for ongoing writes during shutdown.
		        let currentWrite = promiseResolvedWith(undefined);
		        return newPromise((resolve, reject) => {
		            let abortAlgorithm;
		            if (signal !== undefined) {
		                abortAlgorithm = () => {
		                    const error = new DOMException$1('Aborted', 'AbortError');
		                    const actions = [];
		                    if (!preventAbort) {
		                        actions.push(() => {
		                            if (dest._state === 'writable') {
		                                return WritableStreamAbort(dest, error);
		                            }
		                            return promiseResolvedWith(undefined);
		                        });
		                    }
		                    if (!preventCancel) {
		                        actions.push(() => {
		                            if (source._state === 'readable') {
		                                return ReadableStreamCancel(source, error);
		                            }
		                            return promiseResolvedWith(undefined);
		                        });
		                    }
		                    shutdownWithAction(() => Promise.all(actions.map(action => action())), true, error);
		                };
		                if (signal.aborted) {
		                    abortAlgorithm();
		                    return;
		                }
		                signal.addEventListener('abort', abortAlgorithm);
		            }
		            // Using reader and writer, read all chunks from this and write them to dest
		            // - Backpressure must be enforced
		            // - Shutdown must stop all activity
		            function pipeLoop() {
		                return newPromise((resolveLoop, rejectLoop) => {
		                    function next(done) {
		                        if (done) {
		                            resolveLoop();
		                        }
		                        else {
		                            // Use `PerformPromiseThen` instead of `uponPromise` to avoid
		                            // adding unnecessary `.catch(rethrowAssertionErrorRejection)` handlers
		                            PerformPromiseThen(pipeStep(), next, rejectLoop);
		                        }
		                    }
		                    next(false);
		                });
		            }
		            function pipeStep() {
		                if (shuttingDown) {
		                    return promiseResolvedWith(true);
		                }
		                return PerformPromiseThen(writer._readyPromise, () => {
		                    return newPromise((resolveRead, rejectRead) => {
		                        ReadableStreamDefaultReaderRead(reader, {
		                            _chunkSteps: chunk => {
		                                currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), undefined, noop);
		                                resolveRead(false);
		                            },
		                            _closeSteps: () => resolveRead(true),
		                            _errorSteps: rejectRead
		                        });
		                    });
		                });
		            }
		            // Errors must be propagated forward
		            isOrBecomesErrored(source, reader._closedPromise, storedError => {
		                if (!preventAbort) {
		                    shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
		                }
		                else {
		                    shutdown(true, storedError);
		                }
		            });
		            // Errors must be propagated backward
		            isOrBecomesErrored(dest, writer._closedPromise, storedError => {
		                if (!preventCancel) {
		                    shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
		                }
		                else {
		                    shutdown(true, storedError);
		                }
		            });
		            // Closing must be propagated forward
		            isOrBecomesClosed(source, reader._closedPromise, () => {
		                if (!preventClose) {
		                    shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
		                }
		                else {
		                    shutdown();
		                }
		            });
		            // Closing must be propagated backward
		            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === 'closed') {
		                const destClosed = new TypeError('the destination writable stream closed before all data could be piped to it');
		                if (!preventCancel) {
		                    shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
		                }
		                else {
		                    shutdown(true, destClosed);
		                }
		            }
		            setPromiseIsHandledToTrue(pipeLoop());
		            function waitForWritesToFinish() {
		                // Another write may have started while we were waiting on this currentWrite, so we have to be sure to wait
		                // for that too.
		                const oldCurrentWrite = currentWrite;
		                return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : undefined);
		            }
		            function isOrBecomesErrored(stream, promise, action) {
		                if (stream._state === 'errored') {
		                    action(stream._storedError);
		                }
		                else {
		                    uponRejection(promise, action);
		                }
		            }
		            function isOrBecomesClosed(stream, promise, action) {
		                if (stream._state === 'closed') {
		                    action();
		                }
		                else {
		                    uponFulfillment(promise, action);
		                }
		            }
		            function shutdownWithAction(action, originalIsError, originalError) {
		                if (shuttingDown) {
		                    return;
		                }
		                shuttingDown = true;
		                if (dest._state === 'writable' && !WritableStreamCloseQueuedOrInFlight(dest)) {
		                    uponFulfillment(waitForWritesToFinish(), doTheRest);
		                }
		                else {
		                    doTheRest();
		                }
		                function doTheRest() {
		                    uponPromise(action(), () => finalize(originalIsError, originalError), newError => finalize(true, newError));
		                }
		            }
		            function shutdown(isError, error) {
		                if (shuttingDown) {
		                    return;
		                }
		                shuttingDown = true;
		                if (dest._state === 'writable' && !WritableStreamCloseQueuedOrInFlight(dest)) {
		                    uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error));
		                }
		                else {
		                    finalize(isError, error);
		                }
		            }
		            function finalize(isError, error) {
		                WritableStreamDefaultWriterRelease(writer);
		                ReadableStreamReaderGenericRelease(reader);
		                if (signal !== undefined) {
		                    signal.removeEventListener('abort', abortAlgorithm);
		                }
		                if (isError) {
		                    reject(error);
		                }
		                else {
		                    resolve(undefined);
		                }
		            }
		        });
		    }

		    /**
		     * Allows control of a {@link ReadableStream | readable stream}'s state and internal queue.
		     *
		     * @public
		     */
		    class ReadableStreamDefaultController {
		        constructor() {
		            throw new TypeError('Illegal constructor');
		        }
		        /**
		         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
		         * over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
		         */
		        get desiredSize() {
		            if (!IsReadableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$1('desiredSize');
		            }
		            return ReadableStreamDefaultControllerGetDesiredSize(this);
		        }
		        /**
		         * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
		         * the stream, but once those are read, the stream will become closed.
		         */
		        close() {
		            if (!IsReadableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$1('close');
		            }
		            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
		                throw new TypeError('The stream is not in a state that permits close');
		            }
		            ReadableStreamDefaultControllerClose(this);
		        }
		        enqueue(chunk = undefined) {
		            if (!IsReadableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$1('enqueue');
		            }
		            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
		                throw new TypeError('The stream is not in a state that permits enqueue');
		            }
		            return ReadableStreamDefaultControllerEnqueue(this, chunk);
		        }
		        /**
		         * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
		         */
		        error(e = undefined) {
		            if (!IsReadableStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException$1('error');
		            }
		            ReadableStreamDefaultControllerError(this, e);
		        }
		        /** @internal */
		        [CancelSteps](reason) {
		            ResetQueue(this);
		            const result = this._cancelAlgorithm(reason);
		            ReadableStreamDefaultControllerClearAlgorithms(this);
		            return result;
		        }
		        /** @internal */
		        [PullSteps](readRequest) {
		            const stream = this._controlledReadableStream;
		            if (this._queue.length > 0) {
		                const chunk = DequeueValue(this);
		                if (this._closeRequested && this._queue.length === 0) {
		                    ReadableStreamDefaultControllerClearAlgorithms(this);
		                    ReadableStreamClose(stream);
		                }
		                else {
		                    ReadableStreamDefaultControllerCallPullIfNeeded(this);
		                }
		                readRequest._chunkSteps(chunk);
		            }
		            else {
		                ReadableStreamAddReadRequest(stream, readRequest);
		                ReadableStreamDefaultControllerCallPullIfNeeded(this);
		            }
		        }
		    }
		    Object.defineProperties(ReadableStreamDefaultController.prototype, {
		        close: { enumerable: true },
		        enqueue: { enumerable: true },
		        error: { enumerable: true },
		        desiredSize: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableStreamDefaultController',
		            configurable: true
		        });
		    }
		    // Abstract operations for the ReadableStreamDefaultController.
		    function IsReadableStreamDefaultController(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_controlledReadableStream')) {
		            return false;
		        }
		        return x instanceof ReadableStreamDefaultController;
		    }
		    function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
		        const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
		        if (!shouldPull) {
		            return;
		        }
		        if (controller._pulling) {
		            controller._pullAgain = true;
		            return;
		        }
		        controller._pulling = true;
		        const pullPromise = controller._pullAlgorithm();
		        uponPromise(pullPromise, () => {
		            controller._pulling = false;
		            if (controller._pullAgain) {
		                controller._pullAgain = false;
		                ReadableStreamDefaultControllerCallPullIfNeeded(controller);
		            }
		        }, e => {
		            ReadableStreamDefaultControllerError(controller, e);
		        });
		    }
		    function ReadableStreamDefaultControllerShouldCallPull(controller) {
		        const stream = controller._controlledReadableStream;
		        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
		            return false;
		        }
		        if (!controller._started) {
		            return false;
		        }
		        if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
		            return true;
		        }
		        const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
		        if (desiredSize > 0) {
		            return true;
		        }
		        return false;
		    }
		    function ReadableStreamDefaultControllerClearAlgorithms(controller) {
		        controller._pullAlgorithm = undefined;
		        controller._cancelAlgorithm = undefined;
		        controller._strategySizeAlgorithm = undefined;
		    }
		    // A client of ReadableStreamDefaultController may use these functions directly to bypass state check.
		    function ReadableStreamDefaultControllerClose(controller) {
		        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
		            return;
		        }
		        const stream = controller._controlledReadableStream;
		        controller._closeRequested = true;
		        if (controller._queue.length === 0) {
		            ReadableStreamDefaultControllerClearAlgorithms(controller);
		            ReadableStreamClose(stream);
		        }
		    }
		    function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
		        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
		            return;
		        }
		        const stream = controller._controlledReadableStream;
		        if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
		            ReadableStreamFulfillReadRequest(stream, chunk, false);
		        }
		        else {
		            let chunkSize;
		            try {
		                chunkSize = controller._strategySizeAlgorithm(chunk);
		            }
		            catch (chunkSizeE) {
		                ReadableStreamDefaultControllerError(controller, chunkSizeE);
		                throw chunkSizeE;
		            }
		            try {
		                EnqueueValueWithSize(controller, chunk, chunkSize);
		            }
		            catch (enqueueE) {
		                ReadableStreamDefaultControllerError(controller, enqueueE);
		                throw enqueueE;
		            }
		        }
		        ReadableStreamDefaultControllerCallPullIfNeeded(controller);
		    }
		    function ReadableStreamDefaultControllerError(controller, e) {
		        const stream = controller._controlledReadableStream;
		        if (stream._state !== 'readable') {
		            return;
		        }
		        ResetQueue(controller);
		        ReadableStreamDefaultControllerClearAlgorithms(controller);
		        ReadableStreamError(stream, e);
		    }
		    function ReadableStreamDefaultControllerGetDesiredSize(controller) {
		        const state = controller._controlledReadableStream._state;
		        if (state === 'errored') {
		            return null;
		        }
		        if (state === 'closed') {
		            return 0;
		        }
		        return controller._strategyHWM - controller._queueTotalSize;
		    }
		    // This is used in the implementation of TransformStream.
		    function ReadableStreamDefaultControllerHasBackpressure(controller) {
		        if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
		            return false;
		        }
		        return true;
		    }
		    function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
		        const state = controller._controlledReadableStream._state;
		        if (!controller._closeRequested && state === 'readable') {
		            return true;
		        }
		        return false;
		    }
		    function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
		        controller._controlledReadableStream = stream;
		        controller._queue = undefined;
		        controller._queueTotalSize = undefined;
		        ResetQueue(controller);
		        controller._started = false;
		        controller._closeRequested = false;
		        controller._pullAgain = false;
		        controller._pulling = false;
		        controller._strategySizeAlgorithm = sizeAlgorithm;
		        controller._strategyHWM = highWaterMark;
		        controller._pullAlgorithm = pullAlgorithm;
		        controller._cancelAlgorithm = cancelAlgorithm;
		        stream._readableStreamController = controller;
		        const startResult = startAlgorithm();
		        uponPromise(promiseResolvedWith(startResult), () => {
		            controller._started = true;
		            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
		        }, r => {
		            ReadableStreamDefaultControllerError(controller, r);
		        });
		    }
		    function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
		        const controller = Object.create(ReadableStreamDefaultController.prototype);
		        let startAlgorithm = () => undefined;
		        let pullAlgorithm = () => promiseResolvedWith(undefined);
		        let cancelAlgorithm = () => promiseResolvedWith(undefined);
		        if (underlyingSource.start !== undefined) {
		            startAlgorithm = () => underlyingSource.start(controller);
		        }
		        if (underlyingSource.pull !== undefined) {
		            pullAlgorithm = () => underlyingSource.pull(controller);
		        }
		        if (underlyingSource.cancel !== undefined) {
		            cancelAlgorithm = reason => underlyingSource.cancel(reason);
		        }
		        SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
		    }
		    // Helper functions for the ReadableStreamDefaultController.
		    function defaultControllerBrandCheckException$1(name) {
		        return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
		    }

		    function ReadableStreamTee(stream, cloneForBranch2) {
		        if (IsReadableByteStreamController(stream._readableStreamController)) {
		            return ReadableByteStreamTee(stream);
		        }
		        return ReadableStreamDefaultTee(stream);
		    }
		    function ReadableStreamDefaultTee(stream, cloneForBranch2) {
		        const reader = AcquireReadableStreamDefaultReader(stream);
		        let reading = false;
		        let readAgain = false;
		        let canceled1 = false;
		        let canceled2 = false;
		        let reason1;
		        let reason2;
		        let branch1;
		        let branch2;
		        let resolveCancelPromise;
		        const cancelPromise = newPromise(resolve => {
		            resolveCancelPromise = resolve;
		        });
		        function pullAlgorithm() {
		            if (reading) {
		                readAgain = true;
		                return promiseResolvedWith(undefined);
		            }
		            reading = true;
		            const readRequest = {
		                _chunkSteps: chunk => {
		                    // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
		                    // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
		                    // successful synchronously-available reads get ahead of asynchronously-available errors.
		                    queueMicrotask(() => {
		                        readAgain = false;
		                        const chunk1 = chunk;
		                        const chunk2 = chunk;
		                        // There is no way to access the cloning code right now in the reference implementation.
		                        // If we add one then we'll need an implementation for serializable objects.
		                        // if (!canceled2 && cloneForBranch2) {
		                        //   chunk2 = StructuredDeserialize(StructuredSerialize(chunk2));
		                        // }
		                        if (!canceled1) {
		                            ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
		                        }
		                        if (!canceled2) {
		                            ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
		                        }
		                        reading = false;
		                        if (readAgain) {
		                            pullAlgorithm();
		                        }
		                    });
		                },
		                _closeSteps: () => {
		                    reading = false;
		                    if (!canceled1) {
		                        ReadableStreamDefaultControllerClose(branch1._readableStreamController);
		                    }
		                    if (!canceled2) {
		                        ReadableStreamDefaultControllerClose(branch2._readableStreamController);
		                    }
		                    if (!canceled1 || !canceled2) {
		                        resolveCancelPromise(undefined);
		                    }
		                },
		                _errorSteps: () => {
		                    reading = false;
		                }
		            };
		            ReadableStreamDefaultReaderRead(reader, readRequest);
		            return promiseResolvedWith(undefined);
		        }
		        function cancel1Algorithm(reason) {
		            canceled1 = true;
		            reason1 = reason;
		            if (canceled2) {
		                const compositeReason = CreateArrayFromList([reason1, reason2]);
		                const cancelResult = ReadableStreamCancel(stream, compositeReason);
		                resolveCancelPromise(cancelResult);
		            }
		            return cancelPromise;
		        }
		        function cancel2Algorithm(reason) {
		            canceled2 = true;
		            reason2 = reason;
		            if (canceled1) {
		                const compositeReason = CreateArrayFromList([reason1, reason2]);
		                const cancelResult = ReadableStreamCancel(stream, compositeReason);
		                resolveCancelPromise(cancelResult);
		            }
		            return cancelPromise;
		        }
		        function startAlgorithm() {
		            // do nothing
		        }
		        branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
		        branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
		        uponRejection(reader._closedPromise, (r) => {
		            ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
		            ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
		            if (!canceled1 || !canceled2) {
		                resolveCancelPromise(undefined);
		            }
		        });
		        return [branch1, branch2];
		    }
		    function ReadableByteStreamTee(stream) {
		        let reader = AcquireReadableStreamDefaultReader(stream);
		        let reading = false;
		        let readAgainForBranch1 = false;
		        let readAgainForBranch2 = false;
		        let canceled1 = false;
		        let canceled2 = false;
		        let reason1;
		        let reason2;
		        let branch1;
		        let branch2;
		        let resolveCancelPromise;
		        const cancelPromise = newPromise(resolve => {
		            resolveCancelPromise = resolve;
		        });
		        function forwardReaderError(thisReader) {
		            uponRejection(thisReader._closedPromise, r => {
		                if (thisReader !== reader) {
		                    return;
		                }
		                ReadableByteStreamControllerError(branch1._readableStreamController, r);
		                ReadableByteStreamControllerError(branch2._readableStreamController, r);
		                if (!canceled1 || !canceled2) {
		                    resolveCancelPromise(undefined);
		                }
		            });
		        }
		        function pullWithDefaultReader() {
		            if (IsReadableStreamBYOBReader(reader)) {
		                ReadableStreamReaderGenericRelease(reader);
		                reader = AcquireReadableStreamDefaultReader(stream);
		                forwardReaderError(reader);
		            }
		            const readRequest = {
		                _chunkSteps: chunk => {
		                    // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
		                    // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
		                    // successful synchronously-available reads get ahead of asynchronously-available errors.
		                    queueMicrotask(() => {
		                        readAgainForBranch1 = false;
		                        readAgainForBranch2 = false;
		                        const chunk1 = chunk;
		                        let chunk2 = chunk;
		                        if (!canceled1 && !canceled2) {
		                            try {
		                                chunk2 = CloneAsUint8Array(chunk);
		                            }
		                            catch (cloneE) {
		                                ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
		                                ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
		                                resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
		                                return;
		                            }
		                        }
		                        if (!canceled1) {
		                            ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
		                        }
		                        if (!canceled2) {
		                            ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
		                        }
		                        reading = false;
		                        if (readAgainForBranch1) {
		                            pull1Algorithm();
		                        }
		                        else if (readAgainForBranch2) {
		                            pull2Algorithm();
		                        }
		                    });
		                },
		                _closeSteps: () => {
		                    reading = false;
		                    if (!canceled1) {
		                        ReadableByteStreamControllerClose(branch1._readableStreamController);
		                    }
		                    if (!canceled2) {
		                        ReadableByteStreamControllerClose(branch2._readableStreamController);
		                    }
		                    if (branch1._readableStreamController._pendingPullIntos.length > 0) {
		                        ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
		                    }
		                    if (branch2._readableStreamController._pendingPullIntos.length > 0) {
		                        ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
		                    }
		                    if (!canceled1 || !canceled2) {
		                        resolveCancelPromise(undefined);
		                    }
		                },
		                _errorSteps: () => {
		                    reading = false;
		                }
		            };
		            ReadableStreamDefaultReaderRead(reader, readRequest);
		        }
		        function pullWithBYOBReader(view, forBranch2) {
		            if (IsReadableStreamDefaultReader(reader)) {
		                ReadableStreamReaderGenericRelease(reader);
		                reader = AcquireReadableStreamBYOBReader(stream);
		                forwardReaderError(reader);
		            }
		            const byobBranch = forBranch2 ? branch2 : branch1;
		            const otherBranch = forBranch2 ? branch1 : branch2;
		            const readIntoRequest = {
		                _chunkSteps: chunk => {
		                    // This needs to be delayed a microtask because it takes at least a microtask to detect errors (using
		                    // reader._closedPromise below), and we want errors in stream to error both branches immediately. We cannot let
		                    // successful synchronously-available reads get ahead of asynchronously-available errors.
		                    queueMicrotask(() => {
		                        readAgainForBranch1 = false;
		                        readAgainForBranch2 = false;
		                        const byobCanceled = forBranch2 ? canceled2 : canceled1;
		                        const otherCanceled = forBranch2 ? canceled1 : canceled2;
		                        if (!otherCanceled) {
		                            let clonedChunk;
		                            try {
		                                clonedChunk = CloneAsUint8Array(chunk);
		                            }
		                            catch (cloneE) {
		                                ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
		                                ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
		                                resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
		                                return;
		                            }
		                            if (!byobCanceled) {
		                                ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
		                            }
		                            ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
		                        }
		                        else if (!byobCanceled) {
		                            ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
		                        }
		                        reading = false;
		                        if (readAgainForBranch1) {
		                            pull1Algorithm();
		                        }
		                        else if (readAgainForBranch2) {
		                            pull2Algorithm();
		                        }
		                    });
		                },
		                _closeSteps: chunk => {
		                    reading = false;
		                    const byobCanceled = forBranch2 ? canceled2 : canceled1;
		                    const otherCanceled = forBranch2 ? canceled1 : canceled2;
		                    if (!byobCanceled) {
		                        ReadableByteStreamControllerClose(byobBranch._readableStreamController);
		                    }
		                    if (!otherCanceled) {
		                        ReadableByteStreamControllerClose(otherBranch._readableStreamController);
		                    }
		                    if (chunk !== undefined) {
		                        if (!byobCanceled) {
		                            ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
		                        }
		                        if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
		                            ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
		                        }
		                    }
		                    if (!byobCanceled || !otherCanceled) {
		                        resolveCancelPromise(undefined);
		                    }
		                },
		                _errorSteps: () => {
		                    reading = false;
		                }
		            };
		            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
		        }
		        function pull1Algorithm() {
		            if (reading) {
		                readAgainForBranch1 = true;
		                return promiseResolvedWith(undefined);
		            }
		            reading = true;
		            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
		            if (byobRequest === null) {
		                pullWithDefaultReader();
		            }
		            else {
		                pullWithBYOBReader(byobRequest._view, false);
		            }
		            return promiseResolvedWith(undefined);
		        }
		        function pull2Algorithm() {
		            if (reading) {
		                readAgainForBranch2 = true;
		                return promiseResolvedWith(undefined);
		            }
		            reading = true;
		            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
		            if (byobRequest === null) {
		                pullWithDefaultReader();
		            }
		            else {
		                pullWithBYOBReader(byobRequest._view, true);
		            }
		            return promiseResolvedWith(undefined);
		        }
		        function cancel1Algorithm(reason) {
		            canceled1 = true;
		            reason1 = reason;
		            if (canceled2) {
		                const compositeReason = CreateArrayFromList([reason1, reason2]);
		                const cancelResult = ReadableStreamCancel(stream, compositeReason);
		                resolveCancelPromise(cancelResult);
		            }
		            return cancelPromise;
		        }
		        function cancel2Algorithm(reason) {
		            canceled2 = true;
		            reason2 = reason;
		            if (canceled1) {
		                const compositeReason = CreateArrayFromList([reason1, reason2]);
		                const cancelResult = ReadableStreamCancel(stream, compositeReason);
		                resolveCancelPromise(cancelResult);
		            }
		            return cancelPromise;
		        }
		        function startAlgorithm() {
		            return;
		        }
		        branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
		        branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
		        forwardReaderError(reader);
		        return [branch1, branch2];
		    }

		    function convertUnderlyingDefaultOrByteSource(source, context) {
		        assertDictionary(source, context);
		        const original = source;
		        const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
		        const cancel = original === null || original === void 0 ? void 0 : original.cancel;
		        const pull = original === null || original === void 0 ? void 0 : original.pull;
		        const start = original === null || original === void 0 ? void 0 : original.start;
		        const type = original === null || original === void 0 ? void 0 : original.type;
		        return {
		            autoAllocateChunkSize: autoAllocateChunkSize === undefined ?
		                undefined :
		                convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
		            cancel: cancel === undefined ?
		                undefined :
		                convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
		            pull: pull === undefined ?
		                undefined :
		                convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
		            start: start === undefined ?
		                undefined :
		                convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
		            type: type === undefined ? undefined : convertReadableStreamType(type, `${context} has member 'type' that`)
		        };
		    }
		    function convertUnderlyingSourceCancelCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (reason) => promiseCall(fn, original, [reason]);
		    }
		    function convertUnderlyingSourcePullCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (controller) => promiseCall(fn, original, [controller]);
		    }
		    function convertUnderlyingSourceStartCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (controller) => reflectCall(fn, original, [controller]);
		    }
		    function convertReadableStreamType(type, context) {
		        type = `${type}`;
		        if (type !== 'bytes') {
		            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
		        }
		        return type;
		    }

		    function convertReaderOptions(options, context) {
		        assertDictionary(options, context);
		        const mode = options === null || options === void 0 ? void 0 : options.mode;
		        return {
		            mode: mode === undefined ? undefined : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
		        };
		    }
		    function convertReadableStreamReaderMode(mode, context) {
		        mode = `${mode}`;
		        if (mode !== 'byob') {
		            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
		        }
		        return mode;
		    }

		    function convertIteratorOptions(options, context) {
		        assertDictionary(options, context);
		        const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
		        return { preventCancel: Boolean(preventCancel) };
		    }

		    function convertPipeOptions(options, context) {
		        assertDictionary(options, context);
		        const preventAbort = options === null || options === void 0 ? void 0 : options.preventAbort;
		        const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
		        const preventClose = options === null || options === void 0 ? void 0 : options.preventClose;
		        const signal = options === null || options === void 0 ? void 0 : options.signal;
		        if (signal !== undefined) {
		            assertAbortSignal(signal, `${context} has member 'signal' that`);
		        }
		        return {
		            preventAbort: Boolean(preventAbort),
		            preventCancel: Boolean(preventCancel),
		            preventClose: Boolean(preventClose),
		            signal
		        };
		    }
		    function assertAbortSignal(signal, context) {
		        if (!isAbortSignal(signal)) {
		            throw new TypeError(`${context} is not an AbortSignal.`);
		        }
		    }

		    function convertReadableWritablePair(pair, context) {
		        assertDictionary(pair, context);
		        const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
		        assertRequiredField(readable, 'readable', 'ReadableWritablePair');
		        assertReadableStream(readable, `${context} has member 'readable' that`);
		        const writable = pair === null || pair === void 0 ? void 0 : pair.writable;
		        assertRequiredField(writable, 'writable', 'ReadableWritablePair');
		        assertWritableStream(writable, `${context} has member 'writable' that`);
		        return { readable, writable };
		    }

		    /**
		     * A readable stream represents a source of data, from which you can read.
		     *
		     * @public
		     */
		    class ReadableStream {
		        constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
		            if (rawUnderlyingSource === undefined) {
		                rawUnderlyingSource = null;
		            }
		            else {
		                assertObject(rawUnderlyingSource, 'First parameter');
		            }
		            const strategy = convertQueuingStrategy(rawStrategy, 'Second parameter');
		            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, 'First parameter');
		            InitializeReadableStream(this);
		            if (underlyingSource.type === 'bytes') {
		                if (strategy.size !== undefined) {
		                    throw new RangeError('The strategy for a byte stream cannot have a size function');
		                }
		                const highWaterMark = ExtractHighWaterMark(strategy, 0);
		                SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
		            }
		            else {
		                const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
		                const highWaterMark = ExtractHighWaterMark(strategy, 1);
		                SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
		            }
		        }
		        /**
		         * Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
		         */
		        get locked() {
		            if (!IsReadableStream(this)) {
		                throw streamBrandCheckException$1('locked');
		            }
		            return IsReadableStreamLocked(this);
		        }
		        /**
		         * Cancels the stream, signaling a loss of interest in the stream by a consumer.
		         *
		         * The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
		         * method, which might or might not use it.
		         */
		        cancel(reason = undefined) {
		            if (!IsReadableStream(this)) {
		                return promiseRejectedWith(streamBrandCheckException$1('cancel'));
		            }
		            if (IsReadableStreamLocked(this)) {
		                return promiseRejectedWith(new TypeError('Cannot cancel a stream that already has a reader'));
		            }
		            return ReadableStreamCancel(this, reason);
		        }
		        getReader(rawOptions = undefined) {
		            if (!IsReadableStream(this)) {
		                throw streamBrandCheckException$1('getReader');
		            }
		            const options = convertReaderOptions(rawOptions, 'First parameter');
		            if (options.mode === undefined) {
		                return AcquireReadableStreamDefaultReader(this);
		            }
		            return AcquireReadableStreamBYOBReader(this);
		        }
		        pipeThrough(rawTransform, rawOptions = {}) {
		            if (!IsReadableStream(this)) {
		                throw streamBrandCheckException$1('pipeThrough');
		            }
		            assertRequiredArgument(rawTransform, 1, 'pipeThrough');
		            const transform = convertReadableWritablePair(rawTransform, 'First parameter');
		            const options = convertPipeOptions(rawOptions, 'Second parameter');
		            if (IsReadableStreamLocked(this)) {
		                throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream');
		            }
		            if (IsWritableStreamLocked(transform.writable)) {
		                throw new TypeError('ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream');
		            }
		            const promise = ReadableStreamPipeTo(this, transform.writable, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
		            setPromiseIsHandledToTrue(promise);
		            return transform.readable;
		        }
		        pipeTo(destination, rawOptions = {}) {
		            if (!IsReadableStream(this)) {
		                return promiseRejectedWith(streamBrandCheckException$1('pipeTo'));
		            }
		            if (destination === undefined) {
		                return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
		            }
		            if (!IsWritableStream(destination)) {
		                return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
		            }
		            let options;
		            try {
		                options = convertPipeOptions(rawOptions, 'Second parameter');
		            }
		            catch (e) {
		                return promiseRejectedWith(e);
		            }
		            if (IsReadableStreamLocked(this)) {
		                return promiseRejectedWith(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream'));
		            }
		            if (IsWritableStreamLocked(destination)) {
		                return promiseRejectedWith(new TypeError('ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream'));
		            }
		            return ReadableStreamPipeTo(this, destination, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
		        }
		        /**
		         * Tees this readable stream, returning a two-element array containing the two resulting branches as
		         * new {@link ReadableStream} instances.
		         *
		         * Teeing a stream will lock it, preventing any other consumer from acquiring a reader.
		         * To cancel the stream, cancel both of the resulting branches; a composite cancellation reason will then be
		         * propagated to the stream's underlying source.
		         *
		         * Note that the chunks seen in each branch will be the same object. If the chunks are not immutable,
		         * this could allow interference between the two branches.
		         */
		        tee() {
		            if (!IsReadableStream(this)) {
		                throw streamBrandCheckException$1('tee');
		            }
		            const branches = ReadableStreamTee(this);
		            return CreateArrayFromList(branches);
		        }
		        values(rawOptions = undefined) {
		            if (!IsReadableStream(this)) {
		                throw streamBrandCheckException$1('values');
		            }
		            const options = convertIteratorOptions(rawOptions, 'First parameter');
		            return AcquireReadableStreamAsyncIterator(this, options.preventCancel);
		        }
		    }
		    Object.defineProperties(ReadableStream.prototype, {
		        cancel: { enumerable: true },
		        getReader: { enumerable: true },
		        pipeThrough: { enumerable: true },
		        pipeTo: { enumerable: true },
		        tee: { enumerable: true },
		        values: { enumerable: true },
		        locked: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ReadableStream.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ReadableStream',
		            configurable: true
		        });
		    }
		    if (typeof SymbolPolyfill.asyncIterator === 'symbol') {
		        Object.defineProperty(ReadableStream.prototype, SymbolPolyfill.asyncIterator, {
		            value: ReadableStream.prototype.values,
		            writable: true,
		            configurable: true
		        });
		    }
		    // Abstract operations for the ReadableStream.
		    // Throws if and only if startAlgorithm throws.
		    function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
		        const stream = Object.create(ReadableStream.prototype);
		        InitializeReadableStream(stream);
		        const controller = Object.create(ReadableStreamDefaultController.prototype);
		        SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
		        return stream;
		    }
		    // Throws if and only if startAlgorithm throws.
		    function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
		        const stream = Object.create(ReadableStream.prototype);
		        InitializeReadableStream(stream);
		        const controller = Object.create(ReadableByteStreamController.prototype);
		        SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, undefined);
		        return stream;
		    }
		    function InitializeReadableStream(stream) {
		        stream._state = 'readable';
		        stream._reader = undefined;
		        stream._storedError = undefined;
		        stream._disturbed = false;
		    }
		    function IsReadableStream(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_readableStreamController')) {
		            return false;
		        }
		        return x instanceof ReadableStream;
		    }
		    function IsReadableStreamLocked(stream) {
		        if (stream._reader === undefined) {
		            return false;
		        }
		        return true;
		    }
		    // ReadableStream API exposed for controllers.
		    function ReadableStreamCancel(stream, reason) {
		        stream._disturbed = true;
		        if (stream._state === 'closed') {
		            return promiseResolvedWith(undefined);
		        }
		        if (stream._state === 'errored') {
		            return promiseRejectedWith(stream._storedError);
		        }
		        ReadableStreamClose(stream);
		        const reader = stream._reader;
		        if (reader !== undefined && IsReadableStreamBYOBReader(reader)) {
		            reader._readIntoRequests.forEach(readIntoRequest => {
		                readIntoRequest._closeSteps(undefined);
		            });
		            reader._readIntoRequests = new SimpleQueue();
		        }
		        const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
		        return transformPromiseWith(sourceCancelPromise, noop);
		    }
		    function ReadableStreamClose(stream) {
		        stream._state = 'closed';
		        const reader = stream._reader;
		        if (reader === undefined) {
		            return;
		        }
		        defaultReaderClosedPromiseResolve(reader);
		        if (IsReadableStreamDefaultReader(reader)) {
		            reader._readRequests.forEach(readRequest => {
		                readRequest._closeSteps();
		            });
		            reader._readRequests = new SimpleQueue();
		        }
		    }
		    function ReadableStreamError(stream, e) {
		        stream._state = 'errored';
		        stream._storedError = e;
		        const reader = stream._reader;
		        if (reader === undefined) {
		            return;
		        }
		        defaultReaderClosedPromiseReject(reader, e);
		        if (IsReadableStreamDefaultReader(reader)) {
		            reader._readRequests.forEach(readRequest => {
		                readRequest._errorSteps(e);
		            });
		            reader._readRequests = new SimpleQueue();
		        }
		        else {
		            reader._readIntoRequests.forEach(readIntoRequest => {
		                readIntoRequest._errorSteps(e);
		            });
		            reader._readIntoRequests = new SimpleQueue();
		        }
		    }
		    // Helper functions for the ReadableStream.
		    function streamBrandCheckException$1(name) {
		        return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
		    }

		    function convertQueuingStrategyInit(init, context) {
		        assertDictionary(init, context);
		        const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
		        assertRequiredField(highWaterMark, 'highWaterMark', 'QueuingStrategyInit');
		        return {
		            highWaterMark: convertUnrestrictedDouble(highWaterMark)
		        };
		    }

		    // The size function must not have a prototype property nor be a constructor
		    const byteLengthSizeFunction = (chunk) => {
		        return chunk.byteLength;
		    };
		    try {
		        Object.defineProperty(byteLengthSizeFunction, 'name', {
		            value: 'size',
		            configurable: true
		        });
		    }
		    catch (_a) {
		        // This property is non-configurable in older browsers, so ignore if this throws.
		        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#browser_compatibility
		    }
		    /**
		     * A queuing strategy that counts the number of bytes in each chunk.
		     *
		     * @public
		     */
		    class ByteLengthQueuingStrategy {
		        constructor(options) {
		            assertRequiredArgument(options, 1, 'ByteLengthQueuingStrategy');
		            options = convertQueuingStrategyInit(options, 'First parameter');
		            this._byteLengthQueuingStrategyHighWaterMark = options.highWaterMark;
		        }
		        /**
		         * Returns the high water mark provided to the constructor.
		         */
		        get highWaterMark() {
		            if (!IsByteLengthQueuingStrategy(this)) {
		                throw byteLengthBrandCheckException('highWaterMark');
		            }
		            return this._byteLengthQueuingStrategyHighWaterMark;
		        }
		        /**
		         * Measures the size of `chunk` by returning the value of its `byteLength` property.
		         */
		        get size() {
		            if (!IsByteLengthQueuingStrategy(this)) {
		                throw byteLengthBrandCheckException('size');
		            }
		            return byteLengthSizeFunction;
		        }
		    }
		    Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
		        highWaterMark: { enumerable: true },
		        size: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
		            value: 'ByteLengthQueuingStrategy',
		            configurable: true
		        });
		    }
		    // Helper functions for the ByteLengthQueuingStrategy.
		    function byteLengthBrandCheckException(name) {
		        return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
		    }
		    function IsByteLengthQueuingStrategy(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_byteLengthQueuingStrategyHighWaterMark')) {
		            return false;
		        }
		        return x instanceof ByteLengthQueuingStrategy;
		    }

		    // The size function must not have a prototype property nor be a constructor
		    const countSizeFunction = () => {
		        return 1;
		    };
		    try {
		        Object.defineProperty(countSizeFunction, 'name', {
		            value: 'size',
		            configurable: true
		        });
		    }
		    catch (_a) {
		        // This property is non-configurable in older browsers, so ignore if this throws.
		        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#browser_compatibility
		    }
		    /**
		     * A queuing strategy that counts the number of chunks.
		     *
		     * @public
		     */
		    class CountQueuingStrategy {
		        constructor(options) {
		            assertRequiredArgument(options, 1, 'CountQueuingStrategy');
		            options = convertQueuingStrategyInit(options, 'First parameter');
		            this._countQueuingStrategyHighWaterMark = options.highWaterMark;
		        }
		        /**
		         * Returns the high water mark provided to the constructor.
		         */
		        get highWaterMark() {
		            if (!IsCountQueuingStrategy(this)) {
		                throw countBrandCheckException('highWaterMark');
		            }
		            return this._countQueuingStrategyHighWaterMark;
		        }
		        /**
		         * Measures the size of `chunk` by always returning 1.
		         * This ensures that the total queue size is a count of the number of chunks in the queue.
		         */
		        get size() {
		            if (!IsCountQueuingStrategy(this)) {
		                throw countBrandCheckException('size');
		            }
		            return countSizeFunction;
		        }
		    }
		    Object.defineProperties(CountQueuingStrategy.prototype, {
		        highWaterMark: { enumerable: true },
		        size: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
		            value: 'CountQueuingStrategy',
		            configurable: true
		        });
		    }
		    // Helper functions for the CountQueuingStrategy.
		    function countBrandCheckException(name) {
		        return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
		    }
		    function IsCountQueuingStrategy(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_countQueuingStrategyHighWaterMark')) {
		            return false;
		        }
		        return x instanceof CountQueuingStrategy;
		    }

		    function convertTransformer(original, context) {
		        assertDictionary(original, context);
		        const flush = original === null || original === void 0 ? void 0 : original.flush;
		        const readableType = original === null || original === void 0 ? void 0 : original.readableType;
		        const start = original === null || original === void 0 ? void 0 : original.start;
		        const transform = original === null || original === void 0 ? void 0 : original.transform;
		        const writableType = original === null || original === void 0 ? void 0 : original.writableType;
		        return {
		            flush: flush === undefined ?
		                undefined :
		                convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
		            readableType,
		            start: start === undefined ?
		                undefined :
		                convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
		            transform: transform === undefined ?
		                undefined :
		                convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
		            writableType
		        };
		    }
		    function convertTransformerFlushCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (controller) => promiseCall(fn, original, [controller]);
		    }
		    function convertTransformerStartCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (controller) => reflectCall(fn, original, [controller]);
		    }
		    function convertTransformerTransformCallback(fn, original, context) {
		        assertFunction(fn, context);
		        return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
		    }

		    // Class TransformStream
		    /**
		     * A transform stream consists of a pair of streams: a {@link WritableStream | writable stream},
		     * known as its writable side, and a {@link ReadableStream | readable stream}, known as its readable side.
		     * In a manner specific to the transform stream in question, writes to the writable side result in new data being
		     * made available for reading from the readable side.
		     *
		     * @public
		     */
		    class TransformStream {
		        constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
		            if (rawTransformer === undefined) {
		                rawTransformer = null;
		            }
		            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, 'Second parameter');
		            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, 'Third parameter');
		            const transformer = convertTransformer(rawTransformer, 'First parameter');
		            if (transformer.readableType !== undefined) {
		                throw new RangeError('Invalid readableType specified');
		            }
		            if (transformer.writableType !== undefined) {
		                throw new RangeError('Invalid writableType specified');
		            }
		            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
		            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
		            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
		            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
		            let startPromise_resolve;
		            const startPromise = newPromise(resolve => {
		                startPromise_resolve = resolve;
		            });
		            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
		            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
		            if (transformer.start !== undefined) {
		                startPromise_resolve(transformer.start(this._transformStreamController));
		            }
		            else {
		                startPromise_resolve(undefined);
		            }
		        }
		        /**
		         * The readable side of the transform stream.
		         */
		        get readable() {
		            if (!IsTransformStream(this)) {
		                throw streamBrandCheckException('readable');
		            }
		            return this._readable;
		        }
		        /**
		         * The writable side of the transform stream.
		         */
		        get writable() {
		            if (!IsTransformStream(this)) {
		                throw streamBrandCheckException('writable');
		            }
		            return this._writable;
		        }
		    }
		    Object.defineProperties(TransformStream.prototype, {
		        readable: { enumerable: true },
		        writable: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
		            value: 'TransformStream',
		            configurable: true
		        });
		    }
		    function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
		        function startAlgorithm() {
		            return startPromise;
		        }
		        function writeAlgorithm(chunk) {
		            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
		        }
		        function abortAlgorithm(reason) {
		            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
		        }
		        function closeAlgorithm() {
		            return TransformStreamDefaultSinkCloseAlgorithm(stream);
		        }
		        stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
		        function pullAlgorithm() {
		            return TransformStreamDefaultSourcePullAlgorithm(stream);
		        }
		        function cancelAlgorithm(reason) {
		            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
		            return promiseResolvedWith(undefined);
		        }
		        stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
		        // The [[backpressure]] slot is set to undefined so that it can be initialised by TransformStreamSetBackpressure.
		        stream._backpressure = undefined;
		        stream._backpressureChangePromise = undefined;
		        stream._backpressureChangePromise_resolve = undefined;
		        TransformStreamSetBackpressure(stream, true);
		        stream._transformStreamController = undefined;
		    }
		    function IsTransformStream(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_transformStreamController')) {
		            return false;
		        }
		        return x instanceof TransformStream;
		    }
		    // This is a no-op if both sides are already errored.
		    function TransformStreamError(stream, e) {
		        ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
		        TransformStreamErrorWritableAndUnblockWrite(stream, e);
		    }
		    function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
		        TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
		        WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
		        if (stream._backpressure) {
		            // Pretend that pull() was called to permit any pending write() calls to complete. TransformStreamSetBackpressure()
		            // cannot be called from enqueue() or pull() once the ReadableStream is errored, so this will will be the final time
		            // _backpressure is set.
		            TransformStreamSetBackpressure(stream, false);
		        }
		    }
		    function TransformStreamSetBackpressure(stream, backpressure) {
		        // Passes also when called during construction.
		        if (stream._backpressureChangePromise !== undefined) {
		            stream._backpressureChangePromise_resolve();
		        }
		        stream._backpressureChangePromise = newPromise(resolve => {
		            stream._backpressureChangePromise_resolve = resolve;
		        });
		        stream._backpressure = backpressure;
		    }
		    // Class TransformStreamDefaultController
		    /**
		     * Allows control of the {@link ReadableStream} and {@link WritableStream} of the associated {@link TransformStream}.
		     *
		     * @public
		     */
		    class TransformStreamDefaultController {
		        constructor() {
		            throw new TypeError('Illegal constructor');
		        }
		        /**
		         * Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
		         */
		        get desiredSize() {
		            if (!IsTransformStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException('desiredSize');
		            }
		            const readableController = this._controlledTransformStream._readable._readableStreamController;
		            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
		        }
		        enqueue(chunk = undefined) {
		            if (!IsTransformStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException('enqueue');
		            }
		            TransformStreamDefaultControllerEnqueue(this, chunk);
		        }
		        /**
		         * Errors both the readable side and the writable side of the controlled transform stream, making all future
		         * interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
		         */
		        error(reason = undefined) {
		            if (!IsTransformStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException('error');
		            }
		            TransformStreamDefaultControllerError(this, reason);
		        }
		        /**
		         * Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
		         * transformer only needs to consume a portion of the chunks written to the writable side.
		         */
		        terminate() {
		            if (!IsTransformStreamDefaultController(this)) {
		                throw defaultControllerBrandCheckException('terminate');
		            }
		            TransformStreamDefaultControllerTerminate(this);
		        }
		    }
		    Object.defineProperties(TransformStreamDefaultController.prototype, {
		        enqueue: { enumerable: true },
		        error: { enumerable: true },
		        terminate: { enumerable: true },
		        desiredSize: { enumerable: true }
		    });
		    if (typeof SymbolPolyfill.toStringTag === 'symbol') {
		        Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
		            value: 'TransformStreamDefaultController',
		            configurable: true
		        });
		    }
		    // Transform Stream Default Controller Abstract Operations
		    function IsTransformStreamDefaultController(x) {
		        if (!typeIsObject(x)) {
		            return false;
		        }
		        if (!Object.prototype.hasOwnProperty.call(x, '_controlledTransformStream')) {
		            return false;
		        }
		        return x instanceof TransformStreamDefaultController;
		    }
		    function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
		        controller._controlledTransformStream = stream;
		        stream._transformStreamController = controller;
		        controller._transformAlgorithm = transformAlgorithm;
		        controller._flushAlgorithm = flushAlgorithm;
		    }
		    function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
		        const controller = Object.create(TransformStreamDefaultController.prototype);
		        let transformAlgorithm = (chunk) => {
		            try {
		                TransformStreamDefaultControllerEnqueue(controller, chunk);
		                return promiseResolvedWith(undefined);
		            }
		            catch (transformResultE) {
		                return promiseRejectedWith(transformResultE);
		            }
		        };
		        let flushAlgorithm = () => promiseResolvedWith(undefined);
		        if (transformer.transform !== undefined) {
		            transformAlgorithm = chunk => transformer.transform(chunk, controller);
		        }
		        if (transformer.flush !== undefined) {
		            flushAlgorithm = () => transformer.flush(controller);
		        }
		        SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
		    }
		    function TransformStreamDefaultControllerClearAlgorithms(controller) {
		        controller._transformAlgorithm = undefined;
		        controller._flushAlgorithm = undefined;
		    }
		    function TransformStreamDefaultControllerEnqueue(controller, chunk) {
		        const stream = controller._controlledTransformStream;
		        const readableController = stream._readable._readableStreamController;
		        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
		            throw new TypeError('Readable side is not in a state that permits enqueue');
		        }
		        // We throttle transform invocations based on the backpressure of the ReadableStream, but we still
		        // accept TransformStreamDefaultControllerEnqueue() calls.
		        try {
		            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
		        }
		        catch (e) {
		            // This happens when readableStrategy.size() throws.
		            TransformStreamErrorWritableAndUnblockWrite(stream, e);
		            throw stream._readable._storedError;
		        }
		        const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
		        if (backpressure !== stream._backpressure) {
		            TransformStreamSetBackpressure(stream, true);
		        }
		    }
		    function TransformStreamDefaultControllerError(controller, e) {
		        TransformStreamError(controller._controlledTransformStream, e);
		    }
		    function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
		        const transformPromise = controller._transformAlgorithm(chunk);
		        return transformPromiseWith(transformPromise, undefined, r => {
		            TransformStreamError(controller._controlledTransformStream, r);
		            throw r;
		        });
		    }
		    function TransformStreamDefaultControllerTerminate(controller) {
		        const stream = controller._controlledTransformStream;
		        const readableController = stream._readable._readableStreamController;
		        ReadableStreamDefaultControllerClose(readableController);
		        const error = new TypeError('TransformStream terminated');
		        TransformStreamErrorWritableAndUnblockWrite(stream, error);
		    }
		    // TransformStreamDefaultSink Algorithms
		    function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
		        const controller = stream._transformStreamController;
		        if (stream._backpressure) {
		            const backpressureChangePromise = stream._backpressureChangePromise;
		            return transformPromiseWith(backpressureChangePromise, () => {
		                const writable = stream._writable;
		                const state = writable._state;
		                if (state === 'erroring') {
		                    throw writable._storedError;
		                }
		                return TransformStreamDefaultControllerPerformTransform(controller, chunk);
		            });
		        }
		        return TransformStreamDefaultControllerPerformTransform(controller, chunk);
		    }
		    function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
		        // abort() is not called synchronously, so it is possible for abort() to be called when the stream is already
		        // errored.
		        TransformStreamError(stream, reason);
		        return promiseResolvedWith(undefined);
		    }
		    function TransformStreamDefaultSinkCloseAlgorithm(stream) {
		        // stream._readable cannot change after construction, so caching it across a call to user code is safe.
		        const readable = stream._readable;
		        const controller = stream._transformStreamController;
		        const flushPromise = controller._flushAlgorithm();
		        TransformStreamDefaultControllerClearAlgorithms(controller);
		        // Return a promise that is fulfilled with undefined on success.
		        return transformPromiseWith(flushPromise, () => {
		            if (readable._state === 'errored') {
		                throw readable._storedError;
		            }
		            ReadableStreamDefaultControllerClose(readable._readableStreamController);
		        }, r => {
		            TransformStreamError(stream, r);
		            throw readable._storedError;
		        });
		    }
		    // TransformStreamDefaultSource Algorithms
		    function TransformStreamDefaultSourcePullAlgorithm(stream) {
		        // Invariant. Enforced by the promises returned by start() and pull().
		        TransformStreamSetBackpressure(stream, false);
		        // Prevent the next pull() call until there is backpressure.
		        return stream._backpressureChangePromise;
		    }
		    // Helper functions for the TransformStreamDefaultController.
		    function defaultControllerBrandCheckException(name) {
		        return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
		    }
		    // Helper functions for the TransformStream.
		    function streamBrandCheckException(name) {
		        return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
		    }

		    exports.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
		    exports.CountQueuingStrategy = CountQueuingStrategy;
		    exports.ReadableByteStreamController = ReadableByteStreamController;
		    exports.ReadableStream = ReadableStream;
		    exports.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
		    exports.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
		    exports.ReadableStreamDefaultController = ReadableStreamDefaultController;
		    exports.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
		    exports.TransformStream = TransformStream;
		    exports.TransformStreamDefaultController = TransformStreamDefaultController;
		    exports.WritableStream = WritableStream;
		    exports.WritableStreamDefaultController = WritableStreamDefaultController;
		    exports.WritableStreamDefaultWriter = WritableStreamDefaultWriter;

		    Object.defineProperty(exports, '__esModule', { value: true });

		})));
		
} (ponyfill_es2018, ponyfill_es2018.exports));
	return ponyfill_es2018.exports;
}

/* c8 ignore start */

// 64 KiB (same size chrome slice theirs blob into Uint8array's)
const POOL_SIZE$1 = 65536;

if (!globalThis.ReadableStream) {
  // `node:stream/web` got introduced in v16.5.0 as experimental
  // and it's preferred over the polyfilled version. So we also
  // suppress the warning that gets emitted by NodeJS for using it.
  try {
    const process = require('node:process');
    const { emitWarning } = process;
    try {
      process.emitWarning = () => {};
      Object.assign(globalThis, require('node:stream/web'));
      process.emitWarning = emitWarning;
    } catch (error) {
      process.emitWarning = emitWarning;
      throw error
    }
  } catch (error) {
    // fallback to polyfill implementation
    Object.assign(globalThis, requirePonyfill_es2018());
  }
}

try {
  // Don't use node: prefix for this, require+node: is not supported until node v14.14
  // Only `import()` can use prefix in 12.20 and later
  const { Blob } = require('buffer');
  if (Blob && !Blob.prototype.stream) {
    Blob.prototype.stream = function name (params) {
      let position = 0;
      const blob = this;

      return new ReadableStream({
        type: 'bytes',
        async pull (ctrl) {
          const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
          const buffer = await chunk.arrayBuffer();
          position += buffer.byteLength;
          ctrl.enqueue(new Uint8Array(buffer));

          if (position === blob.size) {
            ctrl.close();
          }
        }
      })
    };
  }
} catch (error) {}

/*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

// 64 KiB (same size chrome slice theirs blob into Uint8array's)
const POOL_SIZE = 65536;

/** @param {(Blob | Uint8Array)[]} parts */
async function * toIterator (parts, clone = true) {
  for (const part of parts) {
    if ('stream' in part) {
      yield * (/** @type {AsyncIterableIterator<Uint8Array>} */ (part.stream()));
    } else if (ArrayBuffer.isView(part)) {
      if (clone) {
        let position = part.byteOffset;
        const end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    /* c8 ignore next 10 */
    } else {
      // For blobs that have arrayBuffer but no stream method (nodes buffer.Blob)
      let position = 0, b = (/** @type {Blob} */ (part));
      while (position !== b.size) {
        const chunk = b.slice(position, Math.min(b.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}

const _Blob = class Blob {
  /** @type {Array.<(Blob|Uint8Array)>} */
  #parts = []
  #type = ''
  #size = 0
  #endings = 'transparent'

  /**
   * The Blob() constructor returns a new Blob object. The content
   * of the blob consists of the concatenation of the values given
   * in the parameter array.
   *
   * @param {*} blobParts
   * @param {{ type?: string, endings?: string }} [options]
   */
  constructor (blobParts = [], options = {}) {
    if (typeof blobParts !== 'object' || blobParts === null) {
      throw new TypeError('Failed to construct \'Blob\': The provided value cannot be converted to a sequence.')
    }

    if (typeof blobParts[Symbol.iterator] !== 'function') {
      throw new TypeError('Failed to construct \'Blob\': The object must have a callable @@iterator property.')
    }

    if (typeof options !== 'object' && typeof options !== 'function') {
      throw new TypeError('Failed to construct \'Blob\': parameter 2 cannot convert to dictionary.')
    }

    if (options === null) options = {};

    const encoder = new TextEncoder();
    for (const element of blobParts) {
      let part;
      if (ArrayBuffer.isView(element)) {
        part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
      } else if (element instanceof ArrayBuffer) {
        part = new Uint8Array(element.slice(0));
      } else if (element instanceof Blob) {
        part = element;
      } else {
        part = encoder.encode(`${element}`);
      }

      const size = ArrayBuffer.isView(part) ? part.byteLength : part.size;
      // Avoid pushing empty parts into the array to better GC them
      if (size) {
        this.#size += size;
        this.#parts.push(part);
      }
    }

    this.#endings = `${options.endings === undefined ? 'transparent' : options.endings}`;
    const type = options.type === undefined ? '' : String(options.type);
    this.#type = /^[\x20-\x7E]*$/.test(type) ? type : '';
  }

  /**
   * The Blob interface's size property returns the
   * size of the Blob in bytes.
   */
  get size () {
    return this.#size
  }

  /**
   * The type property of a Blob object returns the MIME type of the file.
   */
  get type () {
    return this.#type
  }

  /**
   * The text() method in the Blob interface returns a Promise
   * that resolves with a string containing the contents of
   * the blob, interpreted as UTF-8.
   *
   * @return {Promise<string>}
   */
  async text () {
    // More optimized than using this.arrayBuffer()
    // that requires twice as much ram
    const decoder = new TextDecoder();
    let str = '';
    for await (const part of toIterator(this.#parts, false)) {
      str += decoder.decode(part, { stream: true });
    }
    // Remaining
    str += decoder.decode();
    return str
  }

  /**
   * The arrayBuffer() method in the Blob interface returns a
   * Promise that resolves with the contents of the blob as
   * binary data contained in an ArrayBuffer.
   *
   * @return {Promise<ArrayBuffer>}
   */
  async arrayBuffer () {
    // Easier way... Just a unnecessary overhead
    // const view = new Uint8Array(this.size);
    // await this.stream().getReader({mode: 'byob'}).read(view);
    // return view.buffer;

    const data = new Uint8Array(this.size);
    let offset = 0;
    for await (const chunk of toIterator(this.#parts, false)) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    return data.buffer
  }

  stream () {
    const it = toIterator(this.#parts, true);

    return new globalThis.ReadableStream({
      // @ts-ignore
      type: 'bytes',
      async pull (ctrl) {
        const chunk = await it.next();
        chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
      },

      async cancel () {
        await it.return();
      }
    })
  }

  /**
   * The Blob interface's slice() method creates and returns a
   * new Blob object which contains data from a subset of the
   * blob on which it's called.
   *
   * @param {number} [start]
   * @param {number} [end]
   * @param {string} [type]
   */
  slice (start = 0, end = this.size, type = '') {
    const { size } = this;

    let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
    let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);

    const span = Math.max(relativeEnd - relativeStart, 0);
    const parts = this.#parts;
    const blobParts = [];
    let added = 0;

    for (const part of parts) {
      // don't add the overflow to new blobParts
      if (added >= span) {
        break
      }

      const size = ArrayBuffer.isView(part) ? part.byteLength : part.size;
      if (relativeStart && size <= relativeStart) {
        // Skip the beginning and change the relative
        // start & end position as we skip the unwanted parts
        relativeStart -= size;
        relativeEnd -= size;
      } else {
        let chunk;
        if (ArrayBuffer.isView(part)) {
          chunk = part.subarray(relativeStart, Math.min(size, relativeEnd));
          added += chunk.byteLength;
        } else {
          chunk = part.slice(relativeStart, Math.min(size, relativeEnd));
          added += chunk.size;
        }
        relativeEnd -= size;
        blobParts.push(chunk);
        relativeStart = 0; // All next sequential parts should start at 0
      }
    }

    const blob = new Blob([], { type: String(type).toLowerCase() });
    blob.#size = span;
    blob.#parts = blobParts;

    return blob
  }

  get [Symbol.toStringTag] () {
    return 'Blob'
  }

  static [Symbol.hasInstance] (object) {
    return (
      object &&
      typeof object === 'object' &&
      typeof object.constructor === 'function' &&
      (
        typeof object.stream === 'function' ||
        typeof object.arrayBuffer === 'function'
      ) &&
      /^(Blob|File)$/.test(object[Symbol.toStringTag])
    )
  }
};

Object.defineProperties(_Blob.prototype, {
  size: { enumerable: true },
  type: { enumerable: true },
  slice: { enumerable: true }
});

/** @type {typeof globalThis.Blob} */
const Blob = _Blob;

const _File = class File extends Blob {
  #lastModified = 0
  #name = ''

  /**
   * @param {*[]} fileBits
   * @param {string} fileName
   * @param {{lastModified?: number, type?: string}} options
   */// @ts-ignore
  constructor (fileBits, fileName, options = {}) {
    if (arguments.length < 2) {
      throw new TypeError(`Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`)
    }
    super(fileBits, options);

    if (options === null) options = {};

    // Simulate WebIDL type casting for NaN value in lastModified option.
    const lastModified = options.lastModified === undefined ? Date.now() : Number(options.lastModified);
    if (!Number.isNaN(lastModified)) {
      this.#lastModified = lastModified;
    }

    this.#name = String(fileName);
  }

  get name () {
    return this.#name
  }

  get lastModified () {
    return this.#lastModified
  }

  get [Symbol.toStringTag] () {
    return 'File'
  }

  static [Symbol.hasInstance] (object) {
    return !!object && object instanceof Blob &&
      /^(File)$/.test(object[Symbol.toStringTag])
  }
};

/** @type {typeof globalThis.File} */// @ts-ignore
const File = _File;

/*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

var {toStringTag:t,iterator:i,hasInstance:h}=Symbol,
r=Math.random,
m='append,set,get,getAll,delete,keys,values,entries,forEach,constructor'.split(','),
f$1=(a,b,c)=>(a+='',/^(Blob|File)$/.test(b && b[t])?[(c=c!==void 0?c+'':b[t]=='File'?b.name:'blob',a),b.name!==c||b[t]=='blob'?new File([b],c,b):b]:[a,b+'']),
e=(c,f)=>(f?c:c.replace(/\r?\n|\r/g,'\r\n')).replace(/\n/g,'%0A').replace(/\r/g,'%0D').replace(/"/g,'%22'),
x=(n, a, e)=>{if(a.length<e){throw new TypeError(`Failed to execute '${n}' on 'FormData': ${e} arguments required, but only ${a.length} present.`)}};

/** @type {typeof globalThis.FormData} */
const FormData = class FormData {
#d=[];
constructor(...a){if(a.length)throw new TypeError(`Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.`)}
get [t]() {return 'FormData'}
[i](){return this.entries()}
static [h](o) {return o&&typeof o==='object'&&o[t]==='FormData'&&!m.some(m=>typeof o[m]!='function')}
append(...a){x('append',arguments,2);this.#d.push(f$1(...a));}
delete(a){x('delete',arguments,1);a+='';this.#d=this.#d.filter(([b])=>b!==a);}
get(a){x('get',arguments,1);a+='';for(var b=this.#d,l=b.length,c=0;c<l;c++)if(b[c][0]===a)return b[c][1];return null}
getAll(a,b){x('getAll',arguments,1);b=[];a+='';this.#d.forEach(c=>c[0]===a&&b.push(c[1]));return b}
has(a){x('has',arguments,1);a+='';return this.#d.some(b=>b[0]===a)}
forEach(a,b){x('forEach',arguments,1);for(var [c,d]of this)a.call(b,d,c,this);}
set(...a){x('set',arguments,2);var b=[],c=!0;a=f$1(...a);this.#d.forEach(d=>{d[0]===a[0]?c&&(c=!b.push(a)):b.push(d);});c&&b.push(a);this.#d=b;}
*entries(){yield*this.#d;}
*keys(){for(var[a]of this)yield a;}
*values(){for(var[,a]of this)yield a;}};

/** @param {FormData} F */
function formDataToBlob (F,B=Blob){
var b=`${r()}${r()}`.replace(/\./g, '').slice(-28).padStart(32, '-'),c=[],p=`--${b}\r\nContent-Disposition: form-data; name="`;
F.forEach((v,n)=>typeof v=='string'
?c.push(p+e(n)+`"\r\n\r\n${v.replace(/\r(?!\n)|(?<!\r)\n/g, '\r\n')}\r\n`)
:c.push(p+e(n)+`"; filename="${e(v.name, 1)}"\r\nContent-Type: ${v.type||"application/octet-stream"}\r\n\r\n`, v, '\r\n'));
c.push(`--${b}--`);
return new B(c,{type:"multipart/form-data; boundary="+b})}

class FetchBaseError extends Error {
	constructor(message, type) {
		super(message);
		// Hide custom error implementation details from end-users
		Error.captureStackTrace(this, this.constructor);

		this.type = type;
	}

	get name() {
		return this.constructor.name;
	}

	get [Symbol.toStringTag]() {
		return this.constructor.name;
	}
}

/**
 * @typedef {{ address?: string, code: string, dest?: string, errno: number, info?: object, message: string, path?: string, port?: number, syscall: string}} SystemError
*/

/**
 * FetchError interface for operational errors
 */
class FetchError extends FetchBaseError {
	/**
	 * @param  {string} message -      Error message for human
	 * @param  {string} [type] -        Error type for machine
	 * @param  {SystemError} [systemError] - For Node.js system error
	 */
	constructor(message, type, systemError) {
		super(message, type);
		// When err.type is `system`, err.erroredSysCall contains system error and err.code contains system error code
		if (systemError) {
			// eslint-disable-next-line no-multi-assign
			this.code = this.errno = systemError.code;
			this.erroredSysCall = systemError.syscall;
		}
	}
}

/**
 * Is.js
 *
 * Object type checks.
 */

const NAME = Symbol.toStringTag;

/**
 * Check if `obj` is a URLSearchParams object
 * ref: https://github.com/node-fetch/node-fetch/issues/296#issuecomment-307598143
 * @param {*} object - Object to check for
 * @return {boolean}
 */
const isURLSearchParameters = object => {
	return (
		typeof object === 'object' &&
		typeof object.append === 'function' &&
		typeof object.delete === 'function' &&
		typeof object.get === 'function' &&
		typeof object.getAll === 'function' &&
		typeof object.has === 'function' &&
		typeof object.set === 'function' &&
		typeof object.sort === 'function' &&
		object[NAME] === 'URLSearchParams'
	);
};

/**
 * Check if `object` is a W3C `Blob` object (which `File` inherits from)
 * @param {*} object - Object to check for
 * @return {boolean}
 */
const isBlob = object => {
	return (
		object &&
		typeof object === 'object' &&
		typeof object.arrayBuffer === 'function' &&
		typeof object.type === 'string' &&
		typeof object.stream === 'function' &&
		typeof object.constructor === 'function' &&
		/^(Blob|File)$/.test(object[NAME])
	);
};

/**
 * Check if `obj` is an instance of AbortSignal.
 * @param {*} object - Object to check for
 * @return {boolean}
 */
const isAbortSignal = object => {
	return (
		typeof object === 'object' && (
			object[NAME] === 'AbortSignal' ||
			object[NAME] === 'EventTarget'
		)
	);
};

/**
 * isDomainOrSubdomain reports whether sub is a subdomain (or exact match) of
 * the parent domain.
 *
 * Both domains must already be in canonical form.
 * @param {string|URL} original
 * @param {string|URL} destination
 */
const isDomainOrSubdomain = (destination, original) => {
	const orig = new URL(original).hostname;
	const dest = new URL(destination).hostname;

	return orig === dest || orig.endsWith(`.${dest}`);
};

const pipeline = node_util.promisify(Stream__default["default"].pipeline);
const INTERNALS$2 = Symbol('Body internals');

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Body {
	constructor(body, {
		size = 0
	} = {}) {
		let boundary = null;

		if (body === null) {
			// Body is undefined or null
			body = null;
		} else if (isURLSearchParameters(body)) {
			// Body is a URLSearchParams
			body = node_buffer.Buffer.from(body.toString());
		} else if (isBlob(body)) ; else if (node_buffer.Buffer.isBuffer(body)) ; else if (node_util.types.isAnyArrayBuffer(body)) {
			// Body is ArrayBuffer
			body = node_buffer.Buffer.from(body);
		} else if (ArrayBuffer.isView(body)) {
			// Body is ArrayBufferView
			body = node_buffer.Buffer.from(body.buffer, body.byteOffset, body.byteLength);
		} else if (body instanceof Stream__default["default"]) ; else if (body instanceof FormData) {
			// Body is FormData
			body = formDataToBlob(body);
			boundary = body.type.split('=')[1];
		} else {
			// None of the above
			// coerce to string then buffer
			body = node_buffer.Buffer.from(String(body));
		}

		let stream = body;

		if (node_buffer.Buffer.isBuffer(body)) {
			stream = Stream__default["default"].Readable.from(body);
		} else if (isBlob(body)) {
			stream = Stream__default["default"].Readable.from(body.stream());
		}

		this[INTERNALS$2] = {
			body,
			stream,
			boundary,
			disturbed: false,
			error: null
		};
		this.size = size;

		if (body instanceof Stream__default["default"]) {
			body.on('error', error_ => {
				const error = error_ instanceof FetchBaseError ?
					error_ :
					new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, 'system', error_);
				this[INTERNALS$2].error = error;
			});
		}
	}

	get body() {
		return this[INTERNALS$2].stream;
	}

	get bodyUsed() {
		return this[INTERNALS$2].disturbed;
	}

	/**
	 * Decode response as ArrayBuffer
	 *
	 * @return  Promise
	 */
	async arrayBuffer() {
		const {buffer, byteOffset, byteLength} = await consumeBody(this);
		return buffer.slice(byteOffset, byteOffset + byteLength);
	}

	async formData() {
		const ct = this.headers.get('content-type');

		if (ct.startsWith('application/x-www-form-urlencoded')) {
			const formData = new FormData();
			const parameters = new URLSearchParams(await this.text());

			for (const [name, value] of parameters) {
				formData.append(name, value);
			}

			return formData;
		}

		const {toFormData} = await Promise.resolve().then(function () { return multipartParser; });
		return toFormData(this.body, ct);
	}

	/**
	 * Return raw response as Blob
	 *
	 * @return Promise
	 */
	async blob() {
		const ct = (this.headers && this.headers.get('content-type')) || (this[INTERNALS$2].body && this[INTERNALS$2].body.type) || '';
		const buf = await this.arrayBuffer();

		return new Blob([buf], {
			type: ct
		});
	}

	/**
	 * Decode response as json
	 *
	 * @return  Promise
	 */
	async json() {
		const text = await this.text();
		return JSON.parse(text);
	}

	/**
	 * Decode response as text
	 *
	 * @return  Promise
	 */
	async text() {
		const buffer = await consumeBody(this);
		return new TextDecoder().decode(buffer);
	}

	/**
	 * Decode response as buffer (non-spec api)
	 *
	 * @return  Promise
	 */
	buffer() {
		return consumeBody(this);
	}
}

Body.prototype.buffer = node_util.deprecate(Body.prototype.buffer, 'Please use \'response.arrayBuffer()\' instead of \'response.buffer()\'', 'node-fetch#buffer');

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
	body: {enumerable: true},
	bodyUsed: {enumerable: true},
	arrayBuffer: {enumerable: true},
	blob: {enumerable: true},
	json: {enumerable: true},
	text: {enumerable: true},
	data: {get: node_util.deprecate(() => {},
		'data doesn\'t exist, use json(), text(), arrayBuffer(), or body instead',
		'https://github.com/node-fetch/node-fetch/issues/1000 (response)')}
});

/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return Promise
 */
async function consumeBody(data) {
	if (data[INTERNALS$2].disturbed) {
		throw new TypeError(`body used already for: ${data.url}`);
	}

	data[INTERNALS$2].disturbed = true;

	if (data[INTERNALS$2].error) {
		throw data[INTERNALS$2].error;
	}

	const {body} = data;

	// Body is null
	if (body === null) {
		return node_buffer.Buffer.alloc(0);
	}

	/* c8 ignore next 3 */
	if (!(body instanceof Stream__default["default"])) {
		return node_buffer.Buffer.alloc(0);
	}

	// Body is stream
	// get ready to actually consume the body
	const accum = [];
	let accumBytes = 0;

	try {
		for await (const chunk of body) {
			if (data.size > 0 && accumBytes + chunk.length > data.size) {
				const error = new FetchError(`content size at ${data.url} over limit: ${data.size}`, 'max-size');
				body.destroy(error);
				throw error;
			}

			accumBytes += chunk.length;
			accum.push(chunk);
		}
	} catch (error) {
		const error_ = error instanceof FetchBaseError ? error : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error.message}`, 'system', error);
		throw error_;
	}

	if (body.readableEnded === true || body._readableState.ended === true) {
		try {
			if (accum.every(c => typeof c === 'string')) {
				return node_buffer.Buffer.from(accum.join(''));
			}

			return node_buffer.Buffer.concat(accum, accumBytes);
		} catch (error) {
			throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error.message}`, 'system', error);
		}
	} else {
		throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
	}
}

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed   instance       Response or Request instance
 * @param   String  highWaterMark  highWaterMark for both PassThrough body streams
 * @return  Mixed
 */
const clone = (instance, highWaterMark) => {
	let p1;
	let p2;
	let {body} = instance[INTERNALS$2];

	// Don't allow cloning a used body
	if (instance.bodyUsed) {
		throw new Error('cannot clone body after it is used');
	}

	// Check that body is a stream and not form-data object
	// note: we can't clone the form-data object without having it as a dependency
	if ((body instanceof Stream__default["default"]) && (typeof body.getBoundary !== 'function')) {
		// Tee instance body
		p1 = new Stream.PassThrough({highWaterMark});
		p2 = new Stream.PassThrough({highWaterMark});
		body.pipe(p1);
		body.pipe(p2);
		// Set instance body to teed body and return the other teed body
		instance[INTERNALS$2].stream = p1;
		body = p2;
	}

	return body;
};

const getNonSpecFormDataBoundary = node_util.deprecate(
	body => body.getBoundary(),
	'form-data doesn\'t follow the spec and requires special treatment. Use alternative package',
	'https://github.com/node-fetch/node-fetch/issues/1167'
);

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param {any} body Any options.body input
 * @returns {string | null}
 */
const extractContentType = (body, request) => {
	// Body is null or undefined
	if (body === null) {
		return null;
	}

	// Body is string
	if (typeof body === 'string') {
		return 'text/plain;charset=UTF-8';
	}

	// Body is a URLSearchParams
	if (isURLSearchParameters(body)) {
		return 'application/x-www-form-urlencoded;charset=UTF-8';
	}

	// Body is blob
	if (isBlob(body)) {
		return body.type || null;
	}

	// Body is a Buffer (Buffer, ArrayBuffer or ArrayBufferView)
	if (node_buffer.Buffer.isBuffer(body) || node_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
		return null;
	}

	if (body instanceof FormData) {
		return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
	}

	// Detect form data input from form-data module
	if (body && typeof body.getBoundary === 'function') {
		return `multipart/form-data;boundary=${getNonSpecFormDataBoundary(body)}`;
	}

	// Body is stream - can't really do much about this
	if (body instanceof Stream__default["default"]) {
		return null;
	}

	// Body constructor defaults other things to string
	return 'text/plain;charset=UTF-8';
};

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param {any} obj.body Body object from the Body instance.
 * @returns {number | null}
 */
const getTotalBytes = request => {
	const {body} = request[INTERNALS$2];

	// Body is null or undefined
	if (body === null) {
		return 0;
	}

	// Body is Blob
	if (isBlob(body)) {
		return body.size;
	}

	// Body is Buffer
	if (node_buffer.Buffer.isBuffer(body)) {
		return body.length;
	}

	// Detect form data input from form-data module
	if (body && typeof body.getLengthSync === 'function') {
		return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
	}

	// Body is stream
	return null;
};

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param {Stream.Writable} dest The stream to write to.
 * @param obj.body Body object from the Body instance.
 * @returns {Promise<void>}
 */
const writeToStream = async (dest, {body}) => {
	if (body === null) {
		// Body is null
		dest.end();
	} else {
		// Body is stream
		await pipeline(body, dest);
	}
};

/**
 * Headers.js
 *
 * Headers class offers convenient helpers
 */

/* c8 ignore next 9 */
const validateHeaderName = typeof http__default["default"].validateHeaderName === 'function' ?
	http__default["default"].validateHeaderName :
	name => {
		if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
			const error = new TypeError(`Header name must be a valid HTTP token [${name}]`);
			Object.defineProperty(error, 'code', {value: 'ERR_INVALID_HTTP_TOKEN'});
			throw error;
		}
	};

/* c8 ignore next 9 */
const validateHeaderValue = typeof http__default["default"].validateHeaderValue === 'function' ?
	http__default["default"].validateHeaderValue :
	(name, value) => {
		if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
			const error = new TypeError(`Invalid character in header content ["${name}"]`);
			Object.defineProperty(error, 'code', {value: 'ERR_INVALID_CHAR'});
			throw error;
		}
	};

/**
 * @typedef {Headers | Record<string, string> | Iterable<readonly [string, string]> | Iterable<Iterable<string>>} HeadersInit
 */

/**
 * This Fetch API interface allows you to perform various actions on HTTP request and response headers.
 * These actions include retrieving, setting, adding to, and removing.
 * A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs.
 * You can add to this using methods like append() (see Examples.)
 * In all methods of this interface, header names are matched by case-insensitive byte sequence.
 *
 */
class Headers extends URLSearchParams {
	/**
	 * Headers class
	 *
	 * @constructor
	 * @param {HeadersInit} [init] - Response headers
	 */
	constructor(init) {
		// Validate and normalize init object in [name, value(s)][]
		/** @type {string[][]} */
		let result = [];
		if (init instanceof Headers) {
			const raw = init.raw();
			for (const [name, values] of Object.entries(raw)) {
				result.push(...values.map(value => [name, value]));
			}
		} else if (init == null) ; else if (typeof init === 'object' && !node_util.types.isBoxedPrimitive(init)) {
			const method = init[Symbol.iterator];
			// eslint-disable-next-line no-eq-null, eqeqeq
			if (method == null) {
				// Record<ByteString, ByteString>
				result.push(...Object.entries(init));
			} else {
				if (typeof method !== 'function') {
					throw new TypeError('Header pairs must be iterable');
				}

				// Sequence<sequence<ByteString>>
				// Note: per spec we have to first exhaust the lists then process them
				result = [...init]
					.map(pair => {
						if (
							typeof pair !== 'object' || node_util.types.isBoxedPrimitive(pair)
						) {
							throw new TypeError('Each header pair must be an iterable object');
						}

						return [...pair];
					}).map(pair => {
						if (pair.length !== 2) {
							throw new TypeError('Each header pair must be a name/value tuple');
						}

						return [...pair];
					});
			}
		} else {
			throw new TypeError('Failed to construct \'Headers\': The provided value is not of type \'(sequence<sequence<ByteString>> or record<ByteString, ByteString>)');
		}

		// Validate and lowercase
		result =
			result.length > 0 ?
				result.map(([name, value]) => {
					validateHeaderName(name);
					validateHeaderValue(name, String(value));
					return [String(name).toLowerCase(), String(value)];
				}) :
				undefined;

		super(result);

		// Returning a Proxy that will lowercase key names, validate parameters and sort keys
		// eslint-disable-next-line no-constructor-return
		return new Proxy(this, {
			get(target, p, receiver) {
				switch (p) {
					case 'append':
					case 'set':
						return (name, value) => {
							validateHeaderName(name);
							validateHeaderValue(name, String(value));
							return URLSearchParams.prototype[p].call(
								target,
								String(name).toLowerCase(),
								String(value)
							);
						};

					case 'delete':
					case 'has':
					case 'getAll':
						return name => {
							validateHeaderName(name);
							return URLSearchParams.prototype[p].call(
								target,
								String(name).toLowerCase()
							);
						};

					case 'keys':
						return () => {
							target.sort();
							return new Set(URLSearchParams.prototype.keys.call(target)).keys();
						};

					default:
						return Reflect.get(target, p, receiver);
				}
			}
		});
		/* c8 ignore next */
	}

	get [Symbol.toStringTag]() {
		return this.constructor.name;
	}

	toString() {
		return Object.prototype.toString.call(this);
	}

	get(name) {
		const values = this.getAll(name);
		if (values.length === 0) {
			return null;
		}

		let value = values.join(', ');
		if (/^content-encoding$/i.test(name)) {
			value = value.toLowerCase();
		}

		return value;
	}

	forEach(callback, thisArg = undefined) {
		for (const name of this.keys()) {
			Reflect.apply(callback, thisArg, [this.get(name), name, this]);
		}
	}

	* values() {
		for (const name of this.keys()) {
			yield this.get(name);
		}
	}

	/**
	 * @type {() => IterableIterator<[string, string]>}
	 */
	* entries() {
		for (const name of this.keys()) {
			yield [name, this.get(name)];
		}
	}

	[Symbol.iterator]() {
		return this.entries();
	}

	/**
	 * Node-fetch non-spec method
	 * returning all headers and their values as array
	 * @returns {Record<string, string[]>}
	 */
	raw() {
		return [...this.keys()].reduce((result, key) => {
			result[key] = this.getAll(key);
			return result;
		}, {});
	}

	/**
	 * For better console.log(headers) and also to convert Headers into Node.js Request compatible format
	 */
	[Symbol.for('nodejs.util.inspect.custom')]() {
		return [...this.keys()].reduce((result, key) => {
			const values = this.getAll(key);
			// Http.request() only supports string as Host header.
			// This hack makes specifying custom Host header possible.
			if (key === 'host') {
				result[key] = values[0];
			} else {
				result[key] = values.length > 1 ? values : values[0];
			}

			return result;
		}, {});
	}
}

/**
 * Re-shaping object for Web IDL tests
 * Only need to do it for overridden methods
 */
Object.defineProperties(
	Headers.prototype,
	['get', 'entries', 'forEach', 'values'].reduce((result, property) => {
		result[property] = {enumerable: true};
		return result;
	}, {})
);

/**
 * Create a Headers object from an http.IncomingMessage.rawHeaders, ignoring those that do
 * not conform to HTTP grammar productions.
 * @param {import('http').IncomingMessage['rawHeaders']} headers
 */
function fromRawHeaders(headers = []) {
	return new Headers(
		headers
			// Split into pairs
			.reduce((result, value, index, array) => {
				if (index % 2 === 0) {
					result.push(array.slice(index, index + 2));
				}

				return result;
			}, [])
			.filter(([name, value]) => {
				try {
					validateHeaderName(name);
					validateHeaderValue(name, String(value));
					return true;
				} catch {
					return false;
				}
			})

	);
}

const redirectStatus = new Set([301, 302, 303, 307, 308]);

/**
 * Redirect code matching
 *
 * @param {number} code - Status code
 * @return {boolean}
 */
const isRedirect = code => {
	return redirectStatus.has(code);
};

/**
 * Response.js
 *
 * Response class provides content decoding
 */

const INTERNALS$1 = Symbol('Response internals');

/**
 * Response class
 *
 * Ref: https://fetch.spec.whatwg.org/#response-class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Response extends Body {
	constructor(body = null, options = {}) {
		super(body, options);

		// eslint-disable-next-line no-eq-null, eqeqeq, no-negated-condition
		const status = options.status != null ? options.status : 200;

		const headers = new Headers(options.headers);

		if (body !== null && !headers.has('Content-Type')) {
			const contentType = extractContentType(body, this);
			if (contentType) {
				headers.append('Content-Type', contentType);
			}
		}

		this[INTERNALS$1] = {
			type: 'default',
			url: options.url,
			status,
			statusText: options.statusText || '',
			headers,
			counter: options.counter,
			highWaterMark: options.highWaterMark
		};
	}

	get type() {
		return this[INTERNALS$1].type;
	}

	get url() {
		return this[INTERNALS$1].url || '';
	}

	get status() {
		return this[INTERNALS$1].status;
	}

	/**
	 * Convenience property representing if the request ended normally
	 */
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}

	get redirected() {
		return this[INTERNALS$1].counter > 0;
	}

	get statusText() {
		return this[INTERNALS$1].statusText;
	}

	get headers() {
		return this[INTERNALS$1].headers;
	}

	get highWaterMark() {
		return this[INTERNALS$1].highWaterMark;
	}

	/**
	 * Clone this response
	 *
	 * @return  Response
	 */
	clone() {
		return new Response(clone(this, this.highWaterMark), {
			type: this.type,
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok,
			redirected: this.redirected,
			size: this.size,
			highWaterMark: this.highWaterMark
		});
	}

	/**
	 * @param {string} url    The URL that the new response is to originate from.
	 * @param {number} status An optional status code for the response (e.g., 302.)
	 * @returns {Response}    A Response object.
	 */
	static redirect(url, status = 302) {
		if (!isRedirect(status)) {
			throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
		}

		return new Response(null, {
			headers: {
				location: new URL(url).toString()
			},
			status
		});
	}

	static error() {
		const response = new Response(null, {status: 0, statusText: ''});
		response[INTERNALS$1].type = 'error';
		return response;
	}

	get [Symbol.toStringTag]() {
		return 'Response';
	}
}

Object.defineProperties(Response.prototype, {
	type: {enumerable: true},
	url: {enumerable: true},
	status: {enumerable: true},
	ok: {enumerable: true},
	redirected: {enumerable: true},
	statusText: {enumerable: true},
	headers: {enumerable: true},
	clone: {enumerable: true}
});

const getSearch = parsedURL => {
	if (parsedURL.search) {
		return parsedURL.search;
	}

	const lastOffset = parsedURL.href.length - 1;
	const hash = parsedURL.hash || (parsedURL.href[lastOffset] === '#' ? '#' : '');
	return parsedURL.href[lastOffset - hash.length] === '?' ? '?' : '';
};

/**
 * @external URL
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL|URL}
 */

/**
 * @module utils/referrer
 * @private
 */

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#strip-url|Referrer Policy §8.4. Strip url for use as a referrer}
 * @param {string} URL
 * @param {boolean} [originOnly=false]
 */
function stripURLForUseAsAReferrer(url, originOnly = false) {
	// 1. If url is null, return no referrer.
	if (url == null) { // eslint-disable-line no-eq-null, eqeqeq
		return 'no-referrer';
	}

	url = new URL(url);

	// 2. If url's scheme is a local scheme, then return no referrer.
	if (/^(about|blob|data):$/.test(url.protocol)) {
		return 'no-referrer';
	}

	// 3. Set url's username to the empty string.
	url.username = '';

	// 4. Set url's password to null.
	// Note: `null` appears to be a mistake as this actually results in the password being `"null"`.
	url.password = '';

	// 5. Set url's fragment to null.
	// Note: `null` appears to be a mistake as this actually results in the fragment being `"#null"`.
	url.hash = '';

	// 6. If the origin-only flag is true, then:
	if (originOnly) {
		// 6.1. Set url's path to null.
		// Note: `null` appears to be a mistake as this actually results in the path being `"/null"`.
		url.pathname = '';

		// 6.2. Set url's query to null.
		// Note: `null` appears to be a mistake as this actually results in the query being `"?null"`.
		url.search = '';
	}

	// 7. Return url.
	return url;
}

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#enumdef-referrerpolicy|enum ReferrerPolicy}
 */
const ReferrerPolicy = new Set([
	'',
	'no-referrer',
	'no-referrer-when-downgrade',
	'same-origin',
	'origin',
	'strict-origin',
	'origin-when-cross-origin',
	'strict-origin-when-cross-origin',
	'unsafe-url'
]);

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#default-referrer-policy|default referrer policy}
 */
const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#referrer-policies|Referrer Policy §3. Referrer Policies}
 * @param {string} referrerPolicy
 * @returns {string} referrerPolicy
 */
function validateReferrerPolicy(referrerPolicy) {
	if (!ReferrerPolicy.has(referrerPolicy)) {
		throw new TypeError(`Invalid referrerPolicy: ${referrerPolicy}`);
	}

	return referrerPolicy;
}

/**
 * @see {@link https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy|Referrer Policy §3.2. Is origin potentially trustworthy?}
 * @param {external:URL} url
 * @returns `true`: "Potentially Trustworthy", `false`: "Not Trustworthy"
 */
function isOriginPotentiallyTrustworthy(url) {
	// 1. If origin is an opaque origin, return "Not Trustworthy".
	// Not applicable

	// 2. Assert: origin is a tuple origin.
	// Not for implementations

	// 3. If origin's scheme is either "https" or "wss", return "Potentially Trustworthy".
	if (/^(http|ws)s:$/.test(url.protocol)) {
		return true;
	}

	// 4. If origin's host component matches one of the CIDR notations 127.0.0.0/8 or ::1/128 [RFC4632], return "Potentially Trustworthy".
	const hostIp = url.host.replace(/(^\[)|(]$)/g, '');
	const hostIPVersion = node_net.isIP(hostIp);

	if (hostIPVersion === 4 && /^127\./.test(hostIp)) {
		return true;
	}

	if (hostIPVersion === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(hostIp)) {
		return true;
	}

	// 5. If origin's host component is "localhost" or falls within ".localhost", and the user agent conforms to the name resolution rules in [let-localhost-be-localhost], return "Potentially Trustworthy".
	// We are returning FALSE here because we cannot ensure conformance to
	// let-localhost-be-loalhost (https://tools.ietf.org/html/draft-west-let-localhost-be-localhost)
	if (/^(.+\.)*localhost$/.test(url.host)) {
		return false;
	}

	// 6. If origin's scheme component is file, return "Potentially Trustworthy".
	if (url.protocol === 'file:') {
		return true;
	}

	// 7. If origin's scheme component is one which the user agent considers to be authenticated, return "Potentially Trustworthy".
	// Not supported

	// 8. If origin has been configured as a trustworthy origin, return "Potentially Trustworthy".
	// Not supported

	// 9. Return "Not Trustworthy".
	return false;
}

/**
 * @see {@link https://w3c.github.io/webappsec-secure-contexts/#is-url-trustworthy|Referrer Policy §3.3. Is url potentially trustworthy?}
 * @param {external:URL} url
 * @returns `true`: "Potentially Trustworthy", `false`: "Not Trustworthy"
 */
function isUrlPotentiallyTrustworthy(url) {
	// 1. If url is "about:blank" or "about:srcdoc", return "Potentially Trustworthy".
	if (/^about:(blank|srcdoc)$/.test(url)) {
		return true;
	}

	// 2. If url's scheme is "data", return "Potentially Trustworthy".
	if (url.protocol === 'data:') {
		return true;
	}

	// Note: The origin of blob: and filesystem: URLs is the origin of the context in which they were
	// created. Therefore, blobs created in a trustworthy origin will themselves be potentially
	// trustworthy.
	if (/^(blob|filesystem):$/.test(url.protocol)) {
		return true;
	}

	// 3. Return the result of executing §3.2 Is origin potentially trustworthy? on url's origin.
	return isOriginPotentiallyTrustworthy(url);
}

/**
 * Modifies the referrerURL to enforce any extra security policy considerations.
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}, step 7
 * @callback module:utils/referrer~referrerURLCallback
 * @param {external:URL} referrerURL
 * @returns {external:URL} modified referrerURL
 */

/**
 * Modifies the referrerOrigin to enforce any extra security policy considerations.
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}, step 7
 * @callback module:utils/referrer~referrerOriginCallback
 * @param {external:URL} referrerOrigin
 * @returns {external:URL} modified referrerOrigin
 */

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}
 * @param {Request} request
 * @param {object} o
 * @param {module:utils/referrer~referrerURLCallback} o.referrerURLCallback
 * @param {module:utils/referrer~referrerOriginCallback} o.referrerOriginCallback
 * @returns {external:URL} Request's referrer
 */
function determineRequestsReferrer(request, {referrerURLCallback, referrerOriginCallback} = {}) {
	// There are 2 notes in the specification about invalid pre-conditions.  We return null, here, for
	// these cases:
	// > Note: If request's referrer is "no-referrer", Fetch will not call into this algorithm.
	// > Note: If request's referrer policy is the empty string, Fetch will not call into this
	// > algorithm.
	if (request.referrer === 'no-referrer' || request.referrerPolicy === '') {
		return null;
	}

	// 1. Let policy be request's associated referrer policy.
	const policy = request.referrerPolicy;

	// 2. Let environment be request's client.
	// not applicable to node.js

	// 3. Switch on request's referrer:
	if (request.referrer === 'about:client') {
		return 'no-referrer';
	}

	// "a URL": Let referrerSource be request's referrer.
	const referrerSource = request.referrer;

	// 4. Let request's referrerURL be the result of stripping referrerSource for use as a referrer.
	let referrerURL = stripURLForUseAsAReferrer(referrerSource);

	// 5. Let referrerOrigin be the result of stripping referrerSource for use as a referrer, with the
	//    origin-only flag set to true.
	let referrerOrigin = stripURLForUseAsAReferrer(referrerSource, true);

	// 6. If the result of serializing referrerURL is a string whose length is greater than 4096, set
	//    referrerURL to referrerOrigin.
	if (referrerURL.toString().length > 4096) {
		referrerURL = referrerOrigin;
	}

	// 7. The user agent MAY alter referrerURL or referrerOrigin at this point to enforce arbitrary
	//    policy considerations in the interests of minimizing data leakage. For example, the user
	//    agent could strip the URL down to an origin, modify its host, replace it with an empty
	//    string, etc.
	if (referrerURLCallback) {
		referrerURL = referrerURLCallback(referrerURL);
	}

	if (referrerOriginCallback) {
		referrerOrigin = referrerOriginCallback(referrerOrigin);
	}

	// 8.Execute the statements corresponding to the value of policy:
	const currentURL = new URL(request.url);

	switch (policy) {
		case 'no-referrer':
			return 'no-referrer';

		case 'origin':
			return referrerOrigin;

		case 'unsafe-url':
			return referrerURL;

		case 'strict-origin':
			// 1. If referrerURL is a potentially trustworthy URL and request's current URL is not a
			//    potentially trustworthy URL, then return no referrer.
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
				return 'no-referrer';
			}

			// 2. Return referrerOrigin.
			return referrerOrigin.toString();

		case 'strict-origin-when-cross-origin':
			// 1. If the origin of referrerURL and the origin of request's current URL are the same, then
			//    return referrerURL.
			if (referrerURL.origin === currentURL.origin) {
				return referrerURL;
			}

			// 2. If referrerURL is a potentially trustworthy URL and request's current URL is not a
			//    potentially trustworthy URL, then return no referrer.
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
				return 'no-referrer';
			}

			// 3. Return referrerOrigin.
			return referrerOrigin;

		case 'same-origin':
			// 1. If the origin of referrerURL and the origin of request's current URL are the same, then
			//    return referrerURL.
			if (referrerURL.origin === currentURL.origin) {
				return referrerURL;
			}

			// 2. Return no referrer.
			return 'no-referrer';

		case 'origin-when-cross-origin':
			// 1. If the origin of referrerURL and the origin of request's current URL are the same, then
			//    return referrerURL.
			if (referrerURL.origin === currentURL.origin) {
				return referrerURL;
			}

			// Return referrerOrigin.
			return referrerOrigin;

		case 'no-referrer-when-downgrade':
			// 1. If referrerURL is a potentially trustworthy URL and request's current URL is not a
			//    potentially trustworthy URL, then return no referrer.
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
				return 'no-referrer';
			}

			// 2. Return referrerURL.
			return referrerURL;

		default:
			throw new TypeError(`Invalid referrerPolicy: ${policy}`);
	}
}

/**
 * @see {@link https://w3c.github.io/webappsec-referrer-policy/#parse-referrer-policy-from-header|Referrer Policy §8.1. Parse a referrer policy from a Referrer-Policy header}
 * @param {Headers} headers Response headers
 * @returns {string} policy
 */
function parseReferrerPolicyFromHeader(headers) {
	// 1. Let policy-tokens be the result of extracting header list values given `Referrer-Policy`
	//    and response’s header list.
	const policyTokens = (headers.get('referrer-policy') || '').split(/[,\s]+/);

	// 2. Let policy be the empty string.
	let policy = '';

	// 3. For each token in policy-tokens, if token is a referrer policy and token is not the empty
	//    string, then set policy to token.
	// Note: This algorithm loops over multiple policy values to allow deployment of new policy
	// values with fallbacks for older user agents, as described in § 11.1 Unknown Policy Values.
	for (const token of policyTokens) {
		if (token && ReferrerPolicy.has(token)) {
			policy = token;
		}
	}

	// 4. Return policy.
	return policy;
}

/**
 * Request.js
 *
 * Request class contains server only options
 *
 * All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
 */

const INTERNALS = Symbol('Request internals');

/**
 * Check if `obj` is an instance of Request.
 *
 * @param  {*} object
 * @return {boolean}
 */
const isRequest = object => {
	return (
		typeof object === 'object' &&
		typeof object[INTERNALS] === 'object'
	);
};

const doBadDataWarn = node_util.deprecate(() => {},
	'.data is not a valid RequestInit property, use .body instead',
	'https://github.com/node-fetch/node-fetch/issues/1000 (request)');

/**
 * Request class
 *
 * Ref: https://fetch.spec.whatwg.org/#request-class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
class Request extends Body {
	constructor(input, init = {}) {
		let parsedURL;

		// Normalize input and force URL to be encoded as UTF-8 (https://github.com/node-fetch/node-fetch/issues/245)
		if (isRequest(input)) {
			parsedURL = new URL(input.url);
		} else {
			parsedURL = new URL(input);
			input = {};
		}

		if (parsedURL.username !== '' || parsedURL.password !== '') {
			throw new TypeError(`${parsedURL} is an url with embedded credentials.`);
		}

		let method = init.method || input.method || 'GET';
		if (/^(delete|get|head|options|post|put)$/i.test(method)) {
			method = method.toUpperCase();
		}

		if ('data' in init) {
			doBadDataWarn();
		}

		// eslint-disable-next-line no-eq-null, eqeqeq
		if ((init.body != null || (isRequest(input) && input.body !== null)) &&
			(method === 'GET' || method === 'HEAD')) {
			throw new TypeError('Request with GET/HEAD method cannot have body');
		}

		const inputBody = init.body ?
			init.body :
			(isRequest(input) && input.body !== null ?
				clone(input) :
				null);

		super(inputBody, {
			size: init.size || input.size || 0
		});

		const headers = new Headers(init.headers || input.headers || {});

		if (inputBody !== null && !headers.has('Content-Type')) {
			const contentType = extractContentType(inputBody, this);
			if (contentType) {
				headers.set('Content-Type', contentType);
			}
		}

		let signal = isRequest(input) ?
			input.signal :
			null;
		if ('signal' in init) {
			signal = init.signal;
		}

		// eslint-disable-next-line no-eq-null, eqeqeq
		if (signal != null && !isAbortSignal(signal)) {
			throw new TypeError('Expected signal to be an instanceof AbortSignal or EventTarget');
		}

		// §5.4, Request constructor steps, step 15.1
		// eslint-disable-next-line no-eq-null, eqeqeq
		let referrer = init.referrer == null ? input.referrer : init.referrer;
		if (referrer === '') {
			// §5.4, Request constructor steps, step 15.2
			referrer = 'no-referrer';
		} else if (referrer) {
			// §5.4, Request constructor steps, step 15.3.1, 15.3.2
			const parsedReferrer = new URL(referrer);
			// §5.4, Request constructor steps, step 15.3.3, 15.3.4
			referrer = /^about:(\/\/)?client$/.test(parsedReferrer) ? 'client' : parsedReferrer;
		} else {
			referrer = undefined;
		}

		this[INTERNALS] = {
			method,
			redirect: init.redirect || input.redirect || 'follow',
			headers,
			parsedURL,
			signal,
			referrer
		};

		// Node-fetch-only options
		this.follow = init.follow === undefined ? (input.follow === undefined ? 20 : input.follow) : init.follow;
		this.compress = init.compress === undefined ? (input.compress === undefined ? true : input.compress) : init.compress;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
		this.highWaterMark = init.highWaterMark || input.highWaterMark || 16384;
		this.insecureHTTPParser = init.insecureHTTPParser || input.insecureHTTPParser || false;

		// §5.4, Request constructor steps, step 16.
		// Default is empty string per https://fetch.spec.whatwg.org/#concept-request-referrer-policy
		this.referrerPolicy = init.referrerPolicy || input.referrerPolicy || '';
	}

	/** @returns {string} */
	get method() {
		return this[INTERNALS].method;
	}

	/** @returns {string} */
	get url() {
		return node_url.format(this[INTERNALS].parsedURL);
	}

	/** @returns {Headers} */
	get headers() {
		return this[INTERNALS].headers;
	}

	get redirect() {
		return this[INTERNALS].redirect;
	}

	/** @returns {AbortSignal} */
	get signal() {
		return this[INTERNALS].signal;
	}

	// https://fetch.spec.whatwg.org/#dom-request-referrer
	get referrer() {
		if (this[INTERNALS].referrer === 'no-referrer') {
			return '';
		}

		if (this[INTERNALS].referrer === 'client') {
			return 'about:client';
		}

		if (this[INTERNALS].referrer) {
			return this[INTERNALS].referrer.toString();
		}

		return undefined;
	}

	get referrerPolicy() {
		return this[INTERNALS].referrerPolicy;
	}

	set referrerPolicy(referrerPolicy) {
		this[INTERNALS].referrerPolicy = validateReferrerPolicy(referrerPolicy);
	}

	/**
	 * Clone this request
	 *
	 * @return  Request
	 */
	clone() {
		return new Request(this);
	}

	get [Symbol.toStringTag]() {
		return 'Request';
	}
}

Object.defineProperties(Request.prototype, {
	method: {enumerable: true},
	url: {enumerable: true},
	headers: {enumerable: true},
	redirect: {enumerable: true},
	clone: {enumerable: true},
	signal: {enumerable: true},
	referrer: {enumerable: true},
	referrerPolicy: {enumerable: true}
});

/**
 * Convert a Request to Node.js http request options.
 *
 * @param {Request} request - A Request instance
 * @return The options object to be passed to http.request
 */
const getNodeRequestOptions = request => {
	const {parsedURL} = request[INTERNALS];
	const headers = new Headers(request[INTERNALS].headers);

	// Fetch step 1.3
	if (!headers.has('Accept')) {
		headers.set('Accept', '*/*');
	}

	// HTTP-network-or-cache fetch steps 2.4-2.7
	let contentLengthValue = null;
	if (request.body === null && /^(post|put)$/i.test(request.method)) {
		contentLengthValue = '0';
	}

	if (request.body !== null) {
		const totalBytes = getTotalBytes(request);
		// Set Content-Length if totalBytes is a number (that is not NaN)
		if (typeof totalBytes === 'number' && !Number.isNaN(totalBytes)) {
			contentLengthValue = String(totalBytes);
		}
	}

	if (contentLengthValue) {
		headers.set('Content-Length', contentLengthValue);
	}

	// 4.1. Main fetch, step 2.6
	// > If request's referrer policy is the empty string, then set request's referrer policy to the
	// > default referrer policy.
	if (request.referrerPolicy === '') {
		request.referrerPolicy = DEFAULT_REFERRER_POLICY;
	}

	// 4.1. Main fetch, step 2.7
	// > If request's referrer is not "no-referrer", set request's referrer to the result of invoking
	// > determine request's referrer.
	if (request.referrer && request.referrer !== 'no-referrer') {
		request[INTERNALS].referrer = determineRequestsReferrer(request);
	} else {
		request[INTERNALS].referrer = 'no-referrer';
	}

	// 4.5. HTTP-network-or-cache fetch, step 6.9
	// > If httpRequest's referrer is a URL, then append `Referer`/httpRequest's referrer, serialized
	// >  and isomorphic encoded, to httpRequest's header list.
	if (request[INTERNALS].referrer instanceof URL) {
		headers.set('Referer', request.referrer);
	}

	// HTTP-network-or-cache fetch step 2.11
	if (!headers.has('User-Agent')) {
		headers.set('User-Agent', 'node-fetch');
	}

	// HTTP-network-or-cache fetch step 2.15
	if (request.compress && !headers.has('Accept-Encoding')) {
		headers.set('Accept-Encoding', 'gzip, deflate, br');
	}

	let {agent} = request;
	if (typeof agent === 'function') {
		agent = agent(parsedURL);
	}

	if (!headers.has('Connection') && !agent) {
		headers.set('Connection', 'close');
	}

	// HTTP-network fetch step 4.2
	// chunked encoding is handled by Node.js

	const search = getSearch(parsedURL);

	// Pass the full URL directly to request(), but overwrite the following
	// options:
	const options = {
		// Overwrite search to retain trailing ? (issue #776)
		path: parsedURL.pathname + search,
		// The following options are not expressed in the URL
		method: request.method,
		headers: headers[Symbol.for('nodejs.util.inspect.custom')](),
		insecureHTTPParser: request.insecureHTTPParser,
		agent
	};

	return {
		/** @type {URL} */
		parsedURL,
		options
	};
};

/**
 * AbortError interface for cancelled requests
 */
class AbortError extends FetchBaseError {
	constructor(message, type = 'aborted') {
		super(message, type);
	}
}

/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */

if (!globalThis.DOMException) {
  try {
    const { MessageChannel } = require('worker_threads'),
    port = new MessageChannel().port1,
    ab = new ArrayBuffer();
    port.postMessage(ab, [ab, ab]);
  } catch (err) {
    err.constructor.name === 'DOMException' && (
      globalThis.DOMException = err.constructor
    );
  }
}

/**
 * Index.js
 *
 * a request API compatible with window.fetch
 *
 * All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
 */

const supportedSchemas = new Set(['data:', 'http:', 'https:']);

/**
 * Fetch function
 *
 * @param   {string | URL | import('./request').default} url - Absolute url or Request instance
 * @param   {*} [options_] - Fetch options
 * @return  {Promise<import('./response').default>}
 */
async function fetch$1(url, options_) {
	return new Promise((resolve, reject) => {
		// Build request object
		const request = new Request(url, options_);
		const {parsedURL, options} = getNodeRequestOptions(request);
		if (!supportedSchemas.has(parsedURL.protocol)) {
			throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${parsedURL.protocol.replace(/:$/, '')}" is not supported.`);
		}

		if (parsedURL.protocol === 'data:') {
			const data = dataUriToBuffer(request.url);
			const response = new Response(data, {headers: {'Content-Type': data.typeFull}});
			resolve(response);
			return;
		}

		// Wrap http.request into fetch
		const send = (parsedURL.protocol === 'https:' ? https__default["default"] : http__default["default"]).request;
		const {signal} = request;
		let response = null;

		const abort = () => {
			const error = new AbortError('The operation was aborted.');
			reject(error);
			if (request.body && request.body instanceof Stream__default["default"].Readable) {
				request.body.destroy(error);
			}

			if (!response || !response.body) {
				return;
			}

			response.body.emit('error', error);
		};

		if (signal && signal.aborted) {
			abort();
			return;
		}

		const abortAndFinalize = () => {
			abort();
			finalize();
		};

		// Send request
		const request_ = send(parsedURL.toString(), options);

		if (signal) {
			signal.addEventListener('abort', abortAndFinalize);
		}

		const finalize = () => {
			request_.abort();
			if (signal) {
				signal.removeEventListener('abort', abortAndFinalize);
			}
		};

		request_.on('error', error => {
			reject(new FetchError(`request to ${request.url} failed, reason: ${error.message}`, 'system', error));
			finalize();
		});

		fixResponseChunkedTransferBadEnding(request_, error => {
			if (response && response.body) {
				response.body.destroy(error);
			}
		});

		/* c8 ignore next 18 */
		if (process.version < 'v14') {
			// Before Node.js 14, pipeline() does not fully support async iterators and does not always
			// properly handle when the socket close/end events are out of order.
			request_.on('socket', s => {
				let endedWithEventsCount;
				s.prependListener('end', () => {
					endedWithEventsCount = s._eventsCount;
				});
				s.prependListener('close', hadError => {
					// if end happened before close but the socket didn't emit an error, do it now
					if (response && endedWithEventsCount < s._eventsCount && !hadError) {
						const error = new Error('Premature close');
						error.code = 'ERR_STREAM_PREMATURE_CLOSE';
						response.body.emit('error', error);
					}
				});
			});
		}

		request_.on('response', response_ => {
			request_.setTimeout(0);
			const headers = fromRawHeaders(response_.rawHeaders);

			// HTTP fetch step 5
			if (isRedirect(response_.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				let locationURL = null;
				try {
					locationURL = location === null ? null : new URL(location, request.url);
				} catch {
					// error here can only be invalid URL in Location: header
					// do not throw when options.redirect == manual
					// let the user extract the errorneous redirect URL
					if (request.redirect !== 'manual') {
						reject(new FetchError(`uri requested responds with an invalid redirect URL: ${location}`, 'invalid-redirect'));
						finalize();
						return;
					}
				}

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// Nothing to do
						break;
					case 'follow': {
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOptions = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: clone(request),
							signal: request.signal,
							size: request.size,
							referrer: request.referrer,
							referrerPolicy: request.referrerPolicy
						};

						// when forwarding sensitive headers like "Authorization",
						// "WWW-Authenticate", and "Cookie" to untrusted targets,
						// headers will be ignored when following a redirect to a domain
						// that is not a subdomain match or exact match of the initial domain.
						// For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
						// will forward the sensitive headers, but a redirect to "bar.com" will not.
						if (!isDomainOrSubdomain(request.url, locationURL)) {
							for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
								requestOptions.headers.delete(name);
							}
						}

						// HTTP-redirect fetch step 9
						if (response_.statusCode !== 303 && request.body && options_.body instanceof Stream__default["default"].Readable) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (response_.statusCode === 303 || ((response_.statusCode === 301 || response_.statusCode === 302) && request.method === 'POST')) {
							requestOptions.method = 'GET';
							requestOptions.body = undefined;
							requestOptions.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 14
						const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
						if (responseReferrerPolicy) {
							requestOptions.referrerPolicy = responseReferrerPolicy;
						}

						// HTTP-redirect fetch step 15
						resolve(fetch$1(new Request(locationURL, requestOptions)));
						finalize();
						return;
					}

					default:
						return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
				}
			}

			// Prepare response
			if (signal) {
				response_.once('end', () => {
					signal.removeEventListener('abort', abortAndFinalize);
				});
			}

			let body = Stream.pipeline(response_, new Stream.PassThrough(), error => {
				if (error) {
					reject(error);
				}
			});
			// see https://github.com/nodejs/node/pull/29376
			/* c8 ignore next 3 */
			if (process.version < 'v12.10') {
				response_.on('aborted', abortAndFinalize);
			}

			const responseOptions = {
				url: request.url,
				status: response_.statusCode,
				statusText: response_.statusMessage,
				headers,
				size: request.size,
				counter: request.counter,
				highWaterMark: request.highWaterMark
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib__default["default"].Z_SYNC_FLUSH,
				finishFlush: zlib__default["default"].Z_SYNC_FLUSH
			};

			// For gzip
			if (codings === 'gzip' || codings === 'x-gzip') {
				body = Stream.pipeline(body, zlib__default["default"].createGunzip(zlibOptions), error => {
					if (error) {
						reject(error);
					}
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// For deflate
			if (codings === 'deflate' || codings === 'x-deflate') {
				// Handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = Stream.pipeline(response_, new Stream.PassThrough(), error => {
					if (error) {
						reject(error);
					}
				});
				raw.once('data', chunk => {
					// See http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = Stream.pipeline(body, zlib__default["default"].createInflate(), error => {
							if (error) {
								reject(error);
							}
						});
					} else {
						body = Stream.pipeline(body, zlib__default["default"].createInflateRaw(), error => {
							if (error) {
								reject(error);
							}
						});
					}

					response = new Response(body, responseOptions);
					resolve(response);
				});
				raw.once('end', () => {
					// Some old IIS servers return zero-length OK deflate responses, so
					// 'data' is never emitted. See https://github.com/node-fetch/node-fetch/pull/903
					if (!response) {
						response = new Response(body, responseOptions);
						resolve(response);
					}
				});
				return;
			}

			// For br
			if (codings === 'br') {
				body = Stream.pipeline(body, zlib__default["default"].createBrotliDecompress(), error => {
					if (error) {
						reject(error);
					}
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// Otherwise, use response as-is
			response = new Response(body, responseOptions);
			resolve(response);
		});

		// eslint-disable-next-line promise/prefer-await-to-then
		writeToStream(request_, request).catch(reject);
	});
}

function fixResponseChunkedTransferBadEnding(request, errorCallback) {
	const LAST_CHUNK = node_buffer.Buffer.from('0\r\n\r\n');

	let isChunkedTransfer = false;
	let properLastChunkReceived = false;
	let previousChunk;

	request.on('response', response => {
		const {headers} = response;
		isChunkedTransfer = headers['transfer-encoding'] === 'chunked' && !headers['content-length'];
	});

	request.on('socket', socket => {
		const onSocketClose = () => {
			if (isChunkedTransfer && !properLastChunkReceived) {
				const error = new Error('Premature close');
				error.code = 'ERR_STREAM_PREMATURE_CLOSE';
				errorCallback(error);
			}
		};

		const onData = buf => {
			properLastChunkReceived = node_buffer.Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;

			// Sometimes final 0-length chunk and end of message code are in separate packets
			if (!properLastChunkReceived && previousChunk) {
				properLastChunkReceived = (
					node_buffer.Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 &&
					node_buffer.Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0
				);
			}

			previousChunk = buf;
		};

		socket.prependListener('close', onSocketClose);
		socket.on('data', onData);

		request.on('close', () => {
			socket.removeListener('close', onSocketClose);
			socket.removeListener('data', onData);
		});
	});
}

// progressiveFetchHelper is the full progressiveFetch function, split out into
// a helper because the inptus/api is more complicated but only necessary for
// internal use.
function progressiveFetchHelper(pfm, resolve, verifyFunction) {
    // If we run out of portals, return an error.
    if (pfm.remainingPortals.length === 0) {
        let newLog = "query failed because all portals have been tried\n" + JSON.stringify(pfm);
        pfm.logs.push(newLog);
        resolve({
            success: false,
            portal: null,
            response: null,
            portalsFailed: pfm.portalsFailed,
            responsesFailed: pfm.responsesFailed,
            remainingPortals: null,
            logs: pfm.logs,
        });
        return;
    }
    // Grab the portal and query.
    let portal = pfm.remainingPortals.shift();
    let query = portal + pfm.endpoint;
    // Create a helper function for trying the next portal.
    let nextPortal = function (response, log) {
        if (response !== null) {
            response
                .clone()
                .text()
                .then((t) => {
                pfm.logs.push(log);
                pfm.portalsFailed.push(portal);
                pfm.responsesFailed.push(response);
                pfm.messagesFailed.push(t);
                progressiveFetchHelper(pfm, resolve, verifyFunction);
            });
        }
        else {
            pfm.logs.push(log);
            pfm.portalsFailed.push(portal);
            pfm.responsesFailed.push(response);
            pfm.messagesFailed.push("");
            progressiveFetchHelper(pfm, resolve, verifyFunction);
        }
    };
    // Try sending the query to the portal.
    fetch$1(query, pfm.fetchOpts)
        .then((response) => {
        // Check for a 5XX error.
        if (!("status" in response) || typeof response.status !== "number") {
            nextPortal(response, "portal has returned invalid response\n" + JSON.stringify({ portal, query }));
            return;
        }
        if (response.status < 200 || response.status >= 300) {
            nextPortal(response, "portal has returned error status\n" + JSON.stringify({ portal, query }));
            return;
        }
        // Check the result against the verify function.
        verifyFunction(response.clone()).then((errVF) => {
            if (errVF !== null) {
                nextPortal(response, "verify function has returned an error from portal " + portal + " - " + errVF);
                return;
            }
            // Success! Return the response.
            resolve({
                success: true,
                portal,
                response,
                portalsFailed: pfm.portalsFailed,
                responsesFailed: pfm.responsesFailed,
                remainingPortals: pfm.remainingPortals,
                messagesFailed: pfm.messagesFailed,
                logs: pfm.logs,
            });
        });
    })
        .catch((err) => {
        // This portal failed, try again with the next portal.
        nextPortal(null, "fetch returned an error\n" + JSON.stringify(err) + JSON.stringify(pfm.fetchOpts));
        return;
    });
}
// progressiveFetch will query multiple portals until one returns with a
// non-error response. In the event of a 4XX response, progressiveFetch will
// keep querying additional portals to try and find a working 2XX response. In
// the event that no working 2XX response is found, the first 4XX response will
// be returned.
//
// If progressiveFetch returns a 2XX response, it merely means that the portal
// returned a 2XX response. progressiveFetch cannot be confident that the
// portal has returned a correct/honest message, the verification has to be
// handled by the caller. The response (progressiveFetchResult) contains the
// list of portals that progressiveFetch hasn't tried yet. In the event that
// the 2XX response is not correct, the progressiveFetchResult contains the
// list of failover portals that have not been used yet, allowing
// progressiveFetch to be called again.
//
// This progressive method of querying portals helps prevent queries from
// failing, but if the first portal is not a good portal it introduces
// substantial latency. progressiveFetch does not do anything to make sure the
// portals are the best portals, it just queries them in order. The caller
// should make a best attempt to always have the best, most reliable and
// fastest portal as the first portal in the list.
//
// The reason that we don't blindly accept a 4XX response from a portal is that
// we have no way of verifying that the 4XX is legitimate. We don't trust the
// portal, and we can't give a rogue portal the opportunity to interrupt our
// user experience simply by returning a dishonest 404. So we need to keep
// querying more portals and gain confidence that the 404 a truthful response.
//
// TODO: Would be great if 'verifyFunction' could check the function signature
// of the function being passed in, I don't know how to do this.
function progressiveFetch(endpoint, fetchOpts, portals, verifyFunction) {
    let portalsCopy = [...portals];
    return new Promise((resolve) => {
        let pfm = {
            endpoint,
            fetchOpts,
            remainingPortals: portalsCopy,
            portalsFailed: [],
            responsesFailed: [],
            messagesFailed: [],
            logs: [],
        };
        progressiveFetchHelper(pfm, resolve, verifyFunction);
    });
}

// readRegistryEntry will read and verify a registry entry. The tag strings
// will be hashed with the user's seed to produce the correct entropy.
function readRegistryEntry(pubkey, datakey) {
    return new Promise((resolve, reject) => {
        let pubkeyHex = bufToHex(pubkey);
        let datakeyHex = bufToHex(datakey);
        let endpoint = "/skynet/registry?publickey=ed25519%3A" + pubkeyHex + "&datakey=" + datakeyHex;
        let verifyFunc = function (response) {
            return verifyRegistryReadResponse(response, pubkey, datakey);
        };
        progressiveFetch(endpoint, {}, defaultPortalList, verifyFunc).then((result) => {
            // Check for a success.
            if (result.success === true) {
                result.response
                    .json()
                    .then((j) => {
                    resolve({
                        exists: true,
                        data: j.data,
                        revision: BigInt(j.revision),
                    });
                })
                    .catch((err) => {
                    reject(addContextToErr$1(err, "unable to parse response despite passing verification"));
                });
                return;
            }
            // Check for 404.
            for (let i = 0; i < result.responsesFailed.length; i++) {
                if (result.responsesFailed[i].status === 404) {
                    resolve({
                        exists: false,
                        data: new Uint8Array(0),
                        revision: 0n,
                    });
                    return;
                }
            }
            reject("unable to read registry entry\n" + JSON.stringify(result));
        });
    });
}

// verifyRegistryWrite checks that a response from the portal matches the write
// we attempted to perform.
function verifyRegistryWrite(response) {
    return new Promise((resolve) => {
        if (!("status" in response)) {
            resolve("response did not contain a status");
            return;
        }
        if (response.status === 204) {
            resolve(null);
            return;
        }
        resolve("unrecognized status");
    });
}
// overwriteRegistryEntry will obliterate an existing registry entry with a new
// value. This function does not have any data safety, and is only recommended
// for uses where the caller is not concerned about wiping existing data.
// Improper use of this function has caused a large number of developers to
// accidentally wipe critical user data, please avoid using this function for
// any sort of incremental data.
function overwriteRegistryEntry(keypair, datakey, data) {
    return new Promise((resolve, reject) => {
        // Check that the data is small enough to fit in a registry
        // entry. The actual limit for a type 2 entry is 90 bytes, but
        // we are leaving 4 bytes of room for potential extensions
        // later.
        if (data.length > 86) {
            reject("provided data is too large to fit in a registry entry");
            return;
        }
        // Fetch the current registry entry so that we know the
        // revision number.
        //
        // TODO: Need special error handling for max revision number,
        // which probably also means we need to use bignums as the
        // return type.
        readRegistryEntry(keypair.publicKey, datakey)
            .then((result) => {
            let revisionNumber;
            if (!result.exists) {
                revisionNumber = 0n;
            }
            else {
                revisionNumber = result.revision + 1n;
            }
            let [encodedRevision, errU64] = encodeU64$1(revisionNumber);
            if (errU64 !== null) {
                reject(addContextToErr$1(errU64, "unable to encode revision number"));
                return;
            }
            // Compute the signature of the new registry entry.
            let datakeyHex = bufToHex(datakey);
            let [encodedData, errEPB] = encodePrefixedBytes(data);
            if (errEPB !== null) {
                reject(addContextToErr$1(errEPB, "unable to encode the registry data"));
                return;
            }
            let dataToSign = new Uint8Array(32 + 8 + data.length + 8);
            dataToSign.set(datakey, 0);
            dataToSign.set(encodedData, 32);
            dataToSign.set(encodedRevision, 32 + 8 + data.length);
            let sigHash = blake2b(dataToSign);
            let [sig, errS] = ed25519Sign(sigHash, keypair.secretKey);
            if (errS !== null) {
                reject(addContextToErr$1(errS, "unable to produce signature"));
                return;
            }
            // Compose the registry entry query.
            let postBody = {
                publickey: {
                    algorithm: "ed25519",
                    key: Array.from(keypair.publicKey),
                },
                datakey: datakeyHex,
                revision: Number(revisionNumber),
                data: Array.from(data),
                signature: Array.from(sig),
            };
            let fetchOpts = {
                method: "post",
                body: JSON.stringify(postBody),
            };
            let endpoint = "/skynet/registry";
            // Perform the fetch call.
            progressiveFetch(endpoint, fetchOpts, defaultPortalList, verifyRegistryWrite).then((result) => {
                if (result.success === true) {
                    resolve(null);
                    return;
                }
                reject("unable to write registry entry\n" + JSON.stringify(result));
            });
        })
            .catch((err) => {
            reject(addContextToErr$1(err, "unable to write registry entry"));
        });
    });
}

// generateSeedPhraseRandom will randomly generate and verify a seed phrase for the user.
function generateSeedPhraseRandom() {
    let buf = Uint8Array.from(require$$6.randomBytes(32));
    let str = bufToB64$1(buf);
    let [sp, errGSPD] = generateSeedPhraseDeterministic(str);
    if (errGSPD !== null) {
        return ["", addContextToErr$1(errGSPD, "unable to generate seed from string")];
    }
    return [sp, null];
}

// upload will upload the provided fileData to Skynet using the provided
// metadata and then return the resulting skylink. Upload is a secure function
// that computes the skylink of the upload locally, ensuring that the server
// cannot return a malicious skylink and convince a user to run modified code.
function upload$1(fileData, metadata) {
    return new Promise((resolve, reject) => {
        // Check that this is a small file.
        if (fileData.length > 4 * 1000 * 1000) {
            reject("currently only small uploads are supported, please use less than 4 MB");
            return;
        }
        // Encode the metadata after checking that it is valid.
        let errVSM = validateSkyfileMetadata(metadata);
        if (errVSM !== null) {
            reject(addContextToErr$1(errVSM, "upload is using invalid metadata"));
            return;
        }
        let metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
        // Build the layout of the skyfile.
        let layoutBytes = new Uint8Array(99);
        let offset = 0;
        layoutBytes[offset] = 1; // Set the Version
        offset += 1;
        let [filesizeBytes, errU641] = encodeU64$1(BigInt(fileData.length));
        if (errU641 !== null) {
            reject(addContextToErr$1(errU641, "unable to encode fileData length"));
            return;
        }
        layoutBytes.set(filesizeBytes, offset);
        offset += 8;
        let [mdSizeBytes, errU642] = encodeU64$1(BigInt(metadataBytes.length));
        if (errU642 !== null) {
            reject(addContextToErr$1(errU642, "unable to encode metadata bytes length"));
            return;
        }
        layoutBytes.set(mdSizeBytes, offset);
        offset += 8;
        let [fanoutSizeBytes, errU643] = encodeU64$1(0n);
        if (errU643 !== null) {
            reject(addContextToErr$1(errU643, "unable to encode fanout bytes length"));
            return;
        }
        layoutBytes.set(fanoutSizeBytes, offset);
        offset += 8;
        layoutBytes[offset] = 0; // Set the fanout data pieces
        offset += 1;
        layoutBytes[offset] = 0; // Set the fanout parity pieces
        offset += 1;
        layoutBytes[offset + 7] = 1; // Set the cipher type
        offset += 8;
        if (offset + 64 !== 99) {
            reject("error when building the layout bytes, got wrong final offset");
            return;
        }
        // Build the base sector.
        let totalSize = layoutBytes.length + metadataBytes.length + fileData.length;
        if (totalSize > 1 << 22) {
            reject("error when building the base sector: total sector is too large");
            return;
        }
        let baseSector = new Uint8Array(1 << 22);
        offset = 0;
        baseSector.set(layoutBytes, offset);
        offset += layoutBytes.length;
        baseSector.set(metadataBytes, offset);
        offset += metadataBytes.length;
        baseSector.set(fileData, offset);
        // Compute the Skylink of this file.
        let [sectorRoot, errBMR] = blake2bMerkleRoot(baseSector);
        if (errBMR !== null) {
            reject(addContextToErr$1(errBMR, "unable to create bitfield for skylink"));
            return;
        }
        let skylinkBytes = new Uint8Array(34);
        let [bitfield, errSV1B] = skylinkV1Bitfield(BigInt(totalSize));
        if (errSV1B !== null) {
            reject(addContextToErr$1(errSV1B, "unable to create bitfield for skylink"));
            return;
        }
        skylinkBytes.set(bitfield, 0);
        skylinkBytes.set(sectorRoot, 2);
        // Build the header for the upload call.
        let header = new Uint8Array(92);
        let [headerMetadataPrefix, errU644] = encodeU64$1(15n);
        if (errU644 !== null) {
            reject(addContextToErr$1(errU644, "unable to encode header metadata length"));
            return;
        }
        let headerMetadata = new TextEncoder().encode("Skyfile Backup\n");
        let [versionPrefix, errU645] = encodeU64$1(7n);
        if (errU645 !== null) {
            reject(addContextToErr$1(errU645, "unable to encode version prefix length"));
            return;
        }
        let version = new TextEncoder().encode("v1.5.5\n");
        let [skylinkPrefix, errU646] = encodeU64$1(46n);
        if (errU646 !== null) {
            reject(addContextToErr$1(errU646, "unable to encode skylink length"));
            return;
        }
        let skylink = bufToB64$1(skylinkBytes);
        offset = 0;
        header.set(headerMetadataPrefix, offset);
        offset += 8;
        header.set(headerMetadata, offset);
        offset += 15;
        header.set(versionPrefix, offset);
        offset += 8;
        header.set(version, offset);
        offset += 7;
        header.set(skylinkPrefix, offset);
        offset += 8;
        header.set(new TextEncoder().encode(skylink), offset);
        // Build the full request body.
        let reqBody = new Uint8Array((1 << 22) + 92);
        reqBody.set(header, 0);
        reqBody.set(baseSector, 92);
        // Call progressiveFetch to perform the upload.
        let endpoint = "/skynet/restore";
        let fetchOpts = {
            method: "post",
            body: reqBody,
        };
        // Establish the function that verifies the result is correct.
        let verifyFunction = function (response) {
            return new Promise((resolve) => {
                response
                    .json()
                    .then((j) => {
                    if (!("skylink" in j)) {
                        resolve("response is missing the skylink field\n" + JSON.stringify(j));
                        return;
                    }
                    if (j.skylink !== skylink) {
                        resolve("wrong skylink was returned, expecting " + skylink + " but got " + j.skylink);
                        return;
                    }
                    resolve(null);
                })
                    .catch((err) => {
                    resolve(addContextToErr$1(err, "unable to read response body"));
                });
            });
        };
        progressiveFetch(endpoint, fetchOpts, defaultPortalList, verifyFunction).then((result) => {
            result.response
                .json()
                .then((j) => {
                resolve(j.skylink);
            })
                .catch((err) => {
                reject(addContextToErr$1(err, "unable to read response body, despite verification of response succeeding"));
            });
        });
    });
}

var dist$1 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	overwriteRegistryEntry: overwriteRegistryEntry,
	generateSeedPhraseRandom: generateSeedPhraseRandom,
	upload: upload$1
});

var require$$4 = /*@__PURE__*/getAugmentedNamespace(dist$1);

// log provides a wrapper for console.log that prefixes '[libkernel]' to the
// output.
function log(...inputs) {
    console.log("[libkernel]", ...inputs);
}
// logErr provides a wrapper for console.error that prefixes '[libkernel]' to
// the output.
function logErr(...inputs) {
    console.error("[libkernel]", ...inputs);
}

// tryStringify will try to turn the provided input into a string. If the input
// object is already a string, the input object will be returned. If the input
// object has a toString method, the toString method will be called. If that
// fails, we try to call JSON.stringify on the object. And if that fails, we
// set the return value to "[stringify failed]".
function tryStringify(obj) {
    // Check for undefined input.
    if (obj === undefined || obj === null) {
        return "[cannot stringify undefined input]";
    }
    // Parse the error into a string.
    if (typeof obj === "string") {
        return obj;
    }
    // Check if the object has a custom toString and use that if so.
    let hasToString = typeof obj.toString === "function";
    if (hasToString && obj.toString !== Object.prototype.toString) {
        return obj.toString();
    }
    // If the object does not have a custom toString, attempt to perform a
    // JSON.stringify.
    try {
        return JSON.stringify(obj);
    }
    catch {
        return "[stringify failed]";
    }
}

// addContextToErr is a helper function that standardizes the formatting of
// adding context to an error. Within the world of go we discovered that being
// persistent about layering context onto errors is helpful when debugging,
// even though it often creates rather verbose error messages.
//
// addContextToErr will return null if the input err is null.
//
// NOTE: To protect against accidental situations where an Error type or some
// other type is provided instead of a string, we wrap both of the inputs with
// tryStringify before returning them. This prevents runtime failures.
function addContextToErr(err, context) {
    if (err === null) {
        err = "[no error provided]";
    }
    return tryStringify(context) + ": " + tryStringify(err);
}
// composeErr takes a series of inputs and composes them into a single string.
// Each element will be separated by a newline. If the input is not a string,
// it will be transformed into a string with JSON.stringify.
//
// Any object that cannot be stringified will be skipped, though an error will
// be logged.
function composeErr(...inputs) {
    let result = "";
    let resultEmpty = true;
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i] === null) {
            continue;
        }
        if (resultEmpty) {
            resultEmpty = false;
        }
        else {
            result += "\n";
        }
        result += tryStringify(inputs[i]);
    }
    if (resultEmpty) {
        return null;
    }
    return result;
}

// Helper consts to make it easy to return empty values alongside errors.
const nu8 = new Uint8Array(0);
// bufToB64 will convert a Uint8Array to a base64 string with URL encoding and
// no padding characters.
function bufToB64(buf) {
    let b64Str = btoa(String.fromCharCode.apply(null, buf));
    return b64Str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
// encodeU64 will encode a bigint in the range of a uint64 to an 8 byte
// Uint8Array.
function encodeU64(num) {
    // Check the bounds on the bigint.
    if (num < 0) {
        return [nu8, "expected a positive integer"];
    }
    if (num > 18446744073709551615n) {
        return [nu8, "expected a number no larger than a uint64"];
    }
    // Encode the bigint into a Uint8Array.
    let encoded = new Uint8Array(8);
    for (let i = 0; i < encoded.length; i++) {
        let byte = Number(num & 0xffn);
        encoded[i] = byte;
        num = num >> 8n;
    }
    return [encoded, null];
}

let gfi = function (init) {
    let i, r = new Float64Array(16);
    if (init)
        for (i = 0; i < init.length; i++)
            r[i] = init[i];
    return r;
};
gfi([1]); gfi([
    0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f,
    0x6cee, 0x5203,
]); gfi([
    0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df,
    0xd9dc, 0x2406,
]); gfi([
    0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e,
    0x36d3, 0x2169,
]); gfi([
    0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666,
    0x6666, 0x6666,
]); gfi([
    0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1,
    0x2480, 0x2b83,
]);

// Create the queryMap.
let queries = {};
// Define the nonce handling. nonceSeed is 16 random bytes that get generated
// at init and serve as the baseline for creating random nonces. nonceCounter
// tracks which messages have been sent. We hash together the nonceSeed and the
// current nonceCounter to get a secure nonce.
//
// We need a secure nonce so that we know which messages from the kernel are
// intended for us. There could be multiple pieces of independent code talking
// to the kernel and using nonces, by having secure random nonces we can
// guarantee that the applications will not use conflicting nonces.
let nonceSeed;
let nonceCounter;
function initNonce() {
    nonceSeed = new Uint8Array(16);
    nonceCounter = 0;
    crypto.getRandomValues(nonceSeed);
}
// nextNonce will combine the nonceCounter with the nonceSeed to produce a
// unique string that can be used as the nonce with the kernel.
//
// Note: the nonce is only ever going to be visible to the kernel and to other
// code running in the same webpage, so we don't need to hash our nonceSeed. We
// just need it to be unique, not undetectable.
function nextNonce() {
    let nonceNum = nonceCounter;
    nonceCounter += 1;
    let [nonceNumBytes, err] = encodeU64(BigInt(nonceNum));
    if (err !== null) {
        // encodeU64 only fails if nonceNum is outside the bounds of a
        // uint64, which shouldn't happen ever.
        logErr("encodeU64 somehow failed", err);
    }
    let noncePreimage = new Uint8Array(nonceNumBytes.length + nonceSeed.length);
    noncePreimage.set(nonceNumBytes, 0);
    noncePreimage.set(nonceSeed, nonceNumBytes.length);
    return bufToB64(noncePreimage);
}
// Establish the handler for incoming messages.
function handleMessage(event) {
    // Ignore all messages that aren't from approved kernel sources. The two
    // approved sources are skt.us and the browser extension bridge (which has
    // an event.source equal to 'window')
    if (event.source !== window && event.origin !== "https://skt.us") {
        return;
    }
    // Ignore any messages that don't have a method and data field.
    if (!("method" in event.data) || !("data" in event.data)) {
        return;
    }
    // Handle logging messages.
    if (event.data.method === "log") {
        // We display the logging message if the kernel is a browser
        // extension, so that the kernel's logs appear in the app
        // console as well as the extension console. If the kernel is
        // in an iframe, its logging messages will already be in the
        // app console and therefore don't need to be displayed.
        if (kernelOrigin === window.origin) {
            if (event.data.data.isErr) {
                console.error(event.data.data.message);
            }
            else {
                console.log(event.data.data.message);
            }
        }
        return;
    }
    // init is complete when the kernel sends us the auth status. If the
    // user is logged in, report success, otherwise return an error
    // indicating that the user is not logged in.
    if (event.data.method === "kernelAuthStatus") {
        // If we have received an auth status message, it means the bootloader
        // at a minimum is working.
        if (initResolved === false) {
            initResolved = true;
            initResolve();
        }
        // If the auth status message says that login is complete, it means
        // that the user is logged in.
        if (loginResolved === false && event.data.data.loginComplete === true) {
            loginResolved = true;
            loginResolve();
        }
        // If the auth status message says that the kernel loaded, it means
        // that the kernel is ready to receive messages.
        if (kernelLoadedResolved === false && event.data.data.kernelLoaded !== "not yet") {
            kernelLoadedResolved = true;
            if (event.data.data.kernelLoaded === "success") {
                kernelLoadedResolve(null);
            }
            else {
                kernelLoadedResolve(event.data.data.kernelLoaded);
            }
        }
        // If we have received a message indicating that the user has logged
        // out, we need to reload the page and reset the auth process.
        if (event.data.data.logoutComplete === true) {
            {
                logoutResolve();
            }
            window.location.reload();
        }
        return;
    }
    // Check that the message sent has a nonce. We don't log
    // on failure because the message may have come from 'window', which
    // will happen if the app has other messages being sent to the window.
    if (!("nonce" in event.data)) {
        return;
    }
    // If we can't locate the nonce in the queries map, there is nothing to do.
    // This can happen especially for responseUpdate messages.
    if (!(event.data.nonce in queries)) {
        return;
    }
    let query = queries[event.data.nonce];
    // Handle a response. Once the response has been received, it is safe to
    // delete the query from the queries map.
    if (event.data.method === "response") {
        queries[event.data.nonce].resolve([event.data.data, event.data.err]);
        delete queries[event.data.nonce];
        return;
    }
    // Handle a response update.
    if (event.data.method === "responseUpdate") {
        // If no update handler was provided, there is nothing to do.
        if (typeof query.receiveUpdate === "function") {
            query.receiveUpdate(event.data.data);
        }
        return;
    }
    // Handle a responseNonce.
    if (event.data.method === "responseNonce") {
        if (typeof query.kernelNonceReceived === "function") {
            query.kernelNonceReceived(event.data.data.nonce);
        }
        return;
    }
    // Ignore any other messages as they might be from other applications.
}
// launchKernelFrame will launch the skt.us iframe that is used to connect to the
// Skynet kernel if the kernel cannot be reached through the browser extension.
function launchKernelFrame() {
    let iframe = document.createElement("iframe");
    iframe.src = "https://skt.us";
    iframe.width = "0";
    iframe.height = "0";
    iframe.style.border = "0";
    iframe.style.position = "absolute";
    document.body.appendChild(iframe);
    kernelSource = iframe.contentWindow;
    kernelOrigin = "https://skt.us";
    kernelAuthLocation = "https://skt.us/auth.html";
    // Set a timer to fail the login process if the kernel doesn't load in
    // time.
    setTimeout(() => {
        if (initResolved === true) {
            return;
        }
        initResolved = true;
        initResolve("tried to open kernel in iframe, but hit a timeout");
    }, 24000);
}
// messageBridge will send a message to the bridge of the skynet extension to
// see if it exists. If it does not respond or if it responds with an error,
// messageBridge will open an iframe to skt.us and use that as the kernel.
let kernelSource;
let kernelOrigin;
let kernelAuthLocation;
function messageBridge() {
    // Establish the function that will handle the bridge's response.
    let bridgeInitComplete = false;
    let bridgeResolve = () => { }; // Need to set bridgeResolve here to make tsc happy
    let p = new Promise((resolve) => {
        bridgeResolve = resolve;
    });
    p.then(([, err]) => {
        // Check if the timeout already elapsed.
        if (bridgeInitComplete === true) {
            logErr("received response from bridge, but init already finished");
            return;
        }
        bridgeInitComplete = true;
        // Deconstruct the input and return if there's an error.
        if (err !== null) {
            logErr("bridge exists but returned an error", err);
            launchKernelFrame();
            return;
        }
        // Bridge has responded successfully, and there's no error.
        kernelSource = window;
        kernelOrigin = window.origin;
        kernelAuthLocation = "http://kernel.skynet/auth.html";
        console.log("established connection to bridge, using browser extension for kernel");
    });
    // Add the handler to the queries map.
    let nonce = nextNonce();
    queries[nonce] = {
        resolve: bridgeResolve,
    };
    // Send a message to the bridge of the browser extension to determine
    // whether the bridge exists.
    window.postMessage({
        nonce,
        method: "kernelBridgeVersion",
    }, window.origin);
    // Set a timeout, if we do not hear back from the bridge in 500
    // milliseconds we assume that the bridge is not available.
    setTimeout(() => {
        // If we've already received and processed a message from the
        // bridge, there is nothing to do.
        if (bridgeInitComplete === true) {
            return;
        }
        bridgeInitComplete = true;
        log("browser extension not found, falling back to skt.us");
        launchKernelFrame();
    }, 500);
    return initPromise;
}
// init is a function that returns a promise which will resolve when
// initialization is complete.
//
// The init / auth process has 5 stages. The first stage is that something
// somewhere needs to call init(). It is safe to call init() multiple times,
// thanks to the 'initialized' variable.
let initialized = false; // set to true once 'init()' has been called
let initResolved = false; // set to true once we know the bootloader is working
let initResolve;
let initPromise;
let loginResolved = false; // set to true once we know the user is logged in
let loginResolve;
let loginPromise;
let kernelLoadedResolved = false; // set to true once the user kernel is loaded
let kernelLoadedResolve;
let kernelLoadedPromise;
let logoutResolve;
let logoutPromise;
function init() {
    // If init has already been called, just return the init promise.
    if (initialized === true) {
        return initPromise;
    }
    initialized = true;
    // Run all of the init functions.
    initNonce();
    window.addEventListener("message", handleMessage);
    messageBridge();
    // Create the promises that resolve at various stages of the auth flow.
    initPromise = new Promise((resolve) => {
        initResolve = resolve;
    });
    loginPromise = new Promise((resolve) => {
        loginResolve = resolve;
    });
    kernelLoadedPromise = new Promise((resolve) => {
        kernelLoadedResolve = resolve;
    });
    logoutPromise = new Promise((resolve) => {
        logoutResolve = resolve;
    });
    // Return the initPromise, which will resolve when bootloader init is
    // complete.
    return initPromise;
}
// callModule is a generic function to call a module. The first input is the
// module identifier (typically a skylink), the second input is the method
// being called on the module, and the final input is optional and contains
// input data to be passed to the module. The input data will depend on the
// module and the method that is being called. The return value is an errTuple
// that contains the module's response. The format of the response is an
// arbitrary object whose fields depend on the module and method being called.
//
// callModule can only be used for query-response communication, there is no
// support for sending or receiving updates.
function callModule(module, method, data) {
    let moduleCallData = {
        module,
        method,
        data,
    };
    let [, query] = newKernelQuery("moduleCall", moduleCallData, false);
    return query;
}
// connectModule is the standard function to send a query to a module that can
// optionally send and optionally receive updates. The first three inputs match
// the inputs of 'callModule', and the fourth input is a function that will be
// called any time that the module sends a responseUpdate. The receiveUpdate
// function should have the following signature:
//
// 	`function receiveUpdate(data: any)`
//
// The structure of the data will depend on the module and method that was
// queried.
//
// The first return value is a 'sendUpdate' function that can be called to send
// a queryUpdate to the module. The sendUpdate function has the same signature
// as the receiveUpdate function, it's an arbitrary object whose fields depend
// on the module and method being queried.
//
// The second return value is a promise that returns an errTuple. It will
// resolve when the module sends a response message, and works the same as the
// return value of callModule.
function connectModule(module, method, data, receiveUpdate) {
    let moduleCallData = {
        module,
        method,
        data,
    };
    return newKernelQuery("moduleCall", moduleCallData, true, receiveUpdate);
}
// newKernelQuery opens a query to the kernel. Details like postMessage
// communication and nonce handling are all abstracted away by newKernelQuery.
//
// The first arg is the method that is being called on the kernel, and the
// second arg is the data that will be sent to the kernel as input to the
// method.
//
// The thrid arg is an optional function that can be passed in to receive
// responseUpdates to the query. Not every query will send responseUpdates, and
// most responseUpdates can be ignored, but sometimes contain useful
// information like download progress.
//
// The first output is a 'sendUpdate' function that can be called to send a
// queryUpdate. The second output is a promise that will resolve when the query
// receives a response message. Once the response message has been received, no
// more updates can be sent or received.
function newKernelQuery(method, data, sendUpdates, receiveUpdate) {
    // NOTE: The implementation here is gnarly, because I didn't want to use
    // async/await (that decision should be left to the caller) and I also
    // wanted this function to work correctly even if init() had not been
    // called yet.
    //
    // This function returns a sendUpdate function along with a promise, so we
    // can't simply wrap everything in a basic promise. The sendUpdate function
    // has to block internally until all of the setup is complete, and then we
    // can't send a query until all of the setup is complete, and the setup
    // cylce has multiple dependencies and therefore we get a few promises that
    // all depend on each other.
    //
    // Using async/await here actually breaks certain usage patterns (or at
    // least makes them much more difficult to use correctly). The standard way
    // to establish duplex communication using connectModule is to define a
    // variable 'sendUpdate' before defining the function 'receiveUpdate', and
    // then setting 'sendUpdate' equal to the first return value of
    // 'connectModue'. It looks like this:
    //
    // let sendUpdate;
    // let receiveUpdate = function(data: any) {
    //     if (data.needsUpdate) {
    //         sendUpdate(someUpdate)
    //     }
    // }
    // let [sendUpdateFn, response] = connectModule(x, y, z, receiveUpdate)
    // sendUpdate = sendUpdateFn
    //
    // If we use async/await, it's not safe to set sendUpdate after
    // connectModule returns because 'receiveUpdate' may be called before
    // 'sendUpdate' is set. You can fix that by using a promise, but it's a
    // complicated fix and we want this library to be usable by less
    // experienced developers.
    //
    // Therefore, we make an implementation tradeoff here and avoid async/await
    // at the cost of having a bunch of complicated promise chaining.
    // Create a promise that will resolve once the nonce is available. We
    // cannot get the nonce until init() is complete. getNonce therefore
    // implies that init is complete.
    let getNonce = new Promise((resolve) => {
        init().then(() => {
            kernelLoadedPromise.then(() => {
                resolve(nextNonce());
            });
        });
    });
    // Two promises are being created at once here. Once is 'p', which will be
    // returned to the caller of newKernelQuery and will be resolved when the
    // kernel provides a 'response' message. The other is for internal use and
    // will resolve once the query has been created.
    let p;
    let queryCreated;
    let haveQueryCreated = new Promise((resolve) => {
        queryCreated = resolve;
        p = new Promise((resolve) => {
            getNonce.then((nonce) => {
                queries[nonce] = { resolve };
                if (receiveUpdate !== null && receiveUpdate !== undefined) {
                    queries[nonce]["receiveUpdate"] = receiveUpdate;
                }
                queryCreated(nonce);
            });
        });
    });
    // Create a promise that will be resolved once we are ready to receive the
    // kernelNonce. We won't be ready to receive the kernel nonce until after
    // the queries[nonce] object has been created.
    let readyForKernelNonce;
    let getReadyForKernelNonce = new Promise((resolve) => {
        readyForKernelNonce = resolve;
    });
    // Create the sendUpdate function. It defaults to doing nothing. After the
    // sendUpdate function is ready to receive the kernelNonce, resolve the
    // promise that blocks until the sendUpdate function is ready to receive
    // the kernel nonce.
    let sendUpdate;
    if (sendUpdates !== true) {
        sendUpdate = () => { };
        readyForKernelNonce(); // We won't get a kernel nonce, no reason to block.
    }
    else {
        // sendUpdate will send an update to the kernel. The update can't be
        // sent until the kernel nonce is known. Create a promise that will
        // resolve when the kernel nonce is known.
        //
        // This promise cannot itself be created until the queries[nonce]
        // object has been created, so block for the query to be created.
        let blockForKernelNonce = new Promise((resolve) => {
            haveQueryCreated.then((nonce) => {
                queries[nonce]["kernelNonceReceived"] = resolve;
                readyForKernelNonce();
            });
        });
        // The sendUpdate function needs both the local nonce and also the
        // kernel nonce. Block for both. Having the kernel nonce implies that
        // the local nonce is ready, therefore start by blocking for the kernel
        // nonce.
        sendUpdate = function (updateData) {
            blockForKernelNonce.then((nonce) => {
                kernelSource.postMessage({
                    method: "queryUpdate",
                    nonce,
                    data: updateData,
                }, kernelOrigin);
            });
        };
    }
    // Prepare to send the query to the kernel. The query cannot be sent until
    // the queries object is created and also we are ready to receive the
    // kernel nonce.
    haveQueryCreated.then((nonce) => {
        getReadyForKernelNonce.then(() => {
            // There are two types of messages we can send depending on whether
            // we are talking to skt.us or the background script.
            let kernelMessage = {
                method,
                nonce,
                data,
                sendKernelNonce: sendUpdates,
            };
            let backgroundMessage = {
                method: "newKernelQuery",
                nonce,
                data: kernelMessage,
            };
            // The message structure needs to adjust based on whether we are
            // talking directly to the kernel or whether we are talking to the
            // background page.
            if (kernelOrigin === "https://skt.us") {
                kernelSource.postMessage(kernelMessage, kernelOrigin);
            }
            else {
                kernelSource.postMessage(backgroundMessage, kernelOrigin);
            }
        });
    });
    // Return sendUpdate and the promise. sendUpdate is already set to block
    // until all the necessary prereqs are complete.
    return [sendUpdate, p];
}

// There are 5 stages of auth.
//
// Stage 0: Bootloader is not loaded.
// Stage 1: Bootloader is loaded, user is not logged in.
// Stage 2: Bootloader is loaded, user is logged in.
// Stage 3: Kernel is loaded, user is logged in.
// Stage 4: Kernel is loaded, user is logged out.
//
// init() will block until auth has reached stage 1. If the user is already
// logged in from a previous session, auth will immediately progress to stage
// 2.
//
// loginComplete() will block until auth has reached stage 2. The kernel is not
// ready to receive messages yet, but apps do not need to present users with a
// login dialog.
//
// kernelLoaded() will block until auth has reached stage 3. kernelLoaded()
// returns a promise that can resolve with an error. If there was an error, it
// means the kernel could not be loaded and cannot be used.
//
// logoutComplete() will block until auth has reached stage 4. libkernel does
// not support resetting the auth stages, once stage 4 has been reached the app
// needs to refresh.
// kernelLoaded will resolve when the user has successfully loaded the kernel.
// If there was an error in loading the kernel, the error will be returned.
//
// NOTE: kernelLoaded will not resolve until after loginComplete has resolved.
function kernelLoaded() {
    return kernelLoadedPromise;
}
// loginComplete will resolve when the user has successfully logged in.
function loginComplete() {
    return loginPromise;
}
// logoutComplete will resolve when the user has logged out. Note that
// logoutComplete will only resolve if the user logged in first - if the user
// was not logged in to begin with, this promise will not resolve.
function logoutComplete() {
    return logoutPromise;
}
// openAuthWindow is intended to be used as an onclick target when the user
// clicks the 'login' button on a skynet application. It will block until the
// auth location is known, and then it will pop open the correct auth window
// for the user.
//
// NOTE: openAuthWindow will only open a window if the user is not already
// logged in. If the user is already logged in, this function is a no-op.
//
// NOTE: When using this function, you probably want to have your login button
// faded out or presenting the user with a spinner until init() resolves. In
// the worst case (user has no browser extension, and is on a slow internet
// connection) this could take multiple seconds.
function openAuthWindow() {
    // openAuthWindow doesn't care what the auth status is, it's just trying to
    // open the right window.
    init().then(() => {
        window.open(kernelAuthLocation, "_blank");
    });
}

// download will take a skylink and return the file data for that skylink. The
// download occurs using a kernel module that verifies the data's integrity and
// prevents the portal from lying about the download.
function download(skylink) {
    return new Promise((resolve) => {
        let downloadModule = "AQCIaQ0P-r6FwPEDq3auCZiuH_jqrHfqRcY7TjZ136Z_Yw";
        let data = {
            skylink,
        };
        callModule(downloadModule, "secureDownload", data).then(([result, err]) => {
            // Pull the fileData out of the result.
            if (err !== null) {
                resolve([new Uint8Array(0), addContextToErr(err, "unable to complete download")]);
                return;
            }
            resolve([result.fileData, null]);
        });
    });
}

// registryRead will perform a registry read on a portal. readEntry does not
// guarantee that the latest revision has been provided, however it does
// guarantee that the provided data has a matching signature.
//
// registryRead returns the full registry entry object provided by the module
// because the object is relatively complex and all of the fields are more or
// less required.
function registryRead(publicKey, dataKey) {
    let registryModule = "AQCovesg1AXUzKXLeRzQFILbjYMKr_rvNLsNhdq5GbYb2Q";
    let data = {
        publicKey,
        dataKey,
    };
    return callModule(registryModule, "readEntry", data);
}
// registryWrite will perform a registry write on a portal.
//
// registryWrite is not considered a safe function, there are easy ways to
// misuse registryWrite such that user data will be lost. We recommend using a
// safe set of functions for writing to the registry such as getsetjson.
function registryWrite(keypair, dataKey, entryData, revision) {
    return new Promise((resolve) => {
        let registryModule = "AQCovesg1AXUzKXLeRzQFILbjYMKr_rvNLsNhdq5GbYb2Q";
        let callData = {
            publicKey: keypair.publicKey,
            secretKey: keypair.secretKey,
            dataKey,
            entryData,
            revision,
        };
        callModule(registryModule, "writeEntry", callData).then(([result, err]) => {
            if (err !== null) {
                resolve(["", err]);
                return;
            }
            resolve([result.entryID, null]);
        });
    });
}

// upload will take a filename and some file data and perform a secure upload
// to Skynet. All data is verified and the correct Skylink is returned. This
// function cannot fully guarantee that the data was pinned, but it can fully
// guarantee that the final skylink matches the data that was presented for the
// upload.
function upload(filename, fileData) {
    return new Promise((resolve) => {
        // Prepare the module call.
        let uploadModule = "AQAT_a0MzOInZoJzt1CwBM2U8oQ3GIfP5yKKJu8Un-SfNg";
        let data = {
            filename,
            fileData,
        };
        callModule(uploadModule, "secureUpload", data).then(([result, err]) => {
            // Pull the skylink out of the result.
            if (err !== null) {
                resolve(["", addContextToErr(err, "uable to complete upload")]);
                return;
            }
            resolve([result.skylink, null]);
        });
    });
}

// kernelVersion will fetch the version number of the kernel. If successful,
// the returned value will be an object containing a field 'version' with a
// version string, and a 'distribtion' field with a string that states the
// distribution of the kernel".
function kernelVersion() {
    return new Promise((resolve) => {
        let [, query] = newKernelQuery("version", {}, false);
        query.then(([result, err]) => {
            if (err !== null) {
                resolve(["", "", err]);
                return;
            }
            resolve([result.version, result.distribution, err]);
        });
    });
}

var dist = /*#__PURE__*/Object.freeze({
	__proto__: null,
	kernelLoaded: kernelLoaded,
	loginComplete: loginComplete,
	logoutComplete: logoutComplete,
	openAuthWindow: openAuthWindow,
	download: download,
	registryRead: registryRead,
	registryWrite: registryWrite,
	upload: upload,
	kernelVersion: kernelVersion,
	callModule: callModule,
	connectModule: connectModule,
	init: init,
	newKernelQuery: newKernelQuery,
	addContextToErr: addContextToErr,
	composeErr: composeErr
});

var require$$5 = /*@__PURE__*/getAugmentedNamespace(dist);

var require$$2 = {
	"application/andrew-inset": [
	"ez"
],
	"application/applixware": [
	"aw"
],
	"application/atom+xml": [
	"atom"
],
	"application/atomcat+xml": [
	"atomcat"
],
	"application/atomsvc+xml": [
	"atomsvc"
],
	"application/bdoc": [
	"bdoc"
],
	"application/ccxml+xml": [
	"ccxml"
],
	"application/cdmi-capability": [
	"cdmia"
],
	"application/cdmi-container": [
	"cdmic"
],
	"application/cdmi-domain": [
	"cdmid"
],
	"application/cdmi-object": [
	"cdmio"
],
	"application/cdmi-queue": [
	"cdmiq"
],
	"application/cu-seeme": [
	"cu"
],
	"application/dash+xml": [
	"mpd"
],
	"application/davmount+xml": [
	"davmount"
],
	"application/docbook+xml": [
	"dbk"
],
	"application/dssc+der": [
	"dssc"
],
	"application/dssc+xml": [
	"xdssc"
],
	"application/ecmascript": [
	"ecma"
],
	"application/emma+xml": [
	"emma"
],
	"application/epub+zip": [
	"epub"
],
	"application/exi": [
	"exi"
],
	"application/font-tdpfr": [
	"pfr"
],
	"application/font-woff": [
],
	"application/font-woff2": [
],
	"application/geo+json": [
	"geojson"
],
	"application/gml+xml": [
	"gml"
],
	"application/gpx+xml": [
	"gpx"
],
	"application/gxf": [
	"gxf"
],
	"application/gzip": [
	"gz"
],
	"application/hyperstudio": [
	"stk"
],
	"application/inkml+xml": [
	"ink",
	"inkml"
],
	"application/ipfix": [
	"ipfix"
],
	"application/java-archive": [
	"jar",
	"war",
	"ear"
],
	"application/java-serialized-object": [
	"ser"
],
	"application/java-vm": [
	"class"
],
	"application/javascript": [
	"js",
	"mjs"
],
	"application/json": [
	"json",
	"map"
],
	"application/json5": [
	"json5"
],
	"application/jsonml+json": [
	"jsonml"
],
	"application/ld+json": [
	"jsonld"
],
	"application/lost+xml": [
	"lostxml"
],
	"application/mac-binhex40": [
	"hqx"
],
	"application/mac-compactpro": [
	"cpt"
],
	"application/mads+xml": [
	"mads"
],
	"application/manifest+json": [
	"webmanifest"
],
	"application/marc": [
	"mrc"
],
	"application/marcxml+xml": [
	"mrcx"
],
	"application/mathematica": [
	"ma",
	"nb",
	"mb"
],
	"application/mathml+xml": [
	"mathml"
],
	"application/mbox": [
	"mbox"
],
	"application/mediaservercontrol+xml": [
	"mscml"
],
	"application/metalink+xml": [
	"metalink"
],
	"application/metalink4+xml": [
	"meta4"
],
	"application/mets+xml": [
	"mets"
],
	"application/mods+xml": [
	"mods"
],
	"application/mp21": [
	"m21",
	"mp21"
],
	"application/mp4": [
	"mp4s",
	"m4p"
],
	"application/msword": [
	"doc",
	"dot"
],
	"application/mxf": [
	"mxf"
],
	"application/octet-stream": [
	"bin",
	"dms",
	"lrf",
	"mar",
	"so",
	"dist",
	"distz",
	"pkg",
	"bpk",
	"dump",
	"elc",
	"deploy",
	"exe",
	"dll",
	"deb",
	"dmg",
	"iso",
	"img",
	"msi",
	"msp",
	"msm",
	"buffer"
],
	"application/oda": [
	"oda"
],
	"application/oebps-package+xml": [
	"opf"
],
	"application/ogg": [
	"ogx"
],
	"application/omdoc+xml": [
	"omdoc"
],
	"application/onenote": [
	"onetoc",
	"onetoc2",
	"onetmp",
	"onepkg"
],
	"application/oxps": [
	"oxps"
],
	"application/patch-ops-error+xml": [
	"xer"
],
	"application/pdf": [
	"pdf"
],
	"application/pgp-encrypted": [
	"pgp"
],
	"application/pgp-signature": [
	"asc",
	"sig"
],
	"application/pics-rules": [
	"prf"
],
	"application/pkcs10": [
	"p10"
],
	"application/pkcs7-mime": [
	"p7m",
	"p7c"
],
	"application/pkcs7-signature": [
	"p7s"
],
	"application/pkcs8": [
	"p8"
],
	"application/pkix-attr-cert": [
	"ac"
],
	"application/pkix-cert": [
	"cer"
],
	"application/pkix-crl": [
	"crl"
],
	"application/pkix-pkipath": [
	"pkipath"
],
	"application/pkixcmp": [
	"pki"
],
	"application/pls+xml": [
	"pls"
],
	"application/postscript": [
	"ai",
	"eps",
	"ps"
],
	"application/prs.cww": [
	"cww"
],
	"application/pskc+xml": [
	"pskcxml"
],
	"application/raml+yaml": [
	"raml"
],
	"application/rdf+xml": [
	"rdf"
],
	"application/reginfo+xml": [
	"rif"
],
	"application/relax-ng-compact-syntax": [
	"rnc"
],
	"application/resource-lists+xml": [
	"rl"
],
	"application/resource-lists-diff+xml": [
	"rld"
],
	"application/rls-services+xml": [
	"rs"
],
	"application/rpki-ghostbusters": [
	"gbr"
],
	"application/rpki-manifest": [
	"mft"
],
	"application/rpki-roa": [
	"roa"
],
	"application/rsd+xml": [
	"rsd"
],
	"application/rss+xml": [
	"rss"
],
	"application/rtf": [
	"rtf"
],
	"application/sbml+xml": [
	"sbml"
],
	"application/scvp-cv-request": [
	"scq"
],
	"application/scvp-cv-response": [
	"scs"
],
	"application/scvp-vp-request": [
	"spq"
],
	"application/scvp-vp-response": [
	"spp"
],
	"application/sdp": [
	"sdp"
],
	"application/set-payment-initiation": [
	"setpay"
],
	"application/set-registration-initiation": [
	"setreg"
],
	"application/shf+xml": [
	"shf"
],
	"application/smil+xml": [
	"smi",
	"smil"
],
	"application/sparql-query": [
	"rq"
],
	"application/sparql-results+xml": [
	"srx"
],
	"application/srgs": [
	"gram"
],
	"application/srgs+xml": [
	"grxml"
],
	"application/sru+xml": [
	"sru"
],
	"application/ssdl+xml": [
	"ssdl"
],
	"application/ssml+xml": [
	"ssml"
],
	"application/tei+xml": [
	"tei",
	"teicorpus"
],
	"application/thraud+xml": [
	"tfi"
],
	"application/timestamped-data": [
	"tsd"
],
	"application/vnd.3gpp.pic-bw-large": [
	"plb"
],
	"application/vnd.3gpp.pic-bw-small": [
	"psb"
],
	"application/vnd.3gpp.pic-bw-var": [
	"pvb"
],
	"application/vnd.3gpp2.tcap": [
	"tcap"
],
	"application/vnd.3m.post-it-notes": [
	"pwn"
],
	"application/vnd.accpac.simply.aso": [
	"aso"
],
	"application/vnd.accpac.simply.imp": [
	"imp"
],
	"application/vnd.acucobol": [
	"acu"
],
	"application/vnd.acucorp": [
	"atc",
	"acutc"
],
	"application/vnd.adobe.air-application-installer-package+zip": [
	"air"
],
	"application/vnd.adobe.formscentral.fcdt": [
	"fcdt"
],
	"application/vnd.adobe.fxp": [
	"fxp",
	"fxpl"
],
	"application/vnd.adobe.xdp+xml": [
	"xdp"
],
	"application/vnd.adobe.xfdf": [
	"xfdf"
],
	"application/vnd.ahead.space": [
	"ahead"
],
	"application/vnd.airzip.filesecure.azf": [
	"azf"
],
	"application/vnd.airzip.filesecure.azs": [
	"azs"
],
	"application/vnd.amazon.ebook": [
	"azw"
],
	"application/vnd.americandynamics.acc": [
	"acc"
],
	"application/vnd.amiga.ami": [
	"ami"
],
	"application/vnd.android.package-archive": [
	"apk"
],
	"application/vnd.anser-web-certificate-issue-initiation": [
	"cii"
],
	"application/vnd.anser-web-funds-transfer-initiation": [
	"fti"
],
	"application/vnd.antix.game-component": [
	"atx"
],
	"application/vnd.apple.installer+xml": [
	"mpkg"
],
	"application/vnd.apple.mpegurl": [
	"m3u8"
],
	"application/vnd.apple.pkpass": [
	"pkpass"
],
	"application/vnd.aristanetworks.swi": [
	"swi"
],
	"application/vnd.astraea-software.iota": [
	"iota"
],
	"application/vnd.audiograph": [
	"aep"
],
	"application/vnd.blueice.multipass": [
	"mpm"
],
	"application/vnd.bmi": [
	"bmi"
],
	"application/vnd.businessobjects": [
	"rep"
],
	"application/vnd.chemdraw+xml": [
	"cdxml"
],
	"application/vnd.chipnuts.karaoke-mmd": [
	"mmd"
],
	"application/vnd.cinderella": [
	"cdy"
],
	"application/vnd.claymore": [
	"cla"
],
	"application/vnd.cloanto.rp9": [
	"rp9"
],
	"application/vnd.clonk.c4group": [
	"c4g",
	"c4d",
	"c4f",
	"c4p",
	"c4u"
],
	"application/vnd.cluetrust.cartomobile-config": [
	"c11amc"
],
	"application/vnd.cluetrust.cartomobile-config-pkg": [
	"c11amz"
],
	"application/vnd.commonspace": [
	"csp"
],
	"application/vnd.contact.cmsg": [
	"cdbcmsg"
],
	"application/vnd.cosmocaller": [
	"cmc"
],
	"application/vnd.crick.clicker": [
	"clkx"
],
	"application/vnd.crick.clicker.keyboard": [
	"clkk"
],
	"application/vnd.crick.clicker.palette": [
	"clkp"
],
	"application/vnd.crick.clicker.template": [
	"clkt"
],
	"application/vnd.crick.clicker.wordbank": [
	"clkw"
],
	"application/vnd.criticaltools.wbs+xml": [
	"wbs"
],
	"application/vnd.ctc-posml": [
	"pml"
],
	"application/vnd.cups-ppd": [
	"ppd"
],
	"application/vnd.curl.car": [
	"car"
],
	"application/vnd.curl.pcurl": [
	"pcurl"
],
	"application/vnd.dart": [
	"dart"
],
	"application/vnd.data-vision.rdz": [
	"rdz"
],
	"application/vnd.dece.data": [
	"uvf",
	"uvvf",
	"uvd",
	"uvvd"
],
	"application/vnd.dece.ttml+xml": [
	"uvt",
	"uvvt"
],
	"application/vnd.dece.unspecified": [
	"uvx",
	"uvvx"
],
	"application/vnd.dece.zip": [
	"uvz",
	"uvvz"
],
	"application/vnd.denovo.fcselayout-link": [
	"fe_launch"
],
	"application/vnd.dna": [
	"dna"
],
	"application/vnd.dolby.mlp": [
	"mlp"
],
	"application/vnd.dpgraph": [
	"dpg"
],
	"application/vnd.dreamfactory": [
	"dfac"
],
	"application/vnd.ds-keypoint": [
	"kpxx"
],
	"application/vnd.dvb.ait": [
	"ait"
],
	"application/vnd.dvb.service": [
	"svc"
],
	"application/vnd.dynageo": [
	"geo"
],
	"application/vnd.ecowin.chart": [
	"mag"
],
	"application/vnd.enliven": [
	"nml"
],
	"application/vnd.epson.esf": [
	"esf"
],
	"application/vnd.epson.msf": [
	"msf"
],
	"application/vnd.epson.quickanime": [
	"qam"
],
	"application/vnd.epson.salt": [
	"slt"
],
	"application/vnd.epson.ssf": [
	"ssf"
],
	"application/vnd.eszigno3+xml": [
	"es3",
	"et3"
],
	"application/vnd.ezpix-album": [
	"ez2"
],
	"application/vnd.ezpix-package": [
	"ez3"
],
	"application/vnd.fdf": [
	"fdf"
],
	"application/vnd.fdsn.mseed": [
	"mseed"
],
	"application/vnd.fdsn.seed": [
	"seed",
	"dataless"
],
	"application/vnd.flographit": [
	"gph"
],
	"application/vnd.fluxtime.clip": [
	"ftc"
],
	"application/vnd.framemaker": [
	"fm",
	"frame",
	"maker",
	"book"
],
	"application/vnd.frogans.fnc": [
	"fnc"
],
	"application/vnd.frogans.ltf": [
	"ltf"
],
	"application/vnd.fsc.weblaunch": [
	"fsc"
],
	"application/vnd.fujitsu.oasys": [
	"oas"
],
	"application/vnd.fujitsu.oasys2": [
	"oa2"
],
	"application/vnd.fujitsu.oasys3": [
	"oa3"
],
	"application/vnd.fujitsu.oasysgp": [
	"fg5"
],
	"application/vnd.fujitsu.oasysprs": [
	"bh2"
],
	"application/vnd.fujixerox.ddd": [
	"ddd"
],
	"application/vnd.fujixerox.docuworks": [
	"xdw"
],
	"application/vnd.fujixerox.docuworks.binder": [
	"xbd"
],
	"application/vnd.fuzzysheet": [
	"fzs"
],
	"application/vnd.genomatix.tuxedo": [
	"txd"
],
	"application/vnd.geogebra.file": [
	"ggb"
],
	"application/vnd.geogebra.tool": [
	"ggt"
],
	"application/vnd.geometry-explorer": [
	"gex",
	"gre"
],
	"application/vnd.geonext": [
	"gxt"
],
	"application/vnd.geoplan": [
	"g2w"
],
	"application/vnd.geospace": [
	"g3w"
],
	"application/vnd.gmx": [
	"gmx"
],
	"application/vnd.google-apps.document": [
	"gdoc"
],
	"application/vnd.google-apps.presentation": [
	"gslides"
],
	"application/vnd.google-apps.spreadsheet": [
	"gsheet"
],
	"application/vnd.google-earth.kml+xml": [
	"kml"
],
	"application/vnd.google-earth.kmz": [
	"kmz"
],
	"application/vnd.grafeq": [
	"gqf",
	"gqs"
],
	"application/vnd.groove-account": [
	"gac"
],
	"application/vnd.groove-help": [
	"ghf"
],
	"application/vnd.groove-identity-message": [
	"gim"
],
	"application/vnd.groove-injector": [
	"grv"
],
	"application/vnd.groove-tool-message": [
	"gtm"
],
	"application/vnd.groove-tool-template": [
	"tpl"
],
	"application/vnd.groove-vcard": [
	"vcg"
],
	"application/vnd.hal+xml": [
	"hal"
],
	"application/vnd.handheld-entertainment+xml": [
	"zmm"
],
	"application/vnd.hbci": [
	"hbci"
],
	"application/vnd.hhe.lesson-player": [
	"les"
],
	"application/vnd.hp-hpgl": [
	"hpgl"
],
	"application/vnd.hp-hpid": [
	"hpid"
],
	"application/vnd.hp-hps": [
	"hps"
],
	"application/vnd.hp-jlyt": [
	"jlt"
],
	"application/vnd.hp-pcl": [
	"pcl"
],
	"application/vnd.hp-pclxl": [
	"pclxl"
],
	"application/vnd.hydrostatix.sof-data": [
	"sfd-hdstx"
],
	"application/vnd.ibm.minipay": [
	"mpy"
],
	"application/vnd.ibm.modcap": [
	"afp",
	"listafp",
	"list3820"
],
	"application/vnd.ibm.rights-management": [
	"irm"
],
	"application/vnd.ibm.secure-container": [
	"sc"
],
	"application/vnd.iccprofile": [
	"icc",
	"icm"
],
	"application/vnd.igloader": [
	"igl"
],
	"application/vnd.immervision-ivp": [
	"ivp"
],
	"application/vnd.immervision-ivu": [
	"ivu"
],
	"application/vnd.insors.igm": [
	"igm"
],
	"application/vnd.intercon.formnet": [
	"xpw",
	"xpx"
],
	"application/vnd.intergeo": [
	"i2g"
],
	"application/vnd.intu.qbo": [
	"qbo"
],
	"application/vnd.intu.qfx": [
	"qfx"
],
	"application/vnd.ipunplugged.rcprofile": [
	"rcprofile"
],
	"application/vnd.irepository.package+xml": [
	"irp"
],
	"application/vnd.is-xpr": [
	"xpr"
],
	"application/vnd.isac.fcs": [
	"fcs"
],
	"application/vnd.jam": [
	"jam"
],
	"application/vnd.jcp.javame.midlet-rms": [
	"rms"
],
	"application/vnd.jisp": [
	"jisp"
],
	"application/vnd.joost.joda-archive": [
	"joda"
],
	"application/vnd.kahootz": [
	"ktz",
	"ktr"
],
	"application/vnd.kde.karbon": [
	"karbon"
],
	"application/vnd.kde.kchart": [
	"chrt"
],
	"application/vnd.kde.kformula": [
	"kfo"
],
	"application/vnd.kde.kivio": [
	"flw"
],
	"application/vnd.kde.kontour": [
	"kon"
],
	"application/vnd.kde.kpresenter": [
	"kpr",
	"kpt"
],
	"application/vnd.kde.kspread": [
	"ksp"
],
	"application/vnd.kde.kword": [
	"kwd",
	"kwt"
],
	"application/vnd.kenameaapp": [
	"htke"
],
	"application/vnd.kidspiration": [
	"kia"
],
	"application/vnd.kinar": [
	"kne",
	"knp"
],
	"application/vnd.koan": [
	"skp",
	"skd",
	"skt",
	"skm"
],
	"application/vnd.kodak-descriptor": [
	"sse"
],
	"application/vnd.las.las+xml": [
	"lasxml"
],
	"application/vnd.llamagraphics.life-balance.desktop": [
	"lbd"
],
	"application/vnd.llamagraphics.life-balance.exchange+xml": [
	"lbe"
],
	"application/vnd.lotus-1-2-3": [
	"123"
],
	"application/vnd.lotus-approach": [
	"apr"
],
	"application/vnd.lotus-freelance": [
	"pre"
],
	"application/vnd.lotus-notes": [
	"nsf"
],
	"application/vnd.lotus-organizer": [
	"org"
],
	"application/vnd.lotus-screencam": [
	"scm"
],
	"application/vnd.lotus-wordpro": [
	"lwp"
],
	"application/vnd.macports.portpkg": [
	"portpkg"
],
	"application/vnd.mcd": [
	"mcd"
],
	"application/vnd.medcalcdata": [
	"mc1"
],
	"application/vnd.mediastation.cdkey": [
	"cdkey"
],
	"application/vnd.mfer": [
	"mwf"
],
	"application/vnd.mfmp": [
	"mfm"
],
	"application/vnd.micrografx.flo": [
	"flo"
],
	"application/vnd.micrografx.igx": [
	"igx"
],
	"application/vnd.mif": [
	"mif"
],
	"application/vnd.mobius.daf": [
	"daf"
],
	"application/vnd.mobius.dis": [
	"dis"
],
	"application/vnd.mobius.mbk": [
	"mbk"
],
	"application/vnd.mobius.mqy": [
	"mqy"
],
	"application/vnd.mobius.msl": [
	"msl"
],
	"application/vnd.mobius.plc": [
	"plc"
],
	"application/vnd.mobius.txf": [
	"txf"
],
	"application/vnd.mophun.application": [
	"mpn"
],
	"application/vnd.mophun.certificate": [
	"mpc"
],
	"application/vnd.mozilla.xul+xml": [
	"xul"
],
	"application/vnd.ms-artgalry": [
	"cil"
],
	"application/vnd.ms-cab-compressed": [
	"cab"
],
	"application/vnd.ms-excel": [
	"xls",
	"xlm",
	"xla",
	"xlc",
	"xlt",
	"xlw"
],
	"application/vnd.ms-excel.addin.macroenabled.12": [
	"xlam"
],
	"application/vnd.ms-excel.sheet.binary.macroenabled.12": [
	"xlsb"
],
	"application/vnd.ms-excel.sheet.macroenabled.12": [
	"xlsm"
],
	"application/vnd.ms-excel.template.macroenabled.12": [
	"xltm"
],
	"application/vnd.ms-fontobject": [
	"eot"
],
	"application/vnd.ms-htmlhelp": [
	"chm"
],
	"application/vnd.ms-ims": [
	"ims"
],
	"application/vnd.ms-lrm": [
	"lrm"
],
	"application/vnd.ms-officetheme": [
	"thmx"
],
	"application/vnd.ms-outlook": [
	"msg"
],
	"application/vnd.ms-pki.seccat": [
	"cat"
],
	"application/vnd.ms-pki.stl": [
	"stl"
],
	"application/vnd.ms-powerpoint": [
	"ppt",
	"pps",
	"pot"
],
	"application/vnd.ms-powerpoint.addin.macroenabled.12": [
	"ppam"
],
	"application/vnd.ms-powerpoint.presentation.macroenabled.12": [
	"pptm"
],
	"application/vnd.ms-powerpoint.slide.macroenabled.12": [
	"sldm"
],
	"application/vnd.ms-powerpoint.slideshow.macroenabled.12": [
	"ppsm"
],
	"application/vnd.ms-powerpoint.template.macroenabled.12": [
	"potm"
],
	"application/vnd.ms-project": [
	"mpp",
	"mpt"
],
	"application/vnd.ms-word.document.macroenabled.12": [
	"docm"
],
	"application/vnd.ms-word.template.macroenabled.12": [
	"dotm"
],
	"application/vnd.ms-works": [
	"wps",
	"wks",
	"wcm",
	"wdb"
],
	"application/vnd.ms-wpl": [
	"wpl"
],
	"application/vnd.ms-xpsdocument": [
	"xps"
],
	"application/vnd.mseq": [
	"mseq"
],
	"application/vnd.musician": [
	"mus"
],
	"application/vnd.muvee.style": [
	"msty"
],
	"application/vnd.mynfc": [
	"taglet"
],
	"application/vnd.neurolanguage.nlu": [
	"nlu"
],
	"application/vnd.nitf": [
	"ntf",
	"nitf"
],
	"application/vnd.noblenet-directory": [
	"nnd"
],
	"application/vnd.noblenet-sealer": [
	"nns"
],
	"application/vnd.noblenet-web": [
	"nnw"
],
	"application/vnd.nokia.n-gage.data": [
	"ngdat"
],
	"application/vnd.nokia.n-gage.symbian.install": [
	"n-gage"
],
	"application/vnd.nokia.radio-preset": [
	"rpst"
],
	"application/vnd.nokia.radio-presets": [
	"rpss"
],
	"application/vnd.novadigm.edm": [
	"edm"
],
	"application/vnd.novadigm.edx": [
	"edx"
],
	"application/vnd.novadigm.ext": [
	"ext"
],
	"application/vnd.oasis.opendocument.chart": [
	"odc"
],
	"application/vnd.oasis.opendocument.chart-template": [
	"otc"
],
	"application/vnd.oasis.opendocument.database": [
	"odb"
],
	"application/vnd.oasis.opendocument.formula": [
	"odf"
],
	"application/vnd.oasis.opendocument.formula-template": [
	"odft"
],
	"application/vnd.oasis.opendocument.graphics": [
	"odg"
],
	"application/vnd.oasis.opendocument.graphics-template": [
	"otg"
],
	"application/vnd.oasis.opendocument.image": [
	"odi"
],
	"application/vnd.oasis.opendocument.image-template": [
	"oti"
],
	"application/vnd.oasis.opendocument.presentation": [
	"odp"
],
	"application/vnd.oasis.opendocument.presentation-template": [
	"otp"
],
	"application/vnd.oasis.opendocument.spreadsheet": [
	"ods"
],
	"application/vnd.oasis.opendocument.spreadsheet-template": [
	"ots"
],
	"application/vnd.oasis.opendocument.text": [
	"odt"
],
	"application/vnd.oasis.opendocument.text-master": [
	"odm"
],
	"application/vnd.oasis.opendocument.text-template": [
	"ott"
],
	"application/vnd.oasis.opendocument.text-web": [
	"oth"
],
	"application/vnd.olpc-sugar": [
	"xo"
],
	"application/vnd.oma.dd2+xml": [
	"dd2"
],
	"application/vnd.openofficeorg.extension": [
	"oxt"
],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [
	"pptx"
],
	"application/vnd.openxmlformats-officedocument.presentationml.slide": [
	"sldx"
],
	"application/vnd.openxmlformats-officedocument.presentationml.slideshow": [
	"ppsx"
],
	"application/vnd.openxmlformats-officedocument.presentationml.template": [
	"potx"
],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
	"xlsx"
],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.template": [
	"xltx"
],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
	"docx"
],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.template": [
	"dotx"
],
	"application/vnd.osgeo.mapguide.package": [
	"mgp"
],
	"application/vnd.osgi.dp": [
	"dp"
],
	"application/vnd.osgi.subsystem": [
	"esa"
],
	"application/vnd.palm": [
	"pdb",
	"pqa",
	"oprc"
],
	"application/vnd.pawaafile": [
	"paw"
],
	"application/vnd.pg.format": [
	"str"
],
	"application/vnd.pg.osasli": [
	"ei6"
],
	"application/vnd.picsel": [
	"efif"
],
	"application/vnd.pmi.widget": [
	"wg"
],
	"application/vnd.pocketlearn": [
	"plf"
],
	"application/vnd.powerbuilder6": [
	"pbd"
],
	"application/vnd.previewsystems.box": [
	"box"
],
	"application/vnd.proteus.magazine": [
	"mgz"
],
	"application/vnd.publishare-delta-tree": [
	"qps"
],
	"application/vnd.pvi.ptid1": [
	"ptid"
],
	"application/vnd.quark.quarkxpress": [
	"qxd",
	"qxt",
	"qwd",
	"qwt",
	"qxl",
	"qxb"
],
	"application/vnd.realvnc.bed": [
	"bed"
],
	"application/vnd.recordare.musicxml": [
	"mxl"
],
	"application/vnd.recordare.musicxml+xml": [
	"musicxml"
],
	"application/vnd.rig.cryptonote": [
	"cryptonote"
],
	"application/vnd.rim.cod": [
	"cod"
],
	"application/vnd.rn-realmedia": [
	"rm"
],
	"application/vnd.rn-realmedia-vbr": [
	"rmvb"
],
	"application/vnd.route66.link66+xml": [
	"link66"
],
	"application/vnd.sailingtracker.track": [
	"st"
],
	"application/vnd.seemail": [
	"see"
],
	"application/vnd.sema": [
	"sema"
],
	"application/vnd.semd": [
	"semd"
],
	"application/vnd.semf": [
	"semf"
],
	"application/vnd.shana.informed.formdata": [
	"ifm"
],
	"application/vnd.shana.informed.formtemplate": [
	"itp"
],
	"application/vnd.shana.informed.interchange": [
	"iif"
],
	"application/vnd.shana.informed.package": [
	"ipk"
],
	"application/vnd.simtech-mindmapper": [
	"twd",
	"twds"
],
	"application/vnd.smaf": [
	"mmf"
],
	"application/vnd.smart.teacher": [
	"teacher"
],
	"application/vnd.solent.sdkm+xml": [
	"sdkm",
	"sdkd"
],
	"application/vnd.spotfire.dxp": [
	"dxp"
],
	"application/vnd.spotfire.sfs": [
	"sfs"
],
	"application/vnd.stardivision.calc": [
	"sdc"
],
	"application/vnd.stardivision.draw": [
	"sda"
],
	"application/vnd.stardivision.impress": [
	"sdd"
],
	"application/vnd.stardivision.math": [
	"smf"
],
	"application/vnd.stardivision.writer": [
	"sdw",
	"vor"
],
	"application/vnd.stardivision.writer-global": [
	"sgl"
],
	"application/vnd.stepmania.package": [
	"smzip"
],
	"application/vnd.stepmania.stepchart": [
	"sm"
],
	"application/vnd.sun.wadl+xml": [
	"wadl"
],
	"application/vnd.sun.xml.calc": [
	"sxc"
],
	"application/vnd.sun.xml.calc.template": [
	"stc"
],
	"application/vnd.sun.xml.draw": [
	"sxd"
],
	"application/vnd.sun.xml.draw.template": [
	"std"
],
	"application/vnd.sun.xml.impress": [
	"sxi"
],
	"application/vnd.sun.xml.impress.template": [
	"sti"
],
	"application/vnd.sun.xml.math": [
	"sxm"
],
	"application/vnd.sun.xml.writer": [
	"sxw"
],
	"application/vnd.sun.xml.writer.global": [
	"sxg"
],
	"application/vnd.sun.xml.writer.template": [
	"stw"
],
	"application/vnd.sus-calendar": [
	"sus",
	"susp"
],
	"application/vnd.svd": [
	"svd"
],
	"application/vnd.symbian.install": [
	"sis",
	"sisx"
],
	"application/vnd.syncml+xml": [
	"xsm"
],
	"application/vnd.syncml.dm+wbxml": [
	"bdm"
],
	"application/vnd.syncml.dm+xml": [
	"xdm"
],
	"application/vnd.tao.intent-module-archive": [
	"tao"
],
	"application/vnd.tcpdump.pcap": [
	"pcap",
	"cap",
	"dmp"
],
	"application/vnd.tmobile-livetv": [
	"tmo"
],
	"application/vnd.trid.tpt": [
	"tpt"
],
	"application/vnd.triscape.mxs": [
	"mxs"
],
	"application/vnd.trueapp": [
	"tra"
],
	"application/vnd.ufdl": [
	"ufd",
	"ufdl"
],
	"application/vnd.uiq.theme": [
	"utz"
],
	"application/vnd.umajin": [
	"umj"
],
	"application/vnd.unity": [
	"unityweb"
],
	"application/vnd.uoml+xml": [
	"uoml"
],
	"application/vnd.vcx": [
	"vcx"
],
	"application/vnd.visio": [
	"vsd",
	"vst",
	"vss",
	"vsw"
],
	"application/vnd.visionary": [
	"vis"
],
	"application/vnd.vsf": [
	"vsf"
],
	"application/vnd.wap.wbxml": [
	"wbxml"
],
	"application/vnd.wap.wmlc": [
	"wmlc"
],
	"application/vnd.wap.wmlscriptc": [
	"wmlsc"
],
	"application/vnd.webturbo": [
	"wtb"
],
	"application/vnd.wolfram.player": [
	"nbp"
],
	"application/vnd.wordperfect": [
	"wpd"
],
	"application/vnd.wqd": [
	"wqd"
],
	"application/vnd.wt.stf": [
	"stf"
],
	"application/vnd.xara": [
	"xar"
],
	"application/vnd.xfdl": [
	"xfdl"
],
	"application/vnd.yamaha.hv-dic": [
	"hvd"
],
	"application/vnd.yamaha.hv-script": [
	"hvs"
],
	"application/vnd.yamaha.hv-voice": [
	"hvp"
],
	"application/vnd.yamaha.openscoreformat": [
	"osf"
],
	"application/vnd.yamaha.openscoreformat.osfpvg+xml": [
	"osfpvg"
],
	"application/vnd.yamaha.smaf-audio": [
	"saf"
],
	"application/vnd.yamaha.smaf-phrase": [
	"spf"
],
	"application/vnd.yellowriver-custom-menu": [
	"cmp"
],
	"application/vnd.zul": [
	"zir",
	"zirz"
],
	"application/vnd.zzazz.deck+xml": [
	"zaz"
],
	"application/voicexml+xml": [
	"vxml"
],
	"application/wasm": [
	"wasm"
],
	"application/widget": [
	"wgt"
],
	"application/winhlp": [
	"hlp"
],
	"application/wsdl+xml": [
	"wsdl"
],
	"application/wspolicy+xml": [
	"wspolicy"
],
	"application/x-7z-compressed": [
	"7z"
],
	"application/x-abiword": [
	"abw"
],
	"application/x-ace-compressed": [
	"ace"
],
	"application/x-apple-diskimage": [
],
	"application/x-arj": [
	"arj"
],
	"application/x-authorware-bin": [
	"aab",
	"x32",
	"u32",
	"vox"
],
	"application/x-authorware-map": [
	"aam"
],
	"application/x-authorware-seg": [
	"aas"
],
	"application/x-bcpio": [
	"bcpio"
],
	"application/x-bdoc": [
],
	"application/x-bittorrent": [
	"torrent"
],
	"application/x-blorb": [
	"blb",
	"blorb"
],
	"application/x-bzip": [
	"bz"
],
	"application/x-bzip2": [
	"bz2",
	"boz"
],
	"application/x-cbr": [
	"cbr",
	"cba",
	"cbt",
	"cbz",
	"cb7"
],
	"application/x-cdlink": [
	"vcd"
],
	"application/x-cfs-compressed": [
	"cfs"
],
	"application/x-chat": [
	"chat"
],
	"application/x-chess-pgn": [
	"pgn"
],
	"application/x-chrome-extension": [
	"crx"
],
	"application/x-cocoa": [
	"cco"
],
	"application/x-conference": [
	"nsc"
],
	"application/x-cpio": [
	"cpio"
],
	"application/x-csh": [
	"csh"
],
	"application/x-debian-package": [
	"udeb"
],
	"application/x-dgc-compressed": [
	"dgc"
],
	"application/x-director": [
	"dir",
	"dcr",
	"dxr",
	"cst",
	"cct",
	"cxt",
	"w3d",
	"fgd",
	"swa"
],
	"application/x-doom": [
	"wad"
],
	"application/x-dtbncx+xml": [
	"ncx"
],
	"application/x-dtbook+xml": [
	"dtb"
],
	"application/x-dtbresource+xml": [
	"res"
],
	"application/x-dvi": [
	"dvi"
],
	"application/x-envoy": [
	"evy"
],
	"application/x-eva": [
	"eva"
],
	"application/x-font-bdf": [
	"bdf"
],
	"application/x-font-ghostscript": [
	"gsf"
],
	"application/x-font-linux-psf": [
	"psf"
],
	"application/x-font-pcf": [
	"pcf"
],
	"application/x-font-snf": [
	"snf"
],
	"application/x-font-type1": [
	"pfa",
	"pfb",
	"pfm",
	"afm"
],
	"application/x-freearc": [
	"arc"
],
	"application/x-futuresplash": [
	"spl"
],
	"application/x-gca-compressed": [
	"gca"
],
	"application/x-glulx": [
	"ulx"
],
	"application/x-gnumeric": [
	"gnumeric"
],
	"application/x-gramps-xml": [
	"gramps"
],
	"application/x-gtar": [
	"gtar"
],
	"application/x-hdf": [
	"hdf"
],
	"application/x-httpd-php": [
	"php"
],
	"application/x-install-instructions": [
	"install"
],
	"application/x-iso9660-image": [
],
	"application/x-java-archive-diff": [
	"jardiff"
],
	"application/x-java-jnlp-file": [
	"jnlp"
],
	"application/x-latex": [
	"latex"
],
	"application/x-lua-bytecode": [
	"luac"
],
	"application/x-lzh-compressed": [
	"lzh",
	"lha"
],
	"application/x-makeself": [
	"run"
],
	"application/x-mie": [
	"mie"
],
	"application/x-mobipocket-ebook": [
	"prc",
	"mobi"
],
	"application/x-ms-application": [
	"application"
],
	"application/x-ms-shortcut": [
	"lnk"
],
	"application/x-ms-wmd": [
	"wmd"
],
	"application/x-ms-wmz": [
	"wmz"
],
	"application/x-ms-xbap": [
	"xbap"
],
	"application/x-msaccess": [
	"mdb"
],
	"application/x-msbinder": [
	"obd"
],
	"application/x-mscardfile": [
	"crd"
],
	"application/x-msclip": [
	"clp"
],
	"application/x-msdos-program": [
],
	"application/x-msdownload": [
	"com",
	"bat"
],
	"application/x-msmediaview": [
	"mvb",
	"m13",
	"m14"
],
	"application/x-msmetafile": [
	"wmf",
	"emf",
	"emz"
],
	"application/x-msmoney": [
	"mny"
],
	"application/x-mspublisher": [
	"pub"
],
	"application/x-msschedule": [
	"scd"
],
	"application/x-msterminal": [
	"trm"
],
	"application/x-mswrite": [
	"wri"
],
	"application/x-netcdf": [
	"nc",
	"cdf"
],
	"application/x-ns-proxy-autoconfig": [
	"pac"
],
	"application/x-nzb": [
	"nzb"
],
	"application/x-perl": [
	"pl",
	"pm"
],
	"application/x-pilot": [
],
	"application/x-pkcs12": [
	"p12",
	"pfx"
],
	"application/x-pkcs7-certificates": [
	"p7b",
	"spc"
],
	"application/x-pkcs7-certreqresp": [
	"p7r"
],
	"application/x-rar-compressed": [
	"rar"
],
	"application/x-redhat-package-manager": [
	"rpm"
],
	"application/x-research-info-systems": [
	"ris"
],
	"application/x-sea": [
	"sea"
],
	"application/x-sh": [
	"sh"
],
	"application/x-shar": [
	"shar"
],
	"application/x-shockwave-flash": [
	"swf"
],
	"application/x-silverlight-app": [
	"xap"
],
	"application/x-sql": [
	"sql"
],
	"application/x-stuffit": [
	"sit"
],
	"application/x-stuffitx": [
	"sitx"
],
	"application/x-subrip": [
	"srt"
],
	"application/x-sv4cpio": [
	"sv4cpio"
],
	"application/x-sv4crc": [
	"sv4crc"
],
	"application/x-t3vm-image": [
	"t3"
],
	"application/x-tads": [
	"gam"
],
	"application/x-tar": [
	"tar"
],
	"application/x-tcl": [
	"tcl",
	"tk"
],
	"application/x-tex": [
	"tex"
],
	"application/x-tex-tfm": [
	"tfm"
],
	"application/x-texinfo": [
	"texinfo",
	"texi"
],
	"application/x-tgif": [
	"obj"
],
	"application/x-ustar": [
	"ustar"
],
	"application/x-virtualbox-hdd": [
	"hdd"
],
	"application/x-virtualbox-ova": [
	"ova"
],
	"application/x-virtualbox-ovf": [
	"ovf"
],
	"application/x-virtualbox-vbox": [
	"vbox"
],
	"application/x-virtualbox-vbox-extpack": [
	"vbox-extpack"
],
	"application/x-virtualbox-vdi": [
	"vdi"
],
	"application/x-virtualbox-vhd": [
	"vhd"
],
	"application/x-virtualbox-vmdk": [
	"vmdk"
],
	"application/x-wais-source": [
	"src"
],
	"application/x-web-app-manifest+json": [
	"webapp"
],
	"application/x-x509-ca-cert": [
	"der",
	"crt",
	"pem"
],
	"application/x-xfig": [
	"fig"
],
	"application/x-xliff+xml": [
	"xlf"
],
	"application/x-xpinstall": [
	"xpi"
],
	"application/x-xz": [
	"xz"
],
	"application/x-zmachine": [
	"z1",
	"z2",
	"z3",
	"z4",
	"z5",
	"z6",
	"z7",
	"z8"
],
	"application/xaml+xml": [
	"xaml"
],
	"application/xcap-diff+xml": [
	"xdf"
],
	"application/xenc+xml": [
	"xenc"
],
	"application/xhtml+xml": [
	"xhtml",
	"xht"
],
	"application/xml": [
	"xml",
	"xsl",
	"xsd",
	"rng"
],
	"application/xml-dtd": [
	"dtd"
],
	"application/xop+xml": [
	"xop"
],
	"application/xproc+xml": [
	"xpl"
],
	"application/xslt+xml": [
	"xslt"
],
	"application/xspf+xml": [
	"xspf"
],
	"application/xv+xml": [
	"mxml",
	"xhvml",
	"xvml",
	"xvm"
],
	"application/yang": [
	"yang"
],
	"application/yin+xml": [
	"yin"
],
	"application/zip": [
	"zip"
],
	"audio/3gpp": [
],
	"audio/adpcm": [
	"adp"
],
	"audio/basic": [
	"au",
	"snd"
],
	"audio/midi": [
	"mid",
	"midi",
	"kar",
	"rmi"
],
	"audio/mp3": [
],
	"audio/mp4": [
	"m4a",
	"mp4a"
],
	"audio/mpeg": [
	"mpga",
	"mp2",
	"mp2a",
	"mp3",
	"m2a",
	"m3a"
],
	"audio/ogg": [
	"oga",
	"ogg",
	"spx"
],
	"audio/s3m": [
	"s3m"
],
	"audio/silk": [
	"sil"
],
	"audio/vnd.dece.audio": [
	"uva",
	"uvva"
],
	"audio/vnd.digital-winds": [
	"eol"
],
	"audio/vnd.dra": [
	"dra"
],
	"audio/vnd.dts": [
	"dts"
],
	"audio/vnd.dts.hd": [
	"dtshd"
],
	"audio/vnd.lucent.voice": [
	"lvp"
],
	"audio/vnd.ms-playready.media.pya": [
	"pya"
],
	"audio/vnd.nuera.ecelp4800": [
	"ecelp4800"
],
	"audio/vnd.nuera.ecelp7470": [
	"ecelp7470"
],
	"audio/vnd.nuera.ecelp9600": [
	"ecelp9600"
],
	"audio/vnd.rip": [
	"rip"
],
	"audio/wav": [
	"wav"
],
	"audio/wave": [
],
	"audio/webm": [
	"weba"
],
	"audio/x-aac": [
	"aac"
],
	"audio/x-aiff": [
	"aif",
	"aiff",
	"aifc"
],
	"audio/x-caf": [
	"caf"
],
	"audio/x-flac": [
	"flac"
],
	"audio/x-m4a": [
],
	"audio/x-matroska": [
	"mka"
],
	"audio/x-mpegurl": [
	"m3u"
],
	"audio/x-ms-wax": [
	"wax"
],
	"audio/x-ms-wma": [
	"wma"
],
	"audio/x-pn-realaudio": [
	"ram",
	"ra"
],
	"audio/x-pn-realaudio-plugin": [
	"rmp"
],
	"audio/x-realaudio": [
],
	"audio/x-wav": [
],
	"audio/xm": [
	"xm"
],
	"chemical/x-cdx": [
	"cdx"
],
	"chemical/x-cif": [
	"cif"
],
	"chemical/x-cmdf": [
	"cmdf"
],
	"chemical/x-cml": [
	"cml"
],
	"chemical/x-csml": [
	"csml"
],
	"chemical/x-xyz": [
	"xyz"
],
	"font/collection": [
	"ttc"
],
	"font/otf": [
	"otf"
],
	"font/ttf": [
	"ttf"
],
	"font/woff": [
	"woff"
],
	"font/woff2": [
	"woff2"
],
	"image/apng": [
	"apng"
],
	"image/bmp": [
	"bmp"
],
	"image/cgm": [
	"cgm"
],
	"image/g3fax": [
	"g3"
],
	"image/gif": [
	"gif"
],
	"image/ief": [
	"ief"
],
	"image/jp2": [
	"jp2",
	"jpg2"
],
	"image/jpeg": [
	"jpeg",
	"jpg",
	"jpe"
],
	"image/jpm": [
	"jpm"
],
	"image/jpx": [
	"jpx",
	"jpf"
],
	"image/ktx": [
	"ktx"
],
	"image/png": [
	"png"
],
	"image/prs.btif": [
	"btif"
],
	"image/sgi": [
	"sgi"
],
	"image/svg+xml": [
	"svg",
	"svgz"
],
	"image/tiff": [
	"tiff",
	"tif"
],
	"image/vnd.adobe.photoshop": [
	"psd"
],
	"image/vnd.dece.graphic": [
	"uvi",
	"uvvi",
	"uvg",
	"uvvg"
],
	"image/vnd.djvu": [
	"djvu",
	"djv"
],
	"image/vnd.dvb.subtitle": [
],
	"image/vnd.dwg": [
	"dwg"
],
	"image/vnd.dxf": [
	"dxf"
],
	"image/vnd.fastbidsheet": [
	"fbs"
],
	"image/vnd.fpx": [
	"fpx"
],
	"image/vnd.fst": [
	"fst"
],
	"image/vnd.fujixerox.edmics-mmr": [
	"mmr"
],
	"image/vnd.fujixerox.edmics-rlc": [
	"rlc"
],
	"image/vnd.ms-modi": [
	"mdi"
],
	"image/vnd.ms-photo": [
	"wdp"
],
	"image/vnd.net-fpx": [
	"npx"
],
	"image/vnd.wap.wbmp": [
	"wbmp"
],
	"image/vnd.xiff": [
	"xif"
],
	"image/webp": [
	"webp"
],
	"image/x-3ds": [
	"3ds"
],
	"image/x-cmu-raster": [
	"ras"
],
	"image/x-cmx": [
	"cmx"
],
	"image/x-freehand": [
	"fh",
	"fhc",
	"fh4",
	"fh5",
	"fh7"
],
	"image/x-icon": [
	"ico"
],
	"image/x-jng": [
	"jng"
],
	"image/x-mrsid-image": [
	"sid"
],
	"image/x-ms-bmp": [
],
	"image/x-pcx": [
	"pcx"
],
	"image/x-pict": [
	"pic",
	"pct"
],
	"image/x-portable-anymap": [
	"pnm"
],
	"image/x-portable-bitmap": [
	"pbm"
],
	"image/x-portable-graymap": [
	"pgm"
],
	"image/x-portable-pixmap": [
	"ppm"
],
	"image/x-rgb": [
	"rgb"
],
	"image/x-tga": [
	"tga"
],
	"image/x-xbitmap": [
	"xbm"
],
	"image/x-xpixmap": [
	"xpm"
],
	"image/x-xwindowdump": [
	"xwd"
],
	"message/rfc822": [
	"eml",
	"mime"
],
	"model/gltf+json": [
	"gltf"
],
	"model/gltf-binary": [
	"glb"
],
	"model/iges": [
	"igs",
	"iges"
],
	"model/mesh": [
	"msh",
	"mesh",
	"silo"
],
	"model/vnd.collada+xml": [
	"dae"
],
	"model/vnd.dwf": [
	"dwf"
],
	"model/vnd.gdl": [
	"gdl"
],
	"model/vnd.gtw": [
	"gtw"
],
	"model/vnd.mts": [
	"mts"
],
	"model/vnd.vtu": [
	"vtu"
],
	"model/vrml": [
	"wrl",
	"vrml"
],
	"model/x3d+binary": [
	"x3db",
	"x3dbz"
],
	"model/x3d+vrml": [
	"x3dv",
	"x3dvz"
],
	"model/x3d+xml": [
	"x3d",
	"x3dz"
],
	"text/cache-manifest": [
	"appcache",
	"manifest"
],
	"text/calendar": [
	"ics",
	"ifb"
],
	"text/coffeescript": [
	"coffee",
	"litcoffee"
],
	"text/css": [
	"css"
],
	"text/csv": [
	"csv"
],
	"text/hjson": [
	"hjson"
],
	"text/html": [
	"html",
	"htm",
	"shtml"
],
	"text/jade": [
	"jade"
],
	"text/jsx": [
	"jsx"
],
	"text/less": [
	"less"
],
	"text/markdown": [
	"markdown",
	"md"
],
	"text/mathml": [
	"mml"
],
	"text/n3": [
	"n3"
],
	"text/plain": [
	"txt",
	"text",
	"conf",
	"def",
	"list",
	"log",
	"in",
	"ini"
],
	"text/prs.lines.tag": [
	"dsc"
],
	"text/richtext": [
	"rtx"
],
	"text/rtf": [
],
	"text/sgml": [
	"sgml",
	"sgm"
],
	"text/slim": [
	"slim",
	"slm"
],
	"text/stylus": [
	"stylus",
	"styl"
],
	"text/tab-separated-values": [
	"tsv"
],
	"text/troff": [
	"t",
	"tr",
	"roff",
	"man",
	"me",
	"ms"
],
	"text/turtle": [
	"ttl"
],
	"text/uri-list": [
	"uri",
	"uris",
	"urls"
],
	"text/vcard": [
	"vcard"
],
	"text/vnd.curl": [
	"curl"
],
	"text/vnd.curl.dcurl": [
	"dcurl"
],
	"text/vnd.curl.mcurl": [
	"mcurl"
],
	"text/vnd.curl.scurl": [
	"scurl"
],
	"text/vnd.dvb.subtitle": [
	"sub"
],
	"text/vnd.fly": [
	"fly"
],
	"text/vnd.fmi.flexstor": [
	"flx"
],
	"text/vnd.graphviz": [
	"gv"
],
	"text/vnd.in3d.3dml": [
	"3dml"
],
	"text/vnd.in3d.spot": [
	"spot"
],
	"text/vnd.sun.j2me.app-descriptor": [
	"jad"
],
	"text/vnd.wap.wml": [
	"wml"
],
	"text/vnd.wap.wmlscript": [
	"wmls"
],
	"text/vtt": [
	"vtt"
],
	"text/x-asm": [
	"s",
	"asm"
],
	"text/x-c": [
	"c",
	"cc",
	"cxx",
	"cpp",
	"h",
	"hh",
	"dic"
],
	"text/x-component": [
	"htc"
],
	"text/x-fortran": [
	"f",
	"for",
	"f77",
	"f90"
],
	"text/x-handlebars-template": [
	"hbs"
],
	"text/x-java-source": [
	"java"
],
	"text/x-lua": [
	"lua"
],
	"text/x-markdown": [
	"mkd"
],
	"text/x-nfo": [
	"nfo"
],
	"text/x-opml": [
	"opml"
],
	"text/x-org": [
],
	"text/x-pascal": [
	"p",
	"pas"
],
	"text/x-processing": [
	"pde"
],
	"text/x-sass": [
	"sass"
],
	"text/x-scss": [
	"scss"
],
	"text/x-setext": [
	"etx"
],
	"text/x-sfv": [
	"sfv"
],
	"text/x-suse-ymp": [
	"ymp"
],
	"text/x-uuencode": [
	"uu"
],
	"text/x-vcalendar": [
	"vcs"
],
	"text/x-vcard": [
	"vcf"
],
	"text/xml": [
],
	"text/yaml": [
	"yaml",
	"yml"
],
	"video/3gpp": [
	"3gp",
	"3gpp"
],
	"video/3gpp2": [
	"3g2"
],
	"video/h261": [
	"h261"
],
	"video/h263": [
	"h263"
],
	"video/h264": [
	"h264"
],
	"video/jpeg": [
	"jpgv"
],
	"video/jpm": [
	"jpgm"
],
	"video/mj2": [
	"mj2",
	"mjp2"
],
	"video/mp2t": [
	"ts"
],
	"video/mp4": [
	"mp4",
	"mp4v",
	"mpg4"
],
	"video/mpeg": [
	"mpeg",
	"mpg",
	"mpe",
	"m1v",
	"m2v"
],
	"video/ogg": [
	"ogv"
],
	"video/quicktime": [
	"qt",
	"mov"
],
	"video/vnd.dece.hd": [
	"uvh",
	"uvvh"
],
	"video/vnd.dece.mobile": [
	"uvm",
	"uvvm"
],
	"video/vnd.dece.pd": [
	"uvp",
	"uvvp"
],
	"video/vnd.dece.sd": [
	"uvs",
	"uvvs"
],
	"video/vnd.dece.video": [
	"uvv",
	"uvvv"
],
	"video/vnd.dvb.file": [
	"dvb"
],
	"video/vnd.fvt": [
	"fvt"
],
	"video/vnd.mpegurl": [
	"mxu",
	"m4u"
],
	"video/vnd.ms-playready.media.pyv": [
	"pyv"
],
	"video/vnd.uvvu.mp4": [
	"uvu",
	"uvvu"
],
	"video/vnd.vivo": [
	"viv"
],
	"video/webm": [
	"webm"
],
	"video/x-f4v": [
	"f4v"
],
	"video/x-fli": [
	"fli"
],
	"video/x-flv": [
	"flv"
],
	"video/x-m4v": [
	"m4v"
],
	"video/x-matroska": [
	"mkv",
	"mk3d",
	"mks"
],
	"video/x-mng": [
	"mng"
],
	"video/x-ms-asf": [
	"asf",
	"asx"
],
	"video/x-ms-vob": [
	"vob"
],
	"video/x-ms-wm": [
	"wm"
],
	"video/x-ms-wmv": [
	"wmv"
],
	"video/x-ms-wmx": [
	"wmx"
],
	"video/x-ms-wvx": [
	"wvx"
],
	"video/x-msvideo": [
	"avi"
],
	"video/x-sgi-movie": [
	"movie"
],
	"video/x-smv": [
	"smv"
],
	"x-conference/x-cooltalk": [
	"ice"
]
};

var fs$2 = require$$1__default["default"];

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);

  // Map of mime type -> extension
  this.extensions = Object.create(null);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * @param map (Object) type definitions
 */
Mime.prototype.define = function (map) {
  for (var type in map) {
    var exts = map[type];
    for (var i = 0; i < exts.length; i++) {
      if (process.env.DEBUG_MIME && this.types[exts[i]]) {
        console.warn((this._loading || "define()").replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts[i]] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
};

/**
 * Load an Apache2-style ".types" file
 *
 * This may be called multiple times (it's expected).  Where files declare
 * overlapping types/extensions, the last file wins.
 *
 * @param file (String) path of file to load.
 */
Mime.prototype.load = function(file) {
  this._loading = file;
  // Read file and split into lines
  var map = {},
      content = fs$2.readFileSync(file, 'ascii'),
      lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields.shift()] = fields;
  });

  this.define(map);

  this._loading = null;
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.lookup = function(path, fallback) {
  var ext = path.replace(/^.*[\.\/\\]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.extension = function(mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
};

// Default instance
var mime$1 = new Mime();

// Define built-in types
mime$1.define(require$$2);

// Default type
mime$1.default_type = mime$1.lookup('bin');

//
// Additional API specific to the default instance
//

mime$1.Mime = Mime;

/**
 * Lookup a charset based on mime type.
 */
mime$1.charsets = {
  lookup: function(mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\/|^application\/(javascript|json)/).test(mimeType) ? 'UTF-8' : fallback;
  }
};

var mime_1 = mime$1;

var isWsl$2 = {exports: {}};

const os = require$$0__default["default"];
const fs$1 = require$$1__default["default"];

const isWsl$1 = () => {
	if (process.platform !== 'linux') {
		return false;
	}

	if (os.release().includes('Microsoft')) {
		return true;
	}

	try {
		return fs$1.readFileSync('/proc/version', 'utf8').includes('Microsoft');
	} catch (err) {
		return false;
	}
};

if (process.env.__IS_WSL_TEST__) {
	isWsl$2.exports = isWsl$1;
} else {
	isWsl$2.exports = isWsl$1();
}

const path$1 = require$$0__default$1["default"];
const childProcess = require$$1__default$1["default"];
const isWsl = isWsl$2.exports;

var opn$1 = (target, opts) => {
	if (typeof target !== 'string') {
		return Promise.reject(new Error('Expected a `target`'));
	}

	opts = Object.assign({wait: true}, opts);

	let cmd;
	let appArgs = [];
	let args = [];
	const cpOpts = {};

	if (Array.isArray(opts.app)) {
		appArgs = opts.app.slice(1);
		opts.app = opts.app[0];
	}

	if (process.platform === 'darwin') {
		cmd = 'open';

		if (opts.wait) {
			args.push('-W');
		}

		if (opts.app) {
			args.push('-a', opts.app);
		}
	} else if (process.platform === 'win32' || isWsl) {
		cmd = 'cmd' + (isWsl ? '.exe' : '');
		args.push('/c', 'start', '""', '/b');
		target = target.replace(/&/g, '^&');

		if (opts.wait) {
			args.push('/wait');
		}

		if (opts.app) {
			args.push(opts.app);
		}

		if (appArgs.length > 0) {
			args = args.concat(appArgs);
		}
	} else {
		if (opts.app) {
			cmd = opts.app;
		} else {
			const useSystemXdgOpen = process.versions.electron || process.platform === 'android';
			cmd = useSystemXdgOpen ? 'xdg-open' : path$1.join(__dirname, 'xdg-open');
		}

		if (appArgs.length > 0) {
			args = args.concat(appArgs);
		}

		if (!opts.wait) {
			// `xdg-open` will block the process unless
			// stdio is ignored and it's detached from the parent
			// even if it's unref'd
			cpOpts.stdio = 'ignore';
			cpOpts.detached = true;
		}
	}

	args.push(target);

	if (process.platform === 'darwin' && appArgs.length > 0) {
		args.push('--args');
		args = args.concat(appArgs);
	}

	const cp = childProcess.spawn(cmd, args, cpOpts);

	if (opts.wait) {
		return new Promise((resolve, reject) => {
			cp.once('error', reject);

			cp.once('close', code => {
				if (code > 0) {
					reject(new Error('Exited with code ' + code));
					return;
				}

				resolve(cp);
			});
		});
	}

	cp.unref();

	return Promise.resolve(cp);
};

const DEFAULT_INDEX = 'index.html';

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_PARTIAL_CONTENT = 206;
const HTTP_STATUS_NOT_MODIFIED = 304;
const HTTP_STATUS_ERR = 500;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_INVALID_METHOD = 405;

const VALID_HTTP_METHODS = ['GET', 'HEAD'];

const RANGE_REQUEST_HEADER_TEST = /^bytes=/;
const RANGE_REQUEST_HEADER_PATTERN = /\d*-\d*/g;

const TIME_MS_PRECISION = 3;

const MULTIPART_SEPARATOR = '--MULTIPARTSEPERATORaufielqbghgzwr';

const NEWLINE = '\n';


var EventEmitter = require$$0__default$2["default"].EventEmitter;
var util         = require$$1__default$2["default"];
var http         = require$$2__default["default"];
var url          = require$$3__default["default"];
var mime         = mime_1;
var path         = require$$0__default$1["default"];
var fs           = require$$1__default["default"];
var opn          = opn$1;


/**
Exposes the StaticServer class
*/
var server_1 = StaticServer;


/**
Create a new instance of StaticServer class

Options are :
   - name          the server name, what will be sent as "X-Powered-by"
   - host          the host interface where the server will listen to. If not specified,
                   the server will listen on any networking interfaces
   - cors          a cors header, will be sent as "Access-Control-Allow-Origin",
   - port          the listening port number
   - rootPath      the serving root path. Any file above that path will be denied
   - followSymlink true to follow any symbolic link, false to forbid
   - templates
      - index      the default index file to server for a directory (default 'index.html')
      - notFound   the 404 error template
   - noCache       disables 304 responses
   - open          open server in the local browser

@param options {Object}
*/
function StaticServer(options) {
  options = options || {};

  if (!options.rootPath) {
    throw new Error('Root path not specified');
  }

  if(!options.templates){
    options.templates = {};
  }

  this.name = options.name;
  this.host = options.host;
  this.port = options.port;
  this.cors = options.cors;
  this.rootPath = path.resolve(options.rootPath);
  this.followSymlink = !!options.followSymlink;
  this.templates = {
    'index': (options.templates.index || DEFAULT_INDEX),
    'notFound': options.templates.notFound
  };
  // the arguments parser converts `--no-XXXX` to `XXXX` with a value of false;
  this.noCache = !options.cache;
  this.open = options.open;

  if (options.index) {
    console.log("options.index is now deprecated please use options.templates.index instead.");
    this.templates.index = options.index;
  }

  Object.defineProperty(this, '_socket', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: null
  });

}
util.inherits(StaticServer, EventEmitter);

/**
Expose the http.STATUS_CODES object
*/
StaticServer.STATUS_CODES = http.STATUS_CODES;


/**
Start listening on the given host:port

@param callback {Function}    the function to call once the server is ready
*/
StaticServer.prototype.start = function start(callback) {
  this._socket = http.createServer(requestHandler(this)).listen(this.port, this.host, callback);
  if(this.open && this.port){
    opn('http://localhost:' + this.port);
  }
};


/**
Stop listening
*/
StaticServer.prototype.stop = function stop() {
  if (this._socket) {
    this._socket.close();
    this._socket = null;
  }
};


/**
Return the server's request handler function

@param server {StaticServer}  server instance
@return {Function}
*/
function requestHandler(server) {
  return function handler(req, res) {
    var uri = req.path = decodeURIComponent(url.parse(req.url).pathname);
    var filename = path.join(server.rootPath, uri);
    var timestamp = process.hrtime();

    // add a property to get the elapsed time since the request was issued
    Object.defineProperty(req, 'elapsedTime', {
      get: function getElapsedTime() {
        var elapsed = process.hrtime(timestamp);
        return (elapsed[0] ? elapsed[0] + 's ' : '') + (elapsed[1] / 1000000).toFixed(TIME_MS_PRECISION) + 'ms';
      }
    });

    res.headers = {};
    if (server.name) {
      res.headers['X-Powered-By'] = server.name;
    }

    if (server.cors) {
      res.headers['Access-Control-Allow-Origin'] = server.cors;
    }

    server.emit('request', req, res);

    if (VALID_HTTP_METHODS.indexOf(req.method) === -1) {
      return sendError(server, req, res, null, HTTP_STATUS_INVALID_METHOD);
    } else if (!validPath(server.rootPath, filename)) {
      return sendError(server, req, res, null, HTTP_STATUS_FORBIDDEN);
    }

    getFileStats(server, [filename, path.join(filename, server.templates.index)], function (err, stat, file, index) {
      if (err) {
        handleError(server, req, res);
      } else if (stat.isDirectory()) {
        //
        // TODO : handle directory listing here
        //
        sendError(server, req, res, null, HTTP_STATUS_FORBIDDEN);
      } else {
        sendFile(server, req, res, stat, file);
      }
    });
  };
}


/**
Handle an error

Currently assumes that the only error would be a 404 error.

@param server {StaticServer} server instance
@param req {Object} request Object
@param res {Object} response Object
@param err {Object} the error to handle
*/
function handleError(server, req, res, err){
  if(server.templates.notFound){
    getFileStats(server, [server.templates.notFound], function(err, stat, file, index){
      if (err) {
        sendError(server, req, res, null, HTTP_STATUS_NOT_FOUND);
      } else {
        res.status = HTTP_STATUS_NOT_FOUND;
        sendFile(server, req, res, stat, file);
      }
    });
  }else {
    sendError(server, req, res, null, HTTP_STATUS_NOT_FOUND);
  }
}



/**
Check that path is valid so we don't access invalid resources

@param rootPath {String}    the server root path
@param file {String}        the path to validate
*/
function validPath(rootPath, file) {
  var resolvedPath = path.resolve(rootPath, file);

  // only if we are still in the rootPath of the static site
  return resolvedPath.indexOf(rootPath) === 0;
}


/**
Get stats for the given file(s). The function will return the stats for the
first valid (i.e. found) file or directory.

    getFile(server, ['file1', 'file2'], callback);

The callback function receives four arguments; an error if any, a stats object,
the file name matching the stats found, and the actual index of the file from
the provided list of files.

@param server {StaticServer}    the StaticServer instance
@param files {Array}            list of files
@param callback {Function}      a callback function
*/
function getFileStats(server, files, callback) {
  var dirFound;
  var dirStat;
  var dirIndex;

  function checkNext(err, index) {
    if (files.length) {
      next(files.shift(), index + 1);
    } else if (dirFound) {
      // if a directory was found at some point, return it and ignore the error
      callback(null, dirStat, dirFound, dirIndex);
    } else {
      callback(err || new Error('File not found'));
    }
  }

  function next(file, index) {
    fs.lstat(file, function (err, stat) {
      if (err) {
        checkNext(err, index);
      } else if (stat.isSymbolicLink()) {
        if (server.followSymlink) {
          fs.readlink(file, function (err, fileRef) {
            if (err) {
              checkNext(err, index);
            } else {
              if (!path.isAbsolute(fileRef)) {
                fileRef = path.join( path.dirname(file), fileRef );
              }
              server.emit('symbolicLink', fileRef);
              next(fileRef, index);
            }
          });
        } else {
          callback(new Error('Symbolic link not allowed'));
        }
      } else if (stat.isDirectory()) {
        if (!dirFound) {
          dirFound = file;
          dirStat = stat;
          dirIndex = index;
        }
        checkNext(null, index);
      } else {
        callback(null, stat, file, index);
      }
    });
  }

  checkNext(null, 0);
}


/**
Validate that this file is not client cached

@param req {Object}       the request object
@param res {Object}       the response object
@return {boolean}         true if the file is client cached
*/
function validateClientCache(server, req, res, stat) {
  var mtime         = stat.mtime.getTime();
  var clientETag  = req.headers['if-none-match'];
  var clientMTime = Date.parse(req.headers['if-modified-since']);

  if (server.noCache) return false;

  if ((clientMTime  || clientETag) &&
      (!clientETag  || clientETag === res.headers['Etag']) &&
      (!clientMTime || clientMTime >= mtime)) {

    // NOT MODIFIED responses should not contain entity headers
    [
      'Content-Encoding',
      'Content-Language',
      'Content-Length',
      'Content-Location',
      'Content-MD5',
      'Content-Range',
      'Content-Type',
      'Expires',
      'Last-Modified'
    ].forEach(function(entityHeader) {
        delete res.headers[entityHeader];
    });

    res.status = HTTP_STATUS_NOT_MODIFIED;

    res.writeHead(res.status, res.headers);
    res.end();

    server.emit('response', req, res);

    return true;
  } else {
    return false;
  }
}

function parseRanges(req, res, size) {
  var ranges;
  var start;
  var end;
  var i;
  var originalSize = size;

  // support range headers
  if (req.headers.range) {
    // 'bytes=100-200,300-400'  --> ['100-200','300-400']
    if (!RANGE_REQUEST_HEADER_TEST.test(req.headers.range)) {
      return sendError(req, res, null, HTTP_STATUS_BAD_REQUEST, 'Invalid Range Headers: ' + req.headers.range);
    }

    ranges = req.headers.range.match(RANGE_REQUEST_HEADER_PATTERN);
    size = 0;

    if (!ranges) {
      return sendError(server, req, res, null, HTTP_STATUS_BAD_REQUEST, 'Invalid Range Headers: ' + req.headers.range);
    }

    i = ranges.length;

    while (--i >= 0) {
      // 100-200 --> [100, 200]   = bytes 100 to 200
      // -200    --> [null, 200]  = last 100 bytes
      // 100-    --> [100, null]  = bytes 100 to end
      range = ranges[i].split('-');
      start = range[0] ? Number(range[0]) : null;
      end   = range[1] ? Number(range[1]) : null;

      // check if requested range is valid:
      //   - check it is within file range
      //   - check that start is smaller than end, if both are set

      if ((start > originalSize) || (end > originalSize) || ((start && end) && start > end)) {
        res.headers['Content-Range'] = 'bytes=0-' + originalSize;
        return sendError(server, req, res, null, DEFAULT_STATUS_REQUEST_RANGE_NOT_SATISFIABLE);
      }

      // update size
      if (start !== null && end !== null) {
        size += (end - start);
        ranges[i] = { start: start, end: end + 1 };
      } else if (start !== null) {
        size += (originalSize - start);
        ranges[i] = { start: start, end: originalSize + 1 };
      } else if (end !== null) {
        size += end;
        ranges[i] = { start: originalSize - end, end: originalSize };
      }
    }
  }

  return {
    ranges: ranges,
    size: size
  };
}


/**
Send error back to the client. If `status` is not specified, a value
of 500 is used. If `message` is not specified, the default message for
the given status is returned.

@param server {StaticServer} the server instance
@param req {Object}          the request object
@param res {Object}          the response object
@param err {Object}          an Error object, if any
@param status {Number}       the status (default 500)
@param message {String}      the status message (optional)
*/
function sendError(server, req, res, err, status, message) {
  status = status || res.status || HTTP_STATUS_ERR;
  message = message || http.STATUS_CODES[status];

  if (status >= 400) {
    // ERR responses should not contain entity headers
    [
      'Content-Encoding',
      'Content-Language',
      'Content-Length',
      'Content-Location',
      'Content-MD5',
      //      'Content-Range', // Error 416 SHOULD contain this header
      'Etag',
      'Expires',
      'Last-Modified'
    ].forEach(function(entityHeader) {
        delete res.headers[entityHeader];
    });

    res.status = status;
    res.headers['Content-Type'] = mime.lookup('text');

    res.writeHead(status, res.headers);
    res.write(message);
    res.end();
  }

  server.emit('response', req, res, err);
}


/**
Send a file back at the client. If the file is not found, an error 404
will be returned. If the file cannot be read, for any reason, an error 500
will be read and the error will be sent to stderr

@param server {StaticServer} the server instance
@param req {Object}          the request object
@param res {Object}          the response object
@param stat {Object}         the actual file stat
@param file {String}         the absolute file path
*/
function sendFile(server, req, res, stat, file) {
  var headersSent = false;
  var contentParts = parseRanges(req, res, stat.size);
  var streamOptions = { flags: 'r' };
  var contentType = mime.lookup(file);
  var rangeIndex = 0;

  if (!contentParts) {
    return;  // ranges failed, abort
  }

  if (!server.noCache) {
    res.headers['Etag']           = JSON.stringify([stat.ino, stat.size, stat.mtime.getTime()].join('-'));
    res.headers['Last-Modified']  = new Date(stat.mtime).toUTCString();
  }

  res.headers['Date']           = new Date().toUTCString();

  if (contentParts.ranges && contentParts.ranges.length > 1) {
    res.headers['Content-Type'] = 'multipart/byteranges; boundary=' + MULTIPART_SEPARATOR;
  } else {
    res.headers['Content-Type']   = contentType;
    res.headers['Content-Length'] = contentParts.size;

    if (contentParts.ranges) {
      res.headers['Content-Range'] = req.headers.range;
    }
  }

  // return only headers if request method is HEAD
  if (req.method === 'HEAD') {
    res.status = HTTP_STATUS_OK;
    res.writeHead(HTTP_STATUS_OK, res.headers);
    res.end();
    server.emit('response', req, res, null, file, stat);
  } else if (!validateClientCache(server, req, res, stat)) {

    (function sendNext() {
      var range;

      if (contentParts.ranges) {
        range = contentParts.ranges[rangeIndex++];

        streamOptions.start = range.start;
        streamOptions.end = range.end;
      }

      fs.createReadStream(file, streamOptions)
        .on('close', function () {
          // close response when there are no ranges defined
          // or when the last range has been read
          if (!range || (rangeIndex >= contentParts.ranges.length)) {
            res.end();
            server.emit('response', req, res, null, file, stat);
          } else {
            setImmediate(sendNext);
          }
        }).on('open', function (fd) {
          if (!headersSent) {
            if (!res.status){
              if (range) {
                res.status = HTTP_STATUS_PARTIAL_CONTENT;
              } else {
                res.status = HTTP_STATUS_OK;
              }
            }
            res.writeHead(res.status, res.headers);
            headersSent = true;
          }

          if (range && contentParts.ranges.length > 1) {
            res.write(MULTIPART_SEPARATOR + NEWLINE +
                      'Content-Type: ' + contentType + NEWLINE +
                      'Content-Range: ' + (range.start || '') + '-' + (range.end || '') + NEWLINE + NEWLINE);
          }
        }).on('error', function (err) {
          sendError(server, req, res, err);
        }).on('data', function (chunk) {
          res.write(chunk);
        });
    })();
  }

}

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.tester = exports.loadTester = exports.login = exports.generateSeedPhrase = exports.TEST_KERNEL_SKLINK = exports.KERNEL_HELPER_MODULE = exports.KERNEL_TEST_SUITE = void 0;
	const libskynet_1 = require$$0;
	const seed_1 = require$$1;
	const dictionary_1 = require$$2$1;
	const path = require$$0__default$1["default"];
	const libskynetnode_1 = require$$4;
	const kernel = require$$5;
	const crypto_1 = require$$6__default["default"];
	// @ts-ignore
	const StaticServer = server_1;
	exports.KERNEL_TEST_SUITE = "AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3g";
	exports.KERNEL_HELPER_MODULE = "AQCoaLP6JexdZshDDZRQaIwN3B7DqFjlY7byMikR7u1IEA";
	exports.TEST_KERNEL_SKLINK = "AQCw2_9rg0Fxuy8ky3pvLiDhcJTmAqthy1Buc7Frl2v2fA";
	const SEED_ENTROPY_WORDS = 13;
	const crypto = crypto_1.webcrypto;
	function generateSeedPhrase() {
	    // Get the random numbers for the seed phrase. Typically, you need to
	    // have code that avoids bias by checking the random results and
	    // re-rolling the random numbers if the result is outside of the range
	    // of numbers that would produce no bias. Because the search space
	    // (1024) evenly divides the random number space (2^16), we can skip
	    // this step and just use a modulus instead. The result will have no
	    // bias, but only because the search space is a power of 2.
	    let randNums = new Uint16Array(SEED_ENTROPY_WORDS);
	    crypto.getRandomValues(randNums);
	    // Generate the seed phrase from the randNums.
	    let seedWords = [];
	    for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
	        let wordIndex = randNums[i] % libskynet_1.dictionary.length;
	        seedWords.push(libskynet_1.dictionary[wordIndex]);
	    }
	    // Convert the seedWords to a seed.
	    let [seed] = seedWordsToSeed(seedWords);
	    // Compute the checksum.
	    let [checksumOne, checksumTwo, err2] = (0, seed_1.seedToChecksumWords)(seed);
	    // Assemble the final seed phrase and set the text field.
	    return [...seedWords, checksumOne, checksumTwo].join(" ");
	}
	exports.generateSeedPhrase = generateSeedPhrase;
	function seedWordsToSeed(seedWords) {
	    // Input checking.
	    if (seedWords.length !== SEED_ENTROPY_WORDS) {
	        return [
	            new Uint8Array(0),
	            `Seed words should have length ${SEED_ENTROPY_WORDS} but has length ${seedWords.length}`,
	        ];
	    }
	    // We are getting 16 bytes of entropy.
	    let bytes = new Uint8Array(seed_1.SEED_BYTES);
	    let curByte = 0;
	    let curBit = 0;
	    for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
	        // Determine which number corresponds to the next word.
	        let word = -1;
	        for (let j = 0; j < libskynet_1.dictionary.length; j++) {
	            if (seedWords[i].slice(0, dictionary_1.DICTIONARY_UNIQUE_PREFIX) ===
	                libskynet_1.dictionary[j].slice(0, dictionary_1.DICTIONARY_UNIQUE_PREFIX)) {
	                word = j;
	                break;
	            }
	        }
	        if (word === -1) {
	            return [
	                new Uint8Array(0),
	                `word '${seedWords[i]}' at index ${i} not found in dictionary`,
	            ];
	        }
	        let wordBits = 10;
	        if (i === SEED_ENTROPY_WORDS - 1) {
	            wordBits = 8;
	        }
	        // Iterate over the bits of the 10- or 8-bit word.
	        for (let j = 0; j < wordBits; j++) {
	            let bitSet = (word & (1 << (wordBits - j - 1))) > 0;
	            if (bitSet) {
	                bytes[curByte] |= 1 << (8 - curBit - 1);
	            }
	            curBit += 1;
	            if (curBit >= 8) {
	                // Current byte has 8 bits, go to the next byte.
	                curByte += 1;
	                curBit = 0;
	            }
	        }
	    }
	    return [bytes, null];
	}
	async function login(page, seed = generateSeedPhrase()) {
	    await page.goto("http://skt.us");
	    let userSeed;
	    [userSeed] = (0, libskynet_1.seedPhraseToSeed)(seed);
	    let seedHex = (0, libskynet_1.bufToHex)(userSeed);
	    await page.evaluate((seed) => {
	        window.localStorage.setItem("v1-seed", seed);
	    }, seedHex);
	    let kernelEntrySeed = (0, libskynet_1.deriveChildSeed)(userSeed, "userPreferredKernel2");
	    // Get the registry keys.
	    let [keypair, dataKey] = (0, libskynet_1.taggedRegistryEntryKeys)(kernelEntrySeed, "user kernel");
	    await (0, libskynetnode_1.overwriteRegistryEntry)(keypair, dataKey, (0, libskynet_1.b64ToBuf)(exports.TEST_KERNEL_SKLINK)[0]);
	}
	exports.login = login;
	async function loadTester(page, port = 8080) {
	    const server = new StaticServer({
	        rootPath: path.resolve(__dirname, "..", "public"),
	        port,
	        host: "localhost",
	    });
	    await new Promise((resolve) => {
	        server.start(resolve);
	    });
	    await page.goto(`http://localhost:${port}/`);
	    await page.evaluate(() => {
	        return kernel.init();
	    });
	}
	exports.loadTester = loadTester;
	class Tester {
	    page;
	    constructor(page) {
	        this.page = page;
	    }
	    async callModule(id, method, data = {}) {
	        return this.page.evaluate(async (id, method, data) => {
	            return kernel.callModule(id, method, data);
	        }, id, method, data);
	    }
	}
	const tester = (page) => new Tester(page);
	exports.tester = tester;
} (build));

var index = /*@__PURE__*/getDefaultExportFromCjs(build);

let s = 0;
const S = {
	START_BOUNDARY: s++,
	HEADER_FIELD_START: s++,
	HEADER_FIELD: s++,
	HEADER_VALUE_START: s++,
	HEADER_VALUE: s++,
	HEADER_VALUE_ALMOST_DONE: s++,
	HEADERS_ALMOST_DONE: s++,
	PART_DATA_START: s++,
	PART_DATA: s++,
	END: s++
};

let f = 1;
const F = {
	PART_BOUNDARY: f,
	LAST_BOUNDARY: f *= 2
};

const LF = 10;
const CR = 13;
const SPACE = 32;
const HYPHEN = 45;
const COLON = 58;
const A = 97;
const Z = 122;

const lower = c => c | 0x20;

const noop = () => {};

class MultipartParser {
	/**
	 * @param {string} boundary
	 */
	constructor(boundary) {
		this.index = 0;
		this.flags = 0;

		this.onHeaderEnd = noop;
		this.onHeaderField = noop;
		this.onHeadersEnd = noop;
		this.onHeaderValue = noop;
		this.onPartBegin = noop;
		this.onPartData = noop;
		this.onPartEnd = noop;

		this.boundaryChars = {};

		boundary = '\r\n--' + boundary;
		const ui8a = new Uint8Array(boundary.length);
		for (let i = 0; i < boundary.length; i++) {
			ui8a[i] = boundary.charCodeAt(i);
			this.boundaryChars[ui8a[i]] = true;
		}

		this.boundary = ui8a;
		this.lookbehind = new Uint8Array(this.boundary.length + 8);
		this.state = S.START_BOUNDARY;
	}

	/**
	 * @param {Uint8Array} data
	 */
	write(data) {
		let i = 0;
		const length_ = data.length;
		let previousIndex = this.index;
		let {lookbehind, boundary, boundaryChars, index, state, flags} = this;
		const boundaryLength = this.boundary.length;
		const boundaryEnd = boundaryLength - 1;
		const bufferLength = data.length;
		let c;
		let cl;

		const mark = name => {
			this[name + 'Mark'] = i;
		};

		const clear = name => {
			delete this[name + 'Mark'];
		};

		const callback = (callbackSymbol, start, end, ui8a) => {
			if (start === undefined || start !== end) {
				this[callbackSymbol](ui8a && ui8a.subarray(start, end));
			}
		};

		const dataCallback = (name, clear) => {
			const markSymbol = name + 'Mark';
			if (!(markSymbol in this)) {
				return;
			}

			if (clear) {
				callback(name, this[markSymbol], i, data);
				delete this[markSymbol];
			} else {
				callback(name, this[markSymbol], data.length, data);
				this[markSymbol] = 0;
			}
		};

		for (i = 0; i < length_; i++) {
			c = data[i];

			switch (state) {
				case S.START_BOUNDARY:
					if (index === boundary.length - 2) {
						if (c === HYPHEN) {
							flags |= F.LAST_BOUNDARY;
						} else if (c !== CR) {
							return;
						}

						index++;
						break;
					} else if (index - 1 === boundary.length - 2) {
						if (flags & F.LAST_BOUNDARY && c === HYPHEN) {
							state = S.END;
							flags = 0;
						} else if (!(flags & F.LAST_BOUNDARY) && c === LF) {
							index = 0;
							callback('onPartBegin');
							state = S.HEADER_FIELD_START;
						} else {
							return;
						}

						break;
					}

					if (c !== boundary[index + 2]) {
						index = -2;
					}

					if (c === boundary[index + 2]) {
						index++;
					}

					break;
				case S.HEADER_FIELD_START:
					state = S.HEADER_FIELD;
					mark('onHeaderField');
					index = 0;
					// falls through
				case S.HEADER_FIELD:
					if (c === CR) {
						clear('onHeaderField');
						state = S.HEADERS_ALMOST_DONE;
						break;
					}

					index++;
					if (c === HYPHEN) {
						break;
					}

					if (c === COLON) {
						if (index === 1) {
							// empty header field
							return;
						}

						dataCallback('onHeaderField', true);
						state = S.HEADER_VALUE_START;
						break;
					}

					cl = lower(c);
					if (cl < A || cl > Z) {
						return;
					}

					break;
				case S.HEADER_VALUE_START:
					if (c === SPACE) {
						break;
					}

					mark('onHeaderValue');
					state = S.HEADER_VALUE;
					// falls through
				case S.HEADER_VALUE:
					if (c === CR) {
						dataCallback('onHeaderValue', true);
						callback('onHeaderEnd');
						state = S.HEADER_VALUE_ALMOST_DONE;
					}

					break;
				case S.HEADER_VALUE_ALMOST_DONE:
					if (c !== LF) {
						return;
					}

					state = S.HEADER_FIELD_START;
					break;
				case S.HEADERS_ALMOST_DONE:
					if (c !== LF) {
						return;
					}

					callback('onHeadersEnd');
					state = S.PART_DATA_START;
					break;
				case S.PART_DATA_START:
					state = S.PART_DATA;
					mark('onPartData');
					// falls through
				case S.PART_DATA:
					previousIndex = index;

					if (index === 0) {
						// boyer-moore derrived algorithm to safely skip non-boundary data
						i += boundaryEnd;
						while (i < bufferLength && !(data[i] in boundaryChars)) {
							i += boundaryLength;
						}

						i -= boundaryEnd;
						c = data[i];
					}

					if (index < boundary.length) {
						if (boundary[index] === c) {
							if (index === 0) {
								dataCallback('onPartData', true);
							}

							index++;
						} else {
							index = 0;
						}
					} else if (index === boundary.length) {
						index++;
						if (c === CR) {
							// CR = part boundary
							flags |= F.PART_BOUNDARY;
						} else if (c === HYPHEN) {
							// HYPHEN = end boundary
							flags |= F.LAST_BOUNDARY;
						} else {
							index = 0;
						}
					} else if (index - 1 === boundary.length) {
						if (flags & F.PART_BOUNDARY) {
							index = 0;
							if (c === LF) {
								// unset the PART_BOUNDARY flag
								flags &= ~F.PART_BOUNDARY;
								callback('onPartEnd');
								callback('onPartBegin');
								state = S.HEADER_FIELD_START;
								break;
							}
						} else if (flags & F.LAST_BOUNDARY) {
							if (c === HYPHEN) {
								callback('onPartEnd');
								state = S.END;
								flags = 0;
							} else {
								index = 0;
							}
						} else {
							index = 0;
						}
					}

					if (index > 0) {
						// when matching a possible boundary, keep a lookbehind reference
						// in case it turns out to be a false lead
						lookbehind[index - 1] = c;
					} else if (previousIndex > 0) {
						// if our boundary turned out to be rubbish, the captured lookbehind
						// belongs to partData
						const _lookbehind = new Uint8Array(lookbehind.buffer, lookbehind.byteOffset, lookbehind.byteLength);
						callback('onPartData', 0, previousIndex, _lookbehind);
						previousIndex = 0;
						mark('onPartData');

						// reconsider the current character even so it interrupted the sequence
						// it could be the beginning of a new sequence
						i--;
					}

					break;
				case S.END:
					break;
				default:
					throw new Error(`Unexpected state entered: ${state}`);
			}
		}

		dataCallback('onHeaderField');
		dataCallback('onHeaderValue');
		dataCallback('onPartData');

		// Update properties for the next call
		this.index = index;
		this.state = state;
		this.flags = flags;
	}

	end() {
		if ((this.state === S.HEADER_FIELD_START && this.index === 0) ||
			(this.state === S.PART_DATA && this.index === this.boundary.length)) {
			this.onPartEnd();
		} else if (this.state !== S.END) {
			throw new Error('MultipartParser.end(): stream ended unexpectedly');
		}
	}
}

function _fileName(headerValue) {
	// matches either a quoted-string or a token (RFC 2616 section 19.5.1)
	const m = headerValue.match(/\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t]+))($|;\s)/i);
	if (!m) {
		return;
	}

	const match = m[2] || m[3] || '';
	let filename = match.slice(match.lastIndexOf('\\') + 1);
	filename = filename.replace(/%22/g, '"');
	filename = filename.replace(/&#(\d{4});/g, (m, code) => {
		return String.fromCharCode(code);
	});
	return filename;
}

async function toFormData(Body, ct) {
	if (!/multipart/i.test(ct)) {
		throw new TypeError('Failed to fetch');
	}

	const m = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

	if (!m) {
		throw new TypeError('no or bad content-type header, no multipart boundary');
	}

	const parser = new MultipartParser(m[1] || m[2]);

	let headerField;
	let headerValue;
	let entryValue;
	let entryName;
	let contentType;
	let filename;
	const entryChunks = [];
	const formData = new FormData();

	const onPartData = ui8a => {
		entryValue += decoder.decode(ui8a, {stream: true});
	};

	const appendToFile = ui8a => {
		entryChunks.push(ui8a);
	};

	const appendFileToFormData = () => {
		const file = new File(entryChunks, filename, {type: contentType});
		formData.append(entryName, file);
	};

	const appendEntryToFormData = () => {
		formData.append(entryName, entryValue);
	};

	const decoder = new TextDecoder('utf-8');
	decoder.decode();

	parser.onPartBegin = function () {
		parser.onPartData = onPartData;
		parser.onPartEnd = appendEntryToFormData;

		headerField = '';
		headerValue = '';
		entryValue = '';
		entryName = '';
		contentType = '';
		filename = null;
		entryChunks.length = 0;
	};

	parser.onHeaderField = function (ui8a) {
		headerField += decoder.decode(ui8a, {stream: true});
	};

	parser.onHeaderValue = function (ui8a) {
		headerValue += decoder.decode(ui8a, {stream: true});
	};

	parser.onHeaderEnd = function () {
		headerValue += decoder.decode();
		headerField = headerField.toLowerCase();

		if (headerField === 'content-disposition') {
			// matches either a quoted-string or a token (RFC 2616 section 19.5.1)
			const m = headerValue.match(/\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s\t]+))/i);

			if (m) {
				entryName = m[2] || m[3] || '';
			}

			filename = _fileName(headerValue);

			if (filename) {
				parser.onPartData = appendToFile;
				parser.onPartEnd = appendFileToFormData;
			}
		} else if (headerField === 'content-type') {
			contentType = headerValue;
		}

		headerValue = '';
		headerField = '';
	};

	for await (const chunk of Body) {
		parser.write(chunk);
	}

	parser.end();

	return formData;
}

var multipartParser = /*#__PURE__*/Object.freeze({
	__proto__: null,
	toFormData: toFormData
});

module.exports = index;
