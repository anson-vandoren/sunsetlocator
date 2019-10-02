/**
 * An angle expressed in degrees
 * @typedef {number} Degrees
 */

/**
 * An angle expressed in radians
 * @typedef {number} Radians
 */

/**
 * An angle expressed in arc seconds
 * @typedef {number} ArcSeconds
 */

/**
 * A distance measured in meters
 * @typedef {number} Meters
 */

/**
 * A distance measured in Astronomical Units (AU)
 * @typedef {number} AstronomicalUnits
 */

/**
 * A pressure measured in millibars
 * @typedef {number} Millibar
 */

/**
 * A temperature measured in degrees Celsius
 * @typedef {number} Celsius
 */

const FLATTENING = 1 / 298.257223563;
/**
 * Atmospheric refraction typical value at sunrise and sunset
 * @type {Degrees}
 */
const REFRACTION_AT_SUNSET = 0.5667;

/**
 * Radius of the sun (degrees)
 * @type {Degrees}
 */
const SUN_RADIUS = 0.26667;

/**
 * A time measured in minutes
 * @typedef {number} Minutes
 */

/**
 * Convert an angle in radians to degrees
 * @param {Radians} rad
 * @returns {Degrees}
 */
function rad2deg(rad) {
  return (rad * 180.0) / Math.PI;
}

/**
 * Convert astronomical units (AU) to meters
 * @param {AstronomicalUnits} au
 * @returns {Meters}
 */
function au2meters(au) {
  return au * 149597870691;
}

/**
 * Converts an angle in degrees to radians
 * @param {Degrees} deg
 * @returns {Radians}
 */
function deg2rad(deg) {
  return (Math.PI * deg) / 180.0;
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

/**
 * Helper function to sum values in an array
 * @param {[number]} arr Array of numbers to sum
 * @returns {number} Sum of elements in the array
 */
function sum(arr) {
  return arr.reduce((acc, cur) => acc + cur, 0);
}

/**
 * Return the fraction of the day that is complete
 * @param {luxon.DateTime} date a luxon DateTime of interest
 * @return {number} Fractional part of day complete
 */
function dayFraction(date) {
  // convert incoming date to UTC
  date = date.toUTC();
  // get the start of this day
  const dayStart = luxon.DateTime.utc(date.year, date.month, date.day, 0, 0, 0);
  // calculate total milliseconds in a full day
  const msecInDay = 24 * 60 * 60 * 1000;
  // return the fraction of this day completed
  return date.diff(dayStart).milliseconds / msecInDay;
}

/**
 * Calculate the Julian Day from a calendar date
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 4
 * @param {luxon.DateTime} date DateTime in question
 * @param {number} [delta_ut1] DUT1 = UT(1) - UTC
 * @returns {number} Julian Day
 */
function julianDay(date, delta_ut1 = 0) {
  date = date.toUTC();
  if (delta_ut1) {
    date.seconds += delta_ut1;
  }

  // Shift Jan/Feb to previous years for easier counting
  let month = date.month;
  let year = date.year;
  if (month <= 2) {
    month += 12;
    year -= 1;
  }
  const yearPart = Math.trunc(365.25 * (year + 4716));
  const monthPart = Math.trunc(30.6001 * (month + 1));
  const dayPart = date.day + dayFraction(date);
  const tzOffsetFraction = date.offset / (60 * 24);

  let jd = yearPart + monthPart + dayPart - 1524.5 - tzOffsetFraction;

  const A = Math.trunc(date.year / 100);
  const B = jd < 2299160 ? 0 : 2 - A + Math.trunc(A / 4);

  jd += B;
  return jd;
}

/**
 * Get the ∆T (TT-UT) for a given day
 * @param {luxon.DateTime} date Day in question
 * @returns {number|*}
 */
function deltaT(date) {
  const year = date.year;
  // TODO: pull actual data from somewhere
  const ord = date.ordinal;
  const daysInYear = luxon.DateTime.utc(date.year, 12, 31).ordinal;
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
    first: { year: "1973.25", data: 43.6737 },
    "1973.25": 43.6737,
    "1973.50": 43.9562,
    "1973.75": 44.1982,
    "1974.00": 44.4841,
    "1974.25": 44.7386,
    "1974.50": 44.9986,
    "1974.75": 45.2064,
    "1975.00": 45.4761,
    "1975.25": 45.7375,
    "1975.50": 45.982,
    "1975.75": 46.1825,
    "1976.00": 46.4567,
    "1976.25": 46.7302,
    "1976.50": 46.997,
    "1976.75": 47.2362,
    "1977.00": 47.5214,
    "1977.25": 47.7781,
    "1977.50": 48.0348,
    "1977.75": 48.246,
    "1978.00": 48.5344,
    "1978.25": 48.8365,
    "1978.50": 49.1013,
    "1978.75": 49.307,
    "1979.00": 49.5861,
    "1979.25": 49.8556,
    "1979.50": 50.1019,
    "1979.75": 50.2968,
    "1980.00": 50.5387,
    "1980.25": 50.7658,
    "1980.50": 50.9761,
    "1980.75": 51.1538,
    "1981.00": 51.3808,
    "1981.25": 51.5985,
    "1981.50": 51.8133,
    "1981.75": 51.9603,
    "1982.00": 52.1668,
    "1982.25": 52.368,
    "1982.50": 52.5751,
    "1982.75": 52.734,
    "1983.00": 52.9565,
    "1983.25": 53.2197,
    "1983.50": 53.4335,
    "1983.75": 53.5845,
    "1984.00": 53.7882,
    "1984.25": 53.9443,
    "1984.50": 54.0856,
    "1984.75": 54.1914,
    "1985.00": 54.3427,
    "1985.25": 54.4898,
    "1985.50": 54.6355,
    "1985.75": 54.7174,
    "1986.00": 54.8712,
    "1986.25": 54.9997,
    "1986.50": 55.1132,
    "1986.75": 55.1898,
    "1987.00": 55.3222,
    "1987.25": 55.4629,
    "1987.50": 55.5812,
    "1987.75": 55.6656,
    "1988.00": 55.8197,
    "1988.25": 55.9663,
    "1988.50": 56.0939,
    "1988.75": 56.1611,
    "1989.00": 56.3,
    "1989.25": 56.4283,
    "1989.50": 56.5697,
    "1989.75": 56.6739,
    "1990.00": 56.8553,
    "1990.25": 57.0471,
    "1990.50": 57.2226,
    "1990.75": 57.3643,
    "1991.00": 57.5653,
    "1991.25": 57.7711,
    "1991.50": 57.9576,
    "1991.75": 58.1043,
    "1992.00": 58.3092,
    "1992.25": 58.5401,
    "1992.50": 58.741,
    "1992.75": 58.8986,
    "1993.00": 59.1218,
    "1993.25": 59.3574,
    "1993.50": 59.585,
    "1993.75": 59.7588,
    "1994.00": 59.9845,
    "1994.25": 60.2042,
    "1994.50": 60.4012,
    "1994.75": 60.5578,
    "1995.00": 60.7853,
    "1995.25": 61.0277,
    "1995.50": 61.2454,
    "1995.75": 61.4036,
    "1996.00": 61.6287,
    "1996.25": 61.8132,
    "1996.50": 61.9969,
    "1996.75": 62.1202,
    "1997.00": 62.295,
    "1997.25": 62.4754,
    "1997.50": 62.6571,
    "1997.75": 62.7926,
    "1998.00": 62.9659,
    "1998.25": 63.1462,
    "1998.50": 63.2844,
    "1998.75": 63.3422,
    "1999.00": 63.4673,
    "1999.25": 63.5679,
    "1999.50": 63.6642,
    "1999.75": 63.7147,
    "2000.00": 63.8285,
    "2000.25": 63.9075,
    "2000.50": 63.9799,
    "2000.75": 64.0093,
    "2001.00": 64.0908,
    "2001.25": 64.1584,
    "2001.50": 64.2117,
    "2001.75": 64.2223,
    "2002.00": 64.2998,
    "2002.25": 64.3735,
    "2002.50": 64.4132,
    "2002.75": 64.4168,
    "2003.00": 64.4734,
    "2003.25": 64.5269,
    "2003.50": 64.5512,
    "2003.75": 64.5415,
    "2004.00": 64.5736,
    "2004.25": 64.6176,
    "2004.50": 64.653,
    "2004.75": 64.64,
    "2005.00": 64.6876,
    "2005.25": 64.7575,
    "2005.50": 64.7995,
    "2005.75": 64.7921,
    "2006.00": 64.8452,
    "2006.25": 64.9175,
    "2006.50": 64.9895,
    "2006.75": 65.0371,
    "2007.00": 65.1464,
    "2007.25": 65.2494,
    "2007.50": 65.3413,
    "2007.75": 65.3711,
    "2008.00": 65.4573,
    "2008.25": 65.545,
    "2008.50": 65.6287,
    "2008.75": 65.676,
    "2009.00": 65.7768,
    "2009.25": 65.8595,
    "2009.50": 65.9509,
    "2009.75": 65.9839,
    "2010.00": 66.0699,
    "2010.25": 66.1683,
    "2010.50": 66.2409,
    "2010.75": 66.2441,
    "2011.00": 66.3246,
    "2011.25": 66.3957,
    "2011.50": 66.4749,
    "2011.75": 66.5056,
    "2012.00": 66.603,
    "2012.25": 66.6925,
    "2012.50": 66.7708,
    "2012.75": 66.8103,
    "2013.00": 66.9069,
    "2013.25": 67.0258,
    "2013.50": 67.1266,
    "2013.75": 67.1717,
    "2014.00": 67.281,
    "2014.25": 67.389,
    "2014.50": 67.4858,
    "2014.75": 67.5353,
    "2015.00": 67.6439,
    "2015.25": 67.7591,
    "2015.50": 67.8606,
    "2015.75": 67.9546,
    "2016.00": 68.1024,
    "2016.25": 68.2664,
    "2016.50": 68.3964,
    "2016.75": 68.463,
    "2017.00": 68.5927,
    "2017.25": 68.7135,
    "2017.50": 68.8245,
    "2017.75": 68.8689,
    "2018.00": 68.9676,
    "2018.25": 69.0499,
    "2018.50": 69.1134,
    "2018.75": 69.1356,
    "2019.00": 69.2202,
    "2019.25": 69.3032,
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

/**
 * Calculate the Julian Ephemeris Day
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 5
 * @param {number} jd Julian Day
 * @param {number} delta_t ∆T (TT-UT)
 * @returns {number} Julian Ephemeris Day
 */
function julianEphemerisDay(jd, delta_t) {
  return jd + delta_t / 86400;
}

/**
 * Calculate the Julian Century
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 6
 * @param {number} jd Julian Day
 * @returns {number} Julian Century
 */
function julianCentury(jd) {
  return (jd - 2451545) / 35625;
}

/**
 * Calculate Julian Ephemeris Century
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 7
 * @param {number} jde Julian Ephemeris Day
 * @returns {number} Julian Ephemeris Century
 */
function julianEphemerisCentury(jde) {
  return (jde - 2451545) / 36525;
}

/**
 * Calculate Julian Ephemeris Millenium
 * @param {number} jce Julian Ephemeris Century
 * @returns {number} Julian Ephemeris Millenium
 */
function julianEphemerisMillennium(jce) {
  return jce / 10;
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

/**
 * Calculate Earth heliocentric longitude (L)
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Steps 3.2.1-3.2.6
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {Degrees} Earth heliocentric longitude
 */
function heliocentricLongitude(jme) {
  let long_rad = earth_values(earth_periodic_term_summation("L", jme), jme);
  return limit_degrees(rad2deg(long_rad));
}

/**
 * Calculate the heliocentric latitude for a given date
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.2.7
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {Degrees} Earth heliocentric latitude
 */
function heliocentricLatitude(jme) {
  let lat_rad = earth_values(earth_periodic_term_summation("B", jme), jme);
  return rad2deg(lat_rad);
}

/**
 * Calculate Earth radius vector
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equations 9-12
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {AstronomicalUnits} Earth radius vector
 */
function earthRadiusVector(jme) {
  return earth_values(earth_periodic_term_summation("R", jme), jme);
}

/**
 * Calculate the heliocentric parameter described in
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 11
 * @param {number[]} row_sums Sum of each row from table A4.2
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {number} Heliocentric parameter described by `row_sums`
 */
function earth_values(row_sums, jme) {
  const reducer = (acc, cur, idx) => acc + cur * jme ** idx;
  return row_sums.reduce(reducer, 0) / 1e8;
}

/**
 * Perform row summation of earth periodic terms given by `term_type`
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equations 9-10
 * @param {string} term_type L, R, or B
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {number[]} Array of summed rows from Table A4.2
 */
function earth_periodic_term_summation(term_type, jme) {
  const reducer = (acc, row) => acc + row[1] * Math.cos(row[2] + row[3] * jme);
  const term_obj = earthConstants[term_type];
  return Object.keys(term_obj).map(key => term_obj[key].reduce(reducer, 0));
}

/**
 * Geocentric longitude of the sun Theta
 * "Geocentric" == sun position calculated with respect to Earth's center
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Eqn. 13
 * @param {Degrees} L Heliocentric longitude of the earth
 * @returns {Degrees} Geocentric longitude of the sun
 */
function geocentricLongitude(L) {
  return limit_degrees(L + 180);
}

/**
 * Geocentric latitude of the sun
 * "Geocentric" == sun position calculated with respect to Earth's center
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Eqn. 14
 * @param {Degrees} B Heliocentric latitude of the earth
 * @returns {Degrees} Geocentric latitude of the sun
 */
function geocentricLatitude(B) {
  return -B;
}

const nutationXCoefficients = {
  // from https://www.nrel.gov/docs/fy08osti/34302.pdf Eqns. 15-19
  // 0: mean elongation of the moon from the sun (degrees)
  // 1: mean anomaly of the sun (Earth) (degrees)
  // 2: mean anomaly of the moon (degrees)
  // 3: moon's argument of latitude (degrees)
  // 4: longitude of the ascending node of the moon's mean orbit on the ecliptic,
  //     measured from the mean equinox of the date (degrees)
  0: [297.85036, 445267.11148, -0.0019142, 1 / 189474],
  1: [357.52772, 35999.05034, -0.0001603, -1 / 300000],
  2: [134.96298, 477198.867398, 0.0086972, 1 / 56250],
  3: [93.27191, 483202.017538, -0.0036825, 1 / 327270],
  4: [125.04452, -1934.136261, 0.0020708, 1 / 450000]
};

/**
 * Third order polynomial based on:
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Eqns. 15-19
 * @param {number} num Subscript for X
 * @param {number} jce Julian Ephemeris Century
 * @returns {number} Summation of terms
 */
function nutationFactors(num, jce) {
  const cx = nutationXCoefficients[num];
  const reducer = (acc, cur, idx) => acc + cur * jce ** idx;
  return cx.reduce(reducer, 0);
}

const xFactors = jce =>
  Object.keys(nutationXCoefficients).map(i =>
    nutationFactors(parseInt(i), jce)
  );

const nutationPeriodicTerms = [
  [0, 0, 0, 0, 1, -171996, -174.2, 92025, 8.9],
  [-2, 0, 0, 2, 2, -13187, -1.6, 5736, -3.1],
  [0, 0, 0, 2, 2, -2274, -0.2, 977, -0.5],
  [0, 0, 0, 0, 2, 2062, 0.2, -895, 0.5],
  [0, 1, 0, 0, 0, 1426, -3.4, 54, -0.1],
  [0, 0, 1, 0, 0, 712, 0.1, -7, 0],
  [-2, 1, 0, 2, 2, -517, 1.2, 224, -0.6],
  [0, 0, 0, 2, 1, -386, -0.4, 200, 0],
  [0, 0, 1, 2, 2, -301, 0, 129, -0.1],
  [-2, -1, 0, 2, 2, 217, -0.5, -95, 0.3],
  [-2, 0, 1, 0, 0, -158, 0, 0, 0],
  [-2, 0, 0, 2, 1, 129, 0.1, -70, 0],
  [0, 0, -1, 2, 2, 123, 0, -53, 0],
  [2, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 1, 0, 1, 63, 0.1, -33, 0],
  [2, 0, -1, 2, 2, -59, 0, 26, 0],
  [0, 0, -1, 0, 1, -58, -0.1, 32, 0],
  [0, 0, 1, 2, 1, -51, 0, 27, 0],
  [-2, 0, 2, 0, 0, 48, 0, 0, 0],
  [0, 0, -2, 2, 1, 46, 0, -24, 0],
  [2, 0, 0, 2, 2, -38, 0, 16, 0],
  [0, 0, 2, 2, 2, -31, 0, 13, 0],
  [0, 0, 2, 0, 0, 29, 0, 0, 0],
  [-2, 0, 1, 2, 2, 29, 0, -12, 0],
  [0, 0, 0, 2, 0, 26, 0, 0, 0],
  [-2, 0, 0, 2, 0, -22, 0, 0, 0],
  [0, 0, -1, 2, 1, 21, 0, -10, 0],
  [0, 2, 0, 0, 0, 17, -0.1, 0, 0],
  [2, 0, -1, 0, 1, 16, 0, -8, 0],
  [-2, 2, 0, 2, 2, -16, 0.1, 7, 0],
  [0, 1, 0, 0, 1, -15, 0, 9, 0],
  [-2, 0, 1, 0, 1, -13, 0, 7, 0],
  [0, -1, 0, 0, 1, -12, 0, 6, 0],
  [0, 0, 2, -2, 0, 11, 0, 0, 0],
  [2, 0, -1, 2, 1, -10, 0, 5, 0],
  [2, 0, 1, 2, 2, -8, 0, 3, 0],
  [0, 1, 0, 2, 2, 7, 0, -3, 0],
  [-2, 1, 1, 0, 0, -7, 0, 0, 0],
  [0, -1, 0, 2, 2, -7, 0, 3, 0],
  [2, 0, 0, 2, 1, -7, 0, 3, 0],
  [2, 0, 1, 0, 0, 6, 0, 0, 0],
  [-2, 0, 2, 2, 2, 6, 0, -3, 0],
  [-2, 0, 1, 2, 1, 6, 0, -3, 0],
  [2, 0, -2, 0, 1, -6, 0, 3, 0],
  [2, 0, 0, 0, 1, -6, 0, 3, 0],
  [0, -1, 1, 0, 0, 5, 0, 0, 0],
  [-2, -1, 0, 2, 1, -5, 0, 3, 0],
  [-2, 0, 0, 0, 1, -5, 0, 3, 0],
  [0, 0, 2, 2, 1, -5, 0, 3, 0],
  [-2, 0, 2, 0, 1, 4, 0, 0, 0],
  [-2, 1, 0, 2, 1, 4, 0, 0, 0],
  [0, 0, 1, -2, 0, 4, 0, 0, 0],
  [-1, 0, 1, 0, 0, -4, 0, 0, 0],
  [-2, 1, 0, 0, 0, -4, 0, 0, 0],
  [1, 0, 0, 0, 0, -4, 0, 0, 0],
  [0, 0, 1, 2, 0, 3, 0, 0, 0],
  [0, 0, -2, 2, 2, -3, 0, 0, 0],
  [-1, -1, 1, 0, 0, -3, 0, 0, 0],
  [0, 1, 1, 0, 0, -3, 0, 0, 0],
  [0, -1, 1, 2, 2, -3, 0, 0, 0],
  [2, -1, -1, 2, 2, -3, 0, 0, 0],
  [0, 0, 3, 2, 2, -3, 0, 0, 0],
  [2, -1, 0, 2, 2, -3, 0, 0, 0]
];

/**
 * Calculate the nutation in longitude of earth from the ecliptic
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Section 3.4
 * @param {number} jce Julian Ephemeris Century
 * @param {number[]} [x] Earth/Moon "X-factors"
 * @returns {Degrees} nutation in longitude (deltaPsi)
 */
function nutationLongitude(jce, x) {
  // get factors X0-X4 (Equations 15-18)
  x = x || xFactors(jce);

  // calculate ΔΨᵢ (Equation 20)
  const dPsiRows = nutationPeriodicTerms.map(
    row =>
      (row[5] + row[6] * jce) *
      Math.sin(deg2rad(sum([0, 1, 2, 3, 4].map((_, idx) => x[idx] * row[idx]))))
  );

  // Equation 22
  return sum(dPsiRows) / 36000000;
}

/**
 * Calculate the nutation in obliquity of earth from the ecliptic
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Section 3.4
 * @param {number} jce Julian Ephemeris Century
 * @param {number[]} [x] Earth/Moon "X-factors"
 * @returns {Degrees} nutation in obliquity (deltaEpsilon)
 */
function nutationObliquity(jce, x) {
  // get factors X0-X4 (Equations 15-18)
  x = x || xFactors(jce);

  // calculate Δεᵢ (Equation 21)
  const dEpsilonRows = nutationPeriodicTerms.map(
    row =>
      (row[7] + row[8] * jce) *
      Math.cos(deg2rad(sum([0, 1, 2, 3, 4].map(idx => x[idx] * row[idx]))))
  );

  // Equation 23
  return sum(dEpsilonRows) / 36000000;
}

/**
 * Calculate the nutation in longitude and obliquity for given Julian Ephemeris Century
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Section 3.4
 * @param jce: luxon.DateTime
 * @returns {{obliquity: number, longitude: number}}
 */
function nutation(jce) {
  const x = xFactors(jce);

  return {
    longitude: nutationLongitude(jce, x),
    obliquity: nutationObliquity(jce, x)
  };
}

/**
 * Calculate the mean obliquity of the ecliptic for a given date (arc seconds)
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 24
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {ArcSeconds} Mean obliquity of the ecliptic
 */
function meanEclipticObliquity(jme) {
  const term = [
    84381.448,
    -4680.93,
    -1.55,
    1999.25,
    -51.38,
    -249.67,
    -39.05,
    7.12,
    27.87,
    5.79,
    2.45
  ];
  const U = jme / 10;
  return sum([...term.keys()].map(idx => term[idx] * U ** idx));
}

/**
 * Calculate the true obliquity of the ecliptic for a given date (degrees)
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 25
 * @param {number} jme Julian Ephemeris Millennium
 * @param {number} jce Julian Ephemeris Century
 * @returns {Degrees} True obliquity of the ecliptic
 */
function trueEclipticObliquity(jme, jce) {
  return meanEclipticObliquity(jme) / 3600 + nutationObliquity(jce);
}

/**
 * Aberration correction in degrees for a given date (degrees)
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 26
 * @param {AstronomicalUnits} R Earth radius vector
 * @returns {Degrees} Aberration correction
 */
function aberrationCorrection(R) {
  return -20.4898 / (3600 * R);
}

/**
 * Apparent sun longitude for a given date (degrees)
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 27
 * @param {Degrees} Theta Geocentric longitude of the sun
 * @param {Degrees} dPsi Nutation in Longitude
 * @param {Degrees} dTau Aberration correction
 * @returns {Degrees}
 */
function apparentSunLongitude(Theta, dPsi, dTau) {
  return Theta + dPsi + dTau;
}

/**
 * Apparent sidereal time at Greenwich for a given date/time
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Section 3.8
 * @param {number} jd Julian Day
 * @param {number} jc Julian Century
 * @param {number} jde Julian Ephemeris Day
 * @param {Degrees} dPsi Nutation in longitude
 * @param {Degrees} epsilon True obliquity of the ecliptic
 * @returns {Degrees} Apparent sidereal time at Greenwich, ν
 */
function greenwichApparentSiderealTime(jd, jc, jde, dPsi, epsilon) {
  // calculate mean sidereal time at Greenwich (Equation 28)
  const meanSidereal = limit_degrees(
    280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * jc ** 2 -
      jc ** 3 / 38710000.0
  );

  // Equation 29
  return meanSidereal + dPsi * Math.cos(deg2rad(epsilon));
}

/**
 * Geocentric sun right ascension (alpha), in degrees
 * From https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.9
 * @param {Degrees} lambda Apparent sun longitude
 * @param {Degrees} epsilon True obliquity of the ecliptic
 * @param {Degrees} beta Geocentric latitude of the sun
 * @returns {Degrees} Geocentric sun right ascension, α
 */
function geocentricRightAscension(lambda, epsilon, beta) {
  const lambda_rad = deg2rad(lambda);
  const epsilon_rad = deg2rad(epsilon);

  const alpha = Math.atan2(
    Math.sin(lambda_rad) * Math.cos(epsilon_rad) -
      Math.tan(deg2rad(beta)) * Math.sin(epsilon_rad),
    Math.cos(lambda_rad)
  );

  return limit_degrees(rad2deg(alpha));
}

/**
 * Geocentric sun declination (delta), in degrees
 * From https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.10
 * @param {Degrees} lambda Apparent sun longitude
 * @param {Degrees} epsilon True obliquity of the ecliptic
 * @param {Degrees} beta Geocentric latitude of the sun
 * @returns {Degrees} Geocentric sun declination, δ
 */
function geocentricDeclination(lambda, epsilon, beta) {
  const beta_rad = deg2rad(beta);
  const epsilon_rad = deg2rad(epsilon);

  const delta = Math.asin(
    Math.sin(beta_rad) * Math.cos(epsilon_rad) +
      Math.cos(beta_rad) * Math.sin(epsilon_rad) * Math.sin(deg2rad(lambda))
  );

  return rad2deg(delta);
}

/**
 * Observer local angle (H), measured westward from south in degrees
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.11
 * @param {Degrees} nu Apparent sidereal time at Greenwich
 * @param {Degrees} sigma Observer geographical longitude
 * @param {Degrees} alpha Geocentric right ascension of the sun
 * @returns {Degrees} Observer local hour angle, H
 */
function observerLocalHourAngle(nu, sigma, alpha) {
  return limit_degrees(nu + sigma - alpha);
}

/**
 * Topocentric sun position (right ascension and declination) and local hour angle in degrees
 * From https://www.nrel.gov/docs/fy08osti/34302.pdf Step 3.12-3.13
 * @param {Degrees} lat Observer local latitude
 * @param {Meters} elev Observer local elevation
 * @param {AstronomicalUnits} R Earth radius vector
 * @param {Degrees} H Observer local hour angle
 * @param {Degrees} delta Geocentric sun declination
 * @param {Degrees} alpha Geocentric sun right ascension
 * @returns {{declination: Degrees, rightAscension: Degrees, localHourAngle: Degrees}} Topocentric sun right ascension αʹ
 */
function topocentricSunPosition(lat, elev, R, H, delta, alpha) {
  const h_rad = deg2rad(H);
  const delta_rad = deg2rad(delta);
  const lat_rad = deg2rad(lat);

  // calculate the equatorial horizontal parallax of the sun (Equation 33)
  const xi = 8.794 / (3600.0 * R);
  const xi_rad = deg2rad(xi);

  // u-term, Equation 34
  const u = Math.atan((1 - FLATTENING) * Math.tan(lat_rad));

  // x-term, Equation 35
  const x = Math.cos(u) + (elev * Math.cos(lat_rad)) / 6378140;

  // y-term, Equation 36
  const y = 0.99664719 * Math.sin(u) + (elev / 6378140) * Math.sin(lat_rad);

  // parallax in the sun right ascension, Equation 37
  const deltaAlpha_rad = Math.atan2(
    -x * Math.sin(xi_rad) * Math.sin(h_rad),
    Math.cos(delta_rad) - x * Math.sin(xi_rad) * Math.cos(h_rad)
  );

  // Topocentric sun right ascension, Equation 38
  const alphaPrime = alpha + rad2deg(deltaAlpha_rad);

  // Topocentric sun declination, Equation 39
  const deltaPrime = Math.atan2(
    (Math.sin(delta_rad) - y * Math.sin(xi_rad)) * Math.cos(deltaAlpha_rad),
    Math.cos(delta_rad) - x * Math.sin(xi_rad) * Math.cos(h_rad)
  );

  // Topocentric local hour angle, Equation 40
  const hPrime = rad2deg(h_rad) - rad2deg(deltaAlpha_rad);

  return {
    rightAscension: alphaPrime,
    declination: rad2deg(deltaPrime),
    localHourAngle: hPrime
  };
}

/**
 * Calculate topocentric zenith
 * @param {Degrees} lat Latitude at observation point
 * @param {Degrees} hPrime Topocentric local hour angle
 * @param {Degrees} deltaPrime Topocentric sun declination
 * @param {Millibar} pressure Atmospheric pressure at observation point
 * @param {Celsius} temp Temperature at observation point
 * @returns {{elevationAngle: Degrees, zenithAngle: Degrees, uncorrectedElevation: Degrees}} Topocentric elevation and zenith angles
 */
function topocentricZenith(lat, hPrime, deltaPrime, pressure, temp) {
  const lat_rad = deg2rad(lat);
  const delta_prime_rad = deg2rad(deltaPrime);

  const uncorrectedElevationAngle = rad2deg(
    Math.asin(
      Math.sin(lat_rad) * Math.sin(delta_prime_rad) +
        Math.cos(lat_rad) *
          Math.cos(delta_prime_rad) *
          Math.cos(deg2rad(hPrime))
    )
  );
  const elevationAngle =
    uncorrectedElevationAngle +
    atmosphericRefractionCorrection(uncorrectedElevationAngle, pressure, temp);

  const zenithAngle = 90 - elevationAngle;
  return {
    elevationAngle: elevationAngle,
    zenithAngle: zenithAngle,
    uncorrectedElevation: uncorrectedElevationAngle
  };
}

function atmosphericRefractionCorrection(e0, pressure, temp) {
  return (
    (pressure / 1010.0) *
    (283.0 / (273.0 + temp)) *
    (1.02 / (60.0 * Math.tan(deg2rad(e0 + 10.3 / (e0 + 5.11)))))
  );
}

/**
 * Calculate approximate pressure for a given altitude (neglecting weather effects)
 * https://en.wikipedia.org/wiki/Atmospheric_pressure#Altitude_variation
 * @param {Meters}elevation
 * @returns {Millibar} Atmospheric pressure
 */
function pressureAtElevation(elevation) {
  const p0 = 1013.25; //mBar
  const cp = 1004.68506; // J/(kg*K)
  const T0 = 288.16; // K
  const g = 9.80665; // m/s**2
  const M = 0.02896968; // kg/mol
  const R0 = 8.314462618; // J/(mol*K)

  return p0 * (1 - (g * elevation) / (cp * T0) ** ((cp * M) / R0));
}

/**
 * Calculate topocentric azimuth angle (Phi) in degrees
 * @param {Degrees} observerLatitude
 * @param {Degrees} hPrime Topocentric local hour angle
 * @param {Degrees} deltaPrime Topocentric sun declination
 * @returns {{astronomers: Degrees, navigators: Degrees}} Topocentric azimuth angle
 */
function topocentricAzimuthAngle(observerLatitude, hPrime, deltaPrime) {
  const hPrime_rad = deg2rad(hPrime);
  const lat_rad = deg2rad(observerLatitude);
  const gamma = limit_degrees(
    rad2deg(
      Math.atan2(
        Math.sin(hPrime_rad),
        Math.cos(hPrime_rad) * Math.sin(lat_rad) -
          Math.tan(deg2rad(deltaPrime)) * Math.cos(lat_rad)
      )
    )
  );
  const astronomers = gamma;
  const navigators = limit_degrees(gamma + 180);
  return { astronomers: astronomers, navigators: navigators };
}

/**
 * Calculate sun's mean longitude (in degrees
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation A2
 * @param {number} jme Julian Ephemeris Millennium
 * @returns {Degrees} Equation of Time
 */
function sunMeanLongitude(jme) {
  const m_factors = [
    280.4664567,
    360007.6982779,
    0.03032028,
    1 / 49931,
    -1 / 15300,
    -1 / 2000000
  ];
  return limit_degrees(
    m_factors
      .map((factor, idx) => factor * jme ** idx)
      .reduce((acc, cur) => acc + cur, 0)
  );
}

/**
 * Calculate Equation of Time, or the difference between solar apparent time and
 * mean time.
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation A1
 * @param {number} jme Julian Ephemeris Millennium
 * @param {Degrees} alpha Geocentric right ascension
 * @param {Degrees} delta_psi Nutation in longitude
 * @param {Degrees} epsilon Obliquity of the ecliptic
 * @returns {Minutes} Equation of Time
 */
function equationOfTime(jme, alpha, delta_psi, epsilon) {
  const M = sunMeanLongitude(jme);

  const degrees =
    M - 0.0057183 - alpha + delta_psi * Math.cos(deg2rad(epsilon));
  const minutes = degrees * 4;

  if (Math.abs(minutes) <= 20) {
    return minutes;
  }
  return minutes < -20 ? minutes + 1440 : minutes - 1440;
}

/**
 * Calculate the approximate transit time of the sun
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation A3
 * @param {Degrees} alpha_zero Geocentric sun right ascension
 * @param {Degrees} long Local observer longitude
 * @param {Degrees} nu Greenwich sidereal time
 * @returns {number} Approximate transit time of the sun as a fraction of a day
 */
function approxSunTransitTime(alpha_zero, long, nu) {
  return (alpha_zero - long - nu) / 360;
}

/**
 * Calculate sun hour angle at sunrise/sunset
 * @param {Degrees} lat Local observer latitude
 * @param {Degrees} delta_zero Geocentric sun declination for day in question
 * @param {Degrees} h0_prime Sun elevation at sunrise/sunset
 * @returns {Degrees} Sun hour angle at sunrise/sunset. -99999 if the sun never rises or sets
 */
function sunHourAngleAtRiseSet(lat, delta_zero, h0_prime) {
  let lat_rad = deg2rad(lat);
  let delta_zero_rad = deg2rad(delta_zero);
  const argument =
    (Math.sin(deg2rad(h0_prime)) -
      Math.sin(lat_rad) * Math.sin(delta_zero_rad)) /
    (Math.cos(lat_rad) * Math.cos(delta_zero_rad));

  return Math.abs(argument) <= 1
    ? limit_degrees(rad2deg(Math.acos(argument)), 180)
    : -99999;
}

function approxSunRiseSet(m0, h0) {
  const m1 = limit_degrees(m0 - h0 / 360, 1);
  const m2 = limit_degrees(m0 + h0 / 360, 1);
  m0 = limit_degrees(m0, 1);
  return [m0, m1, m2];
}

function rts_alpha_delta_prime(ad, n) {
  let a = ad[1] - ad[0];
  let b = ad[2] - ad[1];
  a = Math.abs(a) >= 2 ? limit_degrees(a, 1) : a;
  b = Math.abs(b) >= 2 ? limit_degrees(b, 1) : b;
  const c = b - a;

  return ad[1] + (n * (a + b + c * n)) / 2;
}

function rts_sun_altitude(lat, delta_prime, h_prime) {
  const lat_rad = deg2rad(lat);
  const delta_prime_rad = deg2rad(delta_prime);

  return rad2deg(
    Math.asin(
      Math.sin(lat_rad) * Math.sin(delta_prime_rad) +
        Math.cos(lat_rad) *
          Math.cos(delta_prime_rad) *
          Math.cos(deg2rad(h_prime))
    )
  );
}

function sun_rise_and_set(
  m_rts,
  h_rts,
  delta_prime,
  lat,
  h_prime,
  h0_prime,
  sun
) {
  return (
    m_rts[sun] +
    (h_rts[sun] - h0_prime) /
      (360 *
        Math.cos(deg2rad(delta_prime[sun])) *
        Math.cos(deg2rad(lat)) *
        Math.sin(deg2rad(h_prime[sun])))
  );
}

function startOfDay(date) {
  return luxon.DateTime.utc(date.year, date.month, date.day);
}

function sunRiseSetTransit(spa) {
  // find sun elevation at sunrise and sunset
  const h0_prime = -1 * (SUN_RADIUS + REFRACTION_AT_SUNSET);

  const midnightUT = startOfDay(spa.date);

  // Calculate apparent sidereal time at 0 UT (Step A.2.1)

  const nu = new SPA(
    midnightUT,
    spa.latitude,
    spa.longitude,
    spa.elevation,
    spa.temp,
    spa.pressure,
    spa.delta_t,
    0
  ).nu;

  // Calculate geocentric right ascension and declination at 0TT (delta_t=0) (Step A.2.2)
  const sun_rts = new SPA(
    midnightUT,
    spa.latitude,
    spa.longitude,
    spa.elevation,
    spa.temp,
    spa.pressure,
    0,
    0
  );

  let alpha = new Array(3);
  let delta = new Array(3);
  [-1, 0, 1].forEach(i => {
    const newSpa = sun_rts.add_days(i);
    alpha[i + 1] = newSpa.alpha;
    delta[i + 1] = newSpa.delta;
  });

  // Calculate approximate sun transit time as fraction of a day (Step A.2.3)
  const m0 = approxSunTransitTime(alpha[1], spa.longitude, nu);

  const h0 = sunHourAngleAtRiseSet(spa.latitude, delta[1], h0_prime);

  let ssha, srha, sta, sunRise, sunSet, sunTransit;

  if (h0 >= 0) {
    const m_rts = approxSunRiseSet(m0, h0);

    let nu_rts = new Array(m_rts.length);
    let alpha_prime = new Array(m_rts.length);
    let delta_prime = new Array(m_rts.length);
    let h_prime = new Array(m_rts.length);
    let h_rts = new Array(m_rts.length);

    m_rts.forEach((val, i) => {
      nu_rts[i] = nu + 360.985647 * val;

      const n = val + spa.delta_t / 86400;

      alpha_prime[i] = rts_alpha_delta_prime(alpha, n);
      delta_prime[i] = rts_alpha_delta_prime(delta, n);

      h_prime[i] = limit_degrees180pm(
        nu_rts[i] + spa.longitude - alpha_prime[i]
      );
      h_rts[i] = rts_sun_altitude(spa.latitude, delta_prime[i], h_prime[i]);
    });

    srha = h_prime[1];
    ssha = h_prime[2];
    sta = h_prime[0];

    sunTransit = dateFromDayFrac(m_rts[0] - sta / 360, spa.date);
    sunRise = dateFromDayFrac(
      sun_rise_and_set(
        m_rts,
        h_rts,
        delta_prime,
        spa.latitude,
        h_prime,
        h0_prime,
        1
      ),
      spa.date
    );
    sunSet = dateFromDayFrac(
      sun_rise_and_set(
        m_rts,
        h_rts,
        delta_prime,
        spa.latitude,
        h_prime,
        h0_prime,
        2
      ),
      spa.date
    );
    console.log("transit", sunTransit.toString());
    console.log("sunrise", sunRise.toString());
    console.log("sunset", sunSet.toString());
  } else {
    srha = -99999;
    ssha = -99999;
    sta = -99999;
    sunTransit = -99999;
    sunRise = -99999;
    sunSet = -99999;
  }
  return {
    srha: srha,
    ssha: ssha,
    sta: sta,
    sunTransit: sunTransit,
    sunRise: sunRise,
    sunSet: sunSet
  };
}

function dateFromDayFrac(dayfrac, date) {
  const newDate = luxon.DateTime.utc(date.year, date.month, date.day);
  newDate.setZone(date.zone);
  return newDate.plus({ seconds: dayfrac * 86400 }).setZone(date.zone);
}

function SPA(
  date,
  latitude,
  longitude,
  elevation,
  temp,
  pressure,
  delta_t = null,
  delta_ut1 = null
) {
  this.date = date;
  this.latitude = latitude;
  this.longitude = longitude;
  this.latlng = [this.latitude, this.longitude];
  this.elevation = elevation;
  this.temp = temp;
  this.pressure = pressure;

  this.jd = julianDay(this.date, this.delta_ut1);
  this.jc = julianCentury(this.jd);

  this.delta_t = delta_t === null ? deltaT(date) : delta_t;
  this.delta_ut1 = delta_ut1 === null ? 0 : delta_ut1; // TODO: lookup values?
  this.jde = julianEphemerisDay(this.jd, this.delta_t);
  this.jce = julianEphemerisCentury(this.jde);
  this.jme = julianEphemerisMillennium(this.jce);

  this.l = heliocentricLongitude(this.jme);
  this.b = heliocentricLatitude(this.jme);
  this.r = earthRadiusVector(this.jme);

  this.theta = geocentricLongitude(this.l);
  this.beta = geocentricLatitude(this.b);

  this.x_factors = xFactors(this.jce);

  this.del_psi = nutationLongitude(this.jce, this.x_factors);
  this.del_epsilon = nutationObliquity(this.jce, this.x_factors);
  this.epsilon = trueEclipticObliquity(this.jme, this.jce);

  this.del_tau = aberrationCorrection(this.r);
  this.lambda = apparentSunLongitude(this.theta, this.del_psi, this.del_tau);
  this.nu = greenwichApparentSiderealTime(
    this.jd,
    this.jc,
    this.jde,
    this.del_psi,
    this.epsilon
  );

  this.alpha = geocentricRightAscension(this.lambda, this.epsilon, this.beta);
  this.delta = geocentricDeclination(this.lambda, this.epsilon, this.beta);

  this.h = observerLocalHourAngle(this.nu, this.longitude, this.alpha);
  const topocentric = topocentricSunPosition(
    this.latitude,
    this.elevation,
    this.r,
    this.h,
    this.delta,
    this.alpha
  );
  this.delta_prime = topocentric.declination;
  this.alpha_prime = topocentric.rightAscension;
  this.h_prime = topocentric.localHourAngle;

  const zenith = topocentricZenith(
    this.latitude,
    this.h_prime,
    this.delta_prime,
    this.pressure,
    this.temp
  );
  this.e0 = zenith.uncorrectedElevation;
  this.del_e = atmosphericRefractionCorrection(
    this.e0,
    this.pressure,
    this.temp
  );
  this.e = zenith.elevationAngle;

  this.eot = equationOfTime(this.jme, this.alpha, this.del_psi, this.epsilon);

  this.zenith = zenith.zenithAngle;
  const azi = topocentricAzimuthAngle(
    this.latitude,
    this.h_prime,
    this.delta_prime
  );
  this.azimuth_astro = azi.astronomers;
  this.azimuth = azi.navigators;

  this.add_days = days => {
    return new SPA(
      this.date.plus({ days: days }),
      this.latitude,
      this.longitude,
      this.elevation,
      this.temp,
      this.pressure,
      this.delta_t,
      this.delta_ut1
    );
  };
}

/**
 * Earth's equatorial radius (a) - semi-major axis
 * @type {Meters}
 */
const RADIUS_A = 6378137.0;
/**
 * Earth's polar radius (b) - semi-minor axis
 * @type {Meters}
 */
const RADIUS_B = 6356752.3;

/**
 * Calculate the local radius (distance from earth's center) for a given latitude and elevation
 * https://www.movable-type.co.uk/scripts/latlong.html
 * @param {Degrees} lat Latitude at observer location
 * @param {Meters} elev Elevation at observer location
 * @returns {Meters} Distance to earth's center
 */
function geocentricRadius(lat, elev = 0) {
  const lat_rad = deg2rad(lat);
  const R = Math.sqrt(
    ((RADIUS_A ** 2 * Math.cos(lat_rad)) ** 2 +
      (RADIUS_B ** 2 * Math.sin(lat_rad)) ** 2) /
      ((RADIUS_A * Math.cos(lat_rad)) ** 2 +
        (RADIUS_B * Math.sin(lat_rad)) ** 2)
  );
  return R + elev;
}

function latLngFromAzimuth(latlng1, dist, azimuth, elev = 0) {
  const R = geocentricRadius(latlng1[0], elev);
  const lat_rad = deg2rad(latlng1[0]);
  const lng_rad = deg2rad(latlng1[1]);
  const azi_rad = deg2rad(azimuth);

  const lat2 = Math.asin(
    Math.sin(lat_rad) * Math.cos(dist / R) +
      Math.cos(lat_rad) * Math.sin(dist / R) * Math.cos(azi_rad)
  );
  const lng2 =
    lng_rad +
    Math.atan2(
      Math.sin(azi_rad) * Math.sin(dist / R) * Math.cos(lat_rad),
      Math.cos(dist / R) - Math.sin(lat_rad) * Math.sin(lat2)
    );

  return {
    lat: Math.round(rad2deg(lat2) * 1e6) / 1e6,
    lng: Math.round(rad2deg(lng2) * 1e6) / 1e6
  };
}

function testCase() {
  // Test cases
  const testDate = luxon.DateTime.utc(2003, 10, 17, 19, 30, 30);
  const localLong = -105.1786;
  const localLat = 39.742476;
  const localElev = 1830.14;
  const localPressure = 820.0;
  const localTemp = 11.0;
  const delta_t = 67;
  const delta_ut1 = 0;

  const spaTest = new SPA(
    testDate,
    localLat,
    localLong,
    localElev,
    localTemp,
    localPressure,
    delta_t,
    delta_ut1
  );
  console.log("Julian Day: ", spaTest.jd);
  console.log("Julian Century", spaTest.jc);
  console.log("Julian Ephemeris Century", spaTest.jce);
  console.log("Julian Ephemeris Millennium", spaTest.jme);

  console.log("heliocentric longitude of earth (L)", spaTest.l);
  console.log("heliocentric latitude of earth (B)", spaTest.b);
  console.log("earth radius vector (R)", spaTest.r);

  console.log("geocentric longitude (Theta): ", spaTest.theta);
  console.log("geocentric latitude (beta): ", spaTest.beta);

  console.log(
    "nutation [dPsi, dEpsilon]: ",
    spaTest.del_psi,
    spaTest.del_epsilon
  );

  console.log("true obliquity of ecliptic (epsilon): ", spaTest.epsilon);

  console.log("Apparent Sun Longitude (lambda): ", spaTest.lambda);

  console.log("Geocentric sun right ascension (alpha) ", spaTest.alpha);

  console.log("geocentric sun declination (delta) ", spaTest.delta);

  console.log("observer local hour angle (H) ", spaTest.h);

  console.log(
    "topocentric right ascension (alpha-prime): ",
    spaTest.alpha_prime
  );
  console.log("topocentric declination (delta-prime): ", spaTest.delta_prime);
  console.log("topocentric local hour angle (H-prime): ", spaTest.h_prime);

  console.log("topocentric zenith: ", spaTest.zenith);
  console.log("topocentric elevation: ", spaTest.e);
  console.log("topocentric azimuth", spaTest.azimuth);
  console.log("Equation of time (minutes): ", spaTest.eot);

  sunRiseSetTransit(spaTest);
  sunRiseSetTransit(
    new SPA(
      luxon.DateTime.local(2019, 9, 28, 18, 7),
      37.739024,
      -122.189905,
      20,
      30,
      1000
    )
  );
}
