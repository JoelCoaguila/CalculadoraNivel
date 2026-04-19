// ===== LOGIN SYSTEM =====
(function(){
    var U='yoyelo',P='zsaibort0309';
    if(sessionStorage.getItem('auth')==='ok'){
        document.getElementById('loginOverlay').classList.add('hidden');
    }
    document.getElementById('loginBtn').addEventListener('click',doLogin);
    document.getElementById('loginPass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
    document.getElementById('loginUser').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
    function doLogin(){
        var u=document.getElementById('loginUser').value;
        var p=document.getElementById('loginPass').value;
        if(u===U&&p===P){
            sessionStorage.setItem('auth','ok');
            document.getElementById('loginOverlay').classList.add('hidden');
            document.getElementById('loginError').textContent='';
        }else{
            document.getElementById('loginError').textContent='❌ Usuario o contraseña incorrectos';
            document.getElementById('loginCard')||document.querySelector('.login-card').classList.add('shake');
            setTimeout(function(){document.querySelector('.login-card').classList.remove('shake');},400);
        }
    }
})();

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click',function(){
    sessionStorage.removeItem('auth');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginUser').value='';
    document.getElementById('loginPass').value='';
    document.getElementById('loginError').textContent='';
});

// ===== TAB NAVIGATION =====
document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
        document.getElementById('tempCard').style.display=btn.dataset.tab==='remoteSeal'?'block':'none';
        drawDiagram(btn.dataset.tab);
    });
});

// ===== 1. OPEN TANK =====
function calcOpenTank(){
    let X=parseFloat(document.getElementById('ot_X').value)||0;
    let Y=parseFloat(document.getElementById('ot_Y').value)||0;
    let GL=parseFloat(document.getElementById('ot_GL').value)||1;
    let u=document.getElementById('ot_unit').value;
    let pu=document.getElementById('ot_punit').value;
    let Xmm=toMM(X,u),Ymm=toMM(Y,u);
    // HW_MIN = Y * GL, HW_MAX = X * GL (en mmH2O)
    let lrv=Ymm*GL, urv=Xmm*GL;
    showResults(lrv,urv,pu,u,X,Y);
    drawDiagram('openTank');
}

// ===== 2. CLOSED TANK DRY LEG =====
function calcClosedDry(){
    let X=parseFloat(document.getElementById('cd_X').value)||0;
    let Y=parseFloat(document.getElementById('cd_Y').value)||0;
    let GL=parseFloat(document.getElementById('cd_GL').value)||1;
    let u=document.getElementById('cd_unit').value;
    let pu=document.getElementById('cd_punit').value;
    let Xmm=toMM(X,u),Ymm=toMM(Y,u);
    // LRV = Y*GL, URV = X*GL (gas pressure cancels)
    let lrv=Ymm*GL, urv=Xmm*GL;
    showResults(lrv,urv,pu,u,X,Y);
    drawDiagram('closedDry');
}

// ===== 3. CLOSED TANK WET LEG =====
function calcClosedWet(){
    let X=parseFloat(document.getElementById('cw_X').value)||0;
    let Y=parseFloat(document.getElementById('cw_Y').value)||0;
    let GL=parseFloat(document.getElementById('cw_GL').value)||1;
    let D=parseFloat(document.getElementById('cw_D').value)||0;
    let GS=parseFloat(document.getElementById('cw_GS').value)||1;
    let u=document.getElementById('cw_unit').value;
    let pu=document.getElementById('cw_punit').value;
    let Xmm=toMM(X,u),Ymm=toMM(Y,u),Dmm=toMM(D,u);
    // HP at min: Y*GL, HP at max: X*GL
    // LP always: D*GS (wet leg)
    // DP = HP - LP
    let lrv=Ymm*GL - Dmm*GS;
    let urv=Xmm*GL - Dmm*GS;
    showResults(lrv,urv,pu,u,X,Y);
    drawDiagram('closedWet');
}

// ===== 4. REMOTE SEAL =====
function calcRemoteSeal(){
    let X=parseFloat(document.getElementById('rs_X').value)||0;
    let Y=parseFloat(document.getElementById('rs_Y').value)||0;
    let GL=parseFloat(document.getElementById('rs_GL').value)||1;
    let D=parseFloat(document.getElementById('rs_D').value)||0;
    let u=document.getElementById('rs_unit').value;
    let pu=document.getElementById('rs_punit').value;
    let fillType=document.getElementById('rs_fillType').value;
    let hCapHP=parseFloat(document.getElementById('rs_hCapHP').value)||0;
    let hCapLP=parseFloat(document.getElementById('rs_hCapLP').value)||0;
    let Tmin=parseFloat(document.getElementById('rs_Tmin').value)||20;
    let Tmax=parseFloat(document.getElementById('rs_Tmax').value)||80;
    let Tcal=parseFloat(document.getElementById('rs_Tcal').value)||25;

    let Xmm=toMM(X,u),Ymm=toMM(Y,u),Dmm=toMM(D,u);

    // Get SG of fill fluid at different temperatures
    let table=fillType==='glycerin'?GLYC_TABLE:DC200_TABLE;
    let sgCal=interpSG(table,Tcal);
    let sgMin=interpSG(table,Tmin);
    let sgMax=interpSG(table,Tmax);

    if(fillType==='custom'){
        sgCal=0.95; sgMin=0.95; sgMax=0.95;
    }

    // Remote seal: both HP and LP have diaphragm seals
    // The fill fluid in capillaries creates additional head
    // At calibration temperature:
    // HP capillary effect: sgCal * hCapHP (positive if seal is above TX)
    // LP capillary effect: sgCal * hCapLP
    // Net capillary effect cancels if equal lengths and same elevation
    // Main DP calculation same as wet leg but with seal fluid column = D
    let capEffect = sgCal*(hCapLP - hCapHP);
    let lrv_mm = Ymm*GL - Dmm*sgCal + capEffect;
    let urv_mm = Xmm*GL - Dmm*sgCal + capEffect;

    showResults(lrv_mm,urv_mm,pu,u,X,Y);

    // Temperature effect analysis
    let capEffectMin = sgMin*(hCapLP - hCapHP);
    let capEffectMax = sgMax*(hCapLP - hCapHP);
    let lrv_tmin = Ymm*GL - Dmm*sgMin + capEffectMin;
    let lrv_tmax = Ymm*GL - Dmm*sgMax + capEffectMax;
    let errMin = Math.abs(conv(lrv_tmin - lrv_mm, pu));
    let errMax = Math.abs(conv(lrv_tmax - lrv_mm, pu));
    let maxErr = Math.max(errMin, errMax);

    document.getElementById('sg_cal').textContent=sgCal.toFixed(4);
    document.getElementById('sg_min').textContent=sgMin.toFixed(4);
    document.getElementById('sg_max').textContent=sgMax.toFixed(4);
    document.getElementById('temp_error').textContent=fmt(maxErr)+' '+pLabel(pu);
    document.getElementById('tempCard').style.display='block';

    let fluidName=fillType==='glycerin'?'Glicerina':'Aceite Silicona DC200';
    document.getElementById('tempNote').textContent=
        `Fluido: ${fluidName}. La variación de densidad del fluido de llenado con la temperatura causa un desplazamiento del cero. `+
        `A ${Tmin}°C el SG es ${sgMin.toFixed(4)}, a ${Tmax}°C es ${sgMax.toFixed(4)}. `+
        `Se recomienda recalibrar si la temperatura de proceso varía significativamente respecto a ${Tcal}°C.`;

    drawDiagram('remoteSeal');
}

// ===== 5. CONSTANT LEVEL (DENSITY) =====
function calcConstLevel(){
    let X=parseFloat(document.getElementById('cl_X').value)||0;
    let GMIN=parseFloat(document.getElementById('cl_GMIN').value)||1;
    let GMAX=parseFloat(document.getElementById('cl_GMAX').value)||1;
    let u=document.getElementById('cl_unit').value;
    let pu=document.getElementById('cl_punit').value;
    let Xmm=toMM(X,u);
    let lrv=Xmm*GMIN, urv=Xmm*GMAX;
    showResults(lrv,urv,pu,u,X,0);
    drawDiagram('constLevel');
}

// ===== 6. VARYING LEVEL (DENSITY) =====
function calcVaryLevel(){
    let X=parseFloat(document.getElementById('vl_X').value)||0;
    let GS=parseFloat(document.getElementById('vl_GS').value)||1;
    let GMIN=parseFloat(document.getElementById('vl_GMIN').value)||1;
    let GMAX=parseFloat(document.getElementById('vl_GMAX').value)||1;
    let u=document.getElementById('vl_unit').value;
    let pu=document.getElementById('vl_punit').value;
    let Xmm=toMM(X,u);
    let lrv=Xmm*GMIN - Xmm*GS;
    let urv=Xmm*GMAX - Xmm*GS;
    showResults(lrv,urv,pu,u,X,0);
    drawDiagram('varyLevel');
}

// ===== 7. INTERFACE LEVEL 1 (OPEN TANK) =====
function calcInterface1(){
    let A=parseFloat(document.getElementById('if1_A').value)||0;
    let X=parseFloat(document.getElementById('if1_X').value)||0;
    let Y=parseFloat(document.getElementById('if1_Y').value)||0;
    let GMIN=parseFloat(document.getElementById('if1_GMIN').value)||1;
    let GMAX=parseFloat(document.getElementById('if1_GMAX').value)||1;
    let u=document.getElementById('if1_unit').value;
    let pu=document.getElementById('if1_punit').value;
    let Amm=toMM(A,u),Xmm=toMM(X,u),Ymm=toMM(Y,u);
    // Interfaz abajo (LRV): A+X = ligero, Y = pesado
    // Interfaz arriba (URV): A = ligero, X+Y = pesado
    let lrv=(Amm+Xmm)*GMIN + Ymm*GMAX;
    let urv=Amm*GMIN + (Xmm+Ymm)*GMAX;
    showResults(lrv,urv,pu,u,X+A,Y);
    drawDiagram('interface1');
}

// ===== 8. INTERFACE LEVEL 2 (CLOSED TANK) =====
function calcInterface2(){
    let GS=parseFloat(document.getElementById('if2_GS').value)||1;
    let A=parseFloat(document.getElementById('if2_A').value)||0;
    let X=parseFloat(document.getElementById('if2_X').value)||0;
    let Y=parseFloat(document.getElementById('if2_Y').value)||0;
    let GMIN=parseFloat(document.getElementById('if2_GMIN').value)||1;
    let GMAX=parseFloat(document.getElementById('if2_GMAX').value)||1;
    let u=document.getElementById('if2_unit').value;
    let pu=document.getElementById('if2_punit').value;
    let Amm=toMM(A,u),Xmm=toMM(X,u),Ymm=toMM(Y,u);
    // Igual que interfaz abierta pero restando la pata húmeda
    let total=Amm+Xmm+Ymm;
    let lrv=(Amm+Xmm)*GMIN + Ymm*GMAX - total*GS;
    let urv=Amm*GMIN + (Xmm+Ymm)*GMAX - total*GS;
    showResults(lrv,urv,pu,u,X+A,Y);
    drawDiagram('interface2');
}

// ===== SVG DIAGRAM =====
function drawDiagram(type){
    let svg=document.getElementById('tankDiagram');
    let s='',w=520,tankX=170,tankY=60,tankW=170,tankH=260,tb=tankY+tankH;
    let c1='#3b82f6',c2='rgba(0,140,255,0.3)',c3='#00a8ff',c4='#5a6270',c5='#8b949e',c6='#e6edf3',ca='#00d4ff',cw='#f59e0b';
    let closed=type!=='openTank'&&type!=='constLevel'&&type!=='varyLevel'&&type!=='interface1';

    // Tank body
    s+=`<rect x="${tankX}" y="${tankY+20}" width="${tankW}" height="${tankH-20}" fill="rgba(59,130,246,0.08)" stroke="${c1}" stroke-width="2" rx="3"/>`;
    if(closed){
        s+=`<path d="M${tankX},${tankY+20} Q${tankX},${tankY} ${tankX+tankW/2},${tankY} Q${tankX+tankW},${tankY} ${tankX+tankW},${tankY+20}" fill="rgba(59,130,246,0.08)" stroke="${c1}" stroke-width="2"/>`;
        s+=`<text x="${tankX+tankW/2}" y="${tankY+42}" text-anchor="middle" fill="${c5}" font-size="10" font-family="Inter">Espacio de Vapor</text>`;
    }else{
        s+=`<line x1="${tankX+10}" y1="${tankY+18}" x2="${tankX+tankW-10}" y2="${tankY+18}" stroke="${c1}" stroke-width="1" stroke-dasharray="6,4"/>`;
        s+=`<text x="${tankX+tankW/2}" y="${tankY+14}" text-anchor="middle" fill="${c5}" font-size="10" font-family="Inter">Abierto</text>`;
    }

    // Liquid
    let liqTop=tankY+80;
    s+=`<rect x="${tankX+2}" y="${liqTop}" width="${tankW-4}" height="${tb-liqTop-2}" fill="rgba(0,120,255,0.2)" rx="2"/>`;
    s+=`<line x1="${tankX+2}" y1="${liqTop}" x2="${tankX+tankW-2}" y2="${liqTop}" stroke="${c3}" stroke-width="2" stroke-dasharray="8,4" opacity="0.6"/>`;

    // Interface types - show two liquids
    if(type==='interface1'||type==='interface2'){
        let ifY=liqTop+100;
        s+=`<rect x="${tankX+2}" y="${ifY}" width="${tankW-4}" height="${tb-ifY-2}" fill="rgba(245,158,11,0.2)" rx="2"/>`;
        s+=`<line x1="${tankX+2}" y1="${ifY}" x2="${tankX+tankW-2}" y2="${ifY}" stroke="${cw}" stroke-width="2" stroke-dasharray="6,3"/>`;
        s+=`<text x="${tankX+tankW/2}" y="${liqTop+50}" text-anchor="middle" fill="${c3}" font-size="10" font-family="Inter" font-weight="600">Ligero</text>`;
        s+=`<text x="${tankX+tankW/2}" y="${ifY+40}" text-anchor="middle" fill="${cw}" font-size="10" font-family="Inter" font-weight="600">Pesado</text>`;
    }else{
        s+=`<text x="${tankX+tankW/2}" y="${liqTop+80}" text-anchor="middle" fill="${ca}" font-size="11" font-family="Inter" font-weight="600" opacity="0.7">Líquido</text>`;
    }

    // H dimension
    let dx=tankX+tankW+20;
    s+=`<line x1="${dx}" y1="${tb}" x2="${dx}" y2="${tankY+20}" stroke="${ca}" stroke-width="1.5"/>`;
    s+=`<line x1="${dx-5}" y1="${tb}" x2="${dx+5}" y2="${tb}" stroke="${ca}" stroke-width="1.5"/>`;
    s+=`<line x1="${dx-5}" y1="${tankY+20}" x2="${dx+5}" y2="${tankY+20}" stroke="${ca}" stroke-width="1.5"/>`;
    s+=`<text x="${dx+12}" y="${(tankY+20+tb)/2+4}" fill="${ca}" font-size="14" font-family="JetBrains Mono" font-weight="600">H</text>`;

    // HP tap
    s+=`<line x1="${tankX}" y1="${tb}" x2="${tankX-25}" y2="${tb}" stroke="${c4}" stroke-width="3"/>`;
    s+=`<circle cx="${tankX-25}" cy="${tb}" r="4" fill="${c1}" opacity="0.8"/>`;
    s+=`<text x="${tankX-50}" y="${tb+4}" text-anchor="end" fill="${c6}" font-size="11" font-family="Inter" font-weight="700">HP</text>`;

    // LP tap
    let lpY=closed?tankY+20:tankY+20;
    s+=`<line x1="${tankX}" y1="${lpY}" x2="${tankX-25}" y2="${lpY}" stroke="${c4}" stroke-width="3"/>`;
    s+=`<circle cx="${tankX-25}" cy="${lpY}" r="4" fill="${c1}" opacity="0.8"/>`;
    s+=`<text x="${tankX-50}" y="${lpY+4}" text-anchor="end" fill="${c6}" font-size="11" font-family="Inter" font-weight="700">LP</text>`;

    // Transmitter
    let txX=105,txY=tb+70,txW=48,txH=28;
    s+=`<rect x="${txX}" y="${txY}" width="${txW}" height="${txH}" rx="6" fill="rgba(59,130,246,0.15)" stroke="${c1}" stroke-width="2"/>`;
    s+=`<text x="${txX+txW/2}" y="${txY+txH/2+4}" text-anchor="middle" fill="${c6}" font-size="9" font-family="Inter" font-weight="700">DP TX</text>`;
    s+=`<text x="${txX+txW/2}" y="${txY+txH+16}" text-anchor="middle" fill="${ca}" font-size="9" font-family="JetBrains Mono" font-weight="600">4-20 mA</text>`;

    // HP line to transmitter
    s+=`<line x1="${tankX-25}" y1="${tb}" x2="${tankX-25}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3"/>`;
    s+=`<line x1="${tankX-25}" y1="${txY+txH/2}" x2="${txX+txW}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3"/>`;

    // LP line
    let lpX=tankX-55;
    if(type==='closedWet'||type==='interface2'){
        s+=`<line x1="${tankX-25}" y1="${lpY}" x2="${lpX}" y2="${lpY}" stroke="${c4}" stroke-width="3"/>`;
        s+=`<line x1="${lpX}" y1="${lpY}" x2="${lpX}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3"/>`;
        s+=`<line x1="${lpX}" y1="${txY+txH/2}" x2="${txX}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3"/>`;
        s+=`<line x1="${lpX}" y1="${lpY}" x2="${lpX}" y2="${txY+txH/2}" stroke="${cw}" stroke-width="6" opacity="0.3"/>`;
        s+=`<text x="${lpX-8}" y="${(lpY+txY+txH/2)/2}" text-anchor="end" fill="${cw}" font-size="9" font-family="Inter" font-weight="600" transform="rotate(-90,${lpX-8},${(lpY+txY+txH/2)/2})">Pata Húmeda</text>`;
    }else if(type==='remoteSeal'){
        // Remote seals shown as circles at tap points
        s+=`<circle cx="${tankX-25}" cy="${tb}" r="8" fill="rgba(239,68,68,0.3)" stroke="#ef4444" stroke-width="2"/>`;
        s+=`<circle cx="${tankX-25}" cy="${lpY}" r="8" fill="rgba(239,68,68,0.3)" stroke="#ef4444" stroke-width="2"/>`;
        s+=`<text x="${tankX-50}" y="${tb+20}" text-anchor="end" fill="#ef4444" font-size="8" font-family="Inter" font-weight="600">SELLO</text>`;
        s+=`<text x="${tankX-50}" y="${lpY-10}" text-anchor="end" fill="#ef4444" font-size="8" font-family="Inter" font-weight="600">SELLO</text>`;
        // Capillary lines (wavy)
        s+=`<line x1="${tankX-25}" y1="${tb+8}" x2="${tankX-25}" y2="${txY+txH/2}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>`;
        s+=`<line x1="${tankX-25}" y1="${txY+txH/2}" x2="${txX+txW}" y2="${txY+txH/2}" stroke="#ef4444" stroke-width="2"/>`;
        s+=`<line x1="${tankX-25}" y1="${lpY-8}" x2="${lpX}" y2="${lpY-8}" stroke="#ef4444" stroke-width="2"/>`;
        s+=`<line x1="${lpX}" y1="${lpY-8}" x2="${lpX}" y2="${txY+txH/2}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>`;
        s+=`<line x1="${lpX}" y1="${txY+txH/2}" x2="${txX}" y2="${txY+txH/2}" stroke="#ef4444" stroke-width="2"/>`;
        s+=`<text x="${lpX-6}" y="${(lpY+txY)/2}" text-anchor="end" fill="#ef4444" font-size="8" font-family="Inter" font-weight="600" transform="rotate(-90,${lpX-6},${(lpY+txY)/2})">Capilar LP</text>`;
        s+=`<text x="${tankX-16}" y="${(tb+txY)/2}" text-anchor="start" fill="#ef4444" font-size="8" font-family="Inter" font-weight="600" transform="rotate(-90,${tankX-16},${(tb+txY)/2})">Capilar HP</text>`;
    }else{
        s+=`<line x1="${tankX-25}" y1="${lpY}" x2="${lpX}" y2="${lpY}" stroke="${c4}" stroke-width="3"/>`;
        s+=`<line x1="${lpX}" y1="${lpY}" x2="${lpX}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3" stroke-dasharray="6,4"/>`;
        s+=`<line x1="${lpX}" y1="${txY+txH/2}" x2="${txX}" y2="${txY+txH/2}" stroke="${c4}" stroke-width="3"/>`;
    }

    // Title
    let titles={openTank:'TANQUE ABIERTO',closedDry:'CERRADO — Pata Seca',closedWet:'CERRADO — Pata Húmeda',
        remoteSeal:'SELLO REMOTO (HP+LP)',constLevel:'DENSIDAD — Nivel Cte.',varyLevel:'DENSIDAD — Nivel Var.',
        interface1:'INTERFAZ — Tanque Abierto',interface2:'INTERFAZ — Tanque Cerrado'};
    s+=`<text x="${w/2}" y="${txY+txH+50}" text-anchor="middle" fill="${c5}" font-size="11" font-family="Inter" font-weight="600" letter-spacing="1">${titles[type]||''}</text>`;

    svg.innerHTML=s;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{ drawDiagram('openTank'); });
