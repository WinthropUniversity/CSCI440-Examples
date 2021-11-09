"use strict";


/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Reads OBJ files, sets up lighting, etc..
 */

// This is to use for debugging purpose
const gIdentity = mat4(1, 0, 0 ,0,
                       0, 1, 0, 0,
                       0, 0, 1, 0,
                       0, 0, 0, 1);


// The global gl and shader hooks to cheat for rendering
var ggl = null;
var gShaderProgram = null;
var gCanvas = null;
var gParticleField = null;

/**
 *  Setup the vertex and fragment shader programs for WebGL.  This 
 *  allows us to be able to display in color (among other things).
 *  The shaders are a part of the overall graphics pipeline, and 
 *  that component uses a special language called GLSL, which allows
 *  it to be extremely versatile in terms of textures, lighting, etc.,
 *  even though it seems unnecessarily complicated for our simple program.
 * 
 * @param {Object} gl - The WegGL graphic library object
 * @returns The shader program object so that attributes can be attached later
 */
 function SetupShaders(gl) {
    // Attach the GLSL code to the vertex shader, then compile it
    var vertexShaderCode =  "attribute vec4 vPosition;" +  // in-coming vertex point
                            "void main() {" +
                            "  gl_Position = vPosition;" +
                            "  gl_PointSize = 3.0;" +
                            "}"
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);
    var compileSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
    if (!compileSuccess) {
        console.log('Vertex shader failed to compile!');    
        var compilationLog = gl.getShaderInfoLog(vertexShader);
        console.log('Shader compiler log: ' + compilationLog);
    }

    // Attach the GLSL code to the fragment shader, then compile it
    var fragmentShaderCode = "precision mediump float;" +
                             "void main() {" + 
                             "      gl_FragColor = vec4(0.75,0.75,1,1);" +  // Combine texture
                             "}"
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);  
    compileSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (!compileSuccess) {
      console.log('Fragment shader failed to compile!');    
      var compilationLog = gl.getShaderInfoLog(fragmentShader);
      console.log('Shader compiler log: ' + compilationLog);
    }
  
    // Create the shader program, attach both shaders in the pipline,
    // then tell WebGL to use that program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);   
    
    if ( !gl.getProgramParameter( shaderProgram, gl.LINK_STATUS) ) {
      var info = gl.getProgramInfoLog(shaderProgram);
      console.log('Could not compile WebGL program: ' + info);
    }

    return shaderProgram;
}




/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 */
function render() {
    ggl.clear( ggl.COLOR_BUFFER_BIT | ggl.DEPTH_BUFFER_BIT);

    gParticleField.UpdateAccelerations(0.01);
    gParticleField.UpdateVelocities(1);
    gParticleField.UpdatePositions(1);
    gParticleField.UpdateGPU();

    //ggl.drawArrays(ggl.TRIANGLES, 0, gParticleField.positions.length);
    ggl.drawArrays(ggl.POINTS, 0, gParticleField.positions.length);

    window.requestAnimFrame(function() {render();});    
}


    // --- Setup WebGL and Shaders ---

    // Create the WebGL interface object and attach it to the 
    // canvas specified in the HTML file.  Give an error if WebGL
    // is not found
async function main() {
    var canvas = document.getElementById( "gl-canvas" );
    var gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 0.4, 0.4, 0.4, 1.0 );              // BG:  Opaque Gray
    gl.enable(gl.DEPTH_TEST);

    // Setup the vertex and fragment shaders
    var shaderProgram = SetupShaders(gl);

    gParticleField = new ParticleField(gl, shaderProgram, 1000, 10, [-1,1], [-1,1], [-1,1]);
    gParticleField.InitialGPULoad();

  
    // --- Setup event handlers and draw those things! ---
    ggl = gl;
    gShaderProgram = shaderProgram;
    gCanvas = canvas;
    render();
};

window.onload = function init() {
  main();
}
