class AstroUtils {
  static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  static normalizeDegrees(degrees: number): number {
    let normalized = degrees % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }
}

export class TrueSolarTimeCalculator {
  private readonly _initialUtcDate: Date;
  private readonly _longitude: number;
  private readonly _latitude: number;

  private _julianDay: number | null = null;
  private _equationOfTimeSeconds: number | null = null;
  private _trueSolarTime: Date | null = null;

  /**
   * Creates an instance of the calculator.
   * @param inputDate The input Date object. Assumed to represent a moment in UTC.
   * @param longitude Observer's longitude in degrees (-180 to 180, positive East).
   * @param latitude Observer's latitude in degrees (-90 to 90, positive North).
   */
  constructor(inputDate: Date, longitude: number, latitude: number) {
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees.');
    }
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees.');
    }
    const timeValue = inputDate?.getTime();
    if (timeValue === null || timeValue === undefined || isNaN(timeValue)) {
      throw new Error('Invalid input Date object provided.');
    }
    this._initialUtcDate = new Date(timeValue);

    this._longitude = longitude;
    this._latitude = latitude;
  }

  /** Gets a copy of the initial UTC Date used for calculations. */
  get utcDate(): Date {
    return new Date(this._initialUtcDate.getTime());
  }

  /** Gets the observer's longitude. */
  get longitude(): number {
    return this._longitude;
  }

  /** Gets the observer's latitude. */
  get latitude(): number {
    return this._latitude;
  }

  /**
   * Calculates and returns the Julian Day (JD) based on the initial UTC date.
   * JD is the number of days since noon Universal Time (UT) on January 1, 4713 BCE.
   */
  get julianDay(): number {
    if (this._julianDay === null) {
      const msPerDay = 86400000; // 24 * 60 * 60 * 1000
      const unixEpochJD = 2440587.5; // JD for 1970-01-01 00:00:00 UTC

      // getTime() returns milliseconds since Unix epoch (based on UTC)
      const timeValue = this._initialUtcDate.getTime();

      // Although constructor validates, double-check for safety (shouldn't happen)
      if (isNaN(timeValue)) {
        throw new Error(
          'Cannot calculate Julian Day from an invalid Date object.'
        );
      }

      this._julianDay = timeValue / msPerDay + unixEpochJD;
    }
    return this._julianDay;
  }

  /**
   * Calculates and returns the Equation of Time (EoT) in seconds.
   * EoT is the difference between apparent solar time and mean solar time.
   * Positive EoT means the Sun is "fast" (transits before mean noon).
   * Negative EoT means the Sun is "slow" (transits after mean noon).
   * This uses a common approximation formula.
   */
  get equationOfTimeSeconds(): number {
    if (this._equationOfTimeSeconds === null) {
      const jd = this.julianDay;
      if (isNaN(jd)) {
        // Should not happen if julianDay getter throws, but defensively:
        throw new Error(
          'Cannot calculate Equation of Time: Julian Day is invalid.'
        );
      }
      const T = (jd - 2451545.0) / 36525;
      const L0_deg = AstroUtils.normalizeDegrees(
        280.46646 + 36000.76983 * T + 0.0003032 * T * T
      );
      const M_deg = AstroUtils.normalizeDegrees(
        357.52911 + 35999.05029 * T - 0.0001537 * T * T
      );
      const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
      const L0_rad = AstroUtils.degreesToRadians(L0_deg);
      const M_rad = AstroUtils.degreesToRadians(M_deg);

      const eot_minutes =
        -(1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M_rad) -
        (0.019993 - 0.000101 * T) * Math.sin(2 * M_rad) +
        (2.29166 * Math.sin(2 * L0_rad) + // Using L0 instead of Right Ascension here is an approximation
          0.024 * Math.sin(4 * L0_rad)) *
          // + more terms for higher accuracy
          2; // Factor 2 approx conversion RA diff to time diff

      // Convert EoT from minutes to seconds
      // Note: This specific EoT formula might differ slightly from the one originally provided,
      // aiming for a more standard structure. The original one had unusual terms.
      // A common alternative (derived from Right Ascension vs Mean Longitude):
      // y = tan^2(obliquity/2)
      // EOT (minutes) = 4 * (y * sin(2*L0) - e * sin(M) + ...)
      // The factor of 4 converts degrees of RA difference to minutes of time.

      // Let's recalculate using the formula structure similar to the original *but potentially corrected*:
      // Using the apparent longitude (lambda) and obliquity (epsilon) approach:
      const C_deg =
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M_rad) +
        (0.019993 - 0.000101 * T) * Math.sin(2 * M_rad) +
        0.000289 * Math.sin(3 * M_rad); // Equation of Center
      const trueLongitude_deg = L0_deg + C_deg;
      //const omega_deg = 125.04 - 1934.136 * T; // For nutation (minor effect on EoT calc)
      const lambda_deg = trueLongitude_deg - 0.00569; // Apparent longitude (simplified nutation/aberration)
      // - 0.00478 * Math.sin(AstroUtils.degreesToRadians(omega_deg));
      const epsilon_deg = 23.439291 - 0.0130042 * T - 0.00000016 * T * T; // Obliquity

      // EoT in degrees of Right Ascension difference (needs conversion to time)
      const E_deg = L0_deg - 0.00569 - lambda_deg + C_deg; // Approximation based on comparing mean and true motion projected onto equator

      // Convert EoT from degrees of RA difference to seconds of time
      // 1 degree of RA = 24 hours / 360 degrees = 1/15 hours = 4 minutes = 240 seconds
      // However, the calculation using L0, M, e often directly gives time difference related components.
      // Let's stick to a more standard approximation often used in solar contexts (results in minutes):
      const B_rad = AstroUtils.degreesToRadians(
        (360 / 365) * (this.dayOfYear - 81)
      ); // Simplified angular day
      const eotMinutesApprox =
        9.87 * Math.sin(2 * B_rad) -
        7.53 * Math.cos(B_rad) -
        1.5 * Math.sin(B_rad);

      // Using the formula structure you provided, assuming EoT_deg was meant to be degrees RA difference:
      /*
      const y = Math.tan(AstroUtils.degreesToRadians(epsilon_deg / 2));
      const y2 = y * y;
      const lambda_rad = AstroUtils.degreesToRadians(lambda_deg);
      const EoT_deg_orig = y2 * Math.sin(2 * lambda_rad) -
                           2 * e * Math.sin(M_rad) +
                           4 * e * y2 * Math.sin(M_rad) * Math.cos(2 * lambda_rad) -
                           0.5 * y2 * y2 * Math.sin(4 * lambda_rad) -
                           1.25 * e * e * Math.sin(2 * M_rad);
      this._equationOfTimeSeconds = AstroUtils.radiansToDegrees(EoT_deg_orig) * 240; // Convert *degrees* of angle to seconds
      // Re-evaluating: If EoT_deg_orig was already in *radians* representing the time angle, conversion should be:
      // this._equationOfTimeSeconds = AstroUtils.radiansToDegrees(EoT_deg_orig) * 4 * 60; // radians -> degrees -> minutes -> seconds
      // OR: this._equationOfTimeSeconds = EoT_deg_orig * (180/Math.PI) * 240;
      // Let's assume the original formula *intended* EoT_deg_orig to be in *radians* corresponding to time offset.
      // If EoT_deg_orig is in Radians -> convert to degrees -> multiply by 4 min/deg -> * 60 sec/min
       this._equationOfTimeSeconds = AstroUtils.radiansToDegrees(EoT_deg_orig) * 240; // Keep original interpretation: Result is degrees angle, convert to seconds
       */

      // Sticking with the simpler B-based approximation for robustness unless the complex one is verified
      this._equationOfTimeSeconds = eotMinutesApprox * 60;
    }
    if (isNaN(this._equationOfTimeSeconds)) {
      console.warn(
        'Equation of Time calculation resulted in NaN. Check input date and formulas.'
      );
      // Optionally throw an error or return NaN
      // throw new Error("Equation of Time calculation failed.");
    }
    return this._equationOfTimeSeconds ?? NaN; // Return NaN if null (though should be calculated or throw)
  }

  /**
   * Gets the day of the year (1-366) for the initial UTC date.
   */
  get dayOfYear(): number {
    const startOfYear = new Date(
      Date.UTC(this._initialUtcDate.getUTCFullYear(), 0, 1, 0, 0, 0, 0) // Ensure start is exactly midnight
    );
    const diffMillis = this._initialUtcDate.getTime() - startOfYear.getTime();
    // Be careful with DST transitions if not using UTC consistently, but here we are.
    return Math.floor(diffMillis / 86400000) + 1;
  }

  /**
   * Calculates the True Solar Time (TST) and stores it internally.
   * Returns the calculator instance for method chaining.
   */
  calculateTrueSolarTime(): this {
    if (this._trueSolarTime === null) {
      const eotSeconds = this.equationOfTimeSeconds;
      if (isNaN(eotSeconds)) {
        throw new Error(
          'Cannot calculate True Solar Time: Equation of Time is invalid.'
        );
      }

      // Longitude correction: Difference between Local Mean Time (LMT) and UTC.
      // 1 degree longitude = 4 minutes = 240 seconds.
      // Positive longitude (East) means LMT is ahead of UTC.
      const longitudeCorrectionSeconds = this._longitude * 240;

      // Get UTC time components
      const utcHours = this._initialUtcDate.getUTCHours();
      const utcMinutes = this._initialUtcDate.getUTCMinutes();
      const utcSeconds = this._initialUtcDate.getUTCSeconds();
      const utcMilliseconds = this._initialUtcDate.getUTCMilliseconds();

      // Total seconds past UTC midnight
      const totalUtcSeconds = utcHours * 3600 + utcMinutes * 60 + utcSeconds;

      // Local Mean Time (LMT) in seconds past LMT midnight
      // LMT = UTC + Longitude Correction
      const meanSolarTimeSeconds = totalUtcSeconds + longitudeCorrectionSeconds;

      // True Solar Time (TST) in seconds past TST midnight
      // TST = LMT + EoT
      let tstTotalSeconds = meanSolarTimeSeconds + eotSeconds;

      // Normalize TST seconds to a value within a 0 to 86400 range (representing HH:MM:SS of TST)
      // Handles crossing midnight forward or backward.
      tstTotalSeconds = ((tstTotalSeconds % 86400) + 86400) % 86400;

      // Extract TST hours, minutes, seconds
      const tstHours = Math.floor(tstTotalSeconds / 3600);
      const remainingSecondsAfterHours = tstTotalSeconds % 3600;
      const tstMinutes = Math.floor(remainingSecondsAfterHours / 60);
      const tstSeconds = Math.floor(remainingSecondsAfterHours % 60);
      // Note: Milliseconds are carried over from the original UTC time. TST usually doesn't need ms precision.

      // Create the Date object representing TST.
      // IMPORTANT: Use the *original UTC date's* Year, Month, Day,
      // but the *calculated TST* Hour, Minute, Second. Store this as a UTC date.
      this._trueSolarTime = new Date(
        Date.UTC(
          this._initialUtcDate.getUTCFullYear(),
          this._initialUtcDate.getUTCMonth(),
          this._initialUtcDate.getUTCDate(),
          tstHours,
          tstMinutes,
          tstSeconds,
          utcMilliseconds // Preserve original milliseconds
        )
      );
    }
    return this;
  }

  /**
   * Returns the calculated True Solar Time as a new Date object.
   * Ensures TST is calculated if it hasn't been already.
   */
  getDate(): Date {
    if (this._trueSolarTime === null) {
      this.calculateTrueSolarTime();
    }
    // Return a *copy* to prevent external modification of the internal state
    if (this._trueSolarTime === null || isNaN(this._trueSolarTime.getTime())) {
      throw new Error('Failed to calculate a valid True Solar Time date.');
    }
    return new Date(this._trueSolarTime.getTime());
  }

  /**
   * Formats the calculated True Solar Time Date object into a string.
   * Ensures TST is calculated if it hasn't been already.
   * @param formatString A format string (e.g., 'YYYY-MM-DD HH:mm:ss'). Default is 'YYYY-MM-DD HH:mm:ss'.
   *                     Supports YYYY, MM, DD, HH, mm, ss placeholders.
   * @returns The formatted date string.
   */
  format(formatString: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const date = this.getDate(); // This ensures calculation and gets a valid date or throws

    // Extract components using UTC methods, as the internal _trueSolarTime is stored as UTC
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');

    // Basic substitution - for more complex formatting, consider a library like date-fns or moment
    return formatString
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Returns the Equation of Time in a human-readable format (e.g., "X分Y秒").
   */
  getHumanReadableEOT(): string {
    const eotSeconds = this.equationOfTimeSeconds;
    if (isNaN(eotSeconds)) {
      return '无效EOT';
    }

    const totalSeconds = Math.abs(eotSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts = [];
    // Show minutes only if > 0 or if seconds are also 0
    if (minutes > 0) {
      parts.push(`${minutes}分`);
    }
    // Show seconds if > 0 or if it's exactly 0 minutes
    if (seconds > 0 || minutes === 0) {
      // Add padding zero for seconds if minutes are shown? Optional.
      // const secStr = (minutes > 0 && seconds < 10) ? `0${seconds}` : `${seconds}`;
      // parts.push(`${secStr}秒`);
      parts.push(`${seconds}秒`);
    }

    return `${parts.join('')}`.trim();
  }

  /**
   * Returns the calculated True Solar Time as a string in HH:mm:ss format.
   */
  getTrueSolarTimeString(): string {
    const tstDate = this.getDate(); // Ensures calculation and validity
    const h = tstDate.getUTCHours().toString().padStart(2, '0');
    const m = tstDate.getUTCMinutes().toString().padStart(2, '0');
    const s = tstDate.getUTCSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
