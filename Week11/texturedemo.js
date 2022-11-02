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

/**
 * Just an ugly way to get the contents from the fetch.
 * @param {*} objURL URL for the Wavefront OBJ file
 * @returns 
 */
 async function UglyFetchWrapper(objURL) {
  const fetchResponse = await fetch(objURL);
  const objFileContents = await fetchResponse.text();
  return objFileContents;
}

// The global objects list to cheat for rendering
var gObjectsList = [];

// The global gl and shader hooks to cheat for rendering
var ggl = null;
var gShaderProgram = null;
var gCanvas = null;


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
                            "attribute vec3 vNormal;" +    // in-coming normal vector to that vertex
                            "attribute vec2 vTexCoord;" +  // in-coming normal vector to that vertex
                            "varying vec4 fColor;" +       // color variable to pass through to fragment shader
                            "varying vec2 fTexCoord;" +    // texture coordinate to pass through to frag shader
                            "" + 
                            "uniform vec4 uAmbientProduct;" +      // Stored ambient color*material
                            "uniform vec4 uDiffuseProduct;" +      // Stored diffuse color*material
                            "uniform vec4 uSpecularProduct;" +     // Stored specular color*material
                            "uniform vec4 uLightPosition;" +        // Stored light source point or direction vector
                            "uniform float uShininess;" +          // Stored shininess coefficient
                            "" + 
                            "uniform mat4 uModelMatrix;" +         // Stored model transformation
                            "uniform mat4 uCameraMatrix;" +        // Camera view transformation
                            "uniform mat4 uProjectionMatrix;" +    // Projection transformation
                            "" + 
                            "void main() {" +
                            "  vec3 vertexPos = (uModelMatrix * vPosition).xyz;" + // 3D vertex in model coords
                            "" + 
                            "  vec3 L;" +
                            "  if (uLightPosition.w==0.0) L = normalize(uLightPosition.xyz);" +  // If light is directional
                            "  else L = normalize(uLightPosition.xyz-vertexPos);" +              // If light is a point
                            "" +
                            "  vec3 E = -normalize(vertexPos);"+  // Direction of the viewer
                            "  vec3 H = normalize(L+E);" +        // Halfway vector
                            "  vec3 N = normalize( (uModelMatrix * vec4(vNormal,0.0)).xyz );" + // Normal vector in world coords
                            "" + // below are the Phong-Blinn terms
                            "  vec4 ambient = uAmbientProduct;" +                       // Ambient term
                            "  vec4 diffuse = max( dot(L,N), 0.0) * uDiffuseProduct;" + // Diffuse term
                            "  vec4 specular = pow( max( dot(N,H), 0.0), uShininess) * uSpecularProduct;" + // Specular term
                            "  if ( dot(L,N) < 0.0) specular = vec4(0.0, 0.0, 0.0, 1.0);" + // If the light source is out of position
                            "" + // now compute color
                            "  fColor = ambient + diffuse + specular;" + 
                            "  fColor.a = 1.0;" + // Ignore transluscence for now  */
                            //"  fColor = vec4(vNormal, 1.0);" + // Null-op the lighting
                            "  fTexCoord = vTexCoord;" + // Pass along the texture coordinate
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
                             "varying vec4 fColor;" +
                             "varying  vec2 fTexCoord;" +
                             "uniform sampler2D texture;" +
                             "void main() {" + 
                             "    if (fTexCoord.x < 0.0)" +  // Flag to ignore texture
                             "      gl_FragColor = fColor;" +
                             "    else" +
                             //"      gl_FragColor = texture2D( texture, fTexCoord );" +  // Use only texture
                             "      gl_FragColor = texture2D( texture, fTexCoord );" +  // Combine texture
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



// -- These are the button event handlers ---

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

    render();
}


/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 */
function render() {
    ggl.clear( ggl.COLOR_BUFFER_BIT | ggl.DEPTH_BUFFER_BIT);

    for (let objIdx=0; objIdx<gObjectsList.length; objIdx++)
      gObjectsList[objIdx].Draw();
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
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );              // BG:  Opaque Gray
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
    var lightPosition = vec4(1.0, 1.0, -1.0, 0.0 );
    gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uLightPosition"),flatten(lightPosition) );  

    // Setup a model!
    var modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/teapot.obj';
    //var modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/windmill.obj';
    var objFileContents = await UglyFetchWrapper(modelURL);    
    var myObject = new ThreeDimObj(gl, shaderProgram, objFileContents);
    myObject.Scale(0.05, 0.05, 0.05);
    myObject.Translate(-0.2, -0.2, -0.2);
    myObject.SetMatrialProperties(vec4(0.8,0.8,0.8,1.0), 10000.0);
    gObjectsList.push(myObject);

    modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/cube.obj';
    objFileContents = await UglyFetchWrapper(modelURL);    
    myObject = new ThreeDimObj(gl, shaderProgram, objFileContents);
    myObject.Scale(0.1, 0.1, 0.1);
    myObject.Translate(0.2, 0.2, 0.2);
    myObject.RotateAroundAxes(30,15,20);
    myObject.SetMatrialProperties(vec4(1.0,0.0,0.0,1.0), 10000.0);
    var image = new Image();
    image.onload = function() {
      myObject.SetTextureProperties(image);
    }
    image.crossOrigin = "anonymous";  // to avoid the CORS error ...
    image.src = "https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week11/falltexture.png";
    //image.src = "https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week11/lavapaul.png";
    gObjectsList.push(myObject);

  
    // --- Setup event handlers and draw those things! ---
    ggl = gl;
    gShaderProgram = shaderProgram;
    gCanvas = canvas;
    document.getElementById("zcamera").oninput = handleCameraPosition
    document.getElementById("thetacamera").oninput = handleCameraPosition
    render();
};

window.onload = function init() {
  main();
}
