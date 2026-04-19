// Unit conversions
const H2MM={mm:1,cm:10,m:1000,in:25.4,ft:304.8};
const MMH2O_TO={mmH2O:1,cmH2O:0.1,mH2O:0.001,inH2O:1/25.4,kPa:0.00980665,psi:0.00142233,mbar:0.0980665,bar:0.0000980665,Pa:9.80665};
const PLBL={mmH2O:'mmH₂O',cmH2O:'cmH₂O',mH2O:'mH₂O',inH2O:'inH₂O',kPa:'kPa',psi:'psi',mbar:'mbar',bar:'bar',Pa:'Pa'};

function fmt(n){if(Math.abs(n)<0.0001)return'0.00';if(Math.abs(n)>=100)return n.toFixed(2);return n.toFixed(4);}
function toMM(v,u){return v*(H2MM[u]||1);}
function conv(mmh2o,pu){return mmh2o*(MMH2O_TO[pu]||1);}
function pLabel(pu){return PLBL[pu]||pu;}

// DC200 Silicone Oil SG vs Temperature (interpolation table)
const DC200_TABLE=[[-40,0.98],[0,0.965],[20,0.953],[25,0.95],[40,0.94],[60,0.926],[80,0.913],[100,0.899],[120,0.885],[150,0.864],[200,0.83]];
// Glycerin SG vs Temperature
const GLYC_TABLE=[[-20,1.274],[0,1.263],[20,1.261],[25,1.26],[40,1.255],[60,1.245],[80,1.235],[100,1.22],[120,1.205],[150,1.18]];

function interpSG(table,T){
    if(T<=table[0][0])return table[0][1];
    if(T>=table[table.length-1][0])return table[table.length-1][1];
    for(let i=0;i<table.length-1;i++){
        if(T>=table[i][0]&&T<=table[i+1][0]){
            let f=(T-table[i][0])/(table[i+1][0]-table[i][0]);
            return table[i][1]+f*(table[i+1][1]-table[i][1]);
        }
    }
    return table[0][1];
}

function showResults(lrv_mm,urv_mm,pu,hUnit,X,Y){
    let lrv=conv(lrv_mm,pu),urv=conv(urv_mm,pu),span=urv-lrv;
    let ul=pLabel(pu);
    document.getElementById('lrvValue').textContent=fmt(lrv);
    document.getElementById('urvValue').textContent=fmt(urv);
    document.getElementById('spanValue').textContent=fmt(span);
    document.getElementById('lrvUnit').textContent=ul;
    document.getElementById('urvUnit').textContent=ul;
    document.getElementById('spanUnit').textContent=ul;
    if(Math.abs(lrv)<0.001){
        document.getElementById('zeroValue').textContent='Sin ajuste';
        document.getElementById('zeroDesc').textContent='Cero directo';
    }else if(lrv<0){
        document.getElementById('zeroValue').textContent=fmt(Math.abs(lrv))+' '+ul;
        document.getElementById('zeroDesc').textContent='Supresión de cero';
    }else{
        document.getElementById('zeroValue').textContent=fmt(lrv)+' '+ul;
        document.getElementById('zeroDesc').textContent='Elevación de cero';
    }
    // Calibration table
    let pcts=[0,10,25,50,75,90,100],html='';
    let hSpan=X-Y;
    pcts.forEach(p=>{
        let dp=lrv+(urv-lrv)*(p/100);
        let h=Y+hSpan*(p/100);
        let mA=4+16*(p/100);
        let hl=p===0||p===100?'row-highlight':'';
        html+=`<tr class="${hl}"><td>${p}%</td><td>${fmt(h)} ${hUnit}</td><td>${fmt(dp)} ${ul}</td><td>${mA.toFixed(2)} mA</td></tr>`;
    });
    document.getElementById('calTableBody').innerHTML=html;
    document.getElementById('resultsSection').classList.add('animate-in');
}
