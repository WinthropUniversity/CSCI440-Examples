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
var gBoxPoints = null;
var gXrange = [-0.5,0.5];
var gYrange = [-0.5,0.5];
var gZrange = [-0.5,0.5];    
var gBoxVertexID = null;
var gBoxPointsLen;

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
                            "" + 
                            "uniform mat4 uModelMatrix;" +         // Stored model transformation
                            "uniform mat4 uCameraMatrix;" +        // Camera view transformation
                            "uniform mat4 uProjectionMatrix;" +    // Projection transformation
                            "" + 
                            "void main() {" +                            
                            //"  gl_Position = vPosition;" +
                            "" + 
                            "  gl_PointSize = 3.0;" +
                            "" + // Now compute the position after perspective transformation
                            "  gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vPosition;" +
                            "  gl_Position.x = gl_Position.x / gl_Position.w;" +
                            "  gl_Position.y = gl_Position.y / gl_Position.w;" +
                            "  gl_Position.z = gl_Position.z / gl_Position.w;" +
                            "  gl_Position.w = 1.0;" +
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
                             "      gl_FragColor = vec4(0.2,0.2,1,0.8);" +  // Combine texture
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

  var P = ( mat4( nr/rgt,  0,             0,                     0,
                  0,      nr/tp,          0,                     0,
                  0,      0,              -(fr+nr)/(fr-nr),      (-2*fr*nr)/(fr-nr),
                  0,      0,              -1,                    0) );  
 return (P);
}


function CreateBoudingBox() {
  var points = [ vec4( gXrange[0], gYrange[0], gZrange[0] ), // Front Face, Line 1
                 vec4( gXrange[1], gYrange[0], gZrange[0] ),
                 vec4( gXrange[1], gYrange[0], gZrange[0] ), // Front Face, Line 2
                 vec4( gXrange[1], gYrange[1], gZrange[0] ),
                 vec4( gXrange[1], gYrange[1], gZrange[0] ), // Front Face, Line 3
                 vec4( gXrange[0], gYrange[1], gZrange[0] ),
                 vec4( gXrange[0], gYrange[1], gZrange[0] ), // Front Face, Line 4
                 vec4( gXrange[0], gYrange[0], gZrange[0] ), 
                 vec4( gXrange[0], gYrange[0], gZrange[1] ), // Back Face, Line 1
                 vec4( gXrange[1], gYrange[0], gZrange[1] ),
                 vec4( gXrange[1], gYrange[0], gZrange[1] ), // Back Face, Line 2
                 vec4( gXrange[1], gYrange[1], gZrange[1] ),
                 vec4( gXrange[1], gYrange[1], gZrange[1] ), // Back Face, Line 3
                 vec4( gXrange[0], gYrange[1], gZrange[1] ),
                 vec4( gXrange[0], gYrange[1], gZrange[1] ), // Back Face, Line 4
                 vec4( gXrange[0], gYrange[0], gZrange[1] ), 
                 vec4( gXrange[0], gYrange[0], gZrange[0] ), // F/B Link 1
                 vec4( gXrange[0], gYrange[0], gZrange[1] ),
                 vec4( gXrange[1], gYrange[0], gZrange[0] ), // F/B Link 2
                 vec4( gXrange[1], gYrange[0], gZrange[1] ),
                 vec4( gXrange[1], gYrange[1], gZrange[0] ), // F/B Link 3
                 vec4( gXrange[1], gYrange[1], gZrange[1] ),
                 vec4( gXrange[0], gYrange[1], gZrange[0] ), // F/B Link 4
                 vec4( gXrange[0], gYrange[1], gZrange[1] ) ];
  gBoxPointsLen = points.length;

  // Load the vertex data into the GPU
  gBoxVertexID= ggl.createBuffer();                    // Create space on GPU
  ggl.bindBuffer(ggl.ARRAY_BUFFER, gBoxVertexID);      // Select that space to much about with
  ggl.bufferData(ggl.ARRAY_BUFFER, flatten(points), ggl.STATIC_DRAW); // Load data into space

  // Associate out shader position variables with our data buffer
  var posVar = ggl.getAttribLocation(gShaderProgram, "vPosition"); // Get variable position in Shader
  ggl.vertexAttribPointer(posVar, 4, ggl.FLOAT, false, 0, 0);      // Point variable to currently bound buffer
  ggl.enableVertexAttribArray(posVar);                             // Enable the attribute for use
}

function DrawBoundingBox() {
  ggl.bindBuffer(ggl.ARRAY_BUFFER, gBoxVertexID);      // Select that space to much about with
  var posVar = ggl.getAttribLocation(gShaderProgram, "vPosition"); // Get variable position in Shader
  ggl.vertexAttribPointer(posVar, 4, ggl.FLOAT, false, 0, 0);      // Point variable to currently bound buffer
  ggl.drawArrays(ggl.LINES, 0, gBoxPointsLen);
}


/**
 *  This causes the shape to be translated from its original position
 *  based on the parameters set in the spinner box fields on the HTML page.
 */
 function handleCameraPosition() {
  var zposition = parseFloat(document.getElementById("zcamera").value);
  var thetacam = parseFloat(document.getElementById("thetacamera").value);
  var xpos = zposition*Math.cos(thetacam);
  var zpos = zposition*Math.sin(thetacam);
  var cameraMatrix = lookAt(vec3(xpos,0,zpos),  // Location of camera 
                     vec3(0,0,0),  // Where camera is looking
                     vec3(0,1,0)); // Which way is "up"
   
   ggl.uniformMatrix4fv( ggl.getUniformLocation( gShaderProgram, "uCameraMatrix" ), false, flatten(cameraMatrix));

   DrawBoundingBox();
   gParticleField.UpdateGPU();
   ggl.drawArrays(ggl.POINTS, 0, gParticleField.positions.length);
  }



/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 */
function render() {
    ggl.clear( ggl.COLOR_BUFFER_BIT | ggl.DEPTH_BUFFER_BIT);

    DrawBoundingBox();

    gParticleField.UpdateAccelerations(0.05);
    gParticleField.UpdateVelocities(0.1);
    gParticleField.UpdatePositions(0.1);
    gParticleField.UpdateGPU();

    //ggl.drawArrays(ggl.TRIANGLES, 0, gParticleField.positions.length);
    ggl.drawArrays(ggl.POINTS, 0, gParticleField.positions.length);

    //alert(gParticleField.positions[0]);
    window.requestAnimFrame(function() {render();});    
}


    // --- Setup WebGL and Shaders ---

    function foo() {
      render();
    }

    // Create the WebGL interface object and attach it to the 
    // canvas specified in the HTML file.  Give an error if WebGL
    // is not found
async function main() {
    var canvas = document.getElementById( "gl-canvas" );
    var gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );              // BG:  Opaque Gray
    gl.enable(gl.DEPTH_TEST);

    // Setup the vertex and fragment shaders
    var shaderProgram = SetupShaders(gl);

    // Setup the camera and perspective projection, as well as lighting position
    var zposition = parseFloat(document.getElementById("zcamera").value);
    var thetacam = parseFloat(document.getElementById("thetacamera").value);
    var xpos = zposition*Math.cos(thetacam);
    var zpos = zposition*Math.sin(thetacam);
    var cameraMatrix = lookAt(vec3(xpos,0,zpos),  // Location of camera 
                              vec3(0,0,0),  // Where camera is looking
                              vec3(0,1,0)); // Which way is "up"
    //cameraMatrix = gIdentity; // null-op camera transformation
    var perspMatrix = GetPerspectiveProjectionMatrix(45, 0.05, 3.0);
    //perspMatrix = gIdentity; // null-up projection
    gl.uniformMatrix4fv( gl.getUniformLocation( shaderProgram, "uCameraMatrix" ), false, flatten(cameraMatrix));
    gl.uniformMatrix4fv( gl.getUniformLocation( shaderProgram, "uProjectionMatrix" ), false, flatten(perspMatrix));  
    gl.uniformMatrix4fv( gl.getUniformLocation( shaderProgram, "uModelMatrix" ), false, flatten(gIdentity));


    // Setup the particle field
    gParticleField = new ParticleField(gl, shaderProgram, 1000, 10, gXrange, gYrange, gZrange);
    gParticleField.InitialGPULoad();

  
    // --- Setup event handlers and draw those things! ---
    ggl = gl;
    gShaderProgram = shaderProgram;
    gCanvas = canvas;
    //canvas.onclick = handleCameraPosition;
    canvas.addEventListener('click', function() { render(); }, false);
    document.getElementById("zcamera").oninput = handleCameraPosition
    document.getElementById("thetacamera").oninput = handleCameraPosition

    CreateBoudingBox();
    render();
};

window.onload = function init() {
  main();
}
