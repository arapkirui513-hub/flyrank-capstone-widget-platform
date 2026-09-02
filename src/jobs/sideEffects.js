function triggerSideEffects(submission) {
  // Decouple side effects from the main submission request.
  setImmediate(async () => {
    try {
      console.log(`[Side Effect] Processing submission ${submission.id}...`);

      // Deterministic failure mode for verification.
      if (process.env.FORCE_SIDE_EFFECT_FAILURE === "true") {
        throw new Error("Forced webhook/email delivery failure");
      }

      // Simulate a successful webhook/email operation.
      console.log(
        `[Side Effect] Successfully processed submission ${submission.id}`
      );
    } catch (error) {
      // Side-effect failures are isolated from the persisted submission.
      console.error(
        `[Side Effect] Failed for submission ${submission.id}:`,
        error.message
      );
    }
  });
}

module.exports = { triggerSideEffects };