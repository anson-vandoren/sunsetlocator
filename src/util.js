import { DateTime } from "luxon";

function setInputDate(id, date) {
  const el = document.getElementById(id);
  if (el) {
    el.value = date.toFormat("yyyy-MM-dd");
  } else {
    console.log("el does not exist:", el, document.getElementById("dt"));
  }
}

function getInputDate(elId, timezone) {
  const el = document.getElementById(elId);
  if (el) {
    const raw = el.value;
    return DateTime.fromFormat(raw, "yyyy-MM-dd", { zone: timezone });
  }
}

/**
 * Limit degrees to 0 <= result <= 360
 * @param {Degrees} degrees Unlimited degrees
 * @param {Degrees} [limit=360] Highest permissible value
 * @returns {Degrees} Limited degrees
 */
function limit_degrees(degrees, limit = 360) {
  degrees /= limit;
  const limited = limit * (degrees - Math.floor(degrees));
  return limited < 0 ? limited + limit : limited;
}

function limit_degrees180pm(degrees) {
  degrees /= 360;
  let limited = 360 * (degrees - Math.floor(degrees));
  if (limited < -180) {
    limited += 360;
  } else if (limited > 180) {
    limited -= 360;
  }
  return limited;
}

export { getInputDate, setInputDate, limit_degrees, limit_degrees180pm };
