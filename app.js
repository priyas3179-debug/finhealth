// ═══════════════════════════════════════════════════
//  FinHealth · app.js
//  Data, logic, charts (Chart.js), AI advisor, modal
// ═══════════════════════════════════════════════════

// ── Seed Data ──────────────────────────────────────
let D = {
  profile:  { name:"Priya", salaryUSD:5000, inrRate:83.5 },
  loans: [
    { name:"Home Loan",     emiUSD:600, months:180, rate:7.5,  autopay:true  },
    { name:"Car Loan",      emiUSD:280, months:36,  rate:9.0,  autopay:true  },
    { name:"Personal Loan", emiUSD:150, months:18,  rate:12.0, autopay:false }
  ],
  expenses: [
    { cat:"Groceries",        amt:300 },
    { cat:"Utilities",        amt:120 },
    { cat:"Subscriptions",    amt:60  },
    { cat:"Food & Dining",    amt:200 },
    { cat:"Transport",        amt:100 },
    { cat:"Family (INR)",     amt:200 },
    { cat:"Miscellaneous",    amt:150 }
  ],
  investments: [
    { name:"Groww – Indian Stocks", monthlyUSD:300, totalUSD:3600, currentUSD:4100, type:"Equity" },
    { name:"PPF (Father)",          monthlyUSD:0,   totalUSD:0,    currentUSD:0,    type:"PPF",   note:"₹1.5L/yr limit · Starting soon" }
  ],
  history: [
    { month:"Nov 23", income:5000, expenses:1580, emi:1030, invested:300, savings:2090 },
    { month:"Dec 23", income:5200, expenses:1900, emi:1030, invested:300, savings:1970 },
    { month:"Jan 24", income:5000, expenses:1620, emi:1030, invested:400, savings:1950 },
    { month:"Feb 24", income:5000, expenses:1450, emi:1030, invested:400, savings:2120 },
    { month:"Mar 24", income:5000, expenses:1700, emi:1030, invested:300, savings:1970 },
    { month:"Apr 24", income:5500, expenses:1580, emi:1030, invested:500, savings:2390 }
  ]
};

// ── Load saved data from localStorage ─────────────
(function loadSaved() {
  const saved = localStorage.getItem("finhealth_data");
  if (saved) try { D = JSON.parse(saved); } catch(e) {}
})();

function saveData() { localStorage.setItem("finhealth_data", JSON.stringify(D)); }

// ── Colours ────────────────────────────────────────
const PIE_COLORS = ["#3B82F6","#10B981","#F59E0B","#8B5CF6"];
const LINE_COLORS = { income:"#10B981", savings:"#3B82F6", expenses:"#F59E0B", emi:"#EF4444", invested:"#8B5CF6" };

// ── Helpers ────────────────────────────────────────
const fmt  = (n) => "$" + Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
const pct  = (a,b) => b ? ((a/b)*100).toFixed(0)+"%" : "0%";
const clr  = (v,good,warn) => v>=good ? "var(--green)" : v>=warn ? "var(--amber)" : "var(--red)";

// ── Health score ───────────────────────────────────
function calcHealth() {
  const totalEMI = D.loans.reduce((s,l)=>s+l.emiUSD,0);
  const totalExp = D.expenses.reduce((s,e)=>s+e.amt,0);
  const totalInv = D.investments.reduce((s,i)=>s+i.monthlyUSD,0);
  const income   = D.profile.salaryUSD;
  const savings  = income - totalEMI - totalExp - totalInv;
  const debtR    = totalEMI/income;
  const saveR    = Math.max(savings,0)/income;
  const expR     = totalExp/income;
  const invR     = totalInv/income;

  let score = 100;
  if(debtR>.5) score-=30; else if(debtR>.4) score-=20; else if(debtR>.3) score-=10;
  if(saveR<.1)  score-=25; else if(saveR<.2) score-=10;
  if(expR>.5)   score-=20; else if(expR>.4)  score-=10;
  if(invR<.05)  score-=15; else if(invR<.1)  score-=5;
  score = Math.max(0, Math.min(100, score));

  const label = score>=80?"Excellent":score>=65?"Good":score>=45?"Fair":"Needs Attention";
  const color = score>=80?"#10B981":score>=65?"#14B8A6":score>=45?"#F59E0B":"#EF4444";
  return { score, label, color, totalEMI, totalExp, totalInv, savings, income, debtR, saveR, expR, invR };
}

// ── Tab switching ──────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
    if(btn.dataset.tab==="overview") renderOverview();
    if(btn.dataset.tab==="loans")    renderLoans();
    if(btn.dataset.tab==="invest")   renderInvest();
  });
});

// ── Chart instances ────────────────────────────────
let chartPie=null, chartLine=null, chartBar=null, chartLoanBar=null, chartSavBar=null;

function destroyChart(c){ if(c){ try{c.destroy()}catch(e){} } return null; }

// ═══════════════════════════════════════════════════
//  OVERVIEW TAB
// ═══════════════════════════════════════════════════
function renderOverview() {
  const h = calcHealth();

  // KPI tiles
  const tiles = [
    { id:"kpi-income",  val:fmt(h.income),              sub:`Monthly take-home`,          color:"var(--green)"  },
    { id:"kpi-emi",     val:fmt(h.totalEMI),            sub:`${pct(h.totalEMI,h.income)} of income`, color:"var(--amber)" },
    { id:"kpi-exp",     val:fmt(h.totalExp),            sub:`${pct(h.totalExp,h.income)} of income`, color:"var(--purple)"},
    { id:"kpi-inv",     val:fmt(h.totalInv),            sub:`${pct(h.totalInv,h.income)} of income`, color:"var(--teal)"  },
    { id:"kpi-savings", val:fmt(Math.max(h.savings,0)), sub:`${pct(Math.max(h.savings,0),h.income)} saved`, color: h.savings>=0?"var(--green)":"var(--red)" }
  ];
  tiles.forEach(t => {
    const el = document.getElementById(t.id);
    if(!el) return;
    el.querySelector(".metric-value").style.color = t.color;
    el.querySelector(".metric-value").textContent  = t.val;
    el.querySelector(".metric-sub").textContent    = t.sub;
  });

  // Score gauge (SVG arc)
  renderGauge(h.score, h.color, h.label);

  // Pie chart
  const pieData = [
    { label:"EMIs",       value:h.totalEMI },
    { label:"Expenses",   value:h.totalExp },
    { label:"Invested",   value:h.totalInv },
    { label:"Savings",    value:Math.max(h.savings,0) }
  ];
  const pieCtx = document.getElementById("chart-pie");
  if(pieCtx){
    chartPie = destroyChart(chartPie);
    chartPie = new Chart(pieCtx, {
      type:"doughnut",
      data:{ labels:pieData.map(d=>d.label), datasets:[{ data:pieData.map(d=>d.value), backgroundColor:PIE_COLORS, borderWidth:0, hoverOffset:6 }] },
      options:{ cutout:"65%", plugins:{ legend:{ position:"bottom", labels:{ color:"#8B949E", font:{size:12}, padding:12, boxWidth:10 } } }, animation:{ animateScale:true } }
    });
  }

  // Expense bars
  const expList = document.getElementById("exp-list");
  if(expList){
    expList.innerHTML = "";
    const colors = ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#14B8A6","#EC4899","#F97316"];
    D.expenses.forEach((e,i)=>{
      const barW = h.totalExp ? Math.round((e.amt/h.totalExp)*100) : 0;
      expList.innerHTML += `
        <div class="exp-row">
          <div class="exp-label"><span class="exp-dot" style="background:${colors[i%colors.length]}"></span>${e.cat}</div>
          <div class="exp-right">
            <div class="exp-bar-track"><div class="exp-bar-fill" style="width:${barW}%;background:${colors[i%colors.length]}"></div></div>
            <span class="exp-amount">${fmt(e.amt)}</span>
          </div>
        </div>`;
    });
  }

  // Line chart
  const lineCtx = document.getElementById("chart-line");
  if(lineCtx){
    chartLine = destroyChart(chartLine);
    chartLine = new Chart(lineCtx, {
      type:"line",
      data:{
        labels: D.history.map(h=>h.month),
        datasets:[
          { label:"Income",   data:D.history.map(h=>h.income),   borderColor:LINE_COLORS.income,   tension:.4, pointRadius:3, borderWidth:2, fill:false },
          { label:"Savings",  data:D.history.map(h=>h.savings),  borderColor:LINE_COLORS.savings,  tension:.4, pointRadius:3, borderWidth:2, fill:false },
          { label:"Expenses", data:D.history.map(h=>h.expenses), borderColor:LINE_COLORS.expenses, tension:.4, pointRadius:3, borderWidth:2, fill:false },
          { label:"EMI",      data:D.history.map(h=>h.emi),      borderColor:LINE_COLORS.emi,      tension:.4, pointRadius:3, borderWidth:2, fill:false },
          { label:"Invested", data:D.history.map(h=>h.invested), borderColor:LINE_COLORS.invested, tension:.4, pointRadius:3, borderWidth:2, fill:false }
        ]
      },
      options:{
        plugins:{ legend:{ labels:{ color:"#8B949E", font:{size:12}, boxWidth:12 } } },
        scales:{
          x:{ ticks:{ color:"#8B949E" }, grid:{ color:"#2D3748" } },
          y:{ ticks:{ color:"#8B949E", callback:v=>"$"+v }, grid:{ color:"#2D3748" } }
        }
      }
    });
  }
}

// ── SVG Gauge ──────────────────────────────────────
function renderGauge(score, color, label) {
  const el = document.getElementById("gauge-svg");
  if(!el) return;
  const r=54, cx=70, cy=70;
  const toRad = d => d*Math.PI/180;
  const start=-210, end=30, total=end-start, fill=(score/100)*total;
  const pt = (a)=>({ x: cx+r*Math.cos(toRad(a)), y: cy+r*Math.sin(toRad(a)) });
  const s=pt(start), e3=pt(end), f=pt(start+fill);
  const lf = fill>180?1:0;
  el.innerHTML = `
    <path d="M${s.x},${s.y} A${r},${r} 0 1 1 ${e3.x},${e3.y}" fill="none" stroke="#2D3748" stroke-width="10" stroke-linecap="round"/>
    <path d="M${s.x},${s.y} A${r},${r} 0 ${lf} 1 ${f.x},${f.y}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
    <text x="${cx}" y="${cy+4}" text-anchor="middle" fill="${color}" font-size="26" font-weight="800" font-family="JetBrains Mono,monospace">${score}</text>
    <text x="${cx}" y="${cy+22}" text-anchor="middle" fill="#8B949E" font-size="11">/100</text>`;
  const lbl = document.getElementById("gauge-label");
  if(lbl){ lbl.textContent=label; lbl.style.background=color+"22"; lbl.style.color=color; lbl.style.border=`1px solid ${color}55`; }
  const sub = document.getElementById("gauge-sub");
  if(sub) sub.textContent = score>=70?"You're doing great 🎉":score>=50?"Room to improve 📈":"Action needed ⚠️";
}

// ═══════════════════════════════════════════════════
//  LOANS TAB
// ═══════════════════════════════════════════════════
function renderLoans() {
  const h = calcHealth();
  const el = document.getElementById("loans-list");
  if(!el) return;
  el.innerHTML = "";
  D.loans.forEach(loan => {
    const months = parseInt(loan.months)||1;
    const paidPct = Math.max(0, Math.min(100, 100 - (months/240)*100));
    const endDate = new Date(Date.now() + months*30*86400000);
    const endStr  = endDate.toLocaleDateString("en-IN",{month:"short",year:"numeric"});
    const autopayBadge = loan.autopay
      ? `<span class="badge" style="background:#10B98122;color:#10B981;border:1px solid #10B98155">✅ AutoPay ON</span>`
      : `<span class="badge" style="background:#EF444422;color:#EF4444;border:1px solid #EF444455">⚠️ AutoPay OFF</span>`;
    const warning = loan.autopay ? "" : `<div class="autopay-warning">⚠️ Turn on AutoPay to avoid late fees and credit score damage!</div>`;
    el.innerHTML += `
      <div class="card">
        <div class="loan-header">
          <div>
            <div class="loan-name">${loan.name}</div>
            <span class="badge" style="background:#3B82F622;color:#3B82F6;border:1px solid #3B82F655">${loan.rate}% p.a.</span>
            ${autopayBadge}
          </div>
          <div style="text-align:right">
            <div class="loan-amount">${fmt(loan.emiUSD)}<span style="font-size:13px;color:var(--subtext)">/mo</span></div>
            <div style="font-size:12px;color:var(--subtext)">${months} months left</div>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${paidPct}%;background:linear-gradient(90deg,var(--green),var(--accent))"></div>
        </div>
        <div class="loan-footer">
          <span>Completes: ${endStr}</span>
          <span>Total remaining: ${fmt(loan.emiUSD*months)}</span>
        </div>
        ${warning}
      </div>`;
  });

  // Loan bar chart
  const barCtx = document.getElementById("chart-loanbar");
  if(barCtx){
    chartLoanBar = destroyChart(chartLoanBar);
    chartLoanBar = new Chart(barCtx,{
      type:"bar",
      data:{ labels:D.loans.map(l=>l.name.replace(" Loan","")), datasets:[{ label:"Monthly EMI", data:D.loans.map(l=>l.emiUSD), backgroundColor:["#3B82F6","#10B981","#F59E0B"], borderRadius:6 }] },
      options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:"#8B949E" }, grid:{ color:"#2D3748" } }, y:{ ticks:{ color:"#8B949E", callback:v=>"$"+v }, grid:{ color:"#2D3748" } } } }
    });
  }

  // KPIs
  const setEl = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  setEl("loan-kpi-total", fmt(h.totalEMI));
  setEl("loan-kpi-ratio", pct(h.totalEMI,h.income));
  setEl("loan-kpi-count", D.loans.length);
  const ratioEl = document.getElementById("loan-kpi-ratio-sub");
  if(ratioEl) ratioEl.style.color = h.debtR<.3?"var(--green)":h.debtR<.4?"var(--amber)":"var(--red)";
}

// ═══════════════════════════════════════════════════
//  INVESTMENTS TAB
// ═══════════════════════════════════════════════════
function renderInvest() {
  const h = calcHealth();
  const totalInvested = D.investments.reduce((s,i)=>s+i.totalUSD,0);
  const totalCurrent  = D.investments.reduce((s,i)=>s+i.currentUSD,0);
  const totalPL       = totalCurrent - totalInvested;

  const setEl = (id,v,c) => { const e=document.getElementById(id); if(e){ e.textContent=v; if(c) e.style.color=c; } };
  setEl("inv-kpi-total",   fmt(totalInvested));
  setEl("inv-kpi-current", fmt(totalCurrent));
  setEl("inv-kpi-pl",      (totalPL>=0?"+":"")+fmt(Math.abs(totalPL)), totalPL>=0?"var(--green)":"var(--red)");
  setEl("inv-kpi-sip",     fmt(h.totalInv));

  const el = document.getElementById("inv-list");
  if(el){
    el.innerHTML="";
    D.investments.forEach(inv => {
      const pl    = inv.currentUSD - inv.totalUSD;
      const plPct = inv.totalUSD ? ((pl/inv.totalUSD)*100).toFixed(1) : 0;
      const plStr = inv.totalUSD ? `<div style="font-size:22px;font-weight:800;font-family:var(--mono);color:${pl>=0?'var(--green)':'var(--red)'}">${pl>=0?'+':'-'}${fmt(Math.abs(pl))}</div><div style="font-size:12px;color:var(--subtext)">${plPct}% ${pl>=0?'gain':'loss'}</div>` : `<div style="color:var(--amber);font-size:14px">Not started yet</div>`;
      const stats = inv.totalUSD ? `<div class="inv-stats">
        <div class="inv-stat"><div class="inv-stat-label">Invested</div><div class="inv-stat-value">${fmt(inv.totalUSD)}</div></div>
        <div class="inv-stat"><div class="inv-stat-label">Current Value</div><div class="inv-stat-value">${fmt(inv.currentUSD)}</div></div>
        <div class="inv-stat"><div class="inv-stat-label">Monthly SIP</div><div class="inv-stat-value">${fmt(inv.monthlyUSD)}/mo</div></div>
      </div>` : "";
      const note = inv.note ? `<div style="font-size:12px;color:var(--subtext);margin-top:8px">💡 ${inv.note}</div>` : "";
      el.innerHTML += `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:16px;font-weight:800;margin-bottom:6px">${inv.name}</div>
            <span class="badge" style="background:#8B5CF622;color:#8B5CF6;border:1px solid #8B5CF655">${inv.type}</span>
            ${note}
          </div>
          <div style="text-align:right">${plStr}</div>
        </div>
        ${stats}
      </div>`;
    });
  }

  // Savings bar chart
  const savCtx = document.getElementById("chart-savbar");
  if(savCtx){
    chartSavBar = destroyChart(chartSavBar);
    chartSavBar = new Chart(savCtx,{
      type:"bar",
      data:{ labels:D.history.map(h=>h.month), datasets:[
        { label:"Savings",  data:D.history.map(h=>h.savings),  backgroundColor:"#10B981", borderRadius:6 },
        { label:"Invested", data:D.history.map(h=>h.invested), backgroundColor:"#8B5CF6", borderRadius:6 }
      ]},
      options:{ plugins:{ legend:{ labels:{ color:"#8B949E",font:{size:12},boxWidth:12 } } }, scales:{ x:{ ticks:{ color:"#8B949E" }, grid:{ color:"#2D3748" } }, y:{ ticks:{ color:"#8B949E", callback:v=>"$"+v }, grid:{ color:"#2D3748" } }, stacked:false } }
    });
  }
}

// ═══════════════════════════════════════════════════
//  AI ADVISOR
// ═══════════════════════════════════════════════════
document.getElementById("advisor-btn")?.addEventListener("click", async () => {
  const btn    = document.getElementById("advisor-btn");
  const output = document.getElementById("advisor-output");
  const h      = calcHealth();

  btn.disabled = true;
  btn.textContent = "⏳ Analyzing...";
  output.innerHTML = `<div class="loading-bar"><div class="loading-fill"></div></div><div style="color:var(--subtext);font-size:13px;margin-top:10px">Reading your finances and crafting personalized advice...</div>`;

  const prompt = `You are a friendly, sharp personal financial advisor for ${D.profile.name}, who earns $${h.income}/month USD and lives across USA and India.

Current snapshot:
- Monthly EMIs: $${h.totalEMI} (${(h.debtR*100).toFixed(0)}% of income) — Loans: ${D.loans.map(l=>l.name).join(", ")}
- Monthly expenses: $${h.totalExp}
- Monthly invested: $${h.totalInv} (Groww Indian stocks + planning PPF for father)
- Net savings: $${h.savings}/month
- Health Score: ${h.score}/100 (${h.label})
- Last 3 months: ${JSON.stringify(D.history.slice(-3))}

Write a monthly financial advisor column (max 200 words). Format exactly like:
📊 This Month's Verdict
(1-2 sentences on overall financial health)

⚠️ One Thing To Fix
(specific, actionable, with numbers)

💡 Smart Move This Month
(tailored investment or savings tip — she uses Groww, wants PPF for father, earns USD, invests in Indian stocks)

🔮 Next Month Prediction
(predict likely savings based on trend)

Tone: Smart friend, not robot. Be specific with numbers. No generic advice.`;

  try {
    const res  = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content:prompt }] })
    });
    const json = await res.json();
    const text = json.content?.map(b=>b.text||"").join("") || "Could not generate advice. Please try again.";
    output.innerHTML = `<div class="advisor-output">${text}</div>`;
  } catch(e) {
    output.innerHTML = `<div class="advisor-output" style="color:var(--red)">⚠️ Could not connect. Check your internet connection and try again.</div>`;
  }
  btn.disabled = false;
  btn.textContent = "🔄 Refresh Advice";
});

// ═══════════════════════════════════════════════════
//  DATA ENTRY MODAL
// ═══════════════════════════════════════════════════
function openModal() {
  buildModalForm();
  document.getElementById("modal-overlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}
document.getElementById("btn-update")?.addEventListener("click", openModal);
document.getElementById("modal-close")?.addEventListener("click", closeModal);
document.getElementById("modal-overlay")?.addEventListener("click", e => { if(e.target===e.currentTarget) closeModal(); });

function buildModalForm() {
  const el = document.getElementById("modal-body");
  if(!el) return;
  el.innerHTML = `
    <div class="modal-section">💼 Profile</div>
    <div class="form-row-2">
      <div><label class="form-label">Monthly Income (USD)</label><input class="form-input" id="m-salary" type="number" value="${D.profile.salaryUSD}"></div>
      <div><label class="form-label">USD → INR Rate</label><input class="form-input" id="m-inrrate" type="number" value="${D.profile.inrRate}"></div>
    </div>

    <div class="modal-section">🏦 Loans & EMIs</div>
    ${D.loans.map((l,i)=>`
      <div class="form-row-3">
        <div><label class="form-label">Loan Name</label><input class="form-input" id="m-ln-${i}" value="${l.name}"></div>
        <div><label class="form-label">EMI (USD)</label><input class="form-input" id="m-le-${i}" type="number" value="${l.emiUSD}"></div>
        <div><label class="form-label">Months Left</label><input class="form-input" id="m-lm-${i}" type="number" value="${l.months}"></div>
      </div>`).join("")}

    <div class="modal-section">💸 Monthly Expenses</div>
    ${D.expenses.map((e,i)=>`
      <div class="form-row-2">
        <div><label class="form-label">Category</label><input class="form-input" id="m-ec-${i}" value="${e.cat}"></div>
        <div><label class="form-label">Amount (USD)</label><input class="form-input" id="m-ea-${i}" type="number" value="${e.amt}"></div>
      </div>`).join("")}

    <div class="modal-section">📈 Investments</div>
    ${D.investments.map((inv,i)=>`
      <div class="form-row-3">
        <div><label class="form-label">Name</label><input class="form-input" id="m-in-${i}" value="${inv.name}"></div>
        <div><label class="form-label">Monthly (USD)</label><input class="form-input" id="m-im-${i}" type="number" value="${inv.monthlyUSD}"></div>
        <div><label class="form-label">Current Value</label><input class="form-input" id="m-ic-${i}" type="number" value="${inv.currentUSD}"></div>
      </div>`).join("")}

    <div class="modal-section">📅 Add This Month's Record</div>
    <div class="form-row-2">
      <div><label class="form-label">Month Label (e.g. May 24)</label><input class="form-input" id="m-hist-month" placeholder="May 24"></div>
      <div><label class="form-label">Actual Income (USD)</label><input class="form-input" id="m-hist-income" type="number" placeholder="${D.profile.salaryUSD}"></div>
    </div>
    <div class="form-row-2">
      <div><label class="form-label">Actual Expenses (USD)</label><input class="form-input" id="m-hist-exp" type="number" placeholder=""></div>
      <div><label class="form-label">Amount Invested (USD)</label><input class="form-input" id="m-hist-inv" type="number" placeholder=""></div>
    </div>`;
}

document.getElementById("modal-save")?.addEventListener("click", () => {
  // Profile
  D.profile.salaryUSD = +document.getElementById("m-salary").value || D.profile.salaryUSD;
  D.profile.inrRate   = +document.getElementById("m-inrrate").value || D.profile.inrRate;
  // Loans
  D.loans.forEach((l,i) => {
    l.name   = document.getElementById(`m-ln-${i}`)?.value || l.name;
    l.emiUSD = +document.getElementById(`m-le-${i}`)?.value || l.emiUSD;
    l.months = +document.getElementById(`m-lm-${i}`)?.value || l.months;
  });
  // Expenses
  D.expenses.forEach((e,i) => {
    e.cat = document.getElementById(`m-ec-${i}`)?.value || e.cat;
    e.amt = +document.getElementById(`m-ea-${i}`)?.value || 0;
  });
  // Investments
  D.investments.forEach((inv,i) => {
    inv.name       = document.getElementById(`m-in-${i}`)?.value || inv.name;
    inv.monthlyUSD = +document.getElementById(`m-im-${i}`)?.value || 0;
    inv.currentUSD = +document.getElementById(`m-ic-${i}`)?.value || inv.currentUSD;
  });
  // History entry
  const hMonth = document.getElementById("m-hist-month")?.value;
  const hInc   = +document.getElementById("m-hist-income")?.value;
  const hExp   = +document.getElementById("m-hist-exp")?.value;
  const hInv   = +document.getElementById("m-hist-inv")?.value;
  if(hMonth && hInc){
    const h2  = calcHealth();
    const emi = h2.totalEMI;
    const sav = hInc - hExp - emi - hInv;
    D.history.push({ month:hMonth, income:hInc, expenses:hExp, emi, invested:hInv, savings:sav });
    if(D.history.length > 12) D.history.shift();
  }

  saveData();
  closeModal();
  document.getElementById("last-updated").textContent = "Updated: "+new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  renderOverview();
});

// ── Init ───────────────────────────────────────────
renderOverview();
