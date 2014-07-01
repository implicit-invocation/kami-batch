//An example of using kami-batch with
//other light-weight GL wrappers, like modules-gl.

//Basically the texture object just needs to expose `bind()`,
//and ideally width/height (for default draw() options to work)

//setup a canvas
var gl = require('webgl-context')({
    width: 512,
    height: 512
});

//grab a ndarray texture
var lena = require('lena');

//create a texture with modules-gl
var tex = require('gl-texture2d')(gl, lena);

//create a sprite batcher
var batch = require('../')(gl);

//Will call tex.bind()
//Note: gl-texture2d doesn't expose width/height
//      so we can't use draw() with default args
batch.begin();
batch.setColor(1,1,1,0.85); //draw at 85% opacity
batch.draw(tex, 0, 0, 512, 512);
batch.end();

//add to DOM
document.body.appendChild( gl.canvas );