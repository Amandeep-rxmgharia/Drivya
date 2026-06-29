export function parseUserAgent(uaString) {
  if (!uaString) {
    return {
      device: "Unknown Device",
      browser: "Unknown Browser",
      os: "Unknown OS",
    };
  }

  let os = "Unknown OS";
  let device = "Desktop";
  let browser = "Unknown Browser";

  // OS Detection
  if (/windows/i.test(uaString)) {
    os = "Windows";
    device = "Windows Desktop";
  } else if (/iphone|ipad|ipod/i.test(uaString)) {
    os = "iOS";
    device = /ipad/i.test(uaString) ? "iPad" : "iPhone";
  } else if (/macintosh|mac os x/i.test(uaString)) {
    os = "macOS";
    device = "MacBook Pro";
  } else if (/android/i.test(uaString)) {
    os = "Android";
    device = "Android Phone";
  } else if (/linux/i.test(uaString)) {
    os = "Linux";
    device = "Linux Desktop";
  }

  // OS refinement
  const macOSVersionMatch = uaString.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
  if (macOSVersionMatch) {
    const versionStr = macOSVersionMatch[1].replace(/_/g, ".");
    os = `macOS ${versionStr}`;
  }

  const winVersionMatch = uaString.match(/Windows NT (\d+\.\d+)/);
  if (winVersionMatch) {
    const ntVersion = winVersionMatch[1];
    if (ntVersion === "10.0") {
      os = "Windows 11"; // Standard fallback/refinement
    } else if (ntVersion === "6.3") {
      os = "Windows 8.1";
    } else if (ntVersion === "6.2") {
      os = "Windows 8";
    } else if (ntVersion === "6.1") {
      os = "Windows 7";
    } else {
      os = `Windows NT ${ntVersion}`;
    }
  }

  const iosVersionMatch = uaString.match(/OS (\d+[._]\d+[._]?\d*) like Mac OS X/);
  if (iosVersionMatch) {
    os = `iOS ${iosVersionMatch[1].replace(/_/g, ".")}`;
  }

  const androidVersionMatch = uaString.match(/Android (\d+[._]\d+[._]?\d*)/);
  if (androidVersionMatch) {
    os = `Android ${androidVersionMatch[1]}`;
  }

  // Browser Detection
  if (/opr\/|opera/i.test(uaString)) {
    browser = "Opera";
    const match = uaString.match(/(?:opr|opera)\/(\d+)/i);
    if (match) browser += ` ${match[1]}`;
  } else if (/edg\/|edge/i.test(uaString)) {
    browser = "Edge";
    const match = uaString.match(/(?:edg|edge)\/(\d+)/i);
    if (match) browser += ` ${match[1]}`;
  } else if (/firefox|fxios/i.test(uaString)) {
    browser = "Firefox";
    const match = uaString.match(/(?:firefox|fxios)\/(\d+)/i);
    if (match) browser += ` ${match[1]}`;
  } else if (/chrome|crios/i.test(uaString)) {
    browser = "Chrome";
    const match = uaString.match(/(?:chrome|crios)\/(\d+)/i);
    if (match) browser += ` ${match[1]}`;
  } else if (/safari/i.test(uaString) && !/chrome|crios|android/i.test(uaString)) {
    browser = "Safari";
    const match = uaString.match(/version\/(\d+)/i);
    if (match) browser += ` ${match[1]}`;
  } else if (/drivya/i.test(uaString)) {
    browser = "Drivya App";
  }

  // Device refinement based on OS
  if (os.startsWith("macOS") && device === "Desktop") {
    device = "MacBook Pro";
  } else if (os.startsWith("Windows") && device === "Desktop") {
    device = "Windows Desktop";
  }

  return { device, browser, os };
}

export function parseIpAndLocation(req) {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
    return {
      ip: "127.0.0.1",
      location: "Localhost",
    };
  }

  // Check headers for cloudflare/load-balancer provided geo data
  const country = req.headers["cf-ipcountry"] || req.headers["x-country-code"];
  const city = req.headers["cf-ipcity"] || req.headers["x-city"];
  if (country) {
    return {
      ip,
      location: city ? `${city}, ${country}` : country,
    };
  }

  return {
    ip,
    location: "New Delhi, IN", // Standard beautiful default locale
  };
}
