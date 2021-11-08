/**
 *  This is a quick-and-dirty way to read Wafefront OBJ files into
 *  a Javascript dictionary.  The resulting dictionary will contain
 *  a list of all vertices (in vec3 format) of the object, a list of
 *  faces that are themselves each a list of triplets of indeces into
 *  the vertex list, a list of texture pairs, and a list of the normal
 *  vectors associated with each face.  Here is the OBJ format explained:
 *    https://en.wikipedia.org/wiki/Wavefront_.obj_file
 * 
 * @param {*} objURL The URL of the LOCAL obj file you want to load.
 * @returns Dictionary of vertices, faces, textures, and normals in OBJ file.
 */
function SimpleObjParse(objURL) {
    // Go get the object file
    objFileContents = fetch(objURL, {credentials: 'same-origin'});

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
    const normalRE  = /^vt .*/;

    for (let lineIDX=0; lineIDX<objFileLines.length; ++lineIDX) {
        // Trim the line of white space on either side
        const line = lines[lineNo].trim();

        // Check for the matches above
        vertextMatch = vertexRE.exec(line);
        faceMatch    = faceRE.exec(line);
        textureMatch = textureRE.exec(line);
        normalMatch = normalRE.exec(line);
        
        // If this is a vertext line:  'v 1.000000 1.000000 -1.000000'
        if (vertexMatch != null) {
            fields = line.split(/\s/); // Split at white space
            vertextList.push( vec3(parseFloat(fields[1]),
                                   parseFloat(fields[2]),
                                   parseFloat(fields[3])) );
        }

        // If this is a face line: 'f 1/1/1 5/2/1 7/3/1 3/4/1'
        else if (faceMatch != null) {
            fields = line.split(/\s/); // Split at white space

            // Loop through every triplet 'n/n/n' and add each array of three indexes to faceList
            triangleList = new Array();
            for (let faceIDX=1; faceIDX<fields.length; ++faceIDX) {
                faceVertexIndexStrings = fields[faceIDX].split('/');
                faceVertexIndexes = new Array( parseInt(faceVertexIndexStrings[0]),
                                               parseInt(faceVertexIndexStrings[1]),
                                               parseInt(faceVertexIndexStrings[2]) );
                triangleList.push(faceVertexIndexes);
            }

            // Each face is a list of multiple triangles.  The faceList is a list of lists.
            faceList.push(triangleList);
        }
                
        // If this is a texture line:  'vt 0.875000 0.750000'
        else if (textureMatch != null) {
            fields = line.split(/\s/); // Split at white space
            textureList.push( new Array(parseFloat(fields[1]),
                                        parseFloat(fields[2])) );
        }                
                
        // If this is a vertext line:  'vn -1.0000 0.0000 0.0000'
        else if (normalMatch != null) {
            fields = line.split(/\s/); // Split at white space
            vertextList.push( vec3(parseFloat(fields[1]),
                                   parseFloat(fields[2]),
                                   parseFloat(fields[3])) );
        }                
    }// End master for loop

    return ( {"vertices":vertexList, 
              "faces":faceList, 
              "textures":textureList, 
              "normals":normalList});
}
