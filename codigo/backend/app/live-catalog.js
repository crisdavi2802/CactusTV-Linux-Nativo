/* Datos de canales del APK Wiwy autorizado por el usuario. Código de integración propio.
 * Solo siete HLS públicos sin tokens se incluyen para reproducción. El resto queda
 * inventariado con fuente pendiente; no se usa HTML de terceros como stream.
 * El permiso es la declaración del usuario, no una auditoría legal independiente. */
(function(){'use strict';
var evidence="Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.";
var items=[
  {
    "id": "wiwy-espn-1",
    "title": "ESPN",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8"
  },
  {
    "id": "wiwy-espn-2",
    "title": "ESPN 2",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8"
  },
  {
    "id": "wiwy-espn-3",
    "title": "ESPN 3",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_3/ESPN_3.isml/ESPN_3.m3u8"
  },
  {
    "id": "wiwy-espn-4",
    "title": "ESPN 4",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_4/ESPN_4.isml/ESPN_4.m3u8"
  },
  {
    "id": "wiwy-espn-5",
    "title": "ESPN 5",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_5/ESPN_5.isml/ESPN_5.m3u8"
  },
  {
    "id": "wiwy-espn-6",
    "title": "ESPN 6",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_6/ESPN_6.isml/ESPN_6.m3u8"
  },
  {
    "id": "wiwy-espn-7",
    "title": "ESPN 7",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Fuente HLS directa identificada en WiwyXuper.apk. Disponibilidad sujeta al servidor de origen.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": "https://barinaslive1.boldmss.com/ESPN_7/ESPN_7.isml/ESPN_7.m3u8"
  },
  {
    "id": "wiwy-tvplus-1",
    "title": "Bein Sports Xtra",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-2",
    "title": "Liga 1",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-3",
    "title": "Liga 1 Max",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-4",
    "title": "TUDN",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-5",
    "title": "Sky Sports La Liga",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-7",
    "title": "TyC Sports",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-9",
    "title": "Movistar Liga de Campeones",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-10",
    "title": "DSports (DirecTV)",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-11",
    "title": "DSports (DirecTV) 2",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-12",
    "title": "DSports (DirecTV) Plus",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-13",
    "title": "ESPN Premium",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-21",
    "title": "ESPN Mexico",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-22",
    "title": "ESPN 2 Mexico",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-23",
    "title": "ESPN 3 Mexico",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-24",
    "title": "ESPN 4 Mexico",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-25",
    "title": "ESPN 5 Mexico",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-27",
    "title": "Fox Sports",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-tvplus-26",
    "title": "Azteca Deportes",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Canal identificado en WiwyXuper.apk. El APK usa un resolvedor web para esta fuente; reproducción pendiente de integración compatible, sin eludir acceso.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  },
  {
    "id": "wiwy-espn-deportes",
    "title": "ESPN Deportes HD",
    "category": "live",
    "source": "WIWY_AUTHORIZED",
    "label": "TV EN VIVO · WIWY",
    "description": "Identificado en el catálogo adicional de WiwyXuper. Requiere resolución del catálogo cifrado; no se copiaron claves ni sesiones.",
    "rightsVerified": true,
    "rightsEvidence": "Autorización expresa del responsable de Cactus TV en este chat, 2026-11-03: canales ESPN y DSports y catálogo WiwyXuper.",
    "streamUrl": ""
  }
];
/* Referencia recuperada de la lista histórica facilitada por el propietario.
 * Aún no tiene fuente de reproducción y por tanto se muestra como pendiente. */
items.push({id:'wiwy-tvplus-28',title:'DSports Max',category:'live',source:'LEGACY_INVENTORY',label:'DEPORTES ADICIONALES',description:'Referencia del inventario histórico; fuente pendiente.',rightsVerified:false,streamUrl:''});
var approved={};items.forEach(function(x){if(x.streamUrl)approved[x.id]=x.streamUrl;});
window.CACTUS_LIVE={items:items,lookup:function(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i];return null;},canPlay:function(x){return Boolean(x&&x.source==='WIWY_AUTHORIZED'&&x.rightsVerified===true&&x.rightsEvidence===evidence&&approved[x.id]&&approved[x.id]===x.streamUrl);}};
})();
