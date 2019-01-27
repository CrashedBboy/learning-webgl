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
    attribute vec4 aVertexColor;

    // uModelViewMatrix is a combination of view_matrix(obj space->world space) * model_matrix(camera's view)
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    // 'lowp' is used to specify the lowest available precision for a variable
    // use 'varying' to pass color to fragment shader
    varying lowp vec4 vColor;

    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    // FRAGMENT SHADER (or pixel shader)

    // color data passed from vertexShader
    varying lowp vec4 vColor;

    void main() {
        gl_FragColor = vColor;
        // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);

    }
`;

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

const programInfo = {
    program: shaderProgram,
    attributeLocations: {

        // get location of variable 'aVertexPosition' in shader
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),

        // get location of variable 'aVertexColor'
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor')
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

    // create and initilaize a WebGLProgram object, which is a combination of compiled vertex shader and fragment shader
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

    // create a WebGLBuffer storing data (such as vertices or colors).
    const positionBuffer = gl.createBuffer();

    // bind the buffer to a specific buffer(binding point)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        -1, -1,
        -1, 1,
        1, -1,
        1, 1,
    ];

    // set ARRAY_BUFFER and value (vertices)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colors = [
        1.0, 1.0, 1.0, 1.0, // white
        1.0, 0.0, 0.0, 1.0, // red
        0.0, 1.0, 0.0, 1.0, // green
        0.0, 0.0, 1.0, 1.0 // blue
    ];

    const colorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer
    };
}

function drawScene(gl, programInfo, buffers) {

    // set a color value used for clean color buffer when calling clear() function
    // (means every value in color buffer will be cleared/set to rgba(0,0,0,1))
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // set a depth value used for clean depth buffer when calling clear() function
    gl.clearDepth(1.0);

    gl.enable(gl.DEPTH_TEST);

    // specify a method to determine depth value will pass the testing, ex: gl.NEVER, gl.LESS, gl.EQUAL, gl.ALWAYS...etc.
    gl.depthFunc(gl.LEQUAL);

    // clear the canvas before we draw it
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * (Math.PI / 180); // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;

    const projectionMatrix = glMatrix.mat4.create();

    // generates a perspective projection matrix with the given bounds.
    // here we use the library glMatrix.js, document link: http://glmatrix.net/docs/module-mat4.html
    glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // create a Float32Array(16) indentity matrix.
    const modelViewMatrix = glMatrix.mat4.create();

    // parameters: (destination:mat4, from:mat4, translation:vec3)
    // translation:vec3 [0, 0, -6] means translating 6 along z-axis
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);
    // translation result(modelViewMatrix) would be
    // [1, 0, 0, 0]
    // [0, 1, 0, 0]
    // [0, 0, 1, 0]
    // [0, 0, -6,0]

    // tell WebGL how to pull out the positions from buffer into vertexPosition attribute
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0; // '0' to use numComponents instead
        const offset = 0; // start from position 0 of the buffer

        // binds the buffer currently bound to gl.ARRAY_BUFFER 
        // to a generic vertex attribute(to vertexPosition of shader) of the current vertex buffer object
        // and specifies its layout.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attributeLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );

        // since attributes cannot be used unless enabled, and are disabled by default,
        // we need to call enableVertexAttribArray() to enable individual attributes so that they can be used
        gl.enableVertexAttribArray(
            programInfo.attributeLocations.vertexPosition);

    }

    // tell webGL how to pull out the colors from buffer into vertexColor attribute
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attributeLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );

        gl.enableVertexAttribArray(
            programInfo.attributeLocations.vertexColor
        );
    }

    // sets the specified WebGLProgram as part of the current rendering state
    gl.useProgram(programInfo.program);

    // specify matrix values for uniform variables
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false, // transpose or not
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

        // draw in triangle trip mode, see: https://en.wikipedia.org/wiki/Triangle_strip
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}