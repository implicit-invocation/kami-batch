/**
 * A fast and efficient 2D sprite batcher.
 * 
 * @module kami-batch
 */

// Requires....
var Class = require('klasse');

var Mesh = require('kami-mesh-buffer');
var ShaderProgram = require('kami-shader');
var BaseBatch = require('kami-base-batch');
var mat4 = require('gl-matrix').mat4;

/**
 * A basic implementation of a batcher which draws 2D sprites.
 * This uses two triangles (quads) with indexed and interleaved
 * vertex data. Each vertex holds 5 floats (Position.xy, Color, TexCoord0.xy).
 *
 * The color is packed into a single float to reduce vertex bandwidth, and
 * the data is interleaved for best performance. We use a static index buffer,
 * and a dynamic vertex buffer that is updated with bufferSubData. 
 * 
 * @example
 *      //create a new batcher
 *      var batch = require('kami-batch')(context);
 *
 *      function render() {
 *          batch.begin();
 *          
 *          //draw some sprites in between begin and end...
 *          batch.draw( texture, 0, 0, 25, 32 );
 *          batch.draw( texture1, 0, 25, 42, 23 );
 * 
 *          batch.end();
 *      }
 * 
 * @class  SpriteBatch
 * @uses BaseBatch
 * @constructor
 * @param {WebGLContext} context the context for this batch
 * @param {Object} options the options
 * @param {Number} options.size the optional size of this batch, i.e. max number of quads
 */
var SpriteBatch = new Class({
	//inherit some stuff onto this prototype
	Mixins: BaseBatch,

	//Constructor
	initialize: function SpriteBatch(context, options) {
		if (!(this instanceof SpriteBatch))
			return new SpriteBatch(context, options);
		BaseBatch.call(this, context, options);

		/**
		 * The projection Float32Array vec2 which is
		 * used to avoid some matrix calculations.
		 *
		 * @property projection
		 * @type {Float32Array}
		 */
		// this.projection = new Float32Array(2);

		// var ctxCanvas = this.context.gl.canvas;
		//Sets up a default projection vector so that the batch works without setProjection
		// this.projection[0] = ctxCanvas.width/2;
		// this.projection[1] = ctxCanvas.height/2;
		this.projection = mat4.create();

		/**
		 * The currently bound texture. Do not modify.
		 * 
		 * @property {Texture} texture
		 * @readOnly
		 */
		this.texture = null;
	},

	/**
	 * This is a convenience function to set the batch's projection
	 * matrix to an orthographic 2D projection, based on the given screen
	 * size. This allows users to render in 2D without any need for a camera.
	 * 
	 * @param  {[type]} width  [description]
	 * @param  {[type]} height [description]
	 * @return {[type]}        [description]
	 */
	resize: function(width, height) {
		this.setProjection(width / 2, height / 2);
	},

	/**
	 * The number of floats per vertex for this batcher 
	 * (Position.xy + Color + TexCoord0.xy).
	 *
	 * @method  getVertexSize
	 * @return {Number} the number of floats per vertex
	 */
	getVertexSize: function() {
		return SpriteBatch.VERTEX_SIZE;
	},

	/**
	 * Used internally to return the Position, Color, and TexCoord0 attributes.
	 *
	 * @method  _createVertexAttribuets
	 * @protected
	 * @return {[type]} [description]
	 */
	_createVertexAttributes: function() {
		var gl = this.context.gl;

		return [
			new Mesh.Attrib(ShaderProgram.POSITION_ATTRIBUTE, 2),
			//pack the color for smaller CPU -> GPU bandwidth
			new Mesh.Attrib(
				ShaderProgram.COLOR_ATTRIBUTE,
				4,
				null,
				gl.UNSIGNED_BYTE,
				true,
				1
			),
			new Mesh.Attrib(ShaderProgram.TEXCOORD_ATTRIBUTE + '0', 2)
		];
	},

	/**
	 * Sets the projection vector, an x and y
	 * defining the middle points of your stage.
	 *
	 * @method setProjection
	 * @param {Number} x the x projection value
	 * @param {Number} y the y projection value
	 */
	setProjection: function(mat4) {
		this.projection = mat4;
		if (this.drawing && (x != oldX || y != oldY)) {
			this.flush();
			this.updateMatrices();
		}
	},

	/**
	 * Creates a default shader for this batch.
	 *
	 * @method  _createShader
	 * @protected
	 * @return {ShaderProgram} a new instance of ShaderProgram
	 */
	_createShader: function() {
		var shader = new ShaderProgram(
			this.context,
			SpriteBatch.DEFAULT_VERT_SHADER,
			SpriteBatch.DEFAULT_FRAG_SHADER
		);
		if (shader.log) console.warn('Shader Log:\n' + shader.log);
		return shader;
	},

	/**
	 * This is called during rendering to update projection/transform
	 * matrices and upload the new values to the shader. For example,
	 * if the user calls setProjection mid-draw, the batch will flush
	 * and this will be called before continuing to add items to the batch.
	 *
	 * You generally should not need to call this directly.
	 * 
	 * @method  updateMatrices
	 * @protected
	 */
	updateMatrices: function() {
		this.shader.setUniformMatrix4('u_projection', this.projection);
	},

	/**
	 * Called before rendering, and binds the current texture.
	 * 
	 * @method _preRender
	 * @protected
	 */
	_preRender: function() {
		if (this.texture) this.texture.bind();
	},

	/**
	 * Binds the shader, disables depth writing, 
	 * enables blending, activates texture unit 0, and sends
	 * default matrices and sampler2D uniforms to the shader.
	 *
	 * @method  begin
	 */
	begin: function() {
		//sprite batch doesn't hold a reference to GL since it is volatile
		var gl = this.context.gl;

		//This binds the shader and mesh!
		BaseBatch.prototype.begin.call(this);

		this.updateMatrices(); //send projection/transform to shader

		//upload the sampler uniform. not necessary every flush so we just
		//do it here.
		this.shader.setUniformi('u_texture0', 0);

		//disable depth mask
		gl.depthMask(false);
	},

	/**
	 * Ends the sprite batcher and flushes any remaining data to the GPU.
	 * 
	 * @method end
	 */
	end: function() {
		//sprite batch doesn't hold a reference to GL since it is volatile
		var gl = this.context.gl;

		//just do direct parent call for speed here
		//This binds the shader and mesh!
		BaseBatch.prototype.end.call(this);

		gl.depthMask(true);
	},

	/**
	 * Flushes the batch to the GPU. This should be called when
	 * state changes, such as blend functions, depth or stencil states,
	 * shaders, and so forth.
	 * 
	 * @method flush
	 */
	flush: function() {
		//ignore flush if texture is null or our batch is empty
		if (!this.texture) return;
		if (this.idx === 0) return;
		BaseBatch.prototype.flush.call(this);
		SpriteBatch.totalRenderCalls++;
	},

	drawRegion: function(region, x, y, width, height) {
		this.draw(
			region.texture,
			x,
			y,
			width,
			height,
			region.u,
			region.v,
			region.u2,
			region.v2
		);
	},

	/**
	 * Adds a sprite to this batch. The sprite is drawn in 
	 * screen-space with the origin at the upper-left corner (y-down).
	 * 
	 * @method draw
	 * @param  {Texture} texture the Texture
	 * @param  {Number} x       the x position in pixels, defaults to zero
	 * @param  {Number} y       the y position in pixels, defaults to zero
	 * @param  {Number} width   the width in pixels, defaults to the texture width
	 * @param  {Number} height  the height in pixels, defaults to the texture height
	 * @param  {Number} u1      the first U coordinate, default zero
	 * @param  {Number} v1      the first V coordinate, default zero
	 * @param  {Number} u2      the second U coordinate, default one
	 * @param  {Number} v2      the second V coordinate, default one
	 */
	draw: function(
		texture,
		x,
		y,
		width,
		height,
		originX = 0,
		originY = 0,
		rotation = 0,
		scaleX = 1,
		scaleY = 1,
		u1 = 0,
		v1 = 0,
		u2 = 1,
		v2 = 1
	) {
		if (!this.drawing)
			throw 'Illegal State: trying to draw a batch before begin()';

		//don't draw anything if GL tex doesn't exist..
		if (!texture) return;

		if (this.texture === null || this.texture.id !== texture.id) {
			//new texture.. flush previous data
			this.flush();
			this.texture = texture;
		} else if (this.idx == this.vertices.length) {
			this.flush(); //we've reached our max, flush before pushing more data
		}

		width = width === 0 ? width : width || texture.width;
		height = height === 0 ? height : height || texture.height;
		x = x || 0;
		y = y || 0;

		var x1 = -originX;
		var x2 = width - originX;
		var x3 = width - originX;
		var x4 = -originX;

		var y1 = -originY;
		var y2 = -originY;
		var y3 = height - originY;
		var y4 = height - originY;

		var c = this.color;

		if (scaleX !== 1) {
			x1 = x1 * scaleX;
			x2 = x2 * scaleX;
			x3 = x3 * scaleX;
			x4 = x4 * scaleX;
		}

		if (scaleY !== 1) {
			y1 = y1 * scaleY;
			y2 = y2 * scaleY;
			y3 = y3 * scaleY;
			y4 = y4 * scaleY;
		}

		if (rotation !== 0) {
			var cos = Math.cos(rotation);
			var sin = Math.sin(rotation);

			var rotatedX1 = cos * x1 - sin * y1;
			var rotatedY1 = sin * x1 + cos * y1;

			var rotatedX2 = cos * x2 - sin * y2;
			var rotatedY2 = sin * x2 + cos * y2;

			var rotatedX3 = cos * x3 - sin * y3;
			var rotatedY3 = sin * x3 + cos * y3;

			var rotatedX4 = cos * x4 - sin * y4;
			var rotatedY4 = sin * x4 + cos * y4;

			x1 = rotatedX1;
			x2 = rotatedX2;
			x3 = rotatedX3;
			x4 = rotatedX4;

			y1 = rotatedY1;
			y2 = rotatedY2;
			y3 = rotatedY3;
			y4 = rotatedY4;
		}

		x1 += x + originX;
		x2 += x + originX;
		x3 += x + originX;
		x4 += x + originX;

		y1 += y + originY;
		y2 += y + originY;
		y3 += y + originY;
		y4 += y + originY;

		//xy
		this.vertices[this.idx++] = x1;
		this.vertices[this.idx++] = y1;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u1;
		this.vertices[this.idx++] = v1;

		//xy
		this.vertices[this.idx++] = x2;
		this.vertices[this.idx++] = y2;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u2;
		this.vertices[this.idx++] = v1;

		//xy
		this.vertices[this.idx++] = x3;
		this.vertices[this.idx++] = y3;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u2;
		this.vertices[this.idx++] = v2;

		//xy
		this.vertices[this.idx++] = x4;
		this.vertices[this.idx++] = y4;
		//color
		this.vertices[this.idx++] = c;
		//uv
		this.vertices[this.idx++] = u1;
		this.vertices[this.idx++] = v2;
	},

	/**
	 * Adds a single quad mesh to this sprite batch from the given
	 * array of vertices. The sprite is drawn in 
	 * screen-space with the origin at the upper-left corner (y-down).
	 *
	 * This reads 20 interleaved floats from the given offset index, in the format
	 *
	 *  { x, y, color, u, v,
	 *      ...  }
	 *
	 * @method  drawVertices
	 * @param {Texture} texture the Texture object
	 * @param {Float32Array} verts an array of vertices
	 * @param {Number} off the offset into the vertices array to read from
	 */
	drawVertices: function(texture, verts, off) {
		if (!this.drawing)
			throw 'Illegal State: trying to draw a batch before begin()';

		//don't draw anything if GL tex doesn't exist..
		if (!texture) return;

		if (this.texture != texture) {
			//new texture.. flush previous data
			this.flush();
			this.texture = texture;
		} else if (this.idx == this.vertices.length) {
			this.flush(); //we've reached our max, flush before pushing more data
		}

		off = off || 0;
		//TODO: use a loop here?
		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];

		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];

		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];

		//xy
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
		//color
		this.vertices[this.idx++] = verts[off++];
		//uv
		this.vertices[this.idx++] = verts[off++];
		this.vertices[this.idx++] = verts[off++];
	}
});

/**
 * The default vertex size, i.e. number of floats per vertex.
 * @attribute  VERTEX_SIZE
 * @static
 * @final
 * @type {Number}
 * @default  5
 */
SpriteBatch.VERTEX_SIZE = 5;

/**
 * Incremented after each draw call, can be used for debugging.
 *
 *     SpriteBatch.totalRenderCalls = 0;
 *
 *     ... draw your scene ...
 *
 *     console.log("Draw calls per frame:", SpriteBatch.totalRenderCalls);
 *
 * 
 * @attribute  totalRenderCalls
 * @static
 * @type {Number}
 * @default  0
 */
SpriteBatch.totalRenderCalls = 0;

SpriteBatch.DEFAULT_FRAG_SHADER = [
	'precision mediump float;',
	'varying vec2 vTexCoord0;',
	'varying vec4 vColor;',
	'uniform sampler2D u_texture0;',

	'void main(void) {',
	'   gl_FragColor = texture2D(u_texture0, vTexCoord0) * vColor;',
	'}'
].join('\n');

SpriteBatch.DEFAULT_VERT_SHADER = [
	'attribute vec4 ' + ShaderProgram.POSITION_ATTRIBUTE + ';',
	'attribute vec4 ' + ShaderProgram.COLOR_ATTRIBUTE + ';',
	'attribute vec2 ' + ShaderProgram.TEXCOORD_ATTRIBUTE + '0;',

	'uniform mat4 u_projection;',
	'varying vec2 vTexCoord0;',
	'varying vec4 vColor;',

	'void main(void) {', ///TODO: use a projection and transform matrix
	'   gl_Position =  u_projection * ' + ShaderProgram.POSITION_ATTRIBUTE + ';',
	'   vTexCoord0 = ' + ShaderProgram.TEXCOORD_ATTRIBUTE + '0;',
	'   vColor = ' + ShaderProgram.COLOR_ATTRIBUTE + ';',
	'   vColor.a = vColor.a * (256.0/255.0);', //this is so the alpha sits at 0.0 or 1.0
	'}'
].join('\n');

module.exports = SpriteBatch;
