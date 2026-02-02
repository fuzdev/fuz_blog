import"../chunks/DsnmJJEf.js";import{p as B,G as U,a as P,b as d,c as E,J as e,K as r,f as L,s as n,d as l,r as c,Y as $,t as J,e as H,Z as w}from"../chunks/DjGveI6T.js";import{a as M,C as N,s as O}from"../chunks/RYALYBBw.js";import{r as T}from"../chunks/BaY02AtW.js";import{s as Y}from"../chunks/5K1F_9ia.js";import{i as F}from"../chunks/BEleMIuX.js";import{e as Q}from"../chunks/BGPcYlNY.js";import{p as R,r as V}from"../chunks/Dg8lB8sR.js";import{p as W}from"../chunks/DJvdZcvi.js";import{S as X,l as ee}from"../chunks/DKhM9vSP.js";import{D as te}from"../chunks/aBDtfLM5.js";import{C as G}from"../chunks/8aT6Bj7G.js";import{l as oe}from"../chunks/CHv7qwJ5.js";var ae=L('<div class="icon svelte-1gkpzoa"><!></div>'),re=L('<!> <div class="content svelte-1gkpzoa"><!></div> <!>',1);function Z(j,o){B(o,!0);const u=h=>{var m=ae(),s=l(m);{var v=t=>{var i=$();J(()=>H(i,e(p))),d(t,i)},_=t=>{var i=U(),K=P(i);Y(K,()=>e(p)),d(t,i)};F(s,t=>{typeof e(p)=="string"?t(v):t(_,!1)})}c(m),d(h,m)},a=R(o,"align",3,"left"),b=V(o,["$$slots","$$events","$$legacy","href","tag","align","icon","children"]),f=r(()=>!!o.href),q=r(()=>e(f)&&W.url.pathname===o.href),x=r(()=>o.tag??(e(f)?"a":"div")),y=r(()=>e(f)?{href:o.href}:void 0),A=r(()=>a()==="left"),D=r(()=>a()==="right"),k=r(()=>a()==="above"),z=r(()=>a()==="below"),p=r(()=>o.icon??(e(f)?"🔗":"🪧"));var C=U(),S=P(C);Q(S,()=>e(x),!1,(h,m)=>{M(h,()=>({...b,...e(y),class:`card ${o.class??""}`,[N]:{link:e(f),selected:e(q),left:e(A),right:e(D),above:e(k),below:e(z)}}),void 0,void 0,void 0,"svelte-1gkpzoa");var s=re(),v=P(s);{var _=g=>{u(g)};F(v,g=>{(a()==="left"||a()==="above")&&g(_)})}var t=n(v,2),i=l(t);Y(i,()=>o.children),c(t);var K=n(t,2);{var I=g=>{u(g)};F(K,g=>{(a()==="right"||a()==="below")&&g(I)})}d(m,s)}),d(j,C),E()}var se=L('<main class="mx_auto p_lg width_atmost_md"><section class="box"><header class="pt_sm"><!> <h1 class="mt_xl2 text-align:center">fuz_blog</h1></header> <blockquote>blog software from scratch with SvelteKit</blockquote></section> <section class="box"><div class="mb_lg"><!></div> <!></section> <section><p>To enable your generated <code>feed.xml</code>, include it as a <code>link</code> in your layout:</p> <!> <h3>Create a new post</h3> <!> <h3>Update an existing post</h3> <!></section> <section class="mb_xl5 box"><a class="chip mb_xl3">about</a> <!></section></main>');function be(j,o){B(o,!0);const u=oe.get();var a=se(),b=l(a),f=l(b),q=l(f);X(q,{get data(){return ee},size:"var(--icon_size_xl3)"}),w(2),c(f),w(2),c(b);var x=n(b,2),y=l(x),A=l(y);{const s=_=>{w();var t=$();J(()=>H(t,u.package_json.glyph)),d(_,t)};let v=r(()=>T("/docs"));Z(A,{get href(){return e(v)},icon:s,children:(_,t)=>{w();var i=$("docs");d(_,i)},$$slots:{icon:!0,default:!0}})}c(y);var D=n(y,2);{let s=r(()=>T("/blog"));Z(D,{get href(){return e(s)},icon:"🪧",children:(v,_)=>{w();var t=$("blog");d(v,t)},$$slots:{default:!0}})}c(x);var k=n(x,2),z=n(l(k),2);G(z,{content:`<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import {set_blog_feed, get_blog_feed} from '@fuzdev/fuz_blog/blog.js';

	import {feed} from '$routes/blog/feed.js';

	set_blog_feed(feed);

	// To get the feed from any descendent:
	const feed = get_blog_feed();
<\/script>

<svelte:head>
	<title>(your title here)</title>
	<link
		rel="alternate"
		type="application/atom+xml"
		title="Atom"
		href={feed.atom.feed_url}
	/>
</svelte:head>`});var p=n(z,4);G(p,{content:`$ gro post "Some post title"
$ gro post --help`});var C=n(p,4);G(C,{content:`$ gro update_post 1
$ gro update_post --help`}),c(k);var S=n(k,2),h=l(S),m=n(h,2);te(m,{get library(){return u},root_url:"https://www.fuz.dev/"}),c(S),c(a),J(s=>O(h,"href",s),[()=>T("/about")]),d(j,a),E()}export{be as component};
