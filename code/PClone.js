var { Vector } = require('Vector');
var { PerlinNoise } = require('PerlinNoise');
var { constrain, dist, lerp, mag, radians, degrees, map, norm } = require('math-utils');

function PClone() {
  this.seeded = false;
  this.color_mode = ('RGB');
};

/*
********************** Calculations **************************
*/
PClone.prototype.constrain = constrain;
PClone.prototype.dist = dist;
PClone.prototype.lerp = lerp;
PClone.prototype.degrees = degrees;
PClone.prototype.radians = radians;
PClone.prototype.map = map;
PClone.prototype.mag = mag;
PClone.prototype.norm = norm;

/*
********************** random() **********************
*/

PClone.prototype.random = function (min, max) {
  var rand;
  if (this.seeded) {
    rand = lcg.rand();
  } else {
    rand = Math.random();
  }
  if (typeof min === 'undefined') {
    return rand;
  } else if (typeof max === 'undefined') {
    if (min instanceof Array) {
      return min[Math.floor(rand * min.length)];
    } else {
      return rand * min;
    }
  } else {
    if (min > max) {
      var tmp = min;
      min = max;
      max = tmp;
    }

    return rand * (max - min) + min;
  }
};

PClone.prototype.randomseed = function (seed) {
  lcg.setSeed(seed);
  this.seeded = true;
  previous = false;
};

// PClone.prototype.noise = new PerlinNoise();
// PClone.prototype.noise_detail = this.noise.set_detail();

var PERLIN_YWRAPB = 4;
var PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
var PERLIN_ZWRAPB = 8;
var PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
var PERLIN_SIZE = 4095;

var perlin_octaves = 4; // default to medium smooth
var perlin_amp_falloff = 0.5; // 50% reduction/octave
var perlin; // will be initialized lazily by noise() or noise_seed()

PClone.prototype.noise = function (x, y, z) {
  y = y || 0;
  z = z || 0;

  if (perlin == null) {
    perlin = new Array(PERLIN_SIZE + 1);
    for (var i = 0; i < PERLIN_SIZE + 1; i++) {
      perlin[i] = Math.random();
    }
  }

  if (x < 0) {
    x = -x;
  }
  if (y < 0) {
    y = -y;
  }
  if (z < 0) {
    z = -z;
  }

  var xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  var xf = x - xi;
  var yf = y - yi;
  var zf = z - zi;
  var rxf, ryf;

  var r = 0;
  var ampl = 0.5;

  var n1, n2, n3;

  for (var o = 0; o < perlin_octaves; o++) {
    var of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);

    rxf = scaled_cosine(xf);
    ryf = scaled_cosine(yf);

    n1 = perlin[of & PERLIN_SIZE];
    n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
    n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);

    of += PERLIN_ZWRAP;
    n2 = perlin[of & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
    n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);

    n1 += scaled_cosine(zf) * (n2 - n1);

    r += n1 * ampl;
    ampl *= perlin_amp_falloff;
    xi <<= 1;
    xf *= 2;
    yi <<= 1;
    yf *= 2;
    zi <<= 1;
    zf *= 2;

    if (xf >= 1.0) {
      xi++;
      xf--;
    }
    if (yf >= 1.0) {
      yi++;
      yf--;
    }
    if (zf >= 1.0) {
      zi++;
      zf--;
    }
  }
  return r;
};

/**
 *
 * Adjusts the character and level of detail produced by the Perlin noise
 * function. Similar to harmonics in physics, noise is computed over
 * several octaves. Lower octaves contribute more to the output signal and
 * as such define the overall intensity of the noise, whereas higher octaves
 * create finer grained details in the noise sequence.
 * <br><br>
 * By default, noise is computed over 4 octaves with each octave contributing
 * exactly half than its predecessor, starting at 50% strength for the 1st
 * octave. This falloff amount can be changed by adding an additional function
 * parameter. Eg. a falloff factor of 0.75 means each octave will now have
 * 75% impact (25% less) of the previous lower octave. Any value between
 * 0.0 and 1.0 is valid, however note that values greater than 0.5 might
 * result in greater than 1.0 values returned by noise()
 * By changing these parameters, the signal created by the noise()
 * function can be adapted to fit very specific needs and characteristics.
 */

PClone.prototype.noise_detail = function (lod, falloff) {
  if (lod > 0) {
    perlin_octaves = lod;
  }
  if (falloff > 0) {
    perlin_amp_falloff = falloff;
  }
};

/**
 * Sets the seed value for noise(). By default, noise()
 * produces different results each time the program is run. Set the
 * <b>value</b> parameter to a constant to return the same pseudo-random
 * numbers each time the software is run.
 */

PClone.prototype.noise_seed = function (seed) {
  // Linear Congruential Generator
  // Variant of a Lehman Generator
  var lcg = (function () {
    // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
    // m is basically chosen to be large (as it is the max period)
    // and for its relationships to a and c
    var m = 4294967296;
    // a - 1 should be divisible by m's prime factors
    var a = 1664525;
    // c and m should be co-prime
    var c = 1013904223;
    var seed, z;
    return {
      setSeed: function (val) {
        // pick a random seed if val is undefined or null
        // the >>> 0 casts the seed to an unsigned 32-bit integer
        z = seed = (val == null ? Math.random() * m : val) >>> 0;
      },
      getSeed: function () {
        return seed;
      },
      rand: function () {
        // define the recurrence relationship
        z = (a * z + c) % m;
        // return a float in [0, 1)
        // if z = m then z / m = 0 therefore (z % m) / m < 1 always
        return z / m;
      }
    };
  })();
}


/***************************** Vector *********************************/

PClone.Vector = Vector;

// Object.assign(PClone, { Vector });

PClone.prototype.create_vector = function (x, y, z) {
  if (this instanceof PClone) {
    return new PClone.Vector(this, arguments);
  } else {
    return new PClone.Vector(x, y, z);
  }
};

/**
 * Convert an HSBA array to HSLA.
 */

PClone.prototype.hsba_to_hsla = function (hsba) {

  if (!(arguments[0] instanceof Array)) {
    error('PClone.prototype.hsba_to_hsla:',
      'input should be an array of normalized [H,S,B,A]');
    post();
    return null;
  }

  var hue = hsba[0];
  var sat = hsba[1];
  var val = hsba[2];

  // if the array is missing the alpha channel
  // we just set it to 1;
  if (typeof hsba[3] === 'undefined') {
    hsba[3] = 1;
  }

  // Calculate lightness.
  var li = (2 - sat) * val / 2;

  // Convert saturation.
  if (li !== 0) {
    if (li === 1) {
      sat = 0;
    } else if (li < 0.5) {
      sat = sat / (2 - sat);
    } else {
      sat = sat * val / (2 - li * 2);
    }
  }
  // Hue and alpha stay the same.
  return [hue, sat, li, hsba[3]];

};

PClone.prototype.hsb_to_hsl = function (hsb) {
  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.hsb_to_hsl expects an array of normalized [H,S,B] as input");
    post();
    return null;
  }
  var hsla = this.hsba_to_hsla(hsb);
  return hsla.slice(0, 3);
}

/**
 * Convert an HSLA array to RGBA.
 *
 * We need to change basis from HSLA to something that can be more easily be
 * projected onto RGBA. We will choose hue and brightness as our first two
 * components, and pick a convenient third one ('zest') so that we don't need
 * to calculate formal HSBA saturation.
 */
PClone.prototype.hsla_to_rgba = function (hsla) {

  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.hsla_to_rgba expects an array of normalized [H,S,L,A] as input");
    post();
    return null;
  }

  var hue = hsla[0] * 6; // We will split hue into 6 sectors.
  var sat = hsla[1];
  var li = hsla[2];

  // if the array is missing the alpha channel
  // we just set it to 1;
  if (typeof hsla[3] === 'undefined') {
    hsla[3] = 1;
  }

  var RGBA = [];

  if (sat === 0) {
    RGBA = [li, li, li, hsla[3]]; // Return early if grayscale.
  } else {
    // Calculate brightness.
    var val;
    if (li < 0.5) {
      val = (1 + sat) * li;
    } else {
      val = li + sat - li * sat;
    }

    // Define zest.
    var zest = 2 * li - val;

    // Implement projection (project onto green by default).
    var hzvToRGB = function (hue, zest, val) {
      if (hue < 0) {
        // Hue must wrap to allow projection onto red and blue.
        hue += 6;
      } else if (hue >= 6) {
        hue -= 6;
      }
      if (hue < 1) {
        // Red to yellow (increasing green).
        return zest + (val - zest) * hue;
      } else if (hue < 3) {
        // Yellow to cyan (greatest green).
        return val;
      } else if (hue < 4) {
        // Cyan to blue (decreasing green).
        return zest + (val - zest) * (4 - hue);
      } else {
        // Blue to red (least green).
        return zest;
      }
    };

    // Perform projections, offsetting hue as necessary.
    RGBA = [
      hzvToRGB(hue + 2, zest, val),
      hzvToRGB(hue, zest, val),
      hzvToRGB(hue - 2, zest, val),
      hsla[3]
    ];
  }
};

PClone.prototype.hsl_to_rgb = function (hsl) {
  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.hsl_to_rgb expects an array of normalized [H,S,L] as input");
    post();
    return null;
  }
  var rgba = this.hsla_to_rbga(hsl);
  return rgba.slice(0, 3);
}

/**
 * Convert an RGBA array to HSBA array.
 */
PClone.rgba_to_hsba = function (rgba) {
  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.rgba_to_hsba expects an array of normalized [R,G,B,A] as input");
    post();
    return null;
  }
  var red = rgba[0];
  var green = rgba[1];
  var blue = rgba[2];

  if (typeof rgba[3] === 'undefined') {
    rgba[3] = 1;
  }

  var val = Math.max(red, green, blue);
  var chroma = val - Math.min(red, green, blue);

  var hue, sat;
  if (chroma === 0) {
    // Return early if grayscale.
    hue = 0;
    sat = 0;
  } else {
    sat = chroma / val;
    if (red === val) {
      // Magenta to yellow.
      hue = (green - blue) / chroma;
    } else if (green === val) {
      // Yellow to cyan.
      hue = 2 + (blue - red) / chroma;
    } else if (blue === val) {
      // Cyan to magenta.
      hue = 4 + (red - green) / chroma;
    }
    if (hue < 0) {
      // Confine hue to the interval [0, 1).
      hue += 6;
    } else if (hue >= 6) {
      hue -= 6;
    }
  }
  return [hue / 6, sat, val, rgba[3]];
};

PClone.prototype.rgb_to_hsb = function (rgb) {
  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.rgb_to_hsb expects an array of normalized [R,G,B] as input");
    post();
    return null;
  }
  var hsba = this.rgba_to_hsba(rgb);
  return hsba.slice(0, 3);
}

/**
 * Convert an HSBA array to RGBA.
 */
PClone.prototype.hsba_to_rgba = function (hsba) {

  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.hsba_to_rgba expects an array of normalized [H,S,B,A] as input");
    post();
    return null;
  }

  var hue = hsba[0] * 6; // We will split hue into 6 sectors.
  var sat = hsba[1];
  var val = hsba[2];

  if (typeof hsba[3] === 'undefined') {
    hsba[3] = 1;
  }

  var RGBA = [];

  if (sat === 0) {
    RGBA = [val, val, val, hsba[3]]; // Return early if grayscale.
  } else {
    var sector = Math.floor(hue);
    var tint1 = val * (1 - sat);
    var tint2 = val * (1 - sat * (hue - sector));
    var tint3 = val * (1 - sat * (1 + sector - hue));
    var red, green, blue;
    if (sector === 1) {
      // Yellow to green.
      red = tint2;
      green = val;
      blue = tint1;
    } else if (sector === 2) {
      // Green to cyan.
      red = tint1;
      green = val;
      blue = tint3;
    } else if (sector === 3) {
      // Cyan to blue.
      red = tint1;
      green = tint2;
      blue = val;
    } else if (sector === 4) {
      // Blue to magenta.
      red = tint3;
      green = tint1;
      blue = val;
    } else if (sector === 5) {
      // Magenta to red.
      red = val;
      green = tint1;
      blue = tint2;
    } else {
      // Red to yellow (sector could be 0 or 6).
      red = val;
      green = tint3;
      blue = tint1;
    }
    RGBA = [red, green, blue, hsba[3]];
  }

  return RGBA;
};

PClone.prototype.hsb_to_rgb = function (hsb) {
  if (!(arguments[0] instanceof Array)) {
    error("PClone.prototype.hsb_to_rgb expects an array of normalized [H,S,B] as input");
    post();
    return null;
  }

  var hsba = [hsb[0], hsb[1], hsb[2], 1];
  var rgba = this.hsba_to_rgba(hsba);
  return rgba.slice(0, 3);
}

PClone.prototype.load_image = function (img) {
  return new Image(this.img);
}

PClone.prototype.set_color_mode = function (mode) {

}

PClone.Color = function (c1, c2, c3, c4) {

  this.channel_1;
  this.channel_2;
  this.channel_3;
  this.channel_4;

  if (arguments[0] instanceof Array) {
    this.channel_1 = arguments[0][0] || 0;
    this.channel_2 = arguments[0][1] || 0;
    this.channel_3 = arguments[0][2] || 0;
    this.channel_4 = arguments[0][3] || 100;
  } else {
    this.channel_1 = c1 || 0;
    this.channel_2 = c2 || 0;
    this.channel_3 = c3 || 0;
    this.channel_4 = c4 || 100;
  }




  PClone.Color.set_color_mode(mode, max_c1, max_c2, max_c3, max_4) = function () {
    if (mode.toLowCase() === 'hsb' || mode.toLowCase() === 'hsl') {
      this.max_value_1 = max_c1 || 360;
      this.max_value_2 = max_c2 || 100;
      this.max_value_3 = max_c3 || 100;
      this.max_value_4 = max_c4 || 100;
    } else if (mode.toLowCase() === 'rgb') {
      this.max_value_1 = max_c1 || 360;
      this.max_value_2 = max_c2 || 100;
      this.max_value_3 = max_c3 || 100;
      this.max_value_4 = max_c4 || 100;
    }
  }

  PClone.Color.normalize = function () {
    this.channel_1 / this.max_value_1;
    this.channel_2 / this.max_value_2;
    this.channel_3 / this.max_value_3;
    this.channel_4 / this.max_value_4;
  }

}

// Linear Congruential Generator
// Variant of a Lehman Generator
var lcg = (function () {
  // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
  // m is basically chosen to be large (as it is the max period)
  // and for its relationships to a and c
  var m = 4294967296,
    // a - 1 should be divisible by m's prime factors
    a = 1664525,
    // c and m should be co-prime
    c = 1013904223,
    seed,
    z;
  return {
    setSeed: function (val) {
      // pick a random seed if val is undefined or null
      // the >>> 0 casts the seed to an unsigned 32-bit integer
      z = seed = (val == null ? Math.random() * m : val) >>> 0;
    },
    getSeed: function () {
      return seed;
    },
    rand: function () {
      // define the recurrence relationship
      z = (a * z + c) % m;
      // return a float in [0, 1)
      // if z = m then z / m = 0 therefore (z % m) / m < 1 always
      return z / m;
    }
  };
})();

function hypot(x, y, z) {
  var length = arguments.length;
  var args = [];
  var max = 0;
  for (var i = 0; i < length; i++) {
    var n = arguments[i];
    n = +n;
    if (n === Infinity || n === -Infinity) {
      return Infinity;
    }
    n = Math.abs(n);
    if (n > max) {
      max = n;
    }
    args[i] = n;
  }

  if (max === 0) {
    max = 1;
  }
  var sum = 0;
  var compensation = 0;
  for (var j = 0; j < length; j++) {
    var m = args[j] / max;
    var summand = m * m - compensation;
    var preliminary = sum + summand;
    compensation = preliminary - sum - summand;
    sum = preliminary;
  }
  return Math.sqrt(sum) * max;
}

var scaled_cosine = function (i) {
  return 0.5 * (1.0 - Math.cos(i * Math.PI));
};

exports.PClone = PClone;
