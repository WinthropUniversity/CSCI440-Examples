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
    var vertexShaderCode =  "attribute vec4 position;" +  // in-coming parameter
                            "attribute vec3 color;" +     // in-coming parameter
                            "void main() {" +
                            "    gl_Position = position;" +
                            "}"
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // Attach the GLSL code to the fragment shader, then compile it
    var fragmentShaderCode = "precision mediump float;" +
                             "void main() {" + 
                             "    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);" + // Solid red
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
 */
function render(gl, canvas, shapeBufferIDs, pointLengths, shaderProgram) {
    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );              // BG:  Opaque white
    gl.clear( gl.COLOR_BUFFER_BIT );                  // Clear color buffer bit

    for (let shapeIdx=0; shapeIdx<shapeBufferIDs.length; shapeIdx++) {
        gl.bindBuffer( gl.ARRAY_BUFFER, shapeBufferIDs[shapeIdx] );          // Select this shape's buffer
        var positionVar = gl.getAttribLocation( shaderProgram, "position" ); // Get position variable in shader
        gl.vertexAttribPointer( positionVar, 2, gl.FLOAT, false, 0, 0 );     // Point variable to current bound buffer
        gl.drawArrays( gl.TRIANGLE_FAN, 0, pointLengths[shapeIdx] );         // Draw
    }
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
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferID );                         // Select that space to muck about with
    gl.bufferData( gl.ARRAY_BUFFER, flatten(myData), gl.STATIC_DRAW ); // Load data into space

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
    var hexagonPoints = [     // theta, scaled by 1/2, translated -0.5
        vec2(-0.25, -0.50),  //   0
        vec2(-0.42, -0.26),  //  2*pi/5
        vec2(-0.70, -0.35),  //  4*pi/5
        vec2(-0.70, -0.64),  //  6*pi/5
        vec2(-0.42, -0.74)   //  8*pi/5
    ];

    // Create an array of points representing the polygon
    var squarePoints = [     
        vec2( 0.25,  0.25), 
        vec2( 0.25,  0.75), 
        vec2( 0.75,  0.75), 
        vec2( 0.75,  0.25)
    ];


    // Load onto the GPU and associate variables in the shader
    var hexVertexBufferID = LoadDataOnGPU(gl, hexagonPoints, "position", 2, shaderProgram);
    var squareVertexBufferID = LoadDataOnGPU(gl, squarePoints, "position", 2, shaderProgram);

    // --- Draw those polygons! ---
    render(gl, canvas, 
           [hexVertexBufferID, squareVertexBufferID],    // Buffer IDs for shapes
           [hexagonPoints.length, squarePoints.length],  // Point lengths
           shaderProgram);
};


