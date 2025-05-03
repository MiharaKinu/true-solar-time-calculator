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
      const B_rad = AstroUtils.degreesToRadians(
        (360 / 365) * (this.dayOfYear - 81)
      ); // Simplified angular day
      const eotMinutesApprox =
        9.87 * Math.sin(2 * B_rad) -
        7.53 * Math.cos(B_rad) -
        1.5 * Math.sin(B_rad);
      this._equationOfTimeSeconds = eotMinutesApprox * 60;
    }
    if (isNaN(this._equationOfTimeSeconds)) {
      console.warn(
        'Equation of Time calculation resulted in NaN. Check input date and formulas.'
      );
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
   * @param formatString A format string (e.g., 'YYYY-MM-DD HH:mm:ss'). Default is 'YYYY-MM-DD HH:mm:ss'.
   *                     Supports YYYY, MM, DD, HH, mm, ss placeholders.
   * @returns The formatted date string.
   */
  format(formatString = 'YYYY-MM-DD HH:mm:ss'): string {
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
