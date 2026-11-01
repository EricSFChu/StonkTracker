import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectionAxisTicks, formatProjectionAxisTick } from "../src/lib/chart-axis.ts";
import { buildCompoundingProjectionData } from "../src/lib/compounding.ts";

test("projection axis stays bounded and covers high-growth projections", () => {
  for (const annualRate of [0, 8, 50, 120]) {
    for (const years of [1, 30, 60]) {
      const projection = buildCompoundingProjectionData(400_000, {
        annualRate,
        years,
        annualContribution: 10_000
      });
      const maximum = projection[projection.length - 1].projectedValue;
      const ticks = buildProjectionAxisTicks(maximum);

      assert.ok(ticks.length >= 2 && ticks.length <= 6);
      assert.equal(ticks[0], 0);
      assert.ok(ticks[ticks.length - 1] >= maximum);
      assert.ok(ticks.every((tick, index) => Number.isFinite(tick) &&
        (index === 0 || tick > ticks[index - 1])));
    }
  }
});

test("projection axis handles empty values and uses readable intervals", () => {
  assert.deepEqual(buildProjectionAxisTicks(0), [0, 250_000]);
  assert.deepEqual(buildProjectionAxisTicks(1_000_000), [0, 250_000, 500_000, 750_000, 1_000_000]);
  assert.deepEqual(buildProjectionAxisTicks(3_100_000), [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]);
});

test("projection axis labels stay short at large magnitudes", () => {
  assert.equal(formatProjectionAxisTick(250_000), "$250K");
  assert.equal(formatProjectionAxisTick(2_500_000), "$2.5M");
  assert.equal(formatProjectionAxisTick(4_000_000_000), "$4B");
  assert.equal(formatProjectionAxisTick(3_000_000_000_000), "$3T");
  assert.equal(formatProjectionAxisTick(1e20), "$1E20");

  const projection = buildCompoundingProjectionData(400_000, {
    annualRate: 120,
    years: 60,
    annualContribution: 10_000
  });
  const ticks = buildProjectionAxisTicks(projection[projection.length - 1].projectedValue);
  assert.ok(ticks.every((value) => formatProjectionAxisTick(value).length <= 10));
});
