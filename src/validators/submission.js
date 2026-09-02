const { z } = require("zod");

const submissionSchema = z.object({
  widget_id: z.string().min(1, "widget_id is required"),
  data: z.record(z.any()).refine((val) => Object.keys(val).length <= 50, {
    message: "Payload data is too large",
  }),
  website: z.string().optional(), // The honeypot field
});

function validateSubmission(payload) {
  return submissionSchema.safeParse(payload);
}

module.exports = { validateSubmission };
