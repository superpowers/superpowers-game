/**
 * Seedable random number generator functions.
 * @version 1.0.0
 * @license Public Domain
 *
 * @example
 * var rng = new RNG('Example');
 * rng.random(40, 50);  // =>  42
 * rng.uniform();       // =>  0.7972798995050903
 * rng.normal();        // => -0.6698504543216376
 * rng.exponential();   // =>  1.0547367609131555
 * rng.poisson(4);      // =>  2
 * rng.gamma(4);        // =>  2.781724687386858
 */
declare class RNG {

  /**
   * Create a new random number generator with optional seed. If the
   * provided seed is a function (i.e. Math.random) it will be used as
   * the uniform number generator.
   * @param seed An arbitrary object used to seed the generator.
   * @constructor
   */
  constructor(seed?: string);

  /**
   * @returns {number} Uniform random number between 0 and 255.
   */
  nextByte(): number;

  /**
   * @returns {number} Uniform random number between 0 and 1.
   */
  uniform(): number;

  /**
   * Produce a random integer within [n, m).
   * @param {number} [n=0]
   * @param {number} m
   *
   */
  random(n?: number, m?: number): number;

  /**
   * Generates numbers using this.uniform() with the Box-Muller transform.
   * @returns {number} Normally-distributed random number of mean 0, variance 1.
   */
  normal(): number;

  /**
   * Generates numbers using this.uniform().
   * @returns {number} Number from the exponential distribution, lambda = 1.
   */
  exponential(): number;

  /**
   * Generates numbers using this.uniform() and Knuth's method.
   * @param {number} [mean=1]
   * @returns {number} Number from the Poisson distribution.
   */
  poisson(mean?: number): number;

  /**
   * Generates numbers using this.uniform(), this.normal(),
   * this.exponential(), and the Marsaglia-Tsang method.
   * @param {number} a
   * @returns {number} Number from the gamma distribution.
   */
  gamma(a: number): number;

  /**
   * Accepts a dice rolling notation string and returns a generator
   * function for that distribution. The parser is quite flexible.
   * @param {string} expr A dice-rolling, expression i.e. '2d6+10'.
   * @param {RNG} rng An optional RNG object.
   * @returns {Function}
   */
  static roller(expr: string, rng?: RNG): number;
}
