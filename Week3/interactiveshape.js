"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates how to draw filled-in polygons in WebGL
 */



 var thetaLoc;
 var direction=1;


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
    // NOTE:  Again, the vertices in the buffer remain constant and instead
    //        the vertex shader computes where they should be on the canvas
    //        differently depending on theta.  Theta direction is changed by
    //        interactivity in this case.
    var vertexShaderCode =  "attribute vec4 position;" +  // in-coming parameter
                            "uniform float uTheta;" +     // variable we will alter 
                            "void main() {" +
                            "    gl_Position.x = -sin(uTheta) * position.x + cos(uTheta) * position.y;" +
                            "    gl_Position.y =  sin(uTheta) * position.y + cos(uTheta) * position.x;" +
                            "    gl_Position.z = 0.0;" +
                            "    gl_Position.w = 1.0;" +
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
    
    // Grab the location of the uniform variable theta in the shader
    thetaLoc = gl.getUniformLocation( shaderProgram, "uTheta" );

    return shaderProgram;
}


/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 * 
 * @param {Object} gl - The WegGL graphic library object
 * @param {float} pointLength - The number of points of the polygon we are shading
 * @param {float} theta - The angle of rotation
 */
function render(gl, pointLength, theta) {
    // Clear the color buffer
    gl.clear( gl.COLOR_BUFFER_BIT );

    // Update theta by 0.1 radians, send to GPU, rotate in the direction
    // given by the "direction" variable
    theta += direction * 0.01;
    gl.uniform1f( thetaLoc, theta);

    // Draw three triangles: p0-p1-p2, p0-p2-p3, p0-p3-p4
    gl.drawArrays( gl.TRIANGLE_FAN, 0, pointLength );

    window.requestAnimFrame(function() {render(gl, pointLength, theta)});
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
 * Event handler for when the canvas is clicked.
 */
function changeDirectionEventHandler() {
    direction *= -1;
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

    // Add an event handler to the canvas's "on click" event
    canvas.onclick = changeDirectionEventHandler;

    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );              // BG:  Opaque white

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);

    


    // --- Deal with the Data ---

    // Create an array of points representing the polygon
    var polygonPoints = [     // theta
        vec2( 1.00,   0.00),  //   0
        vec2( 0.31,   0.95),  //  2*pi/5
        vec2(-0.81,   0.59),  //  4*pi/5
        vec2(-0.81,  -0.59),  //  6*pi/5
        vec2( 0.31,  -0.95)   //  8*pi/5
    ];

    // Load onto the GPU and associate variables in the shader
    var vertexBufferId = LoadDataOnGPU(gl, polygonPoints, "position", 2, shaderProgram);

    // Set the initial angle before we start rotating.
    var theta = 0.0;

    // --- Draw that polygon! ---
    render(gl, polygonPoints.length, theta);
};


