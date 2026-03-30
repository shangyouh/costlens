import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// CostLens™ v3 — 通用版 + 定制版（移动端友好 · 溯源强调）
// ═══════════════════════════════════════════════════════════

const M = {
  crude: 530, styrene: 7800, pta: 5600, eg: 4100, ma: 9200,
  upr191: 8700, upr196: 9500, uprVE: 18000, uprEpoxy: 28000,
  gf2400: 3700, gfMat: 5200, gfCloth: 6800, gfRoving: 4200,
  gelcoat: 16000, coreBalsa: 14000, corePVC: 11000, coreSAN: 16000,
  hardener: 22000, accelerator: 35000, vacuumKit: 8000,
  carbonFiber: 120000, aramid: 85000,
};

const MA_W = { crude: .55, styrene: .30, pta: .15 };
const UPR_W = { styrene: .35, ma: .30, eg: .15, pta: .10, other: .10 };

// Each material's traceability to futures
const TRACE = {
  upr191:    { label: "UPR 191#", path: ["crude","styrene","pta","eg"], desc: "原油→苯乙烯+顺酐(替代)+EG+PTA→聚合", sensitivity: "高" },
  upr196:    { label: "UPR 196#", path: ["crude","styrene","pta","eg"], desc: "原油→苯乙烯+顺酐(替代)+EG+PTA→聚合", sensitivity: "高" },
  uprVE:     { label: "乙烯基酯", path: ["crude","styrene","pta"], desc: "原油→苯乙烯→环氧氯丙烷→乙烯基酯化", sensitivity: "中高" },
  uprEpoxy:  { label: "环氧树脂", path: ["crude"], desc: "原油→丙烯→环氧氯丙烷→双酚A环氧", sensitivity: "中" },
  gelcoat:   { label: "胶衣树脂", path: ["crude","styrene"], desc: "原油→苯乙烯→特种UPR胶衣配方", sensitivity: "中" },
  gf2400:    { label: "无碱粗纱", path: ["crude"], desc: "石英砂+能源(原油)→熔融拉丝", sensitivity: "低" },
  gfMat:     { label: "短切毡", path: ["crude"], desc: "石英砂+能源→拉丝→短切→成毡", sensitivity: "低" },
  gfCloth:   { label: "方格布", path: ["crude"], desc: "石英砂+能源→拉丝→织布", sensitivity: "低" },
  gfRoving:  { label: "编织粗纱", path: ["crude"], desc: "石英砂+能源→拉丝→编织", sensitivity: "低" },
  carbonFiber:{ label: "碳纤维", path: ["crude"], desc: "原油→丙烯腈→PAN→碳化", sensitivity: "中" },
  aramid:    { label: "芳纶纤维", path: ["crude"], desc: "原油→对苯二甲酰氯→缩聚", sensitivity: "中" },
  coreBalsa:  { label: "巴沙木", path: [], desc: "天然木材·价格受物流影响", sensitivity: "无" },
  corePVC:   { label: "PVC泡沫", path: ["crude"], desc: "原油→VCM→PVC→发泡", sensitivity: "低" },
  coreSAN:   { label: "SAN泡沫", path: ["crude","styrene"], desc: "原油→苯乙烯+丙烯腈→SAN→发泡", sensitivity: "中" },
  hardener:  { label: "固化剂", path: ["crude"], desc: "原油→有机过氧化物", sensitivity: "低" },
  accelerator:{ label: "促进剂", path: [], desc: "钴盐/胺类·受金属价格影响", sensitivity: "无" },
  vacuumKit: { label: "真空辅材", path: [], desc: "薄膜/导流网/密封胶带", sensitivity: "无" },
};

const FUTURES_META = {
  crude: { label: "原油", short: "原油", color: "#ef4444", icon: "🛢️" },
  styrene: { label: "苯乙烯", short: "EB", color: "#f59e0b", icon: "⚗️" },
  pta: { label: "PTA", short: "PTA", color: "#a855f7", icon: "🧪" },
  eg: { label: "乙二醇", short: "EG", color: "#10b981", icon: "💧" },
};

const CAT_C = { resin: "#f59e0b", fiber: "#3b82f6", core: "#06b6d4", aux: "#a855f7", labor: "#64748b" };
const CAT_N = { resin: "树脂", fiber: "纤维", core: "夹芯", aux: "辅料", labor: "人工" };

const STD = {
  yacht_sail: { name: "帆船游艇", icon: "⛵", desc: "30-50ft 真空灌注", t: 4.5, cat: "yacht",
    bom: [
      { name: "乙烯基酯树脂", key: "uprVE", r: .30, cat: "resin" },
      { name: "胶衣树脂", key: "gelcoat", r: .06, cat: "resin" },
      { name: "无碱粗纱", key: "gf2400", r: .14, cat: "fiber" },
      { name: "方格布", key: "gfCloth", r: .12, cat: "fiber" },
      { name: "碳纤维(局部)", key: "carbonFiber", r: .03, cat: "fiber" },
      { name: "PVC泡沫", key: "corePVC", r: .09, cat: "core" },
      { name: "固化剂+促进剂", key: "hardener", r: .025, cat: "aux" },
      { name: "真空辅材", key: "vacuumKit", r: .035, cat: "aux", fx: 8000 },
      { name: "辅料+人工", key: "_labor", r: .14, cat: "labor", fx: 5200 },
    ] },
  yacht_power: { name: "动力游艇", icon: "🛥️", desc: "35-60ft 飞桥", t: 8, cat: "yacht",
    bom: [
      { name: "UPR 196#", key: "upr196", r: .33, cat: "resin" },
      { name: "乙烯基(水线下)", key: "uprVE", r: .06, cat: "resin" },
      { name: "胶衣树脂", key: "gelcoat", r: .05, cat: "resin" },
      { name: "无碱粗纱", key: "gf2400", r: .16, cat: "fiber" },
      { name: "方格布", key: "gfCloth", r: .10, cat: "fiber" },
      { name: "短切毡", key: "gfMat", r: .06, cat: "fiber" },
      { name: "巴沙木夹芯", key: "coreBalsa", r: .05, cat: "core" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "真空辅材", key: "vacuumKit", r: .03, cat: "aux", fx: 8000 },
      { name: "辅料+人工", key: "_labor", r: .14, cat: "labor", fx: 4800 },
    ] },
  commercial: { name: "商用工作艇", icon: "🚢", desc: "15-30m 巡逻/引航", t: 18, cat: "commercial",
    bom: [
      { name: "UPR 196#", key: "upr196", r: .36, cat: "resin" },
      { name: "胶衣树脂", key: "gelcoat", r: .04, cat: "resin" },
      { name: "无碱粗纱", key: "gf2400", r: .20, cat: "fiber" },
      { name: "方格布", key: "gfCloth", r: .12, cat: "fiber" },
      { name: "短切毡", key: "gfMat", r: .06, cat: "fiber" },
      { name: "PVC泡沫", key: "corePVC", r: .06, cat: "core" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "真空辅材", key: "vacuumKit", r: .03, cat: "aux", fx: 8000 },
      { name: "辅料+人工", key: "_labor", r: .15, cat: "labor", fx: 4000 },
    ] },
  passenger: { name: "高速客船", icon: "⛴️", desc: "20-40m 客运渡轮", t: 30, cat: "commercial",
    bom: [
      { name: "乙烯基酯", key: "uprVE", r: .28, cat: "resin" },
      { name: "胶衣树脂", key: "gelcoat", r: .04, cat: "resin" },
      { name: "无碱粗纱", key: "gf2400", r: .22, cat: "fiber" },
      { name: "方格布", key: "gfCloth", r: .14, cat: "fiber" },
      { name: "SAN泡沫", key: "coreSAN", r: .08, cat: "core" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "真空辅材", key: "vacuumKit", r: .04, cat: "aux", fx: 8000 },
      { name: "辅料+人工", key: "_labor", r: .14, cat: "labor", fx: 4500 },
    ] },
  hatch: { name: "舱口盖", icon: "🔲", desc: "FRP 舱盖组件", t: 0.8, cat: "parts",
    bom: [
      { name: "UPR 196#", key: "upr196", r: .40, cat: "resin" },
      { name: "胶衣", key: "gelcoat", r: .06, cat: "resin" },
      { name: "方格布", key: "gfCloth", r: .22, cat: "fiber" },
      { name: "短切毡", key: "gfMat", r: .10, cat: "fiber" },
      { name: "PVC泡沫", key: "corePVC", r: .05, cat: "core" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "辅料+人工", key: "_labor", r: .15, cat: "labor", fx: 3500 },
    ] },
  pipe: { name: "管道/储罐", icon: "🛢️", desc: "FRP 缠绕管罐", t: 2.5, cat: "parts",
    bom: [
      { name: "UPR 191#", key: "upr191", r: .38, cat: "resin" },
      { name: "编织粗纱", key: "gfRoving", r: .30, cat: "fiber" },
      { name: "短切毡", key: "gfMat", r: .12, cat: "fiber" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "辅料+人工", key: "_labor", r: .18, cat: "labor", fx: 3000 },
    ] },
  deck: { name: "甲板/内饰", icon: "📐", desc: "FRP 板材构件", t: 1.2, cat: "parts",
    bom: [
      { name: "UPR 196#", key: "upr196", r: .35, cat: "resin" },
      { name: "胶衣", key: "gelcoat", r: .08, cat: "resin" },
      { name: "方格布", key: "gfCloth", r: .18, cat: "fiber" },
      { name: "短切毡", key: "gfMat", r: .10, cat: "fiber" },
      { name: "巴沙木", key: "coreBalsa", r: .10, cat: "core" },
      { name: "固化剂", key: "hardener", r: .02, cat: "aux" },
      { name: "辅料+人工", key: "_labor", r: .17, cat: "labor", fx: 4000 },
    ] },
};

function tick(b, v=.003){ return b*(1+(Math.random()-.48)*v); }
function hist(b, n=30){ let a=[],p=b; for(let i=0;i<n;i++){p*=1+(Math.random()-.49)*.018;a.push(Math.round(p));} return a; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

function dynP(prices){
  const ma=M.ma*(MA_W.crude*(prices.crude/M.crude)+MA_W.styrene*(prices.styrene/M.styrene)+MA_W.pta*(prices.pta/M.pta));
  const uf=UPR_W.styrene*(prices.styrene/M.styrene)+UPR_W.ma*(ma/M.ma)+UPR_W.eg*(prices.eg/M.eg)+UPR_W.pta*(prices.pta/M.pta)+UPR_W.other;
  const ef=.8+.2*(prices.crude/M.crude);
  return { ...M, _ma:Math.round(ma), upr191:Math.round(M.upr191*uf), upr196:Math.round(M.upr196*uf),
    uprVE:Math.round(M.uprVE*(uf*.85+.15)), uprEpoxy:Math.round(M.uprEpoxy*(uf*.6+.4)),
    gf2400:Math.round(M.gf2400*ef), gfMat:Math.round(M.gfMat*ef), gfCloth:Math.round(M.gfCloth*ef), gfRoving:Math.round(M.gfRoving*ef) };
}

function calcBom(bom, t, dp){
  const items=bom.map(i=>{ const up=i.fx||dp[i.key]||M[i.key]||5000; const bp=i.fx||M[i.key]||5000;
    const cost=up*(i.r||i.ratio)*t; const base=bp*(i.r||i.ratio)*t;
    return {...i, unitPrice:Math.round(up), cost:Math.round(cost), baseCost:Math.round(base), delta:Math.round(cost-base)}; });
  return { items, total:items.reduce((s,i)=>s+i.cost,0), baseTotal:items.reduce((s,i)=>s+i.baseCost,0) };
}

// Mini spark
function Sp({data,w=80,h=20,color="#10b981"}){
  if(!data||data.length<2)return null;
  const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-3)-1.5}`).join(" ");
  return <svg width={w} height={h} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/></svg>;
}

// Traceability chain badge
function TraceBadge({matKey, prices}){
  const t = TRACE[matKey];
  if(!t) return null;
  return (
    <div style={{padding:"8px 10px",background:"rgba(255,255,255,.02)",borderRadius:8,border:"1px solid var(--border)",marginTop:6}}>
      <div style={{fontSize:9,color:"var(--dim)",marginBottom:4,fontWeight:600}}>📍 溯源路径</div>
      <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap",marginBottom:4}}>
        {t.path.length === 0 ? (
          <span style={{fontSize:10,color:"var(--dim)"}}>非石化链 · 无期货联动</span>
        ) : t.path.map((fk,i)=>{
          const fm=FUTURES_META[fk]; if(!fm)return null;
          const curr=prices[fk], base=M[fk], chg=((curr/base-1)*100).toFixed(1);
          const up=curr>=base;
          return (
            <div key={fk} style={{display:"flex",alignItems:"center"}}>
              {i>0 && <span style={{color:"var(--dim)",fontSize:12,padding:"0 3px"}}>→</span>}
              <div style={{padding:"3px 7px",borderRadius:5,background:`${fm.color}10`,border:`1px solid ${fm.color}25`}}>
                <span style={{fontSize:9,fontWeight:700,color:fm.color}}>{fm.icon} {fm.short}</span>
                <span style={{fontSize:9,fontFamily:"'DM Mono'",marginLeft:4,color:up?"#ef4444":"#10b981"}}>{up?"+":""}{chg}%</span>
              </div>
            </div>
          );
        })}
        <span style={{color:"var(--dim)",fontSize:12,padding:"0 3px"}}>→</span>
        <div style={{padding:"3px 7px",borderRadius:5,background:"rgba(255,255,255,.04)"}}>
          <span style={{fontSize:9,fontWeight:600,color:"var(--fg)"}}>{t.label}</span>
        </div>
      </div>
      <div style={{fontSize:9,color:"var(--dim)",lineHeight:1.4}}>{t.desc}</div>
      <div style={{marginTop:3}}>
        <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,
          background: t.sensitivity==="高"?"rgba(239,68,68,.1)":t.sensitivity==="中高"?"rgba(245,158,11,.1)":t.sensitivity==="中"?"rgba(245,158,11,.08)":"rgba(255,255,255,.03)",
          color: t.sensitivity==="高"?"#ef4444":t.sensitivity==="中高"||t.sensitivity==="中"?"#f59e0b":"var(--dim)",
        }}>期货敏感度: {t.sensitivity}</span>
      </div>
    </div>
  );
}

// Collapsible section
function Section({title, badge, defaultOpen=true, children}){
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{marginBottom:10}}>
      <button onClick={()=>setOpen(!open)} style={{
        width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--card)",
        cursor:"pointer",fontFamily:"inherit",color:"var(--fg)",fontSize:13,fontWeight:700,
      }}>
        <span>{title} {badge && <span style={{fontSize:10,fontWeight:500,color:"var(--dim)",marginLeft:6}}>{badge}</span>}</span>
        <span style={{fontSize:11,color:"var(--dim)",transition:"transform .2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▼</span>
      </button>
      {open && <div style={{padding:"8px 0"}}>{children}</div>}
    </div>
  );
}

// All materials for dropdown
const ALL_MATS = [
  {k:"upr191",l:"UPR 191# 通用",c:"resin"},{k:"upr196",l:"UPR 196# 船用",c:"resin"},
  {k:"uprVE",l:"乙烯基酯树脂",c:"resin"},{k:"uprEpoxy",l:"环氧树脂",c:"resin"},
  {k:"gelcoat",l:"胶衣树脂",c:"resin"},
  {k:"gf2400",l:"无碱粗纱 2400tex",c:"fiber"},{k:"gfMat",l:"短切毡 CSM",c:"fiber"},
  {k:"gfCloth",l:"方格布 WR",c:"fiber"},{k:"gfRoving",l:"编织粗纱",c:"fiber"},
  {k:"carbonFiber",l:"碳纤维",c:"fiber"},{k:"aramid",l:"芳纶纤维",c:"fiber"},
  {k:"coreBalsa",l:"巴沙木",c:"core"},{k:"corePVC",l:"PVC泡沫",c:"core"},{k:"coreSAN",l:"SAN泡沫",c:"core"},
  {k:"hardener",l:"固化剂",c:"aux"},{k:"accelerator",l:"促进剂",c:"aux"},{k:"vacuumKit",l:"真空辅材",c:"aux"},
];

export default function CostLensV3(){
  const [mode,setMode]=useState("standard");
  const [prices,setPrices]=useState({...M});
  const [hists]=useState(()=>({crude:hist(M.crude),styrene:hist(M.styrene),pta:hist(M.pta),eg:hist(M.eg)}));
  const [stdKey,setStdKey]=useState("yacht_power");
  const [stdCat,setStdCat]=useState("all");
  const [expandedItem,setExpandedItem]=useState(null); // for traceability expand

  // Custom state
  const [cShip,setCShip]=useState({
    name:"我的船型", tonnage:12, process:"vacuum",
    bom:[
      {id:1,name:"UPR 196# 树脂",key:"upr196",r:.34,cat:"resin"},
      {id:2,name:"胶衣树脂",key:"gelcoat",r:.05,cat:"resin"},
      {id:3,name:"无碱粗纱",key:"gf2400",r:.18,cat:"fiber"},
      {id:4,name:"方格布",key:"gfCloth",r:.13,cat:"fiber"},
      {id:5,name:"短切毡",key:"gfMat",r:.08,cat:"fiber"},
      {id:6,name:"PVC泡沫夹芯",key:"corePVC",r:.07,cat:"core"},
      {id:7,name:"固化剂+促进剂",key:"hardener",r:.025,cat:"aux"},
      {id:8,name:"真空辅材",key:"vacuumKit",r:.035,cat:"aux",fx:8000},
      {id:9,name:"辅料+人工",key:"_labor",r:.14,cat:"labor",fx:4200},
    ],
  });
  const [nid,setNid]=useState(10);
  const [cExpandedId,setCExpandedId]=useState(null);

  useEffect(()=>{
    const t=setInterval(()=>{
      setPrices(p=>({...p,crude:tick(p.crude,.004),styrene:tick(p.styrene,.005),pta:tick(p.pta,.003),eg:tick(p.eg,.003)}));
    },2200);
    return ()=>clearInterval(t);
  },[]);

  const dp=useMemo(()=>dynP(prices),[prices]);
  const stdBom=useMemo(()=>{ const p=STD[stdKey]; return calcBom(p.bom,p.t,dp); },[stdKey,dp]);
  const cBom=useMemo(()=>calcBom(cShip.bom,cShip.tonnage,dp),[cShip,dp]);
  const cTotalR=cShip.bom.reduce((s,b)=>s+(b.r||0),0);

  const updC=(id,f,v)=>setCShip(p=>({...p,bom:p.bom.map(b=>b.id===id?{...b,[f]:v}:b)}));
  const addC=()=>{setCShip(p=>({...p,bom:[...p.bom,{id:nid,name:"新材料",key:"upr191",r:.05,cat:"resin"}]}));setNid(n=>n+1);};
  const delC=(id)=>setCShip(p=>({...p,bom:p.bom.filter(b=>b.id!==id)}));

  const filtered=stdCat==="all"?Object.entries(STD):Object.entries(STD).filter(([,v])=>v.cat===stdCat);

  return (
    <div style={{
      "--bg":"#080b12","--card":"#111620","--card2":"#161d28","--border":"#1a2030","--border2":"#252f40",
      "--fg":"#e2e8f0","--dim":"#5a6a7e","--accent":"#10b981",
      fontFamily:"'Noto Sans SC','SF Pro Display',system-ui,sans-serif",
      background:"var(--bg)",color:"var(--fg)",minHeight:"100vh",maxWidth:480,margin:"0 auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700;900&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .card{background:var(--card);border:1px solid var(--border);border-radius:10px}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:pulse 2s infinite}
        .fade{animation:fadeIn .3s ease-out both}
        .pill{padding:6px 14px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;transition:all .15s}
        .pill.on{background:var(--accent);color:#fff}
        .pill.off{background:rgba(255,255,255,.03);color:var(--dim)}
        .tag{padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--card);color:var(--dim);cursor:pointer;font-size:10px;font-weight:600;font-family:inherit;transition:all .15s}
        .tag.on{border-color:var(--accent);color:var(--accent);background:rgba(16,185,129,.06)}
        input[type=range]{appearance:none;height:4px;border-radius:2px;background:var(--border);cursor:pointer;width:100%}
        input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);border:2px solid var(--bg)}
        input[type=number],input[type=text],select{background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--fg);padding:8px 10px;font-family:'DM Mono',monospace;font-size:13px;outline:none;width:100%}
        input:focus,select:focus{border-color:var(--accent)}
        select{appearance:none;padding-right:24px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7e'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center}
        .bom-row{padding:12px;border-radius:8px;background:rgba(255,255,255,.015);margin-bottom:6px;border:1px solid transparent;transition:border-color .15s}
        .bom-row.expanded{border-color:var(--accent);background:rgba(16,185,129,.02)}
      `}</style>

      {/* HEADER */}
      <header style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"var(--bg)",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit'",fontSize:12,fontWeight:900,color:"#fff"}}>CL</div>
          <div>
            <div style={{fontFamily:"'Outfit'",fontSize:14,fontWeight:800,letterSpacing:"-.02em",lineHeight:1}}>CostLens<sup style={{color:"var(--accent)",fontSize:7}}>™</sup></div>
            <div style={{fontSize:8,color:"var(--dim)"}}>船舶复材成本情报</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.02)",borderRadius:8,padding:2}}>
            <button className={`pill ${mode==="standard"?"on":"off"}`} onClick={()=>setMode("standard")} style={{fontSize:11,padding:"5px 10px"}}>通用</button>
            <button className={`pill ${mode==="custom"?"on":"off"}`} onClick={()=>setMode("custom")} style={{fontSize:11,padding:"5px 10px"}}>定制</button>
          </div>
          <div className="live-dot"/>
        </div>
      </header>

      {/* FUTURES TICKER */}
      <div style={{padding:"8px 16px",borderBottom:"1px solid var(--border)",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
        {Object.entries(FUTURES_META).map(([k,f])=>{
          const c=prices[k],b=M[k],chg=((c/b-1)*100).toFixed(1),up=c>=b;
          return (
            <div key={k} style={{textAlign:"center",padding:"4px 0"}}>
              <div style={{fontSize:8,color:f.color,fontWeight:700}}>{f.icon}{f.short}</div>
              <div style={{fontFamily:"'DM Mono'",fontSize:13,fontWeight:700}}>{k==="crude"?c.toFixed(0):Math.round(c).toLocaleString()}</div>
              <div style={{fontSize:10,fontFamily:"'DM Mono'",fontWeight:600,color:up?"#ef4444":"#10b981"}}>{up?"+":""}{chg}%</div>
            </div>
          );
        })}
      </div>

      <div style={{padding:"12px 16px 40px"}}>

      {/* ═══ STANDARD ═══ */}
      {mode==="standard" && (
        <div className="fade">
          {/* Category pills */}
          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
            {[{k:"all",l:"全部"},{k:"yacht",l:"🛥️ 游艇"},{k:"commercial",l:"🚢 商船"},{k:"parts",l:"🔧 部件"}].map(c=>(
              <button key={c.k} className={`tag ${stdCat===c.k?"on":""}`} onClick={()=>setStdCat(c.k)}>{c.l}</button>
            ))}
          </div>

          {/* Presets */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
            {filtered.map(([k,v])=>(
              <button key={k} onClick={()=>{setStdKey(k);setExpandedItem(null);}} style={{
                padding:"10px 8px",borderRadius:8,border:`1px solid ${stdKey===k?"var(--accent)":"var(--border)"}`,
                background:stdKey===k?"rgba(16,185,129,.05)":"var(--card)",cursor:"pointer",textAlign:"center",fontFamily:"inherit",color:"var(--fg)",transition:"all .15s",
              }}>
                <div style={{fontSize:20}}>{v.icon}</div>
                <div style={{fontSize:11,fontWeight:700}}>{v.name}</div>
                <div style={{fontSize:8,color:"var(--dim)"}}>{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Total cost */}
          <div className="card" style={{padding:"16px",marginBottom:10,background:"linear-gradient(135deg,rgba(16,185,129,.04),transparent)"}}>
            <div style={{fontSize:10,color:"var(--dim)"}}>{STD[stdKey].name} · {STD[stdKey].t}吨 FRP</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div style={{fontFamily:"'DM Mono'",fontSize:30,fontWeight:700,letterSpacing:"-.03em"}}>¥{stdBom.total.toLocaleString()}</div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'DM Mono'",fontSize:12,fontWeight:600,color:stdBom.total>stdBom.baseTotal?"#ef4444":"#10b981"}}>
                  {stdBom.total>stdBom.baseTotal?"▲":"▼"} ¥{Math.abs(stdBom.total-stdBom.baseTotal).toLocaleString()}
                </div>
                <div style={{fontSize:9,color:"var(--dim)"}}>vs 基准</div>
              </div>
            </div>
            {/* bar */}
            <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",gap:1,marginTop:10}}>
              {Object.keys(CAT_C).map(c=>{const v=stdBom.items.filter(i=>i.cat===c).reduce((s,i)=>s+i.cost,0);return v>0?<div key={c} style={{width:`${(v/stdBom.total)*100}%`,background:CAT_C[c],borderRadius:2}}/>:null;})}
            </div>
            <div style={{display:"flex",gap:10,marginTop:5,fontSize:9,flexWrap:"wrap"}}>
              {Object.entries(CAT_N).map(([k,v])=>{const val=stdBom.items.filter(i=>i.cat===k).reduce((s,i)=>s+i.cost,0);if(!val)return null;
                return <span key={k} style={{color:"var(--dim)"}}><span style={{display:"inline-block",width:5,height:5,borderRadius:1.5,background:CAT_C[k],marginRight:3,verticalAlign:"middle"}}/>{v}{((val/stdBom.total)*100).toFixed(0)}%</span>;})}
            </div>
          </div>

          {/* BOM with traceability */}
          <Section title="物料清单" badge={`${stdBom.items.length}项`}>
            {stdBom.items.map((it,i)=>(
              <div key={i} className={`bom-row ${expandedItem===i?"expanded":""}`}
                onClick={()=>setExpandedItem(expandedItem===i?null:i)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:3,height:24,borderRadius:2,background:CAT_C[it.cat]}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{it.name}</div>
                      <div style={{fontSize:9,color:"var(--dim)",fontFamily:"'DM Mono'"}}>{it.fx?"固定":`¥${it.unitPrice.toLocaleString()}/t`} × {((it.r||it.ratio)*100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontFamily:"'DM Mono'",fontWeight:700}}>¥{it.cost.toLocaleString()}</div>
                    <div style={{fontSize:9,fontFamily:"'DM Mono'",color:it.delta>30?"#ef4444":it.delta<-30?"#10b981":"var(--dim)"}}>{it.delta>0?"+":""}{it.delta.toLocaleString()}</div>
                  </div>
                </div>
                {expandedItem===i && it.key && it.key[0]!=="_" && <TraceBadge matKey={it.key} prices={prices}/>}
                {expandedItem===i && it.key && it.key[0]==="_" && <div style={{padding:"6px 10px",marginTop:6,background:"rgba(255,255,255,.02)",borderRadius:6,fontSize:9,color:"var(--dim)"}}>📍 固定成本项 · 不受期货价格波动影响</div>}
              </div>
            ))}
          </Section>

          {/* Value */}
          <div className="card" style={{padding:"14px 16px",background:"rgba(16,185,129,.03)",border:"1px solid rgba(16,185,129,.1)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",marginBottom:6}}>💡 CostLens 价值</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{n:"采购时机",v:"省3-8%"},{n:"期货套保",v:"锁成本"},{n:"替代推荐",v:"省2-5%"},{n:"报价精度",v:"+15%利润"}].map((s,i)=>(
                <div key={i} style={{padding:"6px 8px",background:"rgba(255,255,255,.02)",borderRadius:6}}>
                  <div style={{fontSize:9,fontWeight:600}}>{s.n}</div>
                  <div style={{fontFamily:"'DM Mono'",fontSize:14,fontWeight:700,color:"var(--accent)"}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CUSTOM ═══ */}
      {mode==="custom" && (
        <div className="fade">

          {/* Ship config */}
          <Section title="🚢 船型配置" defaultOpen={true}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div>
                <label style={{fontSize:9,color:"var(--dim)",display:"block",marginBottom:3}}>船型名称</label>
                <input type="text" value={cShip.name} onChange={e=>setCShip(p=>({...p,name:e.target.value}))} style={{fontFamily:"inherit",fontWeight:600}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <label style={{fontSize:9,color:"var(--dim)",display:"block",marginBottom:3}}>FRP 用量（吨）</label>
                  <input type="number" value={cShip.tonnage} min={0.1} step={0.5} onChange={e=>setCShip(p=>({...p,tonnage:parseFloat(e.target.value)||1}))}/>
                </div>
                <div>
                  <label style={{fontSize:9,color:"var(--dim)",display:"block",marginBottom:3}}>成型工艺</label>
                  <select value={cShip.process} onChange={e=>setCShip(p=>({...p,process:e.target.value}))}>
                    <option value="hand">手糊成型</option><option value="vacuum">真空灌注</option>
                    <option value="spray">喷射成型</option><option value="rtm">RTM</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          {/* Total cost - sticky */}
          <div className="card" style={{padding:"14px 16px",marginBottom:10,position:"sticky",top:54,zIndex:9,
            background:"linear-gradient(135deg,rgba(16,185,129,.06),var(--card))",borderColor:"rgba(16,185,129,.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:9,color:"var(--dim)"}}>{cShip.name} · {cShip.tonnage}t</div>
                <div style={{fontFamily:"'DM Mono'",fontSize:26,fontWeight:700,letterSpacing:"-.03em"}}>¥{cBom.total.toLocaleString()}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'DM Mono'",fontSize:11,fontWeight:600,color:cBom.total>cBom.baseTotal?"#ef4444":"#10b981"}}>
                  {cBom.total>cBom.baseTotal?"▲":"▼"}¥{Math.abs(cBom.total-cBom.baseTotal).toLocaleString()} ({((cBom.total/cBom.baseTotal-1)*100).toFixed(1)}%)
                </div>
                <div style={{fontSize:9,color:"var(--dim)"}}>折合 ¥{Math.round(cBom.total/cShip.tonnage).toLocaleString()}/吨</div>
              </div>
            </div>
            <div style={{display:"flex",height:4,borderRadius:2,overflow:"hidden",gap:1,marginTop:8}}>
              {Object.keys(CAT_C).map(c=>{const v=cBom.items.filter(i=>i.cat===c).reduce((s,i)=>s+i.cost,0);return v>0?<div key={c} style={{width:`${(v/cBom.total)*100}%`,background:CAT_C[c],borderRadius:1.5}}/>:null;})}
            </div>
            {/* Ratio warning */}
            {Math.abs(cTotalR-1)>=.005 && (
              <div style={{marginTop:6,fontSize:10,color:"#ef4444",fontWeight:600}}>⚠️ 配比合计 {(cTotalR*100).toFixed(1)}% ≠ 100%</div>
            )}
          </div>

          {/* BOM Editor */}
          <Section title="📋 材料清单编辑" badge={`${cShip.bom.length}项 · 合计${(cTotalR*100).toFixed(1)}%`} defaultOpen={true}>
            {cShip.bom.map((item,idx)=>{
              const bi=cBom.items[idx];
              const isExp=cExpandedId===item.id;
              return (
                <div key={item.id} className={`bom-row ${isExp?"expanded":""}`}>
                  {/* Header row */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isExp?8:0}}
                    onClick={()=>setCExpandedId(isExp?null:item.id)}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                      <div style={{width:3,height:28,borderRadius:2,background:CAT_C[item.cat],flexShrink:0}}/>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                        <div style={{fontSize:9,color:"var(--dim)",fontFamily:"'DM Mono'"}}>
                          {item.fx?"固定价":`¥${(bi?.unitPrice||0).toLocaleString()}/t`} · {((item.r)*100).toFixed(1)}%
                          {TRACE[item.key]?.sensitivity && TRACE[item.key].sensitivity!=="无" && (
                            <span style={{marginLeft:4,padding:"0 3px",borderRadius:2,fontSize:8,
                              background:TRACE[item.key].sensitivity==="高"?"rgba(239,68,68,.1)":"rgba(245,158,11,.08)",
                              color:TRACE[item.key].sensitivity==="高"?"#ef4444":"#f59e0b",
                            }}>期货{TRACE[item.key].sensitivity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:14,fontFamily:"'DM Mono'",fontWeight:700}}>¥{(bi?.cost||0).toLocaleString()}</div>
                      <div style={{fontSize:9,fontFamily:"'DM Mono'",color:(bi?.delta||0)>30?"#ef4444":(bi?.delta||0)<-30?"#10b981":"var(--dim)"}}>{(bi?.delta||0)>0?"+":""}{(bi?.delta||0).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {isExp && (
                    <div style={{paddingTop:4,borderTop:"1px solid var(--border)"}}>
                      {/* Traceability first! */}
                      {item.key && item.key[0]!=="_" && <TraceBadge matKey={item.key} prices={prices}/>}
                      {item.key && item.key[0]==="_" && <div style={{padding:"6px 10px",marginBottom:6,background:"rgba(255,255,255,.02)",borderRadius:6,fontSize:9,color:"var(--dim)"}}>📍 固定成本项 · 不受期货波动</div>}

                      {/* Edit fields */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
                        <div>
                          <label style={{fontSize:8,color:"var(--dim)",display:"block",marginBottom:2}}>材料名称</label>
                          <input type="text" value={item.name} onChange={e=>updC(item.id,"name",e.target.value)} style={{fontFamily:"inherit",fontSize:12}}/>
                        </div>
                        <div>
                          <label style={{fontSize:8,color:"var(--dim)",display:"block",marginBottom:2}}>材料类型</label>
                          <select value={item.key} onChange={e=>{
                            const mat=ALL_MATS.find(m=>m.k===e.target.value);
                            updC(item.id,"key",e.target.value);
                            if(mat)updC(item.id,"cat",mat.c);
                          }} style={{fontSize:11}}>
                            <optgroup label="树脂">{ALL_MATS.filter(m=>m.c==="resin").map(m=><option key={m.k} value={m.k}>{m.l}</option>)}</optgroup>
                            <optgroup label="纤维">{ALL_MATS.filter(m=>m.c==="fiber").map(m=><option key={m.k} value={m.k}>{m.l}</option>)}</optgroup>
                            <optgroup label="夹芯">{ALL_MATS.filter(m=>m.c==="core").map(m=><option key={m.k} value={m.k}>{m.l}</option>)}</optgroup>
                            <optgroup label="辅料">{ALL_MATS.filter(m=>m.c==="aux").map(m=><option key={m.k} value={m.k}>{m.l}</option>)}</optgroup>
                          </select>
                        </div>
                      </div>

                      <div style={{marginTop:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <label style={{fontSize:8,color:"var(--dim)"}}>配比占比</label>
                          <span style={{fontSize:11,fontFamily:"'DM Mono'",fontWeight:700,color:"var(--accent)"}}>{(item.r*100).toFixed(1)}%</span>
                        </div>
                        <input type="range" min={0} max={60} step={0.5} value={item.r*100}
                          onChange={e=>updC(item.id,"r",clamp(parseFloat(e.target.value)/100,0,.6))}/>
                      </div>

                      <div style={{marginTop:6}}>
                        <label style={{fontSize:8,color:"var(--dim)",display:"block",marginBottom:2}}>固定价格（留空则跟随期货）</label>
                        <input type="number" value={item.fx||""} placeholder="跟随期货实时价"
                          onChange={e=>{const v=parseFloat(e.target.value);updC(item.id,"fx",isNaN(v)?undefined:v);}}/>
                      </div>

                      <button onClick={()=>delC(item.id)} style={{
                        marginTop:8,width:"100%",padding:"8px",borderRadius:6,border:"1px solid rgba(239,68,68,.2)",
                        background:"rgba(239,68,68,.04)",color:"#ef4444",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",
                      }}>删除此材料</button>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={addC} style={{
              width:"100%",padding:"10px",borderRadius:8,border:"1px dashed var(--border)",
              background:"transparent",color:"var(--accent)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",marginTop:4,
            }}>+ 添加材料</button>
          </Section>

          {/* Sensitivity */}
          <Section title="📊 期货敏感性" badge="各+10%影响" defaultOpen={false}>
            {Object.entries(FUTURES_META).map(([k,f])=>{
              const tp={...prices,[k]:prices[k]*1.1};
              const td=dynP(tp);
              const tb=calcBom(cShip.bom,cShip.tonnage,td);
              const impact=tb.total-cBom.total;
              const el=((impact/cBom.total*100)/10).toFixed(2);
              const barW=Math.min(100,Math.abs(impact)/cBom.total*1000);
              return (
                <div key={k} style={{padding:"8px 10px",background:"rgba(255,255,255,.015)",borderRadius:6,marginBottom:4}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:f.color}}>{f.icon} {f.label} +10%</span>
                    <span style={{fontSize:12,fontFamily:"'DM Mono'",fontWeight:700,color:impact>0?"#ef4444":"#10b981"}}>
                      {impact>0?"+":""}¥{Math.round(impact).toLocaleString()}
                    </span>
                  </div>
                  <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${barW}%`,background:f.color,borderRadius:2,opacity:.6,transition:"width .3s"}}/>
                  </div>
                  <div style={{fontSize:9,color:"var(--dim)",marginTop:2}}>弹性 ε={el} · 成本影响 {((impact/cBom.total)*100).toFixed(2)}%</div>
                </div>
              );
            })}
          </Section>

          {/* Export CTA */}
          <div style={{
            padding:"16px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",
            textAlign:"center",boxShadow:"0 0 40px rgba(16,185,129,.15)",
          }}>
            <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>开始精准控成本</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:4}}>首月免费 · 导出Excel · 对接ERP</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:6}}>👆 扫码预约演示</div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
