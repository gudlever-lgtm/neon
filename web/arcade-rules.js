/* Shared deterministic Arcade 2.0 rules: no network access or mutable state. */
(function(root,factory){
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  if(root)root.NeonArcade=rules;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const CHALLENGES=Object.freeze({
    standard:Object.freeze({name:'Standard',duration:0,pickupEvery:8}),
    rush:Object.freeze({name:'Rush 90',duration:90,pickupEvery:7}),
    chaos:Object.freeze({name:'Chaos',duration:0,pickupEvery:4})
  });
  const PICKUPS=Object.freeze(['wide','slow','shield','multiball']);
  function config(id){return CHALLENGES[id]||CHALLENGES.standard}
  function pickupAt(random){const n=Math.min(.999999,Math.max(0,Number.isFinite(random)?random:0));return PICKUPS[Math.floor(n*PICKUPS.length)]}
  function timeLeft(duration,elapsed){return Math.max(0,Math.ceil(duration-elapsed))}
  function result(player,opponent){if(player>opponent)return 'win';if(player<opponent)return 'loss';return 'draw'}
  return Object.freeze({CHALLENGES,PICKUPS,config,pickupAt,timeLeft,result});
});
