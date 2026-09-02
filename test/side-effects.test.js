const test = require("node:test");
const assert = require("node:assert/strict");

const { triggerSideEffects } = require("../src/jobs/sideEffects");

test("side-effect failure is caught without throwing", async () => {
  const originalFailureMode = process.env.FORCE_SIDE_EFFECT_FAILURE;

  process.env.FORCE_SIDE_EFFECT_FAILURE = "true";

  const errors = [];
  const originalConsoleError = console.error;

  console.error = (...args) => {
    errors.push(args.join(" "));
  };

  try {
    assert.doesNotThrow(() => {
      triggerSideEffects({
        id: "test-submission",
        tenant_id: "test-tenant",
        widget_id: "test-widget",
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(errors.length, 1);
    assert.match(
      errors[0],
      /Forced webhook\/email delivery failure/
    );
  } finally {
    console.error = originalConsoleError;

    if (originalFailureMode === undefined) {
      delete process.env.FORCE_SIDE_EFFECT_FAILURE;
    } else {
      process.env.FORCE_SIDE_EFFECT_FAILURE = originalFailureMode;
    }
  }
});