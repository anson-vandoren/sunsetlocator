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
 * @param {a luxon DateTime of interest} d
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
      ? (year + quarterFrac).toString().padEnd(7, '0')
      : year.toString() + '.00';

  // from http://maia.usno.navy.mil/ser7/deltat.preds
  // historic at http://maia.usno.navy.mil/ser7/deltat.data
  // TAI-UTC at http://maia.usno.navy.mil/ser7/deltat.data
  // UT1-UTC at http://maia.usno.navy.mil/ser7/mark3.out
  // explanation at: http://maia.usno.navy.mil/
  // further data at: http://maia.usno.navy.mil/ser7/ser7.dat

  const results = {
    first: { year: '2019.00', data: 69.34 },
    '2019.00': 69.34,
    '2019.25': 69.48,
    '2019.50': 69.62,
    '2019.75': 69.71,
    '2020.00': 69.87,
    '2020.25': 70.03,
    '2020.50': 70.16,
    '2020.75': 70.24,
    '2021.00': 70.39,
    '2021.25': 70.55,
    '2021.50': 70.68,
    '2021.75': 70.76,
    '2022.00': 70.91,
    '2022.25': 71.06,
    '2022.50': 71.18,
    '2022.75': 71.25,
    '2023.00': 71.4,
    '2023.25': 71.54,
    '2023.50': 71.67,
    '2023.75': 71.74,
    '2024.00': 71.88,
    '2024.25': 72.03,
    '2024.50': 72.15,
    '2024.75': 72.22,
    '2025.00': 72.36,
    '2025.25': 72.5,
    '2025.50': 72.62,
    '2025.75': 72.69,
    '2026.00': 72.83,
    '2026.25': 72.98,
    '2026.50': 73.1,
    '2026.75': 73.17,
    '2027.00': 73.32,
    '2027.25': 73.46,
    '2027.50': 73.58,
    '2027.75': 73.66,
    last: { year: '2027.75', data: 73.66 },
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

function julianEphemerisMillenium(d) {
  return julianEphemerisCentury(d) / 10;
}

// function l0(d) {
//   const jme = julianEphemerisMillenium(d);
//   const earthPeriodicSum = (acc, row) => {
//     const curVal = row[1] * Math.cos(row[2] + row[3] * jme);
//     return acc + curVal;
//   };
//   return periodicL0.reduce(earthPeriodicSum, 0);
// }

const periodicL0 = [
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
  [63, 25, 3.16, 4690.48],
];

const periodicL1 = [
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
  [33, 6, 4.67, 4690.48],
];

const periodicL2 = [
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
  [19, 2, 3.75, 0.98],
];

const periodicL3 = [
  [0, 289, 5.844, 6283.076],
  [1, 35, 0, 0],
  [2, 17, 5.49, 12566.15],
  [3, 3, 5.2, 155.42],
  [4, 1, 4.72, 3.52],
  [5, 1, 5.3, 18849.23],
  [6, 1, 5.97, 242.73],
];

const periodicL4 = [
  [0, 114, 3.142, 0],
  [1, 8, 4.13, 6283.08],
  [2, 1, 3.84, 12566.15],
];

const periodicL5 = [[0, 1, 3.14, 0]];

const longitudeConstants = {
  0: periodicL0,
  1: periodicL1,
  2: periodicL2,
  3: periodicL3,
  4: periodicL4,
  5: periodicL5,
};

function heliocentricLongitude(d) {
  //https://www.nrel.gov/docs/fy08osti/34302.pdf Equations 9-12

  const jme = julianEphemerisMillenium(d);
  const earthPeriodicSum = (acc, row) => {
    const curVal = row[1] * Math.cos(row[2] + row[3] * jme);
    return acc + curVal;
  };
  const longitudeRows = [0, 1, 2, 3, 4, 5];
  const longitude = longitudeRows.map((idx) =>
    longitudeConstants[idx].reduce(earthPeriodicSum, 0)
  );

  const longitudeInRadians =
    (longitude[0] +
      longitude[1] * jme +
      longitude[2] * jme ** 2 +
      longitude[3] * jme ** 3 +
      longitude[4] * jme ** 4 +
      longitude[5] * jme ** 5) /
    1e8;
  const maybeDegrees = (longitudeInRadians * 180) / Math.PI;
  if (maybeDegrees <= 360 && maybeDegrees >= 0) {
    return maybeDegrees;
  }
  const frac = maybeDegrees / 360 - parseInt(maybeDegrees / 360);
  if (frac == 0) {
    return 0.0;
  }
  return frac < 0 ? 360.0 - 260.0 * frac : 360.0 * frac;
}
