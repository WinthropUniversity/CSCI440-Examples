

/**
 *  This provides a class that allows us to easily make various
 *  objects to represent little pyrimidal ships to fly around our world!
 *  This assumes the gl library and the shader program have already been
 *  setup.
 */
class ThreeDimObj {
    constructor(gl, shaderProgram, modelFileContents) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;

        // Setup the geometry of the Object, Loaded onto the GPU
        const objFileContents = modelFileContents
        const objData = this.SimpleObjParse(objFileContents);
        this.points   = this.VerySimpleTriangleVertexExtraction(objData);
        this.normals  = this.EstimateNormalsFromTriangles(this.points);

        // By default, do not use a texture.  Use null as a flag
        this.textureImage = null;
        this.textureID = null;
        this.texturePoints = [];
        for (let ptIdx=0; ptIdx<this.points.length; ptIdx++)
          this.texturePoints.push( vec2(-1, -1) ); // Use [-1,-1] as a flag in shader

        // Load points, normals, and texcoords onto the GPU
        this.LoadDataOnGPU();

        // Default Material & Light Properties
        this.SetMatrialProperties(vec4(1.0, 0.75, 0.25, 1.0),  100.0); 
        this.SetLightingProperties(vec4(0.25, 0.25, 0.25, 1.0),   // ambient, low-level
                                   vec4(1.0, 1.0, 1.0, 1.0),   // diffuse, white
                                   vec4(1.0, 1.0, 1.0, 1.0));  // specular, white


        // Setup the transformation matrix, Loaded onto the GPU
        this.matrixLoc = this.gl.getUniformLocation(shaderProgram, "uModelMatrix");
        if (this.matrixLoc == null)
            console.log("Could not find the 'uModelMatrix' shader variable at render time.");
        this.transformationMatrix = mat4(1, 0, 0, 0,
                                         0, 1, 0, 0,
                                         0, 0, 1, 0,
                                         0, 0, 0, 1);
        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));
    }


    /**
     *  Load data onto the GPU and associate the buffer with that data.  Then
     *  (if a variable name is given), associate the variable with the one in the
     *  shader.  Return the ID for the GPU buffer, in case it is useful later.
     */
    LoadDataOnGPU() {
        // Load the vertex data into the GPU
        this.vertexBufferID = this.gl.createBuffer();                    // Create space on GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.points), this.gl.STATIC_DRAW); // Load data into space

        // Associate out shader position variables with our data buffer
        var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); // Get variable position in Shader
        this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);      // Point variable to currently bound buffer
        this.gl.enableVertexAttribArray(posVar);                                 // Enable the attribute for use

        // Load the normal data into the GPU
        this.normalBufferID = this.gl.createBuffer();                    // Create space on GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.normals), this.gl.STATIC_DRAW); // Load data into space

        // Associate out shader position variables with our data buffer
        var normVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal");  // Get variable position in Shader
        this.gl.vertexAttribPointer(normVar, 3, this.gl.FLOAT, false, 0, 0);     // Point variable to currently bound buffer
        this.gl.enableVertexAttribArray(normVar);                                // Enable the attribute for use

        // Load the texture coordinate data into the GPU
        this.textureBufferID = this.gl.createBuffer();                    // Create space on GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.texturePoints), this.gl.STATIC_DRAW); // Load data into space

        // Associate out shader position variables with our data buffer
        var texVar = this.gl.getAttribLocation(this.shaderProgram, "vTexCoord");  // Get variable position in Shader
        this.gl.vertexAttribPointer(texVar, 2, this.gl.FLOAT, false, 0, 0);       // Point variable to currently bound buffer
        this.gl.enableVertexAttribArray(texVar);                                  // Enable the attribute for use        
    }


    /**
     * Accessor method for setting the material properties of the object
     * @param {*} matrialColor Color of the object's material
     * @param {*} matrialShininess Coefficient for shininess
     */
    SetMatrialProperties(matrialColor, matrialShininess) {
        // Setup low-level Ambient lighting
        this.ambientMaterial = matrialColor;
        this.diffuseMaterial = matrialColor;
        this.specularMaterial = matrialColor;
        this.shininess = matrialShininess;
    }


    /**
     * Accessor method for setting up the lighting conditions of the object.
     * @param {*} ambientLightColor The color of ambient light hitting the object
     * @param {*} diffuseLightColor The color of diffuse light hitting the object
     * @param {*} specularLightColor The color of specular light hitting the object
     */
    SetLightingProperties(ambientLightColor, diffuseLightColor, specularLightColor) {
        this.ambientLight = ambientLightColor;
        this.diffuseLight = diffuseLightColor;
        this.specularLight = specularLightColor;
    }


    /**
     * Set the texture properties.
     * @param {*} textureImage Image to use as a texture
     * @param {*} textureWidth Texture image width
     * @param {*} textureHeight Texture image height
     */
    SetTextureProperties(textureImage, textureWidth, textureHeight) {
        this.textureImage = textureImage;

        // Create the texture setup in the graphics pipeline
        this.textureID = this.gl.createTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureID);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        // Define an image as a texture
        this.gl.texImage2D(this.gl.TEXTURE_2D, // What kind of texture?
                           0,                  // Level for MipMapping
                           this.gl.RGBA,       // How many components per texel?
                           this.gl.RGBA,       // Color format of texels
                           this.gl.UNSIGNED_BYTE, // Type of data of texel components
                           this.textureImage); // Actual image to map

        // Setup MipMap filter
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D,              // Target of the filter
                              this.gl.TEXTURE_MIN_FILTER,      // Type of filter to use
                              this.gl.NEAREST_MIPMAP_LINEAR ); // Mode of the filter
        this.gl.texParameteri(this.gl.TEXTURE_2D,              // Target of the filter
                              this.gl.TEXTURE_MAG_FILTER,      // Type of filter to use
                              this.gl.NEAREST );               // Mode of the filter
    

        // Get the texture coordinate data and load onto the GPU
        this.texturePoints = this.ExtractTextureCoordsForRectangularFaces(this.points);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.texturePoints), this.gl.STATIC_DRAW); // Load data into space
    }
      

    /**
     * Select this shape in the GPU then draw it.
     */
    Draw() {
        // Select this shape's points buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);                // Select this shape's buffer
        var positionVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); // Get position variable in shader
        this.gl.vertexAttribPointer(positionVar, 4, this.gl.FLOAT, false, 0, 0);      // Point variable to current bound buffer

        // Select this shape's normal buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBufferID);           // Select this shape's buffer
        var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal"); // Get position variable in shader
        this.gl.vertexAttribPointer(colorVar, 3, this.gl.FLOAT, false, 0, 0);    // Point variable to current bound buffer

        // Select this shape's texture buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);           // Select this shape's buffer
        var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vTexCoord"); // Get position variable in shader
        this.gl.vertexAttribPointer(colorVar, 2, this.gl.FLOAT, false, 0, 0);    // Point variable to current bound buffer

        // Send this ship's transformation matrix to the GPU
        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));

        // Send the lighting/matrial info to the GPU
        var ambientProduct = mult(this.ambientLight, this.ambientMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uAmbientProduct"), flatten(ambientProduct));
      
        var diffuseProduct = mult(this.diffuseLight, this.diffuseMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uDiffuseProduct"), flatten(diffuseProduct));
      
        var specularProduct = mult(this.specularLight, this.specularMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uSpecularProduct"), flatten(specularProduct));
      
        this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram,"uShininess"),this.shininess);

        // Draw the stupid thing, finally
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.points.length);         
    }


    // -------------------- Model Transformation Helper Methods ------------------------

    /**
    *  Reset the internal transformation matrix back to the identity matrix. 
    */
    ResetMatrix() {
        this.transformationMatrix = mat4(1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0)
    }

    /**
     * Move the ship in space.
     * @param {*} tx  Translate in x direction
     * @param {*} ty  Translate in y direction
     * @param {*} tz  Translate in z direction
     * @param {*} compose Indicate whether you are composing with previous matrix or replacing
     */
    Translate(tx, ty, tz, compose=true) {
        // Setup the translation matrix
        var T = mat4(1.0, 0.0, 0.0, tx,
                     0.0, 1.0, 0.0, ty,
                     0.0, 0.0, 1.0, tz,
                     0.0, 0.0, 0.0, 1.0);

        // Update the ship's transformation matrix
        if (compose)
          this.transformationMatrix = mult(T, this.transformationMatrix);
        else
          this.transformationMatrix = T;
    }

    /**
     * Stretch the ship in space.
     * @param {*} sx  Stretch along x
     * @param {*} sy  Stretch along y
     * @param {*} sz  Stretch along z
     * @param {*} compose Indicate whether you are composing with previous matrix or replacing
     */
    Scale(sx, sy, sz, compose=true) {
        // Setup the translation matrix
        var S = mat4(sx, 0.0, 0.0, 0,
                     0.0, sy, 0.0, 0,
                     0.0, 0.0, sz, 0,
                     0.0, 0.0, 0.0, 1.0);

        // Update the ship's transformation matrix
        if (compose)
          this.transformationMatrix = mult(S, this.transformationMatrix);
        else
          this.transformationMatrix = S;
    }


    /**
     * Given an angle (in degrees), rotate around the x-axis,
     * y-axies, and z-axis in that order.  
     * @param {*} angleX  Angle (in degrees) to rotate around the x-axis.
     * @param {*} angleY  Angle (in degrees) to rotate around the x-axis.
     * @param {*} angleZ  Angle (in degrees) to rotate around the x-axis.
     * @param {*} compose Indicate whether you are composing with previous matrix or replacing
     */
    RotateAroundAxes(angleX, angleY, angleZ, compose=true) {
        var csx = Math.cos(angleX * Math.PI / 180.0);
        var snx = Math.sin(angleX * Math.PI / 180.0);
        var csy = Math.cos(angleY * Math.PI / 180.0);
        var sny = Math.sin(angleY * Math.PI / 180.0);
        var csz = Math.cos(angleZ * Math.PI / 180.0);
        var snz = Math.sin(angleZ * Math.PI / 180.0);

        var Rx = mat4(1.0, 0.0, 0.0, 0.0,
            0.0, csx, -snx, 0.0,
            0.0, snx, csx, 0.0,
            0.0, 0.0, 0.0, 1.0);

        var Ry = mat4(csy, 0.0, sny, 0.0,
            0.0, 1.0, 0.0, 0.0,
            -sny, 0.0, csy, 0.0,
            0.0, 0.0, 0.0, 1.0);

        var Rz = mat4(csz, -snz, 0.0, 0.0,
            snz, csz, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0);

        var R = mult(Rz, mult(Ry, Rx));

        // Update the ship's transformation matrix
        if (compose)
          this.transformationMatrix = mult(R, this.transformationMatrix);
        else
          this.transformationMatrix = R;
    }


    /**
     * This performs quaternion rotation around a given vector.
     * @param {*} angle Angle of rotation (degrees)
     * @param {*} inV 3D Cartesian unit vector about which to rotate
     * @param {*} compose Indicate whether you are composing with previous matrix or replacing
     */
    RotateAroundVec(angle, inV, compose=true) {
        // Get Some convenient sinusoidal terms settled
        var theta = angle * Math.PI / 180.0;
        var c = Math.cos(theta / 2.0);
        var s = Math.sin(theta / 2.0);
        var ssq = s * s;

        // Make sure v is a unit vector
        var v = normalize(inV);
        var vx = v[0];
        var vy = v[1];
        var vz = v[2];

        var R = mat4(
            1 - 2 * ssq * (vy * vy + vz * vz), 2 * ssq * vx * vy - 2 * c * s * vz, 2 * ssq * vx * vz + 2 * c * s * vy, 0,
            2 * ssq * vx * vy + 2 * c * s * vz, 1 - 2 * ssq * (vx * vx + vz * vz), 2 * ssq * vy * vz - 2 * c * s * vx, 0,
            2 * ssq * vx * vz - 2 * c * s * vy, 2 * ssq * vy * vz + 2 * c * s * vx, 1 - 2 * ssq * (vx * vx + vy * vy), 0,
            0, 0, 0, 1);

        // Update the ship's transformation matrix
        if (compose)
          this.transformationMatrix = mult(R, this.transformationMatrix);
        else
          this.transformationMatrix = R;
    }


    // -------------------- OBJ Reading Helper Methods ------------------------


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
     SimpleObjParse(objFileContents) {
        // Split file text int into an array of lines
        const objFileLines = objFileContents.split('\n');

        // Store each type of data in its own array
        var vertexList = new Array(); // The vertices of the 3D object
        var faceList = new Array(); // See note below (*)
        var textureList = new Array(); // Ignore for now
        var normalList = new Array(); // The normal vectors associated with faces
        // (*) The faceList is a list of list of triplets of indexes
        //     each index is a triangle.  A list of triangles represents
        //     a particular face.  There's a normal associated with each face.
        //     An object may have many faces.

        const vertexRE = /^[vV] .*/;
        const faceRE = /^[fF] .*/;
        const textureRE = /^vt .*/;
        const normalRE = /^vn .*/;

        for (let lineIDX = 0; lineIDX < objFileLines.length; ++lineIDX) {
            // Trim the line of white space on either side
            const line = objFileLines[lineIDX].trim();

            // Check for the matches above
            const vertexMatch = vertexRE.exec(line);
            const faceMatch = faceRE.exec(line);
            const textureMatch = textureRE.exec(line);
            const normalMatch = normalRE.exec(line);

            // If this is a vertext line:  'v 1.000000 1.000000 -1.000000'
            if (vertexMatch != null) {
                const fields = line.split(/\s/); // Split at white space
                vertexList.push(vec4(parseFloat(fields[1]),
                    parseFloat(fields[2]),
                    parseFloat(fields[3]),
                    1.0));
            }

            // If this is a face line: 'f 1/1/1 5/2/1 7/3/1 3/4/1'
            else if (faceMatch != null) {
                const fields = line.split(/\s/); // Split at white space

                // Loop through every triplet 'vertexid/textureid/normalid' and add 
                // array of three indexes to faceList -- two of them, if there are four triplets
                var vidxList = new Array();
                for (let faceIDX = 1; faceIDX < fields.length; ++faceIDX) {
                    var faceVertexIndexStrings = fields[faceIDX].split('/');
                    vidxList.push(parseInt(faceVertexIndexStrings[0]));
                }

                // Each face can be a list of multiple triangles.
                for (let vidx = 1; vidx < vidxList.length - 1; ++vidx) {
                    // Subtract 1 from each index to make it zero-referenced
                    faceList.push([vidxList[0] - 1, vidxList[vidx] - 1, vidxList[vidx + 1] - 1]);
                }
            }

            // If this is a texture line:  'vt 0.875000 0.750000'
            else if (textureMatch != null) {
                const fields = line.split(/\s/); // Split at white space
                textureList.push(new Array(parseFloat(fields[1]),
                    parseFloat(fields[2])));
            }

            // If this is a vertext line:  'vn -1.0000 0.0000 0.0000'
            else if (normalMatch != null) {
                const fields = line.split(/\s/); // Split at white space
                normalList.push(vec3(parseFloat(fields[1]),
                    parseFloat(fields[2]),
                    parseFloat(fields[3])));
            }
        }// End master for loop

        return ({
            "vertices": vertexList,
            "faces": faceList,
            "textures": textureList,
            "normals": normalList
        });
    }


    /**
     *   This function takes a dictionary representing a Wavefront file and returns a 
     *   simple list of vertex triangles.  It is intended to be drawn with gl.TRIANGLES.
     * @param {*} objDictionary the Dictionary obtained from reading the Wavefront OBJ file
     * @returns Array of vec4 points representing the object
     */
    VerySimpleTriangleVertexExtraction(objDictionary) {
        const vertexList = objDictionary.vertices;
        const faceList = objDictionary.faces;
        var points = new Array();

        for (let faceIDX = 0; faceIDX < faceList.length; ++faceIDX) {
            const triangleList = faceList[faceIDX];

            points.push(vertexList[triangleList[0]]);
            points.push(vertexList[triangleList[1]]);
            points.push(vertexList[triangleList[2]]);
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
    EstimateNormalsFromTriangles(points) {
        var normals = new Array();

        for (let triIdx = 0; triIdx < points.length; triIdx += 3) {
            // Grab the next three points and assume they form a triangle
            const p0 = vec3(points[triIdx + 0][0],
                points[triIdx + 0][1],
                points[triIdx + 0][2]);
            const p1 = vec3(points[triIdx + 1][0],
                points[triIdx + 1][1],
                points[triIdx + 1][2]);
            const p2 = vec3(points[triIdx + 2][0],
                points[triIdx + 2][1],
                points[triIdx + 2][2]);

            // The nornal to the triangle is:
            //   (p2-p0) cross (p1-p0)
            const u1 = subtract(p2, p0);
            const u2 = subtract(p1, p0);
            var n = cross(u1, u2);

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
     * This function attempts to map vertices to a texture coordinate.
     * This is a *very* ugly routine that makes a number of pretty extreme
     * assumptions, the first of which is that each face is a rectangle.
     * Second, it assumes that the points are laid out p0, p1, p2, p3 in
     * clockwise or counter-clockwise order around that rectange.  It maps
     * each vertex to one corner of the parametric coordinates of the texture image.
     * Chances this works:  Very, very low ...
     * @param {*} points Array of vertices, assumed each four points form a face
     */
    ExtractTextureCoordsForRectangularFaces(points) {
        var texturePoints = new Array();

        for (let ptIdx = 0; ptIdx < points.length; ptIdx += 4) {
          texturePoints.push( vec2(0.0, 0.0) );
          texturePoints.push( vec2(1.0, 0.0) );
          texturePoints.push( vec2(1.0, 1.0) );
          texturePoints.push( vec2(0.0, 1.0) );
        }
    
        return (texturePoints);
    }

};