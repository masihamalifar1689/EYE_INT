import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStaggerDelay,
  computeRtlTabDirection,
  computeMagneticOffset,
  computeSpotlightCoords,
  formatEditorialIndex,
} from "./motionPrimitives";

const WORKSPACE_ORDER = ["reader", "editorial", "visual_flow", "graph"] as const;

test("computeStaggerDelay scales linearly and caps at maxSec budget", () => {
  assert.equal(computeStaggerDelay(0), 0);
  assert.equal(computeStaggerDelay(-3), 0);
  assert.equal(computeStaggerDelay(2, 0.03, 0.2), 0.06);
  assert.equal(computeStaggerDelay(50, 0.03, 0.2), 0.2);
});

test("computeRtlTabDirection returns RTL-aware spatial vectors", () => {
  assert.equal(computeRtlTabDirection("reader", "reader", WORKSPACE_ORDER), 0);
  assert.equal(computeRtlTabDirection("reader", "editorial", WORKSPACE_ORDER), -1);
  assert.equal(computeRtlTabDirection("reader", "graph", WORKSPACE_ORDER), -1);
  assert.equal(computeRtlTabDirection("graph", "reader", WORKSPACE_ORDER), 1);
  assert.equal(computeRtlTabDirection("visual_flow", "editorial", WORKSPACE_ORDER), 1);
  assert.equal(computeRtlTabDirection("unknown", "reader", WORKSPACE_ORDER), 0);
});

test("computeMagneticOffset pulls gently toward cursor and clamps to maxOffset", () => {
  const rect = { left: 100, top: 100, width: 100, height: 40 };
  // Center is (150, 120)
  assert.deepEqual(computeMagneticOffset(150, 120, rect, 0.25, 4), { x: 0, y: 0 });
  assert.deepEqual(computeMagneticOffset(160, 112, rect, 0.25, 4), { x: 2.5, y: -2 });
  // Far pointer clamps cleanly at ±4px
  assert.deepEqual(computeMagneticOffset(300, 300, rect, 0.25, 4), { x: 4, y: 4 });
  assert.deepEqual(computeMagneticOffset(0, 0, rect, 0.25, 4), { x: -4, y: -4 });
});

test("computeSpotlightCoords calculates rounded local card coordinates", () => {
  assert.deepEqual(computeSpotlightCoords(245.7, 189.2, { left: 200, top: 150 }), {
    x: 46,
    y: 39,
  });
});

test("formatEditorialIndex formats 1-based indices as zero-padded Persian numerals", () => {
  assert.equal(formatEditorialIndex(1), "۰۱");
  assert.equal(formatEditorialIndex(9), "۰۹");
  assert.equal(formatEditorialIndex(14), "۱۴");
  assert.equal(formatEditorialIndex(105), "۱۰۵");
});
