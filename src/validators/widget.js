const { z } = require("zod");

const fieldSchema = z.object({
  name: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(255),
  type: z.enum(["text", "email", "textarea", "tel", "number"]),
  required: z.boolean().default(false),
  placeholder: z.string().max(255).optional(),
});

const widgetSchema = z.object({
  type: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(255),
  description: z.string().max(2000).optional(),
  fields: z.array(fieldSchema).max(50),
  button_text: z.string().trim().min(1).max(100).default("Submit"),
  display_options: z.record(z.any()).default({}),
});

function validateWidget(payload) {
  return widgetSchema.safeParse(payload);
}

module.exports = {
  validateWidget,
};
