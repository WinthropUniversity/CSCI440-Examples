
/**
 *  This provides a class that allows us to easily make various
 *  objects to represent little pyrimidal ships to fly around our world!
 *  This assumes the gl library and the shader program have already been
 *  setup.
 */
class SimpleShip {
    constructor(gl, shaderProgram) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;

        // Setup the geometry of the ship
        this.CreateShapePoints();
        this.CreateShapeColors();

        // Set the transformation matrix
        this.matrixLoc = gl.getUniformLocation( shaderProgram, "uMatrix" );
        if (this.matrixLoc == null) 
          console.log("Could not find the 'uMatrix' shader variable at render time.");        
        this.transformationMatrix = mat4( 1, 0, 0, 0,
                                          0, 1, 0, 0,
                                          0, 0, 1, 0,
                                          0, 0, 0, 1 );   
        this.gl.uniformMatrix4fv( this.matrixLoc, false, flatten(this.transformationMatrix));

    }

    /**
     * Set the ship's geometry vertices.  This is called by the constructor.
     */
    CreateShapePoints() {
        this.shapePoints = [      
                // Bottom square face, T1
                vec4( 0.4,  0.0, -0.4,   1.0),  
                vec4( 0.0, -0.4, -0.4,   1.0), 
                vec4(-0.4,  0.0, -0.4,   1.0), 
                // Bottom square face, T2
                vec4( 0.4,  0.0, -0.4,   1.0),  
                vec4(-0.4,  0.0, -0.4,   1.0), 
                vec4( 0.0,  0.4, -0.4,   1.0),
                // side 1 triangle face
                vec4( 0.0, -0.4, -0.4,   1.0),  
                vec4( 0.0,  0.0,  0.4,   1.0), // Tip
                vec4( 0.4,  0.0, -0.4,   1.0), 
                // side 2 triangle face
                vec4( 0.4,  0.0, -0.4,   1.0),  
                vec4( 0.0,  0.0, -0.4,   1.0), // Tip
                vec4( 0.0,  0.4, -0.4,   1.0), 
                // side 3 triangle face
                vec4( 0.0,  0.4, -0.4,   1.0),  
                vec4( 0.0,  0.0,  0.4,   1.0), // Tip
                vec4(-0.4,  0.0, -0.4,   1.0), 
                // side 4 triangle face
                vec4(-0.4,  0.0, -0.4,   1.0),  
                vec4( 0.0,  0.0,  0.4,   1.0), // Tip
                vec4( 0.0, -0.4, -0.4,   1.0)
            ];
        
      // Load the vertex data into the GPU
      this.shapeBufferID = this.gl.createBuffer();                                   // Create space on GPU
      this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.shapeBufferID );                         // Select that space to much about with
      this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.shapePoints), this.gl.STATIC_DRAW ); // Load data into space

      var posVar = this.gl.getAttribLocation( this.shaderProgram, "vPosition" ); // Get variable position in Shader
      this.gl.vertexAttribPointer( posVar, 4, this.gl.FLOAT, false, 0, 0 );     // Point variable to currently bound buffer
      this.gl.enableVertexAttribArray( posVar );                           // Enable the attribute for use
    }

    /**
     * Set the ship's face colors.  This is called by the constructor.
     */
    CreateShapeColors() {
        this.shapeColors = [
            [1.0, 0.0, 0.0, 0.8], // red  // Square fase, T1
            [1.0, 0.0, 0.0, 0.8], // red
            [1.0, 0.0, 0.0, 0.8], // red
            [1.0, 0.0, 0.0, 0.8], // red  // Square fase, T2
            [1.0, 0.0, 0.0, 0.8], // red
            [1.0, 0.0, 0.0, 0.8], // red
            [0.0, 0.0, 1.0, 0.8], // blue //  Triangle side 1
            [0.0, 0.0, 1.0, 0.8], // blue
            [0.0, 0.0, 1.0, 0.8], // blue
            [1.0, 1.0, 1.0, 1.0], // purple //  Triangle side 2
            [1.0, 1.0, 1.0, 1.0], // purple
            [1.0, 1.0, 1.0, 1.0], // purple
            [0.0, 1.0, 0.0, 0.8], // green //  Triangle side 3
            [0.0, 1.0, 0.0, 0.8], // green
            [0.0, 1.0, 0.0, 0.8], // green
            [1.0, 1.0, 0.0, 0.8], // yellow //  Triangle side 4
            [1.0, 1.0, 0.0, 0.8], // yellow
            [1.0, 1.0, 0.0, 0.8], // yellow
          ];

        // Load the vertex data into the GPU
        this.colorBufferID = this.gl.createBuffer();                                   // Create space on GPU
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.colorBufferID );                         // Select that space to much about with
        this.gl.bufferData( this.gl.ARRAY_BUFFER, flatten(this.shapeColors), this.gl.STATIC_DRAW ); // Load data into space        

        // Select this shape's color buffer
        var colorVar = this.gl.getAttribLocation( this.shaderProgram, "vColor" ); // Get position variable in shader
        this.gl.vertexAttribPointer( colorVar, 4, this.gl.FLOAT, false, 0, 0 );     // Point variable to current bound buffer        
        this.gl.enableVertexAttribArray( colorVar );                           // Enable the attribute for use
    }

    /**
     * Select this shape in the GPU then draw it.
     */
    DrawShip() {
        // Select this shape's points buffer
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.shapeBufferID );          // Select this shape's buffer
        var positionVar = this.gl.getAttribLocation( this.shaderProgram, "vPosition" ); // Get position variable in shader
        this.gl.vertexAttribPointer( positionVar, 4, this.gl.FLOAT, false, 0, 0 );     // Point variable to current bound buffer

        // Select this shape's color buffer
        this.gl.bindBuffer( this.gl.ARRAY_BUFFER, this.colorBufferID );          // Select this shape's buffer
        var colorVar = this.gl.getAttribLocation( this.shaderProgram, "vColor" ); // Get position variable in shader
        this.gl.vertexAttribPointer( colorVar, 4, this.gl.FLOAT, false, 0, 0 );     // Point variable to current bound buffer

        // Send this ship's transformation matrix to the GPU
        this.gl.uniformMatrix4fv( this.matrixLoc, false, flatten(this.transformationMatrix));

        this.gl.drawArrays( this.gl.TRIANGLES, 0, this.shapePoints.length );         // Draw
    }
    

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
     */
    Translate(tx, ty, tz) {
        // Setup the translation matrix
        var T = mat4( 1.0,  0.0,  0.0, tx,
                      0.0,  1.0,  0.0, ty,
                      0.0,  0.0,  0.0, tz,
                      0.0,  0.0,  0.0, 1.0);      

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(T, this.transformationMatrix);                      
    }

    /**
     * Stretch the ship in space.
     * @param {*} sx  Stretch along x
     * @param {*} sy  Stretch along y
     * @param {*} sz  Stretch along z
     */
     Scale(sx, sy, sz) {
        // Setup the translation matrix
        var S = mat4( sx,   0.0,  0.0, 0,
                      0.0,  sy,   0.0, 0,
                      0.0,  0.0,  sz,  0,
                      0.0,  0.0,  0.0, 1.0);      

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(S, this.transformationMatrix);                      
    }


    /**
     * Given an angle (in degrees), rotate around the z-axis.  
     * @param {*} angle  Angle (in degrees) to rotate.
     */                   
    RotateAroundZ(angle) {
        var cs = Math.cos(angle*Math.PI/180.0);
        var sn = Math.sin(angle*Math.PI/180.0);   

        var Rz = mat4( cs,  -sn,   0.0,  0.0,
                       sn,   cs,   0.0,  0.0,
                       0.0,  0.0,  1.0,  0.0,
                       0.0,  0.0,  0.0,  1.0 );    

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(Rz, this.transformationMatrix);                      
    }
  

    /**
     * Given an angle (in degrees), rotate around the z-axis.  
     * @param {*} angle  Angle (in degrees) to rotate.
     */                   
     RotateAroundY(angle) {
        var cs = Math.cos(angle*Math.PI/180.0);
        var sn = Math.sin(angle*Math.PI/180.0);   

        var Ry = mat4( cs,   0.0,  sn,   0.0,
                       0.0,  1.0,  0.0,  0.0,
                       -sn,   0.0,  cs,   0.0,
                       0.0,  0.0,  0.0,  1.0 );     

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(Ry, this.transformationMatrix);                      
    }

   /**
     * Given an angle (in degrees), rotate around the z-axis.  
     * @param {*} angle  Angle (in degrees) to rotate.
     */                   
    RotateAroundX(angle) {
        var cs = Math.cos(angle*Math.PI/180.0);
        var sn = Math.sin(angle*Math.PI/180.0);   

        var Rx = mat4( 1.0,  0.0,  0.0,  0.0,
                       0.0,  cs,  -sn,   0.0,
                       0.0,  sn,   cs,   0.0,
                       0.0,  0.0,  0.0,  1.0 );     

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(Rx, this.transformationMatrix);                      
    }

    /**
     * This performs quaternion rotation around a given vector.
     * @param {*} angle Angle of rotation (degrees)
     * @param {*} inV 3D Cartesian unit vector about which to rotate
     */
    RotateAroundVec(angle, inV) {
        // Get Some convenient sinusoidal terms settled
        var theta = angle*Math.PI/180.0;
        var c = Math.cos(theta/2.0);
        var s = Math.sin(theta/2.0); 
        var ssq = s*s;
        
        // Make sure v is a unit vector
        var v = normalize(inV);
        var vx = v[0];
        var vy = v[1];
        var vz = v[2];
        
        var R = mat4( 
            1 - 2*ssq*(vy*vy + vz*vz),   2*ssq*vx*vy-2*c*s*vz,      2*ssq*vx*vz + 2*c*s*vy,   0,
            2*ssq*vx*vy + 2*c*s*vz,      1 - 2*ssq*(vx*vx+vz*vz),   2*ssq*vy*vz - 2*c*s*vx,   0,
            2*ssq*vx*vz - 2*c*s*vy,      2*ssq*vy*vz+2*c*s*vx,      1 - 2*ssq*(vx*vx+vy*vy),  0,
            0, 0, 0, 1);
        
        console.log("R =" + R);
        // Update the ship's transformation matrix
        this.transformationMatrix = mult(R, this.transformationMatrix);                      
    }


};