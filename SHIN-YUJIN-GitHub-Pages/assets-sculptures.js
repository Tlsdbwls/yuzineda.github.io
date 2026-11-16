/* Small native 3D meshes. The same geometry is pre-rendered for no-WebGL devices. */
(() => {
  'use strict';
  const normalize = v => { const d = Math.hypot(...v) || 1; return v.map(n => n / d); };
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const subtract = (a, b) => a.map((x, i) => x-b[i]);
  const path = t => [(2+.58*Math.cos(3*t))*Math.cos(2*t)*.29, (2+.58*Math.cos(3*t))*Math.sin(2*t)*.29, .58*Math.sin(3*t)*.29];
  function sample(kind, u, v) {
    if (kind === 'knot') {
      const c = path(u), t = normalize(subtract(path(u+.001), path(u-.001)));
      const n = normalize(cross(t, [0, 0, 1])), b = cross(t, n);
      const normal = n.map((x, i) => x*Math.cos(v)+b[i]*Math.sin(v));
      return { p: c.map((x, i) => x+normal[i]*.19), n: normal };
    }
    const position = (a, b) => {
      const r = kind === 'star' ? .69+.21*Math.cos(6*a) : .83;
      return [r*Math.cos(a)*Math.sin(b), r*Math.sin(a)*Math.sin(b), (kind === 'star' ? .34 : .83)*Math.cos(b)];
    };
    const p = position(u, v), du = subtract(position(u+.001, v), position(u-.001, v));
    const dv = subtract(position(u, v+.001), position(u, v-.001));
    let n = normalize(cross(dv, du));
    if (Math.hypot(...cross(dv, du)) < .00000001) n = normalize(p);
    if (n.reduce((s, x, i) => s+x*p[i], 0) < 0) n = n.map(x => -x);
    return { p, n };
  }
  function mesh(kind) {
    const data = [], nu = kind === 'knot' ? 160 : 96, nv = kind === 'knot' ? 24 : 36;
    const vmax = kind === 'knot' ? Math.PI*2 : Math.PI;
    for (let i=0; i<nu; i++) for (let j=0; j<nv; j++) {
      const a=sample(kind,i/nu*Math.PI*2,j/nv*vmax), b=sample(kind,(i+1)/nu*Math.PI*2,j/nv*vmax);
      const c=sample(kind,(i+1)/nu*Math.PI*2,(j+1)/nv*vmax), d=sample(kind,i/nu*Math.PI*2,(j+1)/nv*vmax);
      for (const q of [a,b,c,a,c,d]) data.push(...q.p, ...q.n);
    }
    return new Float32Array(data);
  }
  const vertex = `attribute vec3 position;attribute vec3 normal;uniform vec2 rotation;varying vec3 N;varying vec3 P;void main(){float cx=cos(rotation.x),sx=sin(rotation.x),cy=cos(rotation.y),sy=sin(rotation.y);mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);vec3 p=ry*rx*position;N=ry*rx*normal;P=p;float perspective=4.5/(4.5-p.z);gl_Position=vec4(p.xy*perspective,-p.z*.4,1.);}`;
  const fragment = `precision mediump float;varying vec3 N;varying vec3 P;uniform vec3 color;void main(){vec3 n=normalize(N);vec3 l=normalize(vec3(-.7,.85,1.3)),v=normalize(vec3(0.,0.,4.5)-P);float diffuse=max(dot(n,l),0.);float fill=max(dot(n,normalize(vec3(1.,-.15,.3))),0.);float spec=pow(max(dot(n,normalize(l+v)),0.),62.);float broad=pow(max(dot(n,normalize(l+v)),0.),10.);float rim=pow(1.-max(dot(n,v),0.),3.);vec3 c=color*(.29+diffuse*.67+fill*.2)+vec3(.99,.98,.94)*(spec*.65+broad*.17)+color*rim*.12;gl_FragColor=vec4(c,1.);}`;
  function renderer(canvas) {
    const gl = canvas.getContext('webgl', {alpha: true, antialias: true, premultipliedAlpha: true});
    if (!gl) { canvas.dataset.renderStatus = 'fallback'; return null; }
    let vs, fs, program, buffer;
    const release = () => {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      canvas.parentElement.classList.remove('has-sculpture');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    try {
      const shader = (type, source) => {
        const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('shader unavailable'); }
        return s;
      };
      vs = shader(gl.VERTEX_SHADER, vertex); fs = shader(gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('renderer unavailable');
      gl.useProgram(program);
      const kind = canvas.dataset.sculpture, data = mesh(kind);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [name, offset] of [['position', 0], ['normal', 12]]) {
        const a = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 24, offset);
      }
      const rot = gl.getUniformLocation(program, 'rotation'), color = gl.getUniformLocation(program, 'color');
      gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
      canvas.parentElement.classList.add('has-sculpture'); canvas.dataset.renderStatus = 'webgl';
      return {
        draw(x, y) {
          const size = Math.max(1, Math.round(canvas.clientWidth*Math.min(devicePixelRatio, 2)));
          if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
          gl.viewport(0, 0, size, size); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniform2f(rot, (kind === 'knot' ? .38 : kind === 'star' ? -.28 : 0)+x, (kind === 'star' ? .36 : kind === 'knot' ? -.42 : 0)+y);
          const colors = {orb: [.73, .86, .30], star: [.53, .40, .72], knot: [.72, .62, .85]};
          const orbColors = [colors.orb, [.72, .62, .85], [.96, .66, .49]];
          gl.uniform3fv(color, kind === 'orb' ? orbColors[Number(canvas.parentElement.dataset.color) || 0] : colors[kind]);
          gl.drawArrays(gl.TRIANGLES, 0, data.length/6);
        },
        destroy: release
      };
    } catch { release(); canvas.dataset.renderStatus = 'fallback'; return null; }
  }
  function mount(stage) {
    const renderers = [...stage.querySelectorAll('[data-sculpture]')].map(renderer).filter(Boolean);
    const controller = new AbortController(), opt = {signal: controller.signal};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let x=0, y=0, tx=0, ty=0, frame=0, visible=true, disposed=false;
    const paused = () => reduced.matches || document.body.classList.contains('motion-paused');
    const draw = () => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (paused()) { tx=ty=x=y=0; } else { x+=(tx-x)*.13; y+=(ty-y)*.13; }
      renderers.forEach(r => r.draw(x, y));
      stage.style.setProperty('--sculpture-x', `${x*57.3}deg`);
      stage.style.setProperty('--sculpture-y', `${y*57.3}deg`);
      if (!paused() && Math.abs(tx-x)+Math.abs(ty-y)>.001) frame=requestAnimationFrame(draw);
    };
    const wake = () => { if (!frame && visible && !document.hidden && !disposed) frame=requestAnimationFrame(draw); };
    const stop = () => { cancelAnimationFrame(frame); frame=0; };
    stage.addEventListener('pointermove', e => {
      if (paused() || e.pointerType === 'touch') return;
      const r=stage.getBoundingClientRect(); tx=-(e.clientY-r.top-r.height/2)/r.height*.3; ty=(e.clientX-r.left-r.width/2)/r.width*.35; wake();
    }, {...opt, passive:true});
    stage.addEventListener('pointerleave', () => { tx=ty=0; wake(); }, opt);
    const resize=new ResizeObserver(wake); resize.observe(stage);
    const visibility=new IntersectionObserver(entries => { visible=entries[0].isIntersecting; visible ? wake() : stop(); }); visibility.observe(stage);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : wake(), opt);
    document.addEventListener('portfolio-motion-change', wake, opt); reduced.addEventListener('change', wake, opt);
    stage.addEventListener('portfolio-sculpture-color', wake, opt);
    for (const canvas of stage.querySelectorAll('[data-sculpture]')) canvas.addEventListener('webglcontextlost', () => canvas.parentElement.classList.remove('has-sculpture'), opt);
    wake();
    return () => { disposed=true; stop(); controller.abort(); resize.disconnect(); visibility.disconnect(); renderers.forEach(r=>r.destroy()); };
  }
  window.PortfolioSculptures = {mount};
})();
