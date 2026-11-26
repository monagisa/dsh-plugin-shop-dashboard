/**
 * dsh-plugin-shop-dashboard 的「客户端半身」—— 设置 → 数据看板，以及主页面左上角的胶囊。
 *
 * 打包格式：DSH 客户端 bundle 是 classic script + 模块表，
 * 只有 react 等平台种子模块能 require；这里只 require `react`。
 * 数据来自宿主半身的 `/shop-dashboard/dashboard`。
 *
 * v0.3.0：按指标注册表（四组卡）+ 时间范围/粒度/显示模式渲染，口径与上游一致。
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
    // 与 lib/metrics.mjs 的 TONE 同一套取色（只取主色，卡片底色保持主题中性）
    var TONE_COLORS = {
      primary: '#1ead6f',
      info: '#3080ff',
      teal: '#0092b5',
      purple: '#6d3ed1',
      warn: '#ff8800',
      danger: '#e52828',
    };
    var GOOD = '#1ead6f';
    var BAD = '#e52828';

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
        '.sa-dashgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px;}',
        '.sa-dashcard{position:relative;border:1px solid rgba(127,127,127,.16);border-radius:10px;padding:10px 10px 10px 13px;',
        'display:flex;flex-direction:column;gap:2px;min-width:0;background:rgba(127,127,127,.04);overflow:hidden;}',
        '.sa-dashcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:currentColor;opacity:.85;}',
        '.sa-dashlabel{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6270);white-space:normal;overflow-wrap:anywhere;}',
        '.sa-dashvalue{font-size:18px;font-weight:600;line-height:1.3;}',
        '.sa-dashvalue[data-empty="1"]{font-size:12px;font-weight:400;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-dashdelta{font-size:11px;line-height:1.5;}',
        '.sa-dashdelta[data-state="good"]{color:' + GOOD + ';}',
        '.sa-dashdelta[data-state="bad"]{color:' + BAD + ';}',
        '.sa-badge{display:inline-block;font-size:10px;line-height:16px;padding:0 6px;border-radius:6px;margin-left:6px;',
        'border:1px solid rgba(255,136,0,.45);color:' + TONE_COLORS.warn + ';background:rgba(255,136,0,.08);}',
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
        '.sa-pill{appearance:none;font-family:inherit;display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:999px;cursor:pointer;',
        'font-size:12px;line-height:20px;max-width:min(62vw,560px);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;',
        'border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.06);color:inherit;}',
        '.sa-pill:hover{border-color:rgba(127,127,127,.45);}',
        '.sa-pill[data-open="1"]{border-color:rgba(127,127,127,.6);background:rgba(127,127,127,.16);}',
        '.sa-pilldot{width:6px;height:6px;border-radius:50%;background:' + TONE_COLORS.primary + ';flex:0 0 auto;}',
        '.sa-pillmain{font-weight:600;flex:0 0 auto;}',
        '.sa-pillsub{color:var(--dsw-alias-label-secondary,#5b6270);overflow:hidden;text-overflow:ellipsis;}',
        '.sa-pop{position:fixed;z-index:2147483000;left:12px;top:54px;width:min(820px,94vw);max-height:min(74vh,680px);overflow:auto;',
        'border:1px solid rgba(127,127,127,.24);border-radius:12px;padding:12px;background:var(--dsw-alias-bg-base,#1f2227);',
        'box-shadow:0 18px 48px rgba(0,0,0,.35);}',
        '.sa-popclose{appearance:none;font-family:inherit;font-size:12px;padding:4px 10px;border-radius:8px;cursor:pointer;',
        'border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.06);color:inherit;margin-left:auto;}',
        '.sa-group{margin-bottom:14px;}',
        '.sa-grouptitle{font-size:12px;font-weight:600;margin:2px 0 8px 0;}',
      ].join('');
      document.head.appendChild(style);
    }

    // series: [{ key, label, value }]
    function sparklineOf(series) {
      var pts = [];
      var max = 0;
      var i;
      for (i = 0; i < series.length; i += 1) {
        var v0 = series[i] && series[i].value;
        if (typeof v0 === 'number' && isFinite(v0) && v0 > max) max = v0;
      }
      if (!max) return null;
      for (i = 0; i < series.length; i += 1) {
        var v = series[i] && series[i].value;
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

    function KpiCard(c) {
      var empty = c.valueText === '' || c.valueText === undefined;
      var color = TONE_COLORS[c.tone] || TONE_COLORS.info;
      return h('div', { key: c.id, className: 'sa-dashcard', style: { color: color } },
        h('div', { className: 'sa-dashlabel' }, c.label,
          c.partial ? h('span', { className: 'sa-badge' }, '部分覆盖') : null),
        h('div', { className: 'sa-dashvalue', 'data-empty': empty ? '1' : '0', style: { color: 'inherit' } }, empty ? '暂无数据' : c.valueText),
        h('div', { className: 'sa-dashdelta', 'data-state': c.deltaState || 'missing' }, c.deltaText || '首期缺失'),
        sparklineOf(c.series || []));
    }

    var RANGE_CHOICES = [
      { key: '7', label: '近7天', query: 'days=7' },
      { key: '14', label: '近14天', query: 'days=14' },
      { key: '30', label: '近30天', query: 'days=30' },
      { key: '90', label: '近90天', query: 'days=90' },
      { key: 'month', label: '本月', query: 'range=month' },
      { key: 'lastmonth', label: '上月', query: 'range=lastmonth' },
    ];
    var GRAIN_CHOICES = [
      { key: 'day', label: '日' },
      { key: 'week', label: '周' },
      { key: 'month', label: '月' },
    ];
    var GROUP_CHOICES = [
      { key: 'overview', label: '经营总览' },
      { key: 'traffic', label: '流量转化' },
      { key: 'product', label: '商品供给' },
      { key: 'promotion', label: '运营推广' },
    ];

    function DashboardPanel() {
      var _s = React.useState(null), data = _s[0], setData = _s[1];
      var _e = React.useState(''), err = _e[0], setErr = _e[1];
      var _r = React.useState('7'), rangeKey = _r[0], setRangeKey = _r[1];
      var _g = React.useState('overview'), group = _g[0], setGroup = _g[1];
      var _gr = React.useState('day'), grain = _gr[0], setGrain = _gr[1];
      var _m = React.useState('combined'), mode = _m[0], setMode = _m[1];
      var _v = React.useState('all'), store = _v[0], setStore = _v[1];
      var _n = React.useState(0), nonce = _n[0], setNonce = _n[1];
      var _l = React.useState(0), loading = _l[0], setLoading = _l[1];

      React.useEffect(function () {
        var alive = true;
        setLoading(1);
        setErr('');
        var choice = null;
        for (var i = 0; i < RANGE_CHOICES.length; i += 1) if (RANGE_CHOICES[i].key === rangeKey) choice = RANGE_CHOICES[i];
        var query = (choice ? choice.query : 'days=7')
          + '&store=' + encodeURIComponent(store)
          + '&group=' + group
          + '&grain=' + grain
          + '&mode=' + mode;
        api('/dashboard?' + query).then(function (r) {
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
      }, [rangeKey, group, grain, mode, store, nonce]);

      var storeSel = h('select', {
        className: 'sa-input sa-select',
        value: store,
        onChange: function (e) { setStore(e.target.value); },
        style: { maxWidth: '240px' },
      },
        h('option', { value: 'all' }, '全部店铺' + (data && data.stores ? '（' + data.stores.length + ' 家）' : '')),
        ((data && data.stores) || []).map(function (s) {
          return h('option', { key: s.id, value: s.id }, s.name + ' · ' + platformLabel(s.platform));
        }));

      var rangeTabs = h('div', { className: 'sa-dashright' },
        RANGE_CHOICES.map(function (c) {
          return h('button', {
            key: c.key, className: 'sa-tab',
            'data-on': rangeKey === c.key ? '1' : '0',
            onClick: function () { setRangeKey(c.key); },
          }, c.label);
        }));

      var groupTabs = h('div', { className: 'sa-tabs' },
        GROUP_CHOICES.map(function (g) {
          return h('button', {
            key: g.key, className: 'sa-tab',
            'data-on': group === g.key ? '1' : '0',
            onClick: function () { setGroup(g.key); },
          }, g.label);
        }));

      var grainTabs = h('div', { className: 'sa-dashright' },
        h('span', { className: 'sa-hint' }, '走势'),
        GRAIN_CHOICES.map(function (g) {
          return h('button', {
            key: g.key, className: 'sa-btn',
            'data-on': grain === g.key ? '1' : '0',
            style: grain === g.key ? { borderColor: 'rgba(127,127,127,.5)', background: 'rgba(127,127,127,.16)' } : null,
            onClick: function () { setGrain(g.key); },
          }, g.label);
        }),
        h('span', { className: 'sa-hint', style: { marginLeft: '4px' } }, '口径'),
        h('button', {
          className: 'sa-btn',
          style: mode === 'combined' ? { borderColor: 'rgba(127,127,127,.5)', background: 'rgba(127,127,127,.16)' } : null,
          onClick: function () { setMode('combined'); },
        }, '合并'),
        h('button', {
          className: 'sa-btn',
          style: mode === 'by-platform' ? { borderColor: 'rgba(127,127,127,.5)', background: 'rgba(127,127,127,.16)' } : null,
          onClick: function () { setMode('by-platform'); },
        }, '按平台'));

      var head = h('div', { className: 'sa-dashhead' },
        h('div', { className: 'sa-dashtitle' },
          '核心指标 ' + ((data && data.range && data.range.label) || ''),
          data && data.partial ? h('span', { className: 'sa-badge' }, '部分覆盖') : null),
        h('div', { className: 'sa-dashright' }, rangeTabs,
          h('button', { className: 'sa-btn', onClick: function () { setNonce(nonce + 1); } }, loading ? '读取中…' : '刷新')));

      function gridOf(cards, keyPrefix) {
        return h('div', { className: 'sa-dashgrid', key: keyPrefix },
          (cards || []).map(function (c) { return KpiCard(c); }));
      }

      function groupsBlock() {
        if (mode === 'by-platform' && data && (data.platforms || []).length) {
          return (data.platforms || []).map(function (p) {
            return h('div', { key: p.platform, className: 'sa-group' },
              h('div', { className: 'sa-grouptitle' }, platformLabel(p.platform)),
              (p.groups || []).map(function (g) {
                return h('div', { key: g.id, className: 'sa-group' },
                  h('div', { className: 'sa-hint' }, g.label),
                  gridOf(g.cards, p.platform + '-' + g.id));
              }));
          });
        }
        return ((data && data.groups) || []).map(function (g) {
          return h('div', { key: g.id, className: 'sa-group' },
            h('div', { className: 'sa-grouptitle' }, g.label),
            gridOf(g.cards, g.id));
        });
      }

      var body;
      if (err) {
        body = h('div', { className: 'sa-egobox' },
          h('div', { className: 'sa-hint' }, err),
          h('button', { className: 'sa-btn', onClick: function () { setNonce(nonce + 1); } }, '重新读取'));
      } else if (!data) {
        body = h('div', { className: 'sa-hint', style: { padding: '8px 0' } }, '正在读取采集数据…');
      } else {
        body = h('div', null, groupsBlock(),
          (data.notes || []).length ? (data.notes || []).map(function (n, i) {
            return h('div', { key: 'n' + i, className: 'sa-hint', style: { marginTop: '4px' } }, '· ' + n);
          }) : null);
      }

      return h('div', { className: 'sa-card', style: { marginBottom: '10px' } },
        h('div', { className: 'sa-dashbar' },
          h('div', { className: 'sa-hint', style: { flex: '1 1 auto' } }, '店铺数据看板'),
          storeSel),
        groupTabs,
        head,
        grainTabs,
        body,
        data && data.generatedAt ? h('div', { className: 'sa-hint', style: { marginTop: '6px' } }, '数据来自最近一次采集产物 · ' + fmtTime(data.generatedAt)) : null);
    }

    function Section() {
      return h('div', { style: { padding: '4px 2px' } },
        h('h2', { className: 'sa-title', style: { fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0' } }, '数据看板'),
        h(DashboardPanel));
    }

    // 主页面左上角的一枚小胶囊：近 7 天成交 / 访客 / 转化率，点开是一整张看板。
    function HeaderDashboard() {
      var _o = React.useState(false), open = _o[0], setOpen = _o[1];
      var _s = React.useState(null), sum = _s[0], setSum = _s[1];
      var _e = React.useState(''), err = _e[0], setErr = _e[1];
      var _n = React.useState(0), nonce = _n[0], setNonce = _n[1];

      React.useEffect(function () {
        var alive = true;
        api('/dashboard?days=7&store=all&group=overview').then(function (r) {
          if (!alive) return;
          setSum(r);
          setErr('');
        }).catch(function (e) {
          if (!alive) return;
          setErr(String((e && e.message) || e));
        });
        return function () { alive = false; };
      }, [nonce]);

      var cards = (sum && sum.cards) || [];
      function pick(id) {
        for (var i = 0; i < cards.length; i += 1) if (cards[i].id === id) return cards[i];
        return null;
      }
      var gmv = pick('gmv');
      var visitors = pick('visitors');
      var conv = pick('conversion');

      var summaryText;
      if (err) summaryText = '看板未连接';
      else if (!sum) summaryText = '读取中…';
      else {
        var parts = [];
        if (gmv && gmv.valueText) parts.push('成交 ' + gmv.valueText);
        if (visitors && visitors.valueText) parts.push('访客 ' + visitors.valueText);
        if (conv && conv.valueText) parts.push('转化 ' + conv.valueText);
        summaryText = parts.length ? parts.join(' · ') : '暂无采集数据';
      }

      function toggle() {
        var next = !open;
        setOpen(next);
        if (next) setNonce(nonce + 1);
      }

      return h('div', { style: { position: 'relative', display: 'inline-flex' } },
        h('button', {
          className: 'sa-pill',
          'data-open': open ? '1' : '0',
          title: '店铺数据看板（点开查看完整指标）',
          onClick: toggle,
        },
          h('span', { className: 'sa-pilldot' }),
          h('span', { className: 'sa-pillmain' }, '经营看板'),
          h('span', { className: 'sa-pillsub' }, summaryText)),
        open ? h('div', { className: 'sa-pop' },
          h('div', { className: 'sa-dashbar' },
            h('div', { className: 'sa-hint', style: { flex: '1 1 auto' } }, '店铺数据看板 · 近 7 天'),
            h('button', { className: 'sa-popclose', onClick: function () { setOpen(false); } }, '收起')),
          h(DashboardPanel)) : null);
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
      // 主页面左上角（会话头部前方的导航位）放一枚经营看板胶囊。
      ctx.slots.inject('conversation.header.leading', function () {
        return ctx.slots.register(
          { name: 'conversation.header.leading' },
          function () { return h(HeaderDashboard); },
        );
      });
    };

    return module.exports;
  },
});
