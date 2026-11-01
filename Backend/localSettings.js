const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { isIP } = require("node:net");

const settingsPath = process.env.IPOS_SETTINGS_PATH || path.join(os.homedir(), ".ipos", "settings.json");

function validateHost(value) {
  if (typeof value !== "string") throw new Error("Enter a database hostname or IP address.");
  const host = value.trim();
  const domain = host.length <= 253 && host.split(".").every(label =>
    label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
  if (!host || (!isIP(host) && (!domain || /^[\d.]+$/.test(host)))) {
    throw new Error("Enter a valid hostname or IP address, without a protocol or port.");
  }
  return host;
}

function readSettings() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return { dbHost: validateHost(settings.dbHost) };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Could not read local settings; using localhost:", error.message);
    return { dbHost: "localhost" };
  }
}

function saveSettings(settings) {
  const value = { dbHost: validateHost(settings.dbHost) };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const temporary = `${settingsPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temporary, settingsPath);
  return value;
}

module.exports = { readSettings, saveSettings, validateHost };
