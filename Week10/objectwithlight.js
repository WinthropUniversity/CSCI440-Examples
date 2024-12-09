"use strict";


/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates some basic lighting.
 */


var ggl;
var gPointLength;
var gShaderProgram;
var gLightPosition = vec4(-3, -3, 3, 0.0 );
var gEyePosition = vec4(0,0,2,1);

/**
 * Just an ugly way to get the contents from the fetch.
 * @param {*} objURL URL for the Wavefront OBJ file
 * @returns 
 */
async function UglyFetchWrapper(objURL) {
  //const fetchResponse = await fetch(objURL, {mode:'no-cors'});
  //const fetchResponse = await fetch(objURL, {mode:'same-origin'});
  const fetchResponse = await fetch(objURL, {mode:'cors'});
  //const fetchResponse = await fetch(objURL);
  const objFileContents = await fetchResponse.text();
  return objFileContents;
}


/**
 *  This is a quick-and-dirty way to read Wafefront OBJ files into
 *  a Javascript dictionary.  The resulting dictionary will contain
 *  a list of all vertices (in vec4 format) of the object, a list of
 *  triangle indexes that map into the vertex list, a list of texture 
 *  pairs, and a list of the normal vectors associated with each face.  
 *  Here are good pages where the OBJ format explained:
 *    https://en.wikipedia.org/wiki/Wavefront_.obj_file
 *    https://webglfundamentals.org/webgl/lessons/webgl-load-obj.html
 * 
 * @param {*} objFileContents String containing the contents of an OBJ formatted file.
 * @returns Dictionary of vertices, faces, textures, and normals in OBJ file.
 */
function SimpleObjParse(objFileContents) {
  // Split file text int into an array of lines
  const objFileLines = objFileContents.split('\n');

  // Store each type of data in its own array
  var vertexList  = new Array(); // The vertices of the 3D object
  var faceList    = new Array(); // See note below (*)
  var textureList = new Array(); // Ignore for now
  var normalList  = new Array(); // The normal vectors associated with faces
  // (*) The faceList is a list of list of triplets of indexes
  //     each index is a triangle.  A list of triangles represents
  //     a particular face.  There's a normal associated with each face.
  //     An object may have many faces.

  const vertexRE  = /^v .*/;
  const faceRE    = /^f .*/;
  const textureRE = /^vt .*/;
  const normalRE  = /^vn .*/;

  for (let lineIDX=0; lineIDX<objFileLines.length; ++lineIDX) {
      // Trim the line of white space on either side
      const line = objFileLines[lineIDX].trim();

      // Check for the matches above
      const vertexMatch = vertexRE.exec(line);
      const faceMatch    = faceRE.exec(line);
      const textureMatch = textureRE.exec(line);
      const normalMatch = normalRE.exec(line);
      
      // If this is a vertext line:  'v 1.000000 1.000000 -1.000000'
      if (vertexMatch != null) {
          const fields = line.split(/\s/); // Split at white space
          vertexList.push( vec4(parseFloat(fields[1]),
                                parseFloat(fields[2]),
                                parseFloat(fields[3]),
                                1.0) );
      }

      // If this is a face line: 'f 1/1/1 5/2/1 7/3/1 3/4/1'
      else if (faceMatch != null) {
          const fields = line.split(/\s/); // Split at white space

          // Loop through every triplet 'vertexid/textureid/normalid' and add 
          // array of three indexes to faceList -- two of them, if there are four triplets
          var vidxList = new Array();
          for (let faceIDX=1; faceIDX<fields.length; ++faceIDX) {
              var faceVertexIndexStrings = fields[faceIDX].split('/');
              vidxList.push( parseInt(faceVertexIndexStrings[0]) );
          }

          // Each face can be a list of multiple triangles.
          for (let vidx=1; vidx<vidxList.length-1; ++vidx) {
            // Subtract 1 from each index to make it zero-referenced
            faceList.push( [vidxList[0]-1, vidxList[vidx]-1, vidxList[vidx+1]-1 ]);
          }
      }
              
      // If this is a texture line:  'vt 0.875000 0.750000'
      else if (textureMatch != null) {
          const fields = line.split(/\s/); // Split at white space
          textureList.push( new Array(parseFloat(fields[1]),
                                      parseFloat(fields[2])) );
      }                
              
      // If this is a vertext line:  'vn -1.0000 0.0000 0.0000'
      else if (normalMatch != null) {
          const fields = line.split(/\s/); // Split at white space
          normalList.push( vec3(parseFloat(fields[1]),
                                parseFloat(fields[2]),
                                parseFloat(fields[3])) );
      }                
  }// End master for loop

  return ( {"vertices":vertexList, 
            "faces":faceList, 
            "textures":textureList, 
            "normals":normalList});
}


/**
 *   This function takes a dictionary representing a Wavefront file and returns a 
 *   simple list of vertex triangles.  It is intended to be drawn with gl.TRIANGLES.
 * @param {*} objDictionary the Dictionary obtained from reading the Wavefront OBJ file
 * @returns Array of vec4 points representing the object
 */
function VerySimpleTriangleVertexExtraction(objDictionary) {
  const vertexList = objDictionary.vertices;
  const faceList = objDictionary.faces;
  var points = new Array();

  for (let faceIDX=0; faceIDX<faceList.length; ++faceIDX) {
      const triangleList = faceList[faceIDX];

      points.push( vertexList[ triangleList[0] ] );
      points.push( vertexList[ triangleList[1] ] );
      points.push( vertexList[ triangleList[2] ] );
  }

  return (points);
}


/**
 *   Assumme array of points is arranged so that every three points form a 
 *   triangle.  Then compute the normal to each triangle and create a list of
 *   such normals; one for every vertex.
 * @param {*} points An array of points, where every three points form a triangle
 * @returns Array of vec3 points representing the normals of the object polygons
 */
function EstimateNormalsFromTriangles(points) {
  var normals = new Array();

  for (let triIdx=0; triIdx<points.length; triIdx+=3) {
      // Grab the next three points and assume they form a triangle
      const p0 = vec3( points[triIdx+0][0],
                       points[triIdx+0][1],
                       points[triIdx+0][2] );
      const p1 = vec3( points[triIdx+1][0],
                       points[triIdx+1][1],
                       points[triIdx+1][2] );
      const p2 = vec3( points[triIdx+2][0],
                       points[triIdx+2][1],
                       points[triIdx+2][2] );

      // The nornal to the triangle is:
      //   (p2-p0) cross (p1-p0)
      const u1 = subtract(p2,p0);
      const u2 = subtract(p1,p0);
      var n = cross(u1,u2);

      // Make sure it is a unit vector
      n = normalize(n);

      // For now, let's assume the normal is the
      // same for all three vertices
      normals.push(n);
      normals.push(n);
      normals.push(n);
  }

  return (normals);
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

  /*var fovyRadian = fovy * Math.PI / 180.0;
  var nr = near;
  var fr = far;
  var tp = nr * Math.tan(fovyRadian);
  var rgt = tp * aspectRatio;
  var lft = -rgt;
  var bt = -bt;

  var M = mat4( 
    nr/rgt,  0,             0,                     0,
    0,      nr/tp,          0,                     0,
    0,      0,              -(fr+nr)/(fr-nr),      (-2*fr*nr)/(fr-nr),
    0,      0,              -1,                    0);*/
  

  // Or just use Angel & Shriener's function
  var M = perspective(fovy, aspectRatio, near, far);

  return ( M )
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
  /*// Get the normal vector, VPN p. 271, Angel & Schreiner
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
  var M = mult(A,T);

  // Invert to get the actual coord. rotation f
  M = inverse(A);*/

  // Or just use the built-in function for this ...
  var M = lookAt(eye, at, up);
  
  // Return the view orientation change matrix for the camera
  return (M);
}




/**
 * This is just a convenient way to have the shape not be perfectly aligned on the 
 * axis.
 * @returns A simple 3D homogeneous transform to shrink and rotate the shape
 */
function GetModelTransformationMatrix() {
  var scale = 0.02;//1.0;
  var angle = 0;//-Math.PI/8;
  var csy = Math.cos(angle);
  var sny = Math.sin(angle);
  var csx = Math.cos(angle);
  var snx = Math.sin(angle);

  // Some standard rotation matrices
  var ts = mat4( scale,  0.0,  0.0,  0.0,
                 0.0,  scale,  0.0,  0.0,
                 0.0,  0.0,  scale,  0.0,
                 0.0,  0.0,  0.0,  1.0 );                 
  var ry = mat4( csy,   0.0,  sny,   0.0,
                 0.0,  1.0,  0.0,  0.0,
                -sny,   0.0,  csy,   0.0,
                 0.0,  0.0,  0.0,  1.0 );
  var rx = mat4( 1.0,  0.0,  0.0,  0.0,
                  0.0,  csx,  -snx,   0.0,
                  0.0,  snx,   csx,   0.0,
                  0.0,  0.0,  0.0,  1.0 );  
 
  return ( mult(rx,mult(ry,ts)) );
  //return(ts);
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


/**
 * Build all the lighting components and send them to the GPU
 */
function SetupLighting(lightPosition, materialShininess, gl, shaderProgram) {
  // Setup low-level Ambient lighting
  var ambientColor = vec4(0.25, 0.25, 0.25, 1.0); 
  var ambientMaterial = vec4(1.0, 1.0, 1.0, 1.0);  
  //var ambientMaterial = vec4(0.50980395, 0.0, 0.0, 1.0);   // Teapot material colors
  var ambientProduct = mult(ambientColor, ambientMaterial);
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uAmbientProduct"), flatten(ambientProduct));

  // Setup white Diffuse lighting
  var diffuseColor = vec4(1.0, 1.0, 1.0, 1.0);
  var diffuseMaterial = vec4( 1.0, 0.75, 0.25, 1.0);   
  //var diffuseMaterial = vec4( 0.50980395, 0, 0, 1.0);      // Teapot material colors
  var diffuseProduct = mult(diffuseColor, diffuseMaterial);
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uDiffuseProduct"), flatten(diffuseProduct));

  // Setup white Specular lighting
  var speculaColor = vec4(1.0, 1.0, 1.0, 1.0);
  var specularMaterial = vec4( 1.0, 0.25, 0.75, 1.0);  
  //var specularMaterial = vec4( 0.80099994, 0.80099994, 0.80099994, 1.0);    // Teapot material colors
  var specularProduct = mult(speculaColor, specularMaterial);
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uSpecularProduct"), flatten(specularProduct));

  // Seutp shininess & light position
  gl.uniform1f(gl.getUniformLocation(shaderProgram,"uShininess"),materialShininess);
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uLightPosition"),flatten(lightPosition) );  
}


/** 
 * Get the camera view transform and store it on the GPU.  Here I move the eye around, but we always
 * look at the origin, and "up" is always in the positive y direction.
 **/
function SetupCamera(eye, gl, shaderProgram) {
  var cameraMatrix = GetCameraViewOrientationMatrix(vec3(eye[0], eye[1], eye[2]), // where is the camera?
                                                    vec3(0, 0, 0),    // where is it looking?
                                                    vec3(0, 1, 0) );  // Which way is up?
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uCameraMatrix"), false, flatten(cameraMatrix));   
  gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uEye"),flatten(eye) );     
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
 function SetupShaders(gl) {
    // Attach the GLSL code to the vertex shader, then compile it
    var vertexShaderCode =  "attribute vec4 vPosition;" +  // in-coming vertex point
                            "attribute vec3 vNormal;" +   // in-coming normal vector to that vertex
                            "varying vec4 fColor;" +       // color variable to pass through to fragment shader
                            "" + 
                            "uniform vec4 uAmbientProduct;" +      // Stored ambient color*material
                            "uniform vec4 uDiffuseProduct;" +      // Stored diffuse color*material
                            "uniform vec4 uSpecularProduct;" +     // Stored specular color*material
                            "uniform vec4 uLightPosition;" +       // Stored light source point or direction vector
                            "uniform float uShininess;" +          // Stored shininess coefficient
                            "uniform vec4 uEye;" +                 // Stored position of the viewer (camera)
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
                            "  vec3 E = normalize(uEye.xyz-vertexPos);"+  // Direction of the viewer
                            "  vec3 H = normalize(L+E);" +        // Halfway vector
                            "  vec3 N = normalize( (uModelMatrix * vec4(vNormal,0.0)).xyz );" + // Normal vector in world coords
                            "" +
                            "" + // below are the Phong-Blinn terms
                            "  vec4 ambient = uAmbientProduct;" +                       // Ambient term
                            "  vec4 diffuse = max( dot(L,N), 0.0) * uDiffuseProduct;" + // Diffuse term
                            "  vec4 specular = pow( max( dot(N,H), 0.0), uShininess) * uSpecularProduct;" + // Specular term
                            "  if ( dot(L,N) < 0.0) specular = vec4(0.0, 0.0, 0.0, 1.0);" + // If the light source is out of position
                            "" + // now compute color
                            "  fColor = ambient + diffuse + specular;" + 
                            "  fColor.a = 1.0;" + // Ignore transluscence for now  */
                            "" + // Now compute the position after perspective transformation
                            "  gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vPosition;" +
                            //"  gl_Position.x = gl_Position.x / gl_Position.w;" + // RPW:  WebGL does this for us??
                            //"  gl_Position.y = gl_Position.y / gl_Position.w;" +
                            //"  gl_Position.z = gl_Position.z / gl_Position.w;" +
                            //"  gl_Position.w = 1.0;" +
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

    return shaderProgram;
}


/**
 *  Draw our polygon as a filled polygon, using fanned triangles 
 *  to do so.
 */
function render(gl, pointLength, shaderProgram) {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Make sure the model transformation matrix is sent to the GPU
    var modelMatrixLoc = gl.getUniformLocation( shaderProgram, "uModelMatrix" );
    var modelMatrix = GetModelTransformationMatrix();
    gl.uniformMatrix4fv( modelMatrixLoc, false, flatten(modelMatrix));

    gl.drawArrays( gl.TRIANGLES, 0, pointLength );
}




// -- These are the button event handlers ---

/**
 *  This causes changes the shiny coefficient used in the lighting model.
 */
 function setShinyEventHandler() {
  var ts = parseFloat(document.getElementById("shinyslider").value);
  SetupLighting(gLightPosition, Math.pow(10.0,ts), ggl, gShaderProgram)
  render(ggl, gPointLength, gShaderProgram);
}



/**  This changes the angle of rotation of the eye of the camera around
 *   the y-axis.
 */
function setRotateYEventHandler() {
  // Get the angle of rotation directly from the slider on the web page,
  // then build an affine rotation matrix for rotation around the y-axis
  var theta = parseFloat(document.getElementById("yangleslider").value);
  var cs = Math.cos(theta);
  var sn = Math.sin(theta); 
  var ry = mat4( cs,   0.0,  sn,   0.0,
                 0.0,  1.0,  0.0,  0.0,
                -sn,   0.0,  cs,   0.0,
                 0.0,  0.0,  0.0,  1.0 ); 

  // Assume we start at +2 on the z-axis, then rotate from there
  gEyePosition = mult(ry, vec4(0,0,2,1)); 

  // Setup the camera view matrix on the GPU, then render the image!
  SetupCamera(gEyePosition, ggl, gShaderProgram); 
  render(ggl, gPointLength, gShaderProgram);
}


// -- This is the main function ---

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

    // Setup the vertex and fragment shaders (for color), as well as the lighting
    var shaderProgram = SetupShaders(gl);
    SetupLighting(gLightPosition, 100.0, gl, shaderProgram)

    // Go grab an obj file for a model
    //const modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/teapot.obj';
    //const modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/windmill.obj';
    //const modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/cube.obj';
    //const modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/refs/heads/master/Resources/Fox.obj';
    const modelURL = 'https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/refs/heads/master/Resources/car.obj';

    const objFileContents = await UglyFetchWrapper(modelURL);
    const objData = SimpleObjParse(objFileContents);
    const points = VerySimpleTriangleVertexExtraction(objData);  
    const normals = EstimateNormalsFromTriangles(points);  

    // Stage the shape and its normals onto the GPU for processing in the pipeline
    var vertexBufferId = LoadDataOnGPU(gl, points.flat(), "vPosition", 4, shaderProgram);
    var normalBufferId = LoadDataOnGPU(gl, normals.flat(), "vNormal", 3, shaderProgram);

    // Get the perspective transform and store it on the GPU
    var perspMatrix = GetPerspectiveProjectionMatrix(45, -.1, .1);
    gl.uniformMatrix4fv( gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, flatten(perspMatrix));     

    SetupCamera(gEyePosition, gl, shaderProgram);


    // --- Add Event Handlers ---
    ggl = gl;
    gPointLength = points.length;
    gShaderProgram = shaderProgram;
    document.getElementById("shinyslider").oninput = setShinyEventHandler
    document.getElementById("yangleslider").oninput = setRotateYEventHandler

    // --- Draw that thing! ---
    render(gl, points.length, shaderProgram);
};


window.onload = function init() {
  main();
}
