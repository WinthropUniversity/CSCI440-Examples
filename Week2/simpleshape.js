"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates how to draw filled-in polygons in WebGL
 */


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
 function setupShaders(gl) {
    // Attach the GLSL code to the vertex shader, then compile it
    // The vertex shader decides *where on the canvas* vertices will go
    var vertexShaderCode =  "attribute vec4 position;" +  // in-coming parameter
                            "attribute vec3 color;" +     // in-coming parameter
                            "varying vec3 vColor;" +      // Internal variable to pass arg between shaders
                            "void main() {" +
                            "    gl_PointSize = 15.0;" +
                            "    gl_Position = position;" +
                            "    vColor = color;" +
                            "}"
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // Attach the GLSL code to the fragment shader, then compile it
    // The fragment shader will decide *what color* the pixels representing the objects will be
    var fragmentShaderCode = "precision mediump float;" +
                             "varying vec3 vColor;" +  // Received param between shaders
                             "void main() {" + 
                             "    gl_FragColor = vec4(vColor, 1.0);" +
                             "}"
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);  
    
    // Create the shader program, attach both shaders in the pipline,
    // then tell WebGL to use that program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);   
    
    return shaderProgram;
}



/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 * 
 * @param {Object} gl - The WegGL graphic library object
 * @param {Object} canvas - the DOM canvas object on the webpage
 * @param {array} points - The points of the polygon we are shading
 */
function render(gl, canvas, points) {
    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );              // BG:  Opaque white
    gl.clear( gl.COLOR_BUFFER_BIT );                  // Clear color buffer bit

    // Draw three triangles: p0-p1-p2, p0-p2-p3, p0-p3-p4
    // How would we draw this as five triangles, each with their own solid color?
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
    gl.drawArrays( gl.POINTS, 0, points.length );
    //gl.drawArrays( gl.LINES, 0, points.length );
    //gl.drawArrays( gl.LINE_LOOP, 0, points.length );
}


/**
 *  Load data onto the GPU and associate the buffer with that data.  Then
 *  (if a variable name is given), associate the variable with the one in the
 *  shader.  Return the ID for the GPU buffer, in case it is useful later.
 * @param {Object} gl The interface object to the WebGL library
 * @param {array}  myData Array containing data to load onto the GPU
 * @param {string} shaderVariableStr Name of the variable used by the shader program
 * @param {number} shaderVariableDim Size of each individual shader variable arrays
 * @param {Object} shaderProgram  The object interface for the shader proram
 * @returns 
 */
function LoadDataOnGPU(gl, myData, shaderVariableStr, shaderVariableDim, shaderProgram) {
    // Load the vertex data into the GPU
    var bufferID = gl.createBuffer();                                   // Create space on GPU
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferID );                         // Select that space to much about with
    gl.bufferData( gl.ARRAY_BUFFER, flatten(myData), gl.STATIC_DRAW );  // Load data into space

    // Associate out shader position variables with our data buffer
    if (shaderVariableStr != "") {
      var myVar = gl.getAttribLocation( shaderProgram, shaderVariableStr ); // Get variable position in Shader
      gl.vertexAttribPointer( myVar, shaderVariableDim, gl.FLOAT, false, 0, 0 );     // Point variable to currently bound buffer
      gl.enableVertexAttribArray( myVar );                           // Enable the attribute for use
    }

    return bufferID;
}


/**
 *  This is the main routine called with the web page is loaded.
 */
window.onload = function init()
{
    // --- Setup WebGL and Shaders ---

    // Create the WebGL interface object and attach it to the 
    // canvas specified in the HTML file.  Give an error if WebGL
    // is not found
    var canvas = document.getElementById( "gl-canvas" );
    var gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);


    // --- Deal with the Data ---

    // Create an array of points representing the polygon
    var polygonPoints = [     // theta
        // Triangle 1
        vec2( 0.00,   0.00),  // center   p0
        vec2( 1.00,   0.00),  //   0      p1
        vec2( 0.31,   0.95),  //  2*pi/5  p2
        // Triangle 2
        vec2( 0.00,   0.00),  // center   p0
        vec2( 0.31,   0.95),  //  2*pi/5  p2
        vec2(-0.81,   0.59),  //  4*pi/5  p3
        // Triangle 3
        vec2( 0.00,   0.00),  // center   p0
        vec2(-0.81,   0.59),  //  4*pi/5  p3
        vec2(-0.81,  -0.59),  //  6*pi/5  p4
        // Triangle 4
        vec2( 0.00,   0.00),  // center   p0
        vec2(-0.81,  -0.59),  //  6*pi/5  p4
        vec2( 0.31,  -0.95),  //  8*pi/5  p5
        // Triangle 5
        vec2( 0.00,   0.00),  // center   p0
        vec2( 0.31,  -0.95),  //  8*pi/5  p5
        vec2( 1.00,   0.00)  //   0      p1
    ];

    // Create array of colors 
    var colors = [
        // Triangle 1
        vec3(0,0,0),  // black
        vec3(0,0,0),  // black
        vec3(0,0,0),  // black
        // Triangle 2
        vec3(0,0,1),  // blue
        vec3(0,0,1),  // blue
        vec3(0,0,1),  // blue
        // Triangle 3
        vec3(0,1,1),  // aqua
        vec3(0,1,1),  // aqua
        vec3(0,1,1),  // aqua
        // Triangle 4
        vec3(0,1,0),  // green
        vec3(0,1,0),  // green
        vec3(0,1,0),  // green
        // Triangle 5
        vec3(1,1,0),  // yellow
        vec3(1,1,0),  // yellow
        vec3(1,1,0)   // yellow
    ];

    // Load onto the GPU and associate variables in the shader
    var colorBufferID = LoadDataOnGPU(gl, colors, "color", 3, shaderProgram);
    var vertexBufferId = LoadDataOnGPU(gl, polygonPoints, "position", 2, shaderProgram);

    // --- Draw that polygon! ---
    render(gl, canvas, polygonPoints);
};


