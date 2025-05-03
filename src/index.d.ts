declare class TrueSolarTimeCalculator {
  /**
   * Creates an instance of the calculator.
   * @param inputDate The input Date object. Assumed to represent a moment in UTC.
   * @param longitude Observer's longitude in degrees (-180 to 180, positive East).
   * @param latitude Observer's latitude in degrees (-90 to 90, positive North).
   */
  constructor(inputDate: Date, longitude: number, latitude: number);

  /** Gets a copy of the initial UTC Date used for calculations. */
  get utcDate(): Date;

  /** Gets the observer's longitude. */
  get longitude(): number;

  /** Gets the observer's latitude. */
  get latitude(): number;

  /**
   * Gets the Julian Day (JD) based on the initial UTC date.
   * JD is the number of days since noon Universal Time (UT) on January 1, 4713 BCE.
   */
  get julianDay(): number;

  /**
   * Gets the Equation of Time (EoT) in seconds.
   * EoT is the difference between apparent solar time and mean solar time.
   * Positive EoT means the Sun is "fast" (transits before mean noon).
   * Negative EoT means the Sun is "slow" (transits after mean noon).
   */
  get equationOfTimeSeconds(): number;

  /**
   * Gets the day of the year (1-366) for the initial UTC date.
   */
  get dayOfYear(): number;

  /**
   * Calculates the True Solar Time (TST) and stores it internally.
   * Returns the calculator instance for method chaining.
   */
  calculateTrueSolarTime(): this;

  /**
   * Returns the calculated True Solar Time as a new Date object.
   * Ensures TST is calculated if it hasn't been already.
   */
  getDate(): Date;

  /**
   * Formats the calculated True Solar Time Date object into a string.
   * @param formatString A format string (e.g., 'YYYY-MM-DD HH:mm:ss'). Default is 'YYYY-MM-DD HH:mm:ss'.
   *                     Supports YYYY, MM, DD, HH, mm, ss placeholders.
   * @returns The formatted date string.
   */
  format(formatString?: string): string;

  /**
   * Returns the Equation of Time in a human-readable format (e.g., "X分Y秒").
   */
  getHumanReadableEOT(): string;

  /**
   * Returns the calculated True Solar Time as a string in HH:mm:ss format.
   */
  getTrueSolarTimeString(): string;
}

export { TrueSolarTimeCalculator };
