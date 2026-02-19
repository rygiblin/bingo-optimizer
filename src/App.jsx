import React, { useState, useMemo, useCallback, useEffect } from "react";

// Feb 19 3PM EST = 20:00 UTC | Mar 1 12PM EST = 17:00 UTC
const EVENT_START = new Date('2026-02-19T20:00:00Z');
const EVENT_END   = new Date('2026-03-01T17:00:00Z');
const EVENT_HOURS_WALL = (EVENT_END - EVENT_START) / 36e5; // ~237h total wall clock
// Full days inside the window (Sat Feb 20 – Sat Feb 28 = 9 full days)
// Partial: ~9h on Feb 19 (3PM–midnight), ~12h on Mar 1 (midnight–12PM)
// Effective multiplier days per committed hr/day: 9 + min(9,h)/h + min(12,h)/h
function playerEventDays(dailyHours) {
  const partial = Math.min(9, dailyHours) / dailyHours + Math.min(12, dailyHours) / dailyHours;
  return 9 + partial; // ~10–11 depending on commitment level
}
function playerEventHours(dailyHours, scenario='expected') {
  const mult = scenario==='floor'?1.0:scenario==='ceiling'?2.0:1.5;
  return dailyHours * mult * playerEventDays(dailyHours);
}
// For display: nominal event length in days
const EVENT_DAYS = EVENT_HOURS_WALL / 24;

const TEAMS = {
  "SoccerTheNub": [
    {name:"SoccerTheNub",secs:1717,totalLvl:1988,combat:125,slayer:86,cox:59,tob:1386,toa:23,inferno:1,colo:125,hours:6,confidence:1.05},
    {name:"Barsk",secs:2030,totalLvl:2300,combat:126,slayer:99,cox:288,tob:713,toa:240,inferno:1,colo:1,hours:6,confidence:1.07},
    {name:"SuperShane",secs:2327,totalLvl:2376,combat:126,slayer:99,cox:1621,tob:2893,toa:701,inferno:1,colo:62,hours:6,confidence:1.07},
    {name:"kimsha",secs:2208,totalLvl:2372,combat:126,slayer:99,cox:250,tob:58,toa:198,inferno:1,colo:1,hours:10,confidence:1.07},
    {name:"Ronce",secs:1817,totalLvl:2279,combat:126,slayer:99,cox:851,tob:1269,toa:480,inferno:1,colo:1,hours:6,confidence:0.9125},
    {name:"markc998",secs:1393,totalLvl:2183,combat:124,slayer:99,cox:321,tob:259,toa:201,inferno:0,colo:1,hours:4,confidence:1.05},
    {name:"GIMPbrad",secs:1181,totalLvl:2271,combat:125,slayer:98,cox:474,tob:623,toa:163,inferno:1,colo:8,hours:4,confidence:0.8},
    {name:"Uhh",secs:1082,totalLvl:2376,combat:126,slayer:99,cox:1145,tob:68,toa:6,inferno:1,colo:2,hours:4,confidence:0.8},
    {name:"Egbert Byrde",secs:1155,totalLvl:2215,combat:124,slayer:99,cox:162,tob:2,toa:12,inferno:0,colo:0,hours:4,confidence:0.9725},
    {name:"Berdulad",secs:1385,totalLvl:2313,combat:125,slayer:99,cox:279,tob:0,toa:40,inferno:0,colo:0,hours:6,confidence:0.875},
    {name:"Cuttywoodson",secs:904,totalLvl:2131,combat:120,slayer:92,cox:34,tob:0,toa:3,inferno:0,colo:0,hours:4,confidence:0.9125},
    {name:"NekoIM",secs:1480,totalLvl:2226,combat:124,slayer:99,cox:446,tob:112,toa:52,inferno:0,colo:0,hours:6,confidence:0.9125},
    {name:"smokeykoala",secs:1160,totalLvl:2260,combat:125,slayer:99,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:6,confidence:0.8},
    {name:"Chinfat",secs:780,totalLvl:2376,combat:126,slayer:99,cox:186,tob:20,toa:522,inferno:1,colo:1,hours:2,confidence:0.9125},
    {name:"rrighty",secs:970,totalLvl:2203,combat:122,slayer:96,cox:4,tob:0,toa:36,inferno:0,colo:0,hours:4,confidence:0.9125},
    {name:"kayeonn",secs:630,totalLvl:2376,combat:126,slayer:99,cox:332,tob:35,toa:5,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"jdoog45",secs:422,totalLvl:1938,combat:123,slayer:79,cox:117,tob:102,toa:169,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"TheChowMein",secs:641,totalLvl:2201,combat:124,slayer:95,cox:90,tob:61,toa:195,inferno:0,colo:0,hours:2,confidence:1.05},
    {name:"Kview njjkrl",secs:589,totalLvl:2296,combat:125,slayer:99,cox:358,tob:28,toa:112,inferno:0,colo:0,hours:2,confidence:0.8},
    {name:"bunbunciel",secs:150,totalLvl:1766,combat:104,slayer:65,cox:6,tob:0,toa:0,inferno:0,colo:0,hours:1,confidence:1.07},
    {name:"ruler lol",secs:1002,totalLvl:1881,combat:119,slayer:93,cox:12,tob:0,toa:4,inferno:0,colo:0,hours:4,confidence:1.05},
    {name:"Bluebossa3jp",secs:240,totalLvl:1809,combat:118,slayer:75,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.8},
    {name:"Alloras",secs:237,totalLvl:1939,combat:110,slayer:87,cox:2,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.8},
  ],
  "Indy 500": [
    {name:"Indy 500",secs:1559,totalLvl:1922,combat:124,slayer:98,cox:247,tob:182,toa:693,inferno:7,colo:2,hours:4,confidence:1.07},
    {name:"TM 72 BTW",secs:1343,totalLvl:2303,combat:125,slayer:99,cox:695,tob:253,toa:123,inferno:4,colo:1,hours:4,confidence:0.9125},
    {name:"TermiinusEst",secs:2028,totalLvl:2266,combat:126,slayer:99,cox:260,tob:472,toa:1321,inferno:3,colo:1,hours:6,confidence:1.05},
    {name:"GSilent",secs:2045,totalLvl:2376,combat:126,slayer:99,cox:334,tob:408,toa:316,inferno:1,colo:28,hours:6,confidence:1.07},
    {name:"CAPTAssBlast",secs:1740,totalLvl:2267,combat:126,slayer:99,cox:70,tob:47,toa:234,inferno:1,colo:0,hours:6,confidence:1.07},
    {name:"Shane Falco",secs:1524,totalLvl:2185,combat:126,slayer:99,cox:518,tob:1923,toa:373,inferno:2,colo:28,hours:4,confidence:0.9125},
    {name:"CrazyMuppets",secs:1447,totalLvl:2376,combat:126,slayer:99,cox:367,tob:23,toa:33,inferno:1,colo:1,hours:4,confidence:1.07},
    {name:"BlackSnub",secs:1338,totalLvl:2176,combat:124,slayer:99,cox:94,tob:72,toa:67,inferno:1,colo:1,hours:6,confidence:0.875},
    {name:"FeGreyFace",secs:1192,totalLvl:2371,combat:126,slayer:99,cox:174,tob:91,toa:66,inferno:1,colo:25,hours:4,confidence:0.9125},
    {name:"Cache M0ney",secs:1146,totalLvl:2101,combat:124,slayer:95,cox:160,tob:261,toa:79,inferno:0,colo:0,hours:4,confidence:0.9725},
    {name:"Aaria",secs:1339,totalLvl:2222,combat:126,slayer:99,cox:338,tob:38,toa:97,inferno:0,colo:0,hours:4,confidence:1.05},
    {name:"Zeilex",secs:986,totalLvl:2344,combat:126,slayer:99,cox:722,tob:1085,toa:121,inferno:14,colo:5,hours:2,confidence:0.9125},
    {name:"Major micro",secs:847,totalLvl:2102,combat:125,slayer:99,cox:238,tob:167,toa:164,inferno:1,colo:6,hours:2,confidence:1.07},
    {name:"Marijuanitta",secs:832,totalLvl:2251,combat:122,slayer:96,cox:1,tob:0,toa:0,inferno:0,colo:0,hours:4,confidence:0.8},
    {name:"Yung chap",secs:749,totalLvl:2236,combat:124,slayer:99,cox:157,tob:24,toa:256,inferno:0,colo:0,hours:2,confidence:1.05},
    {name:"ledzeps",secs:598,totalLvl:1910,combat:123,slayer:93,cox:55,tob:176,toa:99,inferno:1,colo:1,hours:2,confidence:1.05},
    {name:"Sum Rng",secs:868,totalLvl:2158,combat:125,slayer:99,cox:841,tob:495,toa:230,inferno:3,colo:3,hours:2,confidence:0.9125},
    {name:"Karlsefni",secs:725,totalLvl:2055,combat:124,slayer:99,cox:289,tob:150,toa:71,inferno:0,colo:0,hours:2,confidence:1.05},
    {name:"JaxMooze",secs:392,totalLvl:2071,combat:123,slayer:83,cox:11,tob:0,toa:12,inferno:0,colo:0,hours:2,confidence:0.9725},
    {name:"Sanda-san",secs:589,totalLvl:2157,combat:124,slayer:95,cox:124,tob:72,toa:183,inferno:0,colo:0,hours:1,confidence:1.07},
    {name:"DyeWithAnEye",secs:516,totalLvl:2195,combat:126,slayer:99,cox:14,tob:17,toa:5,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"Luffy D Lucy",secs:413,totalLvl:2076,combat:122,slayer:98,cox:17,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.8},
    {name:"PuppyPlooper",secs:198,totalLvl:1978,combat:117,slayer:82,cox:11,tob:0,toa:4,inferno:0,colo:0,hours:1,confidence:0.8},
  ],
  "Before NA": [
    {name:"Before NA",secs:2283,totalLvl:2212,combat:126,slayer:95,cox:335,tob:1210,toa:379,inferno:1,colo:2,hours:10,confidence:1.05},
    {name:"Mooyi",secs:2449,totalLvl:2352,combat:126,slayer:99,cox:3600,tob:2500,toa:575,inferno:18,colo:21,hours:10,confidence:0.9725},
    {name:"Fripppe",secs:1965,totalLvl:2376,combat:126,slayer:99,cox:299,tob:10,toa:56,inferno:0,colo:1,hours:8,confidence:1.05},
    {name:"Bodybuilding",secs:1856,totalLvl:2376,combat:126,slayer:99,cox:33,tob:0,toa:108,inferno:0,colo:0,hours:8,confidence:1.07},
    {name:"cammy",secs:1187,totalLvl:2376,combat:126,slayer:99,cox:318,tob:447,toa:154,inferno:9,colo:23,hours:4,confidence:0.8},
    {name:"Jakes7",secs:1237,totalLvl:2318,combat:126,slayer:99,cox:1856,tob:2229,toa:56,inferno:7,colo:338,hours:2,confidence:1.07},
    {name:"Bendyruler",secs:1220,totalLvl:2376,combat:126,slayer:99,cox:571,tob:1474,toa:863,inferno:27,colo:24,hours:2,confidence:0.9725},
    {name:"CurrvyRabbit",secs:1287,totalLvl:2376,combat:126,slayer:99,cox:580,tob:1112,toa:261,inferno:11,colo:134,hours:2,confidence:1.07},
    {name:"Mr Mashy",secs:882,totalLvl:2376,combat:126,slayer:99,cox:400,tob:397,toa:797,inferno:22,colo:31,hours:2,confidence:0.8},
    {name:"psycho zako",secs:962,totalLvl:2376,combat:126,slayer:99,cox:847,tob:1883,toa:179,inferno:8,colo:22,hours:2,confidence:0.875},
    {name:"Impact_Two",secs:841,totalLvl:1921,combat:124,slayer:81,cox:20,tob:14,toa:92,inferno:0,colo:0,hours:4,confidence:0.875},
    {name:"BiapaB",secs:706,totalLvl:2319,combat:126,slayer:99,cox:42,tob:76,toa:192,inferno:1,colo:2,hours:2,confidence:0.9725},
    {name:"Tboodle",secs:516,totalLvl:2169,combat:124,slayer:93,cox:89,tob:20,toa:51,inferno:1,colo:1,hours:1,confidence:1.05},
    {name:"zangrief420",secs:994,totalLvl:2300,combat:126,slayer:99,cox:16,tob:7,toa:2,inferno:0,colo:0,hours:4,confidence:0.875},
    {name:"Taercy",secs:785,totalLvl:2370,combat:126,slayer:99,cox:1682,tob:281,toa:395,inferno:0,colo:10,hours:2,confidence:0.8},
    {name:"Karadazan",secs:254,totalLvl:2030,combat:113,slayer:75,cox:15,tob:14,toa:17,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"Loafosaur",secs:259,totalLvl:1975,combat:115,slayer:75,cox:1,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"MossyGl0bl",secs:776,totalLvl:1746,combat:102,slayer:73,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:4,confidence:1.05},
    {name:"Iron Erased",secs:432,totalLvl:2081,combat:120,slayer:93,cox:80,tob:32,toa:92,inferno:0,colo:0,hours:2,confidence:0.875},
    {name:"Wow A Potato",secs:427,totalLvl:2146,combat:123,slayer:95,cox:28,tob:28,toa:90,inferno:0,colo:0,hours:2,confidence:0.8},
    {name:"Gano Gary",secs:373,totalLvl:2000,combat:120,slayer:92,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:1,confidence:1.07},
    {name:"Gim Storba",secs:397,totalLvl:2131,combat:120,slayer:96,cox:39,tob:15,toa:37,inferno:0,colo:0,hours:2,confidence:0.8},
    {name:"SamiOG",secs:150,totalLvl:1800,combat:100,slayer:75,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.8},
  ],
  "funzip": [
    {name:"funzip",secs:1839,totalLvl:2278,combat:126,slayer:99,cox:1209,tob:1166,toa:285,inferno:9,colo:19,hours:4,confidence:1.07},
    {name:"Xbrennyx",secs:1879,totalLvl:2138,combat:124,slayer:99,cox:704,tob:484,toa:33,inferno:1,colo:0,hours:6,confidence:1.07},
    {name:"NeedMoore",secs:2314,totalLvl:2257,combat:126,slayer:99,cox:687,tob:1779,toa:407,inferno:14,colo:14,hours:10,confidence:0.9725},
    {name:"Arcunos",secs:1665,totalLvl:2062,combat:125,slayer:99,cox:57,tob:50,toa:150,inferno:0,colo:0,hours:6,confidence:1.07},
    {name:"Nohyue",secs:1544,totalLvl:2190,combat:123,slayer:93,cox:71,tob:102,toa:59,inferno:0,colo:0,hours:8,confidence:0.9725},
    {name:"Steamybunz",secs:1360,totalLvl:2260,combat:126,slayer:99,cox:447,tob:255,toa:42,inferno:1,colo:1,hours:6,confidence:0.8},
    {name:"Glowed",secs:1104,totalLvl:2342,combat:126,slayer:99,cox:11,tob:224,toa:18,inferno:1,colo:1,hours:4,confidence:0.9125},
    {name:"EGLogic",secs:1599,totalLvl:2203,combat:126,slayer:99,cox:1041,tob:215,toa:370,inferno:2,colo:1,hours:4,confidence:1.05},
    {name:"VVeems",secs:1603,totalLvl:2269,combat:126,slayer:99,cox:10,tob:2,toa:8,inferno:0,colo:0,hours:8,confidence:0.9725},
    {name:"Itchy16",secs:1075,totalLvl:2011,combat:125,slayer:96,cox:165,tob:156,toa:216,inferno:1,colo:0,hours:4,confidence:0.875},
    {name:"iSlaySpoons",secs:1025,totalLvl:2376,combat:126,slayer:99,cox:1015,tob:1778,toa:271,inferno:1,colo:2,hours:2,confidence:0.9725},
    {name:"TTC Derrick",secs:1062,totalLvl:2116,combat:124,slayer:97,cox:182,tob:55,toa:96,inferno:1,colo:1,hours:4,confidence:0.875},
    {name:"Exemplary",secs:1113,totalLvl:1805,combat:123,slayer:97,cox:38,tob:0,toa:8,inferno:0,colo:0,hours:4,confidence:1.05},
    {name:"Goldpapa",secs:741,totalLvl:2205,combat:125,slayer:99,cox:846,tob:65,toa:211,inferno:1,colo:1,hours:2,confidence:0.875},
    {name:"VintageSheep",secs:868,totalLvl:2093,combat:124,slayer:99,cox:717,tob:747,toa:137,inferno:1,colo:0,hours:1,confidence:1.05},
    {name:"Mr_Nikk",secs:472,totalLvl:1920,combat:121,slayer:94,cox:24,tob:8,toa:70,inferno:0,colo:0,hours:2,confidence:0.9725},
    {name:"Nishi Senpai",secs:735,totalLvl:2152,combat:126,slayer:99,cox:206,tob:429,toa:58,inferno:1,colo:1,hours:1,confidence:1.05},
    {name:"Anglicanism",secs:583,totalLvl:2289,combat:124,slayer:85,cox:12,tob:10,toa:277,inferno:0,colo:0,hours:2,confidence:1.07},
    {name:"DaMains",secs:1124,totalLvl:2315,combat:126,slayer:99,cox:1103,tob:1572,toa:773,inferno:1,colo:1,hours:1,confidence:1.05},
    {name:"Smosus",secs:333,totalLvl:1858,combat:118,slayer:94,cox:22,tob:8,toa:60,inferno:0,colo:0,hours:1,confidence:0.9125},
    {name:"doot scooter",secs:536,totalLvl:2376,combat:126,slayer:99,cox:149,tob:84,toa:4,inferno:1,colo:1,hours:1,confidence:0.875},
    {name:"Of Clay",secs:495,totalLvl:2127,combat:122,slayer:96,cox:70,tob:122,toa:65,inferno:1,colo:1,hours:1,confidence:0.9725},
    {name:"Sc0tty",secs:150,totalLvl:1800,combat:100,slayer:75,cox:0,tob:0,toa:0,inferno:0,colo:0,hours:2,confidence:0.8},
  ],
};

function deriveCapability(p) {
  const {cox,tob,toa,inferno,colo,slayer,combat,totalLvl}=p;
  const soloKC=inferno+colo;
  const soloSignal=soloKC===0?0.6:soloKC<5?0.85:soloKC<20?1.0:soloKC<50?1.15:1.3;
  const raidWeighted=tob*1.0+cox*0.8+toa*0.5;
  const raidBase=Math.min(1.4,0.6+(raidWeighted/2000)*0.8);
  const raidPower=Math.min(1.5,raidBase*soloSignal);
  const combatNorm=Math.max(0,(combat-90)/36);
  const slayerNorm=Math.max(0,(slayer-60)/39);
  const pvmBase=combatNorm*0.6+slayerNorm*0.4;
  const pvmPower=Math.min(1.4,Math.max(pvmBase,raidBase*0.75)*soloSignal);
  const slayerPower=Math.min(1.3,(slayerNorm*0.7+combatNorm*0.3)*Math.min(1.1,soloSignal));
  const skillNorm=Math.max(0,(totalLvl-1500)/876);
  const skillPower=Math.min(1.3,0.6+skillNorm*0.7);
  const massPower=pvmPower*0.9;
  return{raidPower,pvmPower,slayerPower,skillPower,massPower,soloSignal};
}

function teamCapability(players) {
  const caps=players.map(p=>({...p,cap:deriveCapability(p)}));
  const topN=(fn,n)=>{
    const sorted=[...caps].sort((a,b)=>fn(b.cap)-fn(a.cap));
    const top=sorted.slice(0,n);
    return top.reduce((s,p)=>s+fn(p.cap),0)/top.length;
  };
  return{
    raids:topN(c=>c.raidPower,5),
    pvm:topN(c=>c.pvmPower,4),
    slayer:topN(c=>c.slayerPower,3),
    skilling:topN(c=>c.skillPower,3),
    mass:topN(c=>c.massPower,10),
    challenge:1.0,
  };
}

function effectiveScale(cat,teamSize,teamCap) {
  const raw=cat==="mass"?Math.min(teamSize,10):cat==="skilling"?Math.min(teamSize,3):cat==="raids"?Math.min(teamSize,5):Math.min(teamSize,4);
  return raw*(teamCap[cat]||1.0);
}

function teamCategoryHours(players,cat,scenario='expected') {
  const useful=players.filter(p=>{
    if(cat==='raids')return(p.tob+p.cox+p.toa)>150||(p.inferno+p.colo)>0;
    if(cat==='slayer')return p.slayer>=80;
    if(cat==='pvm')return p.combat>=110;
    return true;
  }).sort((a,b)=>playerEventHours(b.hours,scenario)-playerEventHours(a.hours,scenario));
  const maxC=cat==="mass"?10:cat==="raids"?5:cat==="skilling"?3:cat==="challenge"?players.length:4;
  return useful.slice(0,maxC).reduce((s,p)=>s+playerEventHours(p.hours,scenario),0);
}

const INIT_TILES=[
  {id:1,name:"COX KC",tasks:[{id:"1a",desc:"100 KC",type:"kc",estHours:33,notes:"~3 KC/hr"},{id:"1b",desc:"150 KC",type:"kc",estHours:17,notes:"+50 KC"},{id:"1c",desc:"200 KC",type:"kc",estHours:17,notes:"+50 KC"}],cat:"raids",notes:"Regular COX"},
  {id:2,name:"Slayer Unique",tasks:[{id:"2a",desc:"8 Slayer Pts",type:"points",estHours:20,notes:"Point table"},{id:"2b",desc:"16 Slayer Pts",type:"points",estHours:25,notes:"Cumulative"},{id:"2c",desc:"24 Slayer Pts",type:"points",estHours:30,notes:"Cumulative"}],cat:"slayer",notes:"Slayer boss uniques"},
  {id:3,name:"Ahoy Sailor!",tasks:[{id:"3a",desc:"3x Unique Salvage",type:"drop",estHours:33,notes:"~270/hr"},{id:"3b",desc:"Boat Paint/Pet",type:"drop",estHours:30,notes:"Paints"},{id:"3c",desc:"Rare Sailing Misc",type:"drop",estHours:40,notes:"Echo pearl etc"}],cat:"skilling",notes:"NO PRE-STACKING"},
  {id:4,name:"Ironman Pun",tasks:[{id:"4a",desc:"CG 2x armor/enh",type:"drop",estHours:16.7,notes:"CG"},{id:"4b",desc:"8 Moons Uniques",type:"drop",estHours:10.9,notes:"14kph"},{id:"4c",desc:"Full Barrows Set",type:"kc",estHours:25,notes:"12/hr"}],cat:"pvm",notes:"CG+Moons+Barrows"},
  {id:5,name:"Glow-ee Hole",tasks:[{id:"5a",desc:"1 Doom Unique",type:"drop",estHours:8,notes:"~8h"},{id:"5b",desc:"3 Doom Uniques",type:"drop",estHours:16,notes:"Cumul"},{id:"5c",desc:"5 Doom Uniques",type:"drop",estHours:16,notes:"Pet counts"}],cat:"pvm",notes:"~8h per unique"},
  {id:6,name:"Icy Adventure",tasks:[{id:"6a",desc:"600 Amoxliatl KC",type:"kc",estHours:10,notes:"KC"},{id:"6b",desc:"2x Venator Shards",type:"drop",estHours:10,notes:"Shards"},{id:"6c",desc:"25 Dragon Metal",type:"drop",estHours:10,notes:"2.5/hr"}],cat:"slayer",notes:"2.5 dragon metal/hr"},
  {id:7,name:"COX 1",tasks:[{id:"7a",desc:"3x Dex/Arcane",type:"drop",estHours:45,notes:"Purples"},{id:"7b",desc:"Ancy/TBOW",type:"drop",estHours:62.9,notes:"Mega-rare"},{id:"7c",desc:"CM Kit/Dust/Pet",type:"drop",estHours:37,notes:"CM"}],cat:"raids",notes:"High variance"},
  {id:8,name:"Slayer LvlUp",tasks:[{id:"8a",desc:"1m Slayer XP",type:"kc",estHours:10,notes:"100k/hr"},{id:"8b",desc:"3m Slayer XP",type:"kc",estHours:20,notes:"Cumul"},{id:"8c",desc:"5m Slayer XP",type:"kc",estHours:20,notes:"Cumul"}],cat:"slayer",notes:"Synergizes w/ unique"},
  {id:9,name:"GWD 1",tasks:[{id:"9a",desc:"BCP",type:"drop",estHours:13.2,notes:"1/381"},{id:"9b",desc:"Arma Helm",type:"drop",estHours:13.2,notes:"1/381"},{id:"9c",desc:"Full Godsword",type:"drop",estHours:0,notes:"Passive"}],cat:"pvm",notes:"Godsword passive"},
  {id:10,name:"TOA KC",tasks:[{id:"10a",desc:"100 KC",type:"kc",estHours:33,notes:"3 KC/hr"},{id:"10b",desc:"150 KC",type:"kc",estHours:17,notes:"+50"},{id:"10c",desc:"200 KC",type:"kc",estHours:17,notes:"+50"}],cat:"raids",notes:"3-man min"},
  {id:11,name:"TOA 1",tasks:[{id:"11a",desc:"2x Lightbearer",type:"drop",estHours:30,notes:"Purple"},{id:"11b",desc:"2x Fang/Shadow",type:"drop",estHours:50,notes:"Weapons"},{id:"11c",desc:"Masori/Ward/Pet",type:"drop",estHours:80,notes:"Rarest"}],cat:"raids",notes:"Dupes suck"},
  {id:12,name:"Slayer Parts",tasks:[{id:"12a",desc:"Gryphon Folly+Horn",type:"drop",estHours:25,notes:"1/400+1/1k"},{id:"12b",desc:"3x Brimstone",type:"drop",estHours:21,notes:"Dupes ok"},{id:"12c",desc:"2 Boss Jars",type:"drop",estHours:30,notes:"No dupes"}],cat:"slayer",notes:"Mixed slayer"},
  {id:13,name:"PVM Daily",tasks:[{id:"13a",desc:"Challenge 1",type:"challenge",estHours:2,notes:"Discord"},{id:"13b",desc:"Challenge 2",type:"challenge",estHours:2,notes:"Discord"},{id:"13c",desc:"Challenge 3",type:"challenge",estHours:2,notes:"Discord"}],cat:"challenge",notes:"Dailies"},
  {id:14,name:"Scaly Surprise",tasks:[{id:"14a",desc:"Tanzanite Fang",type:"drop",estHours:12.8,notes:"1/512"},{id:"14b",desc:"Vorkath Unique",type:"drop",estHours:19.2,notes:"Any"},{id:"14c",desc:"Corp Sigil/DWH",type:"drop",estHours:20,notes:"Either"}],cat:"pvm",notes:"Multi-boss"},
  {id:15,name:"GWD 2",tasks:[{id:"15a",desc:"Staff of Dead",type:"drop",estHours:19.6,notes:"K'ril"},{id:"15b",desc:"Arma Crossbow",type:"drop",estHours:18.9,notes:"Kree"},{id:"15c",desc:"3x any Hilt",type:"drop",estHours:0,notes:"Passive"}],cat:"pvm",notes:"Passive hilts"},
  {id:16,name:"Nex",tasks:[{id:"16a",desc:"60 Nihil Shards",type:"kc",estHours:8.3,notes:"7.25/hr"},{id:"16b",desc:"Nex Unique",type:"drop",estHours:14.3,notes:"1/43"},{id:"16c",desc:"2 Nex Uniques",type:"drop",estHours:14.3,notes:"2nd"}],cat:"pvm",notes:"Group"},
  {id:17,name:"AFK TILE",tasks:[{id:"17a",desc:"1.75m Mining/Pet",type:"kc",estHours:20,notes:"AFK"},{id:"17b",desc:"2m WC/Pet",type:"kc",estHours:20,notes:"AFK"},{id:"17c",desc:"3m Hunter/Pet",type:"kc",estHours:20,notes:"No prestack"}],cat:"skilling",notes:"No 2x accounts"},
  {id:18,name:"TOB KC",tasks:[{id:"18a",desc:"100 KC",type:"kc",estHours:33,notes:"3/hr"},{id:"18b",desc:"150 KC",type:"kc",estHours:17,notes:"+50"},{id:"18c",desc:"200 KC",type:"kc",estHours:17,notes:"+50"}],cat:"raids",notes:"1 KC per"},
  {id:19,name:"Skillers Unite!",tasks:[{id:"19a",desc:"Tench/200 Pearls",type:"drop",estHours:12.5,notes:"Aerial"},{id:"19b",desc:"1000 Vale Searches",type:"kc",estHours:20,notes:"Totems"},{id:"19c",desc:"Tome/Pet/Harpoon",type:"drop",estHours:20,notes:"No Wyrms"}],cat:"skilling",notes:"Mixed"},
  {id:20,name:"Yama",tasks:[{id:"20a",desc:"500 KC",type:"kc",estHours:12.5,notes:"40KPH duo"},{id:"20b",desc:"Oathplate Piece",type:"drop",estHours:19.6,notes:"1/51"},{id:"20c",desc:"Horn/Pet",type:"drop",estHours:30.3,notes:"Rare"}],cat:"pvm",notes:"Pet contracts ok"},
  {id:21,name:"Colo",tasks:[{id:"21a",desc:"3 Echo Crystals",type:"drop",estHours:12.5,notes:"Crystals"},{id:"21b",desc:"3x Sunfire Full",type:"drop",estHours:10,notes:"Fanatic"},{id:"21c",desc:"2x Onyxites/Ralos",type:"drop",estHours:17.1,notes:"Rare"}],cat:"pvm",notes:"Colosseum"},
  {id:22,name:"DT2",tasks:[{id:"22a",desc:"10 Awakener Orbs",type:"kc",estHours:25,notes:"Orbs"},{id:"22b",desc:"4 Ring Rolls",type:"drop",estHours:29.6,notes:"11.5h/roll"},{id:"22c",desc:"3 Axe Pcs/Virtus",type:"drop",estHours:55,notes:"Rare"}],cat:"pvm",notes:"Long tile"},
  {id:23,name:"MASS MODE",tasks:[{id:"23a",desc:"150 NM KC",type:"kc",estHours:12.5,notes:"12/hr 5man"},{id:"23b",desc:"1000 Callisto",type:"kc",estHours:20,notes:"Mass"},{id:"23c",desc:"150 Corp KC",type:"kc",estHours:15,notes:"10/hr w/8"}],cat:"mass",notes:"Great for team"},
  {id:24,name:"TOB 1",tasks:[{id:"24a",desc:"2x Avernic",type:"drop",estHours:43.5,notes:"Purple"},{id:"24b",desc:"3x Justi/Scythe",type:"drop",estHours:83.3,notes:"Rare"},{id:"24c",desc:"HMT Kit/Dust/Pet",type:"drop",estHours:49,notes:"HM"}],cat:"raids",notes:"Longest tile"},
  {id:25,name:"Leftovers",tasks:[{id:"25a",desc:"Tormented Synapse",type:"drop",estHours:9.1,notes:"Sire/GG"},{id:"25b",desc:"Phosani Unique",type:"drop",estHours:15.1,notes:"NOT reg NM"},{id:"25c",desc:"3x Zenyte Shards",type:"drop",estHours:13,notes:"Gorillas"}],cat:"pvm",notes:"Good money+xp"}
];

// ─── SCORING SYSTEM ─────────────────────────────────────────────────────────
const TASK_POINTS = 3;        // Points per task completed
const BRONZE_BONUS = 15;      // Bonus for bronze bingo (all 5 tiles ≥1 task)
const SILVER_BONUS = 15;      // Bonus for silver bingo (all 5 tiles ≥2 tasks)  
const GOLD_BONUS = 15;        // Bonus for gold bingo (all 5 tiles = 3 tasks)

// 10 lines total: 5 rows + 5 columns (NO DIAGONALS)
const LINES = (() => {
  const l = [];
  for (let r = 0; r < 5; r++) l.push({name: "Row " + (r+1), tiles: [r*5+1, r*5+2, r*5+3, r*5+4, r*5+5]});
  for (let c = 0; c < 5; c++) l.push({name: "Col " + (c+1), tiles: [c+1, c+6, c+11, c+16, c+21]});
  return l;
})();
const CC={raids:"#e74c3c",slayer:"#2ecc71",pvm:"#3498db",skilling:"#f39c12",mass:"#9b59b6",challenge:"#1abc9c"};
const MIC=["#555","#cd7f32","#c0c0c0","#ffd700"];
const CAT_LABEL={raids:"Raiders",slayer:"Slayers",pvm:"PvMers",skilling:"Skillers",mass:"Mass",challenge:"All"};
const TEAM_COLORS={"SoccerTheNub":"#f39c12","Indy 500":"#3498db","Before NA":"#e74c3c","funzip":"#2ecc71"};

// ─── WIKI ENRICHMENT ────────────────────────────────────────────────────────

const ENRICH_PROMPT = (tileName, tileNotes, tileCategory, taskDesc, taskType, taskNotes, currentHours) => `You are an Old School RuneScape expert. Given this bingo tile task, provide accurate time estimates based on OSRS wiki data.

Tile: "${tileName}" (${tileCategory}) - ${tileNotes}
Task: "${taskDesc}" (type: ${taskType}) - ${taskNotes}
Current estimate: ${currentHours}h

CRITICAL RULES for calculating estHours:
1. OR logic: If the task lists multiple items separated by "/" or "or" (e.g. "Ancy/TBOW", "BCP or tassets"), use the COMBINED drop rate (sum of individual rates), NOT the rate of the rarest item alone. Getting any one of the listed items completes the task.
2. CoX purples: The unique chest rate is roughly 1/9 per raid at standard team points. The unique table has ~50 items. Mega-rares (TBOW, Kodai, Ancestral pieces) share a small weight. "Ancy/TBOW" means either Ancestral OR Twisted Bow - use combined mega-rare weight (~1/34 of unique rolls = roughly 1/300 per raid at team scale, ~75h at 4 raids/hr).
3. Team scale: Assume a competent 5-man team for raids, not solo. KC/hr should reflect team play.
4. Multiple drops needed: If the task requires N of something, multiply expected hours by N.
5. KC tasks: estHours = kills_required / kcPerHour (deterministic, no RNG multiplier).

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "estHours": <number: expected wall-clock hours at base efficiency before team scaling. Apply OR-logic combined rates where applicable>,
  "dropRate": <number or null: combined drop rate as decimal if OR logic applies, else individual rate. e.g. 0.003 for ~1/300>,
  "kcPerHour": <number or null: kills or completions per hour for a competent team>,
  "dropsNeeded": <number or null: how many drops required>,
  "confidence": <"high"|"medium"|"low">,
  "wikiNotes": <string: note the calculation used, e.g. "Combined Ancy+TBOW mega-rare rate ~1/300 at team scale". Max 80 chars>
}`;

// ...existing code...
async function callEnrichAPI(tileName, tileNotes, tileCategory, task) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/enrich', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tileName, tileNotes, tileCategory, task })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Proxy error ${res.status}: ${txt}`);
    }
    const j = await res.json().catch(() => ({}));
    // proxy returns { ok: true, result: {...} }
    return j.result || j;
  } finally {
    clearTimeout(timeout);
  }
}

function useWikiData(tiles, setTiles) {
  const [wikiData, setWikiData] = useState({});
  const [enriching, setEnriching] = useState({});
  const [enrichProgress, setEnrichProgress] = useState(null);

  useEffect(() => {
    // Load persisted wiki data from localStorage on mount — synchronous, no async needed
    const keys = Object.keys(localStorage).filter(k => k.startsWith('wiki:'));
    if (!keys.length) return;
    const loaded = {};
    for (const key of keys) {
      try {
        const val = localStorage.getItem(key);
        if (val) loaded[key.replace('wiki:', '')] = JSON.parse(val);
      } catch {}
    }
    if (Object.keys(loaded).length > 0) {
      setWikiData(loaded);
      setTiles(prev => prev.map(tile => ({
        ...tile,
        tasks: tile.tasks.map(task => {
          const d = loaded[task.id];
          if (!d) return task;
          return {...task, estHours: d.estHours, wikiEnriched: true, wikiConfidence: d.confidence, wikiNotes: d.wikiNotes};
        })
      })));
    }
  }, []);

  const enrichTask = async (tile, task) => {
    const taskId = task.id;
    setEnriching(p => ({...p, [taskId]: true}));
    try {
      const result = await callEnrichAPI(tile.name, tile.notes||"", tile.cat, task);
      const enriched = {
        estHours: result.estHours,
        dropRate: result.dropRate,
        kcPerHour: result.kcPerHour,
        dropsNeeded: result.dropsNeeded,
        confidence: result.confidence || "medium",
        wikiNotes: result.wikiNotes || "",
        enrichedAt: Date.now()
      };
      // Persist enriched data so it survives page refresh
      localStorage.setItem(`wiki:${taskId}`, JSON.stringify(enriched));
      setWikiData(p => ({...p, [taskId]: enriched}));
      setTiles(prev => prev.map(t => t.id !== tile.id ? t : {
        ...t,
        tasks: t.tasks.map(tk => tk.id !== taskId ? tk : {
          ...tk,
          estHours: enriched.estHours,
          wikiEnriched: true,
          wikiConfidence: enriched.confidence,
          wikiNotes: enriched.wikiNotes
        })
      }));
      return enriched;
    } catch(e) {
      console.error('Enrich failed', taskId, e);
      return null;
    } finally {
      setEnriching(p => {const n={...p}; delete n[taskId]; return n;});
    }
  };

  const enrichAll = async (tiles) => {
    const allTasks = tiles.flatMap(tile => tile.tasks.map(task => ({tile, task})));
    const needsEnrich = allTasks.filter(({task}) => !wikiData[task.id]);
    if (!needsEnrich.length) return;
    setEnrichProgress({done: 0, total: needsEnrich.length, failed: 0, skipped: []});
    let failed = 0;
    const skipped = [];
    for (let i = 0; i < needsEnrich.length; i++) {
      const {tile, task} = needsEnrich[i];
      const result = await enrichTask(tile, task);
      if (!result) {
        failed++;
        skipped.push(`${tile.name} / ${task.desc}`);
      }
      setEnrichProgress({done: i+1, total: needsEnrich.length, failed, skipped});
      if (i < needsEnrich.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    setTimeout(() => setEnrichProgress(null), 3000);
  };

  const clearAll = async () => {
    // Remove all wiki: keys from localStorage
    Object.keys(localStorage).filter(k => k.startsWith('wiki:')).forEach(k => localStorage.removeItem(k));
    setWikiData({});
    setTiles(prev => prev.map(tile => ({
      ...tile,
      tasks: tile.tasks.map(task => {
        const {wikiEnriched, wikiConfidence, wikiNotes, ...rest} = task;
        return rest;
      })
    })));
  };

  return {wikiData, enriching, enrichProgress, enrichTask, enrichAll, clearAll};
}

// ─── END WIKI ENRICHMENT ────────────────────────────────────────────────────

function remS(tile,ds){return tile.tasks.filter(t=>!ds.has(t.id)).sort((a,b)=>a.estHours-b.estHours);}

// NEW SCORING FUNCTION
function calculateScore(done, tiles) {
  const taskPoints = done.size * TASK_POINTS;
  const tasksPerTile = {};
  tiles.forEach(tile => {
    tasksPerTile[tile.id] = tile.tasks.filter(t => done.has(t.id)).length;
  });
  
  let bronzeLines = 0, silverLines = 0, goldLines = 0;
  LINES.forEach(line => {
    const tileCounts = line.tiles.map(tid => tasksPerTile[tid] || 0);
    if (tileCounts.every(c => c >= 1)) {
      bronzeLines++;
      if (tileCounts.every(c => c >= 2)) {
        silverLines++;
        if (tileCounts.every(c => c >= 3)) {
          goldLines++;
        }
      }
    }
  });
  
  const bonusPoints = (bronzeLines * BRONZE_BONUS) + (silverLines * SILVER_BONUS) + (goldLines * GOLD_BONUS);
  return {taskPoints, bonusPoints, total: taskPoints + bonusPoints, bronzeLines, silverLines, goldLines, tasksComplete: done.size};
}

// Helper: Calculate marginal points from completing N more tasks on a tile
function getMarginalPoints(tileId, currentTasksOnTile, tasksToAdd, allTileTaskCounts) {
  const newLevel = currentTasksOnTile + tasksToAdd;
  const taskPts = tasksToAdd * TASK_POINTS;
  
  // Check which lines this tile is on and calculate bingo bonus gains
  let bonusGain = 0;
  LINES.filter(l => l.tiles.includes(tileId)).forEach(line => {
    const otherTileCounts = line.tiles.filter(t => t !== tileId).map(tid => allTileTaskCounts[tid] || 0);
    
    // Check bronze bonus
    if (currentTasksOnTile < 1 && newLevel >= 1) {
      if (otherTileCounts.every(c => c >= 1)) bonusGain += BRONZE_BONUS;
    }
    // Check silver bonus  
    if (currentTasksOnTile < 2 && newLevel >= 2) {
      if (otherTileCounts.every(c => c >= 2)) bonusGain += SILVER_BONUS;
    }
    // Check gold bonus
    if (currentTasksOnTile < 3 && newLevel >= 3) {
      if (otherTileCounts.every(c => c >= 3)) bonusGain += GOLD_BONUS;
    }
  });
  
  return taskPts + bonusGain;
}

function pG(tile,hours,effSc){const eh=hours*effSc,so=[...tile.tasks].sort((a,b)=>a.estHours-b.estHours);let cum=0,p=1;for(const t of so){const r=Math.max(0,eh-cum);if(t.type==="kc"||t.type==="challenge"||t.type==="points"){p*=r>=t.estHours?1:Math.min(1,r/t.estHours);}else{if(t.estHours>0)p*=1-Math.exp(-(1/t.estHours)*r);}cum+=t.estHours;}return Math.min(1,p);}

function Dots({c}){return <div style={{display:"flex",gap:2,justifyContent:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:c>i?(i===0?"#cd7f32":i===1?"#c0c0c0":"#ffd700"):"rgba(255,255,255,0.07)"}}/>)}</div>;}

function VBar({task}){
  if(task.type!=="drop")return <div style={{fontSize:9,color:"#555",marginTop:2}}>Fixed: <b style={{color:"#999"}}>{task.estHours.toFixed(1)}h</b></div>;
  const l=task.estHours*0.35,d=task.estHours*2,sd=task.estHours*3,m=task.estHours*0.7;
  return <div style={{marginTop:2}}><div style={{display:"flex",gap:6,fontSize:8,color:"#555",flexWrap:"wrap"}}><span>Lucky:<b style={{color:"#4ade80"}}>{l.toFixed(1)}h</b></span><span>Exp:<b style={{color:"#ffd700"}}>{task.estHours.toFixed(1)}h</b></span><span>Dry:<b style={{color:"#ff8c00"}}>{d.toFixed(1)}h</b></span></div><div style={{position:"relative",height:4,background:"rgba(255,255,255,0.04)",borderRadius:2,marginTop:2,overflow:"hidden"}}><div style={{position:"absolute",left:(l/sd*100)+"%",width:((d-l)/sd*100)+"%",height:"100%",background:"rgba(255,215,0,0.2)"}}/><div style={{position:"absolute",left:(m/sd*100)+"%",width:2,height:"100%",background:"#ffd700"}}/></div></div>;
}

function TileEditor({tile, onSave, onCancel, enrichTask, enriching, wikiData}){
  const[name,setName]=useState(tile.name);
  const[notes,setNotes]=useState(tile.notes);
  const[tasks,setTasks]=useState(tile.tasks.map(t=>({...t})));
  const up=(i,f,v)=>setTasks(p=>p.map((t,j)=>j===i?{...t,[f]:f==="estHours"?parseFloat(v)||0:v}:t));

  const handleEnrich = async (i, forceRefresh=false) => {
    const task = tasks[i];
    if (forceRefresh) {
      // Clear cached entry so the API call runs fresh
      localStorage.removeItem(`wiki:${task.id}`);
    }
    const result = await enrichTask(tile, task);
    if (result) {
      setTasks(p => p.map((t,j) => j===i ? {
        ...t,
        estHours: result.estHours,
        wikiEnriched: true,
        wikiConfidence: result.confidence,
        wikiNotes: result.wikiNotes
      } : t));
    }
  };

  const confColor = c => c==="high"?"#4ade80":c==="medium"?"#ffd700":"#ff6b6b";
  const ins={background:"#151921",color:"#ddd",border:"1px solid #2a2f3a",borderRadius:3,padding:"3px 6px",fontSize:10,width:"100%",boxSizing:"border-box"};
  const btn=(bg,col,bc)=>({fontSize:8,background:bg,color:col,border:`1px solid ${bc}`,borderRadius:3,padding:"2px 7px",cursor:"pointer",fontWeight:600,fontFamily:"inherit"});

  return <div style={{background:"rgba(255,255,255,0.03)",borderRadius:6,border:"1px solid rgba(96,165,250,0.3)",padding:10}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
      <span style={{fontSize:12,fontWeight:700,color:"#60a5fa"}}>Edit #{tile.id}</span>
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>onSave({...tile,name,notes,tasks})} style={btn("rgba(74,222,128,0.15)","#4ade80","rgba(74,222,128,0.3)")}>Save</button>
        <button onClick={onCancel} style={btn("rgba(255,255,255,0.05)","#888","rgba(255,255,255,0.1)")}>Cancel</button>
      </div>
    </div>
    <div style={{marginBottom:6}}><div style={{fontSize:8,color:"#555",marginBottom:2}}>Name</div><input value={name} onChange={e=>setName(e.target.value)} style={ins}/></div>
    <div style={{marginBottom:8}}><div style={{fontSize:8,color:"#555",marginBottom:2}}>Notes</div><input value={notes} onChange={e=>setNotes(e.target.value)} style={ins}/></div>
    {tasks.map((task,i)=>{
      const wd = wikiData[task.id];
      const isEnriching = enriching[task.id];
      return <div key={i} style={{background:"rgba(0,0,0,0.15)",borderRadius:4,padding:6,marginBottom:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
          <span style={{fontSize:9,color:MIC[i+1],fontWeight:700}}>Task {i+1}</span>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {task.wikiEnriched && <span style={{fontSize:7,color:confColor(task.wikiConfidence),background:"rgba(0,0,0,0.3)",padding:"1px 4px",borderRadius:2}}>🌐 wiki · {task.wikiConfidence}</span>}
            {!task.wikiEnriched && wd && <span style={{fontSize:7,color:"#555"}}>✏ manual</span>}
            <button onClick={()=>handleEnrich(i)} disabled={isEnriching} style={{...btn(isEnriching?"rgba(255,255,255,0.03)":"rgba(96,165,250,0.12)",isEnriching?"#444":"#60a5fa","rgba(96,165,250,0.3)"),opacity:isEnriching?0.5:1}}>
              {isEnriching?"⟳ ...":"⚡ Enrich"}
            </button>
            {task.wikiEnriched && !isEnriching && <button onClick={()=>handleEnrich(i,true)} title="Clear cache and re-enrich with updated prompt" style={btn("rgba(255,107,107,0.08)","#ff6b6b","rgba(255,107,107,0.2)")}>↻</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:4}}>
          <div><div style={{fontSize:7,color:"#444"}}>Desc</div><input value={task.desc} onChange={e=>up(i,"desc",e.target.value)} style={ins}/></div>
          <div><div style={{fontSize:7,color:"#444",display:"flex",justifyContent:"space-between"}}><span>Hours</span>{wd&&<span style={{color:confColor(wd.confidence)}}>{wd.estHours.toFixed(1)}h</span>}</div><input type="number" step="0.1" value={task.estHours} onChange={e=>up(i,"estHours",e.target.value)} style={{...ins,color:task.wikiEnriched?"#60a5fa":"#ffd700"}}/></div>
          <div><div style={{fontSize:7,color:"#444"}}>Type</div><select value={task.type} onChange={e=>up(i,"type",e.target.value)} style={ins}><option value="drop">Drop</option><option value="kc">KC</option><option value="points">Pts</option><option value="challenge">Challenge</option></select></div>
        </div>
        {wd && <div style={{marginTop:3,fontSize:7,color:"#444",fontStyle:"italic",lineHeight:1.3}}>
          {wd.kcPerHour&&<span style={{marginRight:6}}>⚔️ {wd.kcPerHour}/hr</span>}
          {wd.dropRate&&<span style={{marginRight:6}}>👀 1/{Math.round(1/wd.dropRate)}</span>}
          {wd.dropsNeeded&&<span style={{marginRight:6}}>×{wd.dropsNeeded} needed</span>}
          {wd.wikiNotes&&<span style={{color:"#555"}}>{wd.wikiNotes}</span>}
        </div>}
      </div>;
    })}
  </div>;
}

function Countdown(){
  const[now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const active=now>=EVENT_START&&now<EVENT_END;
  const target=now<EVENT_START?EVENT_START:EVENT_END;
  const label=now<EVENT_START?"Starts in":"Ends in";
  if(now>=EVENT_END)return <div style={{fontSize:9,color:"#4ade80",fontWeight:700}}>EVENT COMPLETE</div>;
  const diff=Math.max(0,target-now);
  const d=Math.floor(diff/864e5),h=Math.floor((diff%864e5)/36e5),m=Math.floor((diff%36e5)/6e4),s=Math.floor((diff%6e4)/1e3);
  return <div style={{display:"flex",alignItems:"center",gap:6,fontSize:9}}>
    <div style={{width:6,height:6,borderRadius:"50%",background:active?"#4ade80":"#ffd700",boxShadow:active?"0 0 6px #4ade80":"none"}}/>
    <span style={{color:"#444"}}>{label}:</span>
    <span style={{color:active?"#4ade80":"#ffd700",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{d}d {String(h).padStart(2,"0")}h {String(m).padStart(2,"0")}m {String(s).padStart(2,"0")}s</span>
    <span style={{fontSize:7,color:"#333"}}>{active?`/ ${EVENT_DAYS.toFixed(1)}d window`:""}</span>
  </div>;
}

function RosterPanel({players, teamCap, enrichAll, enrichProgress, tiles, wikiData}){
  const[exp,setExp]=useState(false);
  const sorted=[...players].sort((a,b)=>b.secs-a.secs);
  const tF=players.reduce((s,p)=>s+playerEventHours(p.hours,"floor"),0);
  const tE=players.reduce((s,p)=>s+playerEventHours(p.hours,"expected"),0);
  const tC=players.reduce((s,p)=>s+playerEventHours(p.hours,"ceiling"),0);
  const elites=players.filter(p=>(p.inferno+p.colo)>3).length;
  const raiders=players.filter(p=>(p.tob+p.cox+p.toa)>100).length;
  const allTasks=tiles.flatMap(t=>t.tasks);
  const enrichedCount=allTasks.filter(t=>t.wikiEnriched).length;
  const enrichedPct=Math.round(enrichedCount/allTasks.length*100);
  const isEnriching=enrichProgress!==null;
  return <div style={{background:"rgba(0,0,0,0.2)",borderRadius:5,border:"1px solid rgba(255,255,255,0.05)",padding:"8px 10px",marginBottom:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setExp(!exp)}>
      <span style={{fontSize:9,fontWeight:700,color:"#ffd700",letterSpacing:1}}>TEAM ROSTER</span>
      {[{l:"Players",v:players.length,c:"#aaa"},{l:"Elites",v:elites,c:"#4ade80"},{l:"Raiders",v:raiders,c:"#e74c3c"},{l:"Exp hrs",v:Math.round(tE)+"h",c:"#ffd700"}].map((s,i)=><div key={i} style={{fontSize:8,background:"rgba(255,255,255,0.03)",padding:"1px 5px",borderRadius:2}}><span style={{color:"#333"}}>{s.l}: </span><b style={{color:s.c}}>{s.v}</b></div>)}
      <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
        {isEnriching
          ? <div style={{fontSize:8,color:"#60a5fa",display:"flex",alignItems:"center",gap:4}}>
              <span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>
              <span>{enrichProgress.done}/{enrichProgress.total}</span>
              {enrichProgress.failed>0&&<span style={{color:"#ff6b6b"}}>· {enrichProgress.failed} failed</span>}
              <div style={{width:60,height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${enrichProgress.done/enrichProgress.total*100}%`,background:"#60a5fa",borderRadius:2,transition:"width 0.3s"}}/>
                {enrichProgress.failed>0&&<div style={{position:"absolute",right:0,top:0,height:"100%",width:`${enrichProgress.failed/enrichProgress.total*100}%`,background:"#ff6b6b",borderRadius:2}}/>}
              </div>
              {enrichProgress.done===enrichProgress.total&&<span style={{color:enrichProgress.failed>0?"#ff6b6b":"#4ade80",fontWeight:700}}>{enrichProgress.failed>0?`${enrichProgress.failed} skipped — re-run to retry`:"Done!"}</span>}
            </div>
          : <button onClick={()=>enrichAll(tiles)} style={{fontSize:8,background:"rgba(96,165,250,0.1)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.25)",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>
              ⚡ Enrich all ({enrichedCount}/{allTasks.length} 🌐)
            </button>
        }
        <span style={{fontSize:9,color:"#444"}}>{exp?"▲":"▼"}</span>
      </div>
    </div>
    <div style={{marginTop:5,position:"relative",height:6,background:"rgba(255,255,255,0.03)",borderRadius:3,overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:"100%",background:"rgba(74,222,128,0.15)",borderRadius:3}}/>
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:(tE/tC*100)+"%",background:"rgba(255,215,0,0.35)",borderRadius:3}}/>
      <div style={{position:"absolute",left:0,top:0,height:"100%",width:(tF/tC*100)+"%",background:"rgba(255,107,107,0.45)",borderRadius:3}}/>
    </div>
    <div style={{display:"flex",gap:8,marginTop:2,fontSize:7,color:"#333"}}>
      <span><span style={{color:"#ff6b6b"}}>■</span> Floor {Math.round(tF)}h</span>
      <span><span style={{color:"#ffd700"}}>■</span> Expected {Math.round(tE)}h</span>
      <span><span style={{color:"#4ade80"}}>■</span> Ceiling {Math.round(tC)}h</span>
      <span style={{color:"#444",marginLeft:4}}>({EVENT_DAYS.toFixed(1)} day event)</span>
    </div>
    {exp&&<div style={{marginTop:8,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:8}}>
        <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          {["Player","SECS","CoX","ToB","ToA","Inf","Colo","Hrs/d","Exp total","Raid×","PvM×","Solo"].map(h=><td key={h} style={{padding:"2px 4px",color:"#444",fontWeight:600,whiteSpace:"nowrap"}}>{h}</td>)}
        </tr></thead>
        <tbody>{sorted.map((p,i)=>{
          const cap=deriveCapability(p),eT=playerEventHours(p.hours,"expected");
          const rC=cap.raidPower>1.1?"#4ade80":cap.raidPower>0.85?"#ffd700":"#ff6b6b";
          const pC=cap.pvmPower>1.0?"#4ade80":cap.pvmPower>0.75?"#ffd700":"#ff6b6b";
          const sC=cap.soloSignal>1.0?"#4ade80":cap.soloSignal>0.8?"#ffd700":"#ff6b6b";
          return <tr key={p.name} style={{borderBottom:"1px solid rgba(255,255,255,0.02)",background:i%2===0?"rgba(255,255,255,0.005)":"transparent"}}>
            <td style={{padding:"2px 4px",color:"#bbb",fontWeight:600,whiteSpace:"nowrap"}}>{p.name}</td>
            <td style={{padding:"2px 4px",color:"#ffd700",textAlign:"right"}}>{p.secs}</td>
            <td style={{padding:"2px 4px",color:"#aaa",textAlign:"right"}}>{p.cox}</td>
            <td style={{padding:"2px 4px",color:"#aaa",textAlign:"right"}}>{p.tob}</td>
            <td style={{padding:"2px 4px",color:"#aaa",textAlign:"right"}}>{p.toa}</td>
            <td style={{padding:"2px 4px",color:p.inferno>0?"#4ade80":"#555",textAlign:"right"}}>{p.inferno}</td>
            <td style={{padding:"2px 4px",color:p.colo>0?"#4ade80":"#555",textAlign:"right"}}>{p.colo}</td>
            <td style={{padding:"2px 4px",color:"#ffd700",textAlign:"right"}}>{p.hours}</td>
            <td style={{padding:"2px 4px",color:"#aaa",textAlign:"right"}}>{Math.round(eT)}h</td>
            <td style={{padding:"2px 4px",color:rC,textAlign:"right"}}>{cap.raidPower.toFixed(2)}</td>
            <td style={{padding:"2px 4px",color:pC,textAlign:"right"}}>{cap.pvmPower.toFixed(2)}</td>
            <td style={{padding:"2px 4px",color:sC,textAlign:"right"}}>{cap.soloSignal.toFixed(2)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
  </div>;
}

function Scenarios({done,tiles,teamPlayers,teamCap}){
  const[scens,setScens]=useState([{id:1,name:"Scenario A",medals:{},col:"#e74c3c"},{id:2,name:"Scenario B",medals:{},col:"#3498db"}]);
  const cyc=(si,tid)=>setScens(p=>p.map((s,i)=>{if(i!==si)return s;const c=s.medals[tid]||0,nx=c>=3?0:c+1,nm={...s.medals};if(nx===0)delete nm[tid];else nm[tid]=nx;return{...s,medals:nm};}));
  const addS=()=>scens.length<3&&setScens(p=>[...p,{id:3,name:"Scenario C",medals:{},col:"#2ecc71"}]);
  const remSc=()=>scens.length>1&&setScens(p=>p.slice(0,-1));
  const actMed={};tiles.forEach(t=>{actMed[t.id]=t.tasks.filter(tk=>done.has(tk.id)).length;});
  const tF=teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,"floor"),0);
  const tE=teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,"expected"),0);
  const results=scens.map(s=>{
    const merged={};for(let i=1;i<=25;i++)merged[i]=Math.max(actMed[i]||0,s.medals[i]||0);
    
    // Build done Set for this scenario
    const scenDone = new Set(done);
    Object.entries(s.medals).forEach(([tid, medalLevel]) => {
      const tile = tiles.find(t => t.id === +tid);
      if (!tile) return;
      const cur = actMed[+tid] || 0;
      if (medalLevel <= cur) return;
      const tasksNeeded = medalLevel - cur;
      const remainingTasks = remS(tile, new Set(tile.tasks.filter(tk => done.has(tk.id)).map(tk => tk.id)));
      for (let j = 0; j < tasksNeeded && j < remainingTasks.length; j++) {
        scenDone.add(remainingTasks[j].id);
      }
    });
    
    const sc = calculateScore(scenDone, tiles);
    let th = 0;
    Object.entries(s.medals).forEach(([tid,tLv])=>{const id=+tid,cur=actMed[id]||0;if(tLv<=cur)return;const tile=tiles.find(t=>t.id===id);if(!tile)return;const cd=new Set(tile.tasks.filter(tk=>done.has(tk.id)).map(tk=>tk.id));const rm=remS(tile,cd);const need=tLv-cur;const eff=effectiveScale(tile.cat,teamPlayers.length,teamCap);for(let j=0;j<need&&j<rm.length;j++)th+=rm[j].estHours/eff;});
    return{...s,...sc,th,fF:th<=tF,fE:th<=tE};
  });
  const maxPts=Math.max(...results.map(r=>r.total),1);
  const bb={fontSize:10,borderRadius:3,padding:"3px 10px",cursor:"pointer",fontWeight:600,border:"1px solid"};
  return <div>
    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:"#666",fontWeight:600,letterSpacing:1}}>CLICK TILES TO SET B/S/G TARGET</span>
      <div style={{marginLeft:"auto",display:"flex",gap:5}}>
        {scens.length<3&&<button onClick={addS} style={{...bb,background:"rgba(46,204,113,0.1)",color:"#2ecc71",borderColor:"rgba(46,204,113,0.3)"}}>+ Add C</button>}
        {scens.length>1&&<button onClick={remSc} style={{...bb,background:"rgba(255,255,255,0.04)",color:"#666",borderColor:"rgba(255,255,255,0.08)"}}>− Remove</button>}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${scens.length},1fr)`,gap:10,marginBottom:14}}>
      {results.map((sc,si)=><div key={sc.id} style={{background:"rgba(0,0,0,0.2)",borderRadius:6,border:`1px solid ${sc.col}44`,overflow:"hidden"}}>
        <div style={{background:`${sc.col}18`,borderBottom:`1px solid ${sc.col}33`,padding:"8px 10px",display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:sc.col,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:800,color:sc.col}}>{sc.name}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:4}}>
            <span style={{fontSize:8,color:sc.fF?"#4ade80":"#ff6b6b",fontWeight:700}}>{sc.fF?"✓floor":"⚠floor"}</span>
            <span style={{fontSize:8,color:sc.fE?"#ffd700":"#ff8c00",fontWeight:700}}>{sc.fE?"✓exp":"~exp"}</span>
          </div>
        </div>
        <div style={{padding:"8px 8px 6px"}}>
          <div style={{fontSize:8,color:"#444",marginBottom:5,letterSpacing:1}}>none→B→S→G</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3}}>
            {tiles.map(tile=>{const act=actMed[tile.id]||0,slv=sc.medals[tile.id]||0,disp=Math.max(act,slv),isSet=slv>act,mC=disp>=3?"#ffd700":disp>=2?"#c0c0c0":disp>=1?"#cd7f32":"transparent",mL=disp>=3?"G":disp>=2?"S":disp>=1?"B":"·";
            return <div key={tile.id} onClick={()=>cyc(si,tile.id)} style={{padding:"5px 2px",borderRadius:3,textAlign:"center",cursor:"pointer",position:"relative",background:isSet?`${sc.col}18`:disp>0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)",border:`1px solid ${isSet?sc.col+"66":disp>0?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"}`,transition:"all 0.1s"}}>
              <div style={{fontSize:7,color:"#444",lineHeight:1}}>{tile.id}</div>
              <div style={{fontSize:9,fontWeight:800,color:mC,lineHeight:1.2}}>{mL}</div>
              <div style={{position:"absolute",top:0,left:0,width:3,height:3,borderRadius:1,background:CC[tile.cat]}}/>
            </div>;})}
          </div>
        </div>
        <div style={{padding:"0 8px 8px",display:"flex",flexDirection:"column",gap:3}}>
          {[{label:"Total pts",value:sc.total,color:sc.col,big:true},{label:"Task pts",value:sc.taskPoints,color:"#ffd700",sub:`${sc.tasksComplete} tasks`},{label:"Bingo bonus",value:`+${sc.bonusPoints}`,color:"#60a5fa",sub:`${sc.bronzeLines}B ${sc.silverLines}S ${sc.goldLines}G`},{label:"Added hrs",value:`${Math.round(sc.th)}h`,color:sc.fE?"#4ade80":"#ff6b6b",sub:sc.fF?"✓floor hrs":sc.fE?"✓expected":"over budget"}]
          .map((row,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"3px 6px",borderRadius:3,background:row.big?"rgba(255,255,255,0.04)":"transparent",borderBottom:row.big?"none":"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:row.big?10:9,color:"#555"}}>{row.label}{row.sub&&<span style={{fontSize:7,color:"#333",marginLeft:3}}>{row.sub}</span>}</span>
            <span style={{fontSize:row.big?15:11,fontWeight:row.big?900:700,color:row.color}}>{row.value}</span>
          </div>)}
        </div>
      </div>)}
    </div>
    <div style={{background:"rgba(0,0,0,0.2)",borderRadius:5,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:9,color:"#444",letterSpacing:1,marginBottom:8,fontWeight:600}}>POINT COMPARISON</div>
      {results.map((sc,i)=>{const tW=(sc.taskPoints/maxPts)*100,lW=(sc.bonusPoints/maxPts)*100;return <div key={sc.id} style={{marginBottom:i<results.length-1?8:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,fontWeight:700,color:sc.col}}>{sc.name}</span><span style={{fontSize:10,fontWeight:900,color:"#ffd700"}}>{sc.total} pts</span></div>
        <div style={{height:20,background:"rgba(255,255,255,0.03)",borderRadius:3,overflow:"hidden",display:"flex"}}>
          <div style={{width:tW+"%",background:`${sc.col}99`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff",transition:"width 0.4s",minWidth:tW>5?20:0}}>{sc.taskPoints>0?sc.taskPoints:""}</div>
          <div style={{width:lW+"%",background:`${sc.col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:sc.col,transition:"width 0.4s",borderLeft:`1px solid ${sc.col}55`,minWidth:lW>5?20:0}}>{sc.bonusPoints>0?"+"+sc.bonusPoints:""}</div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:2,fontSize:8,color:"#333"}}><span style={{color:sc.col+"99"}}>■ Tasks {sc.taskPoints}</span><span style={{color:sc.col+"66"}}>■ Bingos +{sc.bonusPoints}</span></div>
      </div>;})}
    </div>
  </div>;
}

// ─── LINE PLANNER ─────────────────────────────────────────────────────────────
// pGTarget: probability a tile reaches targetMedal (1/2/3 tasks) in `hours` wall-clock
function pGTarget(tile, targetMedal, doneTasks, hours, effSc) {
  const eh = hours * effSc;
  const remaining = [...tile.tasks]
    .filter(t => !doneTasks.has(t.id))
    .sort((a,b) => a.estHours - b.estHours);
  const already = tile.tasks.filter(t => doneTasks.has(t.id)).length;
  const need = Math.max(0, targetMedal - already);
  if (need <= 0) return 1; // already achieved
  if (need > remaining.length) return 0; // impossible

  // Pick the `need` cheapest tasks — compute joint probability
  const chosen = remaining.slice(0, need);
  let cum = 0, p = 1;
  for (const t of chosen) {
    const r = Math.max(0, eh - cum);
    if (t.type === "kc" || t.type === "challenge" || t.type === "points") {
      p *= r >= t.estHours ? 1 : Math.min(1, r / t.estHours);
    } else {
      if (t.estHours > 0) p *= 1 - Math.exp(-(1/t.estHours) * r);
    }
    cum += t.estHours;
  }
  return Math.min(1, p);
}

function tileHoursForTarget(tile, targetMedal, doneTasks, effSc) {
  const already = tile.tasks.filter(t => doneTasks.has(t.id)).length;
  const need = Math.max(0, targetMedal - already);
  const remaining = [...tile.tasks]
    .filter(t => !doneTasks.has(t.id))
    .sort((a,b) => a.estHours - b.estHours);
  let h = 0;
  for (let i = 0; i < need && i < remaining.length; i++) h += remaining[i].estHours / effSc;
  return h;
}

function LinePlanner({done, tiles, teamPlayers, teamCap}) {
  // Lines: rows 1-5 (tiles 1-5, 6-10, ...), cols 1-5 (tiles 1,6,11,16,21 etc)
  const BOARD_LINES = useMemo(() => {
    const lines = [];
    for (let r = 0; r < 5; r++) lines.push({name: `Row ${r+1}`, key:`r${r}`, tiles:[r*5+1,r*5+2,r*5+3,r*5+4,r*5+5]});
    for (let c = 0; c < 5; c++) lines.push({name: `Col ${c+1}`, key:`c${c}`, tiles:[c+1,c+6,c+11,c+16,c+21]});
    return lines;
  }, []);

  const [selLine, setSelLine] = useState('r0');
  const [tileTargets, setTileTargets] = useState({}); // tileId -> 1|2|3
  const [assignees, setAssignees] = useState({}); // tileId -> Set of playerNames
  const [mode, setMode] = useState('fastest'); // fastest | safest | points

  const currentLine = BOARD_LINES.find(l => l.key === selLine);

  // When line changes, reset tile targets to gold (3) for all tiles in new line
  useEffect(() => {
    if (!currentLine) return;
    const t = {};
    currentLine.tiles.forEach(id => { t[id] = 3; });
    setTileTargets(t);
    setAssignees({});
  }, [selLine]);

  const doneTasks = useMemo(() => new Set(
    tiles.flatMap(t => t.tasks.filter(tk => done.has(tk.id)).map(tk => tk.id))
  ), [done, tiles]);

  // Compute per-tile stats for the selected line
  const lineStats = useMemo(() => {
    if (!currentLine) return [];
    return currentLine.tiles.map(tid => {
      const tile = tiles.find(t => t.id === tid);
      if (!tile) return null;
      const target = tileTargets[tid] || 3;
      const tDone = new Set(tile.tasks.filter(tk => done.has(tk.id)).map(tk => tk.id));
      const already = tile.tasks.filter(tk => done.has(tk.id)).length;
      const need = Math.max(0, target - already);

      // Player assignment: use assigned players if any, else full team
      const assigned = assignees[tid] ? teamPlayers.filter(p => assignees[tid].has(p.name)) : teamPlayers;
      const activePlayers = assigned.length > 0 ? assigned : teamPlayers;
      const assignedCap = teamCapability(activePlayers);
      const effSc = effectiveScale(tile.cat, activePlayers.length, assignedCap);

      const expHours = tileHoursForTarget(tile, target, tDone, effSc);
      // 90th pct dry: for drop tasks, 2.3× expected (90th pct of geometric); KC tasks are deterministic
      const remaining = [...tile.tasks].filter(t => !tDone.has(t.id)).sort((a,b)=>a.estHours-b.estHours).slice(0,need);
      const dryHours = remaining.reduce((s,t) => s + (t.type==='drop' ? t.estHours*2.3 : t.estHours) / effSc, 0);

      const hasDropTask = remaining.some(t => t.type === 'drop');
      const isBigDrop = dryHours > expHours * 1.8;

      // Medal options
      const opts = [1,2,3].map(m => ({
        medal: m,
        hours: tileHoursForTarget(tile, m, tDone, effSc),
        done: already >= m
      }));

      return {tile, tid, target, already, need, expHours, dryHours, effSc, hasDropTask, isBigDrop, remaining, opts, activePlayers};
    }).filter(Boolean);
  }, [currentLine, tiles, done, tileTargets, assignees, teamPlayers, teamCap]);

  // Joint probability of completing all tiles at their targets
  const jointProb = useCallback((hours) => {
    if (!lineStats.length) return 0;
    return lineStats.reduce((p, ls) => {
      const tDone = new Set(ls.tile.tasks.filter(tk => done.has(tk.id)).map(tk => tk.id));
      return p * pGTarget(ls.tile, ls.target, tDone, hours, ls.effSc);
    }, 1);
  }, [lineStats, done]);

  const totalExp = lineStats.reduce((s,l) => s+l.expHours, 0);
  const totalDry = lineStats.reduce((s,l) => s+l.dryHours, 0);
  const tE = teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,'expected'),0);
  const tF = teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,'floor'),0);
  const bottleneck = lineStats.length ? lineStats.reduce((a,b)=>a.expHours>b.expHours?a:b) : null;
  const fragile = lineStats.filter(l => l.isBigDrop);

  // Already-completed tiles in this line
  const lineComplete = lineStats.filter(l => l.already >= l.target).length;
  const lineBingo = lineStats.length > 0 && lineStats.every(l => l.already >= 1); // any bronze = bingo entry

  const timepoints = [20,40,60,80,120,168,Math.round(EVENT_HOURS_WALL)];

  const medalColor = m => m===3?'#ffd700':m===2?'#c0c0c0':'#cd7f32';
  const medalLabel = m => m===3?'G':m===2?'S':'B';
  const sb = (a,c) => ({fontSize:9,padding:"2px 8px",borderRadius:3,cursor:"pointer",fontWeight:a?700:400,background:a?`${c}22`:"rgba(255,255,255,0.02)",border:`1px solid ${a?c+"55":"rgba(255,255,255,0.05)"}`,color:a?c:"#555",fontFamily:"inherit"});

  return <div>
    {/* Line selector */}
    <div style={{marginBottom:10}}>
      <div style={{fontSize:8,color:"#444",letterSpacing:1,fontWeight:600,marginBottom:5}}>SELECT LINE</div>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {BOARD_LINES.map(line => {
          const comp = line.tiles.filter(tid => {
            const t = tiles.find(x=>x.id===tid);
            return t && t.tasks.filter(tk=>done.has(tk.id)).length >= 1;
          }).length;
          const full = line.tiles.filter(tid => {
            const t = tiles.find(x=>x.id===tid);
            return t && t.tasks.filter(tk=>done.has(tk.id)).length >= 3;
          }).length;
          const isSel = selLine === line.key;
          return <button key={line.key} onClick={()=>setSelLine(line.key)} style={{...sb(isSel,'#ffd700'),position:'relative',paddingBottom:14}}>
            <div>{line.name}</div>
            <div style={{fontSize:6,color:isSel?'#ffd700aa':'#333',marginTop:1}}>{comp}/5 started · {full}/5 gold</div>
          </button>;
        })}
      </div>
    </div>

    {currentLine && <div>
      {/* Summary bar */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,padding:"7px 10px",background:"rgba(0,0,0,0.2)",borderRadius:5,border:"1px solid rgba(255,215,0,0.08)"}}>
        {[
          {l:"Line",v:currentLine.name,c:"#ffd700"},
          {l:"Exp total",v:Math.round(totalExp)+"h",c:totalExp<=tE?"#4ade80":"#ff6b6b"},
          {l:"Dry (90%)",v:Math.round(totalDry)+"h",c:totalDry<=tE?"#ffd700":"#ff8c00"},
          {l:"Fits?",v:totalExp<=tF?"✓ floor":totalExp<=tE?"✓ exp":"⚠ tight",c:totalExp<=tF?"#4ade80":totalExp<=tE?"#ffd700":"#ff6b6b"},
          {l:"P(all) @ end",v:(jointProb(EVENT_HOURS_WALL)*100).toFixed(0)+"%",c:jointProb(EVENT_HOURS_WALL)>0.7?"#4ade80":jointProb(EVENT_HOURS_WALL)>0.4?"#ffd700":"#ff6b6b"},
          {l:"Tiles done",v:`${lineComplete}/${lineStats.length}`,c:"#aaa"},
        ].map((s,i)=><div key={i} style={{textAlign:"center",minWidth:60}}>
          <div style={{fontSize:7,color:"#444"}}>{s.l}</div>
          <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
        </div>)}
      </div>

      {/* Warnings */}
      {bottleneck && <div style={{fontSize:8,color:"#ff8c00",marginBottom:6,padding:"4px 8px",background:"rgba(255,140,0,0.06)",borderRadius:3,border:"1px solid rgba(255,140,0,0.15)"}}>
        ⚠ Bottleneck: <b>{bottleneck.tile.name}</b> ({Math.round(bottleneck.expHours)}h expected)
        {fragile.length>0&&<span style={{marginLeft:8,color:"#ff6b6b"}}>💀 High-variance: {fragile.map(f=>f.tile.name).join(", ")}</span>}
      </div>}

      {/* Per-tile breakdown */}
      <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
        {lineStats.map(ls => {
          const tDone = new Set(ls.tile.tasks.filter(tk=>done.has(tk.id)).map(tk=>tk.id));
          const isDone = ls.already >= ls.target;
          const isBottleneck = bottleneck?.tid === ls.tid;
          // Capable players for this tile's category
          const capable = teamPlayers.filter(p => {
            if(ls.tile.cat==='raids') return (p.tob+p.cox+p.toa)>150||(p.inferno+p.colo)>0;
            if(ls.tile.cat==='slayer') return p.slayer>=80;
            if(ls.tile.cat==='pvm') return p.combat>=110;
            return true;
          }).sort((a,b)=>b.secs-a.secs);
          const curAssigned = assignees[ls.tid] || new Set();
          const togglePlayer = (name) => setAssignees(prev => {
            const cur = new Set(prev[ls.tid]||[]);
            if(cur.has(name)) cur.delete(name); else cur.add(name);
            return {...prev, [ls.tid]: cur};
          });

          return <div key={ls.tid} style={{background:isDone?"rgba(74,222,128,0.04)":isBottleneck?"rgba(255,140,0,0.04)":"rgba(255,255,255,0.01)",borderRadius:5,border:`1px solid ${isDone?"rgba(74,222,128,0.12)":isBottleneck?"rgba(255,140,0,0.2)":"rgba(255,255,255,0.04)"}`,padding:"7px 9px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <div style={{width:5,height:5,borderRadius:1,background:CC[ls.tile.cat],flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:700,color:isDone?"#4ade80":"#bbb"}}>
                {isDone?"✓ ":""}{ls.tile.name}
              </span>
              <span style={{fontSize:8,color:"#444"}}>#{ls.tid}</span>
              {isBottleneck&&<span style={{fontSize:7,color:"#ff8c00",background:"rgba(255,140,0,0.1)",padding:"0 4px",borderRadius:2}}>BOTTLENECK</span>}
              {ls.isBigDrop&&<span style={{fontSize:7,color:"#ff6b6b",background:"rgba(255,107,107,0.1)",padding:"0 4px",borderRadius:2}}>HIGH VAR</span>}
              <div style={{marginLeft:"auto",display:"flex",gap:3}}>
                {ls.opts.map(o=><button key={o.medal} onClick={()=>setTileTargets(p=>({...p,[ls.tid]:o.medal}))} disabled={o.done} style={{fontSize:8,padding:"1px 6px",borderRadius:2,cursor:o.done?"default":"pointer",fontWeight:ls.target===o.medal?800:400,background:ls.target===o.medal?`${medalColor(o.medal)}22`:"rgba(255,255,255,0.02)",border:`1px solid ${ls.target===o.medal?medalColor(o.medal)+"55":"rgba(255,255,255,0.05)"}`,color:o.done?"#444":medalColor(o.medal),fontFamily:"inherit",opacity:o.done?0.4:1}}>
                  {medalLabel(o.medal)} {o.done?"✓":Math.round(o.hours)+"h"}
                </button>)}
              </div>
            </div>

            {!isDone && <div style={{display:"flex",gap:8,fontSize:8,color:"#555",marginBottom:4}}>
              <span>Exp: <b style={{color:"#ffd700"}}>{Math.round(ls.expHours)}h</b></span>
              <span>Dry: <b style={{color:"#ff8c00"}}>{Math.round(ls.dryHours)}h</b></span>
              <span style={{color:"#444"}}>×{ls.effSc.toFixed(1)} scale · {ls.need} task{ls.need!==1?"s":""} needed</span>
              {ls.remaining.slice(0,ls.need).map(t=><span key={t.id} style={{color:t.wikiEnriched?"#60a5fa":"#555"}}>
                {t.wikiEnriched?"🌐":""}{t.desc} ({t.estHours.toFixed(1)}h)
              </span>)}
            </div>}

            {/* Player assignment */}
            {!isDone && <div>
              <div style={{fontSize:7,color:"#333",marginBottom:2}}>Assign players ({curAssigned.size>0?curAssigned.size+" selected":"all team"}):</div>
              <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                {capable.slice(0,12).map(p=>{
                  const isSel=curAssigned.has(p.name);
                  const cap=deriveCapability(p);
                  const capVal=ls.tile.cat==='raids'?cap.raidPower:ls.tile.cat==='pvm'?cap.pvmPower:ls.tile.cat==='slayer'?cap.slayerPower:cap.skillPower;
                  const cc=capVal>1.1?"#4ade80":capVal>0.8?"#ffd700":"#ff6b6b";
                  return <button key={p.name} onClick={()=>togglePlayer(p.name)} style={{fontSize:7,padding:"1px 5px",borderRadius:2,cursor:"pointer",background:isSel?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.02)",border:`1px solid ${isSel?"#60a5fa55":"rgba(255,255,255,0.04)"}`,color:isSel?"#60a5fa":"#555",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                    <span style={{color:cc}}>●</span> {p.name.split(" ")[0]}
                  </button>;
                })}
                {capable.length>12&&<span style={{fontSize:7,color:"#333",alignSelf:"center"}}>+{capable.length-12} more</span>}
                {curAssigned.size>0&&<button onClick={()=>setAssignees(p=>({...p,[ls.tid]:new Set()}))} style={{fontSize:7,padding:"1px 5px",borderRadius:2,cursor:"pointer",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.15)",color:"#ff6b6b",fontFamily:"inherit"}}>clear</button>}
              </div>
            </div>}
          </div>;
        })}
      </div>

      {/* Joint probability over time */}
      <div style={{background:"rgba(0,0,0,0.15)",borderRadius:5,padding:"8px 10px",border:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{fontSize:8,color:"#444",letterSpacing:1,fontWeight:600,marginBottom:6}}>P(COMPLETE ALL TILES) OVER TIME</div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {timepoints.map(h => {
            const p = jointProb(h);
            const isEnd = h === Math.round(EVENT_HOURS_WALL);
            return <div key={h} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:28,fontSize:8,color:isEnd?"#ffd700":"#555",textAlign:"right",fontWeight:isEnd?700:400,flexShrink:0}}>{isEnd?"END":h+"h"}</div>
              <div style={{flex:1,height:14,background:"rgba(255,255,255,0.03)",borderRadius:2,overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",left:0,top:0,height:"100%",width:(p*100)+"%",background:p>0.7?"rgba(74,222,128,0.4)":p>0.4?"rgba(255,215,0,0.4)":"rgba(255,107,107,0.4)",borderRadius:2,transition:"width 0.4s"}}/>
                <div style={{position:"absolute",right:4,top:0,height:"100%",display:"flex",alignItems:"center",fontSize:8,fontWeight:700,color:p>0.7?"#4ade80":p>0.4?"#ffd700":"#ff6b6b"}}>{(p*100).toFixed(0)}%</div>
              </div>
            </div>;
          })}
        </div>
        {totalExp > 0 && <div style={{marginTop:6,display:"flex",gap:10,fontSize:7,color:"#444"}}>
          <span>Expected hrs: <b style={{color:"#ffd700"}}>{Math.round(totalExp)}h</b></span>
          <span>Dry scenario: <b style={{color:"#ff8c00"}}>{Math.round(totalDry)}h</b></span>
          <span>Team exp: <b style={{color:"#4ade80"}}>{Math.round(tE)}h</b></span>
        </div>}
      </div>
    </div>}
  </div>;
}

// ─── WHO'S ONLINE ─────────────────────────────────────────────────────────────
function WhosOnline({done, tiles, teamPlayers, teamCap}) {
  const [online, setOnline] = useState(new Set());
  const [sort, setSort] = useState("smart");

  const toggle = name => setOnline(p => {
    const n = new Set(p);
    if(n.has(name)) n.delete(name); else n.add(name);
    return n;
  });
  const selectAll = () => setOnline(new Set(teamPlayers.map(p=>p.name)));
  const clearAll = () => setOnline(new Set());

  const activePlayers = useMemo(() =>
    online.size > 0 ? teamPlayers.filter(p => online.has(p.name)) : teamPlayers
  , [online, teamPlayers]);

  const activeCap = useMemo(() => teamCapability(activePlayers), [activePlayers]);

  const met = useMemo(() => {
    // Build task counts per tile
    const tileTaskCounts = {};
    tiles.forEach(t => {
      tileTaskCounts[t.id] = t.tasks.filter(tk => done.has(tk.id)).length;
    });
    
    return tiles.map(tile => {
      const dc = tileTaskCounts[tile.id];
      const tsDone = new Set(tile.tasks.filter(tk=>done.has(tk.id)).map(tk=>tk.id));
      const rem = remS(tile, tsDone);
      const effSc = effectiveScale(tile.cat, activePlayers.length, activeCap);
      const eH = rem.reduce((s,t)=>s+t.estHours,0) / effSc;
      const cheapest = rem.length > 0 ? rem[0] : null;
      const cheapH = cheapest ? cheapest.estHours/effSc : Infinity;
      
      // Calculate marginal points from completing this tile
      const tasksNeeded = 3 - dc;
      const mP = tasksNeeded > 0 ? getMarginalPoints(tile.id, dc, tasksNeeded, tileTaskCounts) : 0;
      
      // Line score (simplified - just count near-completion lines)
      let lS = 0;
      LINES.filter(l=>l.tiles.includes(tile.id)).forEach(line=>{
        const otherComplete = line.tiles.filter(t=>t!==tile.id && tileTaskCounts[t]>=3).length;
        if(otherComplete===4){lS+=200;}else if(otherComplete===3){lS+=30;}else if(otherComplete===2)lS+=5;
      });
      
      const ef=eH>0?(mP)/eH:0;
      const sm=eH>0?(ef*10)+(lS*0.3)+(mP*0.5)-(eH*0.1):0;

      // Can current online players actually do this tile?
      const canDo = activePlayers.some(p => {
        if(tile.cat==='raids') return (p.tob+p.cox+p.toa)>150||(p.inferno+p.colo)>0;
        if(tile.cat==='slayer') return p.slayer>=80;
        if(tile.cat==='pvm') return p.combat>=110;
        return true;
      });

      return {...tile,dc,rem,eH,cheapest,cheapH,lS,mP,ef,sm,effSc,canDo};
    });
  }, [done,tiles,activePlayers,activeCap]);

  const pri = useMemo(() =>
    [...met.filter(t=>t.dc<3 && t.canDo)]
      .sort((a,b)=>sort==="smart"?b.sm-a.sm:sort==="fast"?a.cheapH-b.cheapH:sort==="value"?b.mP-a.mP:b.lS-a.lS)
  , [met, sort]);

  const blocked = met.filter(t => t.dc < 3 && !t.canDo);
  const sorted = [...teamPlayers].sort((a,b) => b.secs-a.secs);
  const sb = (a,c) => ({fontSize:9,padding:"2px 8px",borderRadius:3,cursor:"pointer",fontWeight:a?700:400,background:a?`${c}22`:"rgba(255,255,255,0.02)",border:`1px solid ${a?c+"55":"rgba(255,255,255,0.05)"}`,color:a?c:"#555",fontFamily:"inherit"});

  return <div>
    {/* Player checklist */}
    <div style={{marginBottom:10,background:"rgba(0,0,0,0.2)",borderRadius:5,padding:"8px 10px",border:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:9,fontWeight:700,color:"#ffd700",letterSpacing:1}}>WHO'S ONLINE</span>
        <span style={{fontSize:8,color:"#444"}}>{online.size > 0 ? online.size+" selected":"all team"}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button onClick={selectAll} style={sb(false,"#4ade80")}>All</button>
          <button onClick={clearAll} style={sb(false,"#ff6b6b")}>None</button>
        </div>
      </div>
      <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
        {sorted.map(p => {
          const isSel = online.has(p.name);
          const cap = deriveCapability(p);
          const isRaider = (p.tob+p.cox+p.toa)>150||(p.inferno+p.colo)>0;
          const isElite = (p.inferno+p.colo)>3;
          return <button key={p.name} onClick={()=>toggle(p.name)} style={{
            fontSize:8,padding:"3px 7px",borderRadius:3,cursor:"pointer",
            background:isSel?"rgba(96,165,250,0.12)":"rgba(255,255,255,0.015)",
            border:`1px solid ${isSel?"#60a5fa55":"rgba(255,255,255,0.04)"}`,
            color:isSel?"#60a5fa":"#555",fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:3
          }}>
            {isElite&&<span style={{color:"#ffd700",fontSize:7}}>★</span>}
            {isRaider&&!isElite&&<span style={{color:"#e74c3c",fontSize:7}}>⚔</span>}
            <span>{p.name}</span>
            <span style={{fontSize:7,color:isSel?"#60a5fa88":"#333"}}>{p.hours}h</span>
          </button>;
        })}
      </div>
      {online.size > 0 && <div style={{marginTop:5,display:"flex",gap:8,fontSize:7,color:"#444"}}>
        <span>Total hrs/day: <b style={{color:"#ffd700"}}>{activePlayers.reduce((s,p)=>s+p.hours,0)}</b></span>
        <span>Avg SECS: <b style={{color:"#ffd700"}}>{Math.round(activePlayers.reduce((s,p)=>s+p.secs,0)/activePlayers.length)}</b></span>
        <span>Raiders: <b style={{color:"#e74c3c"}}>{activePlayers.filter(p=>(p.tob+p.cox+p.toa)>150).length}</b></span>
      </div>}
    </div>

    {/* Sort controls */}
    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
      <span style={{fontSize:8,color:"#444"}}>Sort:</span>
      {[["smart","Smart"],["fast","Fastest"],["value","Value"],["line","Line"]].map(([k,l])=>
        <button key={k} onClick={()=>setSort(k)} style={sb(sort===k,"#60a5fa")}>{l}</button>
      )}
      {online.size>0&&<span style={{marginLeft:"auto",fontSize:8,color:"#60a5fa"}}>Showing {activePlayers.length} player view</span>}
    </div>

    {/* Priority list */}
    {pri.length > 0 ? <div style={{background:"rgba(0,0,0,0.15)",borderRadius:5,overflow:"hidden",border:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{display:"grid",gridTemplateColumns:"20px 1fr 50px 50px 60px",padding:"5px 8px",background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        {["#","Tile","Hours","Score","Best Next"].map((h,i)=><div key={i} style={{fontSize:7,color:"#444",fontWeight:600,textAlign:i>1?"center":"left"}}>{h}</div>)}
      </div>
      <div style={{maxHeight:380,overflowY:"auto"}}>
        {pri.map((tile,idx) => {
          const pc = tile.sm>15?"#4ade80":tile.sm>5?"#ffd700":"#555";
          return <div key={tile.id} style={{display:"grid",gridTemplateColumns:"20px 1fr 50px 50px 60px",padding:"6px 8px",borderBottom:"1px solid rgba(255,255,255,0.025)",background:idx%2===0?"rgba(255,255,255,0.005)":"transparent"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,215,0,0.03)"}
            onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"rgba(255,255,255,0.005)":"transparent"}>
            <div style={{fontSize:9,color:idx<3?"#ff5555":idx<7?"#ff8c00":"#333",fontWeight:idx<3?700:400}}>{idx+1}</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:5,height:5,borderRadius:1,background:CC[tile.cat],flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:600,color:"#bbb"}}>{tile.name}</span>
                {tile.lS>100&&<span style={{fontSize:7,color:"#ff5555",fontWeight:700}}>LINE</span>}
              </div>
              <div style={{fontSize:7,color:"#444"}}>{CAT_LABEL[tile.cat]} · ×{tile.effSc.toFixed(1)} · {3-tile.dc} tasks left</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#aaa"}}>{tile.eH<1?"<1":Math.round(tile.eH)}h</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:pc}}>{tile.sm.toFixed(1)}</div>
            </div>
            <div style={{paddingLeft:4}}>
              {tile.cheapest?<>
                <div style={{fontSize:9,color:"#ffd700",fontWeight:600,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tile.cheapest.desc}</div>
                <div style={{fontSize:7,color:"#444"}}>{tile.cheapH<1?"<1":tile.cheapH.toFixed(1)}h</div>
              </>:<div style={{fontSize:8,color:"#444"}}>—</div>}
            </div>
          </div>;
        })}
      </div>
    </div> : <div style={{fontSize:9,color:"#444",fontStyle:"italic",padding:8}}>No doable tiles for current online players.</div>}

    {blocked.length > 0 && <div style={{marginTop:6,fontSize:7,color:"#333"}}>
      Tiles requiring players not online: {blocked.map(t=>t.name).join(", ")}
    </div>}
  </div>;
}

function TeamRoles({done,tiles,teamPlayers,teamCap}){
  const[filterCat,setFilterCat]=useState("all");
  const[sortBy,setSortBy]=useState("pph");
  const tileData=useMemo(()=>{
    const tileTaskCounts = {};
    tiles.forEach(t => {
      tileTaskCounts[t.id] = t.tasks.filter(tk => done.has(tk.id)).length;
    });
    
    return tiles.filter(t=>tileTaskCounts[t.id]<3).map(tile=>{
      const dc=tileTaskCounts[tile.id],doneTasks=new Set(tile.tasks.filter(tk=>done.has(tk.id)).map(tk=>tk.id));
      const remaining=remS(tile,doneTasks),effSc=effectiveScale(tile.cat,teamPlayers.length,teamCap);
      const needCount=3-dc;let hoursToGold=0;
      for(let j=0;j<needCount&&j<remaining.length;j++)hoursToGold+=remaining[j].estHours/effSc;
      
      // Calculate marginal points
      const mPts = getMarginalPoints(tile.id, dc, needCount, tileTaskCounts);
      
      let lineVal=0;LINES.filter(l=>l.tiles.includes(tile.id)).forEach(line=>{const og=line.tiles.filter(t=>t!==tile.id&&tileTaskCounts[t]>=3).length;if(og===4)lineVal+=45;else if(og===3)lineVal+=13.5;});
      const pphFull=hoursToGold>0?(mPts+lineVal)/hoursToGold:0,nextTask=remaining[0]||null,nextHours=nextTask?nextTask.estHours/effSc:0;
      const totalTaskHrs=remaining.slice(0,needCount).reduce((s,t)=>s+t.estHours,0);
      const tF=teamCategoryHours(teamPlayers,tile.cat,"floor"),tE=teamCategoryHours(teamPlayers,tile.cat,"expected");
      return{...tile,dc,hoursToGold,pphFull,lineVal,mPts,effSc,nextTask,nextHours,remaining,totalTaskHrs,fitsFloor:tF>=totalTaskHrs,fitsExp:tE>=totalTaskHrs};
    }).sort((a,b)=>sortBy==="pph"?b.pphFull-a.pphFull:sortBy==="fast"?a.hoursToGold-b.hoursToGold:b.lineVal-a.lineVal);
  },[done,tiles,teamPlayers,teamCap,sortBy]);

  const catSummary=useMemo(()=>Object.entries(CAT_LABEL).map(([cat,label])=>{
    const ct=tileData.filter(t=>t.cat===cat);if(!ct.length)return null;
    const tF=teamCategoryHours(teamPlayers,cat,"floor"),tE=teamCategoryHours(teamPlayers,cat,"expected"),tC=teamCategoryHours(teamPlayers,cat,"ceiling");
    const needed=ct.reduce((s,t)=>s+t.totalTaskHrs,0),pct=Math.min(1,needed/Math.max(tE,1)),mult=teamCap[cat]||1.0;
    return{cat,label,count:ct.length,tF,tE,tC,needed,pct,mult,status:pct>0.9?"⚠ Tight":pct>0.6?"→ Moderate":"✓ Easy"};
  }).filter(Boolean),[tileData,teamPlayers,teamCap]);

  const filtered=filterCat==="all"?tileData:tileData.filter(t=>t.cat===filterCat);
  const cats=["all",...new Set(tileData.map(t=>t.cat))];
  const sb=(a,c)=>({fontSize:10,padding:"3px 10px",borderRadius:3,cursor:"pointer",fontWeight:a?700:400,background:a?`${c}22`:"rgba(255,255,255,0.02)",border:`1px solid ${a?c+"55":"rgba(255,255,255,0.06)"}`,color:a?c:"#555"});

  return <div>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:9,color:"#444",letterSpacing:1,fontWeight:600,marginBottom:6}}>TEAM CAPABILITY BY CATEGORY</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
        {catSummary.map(r=>{const bc=r.pct>0.9?"#ff6b6b":r.pct>0.6?"#ffd700":"#4ade80",mc=r.mult>1.1?"#4ade80":r.mult>0.85?"#ffd700":"#ff6b6b";
        return <div key={r.cat} style={{background:"rgba(0,0,0,0.2)",borderRadius:5,padding:"7px 9px",border:`1px solid ${CC[r.cat]}22`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}><span style={{fontSize:9,fontWeight:700,color:CC[r.cat]}}>{r.label}</span><span style={{fontSize:8,color:bc,fontWeight:600}}>{r.status}</span></div>
          <div style={{display:"flex",gap:6,marginBottom:4,fontSize:7,color:"#444"}}><span>{r.count} tiles</span><span style={{color:mc}}>×{r.mult.toFixed(2)} efficiency</span></div>
          <div style={{height:5,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:(r.pct*100)+"%",background:bc,transition:"width 0.4s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:2,fontSize:7,color:"#333"}}><span>{Math.round(r.needed)}h needed</span><span style={{color:"#ffd700"}}>{Math.round(r.tE)}h exp / {Math.round(r.tC)}h max</span></div>
        </div>;})}
      </div>
    </div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{cats.map(cat=><button key={cat} onClick={()=>setFilterCat(cat)} style={sb(filterCat===cat,cat==="all"?"#888":CC[cat])}>{cat==="all"?"All":CAT_LABEL[cat]||cat}</button>)}</div>
      <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:8,color:"#444"}}>Sort:</span>{[["pph","Pts/hr"],["fast","Fastest"],["line","Line val"]].map(([k,l])=><button key={k} onClick={()=>setSortBy(k)} style={sb(sortBy===k,"#60a5fa")}>{l}</button>)}</div>
    </div>
    <div style={{background:"rgba(0,0,0,0.15)",borderRadius:5,overflow:"hidden",border:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{display:"grid",gridTemplateColumns:"20px 1fr 55px 55px 55px 55px 70px",padding:"5px 8px",background:"rgba(255,255,255,0.025)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        {["#","Tile","Wall-clk","Pts/hr","Line+","Fits?","Best Next"].map((h,i)=><div key={i} style={{fontSize:7,color:"#444",fontWeight:600,textAlign:i>1?"center":"left"}}>{h}</div>)}
      </div>
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {filtered.map((tile,idx)=>{const pc=tile.pphFull>0.8?"#4ade80":tile.pphFull>0.4?"#ffd700":"#ff6b6b",fc=tile.fitsFloor?"#4ade80":tile.fitsExp?"#ffd700":"#ff6b6b",fl=tile.fitsFloor?"✓floor":tile.fitsExp?"~exp":"⚠tight";
        return <div key={tile.id} style={{display:"grid",gridTemplateColumns:"20px 1fr 55px 55px 55px 55px 70px",padding:"6px 8px",borderBottom:"1px solid rgba(255,255,255,0.025)",background:idx%2===0?"rgba(255,255,255,0.005)":"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,215,0,0.03)"}
          onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"rgba(255,255,255,0.005)":"transparent"}>
          <div style={{fontSize:9,color:"#333"}}>{idx+1}</div>
          <div><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:5,height:5,borderRadius:1,background:CC[tile.cat],flexShrink:0}}/><span style={{fontSize:10,fontWeight:700,color:"#bbb"}}>{tile.name}</span></div><div style={{fontSize:7,color:"#333"}}>{CAT_LABEL[tile.cat]} ×{tile.effSc.toFixed(1)}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:"#aaa"}}>{tile.hoursToGold<1?"<1":Math.round(tile.hoursToGold)}h</div><div style={{fontSize:7,color:"#333"}}>{3-tile.dc} tasks</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:11,fontWeight:800,color:pc}}>{tile.pphFull.toFixed(2)}</div><div style={{fontSize:7,color:"#333"}}>pts/hr</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:tile.lineVal>0?"#60a5fa":"#333"}}>{tile.lineVal>0?"+"+Math.round(tile.lineVal):"—"}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:9,fontWeight:700,color:fc}}>{fl}</div></div>
          <div style={{paddingLeft:4}}>{tile.nextTask?<><div style={{fontSize:9,color:"#ffd700",fontWeight:600,lineHeight:1.2}}>⭐ {tile.nextTask.desc}</div><div style={{fontSize:7,color:"#444"}}>{tile.nextHours<1?"<1":tile.nextHours.toFixed(1)}h</div></>:<div style={{fontSize:8,color:"#444"}}>—</div>}</div>
        </div>;})}
      </div>
    </div>
    <div style={{marginTop:5,fontSize:7,color:"#333"}}>Wall-clk = wall-clock hrs (team-scaled by SECS capability). Fits = vs team player-hours for that category over the event.</div>
  </div>;
}

function TeamCompare(){
  const cats=["raids","pvm","slayer","skilling","mass"];
  const teamData=useMemo(()=>Object.entries(TEAMS).map(([name,players])=>{
    const cap=teamCapability(players);
    const avgSecs=players.reduce((s,p)=>s+p.secs,0)/players.length;
    const totalExpHrs=players.reduce((s,p)=>s+playerEventHours(p.hours,'expected'),0);
    const totalFloorHrs=players.reduce((s,p)=>s+playerEventHours(p.hours,'floor'),0);
    const elites=players.filter(p=>(p.inferno+p.colo)>0);
    const raiders=players.filter(p=>(p.tob+p.cox+p.toa)>150||(p.inferno+p.colo)>0);
    const topRaidKC=players.reduce((s,p)=>s+(p.tob*1.0+p.cox*0.8+p.toa*0.5),0);
    const catHrs=cats.reduce((o,c)=>({...o,[c]:teamCategoryHours(players,c,'expected')}),{});
    return{name,players,cap,avgSecs,totalExpHrs,totalFloorHrs,elites,raiders,topRaidKC,catHrs};
  }),[]);

  const maxSecs=Math.max(...teamData.map(t=>t.avgSecs));
  const maxHrs=Math.max(...teamData.map(t=>t.totalExpHrs));
  const maxRaid=Math.max(...teamData.map(t=>t.topRaidKC));
  const CAT_CAPS={raids:1.5,pvm:1.4,slayer:1.3,skilling:1.3,mass:1.4};

  const Row=({label,vals,maxV,fmt,color})=><div style={{display:"grid",gridTemplateColumns:`110px repeat(${teamData.length},1fr)`,gap:0,marginBottom:2,alignItems:"center"}}>
    <div style={{fontSize:8,color:"#444",fontWeight:600,paddingRight:6,textAlign:"right"}}>{label}</div>
    {vals.map((v,i)=>{const tc2=TEAM_COLORS[teamData[i].name]||"#ffd700";const pct=Math.min(1,v/Math.max(maxV,1));return <div key={i} style={{padding:"2px 4px"}}>
      <div style={{height:14,background:"rgba(255,255,255,0.03)",borderRadius:2,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:(pct*100)+"%",background:(color||tc2)+"55",borderRadius:2,transition:"width 0.4s"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:color||tc2}}>{fmt(v)}</div>
      </div>
    </div>;})}
  </div>;

  return <div>
    <div style={{display:"grid",gridTemplateColumns:`110px repeat(${teamData.length},1fr)`,gap:0,marginBottom:8}}>
      <div/>
      {teamData.map(t=>{const tc2=TEAM_COLORS[t.name]||"#ffd700";return <div key={t.name} style={{padding:"4px 4px",textAlign:"center"}}>
        <div style={{fontSize:10,fontWeight:800,color:tc2,marginBottom:1}}>{t.name}{t.name==="SoccerTheNub"?" ★":""}</div>
        <div style={{fontSize:7,color:"#444"}}>{t.players.length} players</div>
      </div>;})}
    </div>

    <div style={{marginBottom:10}}>
      <div style={{fontSize:8,color:"#555",letterSpacing:1,fontWeight:600,marginBottom:4}}>OVERALL STRENGTH</div>
      <Row label="Avg SECS" vals={teamData.map(t=>t.avgSecs)} maxV={maxSecs} fmt={v=>Math.round(v)}/>
      <Row label="Exp hrs (event)" vals={teamData.map(t=>t.totalExpHrs)} maxV={maxHrs} fmt={v=>Math.round(v)+"h"} color="#4ade80"/>
      <Row label="Floor hrs" vals={teamData.map(t=>t.totalFloorHrs)} maxV={maxHrs} fmt={v=>Math.round(v)+"h"} color="#ff6b6b"/>
      <Row label="Elite players" vals={teamData.map(t=>t.elites.length)} maxV={Math.max(...teamData.map(t=>t.elites.length))} fmt={v=>v} color="#ffd700"/>
      <Row label="Raid-capable" vals={teamData.map(t=>t.raiders.length)} maxV={Math.max(...teamData.map(t=>t.raiders.length))} fmt={v=>v} color="#e74c3c"/>
      <Row label="Raid KC weight" vals={teamData.map(t=>t.topRaidKC)} maxV={maxRaid} fmt={v=>Math.round(v/1000)+"k"} color="#e74c3c"/>
    </div>

    <div style={{marginBottom:10}}>
      <div style={{fontSize:8,color:"#555",letterSpacing:1,fontWeight:600,marginBottom:4}}>CATEGORY EFFICIENCY MULTIPLIER</div>
      {cats.map(cat=><Row key={cat} label={CAT_LABEL[cat]+" ×"} vals={teamData.map(t=>t.cap[cat]||1)} maxV={CAT_CAPS[cat]} fmt={v=>v.toFixed(2)+"×"} color={CC[cat]}/>)}
    </div>

    <div>
      <div style={{fontSize:8,color:"#555",letterSpacing:1,fontWeight:600,marginBottom:4}}>CATEGORY PLAYER-HOURS (EXPECTED)</div>
      {cats.map(cat=>{const maxCH=Math.max(...teamData.map(t=>t.catHrs[cat]));return <Row key={cat} label={CAT_LABEL[cat]} vals={teamData.map(t=>t.catHrs[cat])} maxV={maxCH} fmt={v=>Math.round(v)+"h"} color={CC[cat]}/>;
      })}
    </div>

    <div style={{marginTop:10,background:"rgba(0,0,0,0.2)",borderRadius:5,padding:"8px 10px",border:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:8,color:"#444",letterSpacing:1,fontWeight:600,marginBottom:6}}>TOP PLAYERS BY TEAM</div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${teamData.length},1fr)`,gap:6}}>
        {teamData.map(t=>{const tc2=TEAM_COLORS[t.name]||"#ffd700";const top=[...t.players].sort((a,b)=>b.secs-a.secs).slice(0,5);
        return <div key={t.name}>
          <div style={{fontSize:8,fontWeight:700,color:tc2,marginBottom:3,borderBottom:`1px solid ${tc2}22`,paddingBottom:2}}>{t.name}</div>
          {top.map(p=><div key={p.name} style={{fontSize:7,color:"#666",marginBottom:1,display:"flex",justifyContent:"space-between"}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"75%"}}>{p.name}</span>
            <span style={{color:tc2,flexShrink:0}}>{p.secs}</span>
          </div>)}
        </div>;})}
      </div>
    </div>
  </div>;
}

export default function App(){
  const[selectedTeam,setSelectedTeam]=useState("SoccerTheNub");
  const[done,setDone]=useState(new Set());
  const[selT,setSelT]=useState(null);
  const[sort,setSort]=useState("smart");
  const[hlL,setHlL]=useState(null);
  const[tab,setTab]=useState("scenarios");
  const[tiles,setTiles]=useState(INIT_TILES.map(t=>({...t,tasks:t.tasks.map(tk=>({...tk}))})));
  const[editing,setEditing]=useState(false);

  // Wiki enrichment enabled
  const {wikiData, enriching, enrichProgress, enrichTask, enrichAll, clearAll} = useWikiData(tiles, setTiles);

  const teamPlayers=useMemo(()=>TEAMS[selectedTeam]||[],[selectedTeam]);
  const teamCap=useMemo(()=>teamCapability(teamPlayers),[teamPlayers]);
  const tSz=teamPlayers.length;

  const toggleDone=useCallback(taskId=>{setDone(p=>{const n=new Set(p);if(n.has(taskId))n.delete(taskId);else n.add(taskId);return n;});},[]);
  const saveTile=useCallback(u=>{setTiles(p=>p.map(t=>t.id===u.id?u:t));setEditing(false);},[]);

  const met=useMemo(()=>{
    const tileTaskCounts = {};
    tiles.forEach(t => {
      tileTaskCounts[t.id] = t.tasks.filter(tk => done.has(tk.id)).length;
    });
    
    return tiles.map(tile=>{
      const dc=tileTaskCounts[tile.id],tsDone=new Set(tile.tasks.filter(tk=>done.has(tk.id)).map(tk=>tk.id));
      const rem=remS(tile,tsDone),rH=rem.reduce((s,t)=>s+t.estHours,0);
      const effSc=effectiveScale(tile.cat,tSz,teamCap),eH=rH/effSc;
      const cheapest=rem.length>0?rem[0]:null,cheapH=cheapest?cheapest.estHours/effSc:Infinity;
      let lS=0,nL=[];
      LINES.filter(l=>l.tiles.includes(tile.id)).forEach(line=>{const og=line.tiles.filter(t=>t!==tile.id&&tileTaskCounts[t]>=3).length;if(og===4){lS+=200;nL.push({...line,need:1});}else if(og===3){lS+=30;nL.push({...line,need:2});}else if(og===2)lS+=5;});
      
      // Calculate marginal points
      const tasksNeeded = 3 - dc;
      const mP = tasksNeeded > 0 ? getMarginalPoints(tile.id, dc, tasksNeeded, tileTaskCounts) : 0;
      
      const ef=eH>0?(mP)/eH:0,sm=eH>0?(ef*10)+(lS*0.3)+(mP*0.5)-(eH*0.1):0;
      return{...tile,dc,rem,rH,eH,cheapest,cheapH,lS,nL,mP,ef,sm,effSc};
    });
  },[done,tSz,tiles,teamCap]);

  const pri=useMemo(()=>[...met.filter(t=>t.dc<3)].sort((a,b)=>sort==="smart"?b.sm-a.sm:sort==="fast"?a.cheapH-b.cheapH:sort==="value"?b.mP-a.mP:b.lS-a.lS),[met,sort]);
  
  const st=useMemo(()=>{
    const score = calculateScore(done, tiles);
    return{
      g: score.goldLines,
      tp: score.taskPoints,
      lp: score.bonusPoints,
      total: score.total,
      ld: score.bronzeLines + score.silverLines + score.goldLines,
      hl: met.reduce((s,t)=>s+t.eH,0),
      b: met.filter(t=>t.dc>=1).length,
      s: met.filter(t=>t.dc>=2).length
    };
  },[met,done,tiles]);

  const sel=selT?met.find(t=>t.id===selT):null;
  const hlTiles=hlL?LINES.find(l=>l.name===hlL)?.tiles||[]:[];
  const tc=TEAM_COLORS[selectedTeam]||"#ffd700";

  return <div style={{minHeight:"100vh",background:"#0b0e14",color:"#c8ccd4",fontFamily:"'JetBrains Mono','Fira Code','SF Mono',monospace",padding:14,boxSizing:"border-box"}}>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    <div style={{textAlign:"center",marginBottom:8}}>
      <div style={{fontSize:8,letterSpacing:4,color:"#444",textTransform:"uppercase"}}>Old School RuneScape</div>
      <h1 style={{fontSize:22,fontWeight:900,margin:"2px 0",letterSpacing:2,background:"linear-gradient(90deg,#cd7f32,#ffd700,#cd7f32)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>BINGO OPTIMIZER</h1>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,marginTop:4}}>
        <Countdown/>
        <button onClick={clearAll} style={{fontSize:7,background:"rgba(255,255,255,0.02)",color:"#333",border:"1px solid rgba(255,255,255,0.04)",borderRadius:2,padding:"1px 6px",cursor:"pointer",fontFamily:"inherit"}}>clear wiki cache</button>
      </div>
    </div>

    <div style={{marginBottom:8}}>
      <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap",marginBottom:6}}>
        {Object.entries(TEAMS).map(([name,players])=>{
          const tc2=TEAM_COLORS[name]||"#ffd700";
          const avgSecs=Math.round(players.reduce((s,p)=>s+p.secs,0)/players.length);
          const totalHrs=Math.round(players.reduce((s,p)=>s+playerEventHours(p.hours,'expected'),0));
          const elites=players.filter(p=>(p.inferno+p.colo)>0).length;
          const isMe=name==="SoccerTheNub";
          return <button key={name} onClick={()=>setSelectedTeam(name)} style={{
            padding:"6px 10px",borderRadius:4,cursor:"pointer",fontFamily:"inherit",
            background:selectedTeam===name?`${tc2}22`:"rgba(255,255,255,0.015)",
            border:`2px solid ${selectedTeam===name?tc2:tc2+"33"}`,
            color:selectedTeam===name?tc2:"#555",transition:"all 0.15s"
          }}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:1}}>{name}{isMe?" ★":""}</div>
            <div style={{display:"flex",gap:6,marginTop:2,fontSize:7,color:selectedTeam===name?tc2+"aa":"#444"}}>
              <span>SECS {avgSecs}</span>
              <span>{totalHrs}h</span>
              <span>🔥{elites}</span>
            </div>
          </button>;
        })}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",padding:"4px 8px"}}>
        <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#555"}}>Sort
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:"#151921",color:"#ddd",border:"1px solid #2a2f3a",borderRadius:3,padding:"2px 4px",fontSize:10}}>
            <option value="smart">Smart</option><option value="fast">Cheapest</option><option value="value">Value</option><option value="line">Line</option>
          </select>
        </label>
        <span style={{fontSize:8,color:"#333",alignSelf:"center"}}>{tSz} players · {Math.round(teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,'floor'),0))}h floor · {Math.round(teamPlayers.reduce((s,p)=>s+playerEventHours(p.hours,'expected'),0))}h expected</span>
      </div>
    </div>

    <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
      {[{l:"Pts",v:st.total,s:st.tp+"+"+st.lp,c:"#ffd700"},{l:"Gold",v:st.g+"/25",s:"S:"+st.s+" B:"+st.b,c:"#ffd700"},{l:"Lines",v:st.ld+"/12",s:"+"+st.lp,c:"#60a5fa"},{l:"Rem hrs",v:Math.round(st.hl)+"h",s:"team-scaled",c:"#f472b6"}].map((s,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:4,padding:"5px 9px",border:"1px solid rgba(255,255,255,0.04)",textAlign:"center",minWidth:70}}>
          <div style={{fontSize:7,color:"#444",letterSpacing:1}}>{s.l}</div><div style={{fontSize:15,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:7,color:"#333"}}>{s.s}</div>
        </div>
      ))}
    </div>

    <RosterPanel players={teamPlayers} teamCap={teamCap} enrichAll={enrichAll} enrichProgress={enrichProgress} tiles={tiles} wikiData={wikiData}/>

    <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",alignItems:"flex-start"}}>
      <div style={{flexShrink:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3,width:320}}>
          {tiles.map(tile=>{const m=met.find(t=>t.id===tile.id),rk=pri.findIndex(t=>t.id===tile.id),iS=selT===tile.id,iH=hlTiles.includes(tile.id);
          return <div key={tile.id} onClick={()=>{setSelT(tile.id===selT?null:tile.id);setEditing(false);}} style={{background:m.dc>=3?"rgba(255,215,0,0.07)":m.dc>=1?"rgba(205,127,50,0.04)":"rgba(255,255,255,0.01)",border:"2px solid "+(iS?"#ffd700":iH?"#60a5fa":m.dc>=3?"rgba(255,215,0,0.18)":"rgba(255,255,255,0.04)"),borderRadius:4,padding:"3px 2px",cursor:"pointer",textAlign:"center",minHeight:54,position:"relative",transition:"all 0.15s",transform:iS?"scale(1.05)":"scale(1)"}}>
            {rk>=0&&rk<5&&m.dc<3&&<div style={{position:"absolute",top:-3,right:-3,zIndex:2,width:13,height:13,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:900,color:"#000",background:rk===0?"#ff3333":rk<3?"#ff8800":"#ffcc00"}}>{rk+1}</div>}
            <div style={{position:"absolute",top:2,left:2,width:3,height:3,borderRadius:2,background:CC[tile.cat]}}/>
            <div style={{fontSize:7,color:"#444",fontWeight:600}}>#{tile.id}</div>
            <div style={{fontSize:8,fontWeight:700,color:m.dc>=3?"#ffd700":"#888",lineHeight:1.1,margin:"1px 0 2px"}}>{tile.name}</div>
            <Dots c={m.dc}/>
            <div style={{fontSize:6,color:"#333",marginTop:1}}>{m.dc>=3?"DONE":"~"+Math.round(m.eH)+"h"}</div>
          </div>;})}
        </div>
      </div>

      <div style={{flex:1,minWidth:240,maxWidth:420}}>
        {sel&&!editing&&<div style={{background:"rgba(255,255,255,0.02)",borderRadius:5,border:"1px solid rgba(255,215,0,0.1)",padding:8,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div><div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:7,padding:"1px 4px",borderRadius:2,background:CC[sel.cat],color:"#fff",fontWeight:700}}>{sel.cat}</span><span style={{fontSize:13,fontWeight:800,color:"#ffd700"}}>#{sel.id} {sel.name}</span></div><p style={{fontSize:8,color:"#444",margin:"1px 0 0"}}>{sel.notes}</p></div>
            <button onClick={()=>setEditing(true)} style={{fontSize:8,background:"rgba(96,165,250,0.12)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.3)",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontWeight:600}}>Edit</button>
          </div>
          {sel.tasks.map((task)=>{const isDone=done.has(task.id),isRec=sel.cheapest&&sel.cheapest.id===task.id&&!isDone;
          return <div key={task.id} style={{display:"flex",alignItems:"flex-start",gap:6,background:isDone?"rgba(74,222,128,0.04)":isRec?"rgba(255,215,0,0.04)":"rgba(255,255,255,0.005)",borderRadius:4,padding:"5px 6px",marginBottom:2,border:"1px solid "+(isDone?"rgba(74,222,128,0.12)":isRec?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.02)")}}>
            <div onClick={e=>{e.stopPropagation();toggleDone(task.id);}} style={{width:16,height:16,borderRadius:3,flexShrink:0,cursor:"pointer",marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid "+(isDone?"#4ade80":isRec?"#ffd700":"#333"),background:isDone?"rgba(74,222,128,0.2)":"transparent",fontSize:10,color:"#4ade80",fontWeight:900}}>{isDone?"✓":""}</div>
            <div style={{flex:1,opacity:isDone?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:600,color:isDone?"#4ade80":isRec?"#ffd700":"#bbb"}}>{isRec&&<span style={{fontSize:8,marginRight:3}}>⭐</span>}{task.desc}</span>
                <div style={{display:"flex",alignItems:"center",gap:3}}>
                  {task.wikiEnriched&&<span style={{fontSize:6,color:task.wikiConfidence==="high"?"#4ade80":task.wikiConfidence==="medium"?"#ffd700":"#ff6b6b",background:"rgba(0,0,0,0.3)",padding:"0px 3px",borderRadius:1}}>🌐</span>}
                  <span style={{fontSize:8,color:task.wikiEnriched?"#60a5fa":"#555"}}>{task.estHours}h</span>
                </div>
              </div>
              <div style={{fontSize:8,color:"#444"}}>{task.notes}</div>
              {task.wikiNotes&&<div style={{fontSize:7,color:"#3a5a3a",fontStyle:"italic"}}>{task.wikiNotes}</div>}
              {!isDone&&<VBar task={task}/>}
              {isRec&&<div style={{fontSize:8,color:"#ffd700",marginTop:2,fontWeight:600}}>Recommended next</div>}
            </div>
          </div>;})}
          <div style={{display:"flex",gap:3,marginTop:5,flexWrap:"wrap"}}>
            {[{l:"Eff",v:sel.ef.toFixed(2),c:sel.ef>1?"#4ade80":"#ffd700"},{l:"Scale",v:"×"+sel.effSc.toFixed(1),c:"#60a5fa"},{l:"Line",v:"+"+sel.lS,c:sel.lS>50?"#ff3333":"#60a5fa"},{l:"Next",v:sel.cheapest?Math.round(sel.cheapH)+"h":"-",c:"#ffd700"}].map((s,i)=>(
              <div key={i} style={{fontSize:8,background:"rgba(255,255,255,0.015)",padding:"1px 4px",borderRadius:2}}><span style={{color:"#444"}}>{s.l}:</span><b style={{color:s.c}}>{s.v}</b></div>
            ))}
          </div>
          {sel.nL.length>0&&<div style={{marginTop:3,fontSize:8,color:"#ff5555",fontWeight:600}}>Line: {sel.nL.map(l=>l.name+"("+l.need+")").join(", ")}</div>}
        </div>}
        {sel&&editing&&<div style={{marginBottom:8}}><TileEditor tile={tiles.find(t=>t.id===sel.id)} onSave={saveTile} onCancel={()=>setEditing(false)} enrichTask={enrichTask} enriching={enriching} wikiData={wikiData}/></div>}

        <div style={{fontSize:9,color:"#444",marginBottom:3,fontWeight:600,letterSpacing:2}}>PRIORITY</div>
        <div style={{maxHeight:sel?200:340,overflowY:"auto"}}>
          {pri.map((tile,idx)=>(
            <div key={tile.id} onClick={()=>{setSelT(tile.id);setEditing(false);}} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 5px",marginBottom:1,borderRadius:3,cursor:"pointer",background:selT===tile.id?"rgba(255,215,0,0.04)":"transparent"}}>
              <div style={{width:15,height:15,borderRadius:2,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,background:idx<3?"rgba(255,51,51,0.1)":idx<7?"rgba(255,136,0,0.07)":"rgba(255,255,255,0.02)",color:idx<3?"#ff5555":idx<7?"#ff8c00":"#555"}}>{idx+1}</div>
              <div style={{width:3,height:14,borderRadius:1,background:CC[tile.cat],flexShrink:0,opacity:0.5}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:600,color:"#aaa",display:"flex",alignItems:"center",gap:3}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>#{tile.id} {tile.name}</span><Dots c={tile.dc}/></div>
                <div style={{fontSize:8,color:"#444"}}>{tile.cheapest?<span>⭐ {tile.cheapest.desc} ~{Math.round(tile.cheapH)}h</span>:"Done"}{tile.lS>50&&<span style={{color:"#ff5555"}}> LINE</span>}</div>
              </div>
              <div style={{fontSize:11,fontWeight:900,color:tile.sm>15?"#4ade80":tile.sm>5?"#ffd700":"#555"}}>{tile.sm.toFixed(1)}</div>
            </div>
          ))}
        </div>

        <div style={{fontSize:9,color:"#444",marginTop:8,marginBottom:3,fontWeight:600,letterSpacing:2}}>LINES</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:2}}>
          {LINES.map((line,i)=>{const gc=line.tiles.filter(t=>met.find(m=>m.id===t)?.dc>=3).length,dn=gc===5;
          return <div key={i} onMouseEnter={()=>setHlL(line.name)} onMouseLeave={()=>setHlL(null)} style={{padding:"2px 4px",borderRadius:2,fontSize:8,cursor:"pointer",background:dn?"rgba(74,222,128,0.05)":"rgba(255,255,255,0.008)",border:"1px solid "+(dn?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.02)")}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:dn?"#4ade80":"#555",fontWeight:600}}>{dn?"✓":""}{line.name}</span><span style={{color:"#444"}}>{gc}/5</span></div>
            <div style={{height:2,background:"rgba(255,255,255,0.03)",borderRadius:1,marginTop:1}}><div style={{height:"100%",borderRadius:1,width:(gc/5*100)+"%",background:dn?"#4ade80":gc>=3?"#ffd700":"#444",transition:"width 0.3s"}}/></div>
          </div>;})}
        </div>
      </div>
    </div>

    <div style={{marginTop:18,background:"rgba(255,255,255,0.012)",borderRadius:6,border:"1px solid rgba(255,255,255,0.04)",overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        {[{id:"scenarios",label:"Scenarios",desc:"B/S/G compare"},{id:"line",label:"Line Planner",desc:"Bingo probability"},{id:"online",label:"Who's Online",desc:"Active priority"},{id:"roles",label:"Team Roles",desc:"Pts/hr by role"},{id:"compare",label:"All Teams",desc:"Side-by-side"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 6px",cursor:"pointer",background:tab===t.id?"rgba(255,215,0,0.04)":"transparent",border:"none",borderBottom:tab===t.id?"2px solid #ffd700":"2px solid transparent",color:tab===t.id?"#ffd700":"#555",fontSize:10,fontWeight:tab===t.id?700:400}}>
            <div>{t.label}</div><div style={{fontSize:7,color:tab===t.id?"#666":"#333",marginTop:1}}>{t.desc}</div>
          </button>
        ))}
      </div>
      <div style={{padding:14}}>
        {tab==="scenarios"&&<Scenarios done={done} tiles={tiles} teamPlayers={teamPlayers} teamCap={teamCap}/>}
        {tab==="line"&&<LinePlanner done={done} tiles={tiles} teamPlayers={teamPlayers} teamCap={teamCap}/>}
        {tab==="online"&&<WhosOnline done={done} tiles={tiles} teamPlayers={teamPlayers} teamCap={teamCap}/>}
        {tab==="roles"&&<TeamRoles done={done} tiles={tiles} teamPlayers={teamPlayers} teamCap={teamCap}/>}
        {tab==="compare"&&<TeamCompare/>}
      </div>
    </div>
  </div>;
}
