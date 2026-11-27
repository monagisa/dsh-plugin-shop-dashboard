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
        '.sa-card,.sa-pop,.sa-dash{--sa-line:rgba(127,127,127,.18);--sa-line-strong:rgba(127,127,127,.30);--sa-soft:rgba(127,127,127,.07);--sa-softer:rgba(127,127,127,.035);--sa-accent:#1ead6f;}',
        '.sa-card{border:1px solid var(--sa-line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;}',
        '.sa-dash{display:flex;flex-direction:column;gap:12px;}',
        '.sa-hint{font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;row-gap:8px;}',
        '.sa-seg{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;}',
        '.sa-seglabel{font-size:11px;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-segend{margin-left:auto;gap:8px;}',
        '.sa-tab,.sa-btn{appearance:none;-webkit-appearance:none;font-family:inherit;font-size:12px;height:26px;line-height:24px;padding:0 10px;cursor:pointer;color:inherit;border:1px solid var(--sa-line-strong);background:transparent;border-radius:7px;transition:background .12s ease,border-color .12s ease,color .12s ease;}',
        '.sa-tab:hover,.sa-btn:hover{background:var(--sa-soft);}',
        '.sa-tab:active,.sa-btn:active{background:rgba(127,127,127,.14);}',
        '.sa-tab:disabled,.sa-btn:disabled{opacity:.45;cursor:not-allowed;}',
        '.sa-tab[data-on="1"],.sa-btn[data-on="1"]{border-color:rgba(30,173,111,.55);color:var(--sa-accent);background:rgba(30,173,111,.10);}',
        '.sa-btn-primary{border-color:rgba(30,173,111,.5);background:rgba(30,173,111,.12);color:var(--sa-accent);}',
        '.sa-segbtns{display:inline-flex;align-items:center;gap:0;}',
        '.sa-segbtns > .sa-tab,.sa-segbtns > .sa-btn{border-radius:0;margin-left:-1px;}',
        '.sa-segbtns > :first-child{border-radius:7px 0 0 7px;margin-left:0;}',
        '.sa-segbtns > :last-child{border-radius:0 7px 7px 0;}',
        '.sa-tabs{display:flex;flex-wrap:wrap;gap:6px;}',
        '.sa-dashright{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;}',
        '.sa-dashhead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}',
        '.sa-dashtitle{font-size:13px;font-weight:600;letter-spacing:-.01em;}',
        '.sa-dashbar{display:flex;align-items:center;gap:10px;}',
        '.sa-dashcap{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#5b6270);flex:1 1 auto;}',
        '.sa-dashgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:10px;}',
        '.sa-dashcard{position:relative;border:1px solid var(--sa-line);border-radius:10px;padding:10px 12px 9px 14px;display:flex;flex-direction:column;gap:3px;min-width:0;background:var(--sa-softer);overflow:hidden;transition:border-color .14s ease,background .14s ease;}',
        '.sa-dashcard:hover{border-color:var(--sa-line-strong);background:var(--sa-soft);}',
        '.sa-dashcard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:currentColor;opacity:.85;}',
        '.sa-dashlabel{font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary,#5b6270);white-space:normal;overflow-wrap:anywhere;}',
        '.sa-dashvalue{font-size:17px;font-weight:600;line-height:1.35;letter-spacing:-.01em;font-variant-numeric:tabular-nums;}',
        '.sa-dashvalue[data-empty="1"]{font-size:12px;font-weight:400;color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-dashdelta{font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums;}',
        '.sa-dashdelta[data-state="good"]{color:' + GOOD + ';}',
        '.sa-dashdelta[data-state="bad"]{color:' + BAD + ';}',
        '.sa-dashdelta[data-state="flat"],.sa-dashdelta[data-state="nodata"]{color:var(--dsw-alias-label-secondary,#5b6270);}',
        '.sa-dashhint{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:5px;border-radius:50%;border:1px solid currentColor;opacity:.4;font-size:10px;line-height:1;cursor:help;transition:opacity .12s ease;}',
        '.sa-dashcard:hover .sa-dashhint{opacity:.75;}',
        '.sa-badge{display:inline-block;font-size:10px;line-height:16px;padding:0 6px;border-radius:6px;margin-left:8px;vertical-align:middle;border:1px solid rgba(255,136,0,.45);color:' + TONE_COLORS.warn + ';background:rgba(255,136,0,.08);}',
        '.sa-group{margin-bottom:12px;}',
        '.sa-grouptitle{font-size:12px;font-weight:600;margin:2px 0 8px 0;}',
        '.sa-input{width:100%;box-sizing:border-box;height:26px;padding:0 10px;border-radius:7px;font-size:12px;color:inherit;border:1px solid var(--sa-line-strong);background:transparent;outline:none;font-variant-numeric:tabular-nums;}',
        '.sa-input:focus{border-color:rgba(30,173,111,.6);background:rgba(30,173,111,.06);}',
        '.sa-select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:26px;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%23888%27 stroke-width=%271.4%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;}',
        '.sa-select option{background:var(--dsw-alias-bg-base,#1f2227);color:var(--dsw-alias-label-primary,#e8eaee);}',
        '.sa-egobox{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px dashed var(--sa-line-strong);border-radius:9px;}',
        '.sa-egobox .sa-hint{flex:1 1 auto;min-width:0;}',
        '.sa-pill{appearance:none;font-family:inherit;display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border-radius:999px;cursor:pointer;font-size:12px;line-height:20px;max-width:min(62vw,560px);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border:1px solid var(--sa-line-strong);background:transparent;color:inherit;transition:background .12s ease,border-color .12s ease;}',
        '.sa-pill:hover{background:var(--sa-soft);}',
        '.sa-pill[data-open="1"]{border-color:rgba(30,173,111,.55);background:rgba(30,173,111,.10);}',
        '.sa-pilldot{width:6px;height:6px;border-radius:50%;background:var(--sa-accent);flex:0 0 auto;}',
        '.sa-pillmain{font-weight:600;flex:0 0 auto;}',
        '.sa-pillsub{color:var(--dsw-alias-label-secondary,#5b6270);overflow:hidden;text-overflow:ellipsis;}',
        '.sa-pop{position:fixed;z-index:2147483000;left:12px;top:54px;width:min(860px,94vw);max-height:min(76vh,720px);overflow:auto;border:1px solid var(--sa-line-strong);border-radius:14px;padding:14px;background:var(--dsw-alias-bg-base,#1f2227);box-shadow:0 22px 60px -14px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.05);}',
        '.sa-popclose{appearance:none;font-family:inherit;font-size:12px;height:26px;padding:0 10px;border-radius:7px;cursor:pointer;border:1px solid var(--sa-line-strong);background:transparent;color:inherit;margin-left:auto;}',
        '.sa-popclose:hover{background:var(--sa-soft);}',
        '.sa-tablewrap{overflow:auto;max-height:46vh;border:1px solid var(--sa-line);border-radius:10px;}',
        '.sa-table{border-collapse:separate;border-spacing:0;width:100%;font-size:12px;font-variant-numeric:tabular-nums;}',
        '.sa-table th,.sa-table td{padding:5px 10px;border-bottom:1px solid var(--sa-line);white-space:nowrap;text-align:right;}',
        '.sa-table tbody tr:nth-child(even) td{background:var(--sa-softer);}',
        '.sa-table thead th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-base,#1f2227);font-weight:600;}',
        '.sa-table th:first-child,.sa-table td:first-child{text-align:left;position:sticky;left:0;z-index:1;background:var(--dsw-alias-bg-base,#1f2227);}',
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

    function numText(v, c) {
      if (typeof v !== 'number' || !isFinite(v)) return '—';
      if (c.type === 'money' || c.type === 'yuan') return '¥' + v.toFixed(2);
      if (c.type === 'pct') return v.toFixed(2) + '%';
      if (c.type === 'ratio') return v.toFixed(2);
      if (c.type === 'seconds') return v.toFixed(1) + 's';
      return (Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(2))).toString();
    }

    // 卡片 / 表格两种视图：表格按「日期 × 指标」展开当前组
    function tableData(groups) {
      var cards = (groups && groups[0] && groups[0].cards) || [];
      if (!cards.length) return { cards: [], dates: [], labels: {} };
      var labels = {};
      var dates = [];
      cards.forEach(function (c) {
        (c.series || []).forEach(function (p) {
          if (!labels[p.key]) { labels[p.key] = p.label; dates.push(p.key); }
        });
      });
      dates.sort();
      return { cards: cards, dates: dates, labels: labels };
    }

    // 导出当前视图的 CSV（Excel 直接打开，带 BOM）
    function csvOf(groups) {
      var t = tableData(groups);
      if (!t.cards.length) return '';
      var lines = [['日期'].concat(t.cards.map(function (c) { return c.label; })).join(',')];
      t.dates.forEach(function (d) {
        var cells = [t.labels[d] || d];
        t.cards.forEach(function (c) {
          var p = null;
          (c.series || []).forEach(function (x) { if (x.key === d) p = x; });
          var v = p && typeof p.value === 'number' ? numText(p.value, c) : '';
          cells.push(String(v).replace(/"/g, '""'));
        });
        lines.push(cells.join(','));
      });
      return '\ufeff' + lines.join('\r\n');
    }

    function downloadCsv(groups, name) {
      try {
        var blob = new Blob([csvOf(groups)], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name || '看板数据.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
      } catch (e) { /* 导出失败不影响看板 */ }
    }

    function tableOf(groups) {
      var t = tableData(groups);
      var cards = t.cards;
      if (!cards.length) return h('div', { className: 'sa-hint' }, '暂无数据');
      var labels = t.labels;
      var dates = t.dates;
      var head = h('tr', { key: 'h' }, [h('th', { key: 'd' }, '日期')].concat(
        cards.map(function (c) { return h('th', { key: c.id, title: c.hint || '' }, c.label); })));
      var body = dates.map(function (d) {
        return h('tr', { key: d }, [h('td', { key: 'd' }, labels[d] || d)].concat(
          cards.map(function (c) {
            var p = null;
            (c.series || []).forEach(function (x) { if (x.key === d) p = x; });
            return h('td', { key: c.id, title: c.hint || '' }, p ? numText(p.value, c) : '—');
          })));
      });
      return h('div', { className: 'sa-tablewrap' }, h('table', { className: 'sa-table' }, [head].concat(body)));
    }

    function KpiCard(c) {
      var empty = c.valueText === '' || c.valueText === undefined;
      var color = TONE_COLORS[c.tone] || TONE_COLORS.info;
      var title = c.label + (c.hint ? '（口径：' + c.hint + '）' : '');
      return h('div', { key: c.id, className: 'sa-dashcard', style: { color: color }, title: title },
        h('div', { className: 'sa-dashlabel' }, c.label,
          c.hint ? h('span', { className: 'sa-dashhint', title: title }, '?') : null,
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
      { key: 'custom', label: '自定义', query: '' },
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
      var _cf = React.useState(''), fromDay = _cf[0], setFromDay = _cf[1];
      var _vw = React.useState('card'), view = _vw[0], setView = _vw[1];
      var _ct = React.useState(''), toDay = _ct[0], setToDay = _ct[1];

      React.useEffect(function () {
        var alive = true;
        setLoading(1);
        setErr('');
        var choice = null;
        for (var i = 0; i < RANGE_CHOICES.length; i += 1) if (RANGE_CHOICES[i].key === rangeKey) choice = RANGE_CHOICES[i];
        var base = choice && choice.query ? choice.query : 'days=7';
        if (rangeKey === 'custom' && fromDay && toDay) base = 'from=' + fromDay + '&to=' + toDay;
        var query = base
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
      }, [rangeKey, group, grain, mode, store, nonce, fromDay, toDay]);

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

      function seg(label, items, cur, setter) {
        return h('div', { className: 'sa-seg' },
          h('span', { className: 'sa-seglabel' }, label),
          h('div', { className: 'sa-segbtns' },
            items.map(function (it) {
              return h('button', {
                key: it[0], className: 'sa-btn',
                'data-on': cur === it[0] ? '1' : '0',
                onClick: function () { setter(it[0]); },
              }, it[1]);
            })));
      }

      var rangeTabs = h('div', { className: 'sa-segbtns' },
        RANGE_CHOICES.map(function (c) {
          return h('button', {
            key: c.key, className: 'sa-tab',
            'data-on': rangeKey === c.key ? '1' : '0',
            onClick: function () { setRangeKey(c.key); },
          }, c.label);
        }));

      var customRange = rangeKey === 'custom'
        ? h('div', { className: 'sa-seg' },
            h('span', { className: 'sa-seglabel' }, '起止'),
            h('input', {
              className: 'sa-input', type: 'date', value: fromDay, style: { width: '144px' },
              onChange: function (e) { setFromDay(e.target.value); },
            }),
            h('span', { className: 'sa-hint' }, '至'),
            h('input', {
              className: 'sa-input', type: 'date', value: toDay, style: { width: '144px' },
              onChange: function (e) { setToDay(e.target.value); },
            }))
        : null;

      var groupTabs = h('div', { className: 'sa-tabs' },
        GROUP_CHOICES.map(function (g) {
          return h('button', {
            key: g.key, className: 'sa-tab',
            'data-on': group === g.key ? '1' : '0',
            onClick: function () { setGroup(g.key); },
          }, g.label);
        }));

      function exportCsv() {
        var gs = (mode === 'by-platform' && data && (data.platforms || []).length)
          ? (data.platforms || []).map(function (pp) { return pp.groups; })[0]
          : (data && data.groups);
        downloadCsv(gs, '看板_' + group + '_' + ((data && data.range && data.range.label) || '') + '.csv');
      }

      var viewSeg = seg('查看', [['card', '卡片'], ['table', '表格']], view, setView);
      var grainSeg = seg('走势', GRAIN_CHOICES.map(function (g) { return [g.key, g.label]; }), grain, setGrain);
      var modeSeg = seg('口径', [['combined', '合并'], ['by-platform', '按平台']], mode, setMode);

      var toolbar = h('div', { className: 'sa-toolbar' },
        h('div', { className: 'sa-seg' },
          h('span', { className: 'sa-seglabel' }, '范围'), rangeTabs),
        customRange,
        viewSeg, grainSeg, modeSeg,
        h('div', { className: 'sa-seg sa-segend' },
          h('button', { className: 'sa-btn', onClick: exportCsv }, '导出 CSV'),
          h('button', {
            className: 'sa-btn sa-btn-primary',
            onClick: function () { setNonce(nonce + 1); },
          }, loading ? '读取中…' : '刷新')));

      var head = h('div', { className: 'sa-dashhead' },
        h('div', { className: 'sa-dashtitle' },
          '核心指标' + ((data && data.range && data.range.label) ? ' · ' + data.range.label : ''),
          data && data.partial ? h('span', { className: 'sa-badge' }, '部分覆盖') : null));


      function gridOf(cards, keyPrefix) {
        return h('div', { className: 'sa-dashgrid', key: keyPrefix },
          (cards || []).map(function (c) { return KpiCard(c); }));
      }

      function tablesBlock() {
        if (mode === 'by-platform' && data && (data.platforms || []).length) {
          return (data.platforms || []).map(function (p) {
            return h('div', { key: p.platform, className: 'sa-group' },
              h('div', { className: 'sa-grouptitle' }, platformLabel(p.platform)),
              tableOf(p.groups));
          });
        }
        return tableOf(data && data.groups);
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
        body = h('div', null, view === 'table' ? tablesBlock() : groupsBlock(),
          (data.notes || []).length ? (data.notes || []).map(function (n, i) {
            return h('div', { key: 'n' + i, className: 'sa-hint', style: { marginTop: '4px' } }, '· ' + n);
          }) : null);
      }

      var footer = data && data.generatedAt
        ? h('div', { className: 'sa-hint' }, '数据来自 ' + fmtTime(data.generatedAt) + ' 的采集产物')
        : null;

      return h('div', { className: 'sa-card sa-dash' },
        h('div', { className: 'sa-dashbar' },
          h('div', { className: 'sa-dashcap' }, '店铺数据看板'),
          storeSel),
        groupTabs,
        head,
        toolbar,
        body,
        footer);

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
