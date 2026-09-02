const DEFAULT_PROVIDER_A_URL = "http://ip-api.com/json";
const DEFAULT_PROVIDER_B_URL = "https://ipapi.co";

function getProviderUrl(name, fallback) {
  return process.env[name] || fallback;
}

async function getGeoData(ipAddress) {
  // Gracefully handle localhost testing.
  if (
    !ipAddress ||
    ipAddress === "::1" ||
    ipAddress === "127.0.0.1" ||
    ipAddress === "::ffff:127.0.0.1"
  ) {
    return {
      country: "Localhost",
      city: "Test City",
      provider: "mock",
    };
  }

  const providerAUrl = getProviderUrl(
    "GEO_PROVIDER_A_URL",
    DEFAULT_PROVIDER_A_URL
  );

  try {
    const responseA = await fetch(
      `${providerAUrl}/${ipAddress}?fields=country,city,status,message`
    );

    if (!responseA.ok) {
      throw new Error(`Provider A returned HTTP ${responseA.status}`);
    }

    const dataA = await responseA.json();

    if (dataA.status === "success") {
      return {
        country: dataA.country,
        city: dataA.city,
        provider: "A",
      };
    }

    throw new Error(dataA.message || "Provider A returned no geo data");
  } catch (err) {
    console.warn(
      "Geo Provider A failed, trying Provider B:",
      err.message
    );
  }

  const providerBUrl = getProviderUrl(
    "GEO_PROVIDER_B_URL",
    DEFAULT_PROVIDER_B_URL
  );

  try {
    const responseB = await fetch(`${providerBUrl}/${ipAddress}/json/`);

    if (!responseB.ok) {
      throw new Error(`Provider B returned HTTP ${responseB.status}`);
    }

    const dataB = await responseB.json();

    if (dataB.country && dataB.city) {
      return {
        country: dataB.country_name || dataB.country,
        city: dataB.city,
        provider: "B",
      };
    }

    throw new Error("Provider B returned no geo data");
  } catch (err) {
    console.warn(
      "Geo Provider B failed, continuing without geo data:",
      err.message
    );
  }

  return {
    country: null,
    city: null,
    provider: "none",
  };
}

module.exports = { getGeoData };