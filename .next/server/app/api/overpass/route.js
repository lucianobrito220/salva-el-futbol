"use strict";(()=>{var e={};e.id=816,e.ids=[816],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},43625:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>v,patchFetch:()=>h,requestAsyncStorage:()=>d,routeModule:()=>u,serverHooks:()=>c,staticGenerationAsyncStorage:()=>l});var o={};t.r(o),t.d(o,{POST:()=>i});var s=t(49303),a=t(88716),n=t(60670),p=t(87070);async function i(e){try{let{lat:r,lon:t}=await e.json();if(!r||!t)return p.NextResponse.json({error:"Missing coordinates"},{status:400});let o=`
      [out:json][timeout:15];
      (
        node["leisure"="pitch"](around:15000,${r},${t});
        way["leisure"="pitch"](around:15000,${r},${t});
        node["leisure"="sports_centre"](around:15000,${r},${t});
        way["leisure"="sports_centre"](around:15000,${r},${t});
        node["sport"~"soccer|football|futbol"](around:15000,${r},${t});
        way["sport"~"soccer|football|futbol"](around:15000,${r},${t});
      );
      out center 50;
    `,s=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:`data=${encodeURIComponent(o)}`,headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"SalvaElFutbol-Vercel-Proxy"},next:{revalidate:3600}});if(!s.ok)throw Error(`Overpass API responded with status: ${s.status}`);let a=await s.json();return p.NextResponse.json(a)}catch(e){return console.error("Overpass Proxy Error:",e),p.NextResponse.json({error:e.message},{status:500})}}let u=new s.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/overpass/route",pathname:"/api/overpass",filename:"route",bundlePath:"app/api/overpass/route"},resolvedPagePath:"C:\\Users\\lucia\\Desktop\\PaginasLUCIANO\\salva-el-futbol\\app\\api\\overpass\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:d,staticGenerationAsyncStorage:l,serverHooks:c}=u,v="/api/overpass/route";function h(){return(0,n.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:l})}}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[948,972],()=>t(43625));module.exports=o})();