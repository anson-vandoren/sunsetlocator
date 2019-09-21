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
