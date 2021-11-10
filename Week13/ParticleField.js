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

        const xlb = this.xRange[0];
        const xub = 0.1*(this.xRange[1] - this.xRange[0]) + this.xRange[0];

        for (let pIdx=0; pIdx<this.numParticles; pIdx++) {
            this.positions.push( vec4(drawInRange([xlb, xub]),
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
        const MAXFORCE=0.1;
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            var nbrIndexes = this.GetNeighboringIndices(kernelRange, pIdx);
            var force = vec4(0,-10.0,0);  // Initial force of gravity
            for (let nIdx=0; nIdx<nbrIndexes.length; nIdx++) {
              var p0 = this.positions[pIdx];
              var p1 = this.positions[nIdx];

              if (p0!=p1) {
                try {
                    // Compute the direction and magnitude of the force
                    var v = subtract(p1,p0);
                    var dir = normalize(v);
                    var distSq = dot(v,v);
                    var gravConst = -0.01;
                    if (distSq>kernelRange/3) gravConst = -gravConst;
                    var forceMag = Math.min(gravConst * this.mass * this.mass / distSq, MAXFORCE);

                    // Accumulate the force, but make sure it stays a vector
                    force = add(force, scale(forceMag, dir ) );
                    force[3] = 0.0;
                } catch (err) {};
              }
            }
            this.accelerations[pIdx]= force;//vec3(drawInRange([-0.1,0.1]),  // RPW:  Temporary for testing
                                      //     drawInRange([-0.1,0.1]),
                                      //     drawInRange([-0.1,0.1]));
            if (this.positions[pIdx][0] == NaN) this.positions[pIdx][0] = 0;
            if (this.positions[pIdx][1] == NaN) this.positions[pIdx][1] = 0;
            if (this.positions[pIdx][2] == NaN) this.positions[pIdx][2] = 0;
            if (this.positions[pIdx][3] != 1.0) this.positions[pIdx][2] = 1.0;
        }
    }
 
    UpdateVelocities(dt){
        const FRICTION=0.5;
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            const v = scale(FRICTION,this.velocities[pIdx]);
            const a = scale(FRICTION,this.accelerations[pIdx]);
            this.velocities[pIdx] = vec3( v[0] + a[0]*dt,
                                          v[1] + a[1]*dt,
                                          v[2] + a[2]*dt );
        }
    }

    BoundaryCheck(pIdx) {
        const oldPoint = this.positions[pIdx];

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

        if (this.positions[pIdx][0] == NaN) this.positions[pIdx] = oldPoint;
        if (this.positions[pIdx][1] == NaN) this.positions[pIdx] = oldPoint;
        if (this.positions[pIdx][2] == NaN) this.positions[pIdx] = oldPoint;
    }

    UpdatePositions(dt){
        for (let pIdx=0; pIdx<this.positions.length; pIdx++) {
            const p = this.positions[pIdx];
            const v = this.velocities[pIdx];
            this.positions[pIdx] = vec4( p[0] + v[0]*dt,
                                         p[1] + v[1]*dt,
                                         p[2] + v[2]*dt, 1.0 );
            this.BoundaryCheck(pIdx);
        }
        //alert(this.positions[0]);
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
        var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); // Get variable position in Shader
        this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);      // Point variable to currently bound buffer
    }

}