const express = require("express");

const pool = require("../db/pool");

const router = express.Router();

const WIDGET_CACHE_SECONDS = 300;

function setWidgetCacheHeaders(res) {
  res.set(
    "Cache-Control",
    `public, max-age=${WIDGET_CACHE_SECONDS}, s-maxage=${WIDGET_CACHE_SECONDS}`
  );
}

router.get("/widget.js", (req, res) => {
  const version = req.query.v || "1";

  res.set("Content-Type", "application/javascript; charset=utf-8");
  res.set(
    "Cache-Control",
    `public, max-age=${WIDGET_CACHE_SECONDS}, s-maxage=${WIDGET_CACHE_SECONDS}`
  );
  res.set("X-Widget-Version", version);

  const script = `
(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const widgetId = script.dataset.widgetId || new URL(script.src).searchParams.get("id");

  if (!widgetId) {
    console.error("Widget ID is required.");
    return;
  }

  const apiBase = new URL(script.src).origin;

  fetch(apiBase + "/api/widget-config/" + encodeURIComponent(widgetId))
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load widget configuration.");
      }

      return response.json();
    })
    .then(function (config) {
      renderWidget(config.widget);
    })
    .catch(function (error) {
      console.error("Widget loading failed:", error);
    });

  function renderWidget(widget) {
    const container = document.createElement("div");
    container.className = "flyrank-widget";
    container.setAttribute("data-widget-id", widget.id);

    const title = document.createElement("h3");
    title.textContent = widget.title;
    container.appendChild(title);

    if (widget.description) {
      const description = document.createElement("p");
      description.textContent = widget.description;
      container.appendChild(description);
    }

    const form = document.createElement("form");

    (widget.fields || []).forEach(function (field) {
      const wrapper = document.createElement("div");

      const label = document.createElement("label");
      label.textContent = field.label;
      label.setAttribute("for", "widget-" + field.name);

      const input =
        field.type === "textarea"
          ? document.createElement("textarea")
          : document.createElement("input");

      input.name = field.name;
      input.id = "widget-" + field.name;

      if (field.type !== "textarea") {
        input.type = field.type;
      }

      input.placeholder = field.placeholder || "";
      input.required = Boolean(field.required);

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      form.appendChild(wrapper);
    });

    const website = document.createElement("input");
    website.type = "text";
    website.name = "website";
    website.tabIndex = -1;
    website.autocomplete = "off";
    website.style.position = "absolute";
    website.style.left = "-9999px";

    form.appendChild(website);

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = widget.button_text || "Submit";

    form.appendChild(button);

    const status = document.createElement("div");
    status.setAttribute("role", "status");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const data = {};

      new FormData(form).forEach(function (value, key) {
        if (key !== "website") {
          data[key] = value;
        }
      });

      status.textContent = "Submitting...";

      fetch(apiBase + "/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          widget_id: widget.id,
          data: data,
          website: website.value
        })
      })
        .then(function (response) {
          return response.json().then(function (body) {
            return {
              ok: response.ok,
              body: body
            };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            throw new Error(
              result.body.message ||
              result.body.error ||
              "Submission failed."
            );
          }

          status.textContent = "Thanks. Your submission was received.";
          form.reset();
        })
        .catch(function (error) {
          status.textContent = error.message;
        });
    });

    container.appendChild(form);
    container.appendChild(status);

    if (script.parentNode) {
      script.parentNode.insertBefore(
        container,
        script.nextSibling
      );
    }
  }
})();
`;

  res.send(script);
});

router.get("/api/widget-config/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         type,
         title,
         description,
         fields,
         button_text,
         display_options,
         version
       FROM widgets
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "widget_not_found",
      });
    }

    setWidgetCacheHeaders(res);

    return res.status(200).json({
      widget: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
