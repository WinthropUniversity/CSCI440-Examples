"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates send homogeneous 3D transforms to GPU in WebGL
 */

// Ugly global variables
var gl;

var pointLength;

var matrixLoc;
var matrix = mat4( 1, 0, 0, 0,
                   0, 1, 0, 0,
                   0, 0, 1, 0,
                   0, 0, 0, 1 );

// Convenion cos/sin
var angle = 60;
var cs = Math.cos(angle*Math.PI/180.0);
var sn = Math.sin(angle*Math.PI/180.0);

// Some rotation matrices

var rz = mat4( cs,  -sn,   0.0,  0.0,
               sn,   cs,   0.0,  0.0,
               0.0,  0.0,  1.0,  0.0,
               0.0,  0.0,  0.0,  1.0 );
var rx = mat4( 1.0,  0.0,  0.0,  0.0,
               0.0,  cs,  -sn,   0.0,
               0.0,  sn,   cs,   0.0,
               0.0,  0.0,  0.0,  1.0 );
var ry = mat4( cs,   0.0,  sn,   0.0,
               0.0,  1.0,  0.0,  0.0,
              -sn,   0.0,  cs,   0.0,
               0.0,  0.0,  0.0,  1.0 );

// Set the initial matrix to be a rotation over Z and over Y so we can see 
// the pyramid 3D shape ... otherwise, when we look straight down the Z
// axis, it will look like a square.
matrix = mult(matrix,rz);
matrix = mult(matrix,ry);
//matrix = mult(matrix,rx);

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
                            "attribute vec4 vColor;" +     // in-coming parameter
                            "uniform mat4 uMatrix;" +      // transformation matrix sent in
                            "varying vec4 fColor;" +       // Passing color variable
                            "void main() {" +
                            "fColor = vColor;" +
                            "gl_Position = uMatrix * vPosition;" +
                            //"gl_Position.z = -gl_Position.z;" +
                            "}"
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // Attach the GLSL code to the fragment shader, then compile it
    var fragmentShaderCode = "precision mediump float;" +
                             "varying vec4 fColor;" +
                             "void main() {" + 
                             "    gl_FragColor = fColor;" +
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
 *  Draw our pyramid as a shell of triangle and square faces, using lines 
 *  to do so.
 */
function render() {
    // Clear the color & depth buffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the faces
    gl.drawArrays( gl.TRIANGLES, 0, pointLength );
    //gl.drawArrays( gl.LINE_LOOP, 0, pointLength );

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
    var tz = parseFloat(document.getElementById("translatez").value);
  
    // Setup the translation matrix
    var T = mat4( 1.0,  0.0,  0.0, tx,
                  0.0,  1.0,  0.0, ty,
                  0.0,  0.0,  0.0, tz,
                  0.0,  0.0,  0.0, 1.0);  

    // Concatenate with previous transformations:
    matrix = mult(T, matrix);
                   
    // Send the transformation matrix to the GPU, then draw!
    gl.uniformMatrix4fv( matrixLoc, false, flatten(matrix));
    render();
  }

/**
 *  This causes the shape to be scaled from its original position
 *  based on the parameters set in the spinner box fields on the HTML page.
 */
 function setScaleEventHandler() {
    var sx = parseFloat(document.getElementById("scalex").value);
    var sy = parseFloat(document.getElementById("scaley").value);
    var sz = parseFloat(document.getElementById("scalez").value);
  
    // Setup the translation matrix
    var S = mat4( sx,  0.0,  0.0, 0.0,
                  0.0,  sy,  0.0, 0.0,
                  0.0,  0.0, sz,  0.0,
                  0.0,  0.0, 0.0, 1.0);  

    // Concatenate with previous transformations:
    matrix = mult(S, matrix);
  
    // Send the transformation matrix to the GPU, then draw!
    gl.uniformMatrix4fv( matrixLoc, false, flatten(matrix));
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
    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );              // BG:  Opaque Gray

    gl.enable(gl.DEPTH_TEST);


    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);


    // --- Add Event Handlers ---
    document.getElementById("translatebutton").onclick = setTranslationEventHandler
    document.getElementById("scalebutton").onclick = setScaleEventHandler


    // --- Create the Shape, then Load Point Data Onto GPU ---

    // Create an array of points representing the pyramid
    var polygonPoints = [     
        // Bottom square face, T1
        vec4( 0.4,  0.0,  0.0,   1.0),  
        vec4( 0.0, -0.4,  0.0,   1.0), 
        vec4(-0.4,  0.0,  0.0,   1.0), 
        // Bottom square face, T2
        vec4( 0.4,  0.0,  0.0,   1.0),  
        vec4(-0.4,  0.0,  0.0,   1.0), 
        vec4( 0.0,  0.4,  0.0,   1.0),
        // side 1 triangle face
        vec4( 0.0, -0.4,  0.0,   1.0),  
        vec4( 0.0,  0.0,  0.8,   1.0), // Tip
        vec4( 0.4,  0.0,  0.0,   1.0), 
        // side 2 triangle face
        vec4( 0.4,  0.0,  0.0,   1.0),  
        vec4( 0.0,  0.0,  0.8,   1.0), // Tip
        vec4( 0.0,  0.4,  0.0,   1.0), 
        // side 3 triangle face
        vec4( 0.0,  0.4,  0.0,   1.0),  
        vec4( 0.0,  0.0,  0.8,   1.0), // Tip
        vec4(-0.4,  0.0,  0.0,   1.0), 
        // side 4 triangle face
        vec4(-0.4,  0.0,  0.0,   1.0),  
        vec4( 0.0,  0.0,  0.8,   1.0), // Tip
        vec4( 0.0, -0.4,  0.0,   1.0)
    ];
    pointLength = polygonPoints.length;

    var pointColors = [
      [1.0, 0.0, 0.0, 0.8], // red  // Square fase, T1
      [1.0, 0.0, 0.0, 0.8], // red
      [1.0, 0.0, 0.0, 0.8], // red
      [1.0, 0.0, 0.0, 0.8], // red  // Square fase, T2
      [1.0, 0.0, 0.0, 0.8], // red
      [1.0, 0.0, 0.0, 0.8], // red
      [0.0, 0.0, 1.0, 0.8], // blue //  Triangle side 1
      [0.0, 0.0, 1.0, 0.8], // blue
      [0.0, 0.0, 1.0, 0.8], // blue
      [1.0, 0.0, 1.0, 0.8], // purple //  Triangle side 2
      [1.0, 0.0, 1.0, 0.8], // purple
      [1.0, 0.0, 1.0, 0.8], // purple
      [0.0, 1.0, 0.0, 0.8], // green //  Triangle side 3
      [0.0, 1.0, 0.0, 0.8], // green
      [0.0, 1.0, 0.0, 0.8], // green
      [1.0, 1.0, 0.0, 0.8], // yellow //  Triangle side 4
      [1.0, 1.0, 0.0, 0.8], // yellow
      [1.0, 1.0, 0.0, 0.8], // yellow
    ]

    // Load onto the GPU and associate variables in the shader
    var vertexBufferId = LoadDataOnGPU(gl, polygonPoints, "vPosition", 4, shaderProgram);
    var colorBufferId = LoadDataOnGPU(gl, pointColors, "vColor", 4, shaderProgram  )


    // --- Now Draw the Polygon for the First Time ---
    gl.uniformMatrix4fv( matrixLoc, false, flatten(matrix));
    render(gl, polygonPoints.length);
};


