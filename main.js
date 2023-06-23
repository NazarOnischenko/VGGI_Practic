'use strict';

let gl;                         // The webgl context.
let surface, surface0;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let sphere;
let userPoint;
let magnit;
let texture, texture0;
let video, track, CAM;
function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iVertexTextureBuffer = gl.createBuffer();
  this.count = 0;
  this.textureCount = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.TextureBufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.textureCount = vertices.length / 2;
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertexTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertexTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }

  this.DrawSphere = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribVertexTexture = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iTMU = -1;
  this.iUserPoint = -1;
  this.iMagnit = 1;
  this.iTranslateSphere = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mProjectionMatrix = null;
  this.mModelViewMatrix = null;

  this.ApplyLeftFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-b * this.mNearClippingDistance) / this.mConvergence;
    right = (c * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to right
    this.mModelViewMatrix = m4.translation(
      this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.ApplyRightFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-c * this.mNearClippingDistance) / this.mConvergence;
    right = (b * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to left
    this.mModelViewMatrix = m4.translation(
      -this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.updateCur = function() {
    let values = document.getElementsByClassName("cur");
    let eyeSep = 70.0;
    eyeSep = document.getElementById("e").value;
    values[0].innerHTML = eyeSep;
    this.mEyeSeparation = eyeSep;
    let ratio = 1.0;
    let fov = 0.8;
    fov = document.getElementById("f").value;
    values[1].innerHTML = fov;
    this.mFOV = fov;
    let nearClip = 5.0;
    nearClip = document.getElementById("n").value - 0.0;
    values[2].innerHTML = nearClip;
    this.mNearClippingDistance = nearClip
    let convergence = 2000.0;
    convergence = document.getElementById("c").value;
    values[3].innerHTML = convergence;
    this.mConvergence = convergence
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  // 
  if (start) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let modelView0 = m4.identity();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum00 = m4.multiply(m4.axisRotation([0.707, 0.707, 0], 0.0), modelView0);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let matAccum11 = m4.multiply(m4.translation(-0.5, -0.5, -10), matAccum00);
    let matAccum10 = m4.multiply(m4.scaling(5, 5, 1), matAccum11);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum10);
    CAM.ApplyLeftFrustum()
    // let modelViewProjectionLeft = m4.multiply(CAM.mProjectionMatrix, matAccum1);
    let modelViewProjectionLeft = m4.multiply(CAM.mProjectionMatrix, m4.multiply(matAccum1, deltaRotationMatrix));
    CAM.ApplyRightFrustum()
    // let modelViewProjectionRight = m4.multiply(CAM.mProjectionMatrix, matAccum1);
    let modelViewProjectionRight = m4.multiply(CAM.mProjectionMatrix, m4.multiply(matAccum1, deltaRotationMatrix));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);


    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iUserPoint, [userPoint.x, userPoint.y]);
    gl.uniform1f(shProgram.iMagnit, magnit);
    gl.uniform1f(shProgram.iB, -1);

    gl.uniform3fv(shProgram.iTranslateSphere, [-0., -0., -0.])
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video
    );
    surface0.Draw();
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjectionLeft);

    CAM.updateCur();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.colorMask(false, true, true, false);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, false, false, false);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjectionRight);
    surface.Draw()
    gl.colorMask(true, true, true, true);
    let translate = sinusoid(map(userPoint.x, 0, 1, 0, 2), map(userPoint.y, 0, 1, 0, Math.PI * 2))
    gl.uniform3fv(shProgram.iTranslateSphere, [translate.x, translate.y, translate.z])
    gl.uniform1f(shProgram.iB, 1);
    sphere.DrawSphere();
  }
}

function animation() {
  draw()
  window.requestAnimationFrame(animation)
}

function CreateSurfaceData() {
  let vertexList = [];

  const step = 0.01
  for (let i = 0; i < 2; i += step) {
    for (let j = 0; j < Math.PI * 2; j += step) {
      let v1 = sinusoid(i, j)
      let v2 = sinusoid(i + step, j)
      let v3 = sinusoid(i, j + step)
      let v4 = sinusoid(i + step, j + step)
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
    }
  }

  return vertexList;
}

function CreateSurfaceTextureData() {
  let vertexList = [];
  const step = 0.01;
  for (let i = 0; i < 2; i += step) {
    for (let j = 0; j < Math.PI * 2; j += step) {
      let u = map(i, 0, 2, 0, 1)
      let v = map(j, 0, Math.PI * 2, 0, 1)
      vertexList.push(u, v)
      u = map(i + step, 0, 2, 0, 1)
      vertexList.push(u, v)
      u = map(i, 0, 2, 0, 1)
      v = map(j + step, 0, Math.PI * 2, 0, 1)
      vertexList.push(u, v)
      u = map(i + step, 0, 2, 0, 1)
      v = map(j, 0, Math.PI * 2, 0, 1)
      vertexList.push(u, v)
      v = map(j + step, 0, Math.PI * 2, 0, 1)
      vertexList.push(u, v)
      u = map(i, 0, 2, 0, 1)
      v = map(j + step, 0, Math.PI * 2, 0, 1)
      vertexList.push(u, v)
    }
  }
  return vertexList
}

function map(val, f1, t1, f2, t2) {
  let m;
  m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
  return Math.min(Math.max(m, f2), t2);
}

function CreateSphereSurface(r = 0.05) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      let v2 = sphereSurfaceDate(r, lon + 0.5, lat);
      let v3 = sphereSurfaceDate(r, lon, lat + 0.5);
      let v4 = sphereSurfaceDate(r, lon + 0.5, lat + 0.5);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      lat += 0.5;
    }
    lat = -Math.PI * 0.5
    lon += 0.5;
  }
  return vertexList;
}

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}


function sinusoid(r, b) {
  const a = 1;
  const rr = 0.55;
  const n = 1;
  let x = r * Math.cos(b);
  let y = r * Math.sin(b);
  let z = a * Math.sin(n * Math.PI * r / rr)
  return { x: 0.55 * x, y: 0.55 * y, z: 0.55 * z }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribVertexTexture = gl.getAttribLocation(prog, "vertexTexture");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iTMU = gl.getUniformLocation(prog, 'TMU');
  shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');;
  shProgram.iMagnit = gl.getUniformLocation(prog, 'magnit');
  shProgram.iTranslateSphere = gl.getUniformLocation(prog, 'translateSphere');
  shProgram.iB = gl.getUniformLocation(prog, 'b');

  LoadTexture()
  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  surface.TextureBufferData(CreateSurfaceTextureData());
  sphere = new Model('Sphere');
  sphere.BufferData(CreateSphereSurface())
  surface0 = new Model("Surface0");
  surface0.BufferData([0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0])
  surface0.TextureBufferData([1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1])


  gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  startAudio()
  CAM = new StereoCamera(
    2000,
    70.0,
    1,
    0.8,
    5,
    100
  );
  readGyroscope()
  userPoint = { x: 0.7, y: 0.6 }
  magnit = 1.0;
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    getWebcam();
    texture0 = CreateWebCamTexture();
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  window.requestAnimationFrame(animation)
  // animation()
}

function LoadTexture() {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = 'anonymus';

  image.src = "https://raw.githubusercontent.com/NazarOnischenko/VGGI_Practic/main/512x512.jpg";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
    draw()
  }
}

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}

let sensor;
let deltaRotationMatrix;
let x, y, z, alpha = 0, beta = 0, gamma = 0;
const EPSILON = 0.0001;
let timeStamp = 0;
function readGyroscope() {
  timeStamp = Date.now();
  sensor = new Gyroscope({ frequency: 30 });
  sensor.addEventListener('reading', e => {
    x = sensor.x
    y = sensor.y
    z = sensor.z
    composeRotationMatrix()
  });
  sensor.start();
}
const MS2S = 1.0 / 1000.0;
let start = false;
function composeRotationMatrix() {
  let debug = document.getElementById("message2")
  if (x != null && y != null && z != null) {
    let dT = (Date.now() - timeStamp) * MS2S
    alpha += x * dT
    beta += y * dT
    gamma += z * dT
    let rotVec = [alpha, beta, gamma];
    if (Math.abs(alpha) < Math.PI * 0.25 && Math.abs(beta) < Math.PI * 0.25 && Math.abs(gamma) < Math.PI * 0.25) {
      deltaRotationMatrix = getRotationMatrixFromVector(rotVec)
    }
    else {
      alpha -= x * dT
      beta -= y * dT
      gamma -= z * dT
    }
    timeStamp = Date.now();
    start = true
  }
  else {
    debug.innerHTML = "null1"
  }
}

function getRotationMatrixFromVector(rotationVector) {
  const q1 = rotationVector[0];
  const q2 = rotationVector[1];
  const q3 = rotationVector[2];
  let q0;

  if (rotationVector.length >= 4) {
    q0 = rotationVector[3];
  } else {
    q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
    q0 = q0 > 0 ? Math.sqrt(q0) : 0;
  }
  const sq_q1 = 2 * q1 * q1;
  const sq_q2 = 2 * q2 * q2;
  const sq_q3 = 2 * q3 * q3;
  const q1_q2 = 2 * q1 * q2;
  const q3_q0 = 2 * q3 * q0;
  const q1_q3 = 2 * q1 * q3;
  const q2_q0 = 2 * q2 * q0;
  const q2_q3 = 2 * q2 * q3;
  const q1_q0 = 2 * q1 * q0;

  // if (R.length == 9) {
  //           R[0] = 1 - sq_q2 - sq_q3;
  //           R[1] = q1_q2 - q3_q0;
  //           R[2] = q1_q3 + q2_q0;
  //           R[3] = q1_q2 + q3_q0;
  //           R[4] = 1 - sq_q1 - sq_q3;
  //           R[5] = q2_q3 - q1_q0;
  //           R[6] = q1_q3 - q2_q0;
  //           R[7] = q2_q3 + q1_q0;
  //           R[8] = 1 - sq_q1 - sq_q2;
  //       } else if (R.length == 16) {
  let R = [];
  R.push(1 - sq_q2 - sq_q3);
  R.push(q1_q2 - q3_q0);
  R.push(q1_q3 + q2_q0);
  R.push(0.0);
  R.push(q1_q2 + q3_q0);
  R.push(1 - sq_q1 - sq_q3);
  R.push(q2_q3 - q1_q0);
  R.push(0.0);
  R.push(q1_q3 - q2_q0);
  R.push(q2_q3 + q1_q0);
  R.push(1 - sq_q1 - sq_q2);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(0.0);
  R.push(1.0);
  return R;
}

let audioElement = null;
let audioContext;
let audioSource;
let audioPanner;
let audioFilter;

function initializeAudio() {
  audioElement = document.getElementById('audio');

  audioElement.addEventListener('play', handlePlay);

  audioElement.addEventListener('pause', handlePause);
}

function handlePlay() {
  console.log('play');
  if (!audioContext) {
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioPanner = audioContext.createPanner();
    audioFilter = audioContext.createBiquadFilter();

    // Connect audio nodes
    audioSource.connect(audioPanner);
    audioPanner.connect(audioFilter);
    audioFilter.connect(audioContext.destination);

    // Set filter parameters
    audioFilter.type = 'lowpass';
    audioFilter.Q.value = 1;
    audioFilter.frequency.value = 1055;
    audioFilter.gain.value = 15;

    audioContext.resume();
  }
}

function handlePause() {
  console.log('pause');
  audioContext.resume();
}

function toggleFilter() {
  let filterCheckbox = document.getElementById('filterCheckbox');
  if (filterCheckbox.checked) {
    // Connect filter when checkbox is checked
    audioPanner.disconnect();
    audioPanner.connect(audioFilter);
    audioFilter.connect(audioContext.destination);
  } else {
    // Disconnect filter when checkbox is unchecked
    audioPanner.disconnect();
    audioPanner.connect(audioContext.destination);
  }
}

function startAudio() {
  initializeAudio();

  let filterCheckbox = document.getElementById('filterCheckbox');
  filterCheckbox.addEventListener('change', toggleFilter);

  audioElement.play();
}
