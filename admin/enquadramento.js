/*
 * Widget "enquadramento" do painel (Decap CMS).
 *
 * Mostra a imagem escolhida dentro de molduras no formato do banner
 * (computador e celular). Dá para arrastar a imagem para escolher qual
 * parte aparece e usar o zoom para aproximar. O valor salvo é um texto
 * simples "X Y ZOOM" (ex.: "50 15 1.2"), que o assets/js/hero.js lê.
 */
(function () {
  if (!window.CMS || !window.createClass || !window.h) return;
  var h = window.h;

  function parse(value) {
    var parts = String(value || '').trim().split(/\s+/).map(Number);
    var x = isFinite(parts[0]) ? parts[0] : 50;
    var y = isFinite(parts[1]) ? parts[1] : 50;
    var z = isFinite(parts[2]) && parts[2] >= 1 ? parts[2] : 1;
    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100), z: clamp(z, 1, 3) };
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function serialize(s) {
    return Math.round(s.x) + ' ' + Math.round(s.y) + ' ' + (Math.round(s.z * 100) / 100);
  }

  function imgStyle(s) {
    var pos = s.x + '% ' + s.y + '%';
    return {
      width: '100%', height: '100%', display: 'block',
      objectFit: 'cover', objectPosition: pos,
      transform: 'scale(' + s.z + ')', transformOrigin: pos,
      userSelect: 'none', pointerEvents: 'none'
    };
  }

  var EnquadramentoControl = window.createClass({
    getInitialState: function () { return { path: this.imagePath() }; },

    componentDidMount: function () {
      // acompanha a troca de imagem no campo ao lado
      var self = this;
      this.timer = setInterval(function () {
        var p = self.imagePath();
        if (p !== self.state.path) self.setState({ path: p });
      }, 600);
    },

    componentWillUnmount: function () {
      clearInterval(this.timer);
      this.stopDrag();
    },

    imagePath: function () {
      var slide = this.props.field.get('slide');
      var entry = this.props.entry;
      return (entry && slide && entry.getIn(['data', slide, 'imagem'])) || '';
    },

    imageUrl: function (path) {
      if (!path) return '';
      try {
        var asset = this.props.getAsset(path, this.props.field);
        var url = asset && asset.toString();
        if (url) return url;
      } catch (e) { /* usa o caminho direto */ }
      return path;
    },

    update: function (patch) {
      var s = parse(this.props.value);
      Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
      s.x = clamp(s.x, 0, 100); s.y = clamp(s.y, 0, 100); s.z = clamp(s.z, 1, 3);
      this.props.onChange(serialize(s));
    },

    startDrag: function (e) {
      e.preventDefault();
      var rect = e.currentTarget.getBoundingClientRect();
      var s = parse(this.props.value);
      this.drag = { startX: e.clientX, startY: e.clientY, x: s.x, y: s.y, w: rect.width, h: rect.height, z: s.z };
      this.onMove = this.moveDrag.bind(this);
      this.onUp = this.stopDrag.bind(this);
      window.addEventListener('pointermove', this.onMove);
      window.addEventListener('pointerup', this.onUp);
    },

    moveDrag: function (e) {
      var d = this.drag;
      if (!d) return;
      var dx = (e.clientX - d.startX) / d.w * 100 / d.z;
      var dy = (e.clientY - d.startY) / d.h * 100 / d.z;
      this.update({ x: d.x - dx, y: d.y - dy });
    },

    stopDrag: function () {
      this.drag = null;
      if (this.onMove) window.removeEventListener('pointermove', this.onMove);
      if (this.onUp) window.removeEventListener('pointerup', this.onUp);
    },

    frame: function (label, aspect, width, url, s) {
      return h('div', { style: { display: 'inline-block', verticalAlign: 'top', marginRight: '18px', marginBottom: '10px' } },
        h('div', { style: { fontSize: '12px', color: '#6b4b2c', marginBottom: '6px' } }, label),
        h('div', {
          onPointerDown: this.startDrag,
          style: {
            width: width, aspectRatio: aspect, position: 'relative', overflow: 'hidden',
            borderRadius: '4px', border: '1px solid #d8cba3', background: '#2c1c10',
            cursor: 'grab', touchAction: 'none'
          }
        },
          h('img', { src: url, alt: '', draggable: false, style: imgStyle(s) }),
          h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(20,12,6,0.6) 0%, rgba(20,12,6,0) 45%)' } })
        )
      );
    },

    slider: function (label, key, min, max, step, value, fmt) {
      var self = this;
      return h('label', { style: { display: 'block', fontSize: '13px', color: '#3f2a17', marginBottom: '8px' } },
        h('span', { style: { display: 'inline-block', width: '96px' } }, label),
        h('input', {
          type: 'range', min: min, max: max, step: step, value: value,
          style: { width: '220px', verticalAlign: 'middle' },
          onChange: function (e) { var p = {}; p[key] = Number(e.target.value); self.update(p); }
        }),
        h('span', { style: { marginLeft: '10px', color: '#6b4b2c' } }, fmt(value))
      );
    },

    render: function () {
      var self = this;
      var path = this.imagePath();
      var s = parse(this.props.value);
      var wrapperClass = this.props.classNameWrapper;

      if (!path) {
        return h('div', { id: this.props.forID, className: wrapperClass, style: { color: '#6b4b2c', fontSize: '14px' } },
          'Escolha a imagem no campo acima para ajustar o enquadramento.');
      }

      var url = this.imageUrl(path);
      var pct = function (v) { return Math.round(v) + '%'; };

      return h('div', { id: this.props.forID, className: wrapperClass },
        h('div', null,
          this.frame('Como aparece no computador', '1440 / 560', 'min(520px, 100%)', url, s),
          this.frame('No celular', '390 / 400', '170px', url, s)
        ),
        h('div', { style: { marginTop: '6px' } },
          this.slider('Zoom', 'z', 1, 3, 0.05, s.z, function (v) { return Math.round(v * 100) + '%'; }),
          this.slider('Horizontal', 'x', 0, 100, 1, s.x, pct),
          this.slider('Vertical', 'y', 0, 100, 1, s.y, pct),
          h('button', {
            type: 'button',
            onClick: function () { self.props.onChange('50 50 1'); },
            style: { marginTop: '4px', padding: '6px 12px', border: '1px solid #a2825a', borderRadius: '4px',
              background: 'transparent', color: '#3f2a17', cursor: 'pointer', fontSize: '13px' }
          }, 'Centralizar e tirar o zoom')
        )
      );
    }
  });

  var EnquadramentoPreview = window.createClass({
    render: function () {
      var s = parse(this.props.value);
      return h('small', null, 'posição ' + Math.round(s.x) + '% / ' + Math.round(s.y) + '% · zoom ' + Math.round(s.z * 100) + '%');
    }
  });

  window.CMS.registerWidget('enquadramento', EnquadramentoControl, EnquadramentoPreview);
})();
