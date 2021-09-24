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
    var vertexShaderCode =  "attribute vec4 vPosition;" +  // in-coming parameter
                            "attribute vec4 vColor;" +     // in-coming parameter
                            "uniform mat4 uMatrix;" +      // transformation matrix sent in
                            "varying vec4 fColor;" +       // Passing color variable
                            "void main() {" +
                            "    fColor = vColor;" +
                            "    gl_Position = uMatrix * vPosition;" +
                            //"    gl_Position = vPosition;" +
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
                             //"    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);" +
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
function render(gl, shipList) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //gl.drawArrays( gl.TRIANGLES, 0, 18 );
    for (let shipIdx=0; shipIdx<shipList.length; shipIdx++) {
        shipList[shipIdx].DrawShip();
    }

    if (shipList.length > 0) {
      shipList[0].RotateAroundY(0.5);
      shipList[0].RotateAroundX(0.5);
      shipList[0].RotateAroundZ(0.5);
    }

    if (shipList.length > 1) 
      shipList[1].RotateAroundZ(1);//RotateAroundVec(5, vec3(1,1,1));

    if (shipList.length > 2) 
      shipList[2].RotateAroundZ(-1);//RotateAroundVec(5, vec3(1,1,1));

    if (shipList.length > 3) 
      shipList[3].RotateAroundVec(4, vec3(-1,-1,-1));

    window.requestAnimFrame(function() {render(gl, shipList)});    
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

    // Configure WebGL by setting the canvas view and the background color
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );              // BG:  Opaque Gray
    gl.enable(gl.DEPTH_TEST);

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);

    var ship1 = new SimpleShip(gl, shaderProgram);
    var ship2 = new SimpleShip(gl, shaderProgram);
    var ship3 = new SimpleShip(gl, shaderProgram);
    var ship4 = new SimpleShip(gl, shaderProgram);

    // Keep Ship 1 at the origin
    ship1.Scale(0.25, 0.25, 0.25);

    // Change the location and orientation of ships 2 and 3
    ship2.Scale(0.25, 0.25, 0.25);
    ship2.RotateAroundZ(-60);
    ship2.RotateAroundY(-60);
    ship2.Translate(-0.5, -0.5, 0.0);

    ship3.Scale(0.25, 0.25, 0.25);
    ship3.RotateAroundZ(-90);
    ship3.RotateAroundY(30);
    ship3.Translate(0.5, 0.5, 0.0);

    // Use Ship 4 to test quaternion rotation
    ship4.Scale(0.25, 0.25, 0.25);

    // --- Draw those ships! ---
    render(gl, [ship1, ship2, ship3, ship4]);
};


