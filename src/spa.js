import { DateTime } from "luxon";
import data from "./data";
import { limit_degrees, limit_degrees180pm } from "./util";

// region typedefs
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

// endregion

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
 * Helper function to sum values in an array
 * @param {[number]} arr Array of numbers to sum
 * @returns {number} Sum of elements in the array
 */
function sum(arr) {
  return arr.reduce((acc, cur) => acc + cur, 0);
}

/**
 * Return the fraction of the day that is complete
 * @param {DateTime} date a luxon DateTime of interest
 * @return {number} Fractional part of day complete
 */
function dayFraction(date) {
  // convert incoming date to UTC
  date = date.toUTC();
  // get the start of this day
  const dayStart = DateTime.utc(date.year, date.month, date.day, 0, 0, 0);
  // calculate total milliseconds in a full day
  const msecInDay = 24 * 60 * 60 * 1000;
  // return the fraction of this day completed
  return date.diff(dayStart).milliseconds / msecInDay;
}

/**
 * Calculate the Julian Day from a calendar date
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Equation 4
 * @param {DateTime} date DateTime in question
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
 * @param {DateTime} date Day in question
 * @returns {number|*}
 */
function deltaT(date) {
  const year = date.year;
  // TODO: pull actual data from somewhere
  const ord = date.ordinal;
  const daysInYear = DateTime.utc(date.year, 12, 31).ordinal;
  const frac = ord / daysInYear;
  const quarter = Math.floor(frac / 0.25);
  const quarterFrac = quarter * 0.25;

  const yearLookup =
    quarterFrac > 0
      ? (year + quarterFrac).toString().padEnd(7, "0")
      : year.toString() + ".00";

  const results = data.deltaT;

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
  const term_obj = data.earthConstants[term_type];
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

/**
 * Third order polynomial based on:
 * https://www.nrel.gov/docs/fy08osti/34302.pdf Eqns. 15-19
 * @param {number} num Subscript for X
 * @param {number} jce Julian Ephemeris Century
 * @returns {number} Summation of terms
 */
function nutationFactors(num, jce) {
  const cx = data.nutationXCoefficients[num];
  const reducer = (acc, cur, idx) => acc + cur * jce ** idx;
  return cx.reduce(reducer, 0);
}

const xFactors = jce =>
  Object.keys(data.nutationXCoefficients).map(i =>
    nutationFactors(parseInt(i), jce)
  );

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
  const dPsiRows = data.nutationPeriodicTerms.map(
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
  const dEpsilonRows = data.nutationPeriodicTerms.map(
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
 * @param jce: DateTime
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
  const u = Math.atan((1 - data.FLATTENING) * Math.tan(lat_rad));

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
  return DateTime.utc(date.year, date.month, date.day);
}

export function sunRiseSetTransit(spa) {
  // find sun elevation at sunrise and sunset
  const h0_prime = -1 * (data.SUN_RADIUS + data.REFRACTION_AT_SUNSET);

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

  // const nu = gAST(midnightUT, spa.delta_t);

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
  const newDate = DateTime.utc(date.year, date.month, date.day);
  newDate.setZone(date.zone);
  return newDate.plus({ seconds: dayfrac * 86400 }).setZone(date.zone);
}

export function SPA(
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

  const { sunRise, sunSet } = sunriseSunset(
    this.date,
    this.latitude,
    this.longitude
  );
  this.sunsetAzimuth = azimuth(
    sunSet,
    this.elevation,
    this.latitude,
    this.longitude
  );
  this.sunriseAzimuth = azimuth(
    sunRise,
    this.elevation,
    this.latitude,
    this.longitude
  );

  this.sunrisePoint = radius => {
    return latLngFromAzimuth(
      [this.latitude, this.longitude],
      radius,
      this.sunriseAzimuth,
      0
    );
  };
  this.sunsetPoint = radius => {
    return latLngFromAzimuth(
      [this.latitude, this.longitude],
      radius,
      this.sunsetAzimuth,
      0
    );
  };

  this.sunrise = radius => ({
    pt: this.sunrisePoint(radius),
    angle: this.sunriseAzimuth
  });

  this.sunset = radius => ({
    pt: this.sunsetPoint(radius),
    angle: this.sunsetAzimuth
  });

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
 * Calculate the local radius (distance from earth's center) for a given latitude and elevation
 * https://www.movable-type.co.uk/scripts/latlong.html
 * @param {Degrees} lat Latitude at observer location
 * @param {Meters} elev Elevation at observer location
 * @returns {Meters} Distance to earth's center
 */
function geocentricRadius(lat, elev = 0) {
  const lat_rad = deg2rad(lat);
  const R = Math.sqrt(
    ((data.RADIUS_A ** 2 * Math.cos(lat_rad)) ** 2 +
      (data.RADIUS_B ** 2 * Math.sin(lat_rad)) ** 2) /
      ((data.RADIUS_A * Math.cos(lat_rad)) ** 2 +
        (data.RADIUS_B * Math.sin(lat_rad)) ** 2)
  );
  return R + elev;
}

export function latLngFromAzimuth(latlng1, dist, azimuth, elev = 0) {
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
  const testDate = DateTime.utc(2003, 10, 17, 19, 30, 30);
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
      DateTime.local(2019, 9, 28, 18, 7),
      37.739024,
      -122.189905,
      20,
      30,
      1000
    )
  );
}

export function sunriseSunset(date, lat, lng) {
  // find sun elevation at sunrise and sunset
  const h0_prime = -1 * (data.SUN_RADIUS + data.REFRACTION_AT_SUNSET);

  const midnightUT = startOfDay(date);

  const { jd, jc, jde, jce, jme } = julian(midnightUT);

  const nu = gAST(jd, jc, jde, jce, jme);

  const days = [date.minus({ days: 1 }), date, date.plus({ days: 1 })];

  let alpha_vals = new Array(3);
  let delta_vals = new Array(3);
  days.forEach((day, idx) => {
    const { alpha, delta } = geoRA_D(day);
    alpha_vals[idx] = alpha;
    delta_vals[idx] = delta;
  });

  const m0 = approxSunTransitTime(alpha_vals[1], lng, nu);
  const h0 = sunHourAngleAtRiseSet(lat, delta_vals[1], h0_prime);

  if (h0 < 0) {
    return { sunRise: null, sunSet: null };
  }

  const m_rts = approxSunRiseSet(m0, h0);
  let sta, sunRise, sunSet, sunTransit;
  let nu_rts = new Array(m_rts.length);
  let alpha_prime = new Array(m_rts.length);
  let delta_prime = new Array(m_rts.length);
  let h_prime = new Array(m_rts.length);
  let h_rts = new Array(m_rts.length);

  m_rts.forEach((val, i) => {
    nu_rts[i] = nu + 360.985647 * val;

    const n = val + deltaT(date) / 86400;

    alpha_prime[i] = rts_alpha_delta_prime(alpha_vals, n);
    delta_prime[i] = rts_alpha_delta_prime(delta_vals, n);

    h_prime[i] = limit_degrees180pm(nu_rts[i] + lng - alpha_prime[i]);
    h_rts[i] = rts_sun_altitude(lat, delta_prime[i], h_prime[i]);
  });

  sta = h_prime[0];

  sunTransit = dateFromDayFrac(m_rts[0] - sta / 360, date);
  sunRise = dateFromDayFrac(
    sun_rise_and_set(m_rts, h_rts, delta_prime, lat, h_prime, h0_prime, 1),
    date
  );
  sunSet = dateFromDayFrac(
    sun_rise_and_set(m_rts, h_rts, delta_prime, lat, h_prime, h0_prime, 2),
    date
  );
  console.log("**sunrise", sunRise.toString());
  console.log("**sunset", sunSet.toString());
  return { sunRise: sunRise, sunSet: sunSet };
}

function geoRA_D(date) {
  const { jce, jme } = julian(date);

  const l = heliocentricLongitude(jme);
  const b = heliocentricLatitude(jme);
  const r = earthRadiusVector(jme);

  const theta = geocentricLongitude(l);
  const beta = geocentricLatitude(b);

  const x_factors = xFactors(jce);

  const del_psi = nutationLongitude(jce, x_factors);
  const epsilon = trueEclipticObliquity(jme, jce);

  const del_tau = aberrationCorrection(r);
  const lambda = apparentSunLongitude(theta, del_psi, del_tau);

  const alpha = geocentricRightAscension(lambda, epsilon, beta);
  const delta = geocentricDeclination(lambda, epsilon, beta);
  return { alpha, delta };
}

function gAST(jd, jc, jde, jce, jme) {
  const x_factors = xFactors(jce);

  const del_psi = nutationLongitude(jce, x_factors);
  const epsilon = trueEclipticObliquity(jme, jce);
  return greenwichApparentSiderealTime(jd, jc, jde, del_psi, epsilon);
}

function julian(date) {
  const jd = julianDay(date, 0);
  const jc = julianCentury(jd);
  const delta_t = deltaT(date);
  const jde = julianEphemerisDay(jd, delta_t);
  const jce = julianEphemerisCentury(jde);
  const jme = julianEphemerisMillennium(jce);

  return { jd, jc, jde, jce, jme };
}

function azimuth(date, elevation, latitude, longitude) {
  const { jd, jc, jde, jce, jme } = julian(date);
  const l = heliocentricLongitude(jme);
  const b = heliocentricLatitude(jme);
  const r = earthRadiusVector(jme);

  const theta = geocentricLongitude(l);
  const beta = geocentricLatitude(b);

  const x_factors = xFactors(jce);

  const del_psi = nutationLongitude(jce, x_factors);

  const epsilon = trueEclipticObliquity(jme, jce);

  const del_tau = aberrationCorrection(r);
  const lambda = apparentSunLongitude(theta, del_psi, del_tau);
  const nu = greenwichApparentSiderealTime(jd, jc, jde, del_psi, epsilon);

  const alpha = geocentricRightAscension(lambda, epsilon, beta);
  const delta = geocentricDeclination(lambda, epsilon, beta);

  const h = observerLocalHourAngle(nu, longitude, alpha);
  const topocentric = topocentricSunPosition(
    latitude,
    elevation,
    r,
    h,
    delta,
    alpha
  );
  const delta_prime = topocentric.declination;
  const h_prime = topocentric.localHourAngle;

  const azi = topocentricAzimuthAngle(latitude, h_prime, delta_prime);

  return azi.navigators;
}
