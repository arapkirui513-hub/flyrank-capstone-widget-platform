const test = require("node:test");
const assert = require("node:assert/strict");

const { getGeoData } = require("../src/services/geo");

test("geo uses Provider A when available", async () => {
  const originalA = process.env.GEO_PROVIDER_A_URL;
  const originalB = process.env.GEO_PROVIDER_B_URL;

  process.env.GEO_PROVIDER_A_URL = "http://provider-a.test";
  process.env.GEO_PROVIDER_B_URL = "http://provider-b.test";

  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    assert.equal(
      url,
      "http://provider-a.test/8.8.8.8?fields=country,city,status,message"
    );

    return {
      ok: true,
      async json() {
        return {
          status: "success",
          country: "Kenya",
          city: "Nairobi",
        };
      },
    };
  };

  try {
    const result = await getGeoData("8.8.8.8");

    assert.deepEqual(result, {
      country: "Kenya",
      city: "Nairobi",
      provider: "A",
    });
  } finally {
    global.fetch = originalFetch;

    if (originalA === undefined) {
      delete process.env.GEO_PROVIDER_A_URL;
    } else {
      process.env.GEO_PROVIDER_A_URL = originalA;
    }

    if (originalB === undefined) {
      delete process.env.GEO_PROVIDER_B_URL;
    } else {
      process.env.GEO_PROVIDER_B_URL = originalB;
    }
  }
});

test("geo falls back to Provider B when Provider A fails", async () => {
  const originalA = process.env.GEO_PROVIDER_A_URL;
  const originalB = process.env.GEO_PROVIDER_B_URL;

  process.env.GEO_PROVIDER_A_URL = "http://provider-a.test";
  process.env.GEO_PROVIDER_B_URL = "http://provider-b.test";

  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (url.startsWith("http://provider-a.test/")) {
      return {
        ok: false,
        status: 503,
        async json() {
          return {};
        },
      };
    }

    assert.equal(
      url,
      "http://provider-b.test/8.8.8.8/json/"
    );

    return {
      ok: true,
      async json() {
        return {
          country: "KE",
          country_name: "Kenya",
          city: "Mombasa",
        };
      },
    };
  };

  try {
    const result = await getGeoData("8.8.8.8");

    assert.deepEqual(result, {
      country: "Kenya",
      city: "Mombasa",
      provider: "B",
    });
  } finally {
    global.fetch = originalFetch;

    if (originalA === undefined) {
      delete process.env.GEO_PROVIDER_A_URL;
    } else {
      process.env.GEO_PROVIDER_A_URL = originalA;
    }

    if (originalB === undefined) {
      delete process.env.GEO_PROVIDER_B_URL;
    } else {
      process.env.GEO_PROVIDER_B_URL = originalB;
    }
  }
});

test("geo returns no geo data when both providers fail", async () => {
  const originalA = process.env.GEO_PROVIDER_A_URL;
  const originalB = process.env.GEO_PROVIDER_B_URL;

  process.env.GEO_PROVIDER_A_URL = "http://provider-a.test";
  process.env.GEO_PROVIDER_B_URL = "http://provider-b.test";

  const originalFetch = global.fetch;

  global.fetch = async () => {
    throw new Error("Provider unavailable");
  };

  try {
    const result = await getGeoData("8.8.8.8");

    assert.deepEqual(result, {
      country: null,
      city: null,
      provider: "none",
    });
  } finally {
    global.fetch = originalFetch;

    if (originalA === undefined) {
      delete process.env.GEO_PROVIDER_A_URL;
    } else {
      process.env.GEO_PROVIDER_A_URL = originalA;
    }

    if (originalB === undefined) {
      delete process.env.GEO_PROVIDER_B_URL;
    } else {
      process.env.GEO_PROVIDER_B_URL = originalB;
    }
  }
});