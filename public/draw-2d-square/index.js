const canvas = document.querySelector("#glCanvas");

// initialize gl context
const gl = canvas.getContext("webgl");

// if the browser doesn't support WebGL, the variable would be null (returned by getContext())
if (!gl) {
    console.error("Unable to initialize WebGL. Your browser or machine may not support it.");
}

// In shader codes, qualifiers give variables special meaning:
// 1.attribute - a read-only global variable passed from WebGL application, this qualifier can 
//   only be used in vertex shader. It changes per vertex.
// 2.const - constant of compile time.
// 3.uniform - a read-only gloval variable passed from WebGL application and can be used in both
//   vertex shader and fragment shader. It changes per primitive.
// 4.varying - used for interpolated data between a vertex shader and a fragment shader.
//   Available for writing in the vertex shader, and read-only in a fragment shader
//
// see also: http://www.lighthouse3d.com/tutorials/glsl-12-tutorial/data-types-and-variables/

const vsSource = `

    // VERTEX SHADER
    attribute vec4 aVertexPosition;

    // uModelViewMatrix is a combination of view_matrix(obj space->world space) * model_matrix(camera's view)
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsSource = `
    
    // FRAGMENT SHADER (or pixel shader)
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attributeLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition')
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')
    }
};

drawScene(gl, programInfo, initBuffer(gl));

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to create or link the program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {

    // create a WebGLShader, parameter type can be either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
    const shader = gl.createShader(type);

    // set shader source code
    gl.shaderSource(shader, source);

    // compile shader into binary data so that it can be used in WebGLProgram
    gl.compileShader(shader);

    // status will be either true or false
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initBuffer(gl) {

    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, 1
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer
    };
}

function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // clear the canvas before we draw it
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * (Math.PI / 180);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;

    const projectionMatrix = glMatrix.mat4.create();

    glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);

    // tell WebGL how to pull out the positions from buffer into vertexPosition attribute
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0; // '0' to use numComponents instead
        const offset = 0; // start from position 0 of the buffer

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attributeLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );

        gl.enableVertexAttribArray(
            programInfo.attributeLocations.vertexPosition);

    }

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    );

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}












