# kami-batch

[![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

A fast and efficient 2D sprite batcher based loosely on LibGDX's implementation.

## Usage

[![NPM](https://nodei.co/npm/kami-batch.png)](https://nodei.co/npm/kami-batch/)

See [examples](examples/) folder for details. A full program could look like this:

```js
//setup a canvas
var gl = require('webgl-context')({
    width: 512,
    height: 512
});

//an opaque white texture, useful for tinting lines and rectangles
var tex = require('kami-white-texture')(gl);

//create a sprite batcher
var batch = require('kami-batch')(gl);

batch.begin();

//tint the vertex attributes
batch.setColor(1,0,0);

//draw some sprites
batch.draw(tex, 0, 0, 256, 256);
batch.draw(tex, 5, 5, 12, 51);

//submit to GPU
batch.end();

//add to DOM
document.body.appendChild( gl.canvas );
```

## Planned Changes

- use projection matrices instead of a vector
- support rotation on the fly

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/kami-batch/blob/master/LICENSE.md) for details.
 