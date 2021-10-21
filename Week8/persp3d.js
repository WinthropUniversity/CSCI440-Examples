"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates send homogeneous 3D transforms to GPU in WebGL
 */

// Ugly global variables
var gl;
var pointLength;

// For the uniform locations in the GPU
var modelMatrixLoc;
var perspMatrixLoc;
var cameraMatrixLoc;

// Just for convenience while testing
var identity = mat4( 1, 0 ,0 ,0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1);

/**
 * Basic rotation transformation of the model.  Rotate around x, then y, then z.
 * @param {*} zRotationAngle Angle (in degrees) to rotate model around x-axis
 * @param {*} yRotationAngle Angle (in degrees) to rotate model around y-axis
 * @param {*} zRotationAngle Angle (in degrees) to rotate model around z-axis
 * @returns 
 */
function GetModelTransformationMatrix(xRotationAngle, yRotationAngle, zRotationAngle) {
  var alpha = xRotationAngle *Math.PI/180.0;  // Rotation around x in radians
  var phi   = yRotationAngle *Math.PI/180.0;  // Rotation around y in radians
  var theta = zRotationAngle *Math.PI/180.0;  // Rotation around z in radians

  var csx = Math.cos(alpha);
  var snx = Math.sin(alpha);
  var csy = Math.cos(phi);
  var sny = Math.sin(phi);
  var csz = Math.cos(theta);
  var snz = Math.sin(theta);

  // Some standard rotation matrices
  var rx = mat4( 1.0,  0.0,  0.0,  0.0,
                 0.0,  csx,  -snx,   0.0,
                 0.0,  snx,   csx,   0.0,
                 0.0,  0.0,  0.0,  1.0 );                 
  var ry = mat4( csy,   0.0,  sny,   0.0,
                 0.0,  1.0,  0.0,  0.0,
                -sny,   0.0,  csy,   0.0,
                 0.0,  0.0,  0.0,  1.0 );
  var rz = mat4( csz,  -snz,   0.0,  0.0,
                 snz,   csz,   0.0,  0.0,
                 0.0,  0.0,  1.0,  0.0,
                 0.0,  0.0,  0.0,  1.0 );
 
  return ( mult(rz,mult(ry,rx)) );
  //return (identity);
}


/**
 * Construct the perspective projection matrix using the field-of-view
 * method.  Here I compute the aspect ratio directly from the canvas.
 * 
 * @param {*} fovy Field of view in the y direction of the camera frame
 * @param {*} near The near plane of the frustrum
 * @param {*} far  The far plane of the frustrum
 */
function GetPerspectiveProjectionMatrix(fovy, near, far) {
  var canvas = document.getElementById( "gl-canvas" );
  var aspectRatio = canvas.width / canvas.height;
  var fovyRadian = fovy * Math.PI / 180.0;
  var nr = near;
  var fr = far;
  var tp = nr * Math.tan(fovyRadian);
  var rgt = tp * aspectRatio;

  return ( mat4( 
    nr/rgt,  0,             0,                     0,
    0,      nr/tp,          0,                     0,
    0,      0,              -(fr+nr)/(fr-nr),      (-2*fr*nr)/(fr-nr),
    0,      0,              -1,                    0) );  
  //return (identity);
}


/**
 *  Create the matrix to transform the space into the camera view
 *  orientation.  This translates and re-orients so that the camera
 *  is at the origin, looking down the z-axis.
 *   @param eye The vector locating camera in world frame
 *   @param at  The vector locating the position in world frame at which the camera is looking
 *   @param up  The vector indicating which way is "up" for the camera
 **/
function GetCameraViewOrientationMatrix(eye, at, up) {
  // Get the normal vector, VPN p. 271, Angel & Schreiner
  var n = subtract(eye,at);
  n = normalize(n);

  // Get the u vector in the view plane, p. 272, Angel & Schreiner
  up = normalize(up);
  var u = cross(up, n);
  u = normalize(u);

  // Get the v vector in the view plane, p. 272, Angel & Schreiner
  var v = cross(n, u);
  v = normalize(v);

  // This is just to stay consistent with notation on pp. 269-271
  var p = eye;

  // Translate camera to origin
  var T = mat4( 1, 0, 0, -p[0],
                0, 1, 0, -p[1],
                0, 0, 1, -p[2],
                0, 0, 0, 1 );
  
  // This is the *reverse* of the coordinate trans we need
  var A = mat4( u[0], v[0], n[0], 0,
                u[1], v[1], n[1], 0,
                u[2], v[2], n[2], 0,
                0, 0, 0, 1 );             
  A = mult(A,T);

  // Invert to get the actual coord. rotation f
  var M = inverse(A);

  // Or just use the built-in function for this ...
  //var Mp = lookAt(eye, at, up);
  //Mp = inverse(Mp);
  //console.log("M = ", M);
  //console.log("Mp= ", Mp);

  // Return the view orientation change matrix for the camera
  return (M);
}



/**
 *  Draw our pyramid as a shell of triangle and square faces, using lines 
 *  to do so.
 */
 function render(zCameraPosition) {

  var modelMatrix = GetModelTransformationMatrix(30, -70, 90);
  var cameraMatrix = GetCameraViewOrientationMatrix(vec3(0, 0, zCameraPosition),   // where is the camera?
                                                    vec3(0, 0, 0),   // where is it looking?
                                                    vec3(0, 1, 0) ); // Which way is up?
  var perspMatrix = GetPerspectiveProjectionMatrix(45, -0.1, .2);

  // --- Now Draw the Polygon for the First Time ---
  gl.uniformMatrix4fv( modelMatrixLoc, false, flatten(modelMatrix));
  gl.uniformMatrix4fv( cameraMatrixLoc, false, flatten(cameraMatrix));
  gl.uniformMatrix4fv( perspMatrixLoc, false, flatten(perspMatrix));  

    // Clear the color & depth buffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the faces
    gl.drawArrays( gl.TRIANGLES, 0, pointLength );
}



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
    var vertexShaderCode =  "attribute vec4 vPosition;" +   // in-coming parameter
                            "attribute vec4 vColor;" +      // in-coming parameter
                            "uniform mat4 uModelMatrix;" +  // Homogeneous transformation
                            "uniform mat4 uCameraMatrix;" + // Camera View transformation
                            "uniform mat4 uPerspMatrix;" +  // Perspective transformation
                            "varying vec4 fColor;" +        // Passing color variable
                            "void main() {" +
                            "    fColor = vColor;" +
                            "    gl_Position = uPerspMatrix * uCameraMatrix * uModelMatrix * vPosition;" +
                            "    if (gl_Position.w <= 0.0) " + 
                            "      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);" +
                            "    else {" + 
                            "      gl_Position.x = gl_Position.x / gl_Position.w;" +
                            "      gl_Position.y = gl_Position.y / gl_Position.w;" +
                            "      gl_Position.z = gl_Position.z / gl_Position.w;" +
                            "      gl_Position.w = 1.0;" +
                            "      }" +
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
                             "varying vec4 fColor;" +
                             "void main() {" + 
                             "    gl_FragColor = fColor;" +
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

    // Grab the location for the matrices in the GPU
    modelMatrixLoc  = gl.getUniformLocation( shaderProgram, "uModelMatrix" );
    cameraMatrixLoc = gl.getUniformLocation( shaderProgram, "uCameraMatrix" );
    perspMatrixLoc  = gl.getUniformLocation( shaderProgram, "uPerspMatrix" );

    return shaderProgram;
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
    var tz = parseFloat(document.getElementById("translatez").value);
    render(-tz);
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
    document.getElementById("translatez").oninput = setTranslationEventHandler


    // --- Create the Shape, then Load Point Data Onto GPU ---

    // Create an array of points representing the pyramid
    var polygonPoints = [     
        // Bottom square face, T1
        vec4( 0.1,  0.0, -0.1,   1.0),  
        vec4( 0.0, -0.1, -0.1,   1.0), 
        vec4(-0.1,  0.0, -0.1,   1.0), 
        // Bottom square face, T2
        vec4( 0.1,  0.0, -0.1,   1.0),  
        vec4(-0.1,  0.0, -0.1,   1.0), 
        vec4( 0.0,  0.1, -0.1,   1.0),
        // side 1 triangle face
        vec4( 0.0, -0.1, -0.1,   1.0),  
        vec4( 0.0,  0.0,  0.1,   1.0), // Tip
        vec4( 0.1,  0.0, -0.1,   1.0), 
        // side 2 triangle face
        vec4( 0.1,  0.0, -0.1,   1.0),  
        vec4( 0.0,  0.0,  0.1,   1.0), // Tip
        vec4( 0.0,  0.1, -0.1,   1.0), 
        // side 3 triangle face
        vec4( 0.0,  0.1, -0.1,   1.0),  
        vec4( 0.0,  0.0,  0.1,   1.0), // Tip
        vec4(-0.1,  0.0, -0.1,   1.0), 
        // side 4 triangle face
        vec4(-0.1,  0.0, -0.1,   1.0),  
        vec4( 0.0,  0.0,  0.1,   1.0), // Tip
        vec4( 0.0, -0.1, -0.1,   1.0)
    ];

    var pointColors = [
      [1.0, 0.0, 0.0, 0.8], // red  // Square face, T1
      [1.0, 0.0, 0.0, 0.8], // red
      [1.0, 0.0, 0.0, 0.8], // red
      [1.0, 0.0, 0.0, 0.8], // red  // Square face, T2
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

    pointLength = polygonPoints.length;
    render(-0.5); //gl, polygonPoints.length);
};


