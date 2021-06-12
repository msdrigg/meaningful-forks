// ==UserScript==
// @name         meaningful-forks
// @homepage     https://github.com/aflowofcode/meaningful-forks
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Sort Github fork lists by the number of stars and commits ahead from the source repo.
// @author       Kevin Li + community
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

!async function(){let e="<YOUR ACCESS TOKEN>";!async function e(t,o){let n=document.querySelectorAll(t);if(n&&n.length>0){let r=!1;if(n.forEach(function(e){"alreadyFound"!=e.dataset.found&&(e.dataset.found="alreadyFound",r=!0)}),r)return void o().finally(()=>{setTimeout(()=>{e(t,o)},1e3)})}setTimeout(()=>{e(t,o)},1e3)}("#network>.repo",async function(){let t=new Headers;t.append("Authorization","token "+e);const o={headers:t},n=document.createElement("span");n.innerText="📊 Meaningful Forks is gathering data...",n.style.background="#22f922",n.style.borderRadius="10px",n.style.color="black",n.style.fontWeight="bold",n.style.padding="10px",n.style.width="max-content",n.style.height="calc(20px + 1.5em)",n.style.zIndex="9999",n.style.position="fixed",n.style.inset="0",n.style.margin="auto",document.body.appendChild(n);const r=document.querySelector("#network"),a=r.querySelectorAll(".repo")[0].lastElementChild.getAttribute("href").substring(1);console.log("TCL: currentRepoUrl",a);const s=a.substring(0,a.lastIndexOf("/")),l=`https://api.github.com/repos/${a}/forks?sort=stargazers&per_page=100`;console.log("TCL: forkApiUrl",l);let i=await fetch(l,o).then(e=>{if(e.ok)return e.json();throw new Error(`Failed to get the api url, exiting with status: ${e.status}`)}).then(e=>e).catch(e=>{console.log(e),n.innerText="Problem accessing API. If you've entered your personal access token & this always happens here, this repo probably doesn't allow API access 😕",setTimeout(()=>{n.remove()},7500)}),c=[],d=[];await Promise.all(i.map(async e=>{if(e.forks>0){console.log(`${e.full_name} has ${e.forks} subforks`);let t=await fetch(e.forks_url+"?sort=stargazers&per_page=100",o);(await t.json()).forEach(t=>{t.pushed_at!==e.pushed_at?(t.is_subfork=!0,t.forked_from=e.full_name,c=c.concat(t)):d.push(t)})}})),console.log(`Found ${c.length} relevant subforks`,c);let u=i.concat(c);console.log("TCL: forks.length: "+u.length);const h=[];let f=[];var g,p,m,b;n.innerText="✨ Updating stars...",await Promise.all(u.map(async(e,t,n)=>{if(void 0===e.owner)return console.log("marking bad fork for delete",t,e),void f.push(t);const r=e.owner.login;if(console.log("TCL: authorName",r,t),"undefined"===r)return;const a=e.stargazers_url;h.push(await fetch(a,o).then(e=>{if(e.ok)return e.json();throw new Error("Network response is not OK!")}).then(e=>{e.forEach(e=>{e.login===r&&n[t].stargazers_count>0&&(console.log(`TCL: starCount of ${r} before: ${n[t].stargazers_count}`),n[t].stargazers_count--,console.log(`TCL: starCount of ${r} after: ${n[t].stargazers_count}`))})}).catch(function(t){console.log("There has been a problem with your fetch operation: ",t.message,e)}))})),console.log(`found ${f.length} forks with bad data out of ${u.length}`,f),f.length>0&&(f=_(f)),await Promise.all(h),u.sort((g="stargazers_count",p=!0,m=parseInt,b=m?function(e){return m(e[g])}:function(e){return e[g]},p=p?-1:1,function(e,t){return e=b(e),t=b(t),p*((e>t)-(t>e))})),console.log("End of modifying stargazer count!"),n.innerText="🍴 Sorting forks (might take a sec)...";let y=await async function(e){return w(`https://api.github.com/repos/${e}`,"default_branch")}(a);async function w(e,t){let n,r=await fetch(e,o);if(!r.ok)throw new Error("Network response is not OK!");if(n=await r.json(),"string"==typeof t)return a(n,t);if(Array.isArray(t))return t.map(e=>a(n,e));function a(e,t){if(t.indexOf(".")>=0){let o=e;return t.split(".").forEach(e=>{o=o[e]}),o}return e[t]}}function k(e){const t="http://www.w3.org/2000/svg";var o=document.createElementNS(t,"svg");o.setAttribute("height",12),o.setAttribute("width",10.5),o.setAttribute("viewBox","0 0 14 16"),o.style["vertical-align"]="middle",o.style.fill="currentColor",o.style.position="relative",o.style.bottom="1px",o.classList.add("opticon","opticon-"+e);var n=document.createElementNS(t,"title"),r=document.createElementNS(t,"path");switch(e){case"star":n.appendChild(document.createTextNode("Number of real stars (excluding author's star)")),r.setAttribute("d","M14 6l-4.9-0.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14l4.33-2.33 4.33 2.33L10.4 9.26 14 6z"),r.setAttribute("fill","black");break;case"up":n.appendChild(document.createTextNode("Number of commits ahead")),r.setAttribute("d","M5 3L0 9h3v4h4V9h3L5 3z"),r.setAttribute("fill","#84ed47"),o.setAttribute("viewBox","0 0 10 16"),o.setAttribute("height",16);break;case"flame":n.appendChild(document.createTextNode("Fork may be more recent than upstream.")),r.setAttribute("d","M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86 1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02 1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"),r.setAttribute("fill","#d26911")}return r.appendChild(n),o.appendChild(r),o}function _(e){for(let t=0;t<e.length;t++)console.log("deleting:",u[e[t]]),delete u[e[t]];return u=u.filter(e=>void 0!==e),console.log(`${u.length} remaining forks`),[]}await async function(e,t){const o=[];for(let n=0;n<e.length;n++)o.push(t(e[n],n,e));return Promise.all(o)}(u,async(e,t,o)=>{try{const n=e.owner.login,r=e.full_name,a=e.default_branch,l=`https://api.github.com/repos/${r}/compare/${s}:${y}...${n}:${a}`;let[i,c]=await w(l,["ahead_by","behind_by"]);o[t].ahead_by=i,o[t].behind_by=c}catch(e){console.log(e)}if(e.is_subfork&&0===e.ahead_by)return console.log("marking subfork ahead_by 0 for delete",t,e.full_name),void f.push(t)}),console.log(`found ${f.length} subforks ahead_by 0 out of ${u.length}`,f),f.length>0&&(f=_(f)),n.innerText="🔀 Rearranging order...",u.sort(function(){var e=[].slice.call(arguments),t=e.length;return function(o,n){var r,a,s,l,i,c,d;for(d=0;d<t&&(c=0,s=e[d],l="string"==typeof s?s:s.name,r=o[l],a=n[l],void 0!==s.primer&&(r=s.primer(r),a=s.primer(a)),i=s.highToLow?-1:1,r<a&&(c=-1*i),r>a&&(c=1*i),0===c);d++);return c}}({name:"stargazers_count",primer:parseInt,highToLow:!0},{name:"ahead_by",primer:parseInt,highToLow:!0},{name:"behind_by",primer:parseInt,highToLow:!1})),console.log("Beginning of DOM operations!"),u.reverse().forEach(e=>{console.log("TCL: fork",e);const t=e.full_name,o=e.stargazers_count;let n=!1;const a=r.querySelectorAll("div.repo"),s=a.length>2?a[1].querySelector("svg"):void 0;for(let o=0;o<a.length;o++){const r=a[o].lastElementChild.getAttribute("href");if(r&&r.substring(1)===t){if(n=!0,e.hasOwnProperty("is_subfork")&&e.is_subfork){console.log("adding dagger to subfork");const e=document.createTextNode("‡"),t=a[o].querySelectorAll("svg");s&&t[0].replaceWith(s.cloneNode(!0)),t[1].replaceWith(e)}l(a[o]);break}}if(!n){console.log(`${t} repo wasn't showing`);const o=document.createElement("div");o.dataset.found="alreadyFound",o.classList.add("repo");const n=e.owner.type.toLowerCase(),r=document.createElement("a");r.setAttribute("data-hovercard-type",n);const a=e.owner.login;if("user"===n){const t=e.owner.id;r.setAttribute("data-hovercard-url",`/hovercards?user_id=${t}`)}else"organization"===n&&(r.setAttribute("data-hovercard-url",`/orgs/${a}/hovercard`),r.setAttribute("href",`/${a}`));r.setAttribute("href",`/${a}`),r.setAttribute("data-octo-click","hovercard-link-click"),r.setAttribute("data-octo-dimensions","link_type:self");const i=r.cloneNode(!0);i.style.paddingLeft="4px",i.style.paddingRight="4px",r.innerText=a,i.classList.add("d-inline-block");const c=document.createElement("img");c.classList.add("gravatar");const d=e.owner.avatar_url;c.src=d,c.width="16",c.height="16",c.alt=`@${a}`,i.appendChild(c);const u=document.createElement("a");u.style.paddingRight="4px",u.setAttribute("href",`/${t}`),u.innerText=e.name,o.appendChild(s.cloneNode(!0)),o.appendChild(i),o.appendChild(r),o.appendChild(document.createTextNode(" / ")),o.appendChild(u),l(o)}function l(t){console.log("adding status",t);const n=document.createDocumentFragment();if(n.appendChild(k("star")),n.appendChild(document.createTextNode(o+" ")),e.ahead_by>0){const t=k("up");n.appendChild(t),n.appendChild(document.createTextNode(e.ahead_by+" "))}e.ahead_by-e.behind_by>0&&n.appendChild(k("flame")),e.is_subfork&&n.appendChild(document.createTextNode(` (subfork of ${e.forked_from})`)),t.appendChild(n),r.firstElementChild.insertAdjacentElement("afterend",t)}e.hasOwnProperty("stargazers_count")&&console.log("TCL: starCount",e.stargazers_count)}),console.log("finished sorting"),n.remove()})}();