"use strict";


/**
 * Auther:  R. Paul Wiegand
 * Purpose:  Demonstrates how to read OBJ files and render them in WebGL.
 */


/**
 * Just an ugly way to get the contents from the fetch.
 * @param {*} objURL URL for the Wavefront OBJ file
 * @returns 
 */
async function UglyFetchWrapper(objURL) {
  const fetchResponse = await fetch(objURL);//, {mode:'no-cors'});
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



// --------------------------------------------------------
// Most of the rest below is stuff you've already seen


/**
 * This is just a convenient way to have the shape not be perfectly aligned on the 
 * axis.
 * @returns A simple 3D homogeneous transform to shrink and rotate the shape
 */
function GetModelTransformationMatrix() {
  var csy = Math.cos(-Math.PI/8);
  var sny = Math.sin(-Math.PI/8);
  var csx = Math.cos(-Math.PI/8);
  var snx = Math.sin(-Math.PI/8);

  // Some standard rotation matrices
  var ts = mat4( 0.25,  0.0,  0.0,  0.0,
                 0.0,  0.25,  0.0,  0.0,
                 0.0,  0.0,  0.25,  0.0,
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
                            "uniform mat4 uModelMatrix;" +  // Homogeneous transformation
                            "attribute vec3 vNormal;" +     // in-coming parameter
                            "varying vec3 fColor;" +       // Passing color variable
                            "void main() {" +
                            "    fColor = vNormal;" +  // Make the color the normal?
                            "    gl_Position = uModelMatrix * vPosition;" +
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
                             "varying vec3 fColor;" +
                             "void main() {" + 
                             "    gl_FragColor = vec4(fColor, 1.0);" +
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
    gl.clearColor( 0.9, 0.9, 0.9, 1.0 );              // BG:  Opaque Gray
    gl.enable(gl.DEPTH_TEST);

    // Setup the vertex and fragment shaders (for color)
    var shaderProgram = setupShaders(gl);

    const objFileContents = await UglyFetchWrapper('https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week7/teapot.obj');
    const objData = SimpleObjParse(objFileContents);
    const points = VerySimpleTriangleVertexExtraction(objData);  
    const normals = EstimateNormalsFromTriangles(points);  

    var vertexBufferId = LoadDataOnGPU(gl, points.flat(), "vPosition", 4, shaderProgram);
    var normalBufferId = LoadDataOnGPU(gl, normals.flat(), "vNormal", 3, shaderProgram);

    // --- Draw those ships! ---
    render(gl, points.length, shaderProgram);
};

window.onload = function init() {
  main();
}