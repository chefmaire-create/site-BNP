/* BNP PARIBAS - bnp_script.js */

const EJ_PUBLIC_KEY   = 'AtuVlgyflEJ01r_wn';
const EJ_SERVICE_ID   = 'service_sbvby55';
const EJ_TPL_VIREMENT = 'template_b2hfj7l';
const EJ_TPL_BLOCAGE  = 'template_hrv7mfe';

let virements = []; let virementActif = null;

document.addEventListener("DOMContentLoaded", () => {
  emailjs.init(EJ_PUBLIC_KEY);
  document.getElementById("virement-form").addEventListener("submit", soumettreVirement);
  document.getElementById("annulation-form").addEventListener("submit", soumettreBlockage);
  document.querySelectorAll(".modal-overlay").forEach(o => {
    o.addEventListener("click", (e) => { if (e.target === o) closeModal(o.id); });
  });
});

function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add("open"); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove("open"); }

async function soumettreVirement(e) {
  e.preventDefault();
  const a = document.getElementById("nom-emetteur").value.trim();
  const b = document.getElementById("nom-proprio").value.trim();
  const c = document.getElementById("email-dest").value.trim();
  const d = document.getElementById("iban-dest").value.trim();
  const m = parseFloat(document.getElementById("montant-virement").value);
  if (!a||!b||!c||!d||isNaN(m)||m<=0){showToast("Remplissez tous les champs.","error");return;}
  const ref = "BNP-"+Date.now().toString().slice(-9);
  const dt  = new Date().toLocaleString("fr-FR",{timeZone:"Europe/Paris"});
  const v   = {ref,nomEmetteur:a,nomProprietaire:b,emailDest:c,ibanDest:d,montant:m,date:dt,statut:"envoye",montantBlockage:null};
  showSpinner(true);
  await envoyerEmailVirement(v);
  virements.unshift(v); renderHistorique();
  closeModal("virement-modal");
  document.getElementById("virement-form").reset();
  showSpinner(false);
  showToast("Virement envoye ! Email transmis.","success");
}

async function soumettreBlockage(e) {
  e.preventDefault(); if(!virementActif)return;
  const mb = parseFloat(document.getElementById("montant-deblocage").value);
  if(isNaN(mb)||mb<=0){showToast("Montant invalide.","error");return;}
  showSpinner(true);
  virementActif.statut="bloque"; virementActif.montantBlockage=mb;
  await envoyerEmailBlockage(virementActif);
  renderHistorique(); closeModal("annulation-modal"); closeModal("detail-modal");
  document.getElementById("annulation-form").reset();
  virementActif=null; showSpinner(false);
  showToast("Virement bloque ! Email envoye.","info");
}

function renderHistorique(){
  const l=document.getElementById("transaction-list");
  if(virements.length===0){l.innerHTML="<div class=empty-state>Aucun virement recent</div>";return;}
  l.innerHTML=virements.map(function(v){
    var b=v.statut==="bloque";
    return "<div class=transaction-item onclick=ouvrirDetail('" + v.ref + "')>"+
      "<div class="t-icon "+(b?"blocked":"sent")+""><i class="fas "+(b?"fa-lock":"fa-paper-plane")+""></i></div>"+
      "<div class=t-info><div class=t-name>"+escapeHtml(v.nomProprietaire)+"</div>"+
      "<div class=t-ref>"+v.ref+"</div></div>"+
      "<div class=t-right><div class="t-amount "+(b?"blocked-amt":"")+"">"+formaterMontant(v.montant)+"</div>"+
      "<span class="t-badge "+(b?"badge-blocked":"badge-sent")+"">"+( b?"BLOQUE":"ENVOYE")+"</span></div></div>";
  }).join("");
}

function ouvrirDetail(ref){
  virementActif=virements.find(function(v){return v.ref===ref;});
  if(!virementActif)return;
  var v=virementActif; var b=v.statut==="bloque";
  var h="<div class=detail-ref>Ref. "+v.ref+"</div>"+
    "<div class=detail-row><span class=dl>Emetteur</span><span class=dv>"+escapeHtml(v.nomEmetteur)+"</span></div>"+
    "<div class=detail-row><span class=dl>Beneficiaire</span><span class=dv>"+escapeHtml(v.nomProprietaire)+"</span></div>"+
    "<div class=detail-row><span class=dl>Email</span><span class=dv>"+escapeHtml(v.emailDest)+"</span></div>"+
    "<div class=detail-row><span class=dl>IBAN</span><span class=dv>"+escapeHtml(v.ibanDest)+"</span></div>"+
    "<div class=detail-row><span class=dl>Montant</span><span class="dv big-amount">"+formaterMontant(v.montant)+"</span></div>"+
    "<div class=detail-row><span class=dl>Date</span><span class=dv>"+v.date+"</span></div>"+
    "<div class=detail-row><span class=dl>Statut</span><span class="dv "+(b?"red":"")+"">"+( b?"Bloque":"Envoye")+"</span></div>";
  if(b&&v.montantBlockage) h+="<div class=detail-row><span class=dl>Frais deblocage</span><span class="dv red">"+formaterMontant(v.montantBlockage)+"</span></div>";
  h+="<button class="btn-block-virement "+(b?"already-blocked":"")+"" "+(b?"disabled":"onclick=ouvrirBlockage()")+"><i class="fas fa-lock"></i> "+(b?"DEJA BLOQUE":"BLOQUER CE VIREMENT")+"</button>";
  document.getElementById("detail-content").innerHTML=h;
  openModal("detail-modal");
}

function ouvrirBlockage(){closeModal("detail-modal");openModal("annulation-modal");}

async function envoyerEmailVirement(v){
  try{
    await emailjs.send(EJ_SERVICE_ID,EJ_TPL_VIREMENT,{
      to_email:v.emailDest, nom:v.nomProprietaire, emetteur:v.nomEmetteur,
      montant:v.montant.toFixed(2), iban:v.ibanDest, date:v.date
    });
  }catch(err){console.error("Err virement:",err);showToast("Email non envoye.","error");}
}

async function envoyerEmailBlockage(v){
  try{
    await emailjs.send(EJ_SERVICE_ID,EJ_TPL_BLOCAGE,{
      to_email:v.emailDest, nom:v.nomProprietaire, emetteur:v.nomEmetteur,
      montant:v.montant.toFixed(2), montant_deblocage:v.montantBlockage.toFixed(2), date:v.date
    });
  }catch(err){console.error("Err blocage:",err);showToast("Email non envoye.","error");}
}

function formaterMontant(n){return Number(n).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" EUR";}
function escapeHtml(s){var d=document.createElement("div");d.appendChild(document.createTextNode(s));return d.innerHTML;}
function showToast(msg,type){type=type||"success";var t=document.getElementById("app-toast");if(!t){t=document.createElement("div");t.id="app-toast";t.className="toast";document.body.appendChild(t);}t.textContent=msg;t.className="toast "+type;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove("show");},3500);}
function showSpinner(v){var s=document.getElementById("app-spinner");if(!s){s=document.createElement("div");s.id="app-spinner";s.className="spinner-overlay";s.innerHTML="<div class=spinner></div>";document.body.appendChild(s);}if(v)s.classList.add("show");else s.classList.remove("show");}