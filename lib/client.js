/**
 * dsh-plugin-shop-dashboard 的「客户端半身」—— 设置 → 数据看板 那一页。
 *
 * 打包格式：DSH 客户端 bundle 是 classic script + 模块表，
 * 只有 react 等平台种子模块能 require；这里只 require `react`。
 * 数据来自宿主半身的 `/shop-dashboard/dashboard`。
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-shop-dashboard',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');
    var h = React.createElement;

    var PACKAGE = 'dsh-plugin-shop-dashboard';
    /** 必须与 lib/index.js 的 BASE 一致。 */
    var BASE = '/shop-dashboard';
    var SECTION_ID = 'shop-dashboard';
    var CSS_ID = 'sa-dashboard-style';

    var PLATFORM_LABELS = { taobao: '淘宝', tmall: '天猫', pdd: '拼多多', douyin: '抖音', jd: '京东', ali1688: '1688' };

    function platformLabel(id) {
      return PLATFORM_LABELS[id] || String(id || '');
    }

    function fmtTime(iso) {
      if (!iso) return '';
      try {
        var d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('zh-CN', { hour12: false });
      } catch (e) {
        return '';
      }
    }

    function api(pathname) {
      return fetch(BASE + pathname, {
        headers: { 'X-DSH-Shop-Dashboard': '1' },
        cache: 'no-store',
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { ok: false, error: text }; }
          if (!res.ok || data.ok === false) {
            var msg = (data && data.error) || ('HTTP ' + res.status);
            throw new Error(msg);
          }
          return data;
        });
      });
    }

    function injectCss() {
      if (typeof document === 'undefined' || !document.head) return;
      if (document.getElementById(CSS_ID)) return;
      var style = document.createElement('style');
      style.id = CSS_ID;
      style.textContent = [
        '.sa-card{border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;}',
        '.sa-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-dashbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
        '.sa-dashhead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;}',
        '.sa-dashtitle{font-size:13px;font-weight:600;}',
        '.sa-dashright{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
        '.sa-dashgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}',
        '.sa-dashcard{border:1px solid rgba(127,127,127,.16);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:2px;min-width:0;}',
        '.sa-dashvalue{font-size:18px;font-weight:600;line-height:1.3;}',
        '.sa-dashvalue[data-empty="1"]{font-size:13px;font-weight:400;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-tabs{display:flex;gap:6px;flex-wrap:wrap;}',
        '.sa-tab{appearance:none;font-family:inherit;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer;',
        'border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.06);color:inherit;}',
        '.sa-tab[data-on="1"]{border-color:rgba(127,127,127,.5);background:rgba(127,127,127,.16);}',
        '.sa-tab:disabled{opacity:.5;cursor:not-allowed;}',
        '.sa-btn{appearance:none;font-family:inherit;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer;',
        'border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.06);color:inherit;}',
        '.sa-btn:hover{border-color:rgba(127,127,127,.45);}',
        '.sa-btn:active{background:rgba(127,127,127,.18);}',
        '.sa-input{width:100%;box-sizing:border-box;padding:7px 10px;border-radius:8px;font-size:12px;color:inherit;',
        'border:1px solid rgba(127,127,127,.28);background:rgba(127,127,127,.07);outline:none;}',
        '.sa-input:focus{border-color:rgba(127,127,127,.55);}',
        '.sa-select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:26px;',
        'background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%23888%27 stroke-width=%271.4%27/%3E%3C/svg%3E");',
        'background-repeat:no-repeat;background-position:right 8px center;}',
        '.sa-select option{background:var(--dsw-alias-bg-base,#1f2227);color:var(--dsw-alias-label-primary,#e8eaee);}',
        '.sa-egobox{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px dashed rgba(127,127,127,.28);border-radius:8px;}',
        '.sa-egobox .sa-hint{flex:1 1 auto;min-width:0;}',
      ].join('');
      document.head.appendChild(style);
    }

    function sparklineOf(series) {
      var pts = [];
      var max = 0;
      var i;
      for (i = 0; i < series.length; i += 1) {
        var v0 = series[i];
        if (typeof v0 === 'number' && isFinite(v0) && v0 > max) max = v0;
      }
      if (!max) return null;
      for (i = 0; i < series.length; i += 1) {
        var v = series[i];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        var x = series.length <= 1 ? 0 : (i / (series.length - 1)) * 100;
        var y = 27 - (v / max) * 23;
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      if (!pts.length) return null;
      return h('svg', {
        viewBox: '0 0 100 30', preserveAspectRatio: 'none',
        style: { width: '100%', height: '30px', display: 'block', marginTop: '2px' },
      }, h('polyline', { points: pts.join(' '), fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, opacity: 0.7 }));
    }

    function DashboardPanel() {
      var _s = React.useState(null), data = _s[0], setData = _s[1];
      var _e = React.useState(''), err = _e[0], setErr = _e[1];
      var _d = React.useState(7), days = _d[0], setDays = _d[1];
      var _v = React.useState('all'), store = _v[0], setStore = _v[1];
      var _n = React.useState(0), nonce = _n[0], setNonce = _n[1];
      var _l = React.useState(0), loading = _l[0], setLoading = _l[1];

      React.useEffect(function () {
        var alive = true;
        setLoading(1);
        setErr('');
        api('/dashboard?days=' + days + '&store=' + encodeURIComponent(store)).then(function (r) {
          if (!alive) return;
          setData(r);
          setLoading(0);
        }).catch(function (e) {
          if (!alive) return;
          var msg = String((e && e.message) || e);
          setErr(/404|not found|unknown/i.test(msg) ? '插件服务是旧版本，完全退出 DSH 再打开就能看到数据看板。' : msg);
          setLoading(0);
        });
        return function () { alive = false; };
      }, [days, store, nonce]);

      var tabs = h('div', { className: 'sa-tabs' },
        h('button', { className: 'sa-tab', 'data-on': '1' }, '多平台经营看板'),
        h('button', { className: 'sa-tab', 'data-on': '0', disabled: true }, '多平台推广看板'),
        h('button', { className: 'sa-tab', 'data-on': '0', disabled: true }, '单店数据看板'));

      var storeSel = h('select', {
        className: 'sa-input sa-select',
        value: store,
        onChange: function (e) { setStore(e.target.value); },
        style: { maxWidth: '260px' },
      },
        h('option', { value: 'all' }, '全部店铺' + (data && data.stores ? '（' + data.stores.length + ' 家）' : '')),
        ((data && data.stores) || []).map(function (s) {
          return h('option', { key: s.id, value: s.id }, s.name + ' · ' + platformLabel(s.platform));
        }));

      var head = h('div', { className: 'sa-dashhead' },
        h('div', { className: 'sa-dashtitle' }, '核心指标 ' + ((data && data.range && data.range.label) || '')),
        h('div', { className: 'sa-dashright' },
          h('button', { className: 'sa-tab', 'data-on': days === 7 ? '1' : '0', onClick: function () { setDays(7); } }, '近7天'),
          h('button', { className: 'sa-tab', 'data-on': days === 30 ? '1' : '0', onClick: function () { setDays(30); } }, '近30天'),
          h('button', { className: 'sa-btn', onClick: function () { setNonce(nonce + 1); } }, loading ? '读取中…' : '刷新')));

      var body;
      if (err) {
        body = h('div', { className: 'sa-egobox' },
          h('div', { className: 'sa-hint' }, err),
          h('button', { className: 'sa-btn', onClick: function () { setNonce(nonce + 1); } }, '重新读取'));
      } else if (!data) {
        body = h('div', { className: 'sa-hint', style: { padding: '8px 0' } }, '正在读取采集数据…');
      } else {
        body = h('div', { className: 'sa-dashgrid' },
          (data.cards || []).map(function (c) {
            return h('div', { key: c.key, className: 'sa-dashcard' },
              h('div', { className: 'sa-hint' }, c.label),
              h('div', { className: 'sa-dashvalue', 'data-empty': c.complete ? '0' : '1' }, c.complete ? c.valueText : '数据不完整'),
              h('div', { className: 'sa-hint' }, c.complete ? (c.deltaText || '与上期持平') : '无法比较 上期 —'),
              c.complete ? (sparklineOf(c.series || []) || h('div', { className: 'sa-hint' }, '暂无每日走势')) : null);
          }));
        if ((data.notes || []).length) {
          body = h('div', null, body, (data.notes || []).map(function (n, i) {
            return h('div', { key: 'n' + i, className: 'sa-hint', style: { marginTop: '4px' } }, '· ' + n);
          }));
        }
      }

      return h('div', { className: 'sa-card', style: { marginBottom: '10px' } },
        h('div', { className: 'sa-dashbar' },
          h('div', { className: 'sa-hint', style: { flex: '1 1 auto' } }, '店铺数据看板'),
          storeSel),
        tabs,
        head,
        body,
        data && data.generatedAt ? h('div', { className: 'sa-hint', style: { marginTop: '6px' } }, '数据来自最近一次采集产物 · ' + fmtTime(data.generatedAt)) : null);
    }

    function Section() {
      return h('div', { style: { padding: '4px 2px' } },
        h('h2', { className: 'sa-title', style: { fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0' } }, '数据看板'),
        h(DashboardPanel));
    }

    exports.name = PACKAGE;
    exports.inject = ['slots'];
    exports.apply = function apply(ctx) {
      injectCss();
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: SECTION_ID, order: 301, label: '数据看板' },
          function () { return h(Section); },
        );
      });
    };
    return module.exports;
  },
});
