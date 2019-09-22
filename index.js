Date.prototype.julian = function() {
  // Start of this year (0th day)
  const start = new Date(this.getFullYear(), 0, 0);
  // without (possibly) daylight savings time
  let diff = this - start;
  // add in changes from daylight savings time if applicable
  diff += (start.getTimezoneOffset() - this.getTimezoneOffset()) * 60 * 1000;
  // divide by milliseconds per day
  return Math.floor(diff / 86400000);
};

/**
 * Return the fraction of the day that is complete
 * @param {luxon.DateTime} d a luxon DateTime of interest
 */
function dayFraction(d) {
  // convert incoming date to UTC
  d = d.toUTC();
  // get the start of this day
  const dayStart = luxon.DateTime.utc(d.year, d.month, d.day, 0, 0, 0);
  // calculate total milliseconds in a full day
  const msecInDay = 24 * 60 * 60 * 1000;
  // return the fraction of this day completed
  return d.diff(dayStart).milliseconds / msecInDay;
}

function jd(d) {
  // calculate the Julian Day
  // https://www.nrel.gov/docs/fy08osti/34302.pdf (Equation 4)
  d = d.toUTC();
  let month = d.month;
  let year = d.year;
  if (month <= 2) {
    month += 12;
    year -= 1;
  }
  const yearPart = parseInt(365.25 * (year + 4716));
  const monthPart = parseInt(30.6001 * (month + 1));
  const dayPart = d.day + dayFraction(d);
  const tzOffsetFraction = d.offset / (60 * 24);

  let jd = yearPart + monthPart + dayPart - 1524.5 - tzOffsetFraction;

  const A = parseInt(d.year / 100);
  const B = jd < 2299160 ? 0 : 2 - A + parseInt(A / 4);

  jd += B;
  return jd;
}

function deltaT(year, month, day) {
  // TODO: pull actual data from somewhere
  const ord = luxon.DateTime.utc(year, month, day).ordinal;
  const daysInYear = luxon.DateTime.utc(year, 12, 31).ordinal;
  const frac = ord / daysInYear;
  const quarter = Math.floor(frac / 0.25);
  const quarterFrac = quarter * 0.25;

  const yearLookup =
    quarterFrac > 0
      ? (year + quarterFrac).toString().padEnd(7, "0")
      : year.toString() + ".00";

  // from http://maia.usno.navy.mil/ser7/deltat.preds
  // historic at http://maia.usno.navy.mil/ser7/deltat.data
  // TAI-UTC at http://maia.usno.navy.mil/ser7/deltat.data
  // UT1-UTC at http://maia.usno.navy.mil/ser7/mark3.out
  // explanation at: http://maia.usno.navy.mil/
  // further data at: http://maia.usno.navy.mil/ser7/ser7.dat

  const results = {
    first: { year: "2019.00", data: 69.34 },
    "2019.00": 69.34,
    "2019.25": 69.48,
    "2019.50": 69.62,
    "2019.75": 69.71,
    "2020.00": 69.87,
    "2020.25": 70.03,
    "2020.50": 70.16,
    "2020.75": 70.24,
    "2021.00": 70.39,
    "2021.25": 70.55,
    "2021.50": 70.68,
    "2021.75": 70.76,
    "2022.00": 70.91,
    "2022.25": 71.06,
    "2022.50": 71.18,
    "2022.75": 71.25,
    "2023.00": 71.4,
    "2023.25": 71.54,
    "2023.50": 71.67,
    "2023.75": 71.74,
    "2024.00": 71.88,
    "2024.25": 72.03,
    "2024.50": 72.15,
    "2024.75": 72.22,
    "2025.00": 72.36,
    "2025.25": 72.5,
    "2025.50": 72.62,
    "2025.75": 72.69,
    "2026.00": 72.83,
    "2026.25": 72.98,
    "2026.50": 73.1,
    "2026.75": 73.17,
    "2027.00": 73.32,
    "2027.25": 73.46,
    "2027.50": 73.58,
    "2027.75": 73.66,
    last: { year: "2027.75", data: 73.66 }
  };

  if (yearLookup < results.first.year) {
    return results.first.data;
  } else if (yearLookup > results.last.year) {
    return results.last.data;
  }

  return results[yearLookup];
}

function jde(d) {
  // https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 5
  const jdate = jd(d);
  const dt = deltaT(d.year, d.month, d.day);
  return jdate + dt / 86400;
}

function julianCentury(d) {
  // https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 6
  return (jd(d) - 2451545) / 35625;
}

function julianEphemerisCentury(d) {
  // https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 7
  return (jde(d) - 2451545) / 36525;
}

function julianEphemerisMillennium(d) {
  return julianEphemerisCentury(d) / 10;
}

const earthConstants = {
  L: {
    0: [
      [0, 175347046, 0, 0],
      [1, 3341656, 4.6692568, 6283.07585],
      [2, 34894, 4.6261, 12566.1517],
      [3, 3497, 2.7441, 5753.3849],
      [4, 3418, 2.8289, 3.5231],
      [5, 3136, 3.6277, 77713.7715],
      [6, 2676, 4.4181, 7860.4194],
      [7, 2343, 6.1352, 3930.2097],
      [8, 1324, 0.7425, 11506.7698],
      [9, 1273, 2.0371, 529.691],
      [10, 1199, 1.1096, 1577.3435],
      [11, 990, 5.233, 5884.927],
      [12, 902, 2.045, 26.298],
      [13, 857, 3.508, 398.149],
      [14, 780, 1.179, 5223.694],
      [15, 753, 2.533, 5507.553],
      [16, 505, 4.583, 18849.228],
      [17, 492, 4.205, 775.523],
      [18, 357, 2.92, 0.067],
      [19, 317, 5.849, 11790.629],
      [20, 284, 1.899, 796.298],
      [21, 271, 0.315, 10977.079],
      [22, 243, 0.345, 5486.778],
      [23, 206, 4.806, 2544.314],
      [24, 205, 1.869, 5573.143],
      [25, 202, 2.458, 6069.777],
      [26, 156, 0.833, 213.299],
      [27, 132, 3.411, 2942.463],
      [28, 126, 1.083, 20.775],
      [29, 115, 0.645, 0.98],
      [30, 103, 0.636, 4694.003],
      [31, 102, 0.976, 15720.839],
      [32, 102, 4.267, 7.114],
      [33, 99, 6.21, 2146.17],
      [34, 98, 0.68, 155.42],
      [35, 86, 5.98, 161000.69],
      [36, 85, 1.3, 6275.96],
      [37, 85, 3.67, 71430.7],
      [38, 80, 1.81, 17260.15],
      [39, 79, 3.04, 12036.46],
      [40, 75, 1.76, 5088.63],
      [41, 74, 3.5, 3154.69],
      [42, 74, 4.68, 801.82],
      [43, 70, 0.83, 9437.76],
      [44, 62, 3.98, 8827.39],
      [45, 61, 1.82, 7084.9],
      [46, 57, 2.78, 6286.6],
      [47, 56, 4.39, 14143.5],
      [48, 56, 3.47, 6279.55],
      [49, 52, 0.19, 12139.55],
      [50, 52, 1.33, 1748.02],
      [51, 51, 0.28, 5856.48],
      [52, 49, 0.49, 1194.45],
      [53, 41, 5.37, 8429.24],
      [54, 41, 2.4, 19651.05],
      [55, 39, 6.17, 10447.39],
      [56, 37, 6.04, 10213.29],
      [57, 37, 2.57, 1059.38],
      [58, 36, 1.71, 2352.87],
      [59, 36, 1.78, 6812.77],
      [60, 33, 0.59, 17789.85],
      [61, 30, 0.44, 83996.85],
      [62, 30, 2.74, 1349.87],
      [63, 25, 3.16, 4690.48]
    ],
    1: [
      [0, 628331966747, 0, 0],
      [1, 206059, 2.678235, 6283.07585],
      [2, 4303, 2.6351, 12566.1517],
      [3, 425, 1.59, 3.523],
      [4, 119, 5.796, 26.298],
      [5, 109, 2.966, 1577.344],
      [6, 93, 2.59, 18849.23],
      [7, 72, 1.14, 529.69],
      [8, 68, 1.87, 398.15],
      [9, 67, 4.41, 5507.55],
      [10, 59, 2.89, 5223.69],
      [11, 56, 2.17, 155.42],
      [12, 45, 0.4, 796.3],
      [13, 36, 0.47, 775.52],
      [14, 29, 2.65, 7.11],
      [15, 21, 5.34, 0.98],
      [16, 19, 1.85, 5486.78],
      [17, 19, 4.97, 213.3],
      [18, 17, 2.99, 6275.96],
      [19, 16, 0.03, 2544.31],
      [20, 16, 1.43, 2146.17],
      [21, 15, 1.21, 10977.08],
      [22, 12, 2.83, 1748.02],
      [23, 12, 3.26, 5088.63],
      [24, 12, 5.27, 1194.45],
      [25, 12, 2.08, 4694],
      [26, 11, 0.77, 553.57],
      [27, 10, 1.3, 6286.6],
      [28, 10, 4.24, 1349.87],
      [29, 9, 2.7, 242.73],
      [30, 9, 5.64, 951.72],
      [31, 8, 5.3, 2352.87],
      [32, 6, 2.65, 9437.76],
      [33, 6, 4.67, 4690.48]
    ],
    2: [
      [0, 52919, 0, 0],
      [1, 8720, 1.0721, 6283.0758],
      [2, 309, 0.867, 12566.152],
      [3, 27, 0.05, 3.52],
      [4, 16, 5.19, 26.3],
      [5, 16, 3.68, 155.42],
      [6, 10, 0.76, 18849.23],
      [7, 9, 2.06, 77713.77],
      [8, 7, 0.83, 775.52],
      [9, 5, 4.66, 1577.34],
      [10, 4, 1.03, 7.11],
      [11, 4, 3.44, 5573.14],
      [12, 3, 5.14, 796.3],
      [13, 3, 6.05, 5507.55],
      [14, 3, 1.19, 242.73],
      [15, 3, 6.12, 529.69],
      [16, 3, 0.31, 398.15],
      [17, 3, 2.28, 553.57],
      [18, 2, 4.38, 5223.69],
      [19, 2, 3.75, 0.98]
    ],
    3: [
      [0, 289, 5.844, 6283.076],
      [1, 35, 0, 0],
      [2, 17, 5.49, 12566.15],
      [3, 3, 5.2, 155.42],
      [4, 1, 4.72, 3.52],
      [5, 1, 5.3, 18849.23],
      [6, 1, 5.97, 242.73]
    ],
    4: [[0, 114, 3.142, 0], [1, 8, 4.13, 6283.08], [2, 1, 3.84, 12566.15]],
    5: [[0, 1, 3.14, 0]]
  },
  B: {
    0: [
      [0, 280, 3.199, 84334.662],
      [1, 102, 5.422, 5507.553],
      [2, 80, 3.88, 5223.69],
      [3, 44, 3.7, 2352.87],
      [4, 32, 4, 1577.34]
    ],
    1: [[0, 9, 3.9, 5507.55], [1, 6, 1.73, 5223.69]]
  },
  R: {
    0: [
      [0, 100013989, 0, 0],
      [1, 1670700, 3.0984635, 6283.07585],
      [2, 13956, 3.05525, 12566.1517],
      [3, 3084, 5.1985, 77713.7715],
      [4, 1628, 1.1739, 5753.3849],
      [5, 1576, 2.8469, 7860.4194],
      [6, 925, 5.453, 11506.77],
      [7, 542, 4.564, 3930.21],
      [8, 472, 3.661, 5884.927],
      [9, 346, 0.964, 5507.553],
      [10, 329, 5.9, 5223.694],
      [11, 307, 0.299, 5573.143],
      [12, 243, 4.273, 11790.629],
      [13, 212, 5.847, 1577.344],
      [14, 186, 5.022, 10977.079],
      [15, 175, 3.012, 18849.228],
      [16, 110, 5.055, 5486.778],
      [17, 98, 0.89, 6069.78],
      [18, 86, 5.69, 15720.84],
      [19, 86, 1.27, 161000.69],
      [20, 65, 0.27, 17260.15],
      [21, 63, 0.92, 529.69],
      [22, 57, 2.01, 83996.85],
      [23, 56, 5.24, 71430.7],
      [24, 49, 3.25, 2544.31],
      [25, 47, 2.58, 775.52],
      [26, 45, 5.54, 9437.76],
      [27, 43, 6.01, 6275.96],
      [28, 39, 5.36, 4694],
      [29, 38, 2.39, 8827.39],
      [30, 37, 0.83, 19651.05],
      [31, 37, 4.9, 12139.55],
      [32, 36, 1.67, 12036.46],
      [33, 35, 1.84, 2942.46],
      [34, 33, 0.24, 7084.9],
      [35, 32, 0.18, 5088.63],
      [36, 32, 1.78, 398.15],
      [37, 28, 1.21, 6286.6],
      [38, 28, 1.9, 6279.55],
      [39, 26, 4.59, 10447.39]
    ],
    1: [
      [0, 103019, 1.10749, 6283.07585],
      [1, 1721, 1.0644, 12566.1517],
      [2, 702, 3.142, 0],
      [3, 32, 1.02, 18849.23],
      [4, 31, 2.84, 5507.55],
      [5, 25, 1.32, 5223.69],
      [6, 18, 1.42, 1577.34],
      [7, 10, 5.91, 10977.08],
      [8, 9, 1.42, 6275.96],
      [9, 9, 0.27, 5486.78]
    ],
    2: [
      [0, 4359, 5.7846, 6283.0758],
      [1, 124, 5.579, 12566.152],
      [2, 12, 3.14, 0],
      [3, 9, 3.63, 77713.77],
      [4, 6, 1.87, 5573.14],
      [5, 3, 5.47, 18849.23]
    ],
    3: [[0, 145, 4.273, 6283.076], [1, 7, 3.92, 12566.15]],
    4: [[0, 4, 2.56, 6283.08]]
  }
};

function heliocentricLongitude(date) {
  //https://www.nrel.gov/docs/fy08osti/34302.pdf Steps 3.2.1-3.2.6

  return limit_degrees(
    rad2deg(earth_values(earth_periodic_term_summation("L", date), date))
  );
}

function earthRadiusVector(date) {
  //https://www.nrel.gov/docs/fy08osti/34302.pdf Equations 9-12
  return earth_values(earth_periodic_term_summation("R", date), date);
}

function heliocentricLatitude(date) {
  //https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.2.7
  return rad2deg(earth_values(earth_periodic_term_summation("B", date), date));
}

/**
 * Convert radians to degrees (not limited to a range)
 * @param rad
 * @returns {number}
 */
function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Limit degrees to 0 <= result <= 360
 * @param degrees
 * @returns {number}
 */
function limit_degrees(degrees) {
  degrees /= 360;
  const limited = 360.0 * (degrees - Math.floor(degrees));
  return limited < 0 ? limited + 360 : limited;
}

/**
 * Calculate the heliocentric parameter described in
 * https://www.nrel.gov/docs/fy08osti/34302.pdf
 * Equation 11
 * @param row_sums sum of each row from table A4.2
 * @param date
 * @returns {number}
 */
function earth_values(row_sums, date) {
  const jme = julianEphemerisMillennium(date);
  const reducer = (acc, cur, idx) => acc + cur * jme ** idx;
  return row_sums.reduce(reducer, 0) / 1e8;
}

function earth_periodic_term_summation(term_type, date) {
  const jme = julianEphemerisMillennium(date);
  const reducer = (acc, row) => acc + row[1] * Math.cos(row[2] + row[3] * jme);
  const term_obj = earthConstants[term_type];
  return Object.keys(term_obj).map(key => term_obj[key].reduce(reducer, 0));
}
