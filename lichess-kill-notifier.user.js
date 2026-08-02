// ==UserScript==
// @name         Lichess Kill Notifier
// @namespace    dismo/lichess-kill
// @version      4.4.1
// @description  Killing-Animationen bei Schlagzuegen mit eigenem Chess-State statt fragilem Board-DOM.
// @author       Dismo
// @match        https://lichess.org/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://gist.githubusercontent.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4/raw/lichess-kill-notifier.user.js
// @updateURL    https://gist.githubusercontent.com/gapsong/8b78fdf058b436e5b439b86ef2a816b4/raw/lichess-kill-notifier.user.js
// ==/UserScript==
(() => {
  // src/board-shake.js
  var ACTIVE_SHAKES = /* @__PURE__ */ new WeakMap();
  function shakeElement(element, {
    amplitude = 3,
    durationMs = 160,
    requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    now = () => globalThis.performance.now(),
    random = Math.random
  } = {}) {
    if (!element || !requestFrame) return;
    const previous = ACTIVE_SHAKES.get(element);
    if (previous) previous.cancelled = true;
    const baseTransform = previous ? previous.baseTransform : element.style.transform || "";
    const state = { cancelled: false, baseTransform };
    ACTIVE_SHAKES.set(element, state);
    const startedAt = now();
    function step() {
      if (state.cancelled) return;
      const progress = (now() - startedAt) / durationMs;
      if (progress >= 1) {
        element.style.transform = baseTransform;
        ACTIVE_SHAKES.delete(element);
        return;
      }
      const falloff = 1 - progress;
      const dx = (random() * 2 - 1) * amplitude * falloff;
      const dy = (random() * 2 - 1) * amplitude * falloff;
      element.style.transform = `${baseTransform} translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`.trim();
      requestFrame(step);
    }
    requestFrame(step);
  }

  // src/canvas-overlay.js
  var CanvasOverlay = class {
    constructor({
      document: document2 = globalThis.document,
      devicePixelRatio = globalThis.devicePixelRatio ?? 1,
      ResizeObserver = globalThis.ResizeObserver,
      getContext = (canvas) => canvas.getContext?.("2d")
    } = {}) {
      this.document = document2;
      this.devicePixelRatio = devicePixelRatio;
      this.ResizeObserver = ResizeObserver;
      this.getContext = getContext;
      this.canvas = null;
      this.board = null;
      this.resizeObserver = null;
    }
    attach() {
      if (!this._ensureBoard()) return null;
      this.canvas = this.document.getElementById("lichess-kill-overlay");
      if (!this.canvas) {
        this.canvas = this.document.createElement("canvas");
        this.canvas.id = "lichess-kill-overlay";
        Object.assign(this.canvas.style, {
          position: "absolute",
          left: "0px",
          top: "0px",
          pointerEvents: "none",
          zIndex: "3"
        });
      }
      this.sync();
      return this.canvas;
    }
    // (Re)acquires cg-board. Lichess recreates the element on board flips,
    // resizes and SPA navigation — a cached detached node reports a 0x0 rect and
    // would silently collapse the overlay, so always check isConnected.
    _ensureBoard() {
      if (this.board && this.board.isConnected !== false) return this.board;
      const board = this.document.querySelector("cg-board");
      if (!board) return null;
      this.board = board;
      if (this.ResizeObserver) {
        this.resizeObserver?.disconnect();
        this.resizeObserver = new this.ResizeObserver(() => this.sync());
        this.resizeObserver.observe(board);
      }
      return board;
    }
    sync() {
      const board = this._ensureBoard();
      if (!board || !this.canvas) return null;
      const container = board.parentElement;
      if (container && this.canvas.parentElement !== container) {
        container.appendChild(this.canvas);
      }
      const rect = board.getBoundingClientRect();
      const size = rect.width;
      const dpr = this.devicePixelRatio;
      Object.assign(this.canvas.style, {
        left: `${board.offsetLeft || 0}px`,
        top: `${board.offsetTop || 0}px`,
        width: `${size}px`,
        height: `${size}px`
      });
      const bufferSize = Math.round(size * dpr);
      if (this.canvas.width !== bufferSize) this.canvas.width = bufferSize;
      if (this.canvas.height !== bufferSize) this.canvas.height = bufferSize;
      const context = this.getContext(this.canvas);
      context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
      return {
        canvas: this.canvas,
        context,
        size,
        squareSize: size / 8,
        isBlackOrientation: this.document.querySelector(".cg-wrap")?.classList.contains("orientation-black") ?? false
      };
    }
  };

  // node_modules/chess.js/dist/esm/chess.js
  function rootNode(comment) {
    return comment !== null ? { comment, variations: [] } : { variations: [] };
  }
  function node(move, suffix, nag, comment, variations) {
    const node2 = { move, variations };
    if (suffix) {
      node2.suffix = suffix;
    }
    if (nag) {
      node2.nag = nag;
    }
    if (comment !== null) {
      node2.comment = comment;
    }
    return node2;
  }
  function lineToTree(...nodes) {
    const [root, ...rest] = nodes;
    let parent = root;
    for (const child of rest) {
      if (child !== null) {
        parent.variations = [child, ...child.variations];
        child.variations = [];
        parent = child;
      }
    }
    return root;
  }
  function pgn(headers, game) {
    if (game.marker && game.marker.comment) {
      let node2 = game.root;
      while (true) {
        const next = node2.variations[0];
        if (!next) {
          node2.comment = game.marker.comment;
          break;
        }
        node2 = next;
      }
    }
    return {
      headers,
      root: game.root,
      result: (game.marker && game.marker.result) ?? void 0
    };
  }
  function peg$subclass(child, parent) {
    function C() {
      this.constructor = child;
    }
    C.prototype = parent.prototype;
    child.prototype = new C();
  }
  function peg$SyntaxError(message, expected, found, location2) {
    var self = Error.call(this, message);
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(self, peg$SyntaxError.prototype);
    }
    self.expected = expected;
    self.found = found;
    self.location = location2;
    self.name = "SyntaxError";
    return self;
  }
  peg$subclass(peg$SyntaxError, Error);
  function peg$padEnd(str, targetLength, padString) {
    padString = padString || " ";
    if (str.length > targetLength) {
      return str;
    }
    targetLength -= str.length;
    padString += padString.repeat(targetLength);
    return str + padString.slice(0, targetLength);
  }
  peg$SyntaxError.prototype.format = function(sources) {
    var str = "Error: " + this.message;
    if (this.location) {
      var src = null;
      var k;
      for (k = 0; k < sources.length; k++) {
        if (sources[k].source === this.location.source) {
          src = sources[k].text.split(/\r\n|\n|\r/g);
          break;
        }
      }
      var s = this.location.start;
      var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
      var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
      if (src) {
        var e = this.location.end;
        var filler = peg$padEnd("", offset_s.line.toString().length, " ");
        var line = src[s.line - 1];
        var last = s.line === e.line ? e.column : line.length + 1;
        var hatLen = last - s.column || 1;
        str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
      } else {
        str += "\n at " + loc;
      }
    }
    return str;
  };
  peg$SyntaxError.buildMessage = function(expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
      literal: function(expectation) {
        return '"' + literalEscape(expectation.text) + '"';
      },
      class: function(expectation) {
        var escapedParts = expectation.parts.map(function(part) {
          return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
        });
        return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
      },
      any: function() {
        return "any character";
      },
      end: function() {
        return "end of input";
      },
      other: function(expectation) {
        return expectation.description;
      }
    };
    function hex(ch) {
      return ch.charCodeAt(0).toString(16).toUpperCase();
    }
    function literalEscape(s) {
      return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
        return "\\x0" + hex(ch);
      }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return "\\x" + hex(ch);
      });
    }
    function classEscape(s) {
      return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
        return "\\x0" + hex(ch);
      }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
        return "\\x" + hex(ch);
      });
    }
    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }
    function describeExpected(expected2) {
      var descriptions = expected2.map(describeExpectation);
      var i, j;
      descriptions.sort();
      if (descriptions.length > 0) {
        for (i = 1, j = 1; i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }
      switch (descriptions.length) {
        case 1:
          return descriptions[0];
        case 2:
          return descriptions[0] + " or " + descriptions[1];
        default:
          return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
      }
    }
    function describeFound(found2) {
      return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
    }
    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  };
  function peg$parse(input, options) {
    options = options !== void 0 ? options : {};
    var peg$FAILED = {};
    var peg$source = options.grammarSource;
    var peg$startRuleFunctions = { pgn: peg$parsepgn };
    var peg$startRuleFunction = peg$parsepgn;
    var peg$c0 = "[";
    var peg$c1 = '"';
    var peg$c2 = "]";
    var peg$c3 = ".";
    var peg$c4 = "O-O-O";
    var peg$c5 = "O-O";
    var peg$c6 = "0-0-0";
    var peg$c7 = "0-0";
    var peg$c8 = "$";
    var peg$c9 = "{";
    var peg$c10 = "}";
    var peg$c11 = ";";
    var peg$c12 = "(";
    var peg$c13 = ")";
    var peg$c14 = "1-0";
    var peg$c15 = "0-1";
    var peg$c16 = "1/2-1/2";
    var peg$c17 = "*";
    var peg$r0 = /^[a-zA-Z]/;
    var peg$r1 = /^[^"]/;
    var peg$r2 = /^[0-9]/;
    var peg$r3 = /^[.]/;
    var peg$r4 = /^[a-zA-Z1-8\-=]/;
    var peg$r5 = /^[+#]/;
    var peg$r6 = /^[!?]/;
    var peg$r7 = /^[^}]/;
    var peg$r8 = /^[^\r\n]/;
    var peg$r9 = /^[ \t\r\n]/;
    var peg$e0 = peg$otherExpectation("tag pair");
    var peg$e1 = peg$literalExpectation("[", false);
    var peg$e2 = peg$literalExpectation('"', false);
    var peg$e3 = peg$literalExpectation("]", false);
    var peg$e4 = peg$otherExpectation("tag name");
    var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
    var peg$e6 = peg$otherExpectation("tag value");
    var peg$e7 = peg$classExpectation(['"'], true, false);
    var peg$e8 = peg$otherExpectation("move number");
    var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
    var peg$e10 = peg$literalExpectation(".", false);
    var peg$e11 = peg$classExpectation(["."], false, false);
    var peg$e12 = peg$otherExpectation("standard algebraic notation");
    var peg$e13 = peg$literalExpectation("O-O-O", false);
    var peg$e14 = peg$literalExpectation("O-O", false);
    var peg$e15 = peg$literalExpectation("0-0-0", false);
    var peg$e16 = peg$literalExpectation("0-0", false);
    var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
    var peg$e18 = peg$classExpectation(["+", "#"], false, false);
    var peg$e19 = peg$otherExpectation("suffix annotation");
    var peg$e20 = peg$classExpectation(["!", "?"], false, false);
    var peg$e21 = peg$otherExpectation("NAG");
    var peg$e22 = peg$literalExpectation("$", false);
    var peg$e23 = peg$otherExpectation("brace comment");
    var peg$e24 = peg$literalExpectation("{", false);
    var peg$e25 = peg$classExpectation(["}"], true, false);
    var peg$e26 = peg$literalExpectation("}", false);
    var peg$e27 = peg$otherExpectation("rest of line comment");
    var peg$e28 = peg$literalExpectation(";", false);
    var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
    var peg$e30 = peg$otherExpectation("variation");
    var peg$e31 = peg$literalExpectation("(", false);
    var peg$e32 = peg$literalExpectation(")", false);
    var peg$e33 = peg$otherExpectation("game termination marker");
    var peg$e34 = peg$literalExpectation("1-0", false);
    var peg$e35 = peg$literalExpectation("0-1", false);
    var peg$e36 = peg$literalExpectation("1/2-1/2", false);
    var peg$e37 = peg$literalExpectation("*", false);
    var peg$e38 = peg$otherExpectation("whitespace");
    var peg$e39 = peg$classExpectation([" ", "	", "\r", "\n"], false, false);
    var peg$f0 = function(headers, game) {
      return pgn(headers, game);
    };
    var peg$f1 = function(tagPairs) {
      return Object.fromEntries(tagPairs);
    };
    var peg$f2 = function(tagName, tagValue) {
      return [tagName, tagValue];
    };
    var peg$f3 = function(root, marker) {
      return { root, marker };
    };
    var peg$f4 = function(comment, moves) {
      return lineToTree(rootNode(comment), ...moves.flat());
    };
    var peg$f5 = function(san, suffix, nag, comment, variations) {
      return node(san, suffix, nag, comment, variations);
    };
    var peg$f6 = function(nag) {
      return nag;
    };
    var peg$f7 = function(comment) {
      return comment.replace(/[\r\n]+/g, " ");
    };
    var peg$f8 = function(comment) {
      return comment.trim();
    };
    var peg$f9 = function(line) {
      return line;
    };
    var peg$f10 = function(result, comment) {
      return { result, comment };
    };
    var peg$currPos = options.peg$currPos | 0;
    var peg$posDetailsCache = [{ line: 1, column: 1 }];
    var peg$maxFailPos = peg$currPos;
    var peg$maxFailExpected = options.peg$maxFailExpected || [];
    var peg$silentFails = options.peg$silentFails | 0;
    var peg$result;
    if (options.startRule) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
      }
      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }
    function peg$literalExpectation(text, ignoreCase) {
      return { type: "literal", text, ignoreCase };
    }
    function peg$classExpectation(parts, inverted, ignoreCase) {
      return { type: "class", parts, inverted, ignoreCase };
    }
    function peg$endExpectation() {
      return { type: "end" };
    }
    function peg$otherExpectation(description) {
      return { type: "other", description };
    }
    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos];
      var p;
      if (details) {
        return details;
      } else {
        if (pos >= peg$posDetailsCache.length) {
          p = peg$posDetailsCache.length - 1;
        } else {
          p = pos;
          while (!peg$posDetailsCache[--p]) {
          }
        }
        details = peg$posDetailsCache[p];
        details = {
          line: details.line,
          column: details.column
        };
        while (p < pos) {
          if (input.charCodeAt(p) === 10) {
            details.line++;
            details.column = 1;
          } else {
            details.column++;
          }
          p++;
        }
        peg$posDetailsCache[pos] = details;
        return details;
      }
    }
    function peg$computeLocation(startPos, endPos, offset) {
      var startPosDetails = peg$computePosDetails(startPos);
      var endPosDetails = peg$computePosDetails(endPos);
      var res = {
        source: peg$source,
        start: {
          offset: startPos,
          line: startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line: endPosDetails.line,
          column: endPosDetails.column
        }
      };
      return res;
    }
    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) {
        return;
      }
      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }
      peg$maxFailExpected.push(expected);
    }
    function peg$buildStructuredError(expected, found, location2) {
      return new peg$SyntaxError(
        peg$SyntaxError.buildMessage(expected, found),
        expected,
        found,
        location2
      );
    }
    function peg$parsepgn() {
      var s0, s1, s2;
      s0 = peg$currPos;
      s1 = peg$parsetagPairSection();
      s2 = peg$parsemoveTextSection();
      s0 = peg$f0(s1, s2);
      return s0;
    }
    function peg$parsetagPairSection() {
      var s0, s1, s2;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsetagPair();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsetagPair();
      }
      s2 = peg$parse_();
      s0 = peg$f1(s1);
      return s0;
    }
    function peg$parsetagPair() {
      var s0, s2, s4, s6, s7, s8, s10;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 91) {
        s2 = peg$c0;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e1);
        }
      }
      if (s2 !== peg$FAILED) {
        peg$parse_();
        s4 = peg$parsetagName();
        if (s4 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 34) {
            s6 = peg$c1;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e2);
            }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsetagValue();
            if (input.charCodeAt(peg$currPos) === 34) {
              s8 = peg$c1;
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e2);
              }
            }
            if (s8 !== peg$FAILED) {
              peg$parse_();
              if (input.charCodeAt(peg$currPos) === 93) {
                s10 = peg$c2;
                peg$currPos++;
              } else {
                s10 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e3);
                }
              }
              if (s10 !== peg$FAILED) {
                s0 = peg$f2(s4, s7);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e0);
        }
      }
      return s0;
    }
    function peg$parsetagName() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r0.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e5);
        }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = input.charAt(peg$currPos);
          if (peg$r0.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e4);
        }
      }
      return s0;
    }
    function peg$parsetagValue() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e7);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r1.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e7);
          }
        }
      }
      s0 = input.substring(s0, peg$currPos);
      peg$silentFails--;
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e6);
      }
      return s0;
    }
    function peg$parsemoveTextSection() {
      var s0, s1, s3;
      s0 = peg$currPos;
      s1 = peg$parseline();
      peg$parse_();
      s3 = peg$parsegameTerminationMarker();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$parse_();
      s0 = peg$f3(s1, s3);
      return s0;
    }
    function peg$parseline() {
      var s0, s1, s2, s3;
      s0 = peg$currPos;
      s1 = peg$parsecomment();
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      s2 = [];
      s3 = peg$parsemove();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsemove();
      }
      s0 = peg$f4(s1, s2);
      return s0;
    }
    function peg$parsemove() {
      var s0, s4, s5, s6, s7, s8, s9, s10;
      s0 = peg$currPos;
      peg$parse_();
      peg$parsemoveNumber();
      peg$parse_();
      s4 = peg$parsesan();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsesuffixAnnotation();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        s6 = [];
        s7 = peg$parsenag();
        while (s7 !== peg$FAILED) {
          s6.push(s7);
          s7 = peg$parsenag();
        }
        s7 = peg$parse_();
        s8 = peg$parsecomment();
        if (s8 === peg$FAILED) {
          s8 = null;
        }
        s9 = [];
        s10 = peg$parsevariation();
        while (s10 !== peg$FAILED) {
          s9.push(s10);
          s10 = peg$parsevariation();
        }
        s0 = peg$f5(s4, s5, s6, s8, s9);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      return s0;
    }
    function peg$parsemoveNumber() {
      var s0, s1, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e9);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = input.charAt(peg$currPos);
        if (peg$r2.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
      }
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c3;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e10);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r3.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e11);
          }
        }
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = input.charAt(peg$currPos);
          if (peg$r3.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e11);
            }
          }
        }
        s1 = [s1, s2, s3, s4];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e8);
        }
      }
      return s0;
    }
    function peg$parsesan() {
      var s0, s1, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c4) {
        s2 = peg$c4;
        peg$currPos += 5;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e13);
        }
      }
      if (s2 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c5) {
          s2 = peg$c5;
          peg$currPos += 3;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e14);
          }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c6) {
            s2 = peg$c6;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e15);
            }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c7) {
              s2 = peg$c7;
              peg$currPos += 3;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e16);
              }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$currPos;
              s3 = input.charAt(peg$currPos);
              if (peg$r0.test(s3)) {
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e5);
                }
              }
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = input.charAt(peg$currPos);
                if (peg$r4.test(s5)) {
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e17);
                  }
                }
                if (s5 !== peg$FAILED) {
                  while (s5 !== peg$FAILED) {
                    s4.push(s5);
                    s5 = input.charAt(peg$currPos);
                    if (peg$r4.test(s5)) {
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e17);
                      }
                    }
                  }
                } else {
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  s3 = [s3, s4];
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            }
          }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = input.charAt(peg$currPos);
        if (peg$r5.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e18);
          }
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e12);
        }
      }
      return s0;
    }
    function peg$parsesuffixAnnotation() {
      var s0, s1, s2;
      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = input.charAt(peg$currPos);
      if (peg$r6.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e20);
        }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (s1.length >= 2) {
          s2 = peg$FAILED;
        } else {
          s2 = input.charAt(peg$currPos);
          if (peg$r6.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
        }
      }
      if (s1.length < 1) {
        peg$currPos = s0;
        s0 = peg$FAILED;
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e19);
        }
      }
      return s0;
    }
    function peg$parsenag() {
      var s0, s2, s3, s4, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 36) {
        s2 = peg$c8;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e22);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = [];
        s5 = input.charAt(peg$currPos);
        if (peg$r2.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e9);
          }
        }
        if (s5 !== peg$FAILED) {
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = input.charAt(peg$currPos);
            if (peg$r2.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
          }
        } else {
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s3 = input.substring(s3, peg$currPos);
        } else {
          s3 = s4;
        }
        if (s3 !== peg$FAILED) {
          s0 = peg$f6(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e21);
        }
      }
      return s0;
    }
    function peg$parsecomment() {
      var s0;
      s0 = peg$parsebraceComment();
      if (s0 === peg$FAILED) {
        s0 = peg$parserestOfLineComment();
      }
      return s0;
    }
    function peg$parsebraceComment() {
      var s0, s1, s2, s3, s4;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c9;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e24);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = input.charAt(peg$currPos);
        if (peg$r7.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e25);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = input.charAt(peg$currPos);
          if (peg$r7.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e25);
            }
          }
        }
        s2 = input.substring(s2, peg$currPos);
        if (input.charCodeAt(peg$currPos) === 125) {
          s3 = peg$c10;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e26);
          }
        }
        if (s3 !== peg$FAILED) {
          s0 = peg$f7(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e23);
        }
      }
      return s0;
    }
    function peg$parserestOfLineComment() {
      var s0, s1, s2, s3, s4;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c11;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e28);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = input.charAt(peg$currPos);
        if (peg$r8.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e29);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = input.charAt(peg$currPos);
          if (peg$r8.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e29);
            }
          }
        }
        s2 = input.substring(s2, peg$currPos);
        s0 = peg$f8(s2);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e27);
        }
      }
      return s0;
    }
    function peg$parsevariation() {
      var s0, s2, s3, s5;
      peg$silentFails++;
      s0 = peg$currPos;
      peg$parse_();
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c12;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e31);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseline();
        if (s3 !== peg$FAILED) {
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 41) {
            s5 = peg$c13;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e32);
            }
          }
          if (s5 !== peg$FAILED) {
            s0 = peg$f9(s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        if (peg$silentFails === 0) {
          peg$fail(peg$e30);
        }
      }
      return s0;
    }
    function peg$parsegameTerminationMarker() {
      var s0, s1, s3;
      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c14) {
        s1 = peg$c14;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e34);
        }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c15) {
          s1 = peg$c15;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e35);
          }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c16) {
            s1 = peg$c16;
            peg$currPos += 7;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e36);
            }
          }
          if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 42) {
              s1 = peg$c17;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e37);
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$parse_();
        s3 = peg$parsecomment();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s0 = peg$f10(s1, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e33);
        }
      }
      return s0;
    }
    function peg$parse_() {
      var s0, s1;
      peg$silentFails++;
      s0 = [];
      s1 = input.charAt(peg$currPos);
      if (peg$r9.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$e39);
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r9.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e39);
          }
        }
      }
      peg$silentFails--;
      s1 = peg$FAILED;
      if (peg$silentFails === 0) {
        peg$fail(peg$e38);
      }
      return s0;
    }
    peg$result = peg$startRuleFunction();
    if (options.peg$library) {
      return (
        /** @type {any} */
        {
          peg$result,
          peg$currPos,
          peg$FAILED,
          peg$maxFailExpected,
          peg$maxFailPos
        }
      );
    }
    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail(peg$endExpectation());
      }
      throw peg$buildStructuredError(
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }
  var MASK64 = 0xffffffffffffffffn;
  function rotl(x, k) {
    return (x << k | x >> 64n - k) & 0xffffffffffffffffn;
  }
  function wrappingMul(x, y) {
    return x * y & MASK64;
  }
  function xoroshiro128(state) {
    return function() {
      let s0 = BigInt(state & MASK64);
      let s1 = BigInt(state >> 64n & MASK64);
      const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
      s1 ^= s0;
      s0 = (rotl(s0, 24n) ^ s1 ^ s1 << 16n) & MASK64;
      s1 = rotl(s1, 37n);
      state = s1 << 64n | s0;
      return result;
    };
  }
  var rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
  var PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
  var EP_KEYS = Array.from({ length: 8 }, () => rand());
  var CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
  var SIDE_KEY = rand();
  var WHITE = "w";
  var BLACK = "b";
  var PAWN = "p";
  var KNIGHT = "n";
  var BISHOP = "b";
  var ROOK = "r";
  var QUEEN = "q";
  var KING = "k";
  var DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var Move = class {
    color;
    from;
    to;
    piece;
    captured;
    promotion;
    /**
     * @deprecated This field is deprecated and will be removed in version 2.0.0.
     * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
     * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
     * `isBigPawn`
     */
    flags;
    san;
    lan;
    before;
    after;
    constructor(chess, internal) {
      const { color, piece, from, to, flags, captured, promotion } = internal;
      const fromAlgebraic = algebraic(from);
      const toAlgebraic = algebraic(to);
      this.color = color;
      this.piece = piece;
      this.from = fromAlgebraic;
      this.to = toAlgebraic;
      this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
      this.lan = fromAlgebraic + toAlgebraic;
      this.before = chess.fen();
      chess["_makeMove"](internal);
      this.after = chess.fen();
      chess["_undoMove"]();
      this.flags = "";
      for (const flag in BITS) {
        if (BITS[flag] & flags) {
          this.flags += FLAGS[flag];
        }
      }
      if (captured) {
        this.captured = captured;
      }
      if (promotion) {
        this.promotion = promotion;
        this.lan += promotion;
      }
    }
    isCapture() {
      return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
    }
    isPromotion() {
      return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
    }
    isEnPassant() {
      return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
    }
    isKingsideCastle() {
      return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
    }
    isQueensideCastle() {
      return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
    }
    isBigPawn() {
      return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
    }
  };
  var EMPTY = -1;
  var FLAGS = {
    NORMAL: "n",
    CAPTURE: "c",
    BIG_PAWN: "b",
    EP_CAPTURE: "e",
    PROMOTION: "p",
    KSIDE_CASTLE: "k",
    QSIDE_CASTLE: "q",
    NULL_MOVE: "-"
  };
  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
    NULL_MOVE: 128
  };
  var SEVEN_TAG_ROSTER = {
    Event: "?",
    Site: "?",
    Date: "????.??.??",
    Round: "?",
    White: "?",
    Black: "?",
    Result: "*"
  };
  var SUPLEMENTAL_TAGS = {
    WhiteTitle: null,
    BlackTitle: null,
    WhiteElo: null,
    BlackElo: null,
    WhiteUSCF: null,
    BlackUSCF: null,
    WhiteNA: null,
    BlackNA: null,
    WhiteType: null,
    BlackType: null,
    EventDate: null,
    EventSponsor: null,
    Section: null,
    Stage: null,
    Board: null,
    Opening: null,
    Variation: null,
    SubVariation: null,
    ECO: null,
    NIC: null,
    Time: null,
    UTCTime: null,
    UTCDate: null,
    TimeControl: null,
    SetUp: null,
    FEN: null,
    Termination: null,
    Annotator: null,
    Mode: null,
    PlyCount: null
  };
  var HEADER_TEMPLATE = {
    ...SEVEN_TAG_ROSTER,
    ...SUPLEMENTAL_TAGS
  };
  var Ox88 = {
    a8: 0,
    b8: 1,
    c8: 2,
    d8: 3,
    e8: 4,
    f8: 5,
    g8: 6,
    h8: 7,
    a7: 16,
    b7: 17,
    c7: 18,
    d7: 19,
    e7: 20,
    f7: 21,
    g7: 22,
    h7: 23,
    a6: 32,
    b6: 33,
    c6: 34,
    d6: 35,
    e6: 36,
    f6: 37,
    g6: 38,
    h6: 39,
    a5: 48,
    b5: 49,
    c5: 50,
    d5: 51,
    e5: 52,
    f5: 53,
    g5: 54,
    h5: 55,
    a4: 64,
    b4: 65,
    c4: 66,
    d4: 67,
    e4: 68,
    f4: 69,
    g4: 70,
    h4: 71,
    a3: 80,
    b3: 81,
    c3: 82,
    d3: 83,
    e3: 84,
    f3: 85,
    g3: 86,
    h3: 87,
    a2: 96,
    b2: 97,
    c2: 98,
    d2: 99,
    e2: 100,
    f2: 101,
    g2: 102,
    h2: 103,
    a1: 112,
    b1: 113,
    c1: 114,
    d1: 115,
    e1: 116,
    f1: 117,
    g1: 118,
    h1: 119
  };
  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };
  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1]
  };
  var ATTACKS = [
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    24,
    24,
    24,
    24,
    56,
    0,
    56,
    24,
    24,
    24,
    24,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20
  ];
  var RAYS = [
    17,
    0,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    16,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    16,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    16,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    -16,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    -16,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    -16,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    0,
    -17
  ];
  var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
  var SYMBOLS = "pnbrqkPNBRQK";
  var PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_7 = 1;
  var RANK_8 = 0;
  var SIDES = {
    [KING]: BITS.KSIDE_CASTLE,
    [QUEEN]: BITS.QSIDE_CASTLE
  };
  var ROOKS = {
    w: [
      { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
    ],
    b: [
      { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
    ]
  };
  var SECOND_RANK = { b: RANK_7, w: RANK_2 };
  var SAN_NULLMOVE = "--";
  function rank(square) {
    return square >> 4;
  }
  function file(square) {
    return square & 15;
  }
  function isDigit(c) {
    return "0123456789".indexOf(c) !== -1;
  }
  function algebraic(square) {
    const f = file(square);
    const r = rank(square);
    return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
  }
  function swapColor(color) {
    return color === WHITE ? BLACK : WHITE;
  }
  function validateFen(fen) {
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {
        ok: false,
        error: "Invalid FEN: must contain six space-delimited fields"
      };
    }
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
      return {
        ok: false,
        error: "Invalid FEN: move number must be a positive integer"
      };
    }
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
      return {
        ok: false,
        error: "Invalid FEN: half move counter number must be a non-negative integer"
      };
    }
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
    }
    if (/[^kKqQ-]/.test(tokens[2])) {
      return { ok: false, error: "Invalid FEN: castling availability is invalid" };
    }
    if (!/^(w|b)$/.test(tokens[1])) {
      return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
    }
    const rows = tokens[0].split("/");
    if (rows.length !== 8) {
      return {
        ok: false,
        error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
      };
    }
    for (let i = 0; i < rows.length; i++) {
      let sumFields = 0;
      let previousWasNumber = false;
      for (let k = 0; k < rows[i].length; k++) {
        if (isDigit(rows[i][k])) {
          if (previousWasNumber) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (consecutive number)"
            };
          }
          sumFields += parseInt(rows[i][k], 10);
          previousWasNumber = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (invalid piece)"
            };
          }
          sumFields += 1;
          previousWasNumber = false;
        }
      }
      if (sumFields !== 8) {
        return {
          ok: false,
          error: "Invalid FEN: piece data is invalid (too many squares in rank)"
        };
      }
    }
    if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
      return { ok: false, error: "Invalid FEN: illegal en-passant square" };
    }
    const kings = [
      { color: "white", regex: /K/g },
      { color: "black", regex: /k/g }
    ];
    for (const { color, regex } of kings) {
      if (!regex.test(tokens[0])) {
        return { ok: false, error: `Invalid FEN: missing ${color} king` };
      }
      if ((tokens[0].match(regex) || []).length > 1) {
        return { ok: false, error: `Invalid FEN: too many ${color} kings` };
      }
    }
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
      return {
        ok: false,
        error: "Invalid FEN: some pawns are on the edge rows"
      };
    }
    return { ok: true };
  }
  function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
      const ambigFrom = moves[i].from;
      const ambigTo = moves[i].to;
      const ambigPiece = moves[i].piece;
      if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
        ambiguities++;
        if (rank(from) === rank(ambigFrom)) {
          sameRank++;
        }
        if (file(from) === file(ambigFrom)) {
          sameFile++;
        }
      }
    }
    if (ambiguities > 0) {
      if (sameRank > 0 && sameFile > 0) {
        return algebraic(from);
      } else if (sameFile > 0) {
        return algebraic(from).charAt(1);
      } else {
        return algebraic(from).charAt(0);
      }
    }
    return "";
  }
  function addMove(moves, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
      for (let i = 0; i < PROMOTIONS.length; i++) {
        const promotion = PROMOTIONS[i];
        moves.push({
          color,
          from,
          to,
          piece,
          captured,
          promotion,
          flags: flags | BITS.PROMOTION
        });
      }
    } else {
      moves.push({
        color,
        from,
        to,
        piece,
        captured,
        flags
      });
    }
  }
  function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= "a" && pieceType <= "h") {
      const matches = san.match(/[a-h]\d.*[a-h]\d/);
      if (matches) {
        return void 0;
      }
      return PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === "o") {
      return KING;
    }
    return pieceType;
  }
  function strippedSan(move) {
    return move.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
  }
  var Chess = class {
    _board = new Array(128);
    _turn = WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    _hash = 0n;
    // tracks number of times a position has been seen for repetition checking
    _positionCount = /* @__PURE__ */ new Map();
    constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
      this.load(fen, { skipValidation });
    }
    clear({ preserveHeaders = false } = {}) {
      this._board = new Array(128);
      this._kings = { w: EMPTY, b: EMPTY };
      this._turn = WHITE;
      this._castling = { w: 0, b: 0 };
      this._epSquare = EMPTY;
      this._halfMoves = 0;
      this._moveNumber = 1;
      this._history = [];
      this._comments = {};
      this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
      this._hash = this._computeHash();
      this._positionCount = /* @__PURE__ */ new Map();
      this._header["SetUp"] = null;
      this._header["FEN"] = null;
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
      let tokens = fen.split(/\s+/);
      if (tokens.length >= 2 && tokens.length < 6) {
        const adjustments = ["-", "-", "0", "1"];
        fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
      }
      tokens = fen.split(/\s+/);
      if (!skipValidation) {
        const { ok, error } = validateFen(fen);
        if (!ok) {
          throw new Error(error);
        }
      }
      const position = tokens[0];
      let square = 0;
      this.clear({ preserveHeaders });
      for (let i = 0; i < position.length; i++) {
        const piece = position.charAt(i);
        if (piece === "/") {
          square += 8;
        } else if (isDigit(piece)) {
          square += parseInt(piece, 10);
        } else {
          const color = piece < "a" ? WHITE : BLACK;
          this._put({ type: piece.toLowerCase(), color }, algebraic(square));
          square++;
        }
      }
      this._turn = tokens[1];
      if (tokens[2].indexOf("K") > -1) {
        this._castling.w |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("Q") > -1) {
        this._castling.w |= BITS.QSIDE_CASTLE;
      }
      if (tokens[2].indexOf("k") > -1) {
        this._castling.b |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("q") > -1) {
        this._castling.b |= BITS.QSIDE_CASTLE;
      }
      this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
      this._halfMoves = parseInt(tokens[4], 10);
      this._moveNumber = parseInt(tokens[5], 10);
      this._hash = this._computeHash();
      this._updateSetup(fen);
      this._incPositionCount();
    }
    fen({ forceEnpassantSquare = false } = {}) {
      let empty = 0;
      let fen = "";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i]) {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const { color, type: piece } = this._board[i];
          fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
        } else {
          empty++;
        }
        if (i + 1 & 136) {
          if (empty > 0) {
            fen += empty;
          }
          if (i !== Ox88.h1) {
            fen += "/";
          }
          empty = 0;
          i += 8;
        }
      }
      let castling = "";
      if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
        castling += "K";
      }
      if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
        castling += "Q";
      }
      if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
        castling += "k";
      }
      if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
        castling += "q";
      }
      castling = castling || "-";
      let epSquare = "-";
      if (this._epSquare !== EMPTY) {
        if (forceEnpassantSquare) {
          epSquare = algebraic(this._epSquare);
        } else {
          const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
          const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
          for (const square of squares) {
            if (square & 136) {
              continue;
            }
            const color = this._turn;
            if (this._board[square]?.color === color && this._board[square]?.type === PAWN) {
              this._makeMove({
                color,
                from: square,
                to: this._epSquare,
                piece: PAWN,
                captured: PAWN,
                flags: BITS.EP_CAPTURE
              });
              const isLegal = !this._isKingAttacked(color);
              this._undoMove();
              if (isLegal) {
                epSquare = algebraic(this._epSquare);
                break;
              }
            }
          }
        }
      }
      return [
        fen,
        this._turn,
        castling,
        epSquare,
        this._halfMoves,
        this._moveNumber
      ].join(" ");
    }
    _pieceKey(i) {
      if (!this._board[i]) {
        return 0n;
      }
      const { color, type } = this._board[i];
      const colorIndex = {
        w: 0,
        b: 1
      }[color];
      const typeIndex = {
        p: 0,
        n: 1,
        b: 2,
        r: 3,
        q: 4,
        k: 5
      }[type];
      return PIECE_KEYS[colorIndex][typeIndex][i];
    }
    _epKey() {
      return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
    }
    _castlingKey() {
      const index = this._castling.w >> 5 | this._castling.b >> 3;
      return CASTLING_KEYS[index];
    }
    _computeHash() {
      let hash = 0n;
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (this._board[i]) {
          hash ^= this._pieceKey(i);
        }
      }
      hash ^= this._epKey();
      hash ^= this._castlingKey();
      if (this._turn === "b") {
        hash ^= SIDE_KEY;
      }
      return hash;
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
      if (this._history.length > 0)
        return;
      if (fen !== DEFAULT_POSITION) {
        this._header["SetUp"] = "1";
        this._header["FEN"] = fen;
      } else {
        this._header["SetUp"] = null;
        this._header["FEN"] = null;
      }
    }
    reset() {
      this.load(DEFAULT_POSITION);
    }
    get(square) {
      return this._board[Ox88[square]];
    }
    findPiece(piece) {
      const squares = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (!this._board[i] || this._board[i]?.color !== piece.color) {
          continue;
        }
        if (this._board[i].color === piece.color && this._board[i].type === piece.type) {
          squares.push(algebraic(i));
        }
      }
      return squares;
    }
    put({ type, color }, square) {
      if (this._put({ type, color }, square)) {
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return true;
      }
      return false;
    }
    _set(sq, piece) {
      this._hash ^= this._pieceKey(sq);
      this._board[sq] = piece;
      this._hash ^= this._pieceKey(sq);
    }
    _put({ type, color }, square) {
      if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
        return false;
      }
      if (!(square in Ox88)) {
        return false;
      }
      const sq = Ox88[square];
      if (type == KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
        return false;
      }
      const currentPieceOnSquare = this._board[sq];
      if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
        this._kings[currentPieceOnSquare.color] = EMPTY;
      }
      this._set(sq, { type, color });
      if (type === KING) {
        this._kings[color] = sq;
      }
      return true;
    }
    _clear(sq) {
      this._hash ^= this._pieceKey(sq);
      delete this._board[sq];
    }
    remove(square) {
      const piece = this.get(square);
      this._clear(Ox88[square]);
      if (piece && piece.type === KING) {
        this._kings[piece.color] = EMPTY;
      }
      this._updateCastlingRights();
      this._updateEnPassantSquare();
      this._updateSetup(this.fen());
      return piece;
    }
    _updateCastlingRights() {
      this._hash ^= this._castlingKey();
      const whiteKingInPlace = this._board[Ox88.e1]?.type === KING && this._board[Ox88.e1]?.color === WHITE;
      const blackKingInPlace = this._board[Ox88.e8]?.type === KING && this._board[Ox88.e8]?.color === BLACK;
      if (!whiteKingInPlace || this._board[Ox88.a1]?.type !== ROOK || this._board[Ox88.a1]?.color !== WHITE) {
        this._castling.w &= -65;
      }
      if (!whiteKingInPlace || this._board[Ox88.h1]?.type !== ROOK || this._board[Ox88.h1]?.color !== WHITE) {
        this._castling.w &= -33;
      }
      if (!blackKingInPlace || this._board[Ox88.a8]?.type !== ROOK || this._board[Ox88.a8]?.color !== BLACK) {
        this._castling.b &= -65;
      }
      if (!blackKingInPlace || this._board[Ox88.h8]?.type !== ROOK || this._board[Ox88.h8]?.color !== BLACK) {
        this._castling.b &= -33;
      }
      this._hash ^= this._castlingKey();
    }
    _updateEnPassantSquare() {
      if (this._epSquare === EMPTY) {
        return;
      }
      const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
      const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
      const attackers = [currentSquare + 1, currentSquare - 1];
      if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || this._board[currentSquare]?.color !== swapColor(this._turn) || this._board[currentSquare]?.type !== PAWN) {
        this._hash ^= this._epKey();
        this._epSquare = EMPTY;
        return;
      }
      const canCapture = (square) => !(square & 136) && this._board[square]?.color === this._turn && this._board[square]?.type === PAWN;
      if (!attackers.some(canCapture)) {
        this._hash ^= this._epKey();
        this._epSquare = EMPTY;
      }
    }
    _attacked(color, square, verbose) {
      const attackers = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (this._board[i] === void 0 || this._board[i].color !== color) {
          continue;
        }
        const piece = this._board[i];
        const difference = i - square;
        if (difference === 0) {
          continue;
        }
        const index = difference + 119;
        if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
          if (piece.type === PAWN) {
            if (difference > 0 && piece.color === WHITE || difference <= 0 && piece.color === BLACK) {
              if (!verbose) {
                return true;
              } else {
                attackers.push(algebraic(i));
              }
            }
            continue;
          }
          if (piece.type === "n" || piece.type === "k") {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
          const offset = RAYS[index];
          let j = i + offset;
          let blocked = false;
          while (j !== square) {
            if (this._board[j] != null) {
              blocked = true;
              break;
            }
            j += offset;
          }
          if (!blocked) {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
        }
      }
      if (verbose) {
        return attackers;
      } else {
        return false;
      }
    }
    attackers(square, attackedBy) {
      if (!attackedBy) {
        return this._attacked(this._turn, Ox88[square], true);
      } else {
        return this._attacked(attackedBy, Ox88[square], true);
      }
    }
    _isKingAttacked(color) {
      const square = this._kings[color];
      return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    hash() {
      return this._hash.toString(16);
    }
    isAttacked(square, attackedBy) {
      return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
      return this._isKingAttacked(this._turn);
    }
    inCheck() {
      return this.isCheck();
    }
    isCheckmate() {
      return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
      return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
      const pieces = {
        b: 0,
        n: 0,
        r: 0,
        q: 0,
        k: 0,
        p: 0
      };
      const bishops = [];
      let numPieces = 0;
      let squareColor = 0;
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        squareColor = (squareColor + 1) % 2;
        if (i & 136) {
          i += 7;
          continue;
        }
        const piece = this._board[i];
        if (piece) {
          pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
          if (piece.type === BISHOP) {
            bishops.push(squareColor);
          }
          numPieces++;
        }
      }
      if (numPieces === 2) {
        return true;
      } else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
      ) {
        return true;
      } else if (numPieces === pieces[BISHOP] + 2) {
        let sum = 0;
        const len = bishops.length;
        for (let i = 0; i < len; i++) {
          sum += bishops[i];
        }
        if (sum === 0 || sum === len) {
          return true;
        }
      }
      return false;
    }
    isThreefoldRepetition() {
      return this._getPositionCount(this._hash) >= 3;
    }
    isDrawByFiftyMoves() {
      return this._halfMoves >= 100;
    }
    isDraw() {
      return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
    }
    isGameOver() {
      return this.isCheckmate() || this.isDraw();
    }
    moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
      const moves = this._moves({ square, piece });
      if (verbose) {
        return moves.map((move) => new Move(this, move));
      } else {
        return moves.map((move) => this._moveToSan(move, moves));
      }
    }
    _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
      const forSquare = square ? square.toLowerCase() : void 0;
      const forPiece = piece?.toLowerCase();
      const moves = [];
      const us = this._turn;
      const them = swapColor(us);
      let firstSquare = Ox88.a8;
      let lastSquare = Ox88.h1;
      let singleSquare = false;
      if (forSquare) {
        if (!(forSquare in Ox88)) {
          return [];
        } else {
          firstSquare = lastSquare = Ox88[forSquare];
          singleSquare = true;
        }
      }
      for (let from = firstSquare; from <= lastSquare; from++) {
        if (from & 136) {
          from += 7;
          continue;
        }
        if (!this._board[from] || this._board[from].color === them) {
          continue;
        }
        const { type } = this._board[from];
        let to;
        if (type === PAWN) {
          if (forPiece && forPiece !== type)
            continue;
          to = from + PAWN_OFFSETS[us][0];
          if (!this._board[to]) {
            addMove(moves, us, from, to, PAWN);
            to = from + PAWN_OFFSETS[us][1];
            if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
              addMove(moves, us, from, to, PAWN, void 0, BITS.BIG_PAWN);
            }
          }
          for (let j = 2; j < 4; j++) {
            to = from + PAWN_OFFSETS[us][j];
            if (to & 136)
              continue;
            if (this._board[to]?.color === them) {
              addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
            } else if (to === this._epSquare) {
              addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
            }
          }
        } else {
          if (forPiece && forPiece !== type)
            continue;
          for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
            const offset = PIECE_OFFSETS[type][j];
            to = from;
            while (true) {
              to += offset;
              if (to & 136)
                break;
              if (!this._board[to]) {
                addMove(moves, us, from, to, type);
              } else {
                if (this._board[to].color === us)
                  break;
                addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                break;
              }
              if (type === KNIGHT || type === KING)
                break;
            }
          }
        }
      }
      if (forPiece === void 0 || forPiece === KING) {
        if (!singleSquare || lastSquare === this._kings[us]) {
          if (this._castling[us] & BITS.KSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom + 2;
            if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.KSIDE_CASTLE);
            }
          }
          if (this._castling[us] & BITS.QSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom - 2;
            if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.QSIDE_CASTLE);
            }
          }
        }
      }
      if (!legal || this._kings[us] === -1) {
        return moves;
      }
      const legalMoves = [];
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(us)) {
          legalMoves.push(moves[i]);
        }
        this._undoMove();
      }
      return legalMoves;
    }
    move(move, { strict = false } = {}) {
      let moveObj = null;
      if (typeof move === "string") {
        moveObj = this._moveFromSan(move, strict);
      } else if (move === null) {
        moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
      } else if (typeof move === "object") {
        const moves = this._moves();
        for (let i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) && move.to === algebraic(moves[i].to) && (!("promotion" in moves[i]) || move.promotion === moves[i].promotion)) {
            moveObj = moves[i];
            break;
          }
        }
      }
      if (!moveObj) {
        if (typeof move === "string") {
          throw new Error(`Invalid move: ${move}`);
        } else {
          throw new Error(`Invalid move: ${JSON.stringify(move)}`);
        }
      }
      if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
        throw new Error("Null move not allowed when in check");
      }
      const prettyMove = new Move(this, moveObj);
      this._makeMove(moveObj);
      this._incPositionCount();
      return prettyMove;
    }
    _push(move) {
      this._history.push({
        move,
        kings: { b: this._kings.b, w: this._kings.w },
        turn: this._turn,
        castling: { b: this._castling.b, w: this._castling.w },
        epSquare: this._epSquare,
        halfMoves: this._halfMoves,
        moveNumber: this._moveNumber
      });
    }
    _movePiece(from, to) {
      this._hash ^= this._pieceKey(from);
      this._board[to] = this._board[from];
      delete this._board[from];
      this._hash ^= this._pieceKey(to);
    }
    _makeMove(move) {
      const us = this._turn;
      const them = swapColor(us);
      this._push(move);
      if (move.flags & BITS.NULL_MOVE) {
        if (us === BLACK) {
          this._moveNumber++;
        }
        this._halfMoves++;
        this._turn = them;
        this._epSquare = EMPTY;
        return;
      }
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      if (move.captured) {
        this._hash ^= this._pieceKey(move.to);
      }
      this._movePiece(move.from, move.to);
      if (move.flags & BITS.EP_CAPTURE) {
        if (this._turn === BLACK) {
          this._clear(move.to - 16);
        } else {
          this._clear(move.to + 16);
        }
      }
      if (move.promotion) {
        this._clear(move.to);
        this._set(move.to, { type: move.promotion, color: us });
      }
      if (this._board[move.to].type === KING) {
        this._kings[us] = move.to;
        if (move.flags & BITS.KSIDE_CASTLE) {
          const castlingTo = move.to - 1;
          const castlingFrom = move.to + 1;
          this._movePiece(castlingFrom, castlingTo);
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          const castlingTo = move.to + 1;
          const castlingFrom = move.to - 2;
          this._movePiece(castlingFrom, castlingTo);
        }
        this._castling[us] = 0;
      }
      if (this._castling[us]) {
        for (let i = 0, len = ROOKS[us].length; i < len; i++) {
          if (move.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
            this._castling[us] ^= ROOKS[us][i].flag;
            break;
          }
        }
      }
      if (this._castling[them]) {
        for (let i = 0, len = ROOKS[them].length; i < len; i++) {
          if (move.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
            this._castling[them] ^= ROOKS[them][i].flag;
            break;
          }
        }
      }
      this._hash ^= this._castlingKey();
      if (move.flags & BITS.BIG_PAWN) {
        let epSquare;
        if (us === BLACK) {
          epSquare = move.to - 16;
        } else {
          epSquare = move.to + 16;
        }
        if (!(move.to - 1 & 136) && this._board[move.to - 1]?.type === PAWN && this._board[move.to - 1]?.color === them || !(move.to + 1 & 136) && this._board[move.to + 1]?.type === PAWN && this._board[move.to + 1]?.color === them) {
          this._epSquare = epSquare;
          this._hash ^= this._epKey();
        } else {
          this._epSquare = EMPTY;
        }
      } else {
        this._epSquare = EMPTY;
      }
      if (move.piece === PAWN) {
        this._halfMoves = 0;
      } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        this._halfMoves = 0;
      } else {
        this._halfMoves++;
      }
      if (us === BLACK) {
        this._moveNumber++;
      }
      this._turn = them;
      this._hash ^= SIDE_KEY;
    }
    undo() {
      const hash = this._hash;
      const move = this._undoMove();
      if (move) {
        const prettyMove = new Move(this, move);
        this._decPositionCount(hash);
        return prettyMove;
      }
      return null;
    }
    _undoMove() {
      const old = this._history.pop();
      if (old === void 0) {
        return null;
      }
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      const move = old.move;
      this._kings = old.kings;
      this._turn = old.turn;
      this._castling = old.castling;
      this._epSquare = old.epSquare;
      this._halfMoves = old.halfMoves;
      this._moveNumber = old.moveNumber;
      this._hash ^= this._epKey();
      this._hash ^= this._castlingKey();
      this._hash ^= SIDE_KEY;
      const us = this._turn;
      const them = swapColor(us);
      if (move.flags & BITS.NULL_MOVE) {
        return move;
      }
      this._movePiece(move.to, move.from);
      if (move.piece) {
        this._clear(move.from);
        this._set(move.from, { type: move.piece, color: us });
      }
      if (move.captured) {
        if (move.flags & BITS.EP_CAPTURE) {
          let index;
          if (us === BLACK) {
            index = move.to - 16;
          } else {
            index = move.to + 16;
          }
          this._set(index, { type: PAWN, color: them });
        } else {
          this._set(move.to, { type: move.captured, color: them });
        }
      }
      if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
        let castlingTo, castlingFrom;
        if (move.flags & BITS.KSIDE_CASTLE) {
          castlingTo = move.to + 1;
          castlingFrom = move.to - 1;
        } else {
          castlingTo = move.to - 2;
          castlingFrom = move.to + 1;
        }
        this._movePiece(castlingFrom, castlingTo);
      }
      return move;
    }
    pgn({ newline = "\n", maxWidth = 0 } = {}) {
      const result = [];
      let headerExists = false;
      for (const i in this._header) {
        const headerTag = this._header[i];
        if (headerTag)
          result.push(`[${i} "${this._header[i]}"]` + newline);
        headerExists = true;
      }
      if (headerExists && this._history.length) {
        result.push(newline);
      }
      const appendComment = (moveString2) => {
        const comment = this._comments[this.fen()];
        if (typeof comment !== "undefined") {
          const delimiter = moveString2.length > 0 ? " " : "";
          moveString2 = `${moveString2}${delimiter}{${comment}}`;
        }
        return moveString2;
      };
      const reversedHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      const moves = [];
      let moveString = "";
      if (reversedHistory.length === 0) {
        moves.push(appendComment(""));
      }
      while (reversedHistory.length > 0) {
        moveString = appendComment(moveString);
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (!this._history.length && move.color === "b") {
          const prefix = `${this._moveNumber}. ...`;
          moveString = moveString ? `${moveString} ${prefix}` : prefix;
        } else if (move.color === "w") {
          if (moveString.length) {
            moves.push(moveString);
          }
          moveString = this._moveNumber + ".";
        }
        moveString = moveString + " " + this._moveToSan(move, this._moves({ legal: true }));
        this._makeMove(move);
      }
      if (moveString.length) {
        moves.push(appendComment(moveString));
      }
      moves.push(this._header.Result || "*");
      if (maxWidth === 0) {
        return result.join("") + moves.join(" ");
      }
      const strip = function() {
        if (result.length > 0 && result[result.length - 1] === " ") {
          result.pop();
          return true;
        }
        return false;
      };
      const wrapComment = function(width, move) {
        for (const token of move.split(" ")) {
          if (!token) {
            continue;
          }
          if (width + token.length > maxWidth) {
            while (strip()) {
              width--;
            }
            result.push(newline);
            width = 0;
          }
          result.push(token);
          width += token.length;
          result.push(" ");
          width++;
        }
        if (strip()) {
          width--;
        }
        return width;
      };
      let currentWidth = 0;
      for (let i = 0; i < moves.length; i++) {
        if (currentWidth + moves[i].length > maxWidth) {
          if (moves[i].includes("{")) {
            currentWidth = wrapComment(currentWidth, moves[i]);
            continue;
          }
        }
        if (currentWidth + moves[i].length > maxWidth && i !== 0) {
          if (result[result.length - 1] === " ") {
            result.pop();
          }
          result.push(newline);
          currentWidth = 0;
        } else if (i !== 0) {
          result.push(" ");
          currentWidth++;
        }
        result.push(moves[i]);
        currentWidth += moves[i].length;
      }
      return result.join("");
    }
    /**
     * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
     */
    header(...args) {
      for (let i = 0; i < args.length; i += 2) {
        if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
          this._header[args[i]] = args[i + 1];
        }
      }
      return this._header;
    }
    // TODO: value validation per spec
    setHeader(key, value) {
      this._header[key] = value ?? SEVEN_TAG_ROSTER[key] ?? null;
      return this.getHeaders();
    }
    removeHeader(key) {
      if (key in this._header) {
        this._header[key] = SEVEN_TAG_ROSTER[key] || null;
        return true;
      }
      return false;
    }
    // return only non-null headers (omit placemarker nulls)
    getHeaders() {
      const nonNullHeaders = {};
      for (const [key, value] of Object.entries(this._header)) {
        if (value !== null) {
          nonNullHeaders[key] = value;
        }
      }
      return nonNullHeaders;
    }
    loadPgn(pgn2, { strict = false, newlineChar = "\r?\n" } = {}) {
      if (newlineChar !== "\r?\n") {
        pgn2 = pgn2.replace(new RegExp(newlineChar, "g"), "\n");
      }
      const parsedPgn = peg$parse(pgn2);
      this.reset();
      const headers = parsedPgn.headers;
      let fen = "";
      for (const key in headers) {
        if (key.toLowerCase() === "fen") {
          fen = headers[key];
        }
        this.header(key, headers[key]);
      }
      if (!strict) {
        if (fen) {
          this.load(fen, { preserveHeaders: true });
        }
      } else {
        if (headers["SetUp"] === "1") {
          if (!("FEN" in headers)) {
            throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
          }
          this.load(headers["FEN"], { preserveHeaders: true });
        }
      }
      let node2 = parsedPgn.root;
      while (node2) {
        if (node2.move) {
          const move = this._moveFromSan(node2.move, strict);
          if (move == null) {
            throw new Error(`Invalid move in PGN: ${node2.move}`);
          } else {
            this._makeMove(move);
            this._incPositionCount();
          }
        }
        if (node2.comment !== void 0) {
          this._comments[this.fen()] = node2.comment;
        }
        node2 = node2.variations[0];
      }
      const result = parsedPgn.result;
      if (result && Object.keys(this._header).length && this._header["Result"] !== result) {
        this.setHeader("Result", result);
      }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
      let output = "";
      if (move.flags & BITS.KSIDE_CASTLE) {
        output = "O-O";
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        output = "O-O-O";
      } else if (move.flags & BITS.NULL_MOVE) {
        return SAN_NULLMOVE;
      } else {
        if (move.piece !== PAWN) {
          const disambiguator = getDisambiguator(move, moves);
          output += move.piece.toUpperCase() + disambiguator;
        }
        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
          if (move.piece === PAWN) {
            output += algebraic(move.from)[0];
          }
          output += "x";
        }
        output += algebraic(move.to);
        if (move.promotion) {
          output += "=" + move.promotion.toUpperCase();
        }
      }
      this._makeMove(move);
      if (this.isCheck()) {
        if (this.isCheckmate()) {
          output += "#";
        } else {
          output += "+";
        }
      }
      this._undoMove();
      return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
      let cleanMove = strippedSan(move);
      if (!strict) {
        if (cleanMove === "0-0") {
          cleanMove = "O-O";
        } else if (cleanMove === "0-0-0") {
          cleanMove = "O-O-O";
        }
      }
      if (cleanMove == SAN_NULLMOVE) {
        const res = {
          color: this._turn,
          from: 0,
          to: 0,
          piece: "k",
          flags: BITS.NULL_MOVE
        };
        return res;
      }
      let pieceType = inferPieceType(cleanMove);
      let moves = this._moves({ legal: true, piece: pieceType });
      for (let i = 0, len = moves.length; i < len; i++) {
        if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
          return moves[i];
        }
      }
      if (strict) {
        return null;
      }
      let piece = void 0;
      let matches = void 0;
      let from = void 0;
      let to = void 0;
      let promotion = void 0;
      let overlyDisambiguated = false;
      matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        piece = matches[1];
        from = matches[2];
        to = matches[3];
        promotion = matches[4];
        if (from.length == 1) {
          overlyDisambiguated = true;
        }
      } else {
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
          piece = matches[1];
          from = matches[2];
          to = matches[3];
          promotion = matches[4];
          if (from.length == 1) {
            overlyDisambiguated = true;
          }
        }
      }
      pieceType = inferPieceType(cleanMove);
      moves = this._moves({
        legal: true,
        piece: piece ? piece : pieceType
      });
      if (!to) {
        return null;
      }
      for (let i = 0, len = moves.length; i < len; i++) {
        if (!from) {
          if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace("x", "")) {
            return moves[i];
          }
        } else if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[from] == moves[i].from && Ox88[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        } else if (overlyDisambiguated) {
          const square = algebraic(moves[i].from);
          if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
            return moves[i];
          }
        }
      }
      return null;
    }
    ascii() {
      let s = "   +------------------------+\n";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (file(i) === 0) {
          s += " " + "87654321"[rank(i)] + " |";
        }
        if (this._board[i]) {
          const piece = this._board[i].type;
          const color = this._board[i].color;
          const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
          s += " " + symbol + " ";
        } else {
          s += " . ";
        }
        if (i + 1 & 136) {
          s += "|\n";
          i += 8;
        }
      }
      s += "   +------------------------+\n";
      s += "     a  b  c  d  e  f  g  h";
      return s;
    }
    perft(depth) {
      const moves = this._moves({ legal: false });
      let nodes = 0;
      const color = this._turn;
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(color)) {
          if (depth - 1 > 0) {
            nodes += this.perft(depth - 1);
          } else {
            nodes++;
          }
        }
        this._undoMove();
      }
      return nodes;
    }
    setTurn(color) {
      if (this._turn == color) {
        return false;
      }
      this.move("--");
      return true;
    }
    turn() {
      return this._turn;
    }
    board() {
      const output = [];
      let row = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i] == null) {
          row.push(null);
        } else {
          row.push({
            square: algebraic(i),
            type: this._board[i].type,
            color: this._board[i].color
          });
        }
        if (i + 1 & 136) {
          output.push(row);
          row = [];
          i += 8;
        }
      }
      return output;
    }
    squareColor(square) {
      if (square in Ox88) {
        const sq = Ox88[square];
        return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
      }
      return null;
    }
    history({ verbose = false } = {}) {
      const reversedHistory = [];
      const moveHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (verbose) {
          moveHistory.push(new Move(this, move));
        } else {
          moveHistory.push(this._moveToSan(move, this._moves()));
        }
        this._makeMove(move);
      }
      return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. Old positions are removed from the map if their counts are reduced to 0.
     */
    _getPositionCount(hash) {
      return this._positionCount.get(hash) ?? 0;
    }
    _incPositionCount() {
      this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
    }
    _decPositionCount(hash) {
      const currentCount = this._positionCount.get(hash) ?? 0;
      if (currentCount === 1) {
        this._positionCount.delete(hash);
      } else {
        this._positionCount.set(hash, currentCount - 1);
      }
    }
    _pruneComments() {
      const reversedHistory = [];
      const currentComments = {};
      const copyComment = (fen) => {
        if (fen in this._comments) {
          currentComments[fen] = this._comments[fen];
        }
      };
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      copyComment(this.fen());
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        this._makeMove(move);
        copyComment(this.fen());
      }
      this._comments = currentComments;
    }
    getComment() {
      return this._comments[this.fen()];
    }
    setComment(comment) {
      this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
    }
    /**
     * @deprecated Renamed to `removeComment` for consistency
     */
    deleteComment() {
      return this.removeComment();
    }
    removeComment() {
      const comment = this._comments[this.fen()];
      delete this._comments[this.fen()];
      return comment;
    }
    getComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        return { fen, comment: this._comments[fen] };
      });
    }
    /**
     * @deprecated Renamed to `removeComments` for consistency
     */
    deleteComments() {
      return this.removeComments();
    }
    removeComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        const comment = this._comments[fen];
        delete this._comments[fen];
        return { fen, comment };
      });
    }
    setCastlingRights(color, rights) {
      for (const side of [KING, QUEEN]) {
        if (rights[side] !== void 0) {
          if (rights[side]) {
            this._castling[color] |= SIDES[side];
          } else {
            this._castling[color] &= ~SIDES[side];
          }
        }
      }
      this._updateCastlingRights();
      const result = this.getCastlingRights(color);
      return (rights[KING] === void 0 || rights[KING] === result[KING]) && (rights[QUEEN] === void 0 || rights[QUEEN] === result[QUEEN]);
    }
    getCastlingRights(color) {
      return {
        [KING]: (this._castling[color] & SIDES[KING]) !== 0,
        [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0
      };
    }
    moveNumber() {
      return this._moveNumber;
    }
  };

  // src/chess-state.js
  function deriveEvents(snapshot) {
    const chess = snapshot.initialFen ? new Chess(snapshot.initialFen) : new Chess();
    const events = [];
    for (const [index, san] of snapshot.sanMoves.entries()) {
      let move;
      try {
        move = chess.move(san);
      } catch (_error) {
        break;
      }
      if (!move.captured) continue;
      const isEnPassant = move.flags.includes("e");
      const capturedAt = isEnPassant ? `${move.to[0]}${move.from[1]}` : move.to;
      events.push({
        kind: "capture",
        ply: index + 1,
        san: move.san,
        from: move.from,
        to: move.to,
        movingPiece: move.piece,
        movingColor: move.color,
        capturedPiece: move.captured,
        capturedColor: move.color === "w" ? "b" : "w",
        capturedAt,
        isEnPassant
      });
    }
    return events;
  }
  function derivePosition(snapshot) {
    const chess = snapshot.initialFen ? new Chess(snapshot.initialFen) : new Chess();
    const ply = snapshot.activePly ?? snapshot.sanMoves.length;
    for (const san of snapshot.sanMoves.slice(0, ply)) {
      try {
        chess.move(san);
      } catch (_error) {
        break;
      }
    }
    return { board: chess.board(), turn: chess.turn() };
  }

  // src/event-stream.js
  function eventKey(e) {
    return `${e.ply}:${e.san}:${e.from}:${e.to}`;
  }
  var CaptureEventStream = class {
    constructor() {
      this.snapshotId = null;
      this.seen = /* @__PURE__ */ new Set();
      this.lastActivePly = null;
      this.primed = false;
    }
    next(snapshot) {
      if (!snapshot) return [];
      if (snapshot.id !== this.snapshotId) {
        this.snapshotId = snapshot.id;
        this.seen = /* @__PURE__ */ new Set();
        this.lastActivePly = null;
        this.primed = false;
      }
      const allEvents = deriveEvents(snapshot);
      const activePly = snapshot.activePly ?? null;
      if (!this.primed) {
        this.primed = true;
        this.lastActivePly = activePly;
        if (activePly == null) {
          for (const event of allEvents) this.seen.add(eventKey(event));
        }
        return [];
      }
      if (activePly != null) {
        if (activePly === this.lastActivePly) return [];
        this.lastActivePly = activePly;
        const activeEvent = allEvents.find((e) => e.ply === activePly);
        if (!activeEvent) return [];
        const key = eventKey(activeEvent);
        if (this.seen.has(key)) return [];
        this.seen.add(key);
        return [activeEvent];
      }
      return allEvents.filter((event) => {
        const key = eventKey(event);
        if (this.seen.has(key)) return false;
        this.seen.add(key);
        return true;
      });
    }
  };

  // src/board-geometry.js
  function boardLocalSquareCenter(square, boardSize, isBlackOrientation = false) {
    let file2 = square.charCodeAt(0) - 97;
    let rank2 = 8 - Number.parseInt(square[1], 10);
    if (isBlackOrientation) {
      file2 = 7 - file2;
      rank2 = 7 - rank2;
    }
    const size = boardSize / 8;
    return {
      x: file2 * size + size / 2,
      y: rank2 * size + size / 2,
      size
    };
  }

  // src/render-event.js
  function createRenderEvent(captureEvent, board, snapshotId) {
    const orientation = board.isBlackOrientation ? "black" : "white";
    const squareSize = board.size / 8;
    const from = renderPoint(captureEvent.from, board);
    const to = renderPoint(captureEvent.to, board);
    const victimAt = renderPoint(captureEvent.capturedAt, board);
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    return {
      id: `${snapshotId}|${captureEvent.ply}|${captureEvent.san}|${captureEvent.from}|${captureEvent.to}`,
      board: {
        size: board.size,
        squareSize,
        orientation
      },
      attacker: {
        piece: captureEvent.movingPiece,
        color: captureEvent.movingColor,
        from: { square: captureEvent.from, ...from },
        to: { square: captureEvent.to, ...to }
      },
      victim: {
        piece: captureEvent.capturedPiece,
        color: captureEvent.capturedColor,
        at: { square: captureEvent.capturedAt, ...victimAt }
      },
      move: {
        san: captureEvent.san,
        ply: captureEvent.ply,
        isEnPassant: captureEvent.isEnPassant
      },
      direction: {
        dx,
        dy,
        angleRad: Math.atan2(to.y - from.y, to.x - from.x)
      }
    };
  }
  function renderPoint(square, board) {
    const { x, y } = boardLocalSquareCenter(square, board.size, board.isBlackOrientation);
    return { x, y };
  }

  // src/particle-fx-renderer.js
  var GLYPH = { k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F" };
  var VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  var SIG = { q: "nuke", n: "slash", b: "zap", r: "smash", p: "pixel", k: "ascension" };
  var GFONT = "'Segoe UI Symbol','Noto Sans Symbols2','Noto Sans Symbols','Apple Symbols','DejaVu Sans',sans-serif";
  var REF_SQUARE = 80;
  var ParticleFxRenderer = class {
    constructor({
      onImpact = null,
      mode = "signature",
      // 'signature' | 'random' | a fixed effect id
      intensity = 7,
      // 1..10
      soundOn = true,
      buildupMs = 0,
      // 0 = instant impact; >0 = crosshair buildup before impact
      routing = null,
      // map attacker piece -> effect; null = built-in SIG
      fallback = "splatter",
      getPieceImage = null
      // (color, type) => CanvasImageSource|null; real lichess piece art
    } = {}) {
      this.onImpact = onImpact;
      this.getPieceImage = getPieceImage;
      this.mode = mode;
      this.intensity = Math.max(1, Math.min(10, intensity));
      this.soundOn = soundOn;
      this.buildupMs = buildupMs;
      this.routing = routing;
      this.fallback = fallback;
      this.pending = [];
      this.particles = [];
      this._k = 1;
      this._S = REF_SQUARE;
      this._ac = null;
      this._master = null;
      this.POOL = ["nuke", "slash", "zap", "smash", "pixel", "ascension", "splatter", "inferno", "vortex", "shatter"];
    }
    get activeCount() {
      return this.particles.length + this.pending.length;
    }
    /* ---------- public entry ---------- */
    play(renderEvent, nowMs = typeof performance !== "undefined" ? performance.now() : Date.now()) {
      const at = renderEvent?.victim?.at;
      const S = renderEvent?.board?.squareSize || REF_SQUARE;
      if (!at) return false;
      this._S = S;
      this._k = S / REF_SQUARE;
      const id = this.effectFor(renderEvent);
      const victim = {
        type: renderEvent.victim.piece || "p",
        color: renderEvent.victim.color || "b"
      };
      if (this.buildupMs > 0) {
        this.spawnCrosshair(at.x, at.y, S);
        this.pending.push({
          id,
          cx: at.x,
          cy: at.y,
          S,
          victim,
          renderEvent,
          fireAt: nowMs + this.buildupMs
        });
      } else {
        this.fireImpact(id, at.x, at.y, S, victim, renderEvent);
      }
      return true;
    }
    fireImpact(id, cx, cy, S, victim, renderEvent) {
      this.spawn(id, cx, cy, S, victim);
      const drama = this.victimDrama(victim.type);
      const sh = this.intensity / 6;
      const amp = (this.SHAKE[id] || 6) * sh * drama;
      const durationMs = Math.round(320 * (1 + (drama - 1) * 0.4));
      this.onImpact?.(renderEvent, { amplitude: Math.max(2, amp), durationMs });
      if (this.soundOn) this.playSound(id);
    }
    // Scales a kill effect by the VALUE of the captured piece, so capturing a queen
    // is a visibly bigger event than capturing a pawn or minor piece: 1x at a pawn,
    // up to 1.6x at a queen. King is defensive-only (never truly captured) and stays
    // at baseline so `ascension` keeps its own distinct, already-dramatic presentation.
    victimDrama(type) {
      const v = VALUE[type] ?? VALUE.p;
      return 1 + Math.max(0, v - VALUE.p) * 0.075;
    }
    spawnCrosshair(cx, cy, S) {
      const frames = Math.max(8, Math.round(this.buildupMs / 16));
      this.addP({ kind: "reticle", x: cx, y: cy, S, color: "#ff5a5a", max: frames });
    }
    tick(nowMs, ctx, size) {
      if (this.pending.length) {
        for (let i = this.pending.length - 1; i >= 0; i--) {
          const q = this.pending[i];
          if (nowMs >= q.fireAt) {
            this.fireImpact(q.id, q.cx, q.cy, q.S, q.victim, q.renderEvent);
            this.pending.splice(i, 1);
          }
        }
      }
      if (!ctx) return;
      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        this.updateP(p);
        if (p.dead) ps.splice(i, 1);
      }
      for (let i = 0; i < ps.length; i++) this.drawP(ps[i], ctx);
    }
    /* ---------- effect routing ---------- */
    effectFor(re) {
      if (this.mode && this.mode !== "signature" && this.mode !== "random" && SIG_HAS(this.mode)) return this.mode;
      if (this.mode === "random") return this.POOL[Math.random() * this.POOL.length | 0];
      const victim = re.victim || {};
      const attacker = re.attacker || {};
      if (victim.piece === "k") return "ascension";
      const map = this.routing || SIG;
      return map[attacker.piece] || this.fallback || "splatter";
    }
    /* ---------- helpers ---------- */
    rand(a, b) {
      return a + Math.random() * (b - a);
    }
    pickc(a) {
      return a[Math.random() * a.length | 0];
    }
    SHAKE = { nuke: 14, splatter: 6, slash: 7, zap: 5, smash: 12, pixel: 0, ascension: 0, vortex: 6, inferno: 7, shatter: 5 };
    addP(cfg) {
      const k = this._k;
      const p = Object.assign({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        g: 0,
        drag: 1,
        life: 0,
        max: 60,
        size: 4,
        shape: "circle",
        color: "#fff",
        rot: 0,
        vrot: 0,
        kind: "std",
        alpha: 1,
        grow: 0,
        glow: 0,
        seed: Math.random() * 10,
        fadeIn: false,
        S: this._S
      }, cfg);
      for (const key of ["vx", "vy", "g", "size", "grow", "glow", "vr", "w"]) {
        if (typeof p[key] === "number") p[key] *= k;
      }
      this.particles.push(p);
      return p;
    }
    glyph(victim, cx, cy, S, mode, max, extra) {
      const white = victim.color === "w";
      return this.addP(Object.assign({
        kind: "glyph",
        x: cx,
        y: cy,
        mode,
        pieceColor: victim.color,
        pieceType: victim.type,
        char: GLYPH[victim.type] || GLYPH.p,
        color: white ? "#f4f3ee" : "#2b2926",
        stroke: Math.max(1, S * 0.022),
        strokeColor: white ? "#403e39" : "#0d0c0a",
        fontPx: S * 0.78,
        max: max || 30,
        S
      }, extra || {}));
    }
    glyphHalf(victim, cx, cy, S, half, dirx, diry, rotDeg, max) {
      const white = victim.color === "w";
      return this.addP({
        kind: "glyphHalf",
        x: cx,
        y: cy,
        half,
        dirx,
        diry,
        rotDeg,
        pieceColor: victim.color,
        pieceType: victim.type,
        char: GLYPH[victim.type] || GLYPH.p,
        color: white ? "#f4f3ee" : "#2b2926",
        stroke: Math.max(1, S * 0.022),
        strokeColor: white ? "#403e39" : "#0d0c0a",
        fontPx: S * 0.78,
        max: max || 32,
        S
      });
    }
    bigText(txt, color, cx, cy, scale, font) {
      return this.addP({
        kind: "text",
        x: cx,
        y: cy,
        txt,
        color,
        fontPx: (scale || 1) * 40,
        font: font || "'Bungee','Segoe UI',system-ui,sans-serif",
        max: 55,
        vy: -0.4
      });
    }
    flashBlob(cx, cy, color, S, max) {
      return this.addP({ kind: "flash", x: cx, y: cy, color, r: S * 2.6, max: max || 14 });
    }
    /* ================= UPDATE ================= */
    updateP(p) {
      p.life++;
      if (p.life >= p.max) {
        p.dead = true;
        return;
      }
      if (p.kind === "orbit") {
        p.ang += p.va;
        p.rad += p.vr;
        if (p.rad < 3 * this._k) {
          p.dead = true;
          return;
        }
        p.x = p.cx + Math.cos(p.ang) * p.rad;
        p.y = p.cy + Math.sin(p.ang) * p.rad;
        return;
      }
      if (p.kind === "bolt" || p.kind === "flash" || p.kind === "beam" || p.kind === "streak" || p.kind === "reticle" || p.kind === "ring") return;
      if (p.kind === "glyph" || p.kind === "glyphHalf" || p.kind === "text") {
        if (p.vy) p.y += p.vy;
        return;
      }
      if (p.kind === "ember") p.vx += Math.sin((p.life + p.seed) * 0.3) * 0.09 * this._k;
      p.vx *= p.drag;
      p.vy = (p.vy + p.g) * p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.grow) p.size = Math.max(0.2, p.size + p.grow);
    }
    /* ================= DRAW ================= */
    drawP(p, ctx) {
      const t = p.life / p.max;
      if (p.kind === "flash") {
        const a2 = (1 - t) * 0.7;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grd.addColorStop(0, hexA(p.color, a2));
        grd.addColorStop(1, hexA(p.color, 0));
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
        return;
      }
      if (p.kind === "beam") {
        ctx.save();
        ctx.globalAlpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        const grd = ctx.createLinearGradient(0, p.y - p.h, 0, p.y);
        grd.addColorStop(0, "rgba(255,216,107,0)");
        grd.addColorStop(1, "rgba(255,216,107,0.55)");
        ctx.fillStyle = grd;
        ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
        ctx.restore();
        return;
      }
      if (p.kind === "bolt") {
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.lineCap = "round";
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        const pts = p.pts;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }
      if (p.kind === "streak") {
        const sc = t < 0.3 ? t / 0.3 : 1;
        const a2 = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang);
        ctx.globalAlpha = a2;
        const grd = ctx.createLinearGradient(-p.len / 2, 0, p.len / 2, 0);
        grd.addColorStop(0, "rgba(255,255,255,0)");
        grd.addColorStop(0.5, "#fff");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grd;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 14;
        ctx.fillRect(-p.len / 2 * sc, -p.th / 2, p.len * sc, p.th);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }
      if (p.kind === "text") {
        let sc, a2;
        if (t < 0.25) {
          sc = 0.3 + (1.18 - 0.3) * (t / 0.25);
          a2 = t / 0.25;
        } else if (t < 0.68) {
          sc = 1.18 - 0.18 * ((t - 0.25) / 0.43);
          a2 = 1;
        } else {
          sc = 1 - 0.08 * ((t - 0.68) / 0.32);
          a2 = 1 - (t - 0.68) / 0.32;
        }
        ctx.save();
        ctx.translate(p.x, p.y - p.life * 0.6);
        ctx.scale(sc, sc);
        ctx.globalAlpha = Math.max(0, a2);
        ctx.font = `${p.fontPx * this._k}px ${p.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = p.color;
        ctx.fillText(p.txt, 0, 0);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }
      if (p.kind === "glyph") {
        this.drawGlyph(p, ctx, t);
        return;
      }
      if (p.kind === "glyphHalf") {
        this.drawGlyphHalf(p, ctx, t);
        return;
      }
      if (p.kind === "reticle") {
        this.drawReticle(p, ctx, t);
        return;
      }
      if (p.kind === "ring") {
        this.drawRing(p, ctx, t);
        return;
      }
      let a = p.fadeIn && p.life < 4 ? p.life / 4 : 1 - t;
      a = Math.max(0, a) * (p.alpha ?? 1);
      ctx.globalAlpha = a;
      if (p.shape === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        const len = Math.min(20 * this._k, Math.hypot(p.vx, p.vy) * 1.7);
        const ang = Math.atan2(p.vy, p.vx);
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.glow;
        }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }
      if (p.shape === "square") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.glow;
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        return;
      }
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size), 0, 6.2832);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    glyphTransform(mode, t, S) {
      let sx = 1, sy = 1, dx = 0, dy = 0, rot = 0, a = 1;
      switch (mode) {
        case "nuke":
          sx = sy = 1 + 0.7 * t;
          a = 1 - t;
          break;
        case "splatter":
          sx = sy = 1 + 0.25 * t;
          a = 1 - t;
          break;
        case "smash": {
          const e = Math.min(1, t / 0.6);
          sx = 1 + 0.7 * e;
          sy = Math.max(0.05, 1 - 0.95 * e);
          dy = S * 0.4 * e;
          a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
          break;
        }
        case "zap":
          a = Math.floor(t * 6) % 2 === 0 ? 1 : 0.15;
          sx = sy = 1 - 0.2 * t;
          dy = -S * 0.08 * t;
          if (t > 0.85) a = Math.max(0, (1 - t) / 0.15);
          break;
        case "ascension":
          dy = -S * 1.3 * t;
          sx = sy = 1 + 0.15 * t;
          a = 1 - t;
          break;
        case "vortex":
          sx = sy = Math.max(0, 1 - t);
          rot = t * Math.PI * 4;
          a = 1 - t;
          break;
        case "inferno":
          a = 1 - t;
          sy = 1 - 0.15 * t;
          dy = S * 0.1 * t;
          break;
        case "shatter":
          sx = sy = 1 + 0.05 * t;
          a = 1 - t;
          break;
        default:
          a = 1 - t;
      }
      return { sx, sy, dx, dy, rot, a };
    }
    // The real lichess piece image when available; null falls back to the glyph.
    pieceImageFor(p) {
      return this.getPieceImage?.(p.pieceColor, p.pieceType) ?? null;
    }
    drawGlyph(p, ctx, t) {
      const tf = this.glyphTransform(p.mode, t, p.S);
      ctx.save();
      ctx.translate(p.x + tf.dx, p.y + tf.dy);
      ctx.rotate(tf.rot);
      ctx.scale(tf.sx, tf.sy);
      ctx.globalAlpha = Math.max(0, tf.a);
      if (p.mode === "ascension") {
        ctx.shadowColor = "#ffd86b";
        ctx.shadowBlur = 12;
      }
      const img = this.pieceImageFor(p);
      if (img) {
        const side = p.S * 0.9;
        ctx.drawImage(img, -side / 2, -side / 2, side, side);
      } else {
        ctx.font = `${p.fontPx}px ${GFONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = p.stroke;
        ctx.strokeStyle = p.strokeColor;
        ctx.strokeText(p.char, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, 0, 0);
      }
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    drawGlyphHalf(p, ctx, t) {
      const a = 1 - t;
      const dx = p.dirx * p.S * 0.5 * t;
      const dy = p.diry * p.S * 0.8 * t;
      const rot = p.rotDeg * Math.PI / 180 * t;
      const H = p.fontPx;
      ctx.save();
      ctx.translate(p.x + dx, p.y + dy);
      ctx.rotate(rot);
      ctx.beginPath();
      if (p.half === "top") ctx.rect(-H, -H, 2 * H, H);
      else ctx.rect(-H, 0, 2 * H, H);
      ctx.clip();
      ctx.globalAlpha = Math.max(0, a);
      const img = this.pieceImageFor(p);
      if (img) {
        const side = p.S * 0.9;
        ctx.drawImage(img, -side / 2, -side / 2, side, side);
      } else {
        ctx.font = `${p.fontPx}px ${GFONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = p.stroke;
        ctx.strokeStyle = p.strokeColor;
        ctx.strokeText(p.char, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, 0, 0);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    drawRing(p, ctx, t) {
      const e = 1 - Math.pow(1 - t, 3);
      const r = p.r0 + (p.r1 - p.r0) * e;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, p.lw * (1 - t));
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, r), 0, 6.2832);
      ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    drawReticle(p, ctx, t) {
      const S = p.S;
      const ease = 1 - Math.pow(1 - t, 2);
      const gap = S * (0.95 - 0.45 * ease);
      const len = S * 0.26;
      const rot = t * Math.PI * 0.5;
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 6));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.globalAlpha = Math.min(1, t * 4) * pulse;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.5, S * 0.04);
      ctx.lineCap = "round";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      for (let q = 0; q < 4; q++) {
        const sx = q < 2 ? -1 : 1;
        const sy = q % 2 === 0 ? -1 : 1;
        const x = sx * gap, y = sy * gap;
        ctx.beginPath();
        ctx.moveTo(x, y - sy * len);
        ctx.lineTo(x, y);
        ctx.lineTo(x - sx * len, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, S * 0.03), 0, 6.2832);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    bolt(cx, cy, S) {
      const top = cy - S * 2.2;
      const segs = 9;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const tt = i / segs;
        pts.push({ x: cx + (i === 0 || i === segs ? 0 : this.rand(-S * 0.3, S * 0.3)), y: top + (cy - top) * tt });
      }
      this.addP({ kind: "bolt", pts, color: "#7cc8ff", w: 7, max: 7, x: cx, y: cy });
      this.addP({ kind: "bolt", pts: pts.map((p) => ({ x: p.x, y: p.y })), color: "#eaf6ff", w: 3, max: 9, x: cx, y: cy });
    }
    /* ================= EFFECTS ================= */
    // Composition rule: every effect's alpha-weighted visual centroid over its
    // whole lifetime must stay within ~10% of a square from (cx, cy) — floating
    // texts start below center and rise through it, debris kicks/gravity are
    // balanced so the effect reads as ON the captured square, not above/below it.
    // (Measured per effect; only 'ascension' may drift up — the king ascending
    // IS the effect.) Keep this invariant when adding or tuning effects.
    spawn(id, cx, cy, S, victim) {
      const lvl = this.intensity;
      const drama = this.victimDrama(victim.type);
      const cs = (0.5 + lvl / 13) * drama;
      const sizeBoost = 1 + (drama - 1) * 0.5;
      S *= sizeBoost;
      if (id === "nuke") {
        this.flashBlob(cx, cy, "#d9b3ff", S, 16);
        this.addP({ kind: "ring", x: cx, y: cy, r0: S * 0.15, r1: S * 2.7, lw: S * 0.16, color: "#b98cff", max: 22 });
        this.addP({ kind: "ring", x: cx, y: cy, r0: S * 0.1, r1: S * 1.7, lw: S * 0.09, color: "#ecd9ff", max: 15 });
        this.glyph(victim, cx, cy, S, "nuke", 18);
        this.bigText("BOOM", "#cf9bff", cx, cy + S * 0.2, 1 * sizeBoost);
        let N = Math.round(46 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(3, 13);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, drag: 0.93, max: this.rand(28, 52), size: this.rand(4, 11), color: this.pickc(["#f3e6ff", "#c9a0ff", "#9b5cff", "#5e23c9"]), glow: 14, grow: 0.3 });
        }
        N = Math.round(13 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(0.5, 3);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, g: -0.02, drag: 0.96, max: this.rand(50, 80), size: this.rand(10, 22), color: "rgba(58,40,92,.5)", grow: 0.7, fadeIn: true });
        }
        N = Math.round(20 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(6, 16);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.1, drag: 0.92, max: this.rand(16, 30), size: this.rand(1.5, 3), color: "#e6d2ff", shape: "spark" });
        }
      } else if (id === "splatter") {
        this.glyph(victim, cx, cy, S, "splatter", 14);
        const N = Math.round(34 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(2, 11);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5, g: 0.28, drag: 0.99, max: this.rand(22, 42), size: this.rand(2, 8), color: this.pickc(["#b81f12", "#8e0f08", "#d6332a", "#6e0a05"]) });
        }
      } else if (id === "slash") {
        this.addP({ kind: "streak", x: cx, y: cy, ang: this.rand(-0.9, -0.5), len: S * 2.5, th: Math.max(3, S * 0.06), max: 18 });
        this.glyphHalf(victim, cx, cy, S, "top", -1, -1, -32, 32);
        this.glyphHalf(victim, cx, cy, S, "bottom", 1, 1, 30, 32);
        const N = Math.round(26 * cs);
        for (let i = 0; i < N; i++) {
          const a = -0.6 + this.rand(-0.5, 0.5) + (i % 2 ? Math.PI : 0), sp = this.rand(4, 12);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.26, drag: 0.99, max: this.rand(24, 42), size: this.rand(2, 6), color: this.pickc(["#c4231a", "#8e0f08", "#e0392e"]) });
        }
      } else if (id === "zap") {
        this.flashBlob(cx, cy, "#bfe9ff", S, 12);
        this.bolt(cx, cy, S);
        this.glyph(victim, cx, cy, S, "zap", 26);
        const N = Math.round(22 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(3, 10);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.08, drag: 0.9, max: this.rand(14, 28), size: this.rand(1, 2.5), color: this.pickc(["#bff0ff", "#5ec6ff", "#ffffff"]), shape: "spark", glow: 8 });
        }
      } else if (id === "smash") {
        this.glyph(victim, cx, cy, S, "smash", 22);
        this.bigText("POW!", "#ffd24a", cx, cy + S * 0.15, 1.25 * sizeBoost);
        const N = Math.round(26 * cs);
        for (let i = 0; i < N; i++) {
          const dir = i % 2 ? 1 : -1;
          this.addP({ x: cx + dir * S * 0.1, y: cy + S * 0.2, vx: dir * this.rand(2, 8), vy: this.rand(-3, -0.5), g: 0.25, drag: 0.95, max: this.rand(26, 46), size: this.rand(3, 8), color: this.pickc(["#9b8b73", "#c2b393", "#7a6e5a"]), grow: 0.3 });
        }
      } else if (id === "pixel") {
        const val = VALUE[victim.type];
        this.glyph(victim, cx, cy, S, "pixel", 10);
        this.bigText("+" + (val || 1), "#63e88a", cx, cy + S * 0.35, 0.95 * sizeBoost, "'Bungee',monospace,monospace");
        const pal = ["#ffffff", "#ffe14d", "#46d17a", "#5ec6ff", "#ff5edb", "#ff6a3d"];
        const N = Math.round(30 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(2, 9);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.3, drag: 0.97, max: this.rand(22, 40), size: this.rand(4, 9), color: this.pickc(pal), shape: "square", vrot: this.rand(-0.2, 0.2) });
        }
      } else if (id === "ascension") {
        this.flashBlob(cx, cy, "#fff0c0", S, 22);
        this.addP({ kind: "beam", x: cx, y: cy, w: S * 0.9, h: Math.min(cy, S * 4), color: "#ffd86b", max: 52 });
        this.glyph(victim, cx, cy, S, "ascension", 52);
        const N = Math.round(26 * cs);
        for (let i = 0; i < N; i++) this.addP({ x: cx + this.rand(-S * 0.35, S * 0.35), y: cy + this.rand(-S * 0.1, S * 0.3), vx: this.rand(-0.6, 0.6), vy: this.rand(-3.5, -1), g: -0.02, drag: 0.99, max: this.rand(40, 70), size: this.rand(2, 5), color: this.pickc(["#fff3c0", "#ffd86b", "#ffe9a0", "#ffffff"]), glow: 10 });
      } else if (id === "vortex") {
        this.glyph(victim, cx, cy, S, "vortex", 42);
        const N = Math.round(40 * cs);
        for (let i = 0; i < N; i++) {
          const ang = Math.random() * 6.28, rad = this.rand(S * 0.4, S * 1.1);
          this.addP({ kind: "orbit", cx, cy, ang, rad, va: this.rand(0.18, 0.32), vr: -this.rand(0.8, 2.2), x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad, max: 120, size: this.rand(2, 5), color: this.pickc(["#b18bff", "#7b4dff", "#d9c6ff", "#ffffff"]), glow: 10 });
        }
      } else if (id === "inferno") {
        this.flashBlob(cx, cy, "#ff8a3d", S, 14);
        this.glyph(victim, cx, cy, S, "inferno", 36);
        let N = Math.round(40 * cs);
        for (let i = 0; i < N; i++) this.addP({ kind: "ember", x: cx + this.rand(-S * 0.3, S * 0.3), y: cy + this.rand(S * 0.15, S * 0.55), vx: this.rand(-1.5, 1.5), vy: this.rand(-2.4, -0.7), g: -0.01, drag: 0.98, max: this.rand(22, 40), size: this.rand(4, 11), color: this.pickc(["#ffe14d", "#ff8a1f", "#ff4d12", "#cf2a0a"]), glow: 14, grow: -0.08 });
        N = Math.round(10 * cs);
        for (let i = 0; i < N; i++) this.addP({ x: cx + this.rand(-S * 0.2, S * 0.2), y: cy + S * 0.25, vx: this.rand(-0.6, 0.6), vy: this.rand(-1.2, -0.3), g: -6e-3, drag: 0.98, max: this.rand(44, 70), size: this.rand(8, 16), color: "rgba(40,34,30,.5)", grow: 0.6, fadeIn: true });
      } else if (id === "shatter") {
        const col = victim.color === "w" ? "#e8e4da" : "#3a3833";
        this.glyph(victim, cx, cy, S, "shatter", 14);
        let N = Math.round(16 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(2, 8);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, g: 0.26, drag: 0.99, max: this.rand(26, 46), size: this.rand(4, 9), color: col, shape: "square", vrot: this.rand(-0.3, 0.3) });
        }
        N = Math.round(20 * cs);
        for (let i = 0; i < N; i++) {
          const a = Math.random() * 6.28, sp = this.rand(0.5, 3);
          this.addP({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.02, drag: 0.97, max: this.rand(40, 70), size: this.rand(1, 2.5), color: "rgba(200,196,186,.7)" });
        }
      } else {
        this.spawn("splatter", cx, cy, S, victim);
      }
    }
    /* ================= SOUND (WebAudio synth) ================= */
    ensureAudio() {
      if (this._ac) {
        if (this._ac.state === "suspended") this._ac.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this._ac = new AC();
        this._master = this._ac.createGain();
        this._master.gain.value = 0.5;
        this._master.connect(this._ac.destination);
      } catch (e) {
      }
    }
    tone(freq, type, t0, dur, gain, freq2) {
      const ac = this._ac;
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      const t = ac.currentTime + t0;
      o.frequency.setValueAtTime(freq, t);
      if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t + dur);
      g.gain.setValueAtTime(1e-4, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 8e-3);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      o.connect(g).connect(this._master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    noise(t0, dur, type, freq, gain) {
      const ac = this._ac;
      if (!ac) return;
      const n = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (type === "brown") {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = type === "hp" ? "highpass" : type === "bp" ? "bandpass" : "lowpass";
      f.frequency.value = freq;
      const g = ac.createGain();
      const t = ac.currentTime + t0;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      src.connect(f).connect(g).connect(this._master);
      src.start(t);
      src.stop(t + dur);
    }
    playSound(id) {
      this.ensureAudio();
      if (!this._ac) return;
      if (id === "nuke") {
        this.noise(0, 0.5, "low", 900, 0.5);
        this.tone(90, "sine", 0, 0.45, 0.5, 32);
      } else if (id === "splatter") {
        this.noise(0, 0.18, "low", 700, 0.45);
        this.tone(200, "sine", 0, 0.15, 0.25, 60);
      } else if (id === "slash") {
        this.noise(0, 0.14, "bp", 2200, 0.45);
      } else if (id === "zap") {
        this.tone(700, "square", 0, 0.22, 0.18, 180);
        this.noise(0, 0.2, "hp", 1500, 0.15);
      } else if (id === "smash") {
        this.tone(140, "sine", 0, 0.28, 0.5, 46);
        this.noise(0, 0.1, "low", 500, 0.35);
      } else if (id === "pixel") {
        this.tone(880, "square", 0, 0.06, 0.2);
        this.tone(1320, "square", 0.07, 0.07, 0.2);
      } else if (id === "ascension") {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, "triangle", i * 0.08, 0.55, 0.15));
      } else if (id === "vortex") {
        this.tone(420, "sawtooth", 0, 0.6, 0.22, 55);
        this.noise(0, 0.6, "low", 600, 0.12);
      } else if (id === "inferno") {
        this.noise(0, 0.6, "brown", 700, 0.3);
        this.tone(70, "sine", 0, 0.6, 0.3, 50);
      } else if (id === "shatter") {
        for (let i = 0; i < 5; i++) this.tone(this.rand(2200, 4200), "triangle", i * 0.03, 0.08, 0.12);
      }
    }
  };
  function SIG_HAS(id) {
    return ["nuke", "slash", "zap", "smash", "pixel", "ascension", "splatter", "inferno", "vortex", "shatter"].includes(id);
  }
  function hexA(hex, a) {
    if (typeof hex !== "string") return `rgba(255,255,255,${a})`;
    if (hex[0] !== "#") return hex;
    let r, g, b;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${a})`;
  }

  // src/move-feed.js
  var MOVE_SELECTORS = [
    "move san",
    ".analyse__moves san",
    ".tview2 move san",
    "main.puzzle move",
    "rm6 l4x kwdb",
    "l4x kwdb"
  ];
  function readSnapshot(document2, location2 = globalThis.location) {
    const sanMoves = readSanMoves(document2);
    if (!sanMoves.length) return null;
    const initialFen = readInitialFen(document2);
    const puzzleId = readPuzzleId(document2);
    const activePly = readActivePly(document2);
    const context = puzzleId ? `puzzle:${puzzleId}|${initialFen ?? "start"}` : initialFen ?? "start";
    return {
      id: `${location2?.pathname ?? "lichess"}|${context}`,
      initialFen,
      sanMoves,
      activePly
    };
  }
  var SAN_RE = /^(?:O-O-O|O-O|0-0-0|0-0|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?$/;
  function readSanMoves(document2) {
    for (const selector of MOVE_SELECTORS) {
      const moves = [...document2.querySelectorAll(selector)].map((element) => normalizeSan(element.textContent)).filter(Boolean);
      if (moves.length) return moves;
    }
    return readSanMovesStructural(document2);
  }
  function readSanMovesStructural(document2) {
    const groups = /* @__PURE__ */ new Map();
    for (const element of document2.querySelectorAll("*")) {
      if (element.childElementCount > 0) continue;
      const san = normalizeSan(element.textContent);
      if (!san || !SAN_RE.test(san)) continue;
      const parent = element.parentElement;
      if (!parent) continue;
      let list = groups.get(parent);
      if (!list) {
        list = [];
        groups.set(parent, list);
      }
      list.push(san);
    }
    let best = [];
    for (const list of groups.values()) {
      if (list.length > best.length) best = list;
    }
    return best;
  }
  function readInitialFen(document2) {
    const el = document2.querySelector("[data-fen]");
    return normalizeFen(el?.dataset.fen) ?? null;
  }
  function readPuzzleId(document2) {
    return [...document2.querySelectorAll('main.puzzle a[href*="/training/"]')].find((el) => /^#[A-Za-z0-9]+$/.test(el.textContent?.trim() ?? ""))?.textContent?.trim().slice(1) || null;
  }
  function readActivePly(document2) {
    const activeSan = document2.querySelector("move.active san");
    if (!activeSan) return null;
    const allSans = [...document2.querySelectorAll("move san")];
    const index = allSans.indexOf(activeSan);
    return index >= 0 ? index + 1 : null;
  }
  function normalizeSan(value) {
    return value?.trim().replace(/\s+/g, "").replace(/^\d+\.(\.\.)?/, "").replace(/[✓✗!?]+$/g, "") || null;
  }
  function normalizeFen(value) {
    const text = value?.trim();
    if (!text) return null;
    const parts = text.split(/\s+/);
    if (parts.length < 4) return null;
    if (!/^[pnbrqkPNBRQK1-8/]+$/.test(parts[0])) return null;
    if (!/^[wb]$/.test(parts[1])) return null;
    return parts.slice(0, 6).join(" ");
  }

  // src/packs.js
  var EFFECTS = [
    "nuke",
    "smash",
    "slash",
    "zap",
    "pixel",
    "ascension",
    "splatter",
    "inferno",
    "vortex",
    "shatter"
  ];
  var EFFECT_LABELS = {
    nuke: "Nuke",
    smash: "Smash",
    slash: "Slash",
    zap: "Zap",
    pixel: "Pixel",
    ascension: "Ascension",
    splatter: "Splatter",
    inferno: "Inferno",
    vortex: "Vortex",
    shatter: "Shatter"
  };
  var PACKS = [
    { id: "signature", label: "Signature", kind: "signature" },
    ...EFFECTS.map((effect) => ({ id: effect, label: EFFECT_LABELS[effect], kind: "single", effect })),
    {
      id: "void",
      label: "Void",
      kind: "theme",
      routing: { q: "nuke", r: "vortex", b: "zap", n: "slash", p: "shatter", k: "ascension" },
      fallback: "vortex"
    },
    {
      id: "fire",
      label: "Fire",
      kind: "theme",
      routing: { q: "inferno", r: "smash", b: "inferno", n: "slash", p: "pixel", k: "ascension" },
      fallback: "inferno"
    },
    {
      id: "arcade",
      label: "Arcade",
      kind: "theme",
      routing: { q: "pixel", r: "smash", b: "zap", n: "pixel", p: "pixel", k: "ascension" },
      fallback: "pixel"
    }
  ];
  function getPack(id) {
    return PACKS.find((p) => p.id === id) || null;
  }
  function resolvePack(packId) {
    const pack = getPack(packId) || getPack("signature");
    if (pack.kind === "single") return { mode: pack.effect, routing: null, fallback: "splatter" };
    if (pack.kind === "theme") return { mode: "signature", routing: pack.routing, fallback: pack.fallback };
    return { mode: "signature", routing: null, fallback: "splatter" };
  }

  // src/patterns.js
  var FILES = "abcdefgh";
  var VALUE2 = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  function toSquare(file2, rank2) {
    return FILES[file2] + rank2;
  }
  function indexBoard(board) {
    const at = {};
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell) at[`${f},${8 - r}`] = { type: cell.type, color: cell.color };
      }
    }
    return at;
  }
  function pieceAt(at, file2, rank2) {
    if (file2 < 0 || file2 > 7 || rank2 < 1 || rank2 > 8) return void 0;
    return at[`${file2},${rank2}`] || null;
  }
  function pieceAtSquare(at, sq) {
    return pieceAt(at, sq.charCodeAt(0) - 97, Number(sq[1]));
  }
  function isPawnOf(piece, color) {
    return piece && piece.type === "p" && piece.color === color;
  }
  var FIANCHETTO = [
    { bishop: "g2", front: "g3", s1: "f2", s2: "h2", color: "w" },
    { bishop: "b2", front: "b3", s1: "a2", s2: "c2", color: "w" },
    { bishop: "g7", front: "g6", s1: "f7", s2: "h7", color: "b" },
    { bishop: "b7", front: "b6", s1: "a7", s2: "c7", color: "b" }
  ];
  function detectFianchetto(at) {
    const out = [];
    for (const f of FIANCHETTO) {
      const b = pieceAtSquare(at, f.bishop);
      if (!b || b.type !== "b" || b.color !== f.color) continue;
      if (!isPawnOf(pieceAtSquare(at, f.front), f.color)) continue;
      if (!isPawnOf(pieceAtSquare(at, f.s1), f.color)) continue;
      if (!isPawnOf(pieceAtSquare(at, f.s2), f.color)) continue;
      out.push({ type: "fianchetto", side: f.color, squares: [f.bishop], line: null, label: "Fianchetto" });
    }
    return out;
  }
  function detectOutposts(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p || p.type !== "n") continue;
        const c = p.color;
        const fwd = c === "w" ? 1 : -1;
        const inOpponentHalf = c === "w" ? r >= 5 : r <= 4;
        if (!inOpponentHalf) continue;
        const defended = isPawnOf(pieceAt(at, f - 1, r - fwd), c) || isPawnOf(pieceAt(at, f + 1, r - fwd), c);
        if (!defended) continue;
        const enemy = c === "w" ? "b" : "w";
        let attackable = false;
        for (const af of [f - 1, f + 1]) {
          for (let rr = r + fwd; rr >= 1 && rr <= 8; rr += fwd) {
            if (isPawnOf(pieceAt(at, af, rr), enemy)) attackable = true;
          }
        }
        if (attackable) continue;
        out.push({ type: "outpost", side: c, squares: [toSquare(f, r)], line: null, label: "Outpost" });
      }
    }
    return out;
  }
  function detectPassedPawns(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p || p.type !== "p") continue;
        const c = p.color;
        const fwd = c === "w" ? 1 : -1;
        const enemy = c === "w" ? "b" : "w";
        let blocked = false;
        for (const af of [f - 1, f, f + 1]) {
          if (af < 0 || af > 7) continue;
          for (let rr = r + fwd; rr >= 1 && rr <= 8; rr += fwd) {
            const ahead = pieceAt(at, af, rr);
            if (isPawnOf(ahead, enemy)) blocked = true;
            if (af === f && isPawnOf(ahead, c)) blocked = true;
          }
        }
        if (!blocked) out.push({ type: "passed-pawn", side: c, squares: [toSquare(f, r)], line: null, label: "Passed pawn" });
      }
    }
    return out;
  }
  function movesAlong(type, d) {
    const ortho = d[0] === 0 || d[1] === 0;
    const diag = Math.abs(d[0]) === Math.abs(d[1]) && d[0] !== 0;
    if (type === "r") return ortho;
    if (type === "b") return diag;
    if (type === "q") return ortho || diag;
    return false;
  }
  function firstHit(at, f, r, d) {
    let nf = f + d[0];
    let nr = r + d[1];
    while (pieceAt(at, nf, nr) === null) {
      nf += d[0];
      nr += d[1];
    }
    const piece = pieceAt(at, nf, nr);
    return piece ? { piece, file: nf, rank: nr } : null;
  }
  var ALL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var ORTHO_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var KNIGHT_HOPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  function attackSquares(at, f, r) {
    const p = pieceAt(at, f, r);
    if (!p) return [];
    const out = [];
    const onBoard = (nf, nr) => nf >= 0 && nf < 8 && nr >= 1 && nr <= 8;
    if (p.type === "n") {
      for (const [df, dr] of KNIGHT_HOPS) if (onBoard(f + df, r + dr)) out.push([f + df, r + dr]);
    } else if (p.type === "k") {
      for (const [df, dr] of ALL_DIRS) if (onBoard(f + df, r + dr)) out.push([f + df, r + dr]);
    } else if (p.type === "p") {
      const fwd = p.color === "w" ? 1 : -1;
      if (onBoard(f - 1, r + fwd)) out.push([f - 1, r + fwd]);
      if (onBoard(f + 1, r + fwd)) out.push([f + 1, r + fwd]);
    } else {
      const dirs = p.type === "r" ? ORTHO_DIRS : p.type === "b" ? DIAG_DIRS : ALL_DIRS;
      for (const [df, dr] of dirs) {
        let nf = f + df, nr = r + dr;
        while (onBoard(nf, nr)) {
          out.push([nf, nr]);
          if (pieceAt(at, nf, nr)) break;
          nf += df;
          nr += dr;
        }
      }
    }
    return out;
  }
  function detectBatteries(at) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p || !"rbq".includes(p.type)) continue;
        for (const d of ALL_DIRS) {
          if (!movesAlong(p.type, d)) continue;
          const hit = firstHit(at, f, r, d);
          if (!hit) continue;
          const q = hit.piece;
          if (q.color !== p.color || !"rbq".includes(q.type) || !movesAlong(q.type, d)) continue;
          if (p.type !== "q" && q.type !== "q") continue;
          const fwd = p.color === "w" ? 1 : -1;
          const towardEnemy = d[1] * fwd >= 0;
          let enemyAhead = false;
          let openAhead = 0;
          let sf = hit.file + d[0];
          let sr = hit.rank + d[1];
          while (sf >= 0 && sf < 8 && sr >= 1 && sr <= 8) {
            const occ = pieceAt(at, sf, sr);
            if (!occ) {
              openAhead += 1;
              sf += d[0];
              sr += d[1];
              continue;
            }
            if (occ.color !== p.color) enemyAhead = true;
            break;
          }
          if (!enemyAhead && !(openAhead >= 2 && towardEnemy)) continue;
          const a = toSquare(f, r);
          const b = toSquare(hit.file, hit.rank);
          const key = [a, b].sort().join("-");
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ type: "battery", side: p.color, squares: [a, b], line: { from: a, to: b }, label: "Battery" });
        }
      }
    }
    return out;
  }
  function detectRooks(at) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p || p.type !== "r") continue;
        for (const d of ORTHO_DIRS) {
          const hit = firstHit(at, f, r, d);
          if (!hit || hit.piece.color !== p.color || hit.piece.type !== "r") continue;
          const a = toSquare(f, r);
          const b = toSquare(hit.file, hit.rank);
          const key = [a, b].sort().join("-");
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ type: "rooks", side: p.color, squares: [a, b], line: { from: a, to: b }, label: "Rooks" });
        }
      }
    }
    return out;
  }
  var SKEWER_MIN_BACK = 3;
  function skewerWinsBack(at, first, second, attackColor) {
    const back = second.piece;
    if (VALUE2[back.type] < SKEWER_MIN_BACK) return false;
    const cleared = { ...at };
    delete cleared[`${first.file},${first.rank}`];
    const attackers = attackersOf(cleared, second.file, second.rank, attackColor);
    if (attackers.length === 0) return false;
    const defenders = attackersOf(cleared, second.file, second.rank, back.color);
    const attackerVals = attackers.map((a) => VALUE2[a.type]).sort((a, b) => a - b);
    const defenderVals = defenders.map((d) => VALUE2[d.type]).sort((a, b) => a - b);
    return staticExchange(VALUE2[back.type], attackerVals, defenderVals) > 0;
  }
  function detectPinsAndSkewers(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const s = pieceAt(at, f, r);
        if (!s || !"rbq".includes(s.type)) continue;
        for (const d of ALL_DIRS) {
          if (!movesAlong(s.type, d)) continue;
          const first = firstHit(at, f, r, d);
          if (!first || first.piece.color === s.color) continue;
          const second = firstHit(at, first.file, first.rank, d);
          if (!second || second.piece.color === s.color) continue;
          const ssq = toSquare(f, r);
          const f1 = toSquare(first.file, first.rank);
          const f2 = toSquare(second.file, second.rank);
          const v1 = VALUE2[first.piece.type];
          const v2 = VALUE2[second.piece.type];
          if (v2 > v1 && first.piece.type !== "p") {
            out.push({ type: "pin", side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: "Pin" });
          } else if (v1 > v2 && skewerWinsBack(at, first, second, s.color)) {
            out.push({ type: "skewer", side: s.color, squares: [ssq, f1, f2], line: { from: ssq, to: f2 }, label: "Skewer" });
          }
        }
      }
    }
    return out;
  }
  function detectPawnChains(at) {
    const out = [];
    for (const c of ["w", "b"]) {
      const fwd = c === "w" ? 1 : -1;
      for (const df of [-1, 1]) {
        for (let f = 0; f < 8; f++) {
          for (let r = 1; r <= 8; r++) {
            if (!isPawnOf(pieceAt(at, f, r), c)) continue;
            if (isPawnOf(pieceAt(at, f - df, r - fwd), c)) continue;
            const squares = [];
            let nf = f, nr = r;
            while (isPawnOf(pieceAt(at, nf, nr), c)) {
              squares.push(toSquare(nf, nr));
              nf += df;
              nr += fwd;
            }
            if (squares.length >= 3) {
              out.push({ type: "pawn-chain", side: c, squares, line: null, label: "Pawn chain" });
            }
          }
        }
      }
    }
    return out;
  }
  function seeGain(onSquareValue, moverVals, otherVals) {
    if (moverVals.length === 0) return 0;
    const cheapest = moverVals[0];
    if (cheapest === VALUE2.k && otherVals.length > 0) return 0;
    return Math.max(0, onSquareValue - seeGain(cheapest, otherVals, moverVals.slice(1)));
  }
  function staticExchange(victimValue, attackerVals, defenderVals) {
    if (attackerVals.length === 0) return 0;
    const cheapest = attackerVals[0];
    if (cheapest === VALUE2.k && defenderVals.length > 0) return 0;
    return victimValue - seeGain(cheapest, defenderVals, attackerVals.slice(1));
  }
  function detectHotspots(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p) continue;
        const enemyColor = p.color === "w" ? "b" : "w";
        const attackers = attackersOf(at, f, r, enemyColor);
        if (attackers.length === 0) continue;
        const defenders = attackersOf(at, f, r, p.color);
        const attackerVals = attackers.map((a) => VALUE2[a.type]).sort((a, b) => a - b);
        const defenderVals = defenders.map((d) => VALUE2[d.type]).sort((a, b) => a - b);
        if (staticExchange(VALUE2[p.type], attackerVals, defenderVals) <= 0) continue;
        out.push({
          type: "hotspot",
          side: enemyColor,
          squares: [toSquare(f, r), ...attackers.map((a) => a.square)],
          line: null,
          label: "Hotspot"
        });
      }
    }
    return out;
  }
  function detectOpenFileRooks(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      let pawn = false;
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (p && p.type === "p") {
          pawn = true;
          break;
        }
      }
      if (pawn) continue;
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (p && p.type === "r") {
          const endR = p.color === "w" ? 8 : 1;
          out.push({ type: "open-file", side: p.color, squares: [toSquare(f, r)], line: { from: toSquare(f, r), to: toSquare(f, endR) }, label: "Open file" });
        }
      }
    }
    return out;
  }
  var FORTRESS = [
    { king: "g1", pawns: ["f2", "g2", "h2"], color: "w" },
    { king: "c1", pawns: ["b2", "c2", "d2"], color: "w" },
    { king: "g8", pawns: ["f7", "g7", "h7"], color: "b" },
    { king: "c8", pawns: ["b7", "c7", "d7"], color: "b" }
  ];
  function detectKingFortress(at) {
    const out = [];
    for (const fort of FORTRESS) {
      const k = pieceAtSquare(at, fort.king);
      if (!k || k.type !== "k" || k.color !== fort.color) continue;
      if (!fort.pawns.every((sq) => isPawnOf(pieceAtSquare(at, sq), fort.color))) continue;
      out.push({ type: "fortress", side: fort.color, squares: [fort.king, ...fort.pawns], line: null, label: "Fortress" });
    }
    return out;
  }
  function detectForks(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p) continue;
        const myVal = VALUE2[p.type];
        const enemy = p.color === "w" ? "b" : "w";
        const targets = [];
        for (const [nf, nr] of attackSquares(at, f, r)) {
          const q = pieceAt(at, nf, nr);
          if (q && q.color === enemy && VALUE2[q.type] >= myVal) targets.push(toSquare(nf, nr));
        }
        if (targets.length >= 2) {
          out.push({ type: "fork", side: p.color, squares: [toSquare(f, r), ...targets], line: null, label: "Fork" });
        }
      }
    }
    return out;
  }
  function attackersOf(at, f, r, color) {
    const out = [];
    for (let af = 0; af < 8; af++) {
      for (let ar = 1; ar <= 8; ar++) {
        const p = pieceAt(at, af, ar);
        if (!p || p.color !== color) continue;
        for (const [tf, tr] of attackSquares(at, af, ar)) {
          if (tf === f && tr === r) {
            out.push({ type: p.type, color: p.color, square: toSquare(af, ar) });
            break;
          }
        }
      }
    }
    return out;
  }
  function detectHangingPieces(at) {
    const out = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const p = pieceAt(at, f, r);
        if (!p || p.type === "k") continue;
        const enemy = p.color === "w" ? "b" : "w";
        const attackers = attackersOf(at, f, r, enemy);
        if (attackers.length === 0) continue;
        const defenders = attackersOf(at, f, r, p.color);
        const cheapestAttacker = Math.min(...attackers.map((a) => VALUE2[a.type]));
        const hanging = defenders.length === 0 || cheapestAttacker < VALUE2[p.type];
        if (hanging) {
          out.push({ type: "hanging", side: p.color, squares: [toSquare(f, r)], line: null, label: "Hanging" });
        }
      }
    }
    return out;
  }
  function detectPatterns(board) {
    const at = indexBoard(board);
    return [
      ...detectBatteries(at),
      ...detectRooks(at),
      ...detectPinsAndSkewers(at),
      ...detectFianchetto(at),
      ...detectOutposts(at),
      ...detectPassedPawns(at),
      ...detectPawnChains(at),
      ...detectHotspots(at),
      ...detectOpenFileRooks(at),
      ...detectKingFortress(at),
      ...detectForks(at),
      ...detectHangingPieces(at)
    ];
  }

  // src/pattern-art.js
  var FILES2 = "abcdefgh";
  var PATTERN_THEMES = [
    { id: "classic", label: "Classic", own: "#3bd17a", enemy: "#e5564b", spark: "#ffffff" },
    { id: "fire", label: "Fire", own: "#ffb347", enemy: "#ff5757", spark: "#fff1c0" },
    { id: "void", label: "Void", own: "#b98cff", enemy: "#ff66d8", spark: "#ffffff" },
    { id: "ice", label: "Ice", own: "#6fe6ff", enemy: "#ff8aa6", spark: "#eafcff" },
    { id: "gold", label: "Gold", own: "#ffd76a", enemy: "#c8893a", spark: "#fff6d8" }
  ];
  var center = (square, size, blackO) => boardLocalSquareCenter(square, size, blackO);
  var clamp01 = (x) => Math.max(0, Math.min(1, x));
  function easeOutBack(x) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  var colorFor = (pattern, theme, blackO) => pattern.side === (blackO ? "b" : "w") ? theme.own : theme.enemy;
  function forwardDir(square, side, size, blackO) {
    const f = square.charCodeAt(0) - 97;
    const r = Number(square[1]);
    const aheadR = r + (side === "w" ? 1 : -1);
    if (aheadR < 1 || aheadR > 8) return (side === "w" ? -1 : 1) * (blackO ? -1 : 1);
    const here = center(square, size, blackO);
    const ahead = center(`${FILES2[f]}${aheadR}`, size, blackO);
    return Math.sign(ahead.y - here.y) || -1;
  }
  function squareGlow(ctx, p, sq, color, now, phase = 0, fade = 1) {
    const pulse = 0.55 + 0.45 * Math.sin(now / 330 + phase);
    cornerTicks(ctx, p.x, p.y, sq, color, {
      hs: sq / 2 - sq * 0.1,
      len: sq * 0.16,
      lw: Math.max(2, sq * 0.06),
      alpha: (0.4 + 0.5 * pulse) * fade,
      blur: sq * (0.2 + 0.35 * pulse)
    });
  }
  function cornerTicks(ctx, x, y, sq, color, { hs, len, lw, alpha, blur }) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = x + sx * hs, cy = y + sy * hs;
        ctx.beginPath();
        ctx.moveTo(cx - sx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy - sy * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function microSparks(ctx, x, y, sq, color, now, count = 6, spread = 0.5, intensity = 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.12;
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const ang = now / 900 + i * 2.39963;
      const rad = sq * spread * (0.35 + 0.65 * ((Math.sin(now / 680 + i * 1.7) + 1) / 2));
      const tw = 0.35 + 0.65 * ((Math.sin(now / 190 + i * 3.1) + 1) / 2);
      ctx.globalAlpha = 0.22 * tw * intensity;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, Math.max(0.5, sq * 0.026 * tw), 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }
  function energyBolt(ctx, from, to, sq, color) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.4;
    ctx.lineWidth = Math.max(2, sq * 0.07);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
  function drawShield(ctx, cx, cy, sq, color, bulge, scale, alpha) {
    const w = sq * 1.5;
    const h = sq * 1.05 * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = Math.max(2, sq * 0.08);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.5;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, bulge * h * 1.4, w, 0);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.16;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.restore();
  }
  function drawLaser(ctx, a, b, sq, color, spark, intensity) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.6 * intensity;
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.14 * intensity);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = spark;
    ctx.globalAlpha = intensity * 0.9;
    ctx.lineWidth = Math.max(1, sq * 0.05);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(a.x, a.y, sq * 0.18 * intensity, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }
  function drawFianchetto(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const bsq = pattern.squares[0];
    const bf = bsq.charCodeAt(0) - 97;
    const br = Number(bsq[1]);
    const c = center(bsq, size, blackO);
    const dir = forwardDir(bsq, pattern.side, size, blackO);
    const cyc = now % 2e3 / 2e3;
    const pop = cyc < 0.12 ? easeOutBack(clamp01(cyc / 0.12)) : 1;
    const breathe = 0.94 + 0.06 * Math.sin(now / 300);
    drawShield(ctx, c.x, c.y, sq, color, dir, pop * breathe, Math.min(1, pop));
    microSparks(ctx, c.x, c.y + dir * sq * 0.7, sq, theme.spark, now, 7, 0.7, 0.8);
    if (cyc > 0.35 && cyc < 0.62) {
      const intensity = Math.sin((cyc - 0.35) / 0.27 * Math.PI);
      const df = bf < 4 ? 1 : -1;
      const dr = pattern.side === "w" ? 1 : -1;
      let ef = bf, er = br;
      while (ef + df >= 0 && ef + df < 8 && er + dr >= 1 && er + dr <= 8) {
        ef += df;
        er += dr;
      }
      drawLaser(ctx, c, center(`${FILES2[ef]}${er}`, size, blackO), sq, color, theme.spark, intensity);
      microSparks(ctx, c.x, c.y, sq, theme.spark, now, 5, 0.4, intensity);
    }
  }
  function drawWall(ctx, cx, baseY, sq, color, dir, scale, alpha) {
    const halfW = sq * 1.15;
    const h = sq * 0.8 * scale;
    const topY = baseY + dir * h;
    const merlon = sq * 0.18;
    const segments = 7;
    const segW = halfW * 2 / segments;
    const leftX = cx - halfW, rightX = cx + halfW;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.06);
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.4;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.lineTo(leftX, topY);
    for (let i = 0; i < segments; i++) {
      const x0 = leftX + i * segW;
      const x1 = x0 + segW;
      if (i % 2 === 0) {
        ctx.lineTo(x0, topY + dir * merlon);
        ctx.lineTo(x1, topY + dir * merlon);
        ctx.lineTo(x1, topY);
      } else {
        ctx.lineTo(x1, topY);
      }
    }
    ctx.lineTo(rightX, baseY);
    ctx.globalAlpha = alpha * 0.13;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.restore();
  }
  function drawFortress(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const k = center(pattern.squares[0], size, blackO);
    const pawnY = center(pattern.squares[1], size, blackO).y;
    const dir = Math.sign(pawnY - k.y) || -1;
    const baseY = (k.y + pawnY) / 2;
    const cyc = now % 2200 / 2200;
    const pop = cyc < 0.12 ? easeOutBack(clamp01(cyc / 0.12)) : 1;
    const breathe = 0.96 + 0.04 * Math.sin(now / 320);
    drawWall(ctx, k.x, baseY, sq, color, dir, pop * breathe, Math.min(1, pop));
    for (const s of pattern.squares) squareGlow(ctx, center(s, size, blackO), sq, color, now);
    microSparks(ctx, k.x, baseY + dir * sq * 0.6, sq, theme.spark, now, 7, 0.9, 0.6);
  }
  function drawRooks(ctx, size, pattern, now, theme, blackO, fade = 1) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const a = center(pattern.line.from, size, blackO);
    const b = center(pattern.line.to, size, blackO);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const cyc = now % 1700 / 1700;
    squareGlow(ctx, a, sq, color, now, 0, fade);
    squareGlow(ctx, b, sq, color, now, 1.4, fade);
    if (cyc < 0.42) {
      const p = cyc / 0.42;
      ctx.save();
      ctx.globalAlpha = fade;
      energyBolt(ctx, a, { x: a.x + (mid.x - a.x) * p, y: a.y + (mid.y - a.y) * p }, sq, color);
      energyBolt(ctx, b, { x: b.x + (mid.x - b.x) * p, y: b.y + (mid.y - b.y) * p }, sq, color);
      ctx.restore();
    } else {
      const p = (cyc - 0.42) / 0.58;
      const flash = Math.max(0, 1 - p * 4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.4;
      ctx.globalAlpha = (0.5 + 0.3 * Math.sin(now / 250)) * fade;
      ctx.lineWidth = Math.max(2, sq * 0.13);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
      if (flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = theme.spark;
        ctx.shadowColor = color;
        ctx.shadowBlur = sq * 0.8 * flash;
        ctx.globalAlpha = flash * fade;
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, sq * 0.1 + sq * 0.3 * flash, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
      const gp = now / 700 % 1;
      microSparks(ctx, a.x + (b.x - a.x) * gp, a.y + (b.y - a.y) * gp, sq, theme.spark, now, 3, 0.18, fade);
    }
  }
  function drawBattery(ctx, size, pattern, now, theme, blackO, fade = 1) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const a = center(pattern.line.from, size, blackO);
    const b = center(pattern.line.to, size, blackO);
    squareGlow(ctx, a, sq, color, now, 0, fade);
    squareGlow(ctx, b, sq, color, now, 1, fade);
    const cyc = now % 1500 / 1500;
    ctx.save();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    if (cyc < 0.7) {
      const p = cyc / 0.7;
      const hx = a.x + (b.x - a.x) * p, hy = a.y + (b.y - a.y) * p;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.6;
      ctx.globalAlpha = (0.4 + 0.6 * p) * fade;
      ctx.beginPath();
      ctx.arc(hx, hy, sq * (0.08 + 0.06 * p), 0, 6.2832);
      ctx.fill();
      ctx.restore();
      microSparks(ctx, hx, hy, sq, theme.spark, now, 4, 0.25, p * fade);
    } else {
      const p = (cyc - 0.7) / 0.3;
      const f = Math.max(0, 1 - p);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.8 * f;
      ctx.globalAlpha = f * fade;
      ctx.strokeStyle = theme.spark;
      ctx.lineWidth = Math.max(2, sq * 0.16 * f);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, sq * 0.06);
      for (const c of [a, b]) {
        ctx.globalAlpha = f * 0.8 * fade;
        ctx.beginPath();
        ctx.arc(c.x, c.y, sq * (0.3 + 0.5 * p), 0, 6.2832);
        ctx.stroke();
      }
      ctx.restore();
      microSparks(ctx, b.x, b.y, sq, theme.spark, now, 8, 0.6, f * fade);
    }
  }
  function lockBrackets(ctx, cx, cy, sq, color, close) {
    const gap = sq * (0.62 - 0.18 * close);
    const len = sq * 0.2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.05);
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.25;
    for (let q = 0; q < 4; q++) {
      const sx = q < 2 ? -1 : 1;
      const sy = q % 2 === 0 ? -1 : 1;
      const x = cx + sx * gap, y = cy + sy * gap;
      ctx.beginPath();
      ctx.moveTo(x, y - sy * len);
      ctx.lineTo(x, y);
      ctx.lineTo(x - sx * len, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPin(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const att = center(pattern.squares[0], size, blackO);
    const pinned = center(pattern.squares[1], size, blackO);
    const target = center(pattern.squares[2], size, blackO);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.045);
    ctx.lineCap = "round";
    ctx.setLineDash([sq * 0.13, sq * 0.1]);
    ctx.lineDashOffset = -(now / 35 % 1e3);
    ctx.beginPath();
    ctx.moveTo(att.x, att.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.restore();
    squareGlow(ctx, target, sq, color, now, 1);
    const cyc = now % 1600 / 1600;
    const close = cyc < 0.5 ? easeOutBack(clamp01(cyc / 0.3)) : 1;
    const shake = cyc > 0.3 && cyc < 0.5 ? Math.sin(now / 28) * sq * 0.025 : 0;
    lockBrackets(ctx, pinned.x + shake, pinned.y, sq, color, close);
    if (close > 0.9) microSparks(ctx, pinned.x, pinned.y, sq, theme.spark, now, 4, 0.45, 0.8);
  }
  function drawSkewer(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const att = center(pattern.squares[0], size, blackO);
    const back = center(pattern.squares[2], size, blackO);
    const cyc = now % 1200 / 1200;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(att.x, att.y);
    ctx.lineTo(back.x, back.y);
    ctx.stroke();
    ctx.restore();
    if (cyc < 0.5) {
      const p = clamp01(cyc / 0.5);
      const hx = att.x + (back.x - att.x) * p, hy = att.y + (back.y - att.y) * p;
      const tp = Math.max(0, p - 0.3);
      const tx = att.x + (back.x - att.x) * tp, ty = att.y + (back.y - att.y) * tp;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.5;
      ctx.lineWidth = Math.max(2, sq * 0.1);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = theme.spark;
      ctx.beginPath();
      ctx.arc(hx, hy, sq * 0.12, 0, 6.2832);
      ctx.fill();
      ctx.restore();
      microSparks(ctx, hx, hy, sq, theme.spark, now, 4, 0.2, 1);
    } else if (cyc < 0.72) {
      const f = 1 - (cyc - 0.5) / 0.22;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = theme.spark;
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.8 * f;
      ctx.globalAlpha = f;
      ctx.beginPath();
      ctx.arc(back.x, back.y, sq * 0.15 + sq * 0.25 * (1 - f), 0, 6.2832);
      ctx.fill();
      ctx.restore();
      microSparks(ctx, back.x, back.y, sq, theme.spark, now, 6, 0.45, f);
    }
  }
  function drawOutpost(ctx, size, pattern, now, theme, blackO, fade = 1) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const c = center(pattern.squares[0], size, blackO);
    const cyc = now % 2200 / 2200;
    const pulse = cyc % 0.5 / 0.5;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5 * (1 - pulse) * fade;
    ctx.lineWidth = Math.max(1, sq * 0.05);
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, sq * 0.35 + sq * 0.35 * pulse, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
    const rise = cyc < 0.15 ? easeOutBack(clamp01(cyc / 0.15)) : 1;
    const poleH = sq * 0.72 * rise;
    const px = c.x + sq * 0.28, py = c.y - sq * 0.1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = fade;
    ctx.lineWidth = Math.max(2, sq * 0.05);
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - poleH);
    ctx.stroke();
    const wave = Math.sin(now / 180) * sq * 0.05;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92 * rise * fade;
    ctx.beginPath();
    ctx.moveTo(px, py - poleH);
    ctx.lineTo(px - sq * 0.32, py - poleH + sq * 0.1 + wave);
    ctx.lineTo(px, py - poleH + sq * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    microSparks(ctx, c.x, c.y, sq, theme.spark, now, 6, 0.5, 0.7 * fade);
  }
  function drawPassedPawn(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const c = center(pattern.squares[0], size, blackO);
    const dir = forwardDir(pattern.squares[0], pattern.side, size, blackO);
    squareGlow(ctx, c, sq, color, now);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1, sq * 0.035);
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.15;
    for (let i = 0; i < 3; i++) {
      const phase = (now / 1800 + i * 0.34) % 1;
      const cy = c.y + dir * sq * (0.3 + phase * 0.5);
      const wsp = sq * 0.14;
      ctx.globalAlpha = (1 - phase) * 0.35;
      ctx.beginPath();
      ctx.moveTo(c.x - wsp, cy + dir * wsp * 0.6);
      ctx.lineTo(c.x, cy);
      ctx.lineTo(c.x + wsp, cy + dir * wsp * 0.6);
      ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const ph = (now / 2200 + i * 0.27) % 1;
      const mx = c.x + Math.sin(now / 1400 + i) * sq * 0.07;
      const my = c.y + dir * sq * (0.15 + ph * 0.4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (1 - ph) * 0.15;
      ctx.fillStyle = theme.spark;
      ctx.shadowColor = theme.spark;
      ctx.shadowBlur = sq * 0.08;
      ctx.beginPath();
      ctx.arc(mx, my, sq * 0.02, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawPawnChain(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const centers = pattern.squares.map((s) => center(s, size, blackO));
    const n = centers.length;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, sq * 0.045);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(centers[0].x, centers[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(centers[i].x, centers[i].y);
    ctx.stroke();
    ctx.restore();
    const pulsePos = now / 900 % 1 * (n - 1);
    centers.forEach((c, i) => {
      const strength = (i + 1) / n;
      const near = Math.max(0, 1 - Math.abs(i - pulsePos));
      const breathe = 0.5 + 0.5 * Math.sin(now / 300 + i * 0.6);
      cornerTicks(ctx, c.x, c.y, sq, color, {
        hs: sq / 2 - sq * 0.1,
        len: sq * (0.12 + 0.12 * strength),
        lw: Math.max(2, sq * (0.05 + 0.06 * strength)),
        alpha: 0.35 + 0.5 * strength * (0.6 + 0.4 * breathe),
        blur: sq * (0.15 + 0.45 * strength + 0.35 * near)
      });
      microSparks(ctx, c.x, c.y, sq, theme.spark, now, 2 + Math.round(strength * 5), 0.42, 0.4 + 0.6 * strength + 0.5 * near);
    });
    const fi = Math.min(Math.floor(pulsePos), n - 2);
    const fr = pulsePos - fi;
    const a = centers[fi], b = centers[fi + 1];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = theme.spark;
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.5;
    ctx.beginPath();
    ctx.arc(a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, sq * 0.1, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }
  function drawHotspot(ctx, size, pattern, now, theme, blackO, fade = 1) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const focal = center(pattern.squares[0], size, blackO);
    const attackers = pattern.squares.slice(1).map((s) => center(s, size, blackO));
    const n = attackers.length;
    const heat = Math.min(1, (n - 3) / 4 + 0.45);
    const breathe = 0.6 + 0.4 * Math.sin(now / 250);
    attackers.forEach((a, i) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.2;
      ctx.globalAlpha = 0.28 * fade;
      ctx.lineWidth = Math.max(1, sq * 0.04);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(focal.x, focal.y);
      ctx.stroke();
      const p = (now / 700 + i * 0.18) % 1;
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = theme.spark;
      ctx.beginPath();
      ctx.arc(a.x + (focal.x - a.x) * p, a.y + (focal.y - a.y) * p, sq * 0.05, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    });
    const rad = sq * (0.45 + 0.45 * heat) * breathe;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grd = ctx.createRadialGradient(focal.x, focal.y, 0, focal.x, focal.y, rad);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.55 * breathe * fade;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(focal.x, focal.y, rad, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    microSparks(ctx, focal.x, focal.y, sq, theme.spark, now, 4 + n, 0.4, heat * fade);
  }
  function drawOpenFile(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const a = center(pattern.line.from, size, blackO);
    const b = center(pattern.line.to, size, blackO);
    squareGlow(ctx, a, sq, color, now);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = sq * 0.15;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = Math.max(1, sq * 0.05);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const p = now / 1100 % 1;
    const px = a.x + (b.x - a.x) * p, py = a.y + (b.y - a.y) * p;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = theme.spark;
    ctx.shadowBlur = sq * 0.25;
    ctx.beginPath();
    ctx.arc(px, py, sq * 0.08, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    microSparks(ctx, px, py, sq, theme.spark, now, 3, 0.2, 0.6);
  }
  function drawFork(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const att = center(pattern.squares[0], size, blackO);
    const targets = pattern.squares.slice(1).map((s) => center(s, size, blackO));
    squareGlow(ctx, att, sq, color, now);
    const cyc = now % 1300 / 1300;
    targets.forEach((t, i) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = sq * 0.25;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, sq * 0.045);
      ctx.beginPath();
      ctx.moveTo(att.x, att.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      const p = clamp01((cyc - i * 0.06) / 0.4);
      if (cyc < 0.55) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = theme.spark;
        ctx.shadowBlur = sq * 0.4;
        ctx.beginPath();
        ctx.arc(att.x + (t.x - att.x) * p, att.y + (t.y - att.y) * p, sq * 0.06, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
      cornerTicks(ctx, t.x, t.y, sq, color, { hs: sq / 2 - sq * 0.1, len: sq * 0.13, lw: Math.max(2, sq * 0.055), alpha: 0.55, blur: sq * 0.25 });
    });
    microSparks(ctx, att.x, att.y, sq, theme.spark, now, 5, 0.4, 0.8);
  }
  function drawGeneric(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    for (const square of pattern.squares) squareGlow(ctx, center(square, size, blackO), sq, color, now);
  }
  function drawHanging(ctx, size, pattern, now, theme, blackO) {
    const color = colorFor(pattern, theme, blackO);
    const sq = size / 8;
    const c = center(pattern.squares[0], size, blackO);
    const cyc = now % 3200 / 3200;
    const pulse = 0.5 + 0.5 * Math.sin(cyc * 6.2832);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, sq * 0.02);
    ctx.globalAlpha = 0.08 + 0.07 * pulse;
    ctx.beginPath();
    ctx.arc(c.x, c.y, sq * 0.32 + sq * 0.03 * pulse, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
  }
  function drawPatternFx(ctx, size, pattern, now, theme = PATTERN_THEMES[0], blackO = false, fade = 1) {
    switch (pattern.type) {
      case "fianchetto":
        return drawFianchetto(ctx, size, pattern, now, theme, blackO);
      case "rooks":
        return drawRooks(ctx, size, pattern, now, theme, blackO, fade);
      case "battery":
        return drawBattery(ctx, size, pattern, now, theme, blackO, fade);
      case "pin":
        return drawPin(ctx, size, pattern, now, theme, blackO);
      case "skewer":
        return drawSkewer(ctx, size, pattern, now, theme, blackO);
      case "outpost":
        return drawOutpost(ctx, size, pattern, now, theme, blackO, fade);
      case "passed-pawn":
        return drawPassedPawn(ctx, size, pattern, now, theme, blackO);
      case "pawn-chain":
        return drawPawnChain(ctx, size, pattern, now, theme, blackO);
      case "hotspot":
        return drawHotspot(ctx, size, pattern, now, theme, blackO, fade);
      case "open-file":
        return drawOpenFile(ctx, size, pattern, now, theme, blackO);
      case "fortress":
        return drawFortress(ctx, size, pattern, now, theme, blackO);
      case "fork":
        return drawFork(ctx, size, pattern, now, theme, blackO);
      case "hanging":
        return drawHanging(ctx, size, pattern, now, theme, blackO);
      default:
        return drawGeneric(ctx, size, pattern, now, theme, blackO);
    }
  }

  // src/pattern-overlay.js
  var HOLD_MS = 900;
  var BLINK_MS = 1200;
  function patternKey(pattern) {
    return `${pattern.type}|${pattern.side}|${pattern.squares.join(",")}`;
  }
  function scaleAlpha(ctx, fade) {
    return new Proxy(ctx, {
      get(target, prop) {
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        target[prop] = prop === "globalAlpha" ? value * fade : value;
        return true;
      }
    });
  }
  var PatternOverlay = class {
    constructor({
      document: document2 = globalThis.document,
      devicePixelRatio = globalThis.devicePixelRatio ?? 1,
      ResizeObserver = globalThis.ResizeObserver,
      getContext = (canvas) => canvas.getContext?.("2d"),
      theme = PATTERN_THEMES[0],
      now = () => globalThis.performance?.now?.() ?? Date.now()
    } = {}) {
      this.document = document2;
      this.devicePixelRatio = devicePixelRatio;
      this.ResizeObserver = ResizeObserver;
      this.getContext = getContext;
      this.theme = theme;
      this.now = now;
      this.canvas = null;
      this.board = null;
      this.resizeObserver = null;
      this.patterns = [];
      this.firstSeen = /* @__PURE__ */ new Map();
      this.raf = null;
      this.last = 0;
    }
    attach() {
      if (!this._ensureBoard()) return null;
      this.canvas = this.document.getElementById("lichess-pattern-overlay");
      if (!this.canvas) {
        this.canvas = this.document.createElement("canvas");
        this.canvas.id = "lichess-pattern-overlay";
        Object.assign(this.canvas.style, { position: "absolute", left: "0px", top: "0px", pointerEvents: "none", zIndex: "2" });
      }
      this.sync();
      return this.canvas;
    }
    // Same stale-node guard as CanvasOverlay: lichess recreates cg-board on
    // flips/resizes/SPA navigation, and a detached node reports a 0x0 rect.
    _ensureBoard() {
      if (this.board && this.board.isConnected !== false) return this.board;
      const board = this.document.querySelector("cg-board");
      if (!board) return null;
      this.board = board;
      if (this.ResizeObserver) {
        this.resizeObserver?.disconnect();
        this.resizeObserver = new this.ResizeObserver(() => this.sync());
        this.resizeObserver.observe(board);
      }
      return board;
    }
    sync() {
      const board = this._ensureBoard();
      if (!board || !this.canvas) return null;
      const container = board.parentElement;
      if (container && this.canvas.parentElement !== container) container.appendChild(this.canvas);
      const rect = board.getBoundingClientRect();
      const size = rect.width;
      const dpr = this.devicePixelRatio;
      Object.assign(this.canvas.style, { left: `${board.offsetLeft || 0}px`, top: `${board.offsetTop || 0}px`, width: `${size}px`, height: `${size}px` });
      const bufferSize = Math.round(size * dpr);
      if (this.canvas.width !== bufferSize) this.canvas.width = bufferSize;
      if (this.canvas.height !== bufferSize) this.canvas.height = bufferSize;
      const context = this.getContext(this.canvas);
      context?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
      const isBlackOrientation = this.document.querySelector(".cg-wrap")?.classList.contains("orientation-black") ?? false;
      return { context, size, isBlackOrientation };
    }
    // Persist the current patterns and animate them on the overlay until they
    // change or the overlay is cleared. Called on each position change.
    render(patterns) {
      this.patterns = patterns || [];
      const liveKeys = new Set(this.patterns.map(patternKey));
      for (const key of this.firstSeen.keys()) {
        if (!liveKeys.has(key)) this.firstSeen.delete(key);
      }
      const now = this.now();
      for (const pattern of this.patterns) {
        const key = patternKey(pattern);
        if (!this.firstSeen.has(key)) this.firstSeen.set(key, now);
      }
      if (!this.canvas) this.attach();
      if (this.patterns.length === 0) {
        this._stop();
        this.clear();
        return;
      }
      if (this.patterns.some((p) => this.fadeFor(p, now) > 0)) {
        this._start();
      } else if (this.raf == null) {
        this._frame(now);
      }
    }
    clear() {
      this._stop();
      this.firstSeen.clear();
      const state = this.sync();
      if (state?.context) state.context.clearRect(0, 0, state.size, state.size);
    }
    // One blink: full through HOLD_MS, eased to 0 by BLINK_MS, then off (0).
    // Applies to every pattern type — the universal pop-then-faint lifecycle.
    fadeFor(pattern, atMs) {
      const firstSeenAt = this.firstSeen.get(patternKey(pattern));
      if (firstSeenAt == null) return 1;
      const t = atMs - firstSeenAt;
      if (t >= BLINK_MS) return 0;
      if (t <= HOLD_MS) return 1;
      return 1 - (t - HOLD_MS) / (BLINK_MS - HOLD_MS);
    }
    _start() {
      if (this.raf != null) return;
      const raf = globalThis.requestAnimationFrame;
      if (!raf) {
        this._frame(0);
        return;
      }
      const tick = (now) => {
        this.raf = raf(tick);
        if (now - this.last < 32) return;
        this.last = now;
        this._frame(now);
      };
      this.raf = raf(tick);
    }
    _stop() {
      if (this.raf != null && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    _frame(now) {
      const state = this.sync();
      if (!state || !state.context) return;
      const { context, size, isBlackOrientation } = state;
      context.clearRect(0, 0, size, size);
      let anyVisible = false;
      for (const pattern of this.patterns) {
        const fade = this.fadeFor(pattern, now);
        if (fade <= 0) continue;
        anyVisible = true;
        context.globalAlpha = fade;
        const ctx = fade < 1 ? scaleAlpha(context, fade) : context;
        drawPatternFx(ctx, size, pattern, now, this.theme, isBlackOrientation);
      }
      context.globalAlpha = 1;
      if (!anyVisible) this._stop();
    }
  };

  // src/piece-sprites.js
  var TYPE_CLASS = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  var COLOR_CLASS = { w: "white", b: "black" };
  function extractCssUrl(backgroundImage) {
    if (typeof backgroundImage !== "string") return null;
    const match = backgroundImage.match(/url\((['"]?)(.+?)\1\)/);
    return match ? match[2] : null;
  }
  var PieceSprites = class {
    constructor({
      document: document2 = globalThis.document,
      getComputedStyle = (el) => globalThis.getComputedStyle(el),
      createImage = () => new globalThis.Image()
    } = {}) {
      this.document = document2;
      this.getComputedStyle = getComputedStyle;
      this.createImage = createImage;
      this.cache = /* @__PURE__ */ new Map();
    }
    // Preload all 12 piece images so the first capture already has them.
    warm() {
      for (const color of Object.keys(COLOR_CLASS)) {
        for (const type of Object.keys(TYPE_CLASS)) this._resolve(color, type);
      }
    }
    // Returns a drawable image for the piece, or null (not loaded yet / failed).
    get(color, type) {
      const entry = this._resolve(color, type);
      return entry && entry.ready ? entry.image : null;
    }
    _resolve(color, type) {
      const key = `${color}${type}`;
      if (this.cache.has(key)) return this.cache.get(key);
      const url = this._probeUrl(color, type);
      if (!url) {
        if (this.document?.querySelector?.("cg-board")) this.cache.set(key, null);
        return null;
      }
      const entry = { image: this.createImage(), ready: false };
      entry.image.onload = () => {
        entry.ready = true;
      };
      entry.image.onerror = () => {
        this.cache.set(key, null);
      };
      entry.image.src = url;
      this.cache.set(key, entry);
      return entry;
    }
    _probeUrl(color, type) {
      const doc = this.document;
      const host = doc?.querySelector?.("cg-board") || doc?.querySelector?.(".cg-wrap");
      if (!host) return null;
      const probe = doc.createElement("piece");
      probe.className = `${COLOR_CLASS[color] || "black"} ${TYPE_CLASS[type] || "pawn"}`;
      Object.assign(probe.style, { visibility: "hidden", pointerEvents: "none" });
      host.appendChild(probe);
      let url = null;
      try {
        url = extractCssUrl(this.getComputedStyle(probe)?.backgroundImage);
      } finally {
        probe.remove();
      }
      return url;
    }
  };

  // src/runtime.js
  var PIECE_NAMES = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };
  function domToast(doc, text) {
    if (!doc) return;
    const old = doc.getElementById("k-toast");
    if (old) old.remove();
    const element = doc.createElement("div");
    element.id = "k-toast";
    element.textContent = `${text} \u{1F4A5}`;
    Object.assign(element.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "99999",
      background: "#1a1a2e",
      color: "#ff6b6b",
      padding: "10px 20px",
      borderRadius: "8px",
      border: "2px solid #ff6b6b",
      pointerEvents: "none"
    });
    doc.body.appendChild(element);
    setTimeout(() => element.remove(), 2e3);
  }
  function createRuntime({
    config,
    createRenderer = (opts) => new ParticleFxRenderer(opts),
    overlay = new CanvasOverlay(),
    stream = new CaptureEventStream(),
    readSnapshotFn = readSnapshot,
    schedule = (cb) => requestAnimationFrame(cb),
    cancel = (id) => cancelAnimationFrame(id),
    doc = typeof document !== "undefined" ? document : null,
    loc = typeof location !== "undefined" ? location : null,
    observerFactory = (cb) => new MutationObserver(cb),
    patternOverlay = new PatternOverlay(),
    pieceSprites = null,
    derivePositionFn = derivePosition,
    detectPatternsFn = detectPatterns,
    notify
  } = {}) {
    const settings = { ...config, shakePieces: [...config?.shakePieces ?? []] };
    const emit = notify || ((text) => domToast(doc, text));
    let renderer = null;
    let frameRequest = null;
    let currentContext = null;
    let currentSize = 0;
    let observer = null;
    let lastPatternSig = null;
    let lastSnapshot = null;
    const sprites = pieceSprites ?? (doc ? new PieceSprites({ document: doc }) : null);
    function ensureRenderer() {
      overlay.attach();
      const state = overlay.sync();
      if (!state?.context) return null;
      currentContext = state.context;
      currentSize = state.size;
      if (!renderer) {
        const packConfig = resolvePack(settings.packId);
        renderer = createRenderer({
          mode: packConfig.mode,
          routing: packConfig.routing,
          fallback: packConfig.fallback,
          intensity: settings.intensity,
          soundOn: settings.soundOn,
          buildupMs: settings.buildupMs,
          getPieceImage: (color, type) => sprites?.get(color, type) ?? null,
          onImpact: (renderEvent, opts) => {
            if (overlay.board && settings.shakePieces.includes(renderEvent?.attacker?.piece)) {
              shakeElement(overlay.board, {
                amplitude: opts?.amplitude ?? 3,
                durationMs: opts?.durationMs ?? 160
              });
            }
          }
        });
      }
      return state;
    }
    function renderCapture(event, snapshotId) {
      if (!settings.enabled) return;
      const state = ensureRenderer();
      if (!state || !renderer) return;
      const renderEvent = createRenderEvent(
        event,
        { size: state.size, isBlackOrientation: state.isBlackOrientation },
        snapshotId
      );
      emit(`${PIECE_NAMES[event.movingPiece] || "Piece"} captures`);
      renderer.play(renderEvent);
      startFrameLoop();
    }
    function startFrameLoop() {
      if (frameRequest != null) return;
      frameRequest = schedule(frame);
    }
    function frame(nowMs) {
      frameRequest = null;
      const state = overlay.sync();
      if (state?.context) {
        currentContext = state.context;
        currentSize = state.size;
      }
      currentContext?.clearRect(0, 0, currentSize, currentSize);
      renderer?.tick(nowMs, currentContext, currentSize);
      if (renderer?.activeCount) frameRequest = schedule(frame);
    }
    function patternSig(snapshot) {
      if (!snapshot) return null;
      const moves = snapshot.sanMoves || [];
      const ply = snapshot.activePly ?? moves.length;
      return `${snapshot.id}|${ply}|${moves[ply - 1] || ""}`;
    }
    function renderPatterns(snapshot, force) {
      if (!settings.patternsOn) {
        patternOverlay.clear();
        lastPatternSig = null;
        return;
      }
      const sig = patternSig(snapshot);
      if (!force && sig === lastPatternSig) return;
      lastPatternSig = sig;
      if (!snapshot) {
        patternOverlay.clear();
        return;
      }
      const { board } = derivePositionFn(snapshot);
      patternOverlay.render(detectPatternsFn(board));
    }
    function scan() {
      const snapshot = readSnapshotFn(doc, loc);
      lastSnapshot = snapshot;
      const events = stream.next(snapshot);
      events.forEach((event) => renderCapture(event, snapshot?.id));
      renderPatterns(snapshot, false);
    }
    function start() {
      if (doc) {
        observer = observerFactory(scan);
        observer.observe(doc.body, { childList: true, subtree: true });
      }
      sprites?.warm();
      scan();
    }
    function applyConfig(partial) {
      Object.assign(settings, partial);
      if (partial && Array.isArray(partial.shakePieces)) settings.shakePieces = [...partial.shakePieces];
      if (renderer) {
        const packConfig = resolvePack(settings.packId);
        renderer.mode = packConfig.mode;
        renderer.routing = packConfig.routing;
        renderer.fallback = packConfig.fallback;
        renderer.intensity = Math.max(1, Math.min(10, settings.intensity));
        renderer.soundOn = settings.soundOn;
        renderer.buildupMs = settings.buildupMs;
      }
      if (partial && "patternsOn" in partial) {
        renderPatterns(lastSnapshot, true);
      }
    }
    function stop() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (frameRequest != null) {
        cancel(frameRequest);
        frameRequest = null;
      }
    }
    return {
      start,
      stop,
      applyConfig,
      get renderer() {
        return renderer;
      },
      get settings() {
        return settings;
      }
    };
  }

  // src/settings.js
  var DEFAULT_SETTINGS = {
    enabled: true,
    packId: "signature",
    intensity: 5,
    soundOn: true,
    buildupMs: 0,
    patternsOn: true,
    shakePieces: ["q"]
  };

  // src/userscript-entry.js
  createRuntime({ config: DEFAULT_SETTINGS }).start();
})();
