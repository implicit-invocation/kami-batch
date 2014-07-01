var getPixels = require('canvas-pixels').get3d;

var SpriteBatch = require('./');
var test = require('tape').test;

test('draws texture colors', function(t) {
    var gl = require('webgl-context')({ width: 1, height: 1 });

    //a white texture is often useful for tinting lines and rectangles
    var tex = require('kami-white-texture')(gl);
    
    var batch = new SpriteBatch(gl);

    batch.begin();
    batch.setColor(1, 0, 0, 1);
    batch.draw(tex, 0, 0, 10, 10);
    batch.end();

    var pix = getPixels(gl);
    t.ok( pix[0]===255 && pix[1]===0 && pix[2]===0, 'setColor tints texture color' );
    t.end();
});