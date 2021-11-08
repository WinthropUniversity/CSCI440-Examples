"use strict";

/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates how to use the pixel shader in WebGL for fractals
 */

var gMinReal = -2.2;
var gMaxReal = 1.55;
var gMinImag = -1.35;
var gMaxImag = 1.7;

var gPointLength;
var ggl;
var gShaderProgram;
var gWidth;
var gHeight;


function handleCanvasClick(event) {
    const canvasClickX = event.pageX;
    const canvasClickY = gHeight - event.pageY;    

    const fractalClickX = (gMaxReal - gMinReal) * (canvasClickX / gWidth) + gMinReal;
    const fractalClickY = (gMaxImag - gMinImag) * (canvasClickY / gHeight) + gMinImag;

    const fractalScaleX = (gMaxReal - gMinReal) / 2;
    const fractalScaleY = (gMaxImag - gMinImag) / 2;

    gMinReal = fractalClickX - fractalScaleX/2;
    gMaxReal = gMinReal + fractalScaleX;

    gMinImag = fractalClickY - fractalScaleY/2;
    gMaxImag = gMinImag + fractalScaleY;

    render();
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
 function setupShaders(gl) {
    // Attach the GLSL code to the vertex shader, then compile it
    var vertexShaderCode =  "attribute vec4 vPosition;" +  // in-coming parameter
                            "void main() {" +
                            "    gl_Position = vPosition;" +
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
                             "" + 
                             "uniform float uMinReal;" +
                             "uniform float uMaxReal;" +
                             "uniform float uMinImag;" +
                             "uniform float uMaxImag;" +
                             "uniform float uFieldWidth;" +
                             "uniform float uFieldHeight;" +
                             "" +
                             "void main() {" + 
                             "    float dX = (uMaxReal - uMinReal) / uFieldWidth;" +
                             "    float dY = (uMaxImag - uMinImag) / uFieldHeight;" +
                             "" +
                             "    float cx = gl_FragCoord.x * dX + uMinReal;" +
                             "    float cy = gl_FragCoord.y * dY + uMinImag;" +
                             "    float zx = 0.0;" +
                             "    float zy = 0.0;" +
                             "    float v = 0.0;" +
                             "    float escapeRatio = 0.0;" +
                             "" +
                             "    for (int escCount=0; escCount<100; escCount++) {" + 
                             "      float tempx = zx*zx - zy*zy + cx;" +
                             "      zy = 2.0*zx*zy + cy;" +
                             "      zx = tempx;" +
                             "      v = zx*zx + zy*zy;" +
                             "      escapeRatio = float(escCount) / 100.0;" +
                             "      if (v > 4.0) break;" +
                             "    }" +  
                             "" +
                             //"    gl_FragColor = vec4(1,0,0,1);" +
                             "    gl_FragColor.r = pow(escapeRatio, 0.50);" +
                             "    gl_FragColor.g = pow(escapeRatio, 0.75);" +
                             "    gl_FragColor.b = pow(escapeRatio, 0.25);" +
                             "    gl_FragColor.a = 1.0;" +
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
 * 
 * @param {Object} gl - The WegGL graphic library object
 * @param {array} pointLength - The points of the polygon we are shading
 */
function render() {
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uMinReal"), gMinReal);
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uMaxReal"), gMaxReal);
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uMinImag"), gMinImag);
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uMaxImag"), gMaxImag);
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uFieldWidth"), parseFloat(gWidth));
    ggl.uniform1f( ggl.getUniformLocation(gShaderProgram, "uFieldHeight"), parseFloat(gHeight));

    // Configure WebGL by setting the canvas view and the background color
    ggl.clear( ggl.COLOR_BUFFER_BIT );                  // Clear color buffer bit

    // Draw three triangles: p0-p1-p2, p0-p2-p3, p0-p3-p4
    ggl.drawArrays( ggl.TRIANGLE_FAN, 0, gPointLength );
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
    gl.viewport( 0, 0, canvas.width, canvas.height ); // View whole canvas
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );              // BG:  Opaque white

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);


    // --- Deal with the Data ---

    // Create an array of points representing the canvas
    var points = [    
        vec4( -1.00,  -1.00, 0.00, 1.00), // bottom-left
        vec4( -1.00,   1.00, 0.00, 1.00), // bottom-right
        vec4(  1.00,   1.00, 0.00, 1.00), // top-right
        vec4(  1.00,   1.00, 0.00, 1.00), // top-right
        vec4(  1.00,  -1.00, 0.00, 1.00), // top-left
        vec4( -1.00,  -1.00, 0.00, 1.00), // bottom-left
    ];

    // Load onto the GPU and associate variables in the shader
    //var colorBufferID = LoadDataOnGPU(gl, textureCoordinates, "vTexCoords", 3, shaderProgram);
    var vertexBufferId = LoadDataOnGPU(gl, points, "vPosition", 4, shaderProgram);

    // Global assigns to use the render in event handlers
    ggl =gl;
    gPointLength = points.length;
    gShaderProgram = shaderProgram;
    gWidth = canvas.width;
    gHeight = canvas.height;
    canvas.onclick = handleCanvasClick;

    // --- Draw that polygon! ---
    render();
};


