import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.argv[2] || 'site');
const failures=[];
const exists=async rel=>{try{await stat(path.join(root,rel));return true}catch{return false}};
const diagnostics=['fourth_visible','fourth_raking','fourth_infrared','fourth_ultraviolet','fourth_xray','fourth_reverse','fourth_marta_1948','fourth_andre_1967','fourth_stratigraphy','fourth_conserved'];
const evidence=['pressure_gauge','coolant_joint','marc_card','frame_scar','third_chair','keyhole','mystery_portrait','night_window','floor_line','mdv_signature','chair_shadows','purple_swatches','archive_links','type_pressure','provenance_drafts','v17_ticket','cleanup_terminal'];
const models=['sumi','claire','marc','leon','marta','andre'];
const cutins=['carry','scan','stop','door','power','signal','sequence','coffee','terminal'];
const required=['index.html','styles.css','game.js','data/game-data.js','service-worker.js','site.webmanifest','.nojekyll'];
for(const n of diagnostics) required.push(`assets/painting-diagnostics/${n}.webp`);
for(const n of evidence) required.push(`assets/evidence-closeups/${n}.webp`);
for(const n of models) required.push(`assets/character-models/${n}_model_sheet.webp`);
for(const n of cutins) required.push(`assets/action-cutin/${n}.webp`);
for(const rel of required) if(!await exists(rel)) failures.push(`missing: ${rel}`);

const html=await readFile(path.join(root,'index.html'),'utf8');
const css=await readFile(path.join(root,'styles.css'),'utf8');
const game=await readFile(path.join(root,'game.js'),'utf8');
const dataSrc=await readFile(path.join(root,'data/game-data.js'),'utf8');
for(const [rel,text] of [['index.html',html],['styles.css',css],['game.js',game],['data/game-data.js',dataSrc]]){
  if(/\b(?:src|href)=["']\//.test(text)) failures.push(`${rel}: root absolute ref`);
  if(/url\(["']?\//.test(text)) failures.push(`${rel}: root absolute CSS url`);
}
for(const id of ['diagnostics-dialog','diagnostic-canvas','diagnostic-mode-list','diagnostic-opacity','diagnostic-zoom','evidence-image-dialog','evidence-image-full']) if(!html.includes(`id="${id}"`)) failures.push(`markup missing: ${id}`);
for(const token of ['DIAGNOSTIC_ATLAS','SPECTRAL_IMAGE_BY_MODE','EVIDENCE_IMAGE_MAP','ACTION_CUTIN_IMAGES','renderDiagnostics','openDiagnostics','openEvidenceImage']) if(!game.includes(token)) failures.push(`runtime missing: ${token}`);
if(!css.includes('Final Candidate 2.15') || !css.includes('.diagnostic-dialog')) failures.push('diagnostic CSS marker missing');
if(!html.includes('VERSION 2.15.0')) failures.push('visible version missing');
if(!html.includes('D：診断画像')) failures.push('diagnostic shortcut help missing');
if(!game.includes("assets/painting-diagnostics/fourth_visible.webp")) failures.push('visible diagnostic source missing in runtime');

const ctx={window:{}}; vm.createContext(ctx); vm.runInContext(dataSrc,ctx,{timeout:5000});
const d=ctx.window.GAME_DATA;
if(d?.meta?.version!=='2.15.0') failures.push(`version expected 2.15.0 got ${d?.meta?.version}`);
if(!d?.meta?.scope?.includes('DIAGNOSTIC ATLAS')) failures.push('scope missing DIAGNOSTIC ATLAS');
if(d?.nodes?.length!==730) failures.push(`nodes expected 730 got ${d?.nodes?.length}`);
if(Object.keys(d?.evidence||{}).length!==173) failures.push(`evidence expected 173 got ${Object.keys(d?.evidence||{}).length}`);
const nodeMap=new Map((d?.nodes||[]).map(n=>[n.id,n]));
for(const id of ['v211_team_commitment','v211_chain_assembly','v211_final_signature']) if(!nodeMap.has(id)) failures.push(`legacy consequence node missing: ${id}`);
for(const go of ['GO01','GO04','GO26']) if(!d?.gameovers?.[go]?.returnTo) failures.push(`mandatory death return missing: ${go}`);
for(const end of ['bad1','bad2','bad3','normal','true']) if(!d?.endings?.[end]) failures.push(`ending definition missing: ${end}`);

if(failures.length){console.error(JSON.stringify({passed:false,failures},null,2));process.exit(1)}
console.log(JSON.stringify({passed:true,version:d.meta.version,nodes:d.nodes.length,evidence:Object.keys(d.evidence).length,diagnostics:diagnostics.length,evidenceCloseups:evidence.length,modelSheets:models.length,actionCutins:cutins.length,requiredFiles:required.length},null,2));
