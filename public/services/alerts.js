define(["./module"],function(t){var r;return r=function(t,r){var n,e,u;return null==t.alerts&&(t.alerts=[]),this.success=function(t,r){return n(t,"success",r)},this.error=function(t,r){return n(t,"danger",r)},this.info=function(t,r){return n(t,"info",r)},this.warn=function(t,r){return n(t,"warning",r)},n=function(n,i,o){var s,l;return null==o&&(o=2e3),s={msg:n,type:i,opacity:1},l=u(s),-1===l?t.alerts.push(s):t.alerts[l].opacity=1,r(function(){return e(s)},o)},e=function(n){var i,o;return i=u(n),-1!==i?(null!=(null!=(o=t.alerts)?o[i]:void 0)?t.alerts[i].opacity<.1&&t.alerts.splice(i,1):t.alerts[i].opacity=.9*t.alerts[i].opacity,r(function(){return e(n)},100)):void 0},u=function(r){var n,e,u,i,o,s,l;if(!((null!=(s=t.alerts)?s.length:void 0)>0))return-1;for(e=-1,l=t.alerts,n=u=0,i=l.length;i>u;n=++u)o=l[n],o.msg!==r.msg||o.type!==r.type||(e=n);return e}},t.service("alertsService",["$rootScope","$timeout",r])});