"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates send homogeneous 2D transforms to GPU in WebGL
 */

// Ugly global variables
var gl;

var pointLength;

var matrixLoc;
var matrix = mat3( 1.0,  0.0,  0.0,
                   0.0,  1.0,  0.0,
                   0.0,  0.0,  1.0 );

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
 function setupShaders() {
    // Attach the GLSL code to the vertex shader, then compile it
    var vertexShaderCode =  "attribute vec4 vPosition;" +  // in-coming parameter
                            "uniform mat3 uMatrix;" +      // transformation matrix sent in
                            "void main() {" +
                            "    vec3 oldPose = vec3(vPosition.x, vPosition.y, 1);" +
                            "    vec3 newPose = uMatrix * oldPose;" +               // Transform
                            "    gl_Position  = vec4( newPose.x, newPose.y, 0, 1);" +        // Make Cartesian
                            "}"
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // Attach the GLSL code to the fragment shader, then compile it
    var fragmentShaderCode = "precision mediump float;" +
                             "void main() {" + 
                             "    gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );" +
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
    
    // Grab the location for the matrix in the GPU
    matrixLoc = gl.getUniformLocation( shaderProgram, "uMatrix" );

    return shaderProgram;
}


/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 */
function render() {
    // Clear the color buffer
    gl.clear( gl.COLOR_BUFFER_BIT );

    // Draw three triangles: p0-p1-p2, p0-p2-p3, p0-p3-p4
    gl.drawArrays( gl.TRIANGLE_FAN, 0, pointLength );

    //window.requestAnimFrame(function() {render(gl, pointLength)});
}


/**
 *  Load data onto the GPU and associate the buffer with that data.  Then
 *  (if a variable name is given), associate the variable with the one in the
 *  shader.  Return the ID for the GPU buffer, in case it is useful later.
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
    gl.bufferData( gl.ARRAY_BUFFER, flatten(myData), gl.STATIC_DRAW ); // Load data into space

    // Associate out shader position variables with our data buffer
    if (shaderVariableStr != "") {
      var myVar = gl.getAttribLocation( shaderProgram, shaderVariableStr ); // Get variable position in Shader
      gl.vertexAttribPointer( myVar, shaderVariableDim, gl.FLOAT, false, 0, 0 );     // Point variable to currently bound buffer
      gl.enableVertexAttribArray( myVar );                           // Enable the attribute for use
    }

    return bufferID;
}


// -- These are the button event handlers ---

/**
 *  This causes the shape to be translated from its original position
 *  based on the parameters set in the spinner box fields on the HTML page.
 */
function setTranslationEventHandler() {
    var tx = parseFloat(document.getElementById("translatex").value);
    var ty = parseFloat(document.getElementById("translatey").value);
  
    // Setup the translation matrix
    var T = mat3( 1.0,  0.0,  tx,
                  0.0,  1.0,  ty,
                  0.0,  0.0,  1.0);  

    // Concatenate with previous transformations:
    matrix = mult(T, matrix);
                   
    // Send the transformation matrix to the GPU, then draw!
    gl.uniformMatrix3fv( matrixLoc, false, flatten(matrix));
    render();
  }

/**
 *  This causes the shape to be scaled from its original position
 *  based on the parameters set in the spinner box fields on the HTML page.
 */
 function setScaleEventHandler() {
    var sx = parseFloat(document.getElementById("scalex").value);
    var sy = parseFloat(document.getElementById("scaley").value);
  
    // Setup the translation matrix
    var S = mat3( sx,  0.0,  0.0,
                  0.0,  sy,  0.0,
                  0.0,  0.0,  1.0);  

    // Concatenate with previous transformations:
    matrix = mult(S, matrix);
  
    // Send the transformation matrix to the GPU, then draw!
    gl.uniformMatrix3fv( matrixLoc, false, flatten(matrix));
    render();
  }
  
/**
 *  This causes the shape to be rotated from its original position
 *  based on the parameters set in the spinner box field on the HTML page.
 */
function setRotationEventHandler() {
  var degreeAngle = parseFloat(document.getElementById("rotationangle").value);
  var radianAngle = degreeAngle * 3.141592 / 180.0;

  // Setup the rotation matrix
  var R = mat3( Math.cos(radianAngle),  -Math.sin(radianAngle),  0.0,
                Math.sin(radianAngle),   Math.cos(radianAngle),  0.0,
                0.0,                     0.0,                    1.0);  

  // Concatenate with previous transformations:
  matrix = mult(R, matrix);

  // Send the transformation matrix to the GPU, then draw!
  gl.uniformMatrix3fv( matrixLoc, false, flatten(matrix));
  render();
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
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );              // BG:  Opaque white

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);


    // --- Add Event Handlers ---
    document.getElementById("rotatebutton").onclick = setRotationEventHandler;
    document.getElementById("translatebutton").onclick = setTranslationEventHandler
    document.getElementById("scalebutton").onclick = setScaleEventHandler


    // --- Create the Shape, then Load Point Data Onto GPU ---

    // Create an array of points representing the polygon
    var polygonPoints = [     
        vec2( 1.00,   0.00), 
        vec2( 0.10,   0.98), 
        vec2(-0.91,   0.41), 
        vec2(-0.81,  -0.59), 
        vec2(-0.10,  -0.10),
        vec2( 0.31,  -0.95), 
        vec2( 0.45,  -0.15)  
    ];
    pointLength = polygonPoints.length;

    // Load onto the GPU and associate variables in the shader
    var vertexBufferId = LoadDataOnGPU(gl, polygonPoints, "vPosition", 2, shaderProgram);


    // --- Now Draw the Polygon for the First Time ---
    gl.uniformMatrix3fv( matrixLoc, false, flatten(matrix));
    render(gl, polygonPoints.length);
};


