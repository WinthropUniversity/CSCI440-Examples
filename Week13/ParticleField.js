function drawInRange(range) {
    return (Math.random() * (range[1] - range[0]) + range[0]);
}


class ParticleField {
    constructor(gl, shaderProgram, numParticles, particleMass, xRange, yRange, zRange) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;
        this.numParticles = numParticles;
        this.mass = particleMass;
        this.xRange = xRange;
        this.yRange = yRange;
        this.zRange = zRange;

        this.positions = [];
        this.velocities = [];
        this.accelerations = []

        for (let pIdx=0; pIdx<this.numParticles; pIdx++) {
            this.positions.push( vec4(drawInRange(xRange),
                                      drawInRange(yRange),
                                      drawInRange(zRange),
                                      1.0) );
            this.velocities.push( vec3(0.0, 0.0, 0.0) );
            this.accelerations.push( vec3(0.0, 0.0, 0.0) );
        }
    }

    GetDistance(p1, p2) {
        const v = subtract(p1,p2);
        const vv = mult(v,v);
        return (Math.sqrt(vv[0] + vv[1] + vv[2]));
    }

    GetNeighboringIndices(kernelRange, sourceIdx) {
      var indexList = [];
      for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
          if (pIdx != sourceIdx) {
            var p1 = this.positions[pIdx];
            var p2 = this.positions[sourceIdx];
            if (this.GetDistance(p1,p2) <= kernelRange)
              indexList.push(pIdx);
          }
      }

      return (indexList);
    }


    UpdateAccelerations(kernelRange, integratingFunction) {
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            var nbrIndexes = this.GetNeighboringIndices(kernelRange, pIdx);
            var force = vec3(0,0,0);
            //for (let nIdx=0; nIdx<nbrIndexes.length; nIdx++) {
              //var a = integratingFunction(this.positions[pIdx],
              //                            this.positions[nIdx],
              //                            this.mass);
            //}
            this.accelerations[pIdx]= vec3(drawInRange([-0.1,0.1]),  // RPW:  Temporary for testing
                                           drawInRange([-0.1,0.1]),
                                           drawInRange([-0.1,0.1]));
        }
    }
 
    UpdateVelocities(dt){
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            const v = this.velocities[pIdx];
            const a = this.accelerations[pIdx];
            this.velocities[pIdx] = vec3( v[0] + a[0]*dt,
                                          v[1] + a[1]*dt,
                                          v[2] + a[1]*dt );
        }
    }

    BoundaryCheck(pIdx) {
        // Bounce off x wall
        if (this.positions[pIdx][0] < this.xRange[0]) {
          this.positions[pIdx][0] = this.xRange[0];
          this.velocities[pIdx][0] = -this.velocities[pIdx][0];
        }
        else if (this.positions[pIdx][0] > this.xRange[1]) {
            this.positions[pIdx][0] = this.xRange[1];
            this.velocities[pIdx][0] = -this.velocities[pIdx][0];
        }

        // Bounce off y wall
        if (this.positions[pIdx][1] < this.yRange[0]) {
            this.positions[pIdx][1] = this.yRange[0];
            this.velocities[pIdx][1] = -this.velocities[pIdx][1];
        }
        else if (this.positions[pIdx][1] > this.yRange[1]) {
            this.positions[pIdx][1] = this.yRange[1];
            this.velocities[pIdx][1] = -this.velocities[pIdx][1];
        }

        // Bounce off z wall
        if (this.positions[pIdx][2] < this.zRange[0]) {
            this.positions[pIdx][2] = this.zRange[0];
            this.velocities[pIdx][2] = -this.velocities[pIdx][2];
        }
        else if (this.positions[pIdx][2] > this.zRange[1]) {
            this.positions[pIdx][2] = this.zRange[1];
            this.velocities[pIdx][2] = -this.velocities[pIdx][2];
        }   
    }

    UpdatePositions(dt){
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            const p = this.positions[pIdx];
            const v = this.velocities[pIdx];
            this.velocities[pIdx] = vec3( p[0] + v[0]*dt,
                                          p[1] + v[1]*dt,
                                          p[2] + v[1]*dt );
            this.BoundaryCheck(pIdx);
        }
    }

    InitialGPULoad() {
        // Load the vertex data into the GPU
        this.vertexBufferID = this.gl.createBuffer();                    // Create space on GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.positions), this.gl.STATIC_DRAW); // Load data into space

        // Associate out shader position variables with our data buffer
        var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); // Get variable position in Shader
        this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);      // Point variable to currently bound buffer
        this.gl.enableVertexAttribArray(posVar);                                 // Enable the attribute for use
    }

    UpdateGPU() {
        // Load the vertex data into the GPU
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);   // Select that space to much about with
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.positions), this.gl.STATIC_DRAW); // Load data into space
    }

}